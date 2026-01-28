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
            this.createRoomBtn.addEventListener('click', this.handleCreateRoom.bind(this));
        }

        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => {
                Auth.logout();
                // App listener will handle redirection to login
            });
        }
    },

    /**
     * Called when entering the Multiplayer Screen
     */
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

             // Initial load
             const rooms = JSON.parse(localStorage.getItem('lotgo_mock_rooms') || '[]');
             this.renderMockRooms(rooms);

             // Poll for changes? Or just static for now since single user.
             return;
        }

        if (!Config.db) {
            this.errorDisplay.textContent = "Database connection not available.";
            return;
        }

        // Unsubscribe previous listener if any
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
                     this.errorDisplay.style.display = 'block'; // Ensure visible red banner
                     this.errorDisplay.style.backgroundColor = '#ff4444';
                     this.errorDisplay.style.color = 'white';
                     this.errorDisplay.style.padding = '10px';
                } else {
                     this.errorDisplay.textContent = "Error loading rooms: " + error.message;
                }
            });
    },

    renderMockRooms: function(rooms) {
        this.roomList.innerHTML = '';
        if (rooms.length === 0) {
            this.roomList.innerHTML = '<p>No active rooms. Create one (Mock)!</p>';
            return;
        }
        rooms.forEach((room, index) => {
             const el = document.createElement('div');
             el.className = 'room-item';
             el.style.border = '1px solid #ccc';
             el.style.padding = '10px';
             el.style.margin = '5px 0';
             el.style.display = 'flex';
             el.style.justifyContent = 'space-between';
             el.style.alignItems = 'center';

             el.innerHTML = `
                <span>Mock Room ${index+1} (Mode: ${room.modeIndex === 2 ? '6/40' : 'Unknown'}) | Players: ${room.players.length}/10</span>
                <button onclick="Multiplayer.joinRoom('${room.id}')">Join</button>
            `;
            this.roomList.appendChild(el);
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
            const el = document.createElement('div');
            el.className = 'room-item';
            el.style.border = '1px solid #ccc';
            el.style.padding = '10px';
            el.style.margin = '5px 0';
            el.style.display = 'flex';
            el.style.justifyContent = 'space-between';
            el.style.alignItems = 'center';

            el.innerHTML = `
                <span>Mode: ${room.modeIndex === 2 ? '6/40' : 'Unknown'} | Players: ${room.players ? room.players.length : 0}/10</span>
                <button onclick="Multiplayer.joinRoom('${doc.id}')">Join</button>
            `;
            this.roomList.appendChild(el);
        });
    },

    handleCreateRoom: async function() {
        if (!Auth.currentUser) return;

        if (Config.isMock) {
            const rooms = JSON.parse(localStorage.getItem('lotgo_mock_rooms') || '[]');
            rooms.push({
                id: 'mock_room_' + Date.now(),
                host: Auth.currentUser.uid,
                status: 'waiting',
                createdAt: Date.now(),
                players: [Auth.currentUser.uid],
                modeIndex: 2
            });
            localStorage.setItem('lotgo_mock_rooms', JSON.stringify(rooms));
            this.renderMockRooms(rooms);
            return;
        }

        if (!Config.db) return;

        try {
            await Config.db.collection('rooms').add({
                host: Auth.currentUser.uid,
                status: 'waiting',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                players: [Auth.currentUser.uid],
                modeIndex: 2 // Restricted to Mode 2 (6/40) as per memory
            });
        } catch (e) {
            console.error("Error creating room:", e);
            this.errorDisplay.textContent = e.message;
        }
    },

    joinRoom: function(roomId) {
        if (!Auth.currentUser) return;

        if (Config.isMock) {
            const rooms = JSON.parse(localStorage.getItem('lotgo_mock_rooms') || '[]');
            const room = rooms.find(r => r.id === roomId);
            if (!room) { alert("Room not found"); return; }

            if (!room.players.includes(Auth.currentUser.uid)) {
                if (room.players.length >= 10) { alert("Room full"); return; }
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

        // Transaction to join room
        const roomRef = Config.db.collection('rooms').doc(roomId);
        const uid = Auth.currentUser.uid;

        Config.db.runTransaction(async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists) throw "Room does not exist!";

            const data = roomDoc.data();
            if (data.players.includes(uid)) return; // Already joined
            if (data.players.length >= 10) throw "Room is full!";

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
