// js/app.js

const App = {
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

        // Login
        this.loginBtn = document.getElementById('login-btn');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.loginError = document.getElementById('login-error');

        // Lobby
        this.userGoldDisplay = document.getElementById('user-gold');
        this.modeButtons = document.querySelectorAll('.mode-btn');

        // Game
        this.backToLobbyBtn = document.getElementById('back-to-lobby');
        this.gameGoldDisplay = document.getElementById('game-gold-display');
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

        this.modeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modeIndex = parseInt(btn.closest('.mode-btn').dataset.mode);
                this.enterGameMode(modeIndex);
            });
        });

        this.backToLobbyBtn.addEventListener('click', this.showLobby.bind(this));
        this.startGameBtn.addEventListener('click', this.handleStartGame.bind(this));

        // Card clicks are delegated to the grid
        this.cardsGrid.addEventListener('click', this.handleCardClick.bind(this));

        this.collectBtn.addEventListener('click', this.showLobby.bind(this));
    },

    checkAuth: function() {
        if (Auth.isLoggedIn()) {
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

    handleLogin: function() {
        const username = this.usernameInput.value;
        const password = this.passwordInput.value;

        if (Auth.login(username, password)) {
            this.showLobby();
            this.loginError.textContent = '';
        } else {
            this.loginError.textContent = 'Invalid credentials';
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

    enterGameMode: function(modeIndex) {
        try {
            Game.setupGame(modeIndex);
            this.updateGoldDisplays();

            const mode = Game.MODES[modeIndex];
            this.gameTitle.textContent = mode.name;
            this.targetCountSpan.textContent = mode.targetCount;

            // Render Inputs
            this.renderNumberInputs(mode.targetCount);

            // Show Setup Phase
            this.setupPhase.classList.remove('hidden');
            this.playPhase.classList.add('hidden');
            this.gameResult.classList.add('hidden');
            this.setupError.textContent = '';

            this.showScreen('game');
        } catch (e) {
            alert(e.message);
        }
    },

    renderNumberInputs: function(count) {
        this.numberInputsContainer.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const input = document.createElement('input');
            input.type = 'number';
            input.min = 1;
            input.max = 30; // Arbitrary limit for UI
            input.placeholder = `#${i+1}`;
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
            if (isNaN(val) || val < 1) {
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

            this.setupPhase.classList.add('hidden');
            this.playPhase.classList.remove('hidden');
        } catch (e) {
            this.setupError.textContent = e.message;
        }
    },

    renderBoard: function() {
        this.cardsGrid.innerHTML = '';
        Game.state.cards.forEach((card, index) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card';
            cardEl.dataset.index = index;
            // Initially hidden
            cardEl.textContent = '?';
            this.cardsGrid.appendChild(cardEl);
        });
    },

    handleCardClick: function(e) {
        if (!e.target.classList.contains('card')) return;

        const index = parseInt(e.target.dataset.index);
        const result = Game.revealCard(index);

        if (!result) return; // Ignore click

        this.updateCard(e.target, result.card);

        if (result.gameOver) {
            if (result.win) {
                this.resultMessage.textContent = `You Won ${result.prize.toLocaleString()} Gold!`;
            } else {
                // Logic currently only supports winning eventually, but if we add lose conditions later...
                this.resultMessage.textContent = 'Game Over';
            }
            this.gameResult.classList.remove('hidden');
            this.updateGoldDisplays();
        }
    },

    updateCard: function(cardEl, cardState) {
        cardEl.classList.add('revealed');
        cardEl.textContent = cardState.value;
        if (cardState.isTarget) {
            cardEl.classList.add('target');
        } else {
            cardEl.classList.add('dud');
        }
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
