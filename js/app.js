// js/app.js

const App = {
    init: function() {
        this.cacheDOM();
        this.bindEvents();
        // checkAuth is handled by Auth.init listener
    },

    cacheDOM: function() {
        this.screens = {
            login: document.getElementById('login-screen'),
            lobby: document.getElementById('lobby-screen'),
            game: document.getElementById('game-screen'),
            multiplayer: document.getElementById('multiplayer-screen')
        };

        // Login
        this.loginBtn = document.getElementById('login-btn');
        this.registerBtn = document.getElementById('register-btn');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.loginError = document.getElementById('login-error');

        // Lobby
        this.userGoldDisplay = document.getElementById('user-gold');
        this.modeButtons = document.querySelectorAll('.mode-btn');
        this.watchAdBtn = document.getElementById('watch-ad-btn');
        this.multiplayerBtn = document.getElementById('multiplayer-btn');

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
        if (this.registerBtn) {
            this.registerBtn.addEventListener('click', this.handleRegister.bind(this));
        }

        this.modeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modeIndex = parseInt(btn.closest('.mode-btn').dataset.mode);
                this.enterGameMode(modeIndex);
            });
        });

        this.watchAdBtn.addEventListener('click', this.handleWatchAd.bind(this));
        if (this.multiplayerBtn) {
            this.multiplayerBtn.addEventListener('click', () => {
                this.showScreen('multiplayer');
                if (window.Multiplayer) Multiplayer.showLobby();
            });
        }
        this.backToLobbyBtn.addEventListener('click', this.showLobby.bind(this));
        this.startGameBtn.addEventListener('click', this.handleStartGame.bind(this));

        // Card clicks are delegated to the grid
        this.cardsGrid.addEventListener('click', this.handleCardClick.bind(this));

        this.collectBtn.addEventListener('click', this.showLobby.bind(this));
    },

    showScreen: function(screenName) {
        Object.values(this.screens).forEach(el => el.classList.add('hidden'));
        Object.values(this.screens).forEach(el => el.classList.remove('active'));

        this.screens[screenName].classList.remove('hidden');
        this.screens[screenName].classList.add('active');
    },

    handleLogin: async function() {
        const email = this.emailInput.value;
        const password = this.passwordInput.value;

        const result = await Auth.login(email, password);
        if (result.success) {
            this.loginError.textContent = '';
        } else {
            this.loginError.textContent = 'Login Failed: ' + result.message;
        }
    },

    handleRegister: async function() {
        const email = this.emailInput.value;
        const password = this.passwordInput.value;

        const result = await Auth.register(email, password);
        if (result.success) {
            this.loginError.textContent = '';
            alert("Account created!");
        } else {
            this.loginError.textContent = 'Register Failed: ' + result.message;
        }
    },

    showLobby: function() {
        this.updateGoldDisplays();
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
        // Sync with Store if logged in
        if (Auth.currentUser && window.Store) {
             Store.updateGold(Auth.currentUser.uid, 200);
        }
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
            // Deduct gold in Store first?
            // Memory says: "Single Player game cost is deducted from Cloud Gold only after local game initialization succeeds"
            // So we call Game.startGame (which updates local state) then Store.update

            // Check cost first locally
            const mode = Game.MODES[Game.state.currentModeIndex];
            if (Game.state.gold < mode.cost) {
                this.setupError.textContent = "Not enough gold!";
                return;
            }

            Game.startGame(selected);

            // Sync deduction with Store
            if (Auth.currentUser && window.Store) {
                Store.updateGold(Auth.currentUser.uid, -mode.cost);
            }

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

                // Sync Win with Store
                if (Auth.currentUser && window.Store) {
                    Store.updateGold(Auth.currentUser.uid, result.prize);
                }
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
