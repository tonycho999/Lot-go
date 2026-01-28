// js/multiplayer.js

const Multiplayer = {
    currentRoomId: null,
    unsubscribeRoom: null,

    init: function() {
        this.cacheDOM();
        this.bindEvents();
    },

    cacheDOM: function() {
        // Main Lobby
        this.screen = document.getElementById('multiplayer-screen');
        this.backBtn = document.getElementById('mp-back-btn');
        this.goldDisplay = document.getElementById('mp-gold-display');

        // Tabs
        this.tabs = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');

        // Games Tab
        this.createRoomBtn = document.getElementById('create-room-btn');
        this.roomList = document.getElementById('room-list');
        this.errorDisplay = document.getElementById('mp-error');

        // Create Room Modal
        this.createRoomModal = document.getElementById('create-room-modal');
        this.roomTitleInput = document.getElementById('room-title');
        this.roomMaxPlayersInput = document.getElementById('room-max-players');
        // roomCardModeInput removed
        this.roomRevealTypeInput = document.getElementById('room-reveal-type');
        this.submitRoomBtn = document.getElementById('submit-room-btn');
        this.cancelRoomBtn = document.getElementById('cancel-room-btn');

        // Profile Tab
        this.profileUsername = document.getElementById('profile-username');
        this.profileEmail = document.getElementById('profile-email');
        this.logoutBtn = document.getElementById('mp-logout-btn');

        // Room Lobby (Inside Room)
        this.roomLobbyScreen = document.getElementById('room-lobby-screen');
        this.leaveRoomBtn = document.getElementById('leave-room-btn');
        this.lobbyRoomTitle = document.getElementById('lobby-room-title');
        this.lobbyPlayerList = document.getElementById('lobby-player-list');
        this.playerCount = document.getElementById('player-count');
        this.readyBtn = document.getElementById('mp-ready-btn');
        this.startBtn = document.getElementById('mp-start-btn');
        this.roomStatusMsg = document.getElementById('room-status-msg');
    },

    bindEvents: function() {
        if (this.backBtn) {
            this.backBtn.addEventListener('click', () => {
                if (window.App) App.showLobby();
            });
        }

        this.tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetId = tab.dataset.tab;
                this.switchTab(targetId);
            });
        });

        if (this.createRoomBtn) {
            this.createRoomBtn.addEventListener('click', () => {
                this.createRoomModal.classList.remove('hidden');
            });
        }

        if (this.cancelRoomBtn) {
            this.cancelRoomBtn.addEventListener('click', () => {
                this.createRoomModal.classList.add('hidden');
            });
        }

        if (this.submitRoomBtn) {
            this.submitRoomBtn.addEventListener('click', this.handleSubmitCreateRoom.bind(this));
        }

        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => {
                Auth.logout();
            });
        }

        // Room Lobby Events
        if (this.leaveRoomBtn) this.leaveRoomBtn.addEventListener('click', this.leaveRoom.bind(this));
        if (this.readyBtn) this.readyBtn.addEventListener('click', this.toggleReady.bind(this));
        if (this.startBtn) this.startBtn.addEventListener('click', this.handleStartGame.bind(this));
    },

    showLobby: function() {
        this.updateProfile();
        this.fetchRooms();
    },

    switchTab: function(tabId) {
        this.tabs.forEach(t => t.classList.remove('active'));
        this.tabContents.forEach(c => {
            c.classList.add('hidden');
            c.classList.remove('active');
        });

        const activeTab = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        const activeContent = document.getElementById(tabId);

        if (activeTab) activeTab.classList.add('active');
        if (activeContent) {
            activeContent.classList.remove('hidden');
            activeContent.classList.add('active');
        }
    },

    updateProfile: function() {
        const user = Auth.currentUser;
        if (user) {
            if (this.profileEmail) this.profileEmail.textContent = user.email;
            if (this.profileUsername) this.profileUsername.textContent = user.email.split('@')[0];
        }
        if (this.goldDisplay && window.Game) {
            this.goldDisplay.textContent = `Gold: ${Game.state.gold.toLocaleString()}`;
        }
    },

    fetchRooms: function() {
        if (Config.isMock) {
             this.errorDisplay.textContent = "Mock Mode: Using local storage for rooms.";
             this.errorDisplay.style.color = 'orange';
             const rooms = JSON.parse(localStorage.getItem('lotgo_mock_rooms') || '[]');
             this.renderMockRooms(rooms);
             return;
        }

        if (!Config.db) {
            this.errorDisplay.textContent = "Database connection not available.";
            return;
        }

        if (this.unsubscribeRooms) {
            this.unsubscribeRooms();
        }

        this.unsubscribeRooms = Config.db.collection('rooms')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .onSnapshot(snapshot => {
                this.renderRooms(snapshot.docs);
            }, error => {
                console.error("Error fetching rooms:", error);
                this.errorDisplay.textContent = error.message;
            });
    },

    handleSubmitCreateRoom: async function() {
        if (!Auth.currentUser) return;

        const title = this.roomTitleInput.value.trim() || `${Auth.currentUser.email.split('@')[0]}'s Room`;
        const maxPlayers = parseInt(this.roomMaxPlayersInput.value);
        const cardMode = 2; // Hardcoded to 6/40 Cards (Mode 2)
        const revealType = this.roomRevealTypeInput.value;

        if (maxPlayers < 2 || maxPlayers > 10) {
            alert("Players must be between 2 and 10");
            return;
        }

        const roomData = {
            title: title,
            host: Auth.currentUser.uid,
            status: 'waiting',
            createdAt: Config.isMock ? Date.now() : firebase.firestore.FieldValue.serverTimestamp(),
            players: [Auth.currentUser.uid],
            readyPlayers: [], // Track ready status
            maxPlayers: maxPlayers,
            modeIndex: cardMode,
            revealType: revealType
        };

        let newRoomId;

        if (Config.isMock) {
            const rooms = JSON.parse(localStorage.getItem('lotgo_mock_rooms') || '[]');
            newRoomId = 'mock_room_' + Date.now();
            roomData.id = newRoomId;
            rooms.push(roomData);
            localStorage.setItem('lotgo_mock_rooms', JSON.stringify(rooms));
            this.renderMockRooms(rooms);
            this.createRoomModal.classList.add('hidden');
        } else {
            if (!Config.db) return;
            try {
                const docRef = await Config.db.collection('rooms').add(roomData);
                newRoomId = docRef.id;
                this.createRoomModal.classList.add('hidden');
            } catch (e) {
                console.error("Error creating room:", e);
                alert("Error: " + e.message);
                return;
            }
        }

        // Enter Room Lobby
        this.enterRoomLobby(newRoomId);
    },

    enterRoomLobby: function(roomId) {
        this.currentRoomId = roomId;
        App.showScreen('roomLobby'); // Navigate to new screen

        if (Config.isMock) {
            // Mock subscription (polling or event based)
            this.updateRoomLobbyUI();
            // Start a poller for mock updates?
            if (this.mockPoller) clearInterval(this.mockPoller);
            this.mockPoller = setInterval(this.updateRoomLobbyUI.bind(this), 1000);
            return;
        }

        if (!Config.db) return;

        if (this.unsubscribeRoom) this.unsubscribeRoom();

        this.unsubscribeRoom = Config.db.collection('rooms').doc(roomId)
            .onSnapshot(doc => {
                if (!doc.exists) {
                    alert("Room was deleted!");
                    this.leaveRoom();
                    return;
                }
                const room = doc.data();
                this.renderRoomLobby(room);
            }, error => {
                console.error("Error listening to room:", error);
            });
    },

    updateRoomLobbyUI: function() {
        if (!Config.isMock) return;
        const rooms = JSON.parse(localStorage.getItem('lotgo_mock_rooms') || '[]');
        const room = rooms.find(r => r.id === this.currentRoomId);
        if (room) {
            this.renderRoomLobby(room);
        } else {
             alert("Room ended (Mock)");
             this.leaveRoom();
        }
    },

    renderRoomLobby: function(room) {
        this.lobbyRoomTitle.textContent = room.title;
        this.playerCount.textContent = `${room.players.length}/${room.maxPlayers}`;
        this.lobbyPlayerList.innerHTML = '';

        const isHost = room.host === Auth.currentUser.uid;
        let allReady = true;

        room.players.forEach(uid => {
             const isReady = room.readyPlayers && room.readyPlayers.includes(uid);
             // Assume host is implicitly "ready" or doesn't need to check "ready" button?
             // Prompt says: "Participants... OK button... if all agree... Host starts"
             // So participants need readiness. Host controls flow.

             // If UID is NOT host, check readiness
             if (uid !== room.host && !isReady) {
                 allReady = false;
             }

             const el = document.createElement('div');
             el.className = 'room-item'; // Reuse style
             el.style.background = isReady ? '#d5f5e3' : '#fff'; // Greenish if ready
             el.innerHTML = `
                <span>${uid === room.host ? '👑 Host' : 'Player'} (${uid.substring(0, 6)}...)</span>
                <span>${isReady ? '✅ Ready' : '⏳ Waiting'}</span>
             `;
             this.lobbyPlayerList.appendChild(el);
        });

        // Button Visibility
        if (isHost) {
            this.startBtn.classList.remove('hidden');
            this.readyBtn.classList.add('hidden');

            // Enable start only if >1 player and all are ready
            // (Assuming single player test might want to start alone? But prompt implies participants)
            // Let's enforce > 1 player for multiplayer logic usually, but user didn't specify.
            // "Participants all agree" -> implies > 0 participants.

            const hasParticipants = room.players.length > 1;
            if (hasParticipants && allReady) {
                this.startBtn.disabled = false;
                this.roomStatusMsg.textContent = "All players ready! You can start.";
            } else {
                this.startBtn.disabled = true;
                this.roomStatusMsg.textContent = "Waiting for players to be ready...";
            }
        } else {
            // Joiner
            this.startBtn.classList.add('hidden');
            this.readyBtn.classList.remove('hidden');

            // Check if I am ready
            const amIReady = room.readyPlayers && room.readyPlayers.includes(Auth.currentUser.uid);
            this.readyBtn.textContent = amIReady ? "Cancel Ready" : "OK (Ready)";
            this.roomStatusMsg.textContent = amIReady ? "Waiting for host to start..." : "Please click OK to get ready.";
        }

        if (room.status === 'playing') {
            alert("Game Started! (Logic pending)");
            // In real impl, redirect to Game screen
        }
    },

    toggleReady: async function() {
        if (!Auth.currentUser || !this.currentRoomId) return;
        const uid = Auth.currentUser.uid;

        if (Config.isMock) {
            const rooms = JSON.parse(localStorage.getItem('lotgo_mock_rooms') || '[]');
            const roomIndex = rooms.findIndex(r => r.id === this.currentRoomId);
            if (roomIndex > -1) {
                const room = rooms[roomIndex];
                if (!room.readyPlayers) room.readyPlayers = [];

                if (room.readyPlayers.includes(uid)) {
                    room.readyPlayers = room.readyPlayers.filter(id => id !== uid);
                } else {
                    room.readyPlayers.push(uid);
                }
                rooms[roomIndex] = room;
                localStorage.setItem('lotgo_mock_rooms', JSON.stringify(rooms));
                this.updateRoomLobbyUI();
            }
            return;
        }

        if (!Config.db) return;
        const roomRef = Config.db.collection('rooms').doc(this.currentRoomId);

        try {
             await Config.db.runTransaction(async (t) => {
                 const doc = await t.get(roomRef);
                 if (!doc.exists) throw "Room lost";
                 const data = doc.data();
                 const readyPlayers = data.readyPlayers || [];

                 let newReady;
                 if (readyPlayers.includes(uid)) {
                     newReady = readyPlayers.filter(id => id !== uid);
                 } else {
                     newReady = [...readyPlayers, uid];
                 }
                 t.update(roomRef, { readyPlayers: newReady });
             });
        } catch (e) {
            console.error("Toggle Ready failed", e);
        }
    },

    handleStartGame: async function() {
        if (!this.currentRoomId) return;

        if (Config.isMock) {
             const rooms = JSON.parse(localStorage.getItem('lotgo_mock_rooms') || '[]');
             const roomIndex = rooms.findIndex(r => r.id === this.currentRoomId);
             if (roomIndex > -1) {
                 rooms[roomIndex].status = 'playing';
                 localStorage.setItem('lotgo_mock_rooms', JSON.stringify(rooms));
                 this.updateRoomLobbyUI();
             }
             return;
        }

        if (!Config.db) return;
        try {
            await Config.db.collection('rooms').doc(this.currentRoomId).update({
                status: 'playing'
            });
        } catch (e) {
            console.error("Start game failed", e);
        }
    },

    leaveRoom: function() {
        // Just local leave for now, in real MP should remove player from list
        if (Config.isMock && this.mockPoller) clearInterval(this.mockPoller);
        if (this.unsubscribeRoom) this.unsubscribeRoom();

        this.currentRoomId = null;
        App.showScreen('multiplayer');
    },

    renderMockRooms: function(rooms) {
        this.roomList.innerHTML = '';
        if (rooms.length === 0) {
            this.roomList.innerHTML = '<p>No active rooms. Create one (Mock)!</p>';
            return;
        }
        rooms.forEach((room) => {
             this.renderRoomItem(room, room.id);
        });
    },

    renderRooms: function(docs) {
        this.roomList.innerHTML = '';
        if (docs.length === 0) {
            this.roomList.innerHTML = '<p>No active rooms. Create one!</p>';
            return;
        }

        docs.forEach(doc => {
            const room = doc.data();
            this.renderRoomItem(room, doc.id);
        });
    },

    renderRoomItem: function(room, id) {
        const el = document.createElement('div');
        el.className = 'room-item';
        el.style.border = '1px solid #ccc';
        el.style.padding = '10px';
        el.style.margin = '5px 0';
        el.style.display = 'flex';
        el.style.justifyContent = 'space-between';
        el.style.alignItems = 'center';
        el.style.background = '#fff';
        el.style.borderRadius = '10px';

        const modeName = this.getModeName(room.modeIndex);
        const revealName = room.revealType === 'auto' ? 'Auto (2s)' : 'Manual (5s)';

        el.innerHTML = `
            <div style="flex: 1;">
                <div style="font-weight:bold; font-size:1.1rem; color:#d35400;">${room.title || 'Untitled Room'}</div>
                <div style="font-size:0.9rem; color:#7f8c8d;">
                    ${modeName} • ${revealName} • ${room.players.length}/${room.maxPlayers || 10} Players
                </div>
            </div>
            <button onclick="Multiplayer.joinRoom('${id}')">Join</button>
        `;
        this.roomList.appendChild(el);
    },

    getModeName: function(index) {
        if (window.Game && Game.MODES[index]) {
            return Game.MODES[index].name;
        }
        return `Mode ${index}`;
    },

    joinRoom: function(roomId) {
        if (!Auth.currentUser) return;

        if (Config.isMock) {
            const rooms = JSON.parse(localStorage.getItem('lotgo_mock_rooms') || '[]');
            const room = rooms.find(r => r.id === roomId);
            if (!room) { alert("Room not found"); return; }

            if (!room.players.includes(Auth.currentUser.uid)) {
                if (room.players.length >= (room.maxPlayers || 10)) { alert("Room full"); return; }
                room.players.push(Auth.currentUser.uid);
                localStorage.setItem('lotgo_mock_rooms', JSON.stringify(rooms));
            }
            this.enterRoomLobby(roomId);
            return;
        }

        if (!Config.db) return;

        const roomRef = Config.db.collection('rooms').doc(roomId);
        const uid = Auth.currentUser.uid;

        Config.db.runTransaction(async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists) throw "Room does not exist!";

            const data = roomDoc.data();
            if (!data.players.includes(uid)) {
                 if (data.players.length >= (data.maxPlayers || 10)) throw "Room is full!";
                 transaction.update(roomRef, {
                    players: firebase.firestore.FieldValue.arrayUnion(uid)
                 });
            }
        }).then(() => {
            this.enterRoomLobby(roomId);
        }).catch((e) => {
            alert("Failed to join: " + e);
        });
    }
};

window.Multiplayer = Multiplayer;

document.addEventListener('DOMContentLoaded', () => {
    Multiplayer.init();
});
