// js/app.js

const App = {
    init: function() {
        this.cacheDOM();
        this.bindEvents();

        // Init Multiplayer module
        if (window.Multiplayer) {
            Multiplayer.init();
        }

        this.checkAuth();
    },

    cacheDOM: function() {
        this.screens = {
            login: document.getElementById('login-screen'),
            main: document.getElementById('main-app')
        };

        // Login
        this.loginBtn = document.getElementById('login-btn');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.loginError = document.getElementById('login-error');

        // Nav
        this.navTabs = document.querySelectorAll('.nav-tab');
        this.tabPanes = document.querySelectorAll('.tab-pane');
        this.logoutBtn = document.getElementById('logout-btn');
        this.globalGoldDisplay = document.getElementById('global-gold-display');

        // Single Player Lobby
        this.singleLobby = document.getElementById('single-lobby');
        this.singleGame = document.getElementById('single-game');

        this.modeButtons = document.querySelectorAll('.mode-btn');
        this.watchAdBtn = document.getElementById('watch-ad-btn');

        // Ad Modal
        this.adModal = document.getElementById('ad-modal');
        this.adTimer = document.getElementById('ad-timer');
        this.adProgress = document.getElementById('ad-progress');

        // Single Game
        this.singleBackBtn = document.getElementById('single-back-btn');
        this.singlePrizeDisplay = document.getElementById('single-prize-display');
        this.singleGameTitle = document.getElementById('single-game-title');

        // Phase 1
        this.singleSetup = document.getElementById('single-setup');
        this.targetCountSpan = document.getElementById('single-target-count');
        this.maxNumSpan = document.getElementById('single-max-num');
        this.numberInputsContainer = document.getElementById('single-inputs');
        this.setupError = document.getElementById('single-setup-error');
        this.startGameBtn = document.getElementById('single-start-btn');

        // Phase 2
        this.singlePlay = document.getElementById('single-play');
        this.singleStatus = document.getElementById('single-status');
        this.cardsGrid = document.getElementById('single-grid');

        // Result
        this.singleResult = document.getElementById('single-result');
        this.resultMessage = document.getElementById('single-result-msg');
        this.collectBtn = document.getElementById('single-collect-btn');

        // Settings
        this.newPasswordInput = document.getElementById('new-password');
        this.changePasswordBtn = document.getElementById('change-password-btn');
        this.giftUsernameInput = document.getElementById('gift-username');
        this.giftAmountInput = document.getElementById('gift-amount');
        this.giftGoldBtn = document.getElementById('gift-gold-btn');
    },

    bindEvents: function() {
        this.loginBtn.addEventListener('click', this.handleLogin.bind(this));
        this.logoutBtn.addEventListener('click', this.handleLogout.bind(this));

        // Tabs
        this.navTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Single Player
        this.modeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modeIndex = parseInt(btn.closest('.mode-btn').dataset.mode);
                this.enterGameMode(modeIndex);
            });
        });

        this.watchAdBtn.addEventListener('click', this.handleWatchAd.bind(this));
        this.singleBackBtn.addEventListener('click', this.showSingleLobby.bind(this));
        this.startGameBtn.addEventListener('click', this.handleStartGame.bind(this));
        this.cardsGrid.addEventListener('click', this.handleCardClick.bind(this));
        this.collectBtn.addEventListener('click', this.showSingleLobby.bind(this));

        // Settings
        this.changePasswordBtn.addEventListener('click', this.handleChangePassword.bind(this));
        this.giftGoldBtn.addEventListener('click', this.handleGiftGold.bind(this));
    },

    checkAuth: function() {
        if (Auth.isLoggedIn()) {
            this.showMainApp();
            // Connect socket if not connected
            const user = localStorage.getItem('lotgo_user');
            if (user && Multiplayer) Multiplayer.connect(user);
        } else {
            this.showScreen('login');
        }
    },

    showScreen: function(screenName) {
        Object.values(this.screens).forEach(el => el.classList.add('hidden'));
        this.screens[screenName].classList.remove('hidden');
    },

    showMainApp: function() {
        this.showScreen('main');
        this.updateGoldDisplays();
    },

    handleLogin: function() {
        const username = this.usernameInput.value;
        const password = this.passwordInput.value;

        if (Auth.login(username, password)) {
            this.showMainApp();
            if (Multiplayer) Multiplayer.connect(username);
            this.loginError.textContent = '';
        } else {
            this.loginError.textContent = 'Invalid credentials';
        }
    },

    handleLogout: function() {
        Auth.logout();
        location.reload(); // Simple reload to reset state
    },

    switchTab: function(tabName) {
        this.navTabs.forEach(t => {
            if (t.dataset.tab === tabName) t.classList.add('active');
            else t.classList.remove('active');
        });

        this.tabPanes.forEach(pane => {
            if (pane.id === `${tabName}-tab`) pane.classList.add('active');
            else pane.classList.remove('active');
        });
    },

    updateGoldDisplays: function() {
        const gold = Game.state.gold;
        this.globalGoldDisplay.textContent = gold.toLocaleString();
    },

    // --- Single Player Logic ---

    showSingleLobby: function() {
        this.singleLobby.classList.remove('hidden');
        this.singleGame.classList.add('hidden');
        this.updateGoldDisplays();
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
        Game.addGold(200);
        this.updateGoldDisplays();
        alert("You earned 200 Gold!");
    },

    enterGameMode: function(modeIndex) {
        try {
            Game.setupGame(modeIndex);
            this.updateGoldDisplays();

            const mode = Game.MODES[modeIndex];
            this.singleGameTitle.textContent = mode.name;
            this.targetCountSpan.textContent = mode.targetCount;
            this.maxNumSpan.textContent = mode.maxNumber;

            // Render Inputs
            this.renderNumberInputs(mode.targetCount, mode.maxNumber);

            // Show Setup Phase
            this.singleLobby.classList.add('hidden');
            this.singleGame.classList.remove('hidden');

            this.singleSetup.classList.remove('hidden');
            this.singlePlay.classList.add('hidden');
            this.singleResult.classList.add('hidden');
            this.singlePrizeDisplay.classList.add('hidden');
            this.setupError.textContent = '';
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

        // Range check
        const mode = Game.MODES[Game.state.currentModeIndex];
        if (selected.some(n => n < 1 || n > mode.maxNumber)) {
             this.setupError.textContent = `Numbers must be between 1 and ${mode.maxNumber}.`;
             return;
        }

        try {
            Game.startGame(selected);
            this.updateGoldDisplays();

            this.renderBoard();
            this.singleStatus.textContent = `Find ${mode.targetCount} targets!`;
            this.updatePrizeDisplay();
            this.singlePrizeDisplay.classList.remove('hidden');

            this.singleSetup.classList.add('hidden');
            this.singlePlay.classList.remove('hidden');
        } catch (e) {
            this.setupError.textContent = e.message;
        }
    },

    updatePrizeDisplay: function() {
        const current = Game.getCurrentPrizeValue();
        this.singlePrizeDisplay.textContent = `Next Prize: ${current.toLocaleString()}`;
    },

    renderBoard: function() {
        this.cardsGrid.innerHTML = '';
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
            this.singleResult.classList.remove('hidden');
            this.updateGoldDisplays();
        }
    },

    updateCard: function(cardEl, cardState) {
        cardEl.classList.add('revealed');
        const back = cardEl.querySelector('.card-back');
        back.textContent = cardState.value;

        if (cardState.isTarget) {
            back.classList.add('target');
        } else {
            back.classList.add('dud');
        }
    },

    // --- Settings Logic ---
    handleChangePassword: function() {
        const newPass = this.newPasswordInput.value;
        if (newPass.length < 4) {
            alert("Password too short");
            return;
        }
        // Since Auth is local storage based, we'll just mock this update for the current user.
        // But Auth.CREDENTIALS is static in auth.js.
        // We can't actually change the hardcoded 'admin' password without rewriting the file.
        // However, we can simulate success.
        alert("Password updated successfully (Mock)");
        this.newPasswordInput.value = '';
    },

    handleGiftGold: function() {
        const username = this.giftUsernameInput.value;
        const amount = parseInt(this.giftAmountInput.value);

        if (!username || !amount) {
            alert("Please fill in all fields");
            return;
        }

        if (amount < 100000) {
            alert("Minimum gift amount is 100,000 Gold");
            return;
        }

        if (Game.state.gold < amount) {
            alert("Not enough gold");
            return;
        }

        // Use Multiplayer socket to send gift if connected
        if (Multiplayer && Multiplayer.socket) {
            Multiplayer.giftGold(username, amount);
        } else {
            alert("Must be connected to server to gift gold.");
        }
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
