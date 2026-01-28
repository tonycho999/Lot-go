// js/multiplayer.js

const Multiplayer = {
    init: function() {
        this.cacheDOM();
        this.bindEvents();
    },

    cacheDOM: function() {
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
        this.roomCardModeInput = document.getElementById('room-card-mode');
        this.roomRevealTypeInput = document.getElementById('room-reveal-type');
        this.submitRoomBtn = document.getElementById('submit-room-btn');
        this.cancelRoomBtn = document.getElementById('cancel-room-btn');

        // Profile Tab
        this.profileUsername = document.getElementById('profile-username');
        this.profileEmail = document.getElementById('profile-email');
        this.logoutBtn = document.getElementById('mp-logout-btn');
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
                // App listener will handle redirection to login
            });
        }
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
                if (error.code === 'permission-denied') {
                     this.errorDisplay.textContent = "Permission Denied: Please check Firestore Rules.";
                     this.errorDisplay.style.display = 'block';
                     this.errorDisplay.style.backgroundColor = '#ff4444';
                     this.errorDisplay.style.color = 'white';
                     this.errorDisplay.style.padding = '10px';
                } else {
                     this.errorDisplay.textContent = "Error loading rooms: " + error.message;
                }
            });
    },

    handleSubmitCreateRoom: async function() {
        if (!Auth.currentUser) return;

        const title = this.roomTitleInput.value.trim() || `${Auth.currentUser.email.split('@')[0]}'s Room`;
        const maxPlayers = parseInt(this.roomMaxPlayersInput.value);
        const cardMode = parseInt(this.roomCardModeInput.value);
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
            maxPlayers: maxPlayers,
            modeIndex: cardMode,
            revealType: revealType
        };

        if (Config.isMock) {
            const rooms = JSON.parse(localStorage.getItem('lotgo_mock_rooms') || '[]');
            roomData.id = 'mock_room_' + Date.now();
            rooms.push(roomData);
            localStorage.setItem('lotgo_mock_rooms', JSON.stringify(rooms));
            this.renderMockRooms(rooms);
            this.createRoomModal.classList.add('hidden');
            return;
        }

        if (!Config.db) return;

        try {
            await Config.db.collection('rooms').add(roomData);
            this.createRoomModal.classList.add('hidden');
            // List updates via listener
        } catch (e) {
            console.error("Error creating room:", e);
            alert("Error: " + e.message);
        }
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
        // Fallback if Game isn't loaded, though it should be
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
                this.renderMockRooms(rooms);
                alert("Joined Mock Room!");
            } else {
                alert("Already in room");
            }
            return;
        }

        if (!Config.db) return;

        const roomRef = Config.db.collection('rooms').doc(roomId);
        const uid = Auth.currentUser.uid;

        Config.db.runTransaction(async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists) throw "Room does not exist!";

            const data = roomDoc.data();
            if (data.players.includes(uid)) return;
            if (data.players.length >= (data.maxPlayers || 10)) throw "Room is full!";

            transaction.update(roomRef, {
                players: firebase.firestore.FieldValue.arrayUnion(uid)
            });
        }).then(() => {
            alert("Joined Room!");
        }).catch((e) => {
            alert("Failed to join: " + e);
        });
    }
};

window.Multiplayer = Multiplayer;

document.addEventListener('DOMContentLoaded', () => {
    Multiplayer.init();
});
