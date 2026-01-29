// js/app.js

const App = {
    init: function() {
        this.cacheDOM();
        this.bindEvents();
        this.checkAuth();
        this.isSignupMode = false;
    },

    cacheDOM: function() {
        this.screens = {
            login: document.getElementById('login-screen'),
            lobby: document.getElementById('lobby-screen'),
            game: document.getElementById('game-screen')
        };

        // Login
        this.loginTitle = document.getElementById('login-title');
        this.loginBtn = document.getElementById('login-btn');
        this.signupToggleBtn = document.getElementById('signup-toggle-btn');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.loginError = document.getElementById('login-error');

        // Lobby Header
        this.logoutBtn = document.getElementById('logout-btn');

        // Lobby Tabs
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabContents = {
            games: document.getElementById('tab-games'),
            profile: document.getElementById('tab-profile')
        };

        // Lobby Content
        this.userGoldDisplay = document.getElementById('user-gold');
        this.modeButtons = document.querySelectorAll('.mode-btn');
        this.watchAdBtn = document.getElementById('watch-ad-btn');

        // Profile Features
        this.giftUsername = document.getElementById('gift-username');
        this.giftAmount = document.getElementById('gift-amount');
        this.giftBtn = document.getElementById('gift-btn');
        this.giftMsg = document.getElementById('gift-msg');

        this.newPassword = document.getElementById('new-password');
        this.confirmPassword = document.getElementById('confirm-password');
        this.changePassBtn = document.getElementById('change-pass-btn');
        this.passMsg = document.getElementById('pass-msg');

        this.signoutBtn = document.getElementById('signout-btn');

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
        this.maxNumberDisplay = document.getElementById('max-number-display');
        this.numberInputsContainer = document.getElementById('number-inputs');
        this.setupError = document.getElementById('setup-error');
        this.startGameBtn = document.getElementById('start-game-btn');

        // Phase 2
        this.playPhase = document.getElementById('play-phase');
        this.gameStatus = document.getElementById('game-status');
        this.cardsGrid = document.getElementById('cards-grid');

        // Result
        this.gameResult = document.getElementById('game-result');
        this.resultMessage = document.getElementById('result-message');
        this.collectBtn = document.getElementById('collect-btn');
    },

    bindEvents: function() {
        // Auth
        this.loginBtn.addEventListener('click', this.handleLoginOrSignup.bind(this));
        this.signupToggleBtn.addEventListener('click', this.toggleSignupMode.bind(this));
        this.logoutBtn.addEventListener('click', this.handleLogout.bind(this));

        // Tabs
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Profile Actions
        this.giftBtn.addEventListener('click', this.handleGift.bind(this));
        this.changePassBtn.addEventListener('click', this.handleChangePassword.bind(this));
        this.signoutBtn.addEventListener('click', this.handleSignOut.bind(this));

        // Game Actions
        this.modeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modeIndex = parseInt(btn.closest('.mode-btn').dataset.mode);
                this.enterGameMode(modeIndex);
            });
        });

        this.watchAdBtn.addEventListener('click', this.handleWatchAd.bind(this));
        this.backToLobbyBtn.addEventListener('click', this.showLobby.bind(this));
        this.startGameBtn.addEventListener('click', this.handleStartGame.bind(this));

        // Card clicks are delegated to the grid
        this.cardsGrid.addEventListener('click', this.handleCardClick.bind(this));
        this.collectBtn.addEventListener('click', this.showLobby.bind(this));
    },

    checkAuth: function() {
        const user = Auth.getCurrentUser();
        if (user) {
            Game.loadUserData(user);
            this.showLobby();
        } else {
            this.showScreen('login');
        }
    },

    showScreen: function(screenName) {
        Object.values(this.screens).forEach(el => el.classList.add('hidden'));
        Object.values(this.screens).forEach(el => el.classList.remove('active'));

        this.screens[screenName].classList.remove('hidden');
        this.screens[screenName].classList.add('active');
    },

    // Auth Logic
    toggleSignupMode: function() {
        this.isSignupMode = !this.isSignupMode;
        if (this.isSignupMode) {
            this.loginTitle.textContent = "Create Account";
            this.loginBtn.textContent = "Sign Up";
            this.signupToggleBtn.textContent = "Back to Login";
        } else {
            this.loginTitle.textContent = "Login to Lot-Go";
            this.loginBtn.textContent = "Login";
            this.signupToggleBtn.textContent = "Create Account";
        }
        this.loginError.textContent = '';
    },

    handleLoginOrSignup: function() {
        const username = this.usernameInput.value;
        const password = this.passwordInput.value;

        if (!username || !password) {
            this.loginError.textContent = 'Please enter username and password';
            return;
        }

        if (this.isSignupMode) {
            const res = Auth.signup(username, password);
            if (res.success) {
                alert(res.message);
                this.toggleSignupMode(); // Switch back to login
            } else {
                this.loginError.textContent = res.message;
            }
        } else {
            const res = Auth.login(username, password);
            if (res.success) {
                this.checkAuth();
                this.loginError.textContent = '';
            } else {
                this.loginError.textContent = res.message;
            }
        }
    },

    handleLogout: function() {
        Auth.logout();
        this.checkAuth();
    },

    // Tab Logic
    switchTab: function(tabName) {
        this.tabBtns.forEach(btn => {
            if (btn.dataset.tab === tabName) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        Object.keys(this.tabContents).forEach(key => {
            if (key === tabName) this.tabContents[key].classList.remove('hidden');
            else this.tabContents[key].classList.add('hidden');
        });

        // Clear messages when switching
        this.giftMsg.textContent = '';
        this.passMsg.textContent = '';
    },

    // Profile Logic
    handleGift: function() {
        const receiver = this.giftUsername.value;
        const amount = parseInt(this.giftAmount.value);

        if (!receiver || isNaN(amount)) {
            this.giftMsg.textContent = "Invalid input.";
            this.giftMsg.className = "message error";
            return;
        }

        if (amount < 100000) {
            this.giftMsg.textContent = "Minimum gift amount is 100,000.";
            this.giftMsg.className = "message error";
            return;
        }

        const res = Game.giftGold(receiver, amount);
        if (res.success) {
            this.giftMsg.textContent = res.message;
            this.giftMsg.className = "message success";
            this.updateGoldDisplays();
            this.giftAmount.value = '';
            this.giftUsername.value = '';
        } else {
            this.giftMsg.textContent = res.message;
            this.giftMsg.className = "message error";
        }
    },

    handleChangePassword: function() {
        const newPass = this.newPassword.value;
        const confirmPass = this.confirmPassword.value;

        if (!newPass || !confirmPass) {
            this.passMsg.textContent = "Please fill all fields.";
            this.passMsg.className = "message error";
            return;
        }

        if (newPass !== confirmPass) {
            this.passMsg.textContent = "Passwords do not match.";
            this.passMsg.className = "message error";
            return;
        }

        const user = Auth.getCurrentUser();
        const res = Auth.changePassword(user, newPass);

        if (res.success) {
            this.passMsg.textContent = res.message;
            this.passMsg.className = "message success";
            this.newPassword.value = '';
            this.confirmPassword.value = '';
        } else {
            this.passMsg.textContent = res.message;
            this.passMsg.className = "message error";
        }
    },

    handleSignOut: function() {
        if (confirm("Are you sure you want to delete your account? This cannot be undone.")) {
            const user = Auth.getCurrentUser();
            const res = Auth.deleteAccount(user);
            if (res.success) {
                alert(res.message);
                this.checkAuth();
            } else {
                alert(res.message);
            }
        }
    },

    showLobby: function() {
        this.updateGoldDisplays();
        this.showScreen('lobby');
    },

    updateGoldDisplays: function() {
        const gold = Game.state.gold;
        if (this.userGoldDisplay) this.userGoldDisplay.textContent = gold.toLocaleString();
        if (this.gameGoldDisplay) this.gameGoldDisplay.textContent = `Gold: ${gold.toLocaleString()}`;
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
            this.gameTitle.textContent = mode.name;
            this.targetCountSpan.textContent = mode.targetCount;
            if (this.maxNumberDisplay) {
                this.maxNumberDisplay.textContent = mode.maxNumber;
            }

            // Set Grid Layout Class
            this.cardsGrid.className = 'grid-container'; // Reset
            this.cardsGrid.classList.add(`mode-${modeIndex}`);

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

            this.setupPhase.classList.add('hidden');
            this.playPhase.classList.remove('hidden');
        } catch (e) {
            this.setupError.textContent = e.message;
        }
    },

    updatePrizeDisplay: function() {
        const current = Game.getCurrentPrizeValue();
        this.currentPrizeDisplay.textContent = `Next Prize: ${current.toLocaleString()}`;
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
        } else {
            back.classList.add('dud');
        }
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
