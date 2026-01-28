const Multiplayer = {
    socket: null,
    currentUser: null,
    currentRoom: null,

    init: function() {
        this.cacheDOM();
        this.bindEvents();
    },

    cacheDOM: function() {
        console.log("Multiplayer cacheDOM called");
        // Lobby
        this.multiLobbyView = document.getElementById('multi-lobby-view');
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.chatSendBtn = document.getElementById('chat-send-btn');
        this.onlineUsersList = document.getElementById('online-users-list');
        console.log("onlineUsersList found:", this.onlineUsersList);
        this.createRoomBtn = document.getElementById('create-room-btn');
        this.joinRoomBtn = document.getElementById('join-room-btn');

        // Room List
        this.roomListView = document.getElementById('room-list-view');
        this.roomsList = document.getElementById('rooms-list');
        this.backToMultiLobbyBtn = document.getElementById('back-to-multi-lobby');

        // Create Room Modal
        this.createRoomModal = document.getElementById('create-room-modal');
        this.confirmCreateRoomBtn = document.getElementById('confirm-create-room');
        this.cancelCreateRoomBtn = document.getElementById('cancel-create-room');
        this.roomModeTypeSelect = document.getElementById('room-mode-type');

        // Game Room
        this.multiGameRoom = document.getElementById('multi-game-room');
        this.roomIdDisplay = document.getElementById('room-id-display');
        this.leaveRoomBtn = document.getElementById('leave-room-btn');
        this.roomPlayersList = document.getElementById('room-players-list');
        this.hostControls = document.getElementById('host-controls');
        this.startGameBtn = document.getElementById('start-multi-game-btn');
        this.roomChatMessages = document.getElementById('room-chat-messages');
        this.roomChatInput = document.getElementById('room-chat-input');

        // Game Area
        this.multiSetup = document.getElementById('multi-setup');
        this.multiInputs = document.getElementById('multi-inputs');
        this.multiReadyBtn = document.getElementById('multi-ready-btn');

        this.multiPlay = document.getElementById('multi-play');
        this.multiGrid = document.getElementById('multi-grid');
        this.multiTurnDisplay = document.getElementById('multi-turn-display');
        this.multiTimerDisplay = document.getElementById('multi-timer-display');
        this.multiRevealBtn = document.getElementById('multi-reveal-btn');

        this.multiResult = document.getElementById('multi-result');
        this.multiResultMsg = document.getElementById('multi-result-msg');
    },

    bindEvents: function() {
        console.log("Multiplayer bindEvents called");
        this.chatSendBtn.addEventListener('click', () => {
            console.log("Chat Send Clicked");
            this.sendChat('global');
        });
        this.chatInput.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') this.sendChat('global');
        });

        this.createRoomBtn.addEventListener('click', () => {
            console.log("Create Room Btn Clicked");
            this.createRoomModal.classList.remove('hidden');
        });

        this.cancelCreateRoomBtn.addEventListener('click', () => {
            this.createRoomModal.classList.add('hidden');
        });

        this.confirmCreateRoomBtn.addEventListener('click', () => {
            console.log("Confirm Create Room Clicked");
            const modeType = this.roomModeTypeSelect.value;
            this.socket.emit('create_room', { modeType });
            this.createRoomModal.classList.add('hidden');
        });

        this.joinRoomBtn.addEventListener('click', () => {
            console.log("Join Room Btn Clicked");
            this.socket.emit('get_rooms');
            this.showScreen('roomList');
        });

        this.backToMultiLobbyBtn.addEventListener('click', () => {
            this.showScreen('lobby');
        });

        this.leaveRoomBtn.addEventListener('click', () => {
            if(confirm("Are you sure you want to leave?")) {
                this.socket.emit('leave_room');
                this.showScreen('lobby');
            }
        });

        this.multiReadyBtn.addEventListener('click', () => {
            this.toggleReady();
        });

        this.startGameBtn.addEventListener('click', () => {
            this.socket.emit('start_game');
        });

        this.roomChatInput.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') this.sendChat('room');
        });

        this.multiRevealBtn.addEventListener('click', () => {
            this.socket.emit('manual_reveal');
        });

        // Delegate kick
        this.roomPlayersList.addEventListener('click', (e) => {
            if(e.target.classList.contains('kick-btn')) {
                const userId = e.target.dataset.id;
                this.socket.emit('kick_user', userId);
            }
        });
    },

    connect: function(username) {
        if (this.socket) return; // Already connected

        this.socket = io();

        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.socket.emit('login', { username });
        });

        this.socket.on('login_success', (data) => {
            this.currentUser = data.user;
            console.log('Logged in as', this.currentUser);
            if (data.user.gold !== undefined) {
                 Game.state.gold = data.user.gold;
                 App.updateGoldDisplays();
            }
        });

        this.socket.on('update_user_list', (users) => {
            this.renderUserList(users);
        });

        this.socket.on('chat_message', (msg) => {
            this.appendChatMessage(msg);
        });

        this.socket.on('update_room_list', (rooms) => {
            this.renderRoomList(rooms);
        });

        this.socket.on('room_joined', (room) => {
            this.currentRoom = room;
            this.showScreen('room');
            this.renderRoomUI(room);
        });

        this.socket.on('room_update', (room) => {
            this.currentRoom = room;
            this.renderRoomUI(room);
        });

        this.socket.on('error_message', (msg) => {
            alert(msg);
        });

        this.socket.on('kicked', () => {
            alert("You have been kicked from the room.");
            this.currentRoom = null;
            this.showScreen('lobby');
        });

        // Game Events
        this.socket.on('game_started', (data) => {
            this.setupGame(data);
        });

        this.socket.on('card_revealed', (data) => {
            this.revealCard(data.value);
        });

        this.socket.on('turn_update', (data) => {
            this.updateTurn(data);
        });

        this.socket.on('game_over', (data) => {
            this.handleGameOver(data);
        });

        this.socket.on('room_reset', (room) => {
            this.currentRoom = room;
            this.resetGameUI();
            this.renderRoomUI(room);
        });

        this.socket.on('update_self', (data) => {
            // Update gold locally if managed by App/Game
            if (data.gold !== undefined) {
                 Game.state.gold = data.gold;
                 App.updateGoldDisplays();
            }
        });

        this.socket.on('notification', (msg) => {
            alert(msg);
        });
    },

    showScreen: function(screen) {
        this.multiLobbyView.classList.add('hidden');
        this.roomListView.classList.add('hidden');
        this.multiGameRoom.classList.add('hidden');

        if (screen === 'lobby') this.multiLobbyView.classList.remove('hidden');
        if (screen === 'roomList') this.roomListView.classList.remove('hidden');
        if (screen === 'room') this.multiGameRoom.classList.remove('hidden');
    },

    renderUserList: function(users) {
        console.log("renderUserList called, list element:", this.onlineUsersList);
        if (this.onlineUsersList) {
            this.onlineUsersList.innerHTML = users.map(u =>
                `<li>${u.username} ${u.room ? '(In Game)' : '(Lobby)'}</li>`
            ).join('');
        }
    },

    sendChat: function(scope) {
        const input = scope === 'global' ? this.chatInput : this.roomChatInput;
        const message = input.value.trim();
        if (!message) return;

        this.socket.emit('send_chat', { message, scope });
        input.value = '';
    },

    appendChatMessage: function(msg) {
        const container = msg.scope === 'global' ? this.chatMessages : this.roomChatMessages;
        const div = document.createElement('div');
        div.className = 'chat-message';

        const senderSpan = document.createElement('span');
        senderSpan.className = 'sender';
        senderSpan.textContent = msg.sender + ': ';

        div.appendChild(senderSpan);
        div.appendChild(document.createTextNode(msg.text));

        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    },

    renderRoomList: function(rooms) {
        if (this.roomListView.classList.contains('hidden')) return;

        this.roomsList.innerHTML = rooms.map(r => `
            <li>
                <span>Room #${r.id} (${r.playerCount}/10) - Host: ${r.host} - ${r.settings.modeType.toUpperCase()}</span>
                ${!r.inProgress ? `<button onclick="Multiplayer.joinRoom('${r.id}')">Join</button>` : '<span>In Progress</span>'}
            </li>
        `).join('');
    },

    // Exposed for inline onclick
    joinRoom: function(roomId) {
        this.socket.emit('join_room', roomId);
    },

    renderRoomUI: function(room) {
        this.roomIdDisplay.textContent = `Room #${room.id}`;

        const isHost = room.hostId === this.socket.id;

        this.roomPlayersList.innerHTML = room.players.map(p => `
            <li>
                ${p.username} ${p.ready ? '✅' : '❌'}
                ${isHost && p.id !== this.socket.id ? `<button class="kick-btn" data-id="${p.id}" style="padding: 2px 5px; font-size: 0.7rem; background: #e74c3c; margin-left: 5px;">Kick</button>` : ''}
            </li>
        `).join('');

        if (isHost && !room.gameState) {
            this.hostControls.classList.remove('hidden');
            const allReady = room.players.every(p => p.ready) && room.players.length >= 1;
            this.startGameBtn.disabled = !allReady;
        } else {
            this.hostControls.classList.add('hidden');
        }

        // If game hasn't started, show setup
        if (!room.gameState) {
            this.multiSetup.classList.remove('hidden');
            this.multiPlay.classList.add('hidden');
            this.multiResult.classList.add('hidden');

            // Render inputs if empty
            if (this.multiInputs.innerHTML === '') {
                 this.renderInputs(6, 40);
            }

            // Check if I am ready
            const me = room.players.find(p => p.id === this.socket.id);
            if (me && me.ready) {
                this.multiInputs.classList.add('disabled');
                this.multiReadyBtn.textContent = 'Unready';
                // Disable inputs
                this.multiInputs.querySelectorAll('input').forEach(i => i.disabled = true);
            } else {
                this.multiInputs.classList.remove('disabled');
                this.multiReadyBtn.textContent = 'Ready';
                this.multiInputs.querySelectorAll('input').forEach(i => i.disabled = false);
            }
        }
    },

    renderInputs: function(count, max) {
        this.multiInputs.innerHTML = '';
        for(let i=0; i<count; i++) {
             const input = document.createElement('input');
             input.type = 'number';
             input.className = 'number-input';
             input.min = 1;
             input.max = max;
             this.multiInputs.appendChild(input);
        }
    },

    toggleReady: function() {
        const me = this.currentRoom.players.find(p => p.id === this.socket.id);
        if (me && me.ready) {
            this.socket.emit('toggle_ready');
        } else {
            // Validate inputs
            const inputs = Array.from(this.multiInputs.querySelectorAll('input'));
            const values = inputs.map(i => parseInt(i.value));

            // Validation
            if (values.some(isNaN) || new Set(values).size !== values.length || values.some(v => v < 1 || v > 40)) {
                alert("Please enter 6 distinct numbers between 1 and 40.");
                return;
            }

            this.socket.emit('toggle_ready', { selectedNumbers: values });
        }
    },

    // Game Logic
    setupGame: function(data) {
        this.multiSetup.classList.add('hidden');
        this.multiPlay.classList.remove('hidden');
        this.multiResult.classList.add('hidden');

        // Render Grid
        this.multiGrid.innerHTML = '';
        // 40 cards
        for(let i=1; i<=40; i++) {
            const cardEl = document.createElement('div');
            cardEl.className = 'card';
            cardEl.dataset.value = i;

            const inner = document.createElement('div');
            inner.className = 'card-inner';

            const front = document.createElement('div');
            front.className = 'card-front';
            front.textContent = '?';

            const back = document.createElement('div');
            back.className = 'card-back';
            back.textContent = i;

            // Highlight my targets
            const me = this.currentRoom.players.find(p => p.id === this.socket.id);
            if (me.selectedNumbers.includes(i)) {
                 back.classList.add('target');
            } else {
                 back.classList.add('dud');
            }

            inner.appendChild(front);
            inner.appendChild(back);
            cardEl.appendChild(inner);
            this.multiGrid.appendChild(cardEl);
        }

        // If manual mode, show button conditionally
        if (this.currentRoom.settings.modeType === 'manual') {
             this.multiRevealBtn.classList.remove('hidden');
             this.multiRevealBtn.disabled = true; // Wait for turn
        } else {
             this.multiRevealBtn.classList.add('hidden');
        }
    },

    revealCard: function(value) {
        const cardEl = this.multiGrid.querySelector(`.card[data-value="${value}"]`);
        if (cardEl) {
            cardEl.classList.add('revealed');
        }
    },

    updateTurn: function(data) {
        const player = this.currentRoom.players[data.playerIndex];
        this.multiTurnDisplay.textContent = `Turn: ${player.username}`;

        if (player.id === this.socket.id) {
             this.multiRevealBtn.disabled = false;
             this.multiTurnDisplay.style.color = 'green';
             this.multiTurnDisplay.textContent += " (YOU)";
        } else {
             this.multiRevealBtn.disabled = true;
             this.multiTurnDisplay.style.color = 'black';
        }

        // Timer visual could go here
    },

    handleGameOver: function(data) {
        this.multiPlay.classList.add('hidden');
        this.multiResult.classList.remove('hidden');

        if (data.winners.length > 0) {
            const names = data.winners.map(w => w.username).join(', ');
            this.multiResultMsg.textContent = `Winner(s): ${names}! Prize: ${data.prize}`;

            // Check if I won
            if (data.winners.some(w => w.id === this.socket.id)) {
                this.socket.emit('request_gold_sync'); // Or wait for update_self
            }
        } else {
            this.multiResultMsg.textContent = "Draw! No one won.";
        }
    },

    resetGameUI: function() {
        this.multiSetup.classList.remove('hidden');
        this.multiPlay.classList.add('hidden');
        this.multiResult.classList.add('hidden');
        this.multiInputs.innerHTML = ''; // Will re-render
    },

    giftGold: function(username, amount) {
        if (!this.socket) {
             alert("Not connected");
             return;
        }
        this.socket.emit('gift_gold', { targetUsername: username, amount: amount });
    }
};

window.Multiplayer = Multiplayer;
