const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname, '.')));

// State
let users = {}; // socket.id -> { username, gold, room: null }
let rooms = {}; // roomId -> { id, hostId, players: [], settings: {}, gameState: {}, chat: [] }
let nextRoomId = 1;

// Constants
const MODE_2_CONFIG = {
    totalCards: 40,
    targetCount: 6,
    maxNumber: 40,
    cost: 500,
    maxPrize: 1000000000 // 1 Billion
};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // --- Auth & General ---
    socket.on('login', (data) => {
        // data: { username }
        // Simple login, just store username
        users[socket.id] = {
            id: socket.id,
            username: data.username,
            gold: 10000, // Default start gold for multiplayer test
            room: null
        };
        socket.emit('login_success', { user: users[socket.id] });
        io.emit('update_user_list', getPublicUserList());
    });

    socket.on('disconnect', () => {
        const user = users[socket.id];
        if (user) {
            if (user.room) {
                leaveRoom(socket);
            }
            delete users[socket.id];
            io.emit('update_user_list', getPublicUserList());
        }
    });

    socket.on('send_chat', (data) => {
        // data: { message, scope: 'global' | 'room' }
        const user = users[socket.id];
        if (!user) return;

        const msg = {
            sender: user.username,
            text: data.message,
            timestamp: Date.now()
        };

        if (data.scope === 'room' && user.room) {
            io.to(user.room).emit('chat_message', { ...msg, scope: 'room' });
        } else {
            io.emit('chat_message', { ...msg, scope: 'global' });
        }
    });

    socket.on('gift_gold', (data) => {
        // data: { targetUsername, amount }
        const sender = users[socket.id];
        const amount = parseInt(data.amount);

        if (isNaN(amount) || amount <= 0) {
            socket.emit('error_message', 'Invalid amount');
            return;
        }

        if (!sender || sender.gold < amount) {
            socket.emit('error_message', 'Not enough gold');
            return;
        }

        const targetSocketId = Object.keys(users).find(id => users[id].username === data.targetUsername);
        if (!targetSocketId) {
             socket.emit('error_message', 'User not online');
             return;
        }

        sender.gold -= data.amount;
        users[targetSocketId].gold += parseInt(data.amount);

        socket.emit('update_self', { gold: sender.gold });
        io.to(targetSocketId).emit('update_self', { gold: users[targetSocketId].gold });
        io.to(targetSocketId).emit('notification', `You received ${data.amount} gold from ${sender.username}`);
        socket.emit('notification', `Sent ${data.amount} gold to ${data.targetUsername}`);
    });

    // --- Room Management ---
    socket.on('get_rooms', () => {
        socket.emit('update_room_list', getPublicRoomList());
    });

    socket.on('create_room', (data) => {
        // data: { modeType: 'auto' | 'manual' }
        const user = users[socket.id];
        if (!user || user.room) return;

        const roomId = 'room_' + nextRoomId++;
        rooms[roomId] = {
            id: roomId,
            hostId: socket.id,
            players: [{ id: socket.id, username: user.username, ready: true, selectedNumbers: [] }], // Host is always ready? Or maybe not.
            settings: {
                modeType: data.modeType || 'auto', // 'auto' (2s) or 'manual' (5s turn)
                cardMode: 2 // Fixed to 6/40
            },
            gameState: null, // { cards: [], currentTurnIndex: 0, lastActionTime: 0, timer: null }
            chat: []
        };

        user.room = roomId;
        socket.join(roomId);

        socket.emit('room_joined', rooms[roomId]);
        io.emit('update_room_list', getPublicRoomList());
    });

    socket.on('join_room', (roomId) => {
        const user = users[socket.id];
        if (!user || user.room) return;

        const room = rooms[roomId];
        if (!room) {
             socket.emit('error_message', 'Room not found');
             return;
        }
        if (room.gameState) {
             socket.emit('error_message', 'Game already in progress');
             return;
        }
        if (room.players.length >= 10) { // Max 10
             socket.emit('error_message', 'Room full');
             return;
        }

        room.players.push({ id: socket.id, username: user.username, ready: false, selectedNumbers: [] });
        user.room = roomId;
        socket.join(roomId);

        io.to(roomId).emit('room_update', room);
        io.emit('update_room_list', getPublicRoomList());
    });

    socket.on('leave_room', () => {
        leaveRoom(socket);
    });

    socket.on('kick_user', (targetId) => {
        const user = users[socket.id];
        const room = rooms[user?.room];

        if (room && room.hostId === socket.id && targetId !== socket.id) {
            const targetSocket = io.sockets.sockets.get(targetId);
            if (targetSocket) {
                leaveRoom(targetSocket, true);
                targetSocket.emit('kicked');
            }
        }
    });

    socket.on('toggle_ready', (data) => {
        // data: { selectedNumbers: [] } (if applicable)
        const user = users[socket.id];
        const room = rooms[user?.room];
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (player) {
            player.ready = !player.ready;
            if (data && data.selectedNumbers) {
                player.selectedNumbers = data.selectedNumbers;
            }
            io.to(room.id).emit('room_update', room);
        }
    });

    socket.on('start_game', () => {
        const user = users[socket.id];
        const room = rooms[user?.room];

        if (room && room.hostId === socket.id) {
            // Check if all ready
            if (room.players.every(p => p.ready) && room.players.length >= 1) { // Allow 1 player test
                startGame(room);
            } else {
                socket.emit('error_message', 'Not all players are ready');
            }
        }
    });

    // --- Game Logic ---
    socket.on('manual_reveal', () => {
        const user = users[socket.id];
        const room = rooms[user?.room];
        if (!room || !room.gameState) return;

        if (room.settings.modeType !== 'manual') return;

        const turnPlayer = room.players[room.gameState.currentTurnIndex];
        if (turnPlayer.id !== socket.id) {
            socket.emit('error_message', 'Not your turn');
            return;
        }

        revealRandomCard(room);
    });

});

