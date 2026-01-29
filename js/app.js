// js/app.js

const App = {
    isSignupMode: false,

    init: function() {
        this.cacheDOM();
        this.bindEvents();
        this.checkAuth();
    },

    cacheDOM: function() {
        this.screens = {
            login: document.getElementById('login-screen'),
            lobby: document.getElementById('lobby-screen'),
            game: document.getElementById('game-screen')
        };

        // Login Elements
        this.loginBtn = document.getElementById('login-btn');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.confirmPasswordInput = document.getElementById('confirm-password');
        this.confirmPasswordGroup = document.getElementById('confirm-password-group');
        this.toggleAuthBtn = document.getElementById('toggle-auth-btn');
        this.toggleAuthText = document.getElementById('toggle-auth-text');
        this.authTitle = document.getElementById('auth-title');
        this.loginError = document.getElementById('login-error');

        // Lobby Elements
        this.userGoldDisplay = document.getElementById('user-gold');
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabContents = {
            games: document.getElementById('tab-games'),
            profile: document.getElementById('tab-profile')
        };

        // Games Tab
        this.modeButtons = document.querySelectorAll('.mode-btn');
        this.watchAdBtn = document.getElementById('watch-ad-btn');

        // Profile Tab
        this.profileUsername = document.getElementById('profile-username');
        this.logoutBtn = document.getElementById('logout-btn');
        this.giftUsernameInput = document.getElementById('gift-username');
        this.giftAmountInput = document.getElementById('gift-amount');
        this.sendGiftBtn = document.getElementById('send-gift-btn');
        this.giftMessage = document.getElementById('gift-message');
        this.deleteAccountBtn = document.getElementById('delete-account-btn');

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

        // Result
        this.gameResult = document.getElementById('game-result');
        this.resultMessage = document.getElementById('result-message');
        this.collectBtn = document.getElementById('collect-btn');
    },

    bindEvents: function() {
        this.loginBtn.addEventListener('click', this.handleLogin.bind(this));
        this.toggleAuthBtn.addEventListener('click', this.handleAuthToggle.bind(this));

        // Tabs
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Logout
        this.logoutBtn.addEventListener('click', this.handleLogout.bind(this));

        // Gifting & Danger Zone (Logic to be implemented)
        this.sendGiftBtn.addEventListener('click', this.handleSendGift.bind(this));
        this.deleteAccountBtn.addEventListener('click', this.handleDeleteAccount.bind(this));

        // Game Modes
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
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(user => {
                if (user) {
                    console.log("Logged in as:", user.email);
                    this.showLobby();
                    // Load Gold and update UI
                    Game.loadUserData(user.uid).then(() => {
                        this.updateGoldDisplays();
                    });
                } else {
                    console.log("Logged out");
                    this.showScreen('login');
                }
            });
        } else {
            console.error("Firebase not loaded");
        }
    },

    handleAuthToggle: function(e) {
        e.preventDefault();
        this.isSignupMode = !this.isSignupMode;

        if (this.isSignupMode) {
            this.authTitle.textContent = "Create Account";
            this.loginBtn.textContent = "Sign Up";
            this.confirmPasswordGroup.classList.remove('hidden');
            this.toggleAuthText.textContent = "Already have an account? ";
            this.toggleAuthBtn.textContent = "Login";
        } else {
            this.authTitle.textContent = "Login to Lot-Go";
            this.loginBtn.textContent = "Login";
            this.confirmPasswordGroup.classList.add('hidden');
            this.toggleAuthText.textContent = "New here? ";
            this.toggleAuthBtn.textContent = "Create Account";
        }
        this.loginError.textContent = '';
    },

    handleLogin: async function() {
        const username = this.usernameInput.value;
        const password = this.passwordInput.value;
        const confirmPassword = this.confirmPasswordInput.value;

        if (!username || !password) {
            this.loginError.textContent = 'Please enter username and password';
            return;
        }

        if (this.isSignupMode) {
            if (password !== confirmPassword) {
                this.loginError.textContent = 'Passwords do not match';
                return;
            }

            this.loginBtn.disabled = true;
            this.loginBtn.textContent = "Creating...";

            const result = await Auth.signUp(username, password);

            this.loginBtn.disabled = false;
            this.loginBtn.textContent = "Sign Up";

            if (result.success) {
                this.loginError.textContent = '';
            } else {
                this.loginError.textContent = result.message;
            }

        } else {
            this.loginBtn.disabled = true;
            this.loginBtn.textContent = "Logging in...";

            const result = await Auth.login(username, password);

            this.loginBtn.disabled = false;
            this.loginBtn.textContent = "Login";

            if (result.success) {
                this.loginError.textContent = '';
            } else {
                this.loginError.textContent = 'Invalid credentials or connection error';
                console.error(result.message);
            }
        }
    },

    handleLogout: async function() {
        await Auth.logout();
    },

    switchTab: function(tabName) {
        this.tabBtns.forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        Object.keys(this.tabContents).forEach(key => {
            if (key === tabName) {
                this.tabContents[key].classList.remove('hidden');
                this.tabContents[key].classList.add('active');
            } else {
                this.tabContents[key].classList.add('hidden');
                this.tabContents[key].classList.remove('active');
            }
        });
    },

    showScreen: function(screenName) {
        Object.values(this.screens).forEach(el => el.classList.add('hidden'));
        Object.values(this.screens).forEach(el => el.classList.remove('active'));

        if (this.screens[screenName]) {
            this.screens[screenName].classList.remove('hidden');
            this.screens[screenName].classList.add('active');
        }
    },

    showLobby: function() {
        this.updateGoldDisplays();
        const user = Auth.getCurrentUser();
        if (user) {
            // Extract username from email or display email
            const username = user.email.split('@')[0];
            this.profileUsername.textContent = username;
        }
        this.showScreen('lobby');
    },

    updateGoldDisplays: function() {
        const gold = Game.state.gold;
        this.userGoldDisplay.textContent = gold.toLocaleString();
        this.gameGoldDisplay.textContent = `Gold: ${gold.toLocaleString()}`;
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

            this.renderNumberInputs(mode.targetCount, mode.maxNumber);

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
            const inner = document.createElement('div');
            inner.className = 'card-inner';
            const front = document.createElement('div');
            front.className = 'card-front';
            front.textContent = '?';
            const back = document.createElement('div');
            back.className = 'card-back';
            back.textContent = '';
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
        if (!result) return;
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
    },

    // Placeholders for future steps
    handleSendGift: async function() {
        const username = this.giftUsernameInput.value;
        const amount = this.giftAmountInput.value;

        if (!username || !amount) {
            this.giftMessage.textContent = "Please enter username and amount.";
            this.giftMessage.className = "message error";
            return;
        }

        this.sendGiftBtn.disabled = true;
        this.sendGiftBtn.textContent = "Sending...";

        const result = await Game.sendGift(username, amount);

        this.sendGiftBtn.disabled = false;
        this.sendGiftBtn.textContent = "Send Gold";

        if (result.success) {
            this.giftMessage.textContent = result.message;
            this.giftMessage.className = "message success";
            this.giftUsernameInput.value = '';
            this.giftAmountInput.value = '';
            this.updateGoldDisplays();
        } else {
            this.giftMessage.textContent = result.message;
            this.giftMessage.className = "message error";
        }
    },

    handleDeleteAccount: async function() {
        if (confirm("Are you sure you want to delete your account? This cannot be undone.")) {
            const result = await Auth.deleteAccount();
            if (result.success) {
                alert("Account deleted.");
                // Auth listener will handle redirect
            } else {
                alert("Error: " + result.message);
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
