// js/app.js

import Auth from './auth.js';
import Multiplayer from './multiplayer.js';
import UserStore from './store.js';

const App = {
    isSignupMode: false,
    isMultiplayer: false,
    mpRoom: null,

    init: function() {
        this.cacheDOM();
        this.bindEvents();
        this.initMultiplayer();

        // Initialize Auth Listener
        Auth.init(async (user) => {
            if (user) {
                await UserStore.initUser(user);

                // Sync Game Gold with Cloud Gold
                UserStore.subscribeToUser(user.uid, (userData) => {
                    Game.state.gold = userData.gold;
                    this.updateGoldDisplays();
                });

                this.showLobby();
            } else {
                UserStore.unsubscribe();
                this.showScreen('auth');
            }
        });
    },

    cacheDOM: function() {
        this.screens = {
            auth: document.getElementById('auth-screen'),
            lobby: document.getElementById('lobby-screen'),
            game: document.getElementById('game-screen')
        };

        // Auth
        this.authTitle = document.getElementById('auth-title');
        this.authActionBtn = document.getElementById('auth-action-btn');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.confirmPasswordInput = document.getElementById('confirm-password');
        this.confirmPasswordGroup = document.getElementById('confirm-password-group');
        this.authError = document.getElementById('auth-error');
        this.toggleAuthBtn = document.getElementById('toggle-auth-btn');

        // Lobby
        this.headerLogoutBtn = document.getElementById('header-logout-btn');
        this.userGoldDisplay = document.getElementById('user-gold');
        this.modeButtons = document.querySelectorAll('.mode-btn');
        this.watchAdBtn = document.getElementById('watch-ad-btn');
        this.multiplayerBtn = document.getElementById('multiplayer-btn');

        // Tabs
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');

        // Profile
        this.profileEmail = document.getElementById('profile-email');
        this.logoutBtn = document.getElementById('logout-btn');
        this.signoutBtn = document.getElementById('signout-btn');

        // Gifting
        this.giftEmail = document.getElementById('gift-email');
        this.giftAmount = document.getElementById('gift-amount');
        this.sendGiftBtn = document.getElementById('send-gift-btn');

        // Admin
        this.adminPanel = document.getElementById('admin-panel');
        this.adminGiftEmail = document.getElementById('admin-gift-email');
        this.adminGiftAmount = document.getElementById('admin-gift-amount');
        this.adminSendBtn = document.getElementById('admin-send-btn');

        // Multiplayer Lobby
        this.mpLobbyScreen = document.getElementById('multiplayer-lobby-screen');
        this.roomsList = document.getElementById('rooms-list');
        this.createRoomBtn = document.getElementById('create-room-btn');
        this.backToMainLobbyBtn = document.getElementById('back-to-main-lobby');

        // Create Room Modal
        this.createRoomModal = document.getElementById('create-room-modal');
        this.confirmCreateRoomBtn = document.getElementById('confirm-create-room');
        this.cancelCreateRoomBtn = document.getElementById('cancel-create-room');
        this.roomModeSelect = document.getElementById('room-mode');
        this.roomOpenTypeSelect = document.getElementById('room-open-type');
        this.roomPasswordInput = document.getElementById('room-password');

        // Multiplayer Room (Waiting)
        this.mpRoomScreen = document.getElementById('mp-room-screen');
        this.leaveRoomBtn = document.getElementById('leave-room-btn');
        this.roomTitle = document.getElementById('room-title');
        this.roomInfo = document.getElementById('room-info');
        this.playersList = document.getElementById('players-list');
        this.mpReadyBtn = document.getElementById('mp-ready-btn');
        this.mpStartBtn = document.getElementById('mp-start-btn');

        // Ad Modal
        this.adModal = document.getElementById('ad-modal');
        this.adTimer = document.getElementById('ad-timer');
        this.adProgress = document.getElementById('ad-progress');

        // Game
        this.backToLobbyBtn = document.getElementById('back-to-lobby');
        this.gameGoldDisplay = document.getElementById('game-gold-display');
        this.currentPrizeDisplay = document.getElementById('current-prize-display');
        this.gameTitle = document.getElementById('game-title');

        // Phase 1
        this.setupPhase = document.getElementById('setup-phase');
        this.targetCountSpan = document.getElementById('target-count');
        this.numberInputsContainer = document.getElementById('number-inputs');
        this.setupError = document.getElementById('setup-error');
        this.startGameBtn = document.getElementById('start-game-btn');

        // Phase 2
        this.playPhase = document.getElementById('play-phase');
        this.gameStatus = document.getElementById('game-status');
        this.cardsGrid = document.getElementById('cards-grid');
        this.selectedNumbersList = document.getElementById('selected-numbers-list');

        // Result
        this.gameResult = document.getElementById('game-result');
        this.resultMessage = document.getElementById('result-message');
        this.collectBtn = document.getElementById('collect-btn');
    },

    bindEvents: function() {
        this.authActionBtn.addEventListener('click', this.handleAuthAction.bind(this));
        this.toggleAuthBtn.addEventListener('click', this.toggleAuthMode.bind(this));
        this.headerLogoutBtn.addEventListener('click', this.handleLogout.bind(this));

        this.modeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modeIndex = parseInt(btn.closest('.mode-btn').dataset.mode);
                this.enterGameMode(modeIndex);
            });
        });

        this.multiplayerBtn.addEventListener('click', this.showMultiplayerLobby.bind(this));
        this.backToMainLobbyBtn.addEventListener('click', this.showLobby.bind(this));

        this.createRoomBtn.addEventListener('click', () => this.createRoomModal.classList.remove('hidden'));
        this.cancelCreateRoomBtn.addEventListener('click', () => this.createRoomModal.classList.add('hidden'));
        this.confirmCreateRoomBtn.addEventListener('click', this.handleCreateRoom.bind(this));

        this.leaveRoomBtn.addEventListener('click', this.handleLeaveRoom.bind(this));
        this.mpReadyBtn.addEventListener('click', this.handleToggleReady.bind(this));
        this.mpStartBtn.addEventListener('click', this.handleMultiplayerStart.bind(this));

        // Delegate Join Room clicks
        this.roomsList.addEventListener('click', this.handleJoinRoomClick.bind(this));

        // Tabs
        this.tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Profile & Gifting
        this.logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        this.signoutBtn.addEventListener('click', this.handleLogout.bind(this)); // Same for now
        this.sendGiftBtn.addEventListener('click', this.handleSendGift.bind(this));
        this.adminSendBtn.addEventListener('click', this.handleAdminGrant.bind(this));

        this.watchAdBtn.addEventListener('click', this.handleWatchAd.bind(this));
        this.backToLobbyBtn.addEventListener('click', this.showLobby.bind(this));
        this.startGameBtn.addEventListener('click', this.handleStartGame.bind(this));

        // Card clicks are delegated to the grid
        this.cardsGrid.addEventListener('click', this.handleCardClick.bind(this));

        this.collectBtn.addEventListener('click', this.showLobby.bind(this));
    },

    showScreen: function(screenName) {
        Object.values(this.screens).forEach(el => el.classList.add('hidden'));
        Object.values(this.screens).forEach(el => el.classList.remove('active'));

        if (this.screens[screenName]) {
            this.screens[screenName].classList.remove('hidden');
            this.screens[screenName].classList.add('active');
        }
    },

    toggleAuthMode: function(e) {
        e.preventDefault();
        this.isSignupMode = !this.isSignupMode;
        if (this.isSignupMode) {
            this.authTitle.textContent = "Sign Up for Lot-Go";
            this.authActionBtn.textContent = "Sign Up";
            this.toggleAuthBtn.textContent = "Have an account? Login";
            this.confirmPasswordGroup.classList.remove('hidden');
        } else {
            this.authTitle.textContent = "Login to Lot-Go";
            this.authActionBtn.textContent = "Login";
            this.toggleAuthBtn.textContent = "Create Account";
            this.confirmPasswordGroup.classList.add('hidden');
        }
        this.authError.textContent = "";
    },

    handleAuthAction: async function() {
        const email = this.emailInput.value;
        const password = this.passwordInput.value;

        if (!email || !password) {
            this.authError.textContent = "Please enter email and password";
            return;
        }

        if (this.isSignupMode) {
            const confirm = this.confirmPasswordInput.value;
            if (password !== confirm) {
                this.authError.textContent = "Passwords do not match!";
                return;
            }
        }

        this.authActionBtn.disabled = true;
        this.authError.textContent = "Processing...";

        let result;
        if (this.isSignupMode) {
            result = await Auth.signup(email, password);
        } else {
            result = await Auth.login(email, password);
        }

        this.authActionBtn.disabled = false;

        if (result.success) {
            this.authError.textContent = "";
            // Auth listener will handle redirect
        } else {
            this.authError.textContent = result.message;
        }
    },

    initMultiplayer: function() {
        Multiplayer.init({
            onRoomsUpdate: (rooms) => this.renderRoomsList(rooms),
            onRoomStateUpdate: (room) => this.updateRoomUI(room),
            onJoinSuccess: (roomId) => this.showScreen('mp-room-screen'),
            onError: (msg) => this.renderMultiplayerError(msg),
            onGameStart: (room) => this.enterMultiplayerGame(room)
        });
    },

    renderMultiplayerError: function(msg) {
        if (this.roomsList) {
            this.roomsList.innerHTML = `
                <div class="error-banner" style="background: #e74c3c; color: white; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                    <strong>Error:</strong> ${msg}
                </div>
            `;
        } else {
            alert(msg);
        }
    },

    showLobby: function() {
        this.updateGoldDisplays();
        this.isMultiplayer = false;
        this.mpRoom = null;
        Multiplayer.unsubscribeFromRooms(); // Stop listening if we leave MP lobby

        // Update Profile Info
        if (Auth.user) {
            this.profileEmail.textContent = Auth.user.email;
            if (Auth.user.email === 'tonycho999@gmail.com') {
                this.adminPanel.classList.remove('hidden');
            } else {
                this.adminPanel.classList.add('hidden');
            }
        }

        this.showScreen('lobby');
    },

    switchTab: function(tabName) {
        this.tabButtons.forEach(btn => {
            if (btn.dataset.tab === tabName) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        this.tabContents.forEach(content => {
            if (content.id === `tab-${tabName}`) content.classList.remove('hidden');
            else content.classList.add('hidden');
        });

        if (tabName === 'profile') {
             // Refresh displays
             this.updateGoldDisplays();
        }
    },

    handleLogout: async function() {
        UserStore.unsubscribe();
        await Auth.logout();
        this.showScreen('auth');
    },

    handleSendGift: async function() {
        const email = this.giftEmail.value;
        const amount = parseInt(this.giftAmount.value);

        if (!email || isNaN(amount)) {
            alert("Invalid input");
            return;
        }

        if (amount < 100000) {
            alert("Minimum amount is 100,000");
            return;
        }

        try {
            this.sendGiftBtn.disabled = true;
            this.sendGiftBtn.textContent = "Sending...";
            await UserStore.sendGift(Auth.user.uid, email, amount);
            alert("Gift Sent!");
            this.giftEmail.value = '';
            this.giftAmount.value = '';
        } catch (e) {
            console.error(e);
            if (e.code === 'permission-denied') {
                alert("Permission Denied: Please check Firestore Rules in SETUP.md");
            } else {
                alert(e.message);
            }
        } finally {
            this.sendGiftBtn.disabled = false;
            this.sendGiftBtn.textContent = "Send Gold";
        }
    },

    handleAdminGrant: async function() {
        const email = this.adminGiftEmail.value;
        const amount = parseInt(this.adminGiftAmount.value);

        if (!email || isNaN(amount)) return;

        try {
            await UserStore.adminGrantGold(email, amount);
            alert("Admin Grant Successful");
        } catch (e) {
            console.error(e);
            if (e.code === 'permission-denied') {
                alert("Permission Denied: Please check Firestore Rules in SETUP.md");
            } else {
                alert(e.message);
            }
        }
    },

    showMultiplayerLobby: function() {
        this.showScreen('multiplayer-lobby-screen');
        Multiplayer.subscribeToRooms();
    },

    renderRoomsList: function(rooms) {
        this.roomsList.innerHTML = '';
        if (rooms.length === 0) {
            this.roomsList.innerHTML = '<p>No rooms available. Create one!</p>';
            return;
        }

        rooms.forEach(room => {
            const div = document.createElement('div');
            div.className = 'room-item';
            div.innerHTML = `
                <div>
                    <strong>${room.hostName}'s Room</strong>
                    <br>
                    <small>Mode: ${Game.MODES[room.modeIndex].name} | ${room.openType.toUpperCase()} | Players: ${room.players.length}</small>
                    ${room.password ? '🔒' : ''}
                </div>
                <button class="join-room-btn" data-id="${room.id}" data-has-password="${!!room.password}">Join</button>
            `;
            this.roomsList.appendChild(div);
        });
    },

    handleCreateRoom: async function() {
        const mode = this.roomModeSelect.value;
        const type = this.roomOpenTypeSelect.value;
        const pass = this.roomPasswordInput.value;

        await Multiplayer.createRoom(mode, type, pass);
        this.createRoomModal.classList.add('hidden');
    },

    handleJoinRoomClick: async function(e) {
        if (!e.target.classList.contains('join-room-btn')) return;

        const btn = e.target;
        const roomId = btn.dataset.id;
        const hasPassword = btn.dataset.hasPassword === 'true';
        let password = null;

        if (hasPassword) {
            password = prompt("Enter Room Password:");
            if (password === null) return;
        }

        await Multiplayer.joinRoom(roomId, password);
    },

    handleLeaveRoom: function() {
        Multiplayer.leaveRoom();
        this.showMultiplayerLobby();
    },

    handleToggleReady: function() {
        // Toggle based on button text or state?
        // Let's assume current state from UI
        const isReady = this.mpReadyBtn.textContent === "Ready"; // If it says Ready, we are not ready
        // Wait, if button says "Ready", it means "Click to be Ready".
        // If button says "Cancel Ready", it means "Click to un-ready".

        // Actually, let's track local state or just read from room update?
        // Better: toggle based on text.
        const targetState = this.mpReadyBtn.classList.contains('ready-active') ? false : true;
        Multiplayer.setReady(targetState);
    },

    handleMultiplayerStart: function() {
        Multiplayer.startGame();
    },

    updateRoomUI: function(room) {
        // Find self
        const me = room.players.find(p => p.uid === Auth.user.uid);
        if (!me) {
            // I was kicked or removed?
            this.showMultiplayerLobby();
            return;
        }

        this.roomTitle.textContent = `Room: ${room.hostName}`;
        this.roomInfo.textContent = `Mode: ${Game.MODES[room.modeIndex].name} | Type: ${room.openType}`;

        // Players List
        this.playersList.innerHTML = '';
        let allReady = true;

        room.players.forEach(p => {
            const li = document.createElement('li');
            li.textContent = `${p.name} ${p.isHost ? '(Host)' : ''} - ${p.ready ? 'READY' : 'Waiting'}`;
            li.style.color = p.ready ? 'green' : 'orange';
            this.playersList.appendChild(li);
            if (!p.ready) allReady = false;
        });

        // Update Ready Button State
        if (me.ready) {
            this.mpReadyBtn.textContent = "Cancel Ready";
            this.mpReadyBtn.classList.add('ready-active');
            this.mpReadyBtn.style.background = '#e74c3c';
        } else {
            this.mpReadyBtn.textContent = "Ready";
            this.mpReadyBtn.classList.remove('ready-active');
            this.mpReadyBtn.style.background = '#2ecc71';
        }

        // Show Start Button for Host
        if (me.isHost && allReady && room.players.length > 0) { // Should be > 1? User said "Several users", maybe 1 is ok for testing.
            this.mpStartBtn.classList.remove('hidden');
        } else {
            this.mpStartBtn.classList.add('hidden');
        }
    },

    enterMultiplayerGame: function(room) {
        this.mpRoom = room;
        this.isMultiplayer = true;

        // Handle States
        if (room.status === 'setup') {
            // Only re-render if not already in setup setup
            if (this.playPhase.classList.contains('hidden') && this.gameResult.classList.contains('hidden')) {
                 this.setupMultiplayerPhase(room);
            } else {
                // Already in setup, maybe just update waiting status
                this.setupMultiplayerPhase(room);
            }
        } else if (room.status === 'playing') {
            if (this.playPhase.classList.contains('hidden')) {
                this.playMultiplayerPhase(room);
            } else {
                this.updateMultiplayerGame(room);
            }
        } else if (room.status === 'finished') {
            if (this.gameResult.classList.contains('hidden')) {
                this.finishMultiplayerGame(room);
            }
        }
    },

    setupMultiplayerPhase: function(room) {
        // Find self
        const me = room.players.find(p => p.uid === Auth.user.uid);

        if (me.hasSetup) {
             // Already submitted, waiting for others
             this.setupPhase.classList.remove('hidden');
             this.numberInputsContainer.innerHTML = '<p>Waiting for other players to select numbers...</p>';
             this.startGameBtn.classList.add('hidden');
             this.setupError.textContent = '';
             this.showScreen('game');
             return;
        }

        // Only render inputs if not already there (check inputs length?)
        if (this.numberInputsContainer.querySelectorAll('input').length > 0) return;

        // Show Setup UI
        const mode = Game.MODES[room.modeIndex];
        this.gameTitle.textContent = mode.name + " (Multiplayer)";
        this.targetCountSpan.textContent = mode.targetCount;
        this.renderNumberInputs(mode.targetCount, mode.maxNumber);

        this.setupPhase.classList.remove('hidden');
        this.playPhase.classList.add('hidden');
        this.gameResult.classList.add('hidden');
        this.currentPrizeDisplay.classList.add('hidden');
        this.startGameBtn.classList.remove('hidden');
        this.setupError.textContent = '';

        this.showScreen('game');
    },

    playMultiplayerPhase: function(room) {
        this.setupPhase.classList.add('hidden');
        this.playPhase.classList.remove('hidden');
        this.gameResult.classList.add('hidden');
        this.showScreen('game');

        // Setup my local targets for display
        const me = room.players.find(p => p.uid === Auth.user.uid);
        if (me && me.targetNumbers) {
             // Render selected numbers
             this.renderSelectedNumbers(me.targetNumbers);
        }

        // Render Board from Room Deck
        this.renderMultiplayerBoard(room);

        // Update Prize (Static Max Prize)
        const mode = Game.MODES[room.modeIndex];
        this.currentPrizeDisplay.textContent = `Prize: ${mode.maxPrize.toLocaleString()}`;
        this.currentPrizeDisplay.classList.remove('hidden');

        // Check Turn / Status
        if (room.openType === 'turn') {
            const currentTurnUser = room.players.find(p => p.uid === room.currentTurn);
            const isMyTurn = room.currentTurn === Auth.user.uid;
            this.gameStatus.textContent = isMyTurn ? "Your Turn!" : `Waiting for ${currentTurnUser ? currentTurnUser.name : 'someone'}...`;
        } else {
             this.gameStatus.textContent = "Watch carefully!";
        }

        // Host Auto Loop
        if (me.isHost && room.openType === 'auto' && !Multiplayer.autoInterval) {
            Multiplayer.startAutoLoop();
        }

        // Check Win Condition locally
        this.checkMultiplayerWin(room, me);
    },

    updateMultiplayerGame: function(room) {
        // Update Board
        const cards = this.cardsGrid.querySelectorAll('.card');
        room.deck.forEach((cardState, index) => {
            const cardEl = cards[index];
            if (!cardEl) return; // Should not happen if size is same

            // Check if status changed
            if (cardState.revealed && !cardEl.classList.contains('revealed')) {
                // Reveal it
                const me = room.players.find(p => p.uid === Auth.user.uid);
                const isTarget = me.targetNumbers.includes(cardState.value);

                // We use existing update logic helper but modified for MP context
                cardEl.classList.add('revealed');
                const inner = cardEl.querySelector('.card-inner');
                inner.style.transform = 'rotateY(180deg)';
                const back = cardEl.querySelector('.card-back');

                if (isTarget) {
                    back.classList.add('target');
                     // Update bottom list
                    const selectedEl = this.selectedNumbersList.querySelector(`.selected-number[data-value="${cardState.value}"]`);
                    if (selectedEl) selectedEl.classList.add('found');
                } else {
                    back.classList.add('dud');
                }
            }
        });

        // Update Turn Status
        if (room.openType === 'turn') {
            const currentTurnUser = room.players.find(p => p.uid === room.currentTurn);
            const isMyTurn = room.currentTurn === Auth.user.uid;
            this.gameStatus.textContent = isMyTurn ? "Your Turn!" : `Waiting for ${currentTurnUser ? currentTurnUser.name : 'someone'}...`;
        }

        // Check Win
        const me = room.players.find(p => p.uid === Auth.user.uid);
        this.checkMultiplayerWin(room, me);
    },

    renderMultiplayerBoard: function(room) {
        this.cardsGrid.innerHTML = '';

        // Grid Class
        this.cardsGrid.className = 'grid-container';
        const modeId = room.modeIndex;
        if (modeId === 1) this.cardsGrid.classList.add('grid-5x2'); // 4/10 is index 1
        else if (modeId === 2) this.cardsGrid.classList.add('grid-8x5'); // 6/40 is index 2

        room.deck.forEach((card, index) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card';
            if (card.revealed) cardEl.classList.add('revealed');
            cardEl.dataset.index = index;

            const inner = document.createElement('div');
            inner.className = 'card-inner';
            if (card.revealed) inner.style.transform = 'rotateY(180deg)';

            const front = document.createElement('div');
            front.className = 'card-front';
            front.textContent = '?';

            const back = document.createElement('div');
            back.className = 'card-back';
            back.textContent = card.value;

            // Highlight if it's one of MY targets
            const me = room.players.find(p => p.uid === Auth.user.uid);
            const isTarget = me.targetNumbers.includes(card.value);

            if (isTarget) {
                back.classList.add('target');
                if (card.revealed) {
                    // Update bottom list
                    const selectedEl = this.selectedNumbersList.querySelector(`.selected-number[data-value="${card.value}"]`);
                    if (selectedEl) selectedEl.classList.add('found');
                }
            } else {
                back.classList.add('dud');
            }

            inner.appendChild(front);
            inner.appendChild(back);
            cardEl.appendChild(inner);

            this.cardsGrid.appendChild(cardEl);
        });
    },

    checkMultiplayerWin: function(room, me) {
        if (room.status === 'finished') return;

        const myTargets = me.targetNumbers;
        const revealedValues = room.deck.filter(c => c.revealed).map(c => c.value);

        const allFound = myTargets.every(t => revealedValues.includes(t));

        if (allFound) {
            // Claim Win!
             const mode = Game.MODES[room.modeIndex];
             Multiplayer.claimWin(mode.maxPrize);
        }
    },

    finishMultiplayerGame: function(room) {
        Multiplayer.stopAutoLoop();

        this.resultMessage.textContent = `Winner: ${room.winner.name} (+${room.winner.prize})`;

        if (room.winner.uid === Auth.user.uid) {
            // I won
            // Game.addGold(room.winner.prize); // Local only, deprecated
            UserStore.updateGold(Auth.user.uid, room.winner.prize); // Persist to Cloud
            this.resultMessage.textContent += " - YOU WON!";
        } else {
             this.resultMessage.textContent += " - You lost.";
        }

        this.gameResult.classList.remove('hidden');
        this.updateGoldDisplays();
    },

    handleStartGame: function() {
        const inputs = this.numberInputsContainer.querySelectorAll('input');
        const selected = [];
        const seen = new Set();
        let valid = true;

        inputs.forEach(input => {
            const val = parseInt(input.value);
            if (isNaN(val)) valid = false;
            if (seen.has(val)) valid = false;
            seen.add(val);
            selected.push(val);
        });

        if (!valid || selected.length !== inputs.length) {
            this.setupError.textContent = 'Please enter valid unique numbers.';
            return;
        }

        // Multiplayer Branch
        if (this.isMultiplayer) {
            Multiplayer.submitSetup(selected);
            return;
        }

        // Single Player Logic (Existing)
        try {
            // Deduct Gold from Cloud before starting game locally
            const cost = Game.MODES[Game.state.currentModeIndex].cost;
            // Since Game.startGame deducts locally, we also need to deduct remotely
            // Optimally we'd do this transactionally but for now:
            UserStore.updateGold(Auth.user.uid, -cost);

            Game.startGame(selected);
            // this.updateGoldDisplays(); // Listener handles this now

            this.renderBoard();
            this.gameStatus.textContent = `Find ${Game.MODES[Game.state.currentModeIndex].targetCount} targets!`;
            this.updatePrizeDisplay();
            this.currentPrizeDisplay.classList.remove('hidden');

            this.renderSelectedNumbers(selected);

            this.setupPhase.classList.add('hidden');
            this.playPhase.classList.remove('hidden');
        } catch (e) {
            this.setupError.textContent = e.message;
        }
    },

    handleCardClick: function(e) {
        const cardEl = e.target.closest('.card');
        if (!cardEl) return;

        const index = parseInt(cardEl.dataset.index);

        // Multiplayer Branch
        if (this.isMultiplayer) {
            if (this.mpRoom.status !== 'playing') return;

            // Check turn
            if (this.mpRoom.openType === 'turn' && this.mpRoom.currentTurn !== Auth.user.uid) {
                alert("Not your turn!");
                return;
            }
            if (this.mpRoom.openType === 'auto') return; // Can't click in auto mode

            Multiplayer.revealCard(index);
            return;
        }

        // Single Player Logic
        const result = Game.revealCard(index);

        if (!result) return; // Ignore click (already revealed, etc)

        this.updateCard(cardEl, result.card);
        this.updatePrizeDisplay();

        if (result.gameOver) {
            if (result.win) {
                this.resultMessage.textContent = `You Won ${result.prize.toLocaleString()} Gold!`;
                // Add Prize to Cloud
                UserStore.updateGold(Auth.user.uid, result.prize);
            } else {
                this.resultMessage.textContent = 'Game Over';
            }
            this.gameResult.classList.remove('hidden');
            // this.updateGoldDisplays(); // Listener handles
        }
    },

    updateGoldDisplays: function() {
        const gold = Game.state.gold;
        if (this.userGoldDisplay) this.userGoldDisplay.textContent = gold.toLocaleString();
        if (this.gameGoldDisplay) this.gameGoldDisplay.textContent = `Gold: ${gold.toLocaleString()}`;

        // Also update profile gold if visible
        const profileGold = document.getElementById('profile-gold');
        if (profileGold) profileGold.textContent = gold.toLocaleString();
    },

    handleWatchAd: function() {
        this.adModal.classList.remove('hidden');
        let secondsLeft = 5;
        this.adTimer.textContent = `${secondsLeft}s remaining`;
        this.adProgress.style.width = '0%';

        let elapsed = 0;
        const totalTime = 5000;
        const intervalStep = 100;

        const timer = setInterval(() => {
            elapsed += intervalStep;
            const progress = (elapsed / totalTime) * 100;
            this.adProgress.style.width = `${progress}%`;

            const currentSeconds = Math.ceil((totalTime - elapsed) / 1000);
            if (currentSeconds !== secondsLeft) {
                secondsLeft = currentSeconds;
                this.adTimer.textContent = `${secondsLeft}s remaining`;
            }

            if (elapsed >= totalTime) {
                clearInterval(timer);
                this.finishAd();
            }
        }, intervalStep);
    },

    finishAd: function() {
        this.adModal.classList.add('hidden');
        // Game.addGold(200); // Deprecated local add
        UserStore.updateGold(Auth.user.uid, 200);
        alert("You earned 200 Gold!");
    },

    enterGameMode: function(modeIndex) {
        try {
            Game.setupGame(modeIndex);
            this.updateGoldDisplays();

            const mode = Game.MODES[modeIndex];
            this.gameTitle.textContent = mode.name;
            this.targetCountSpan.textContent = mode.targetCount;

            // Render Inputs
            this.renderNumberInputs(mode.targetCount, mode.maxNumber);

            // Show Setup Phase
            this.setupPhase.classList.remove('hidden');
            this.playPhase.classList.add('hidden');
            this.gameResult.classList.add('hidden');
            this.currentPrizeDisplay.classList.add('hidden');
            this.setupError.textContent = '';

            this.showScreen('game');
        } catch (e) {
            alert(e.message);
        }
    },

    renderNumberInputs: function(count, maxNumber) {
        this.numberInputsContainer.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const input = document.createElement('input');
            input.type = 'number';
            input.min = 1;
            input.max = maxNumber;
            input.placeholder = `1-${maxNumber}`;
            input.className = 'number-input';
            this.numberInputsContainer.appendChild(input);
        }
    },

    handleStartGame: function() {
        const inputs = this.numberInputsContainer.querySelectorAll('input');
        const selected = [];
        const seen = new Set();
        let valid = true;

        inputs.forEach(input => {
            const val = parseInt(input.value);
            if (isNaN(val)) {
                valid = false;
            }
            if (seen.has(val)) {
                valid = false;
            }
            seen.add(val);
            selected.push(val);
        });

        if (!valid || selected.length !== inputs.length) {
            this.setupError.textContent = 'Please enter valid unique numbers.';
            return;
        }

        try {
            Game.startGame(selected);
            this.updateGoldDisplays();

            this.renderBoard();
            this.gameStatus.textContent = `Find ${Game.MODES[Game.state.currentModeIndex].targetCount} targets!`;
            this.updatePrizeDisplay();
            this.currentPrizeDisplay.classList.remove('hidden');

            this.renderSelectedNumbers(selected);

            this.setupPhase.classList.add('hidden');
            this.playPhase.classList.remove('hidden');
        } catch (e) {
            this.setupError.textContent = e.message;
        }
    },

    renderSelectedNumbers: function(numbers) {
        this.selectedNumbersList.innerHTML = '';
        numbers.sort((a, b) => a - b).forEach(num => {
            const el = document.createElement('div');
            el.className = 'selected-number';
            el.dataset.value = num;
            el.textContent = num;
            this.selectedNumbersList.appendChild(el);
        });
    },

    updatePrizeDisplay: function() {
        const current = Game.getCurrentPrizeValue();
        this.currentPrizeDisplay.textContent = `Current Prize: ${current.toLocaleString()}`;
    },

    renderBoard: function() {
        this.cardsGrid.innerHTML = '';

        // Set grid class based on mode
        this.cardsGrid.className = 'grid-container'; // Reset
        const modeId = Game.state.currentModeIndex;
        if (modeId === 0) this.cardsGrid.classList.add('grid-1x4');
        else if (modeId === 1) this.cardsGrid.classList.add('grid-5x2');
        else if (modeId === 2) this.cardsGrid.classList.add('grid-8x5');

        Game.state.cards.forEach((card, index) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card';
            cardEl.dataset.index = index;

            // Structure for 3D Flip
            const inner = document.createElement('div');
            inner.className = 'card-inner';

            // The Front (Face Down) - Question Mark
            const front = document.createElement('div');
            front.className = 'card-front';
            front.textContent = '?';

            // The Back (Face Up) - Number
            const back = document.createElement('div');
            back.className = 'card-back';
            back.textContent = ''; // Will be filled on reveal

            inner.appendChild(front);
            inner.appendChild(back);
            cardEl.appendChild(inner);

            this.cardsGrid.appendChild(cardEl);
        });
    },

    handleCardClick: function(e) {
        const cardEl = e.target.closest('.card');
        if (!cardEl) return;

        const index = parseInt(cardEl.dataset.index);
        const result = Game.revealCard(index);

        if (!result) return; // Ignore click (already revealed, etc)

        this.updateCard(cardEl, result.card);
        this.updatePrizeDisplay();

        if (result.gameOver) {
            if (result.win) {
                this.resultMessage.textContent = `You Won ${result.prize.toLocaleString()} Gold!`;
            } else {
                this.resultMessage.textContent = 'Game Over';
            }
            this.gameResult.classList.remove('hidden');
            this.updateGoldDisplays();
        }
    },

    updateCard: function(cardEl, cardState) {
        cardEl.classList.add('revealed');
        const back = cardEl.querySelector('.card-back');
        back.textContent = cardState.value;

        if (cardState.isTarget) {
            back.classList.add('target');

            // Highlight in selected list
            const selectedEl = this.selectedNumbersList.querySelector(`.selected-number[data-value="${cardState.value}"]`);
            if (selectedEl) {
                selectedEl.classList.add('found');
            }
        } else {
            back.classList.add('dud');
        }
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