function leaveRoom(socket, isKicked = false) {
    const user = users[socket.id];
    if (!user || !user.room) return;

    const roomId = user.room;
    const room = rooms[roomId];

    if (room) {
        room.players = room.players.filter(p => p.id !== socket.id);
        user.room = null;
        socket.leave(roomId);

        if (room.players.length === 0) {
            // Delete room
            if (room.gameState && room.gameState.timer) clearInterval(room.gameState.timer);
            delete rooms[roomId];
        } else {
            // If host left, assign new host
            if (room.hostId === socket.id) {
                room.hostId = room.players[0].id;
            }
            io.to(roomId).emit('room_update', room);
        }
        io.emit('update_room_list', getPublicRoomList());
    }
}

function getPublicUserList() {
    return Object.values(users).map(u => ({ username: u.username, room: u.room ? true : false }));
}

function getPublicRoomList() {
    return Object.values(rooms).map(r => ({
        id: r.id,
        host: users[r.hostId]?.username || 'Unknown',
        playerCount: r.players.length,
        settings: r.settings,
        inProgress: !!r.gameState
    }));
}

function startGame(room) {
    // Generate Cards
    // Mode 2: 40 cards total. 1-40.
    const allNumbers = Array.from({length: 40}, (_, i) => i + 1);
    const deck = allNumbers.map(n => ({ value: n, revealed: false }));

    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    room.gameState = {
        cards: deck,
        revealedCount: 0,
        currentTurnIndex: 0,
        turnDeadline: Date.now() + 5000,
        timer: null,
        winner: null
    };

    io.to(room.id).emit('game_started', {
        totalCards: 40,
        players: room.players // Contains selected numbers
    });

    if (room.settings.modeType === 'auto') {
        startAutoGame(room);
    } else {
        startManualGame(room);
    }
}

function startAutoGame(room) {
    // 1 card every 2 seconds
    room.gameState.timer = setInterval(() => {
        if (!room.gameState) return; // Safety
        revealRandomCard(room);
    }, 2000);
}

function startManualGame(room) {
    // 5 seconds per turn
    room.gameState.turnDeadline = Date.now() + 5000;
    io.to(room.id).emit('turn_update', {
        playerIndex: room.gameState.currentTurnIndex,
        deadline: room.gameState.turnDeadline
    });

    room.gameState.timer = setInterval(() => {
        if (!room.gameState) return;
        if (Date.now() > room.gameState.turnDeadline) {
             // Timeout - Pass turn? Or auto reveal?
             // Requirement: "5초 동안 오픈하지 않으면 다음 유저에게 넘어감" (If not opened in 5s, pass to next user)
             // So we just skip turn without revealing? Or reveal and pass?
             // Usually "pass to next user" means turn forfeit.

             // Let's implement pass turn.
             advanceTurn(room);
        }
    }, 1000);
}

function advanceTurn(room) {
    room.gameState.currentTurnIndex = (room.gameState.currentTurnIndex + 1) % room.players.length;
    room.gameState.turnDeadline = Date.now() + 5000;
    io.to(room.id).emit('turn_update', {
        playerIndex: room.gameState.currentTurnIndex,
        deadline: room.gameState.turnDeadline
    });
}

function revealRandomCard(room) {
    const unrevealed = room.gameState.cards.filter(c => !c.revealed);
    if (unrevealed.length === 0) {
        endGame(room, null);
        return;
    }

    // Pick one unrevealed card (In auto, random. In manual, user picks? The requirement says "open", usually implies picking one.
    // Since we don't have user selection logic in the requirement detail (just "open"), I'll assume they just click "Open" and it opens a random unrevealed card or the next one.
    // Given the Bingo nature, usually cards are hidden and shuffled. Opening "a card" reveals it for everyone.

    // Simplification: We pick the NEXT card in the shuffled deck.
    const card = unrevealed[0];
    card.revealed = true;
    room.gameState.revealedCount++;

    io.to(room.id).emit('card_revealed', { value: card.value });

    checkWinCondition(room, card.value);

    if (room.settings.modeType === 'manual' && !room.gameState.winner) {
        // Advance turn after reveal
        advanceTurn(room);
    }
}

function checkWinCondition(room, value) {
    // Check if any player has found all their numbers
    let winners = [];
    room.players.forEach(p => {
        // Check if all p.selectedNumbers are revealed
        // We need to know which numbers are revealed.
        // We can track revealed numbers in gameState
    });

    // Better: check current value against all players
    let gameOver = false;

    room.players.forEach(p => {
        if (p.selectedNumbers.includes(value)) {
            // Check if this player has all numbers revealed
            const revealedValues = room.gameState.cards.filter(c => c.revealed).map(c => c.value);
            const allFound = p.selectedNumbers.every(n => revealedValues.includes(n));
            if (allFound) {
                winners.push(p);
            }
        }
    });

    if (winners.length > 0) {
        // We have a winner(s)
        endGame(room, winners);
    } else {
        // Check if all cards revealed
        if (room.gameState.revealedCount === room.gameState.cards.length) {
            endGame(room, []); // Draw/Loss
        }
    }
}

function endGame(room, winners) {
    if (room.gameState.timer) clearInterval(room.gameState.timer);

    let prize = 0;
    if (winners && winners.length > 0) {
         // Calculate prize based on efficiency? Or fixed?
         // Requirement says "Winner takes all" from memory.
         // For now, let's give a big pot.
         prize = 1000000; // Simplified

         // Split if multiple? Or first? Logic says "first player".
         // If multiple win on same card, split.
         const share = Math.floor(prize / winners.length);
         winners.forEach(w => {
             const u = users[w.id];
             if (u) u.gold += share;
         });
    }

    room.gameState.winner = winners;
    io.to(room.id).emit('game_over', { winners: winners, prize: prize });

    // Reset room state after delay
    setTimeout(() => {
        if (rooms[room.id]) {
            room.gameState = null;
            room.players.forEach(p => p.ready = false);
            io.to(room.id).emit('room_reset', room);
            io.emit('update_room_list', getPublicRoomList());
        }
    }, 5000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
