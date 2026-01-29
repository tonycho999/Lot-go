// js/game.js

const Game = {
    // Configuration
    MODES: [
        {
            id: 0,
            name: "2/4 Cards",
            totalCards: 4,
            targetCount: 2,
            maxNumber: 4,
            cost: 50,
            maxPrize: 200
        },
        {
            id: 1,
            name: "4/10 Cards",
            totalCards: 10,
            targetCount: 4,
            maxNumber: 10,
            cost: 100,
            maxPrize: 20000
        },
        {
            id: 2,
            name: "5/20 Cards",
            totalCards: 20,
            targetCount: 5,
            maxNumber: 20,
            cost: 500,
            maxPrize: 7500000
        }
    ],

    // State
    state: {
        username: null,
        gold: 0,
        currentModeIndex: null,
        targetNumbers: [],
        cards: [],
        revealedCount: 0,
        foundTargets: 0,
        isGameOver: false,
        lastPrize: 0
    },

    loadUserData: function(username) {
        this.state.username = username;
        const savedGold = localStorage.getItem(`lotgo_gold_${username}`);
        this.state.gold = savedGold ? parseInt(savedGold) : 1000; // Default 1000 for new users
    },

    saveUserData: function() {
        if (this.state.username) {
            localStorage.setItem(`lotgo_gold_${this.state.username}`, this.state.gold);
        }
    },

    addGold: function(amount) {
        this.state.gold += amount;
        this.saveUserData();
    },

    giftGold: function(receiverUsername, amount) {
        if (this.state.gold < amount) {
            return { success: false, message: "Insufficient gold" };
        }

        // Check if receiver exists (We need to check Auth but Game doesn't direct link easily unless passed.
        // We can check localStorage 'lotgo_users')
        const usersJSON = localStorage.getItem('lotgo_users');
        const users = usersJSON ? JSON.parse(usersJSON) : {};

        if (!users[receiverUsername]) {
            return { success: false, message: "User not found" };
        }

        // Deduct from current
        this.state.gold -= amount;
        this.saveUserData();

        // Add to receiver
        const receiverGoldKey = `lotgo_gold_${receiverUsername}`;
        const currentReceiverGold = localStorage.getItem(receiverGoldKey);
        const newReceiverGold = (currentReceiverGold ? parseInt(currentReceiverGold) : 1000) + amount;
        localStorage.setItem(receiverGoldKey, newReceiverGold);

        return { success: true, message: `Sent ${amount} Gold to ${receiverUsername}!` };
    },

    /**
     * Prepares the game state for number selection.
     */
    setupGame: function(modeIndex) {
        const mode = this.MODES[modeIndex];
        if (this.state.gold < mode.cost) {
            throw new Error("Not enough gold!");
        }
        this.state.currentModeIndex = modeIndex;
        this.state.targetNumbers = [];
        this.state.cards = [];
        this.state.revealedCount = 0;
        this.state.foundTargets = 0;
        this.state.isGameOver = false;
        this.state.lastPrize = 0;
        console.log(`Setup Mode ${modeIndex}`);
    },

    /**
     * Starts the game with selected numbers.
     * Deducts gold and generates cards.
     */
    startGame: function(selectedNumbers) {
        const mode = this.MODES[this.state.currentModeIndex];

        if (selectedNumbers.length !== mode.targetCount) {
            throw new Error(`Select exactly ${mode.targetCount} numbers.`);
        }

        // Validate range
        const invalidNum = selectedNumbers.find(n => n < 1 || n > mode.maxNumber);
        if (invalidNum) {
            throw new Error(`Numbers must be between 1 and ${mode.maxNumber}.`);
        }

        // Deduct Gold
        this.state.gold -= mode.cost;
        this.saveUserData(); // Save gold deduction
        this.state.targetNumbers = selectedNumbers;

        // Generate Cards
        // 1. Add Target Cards
        let deck = selectedNumbers.map(num => ({
            value: num,
            isTarget: true,
            revealed: false
        }));

        // 2. Add Dud Cards
        const allNumbers = Array.from({length: mode.maxNumber}, (_, i) => i + 1);
        const availableDuds = allNumbers.filter(n => !selectedNumbers.includes(n));

        this.shuffle(availableDuds);

        const dudsNeeded = mode.totalCards - mode.targetCount;
        const duds = availableDuds.slice(0, dudsNeeded);

        duds.forEach(dud => {
            deck.push({
                value: dud,
                isTarget: false,
                revealed: false
            });
        });

        // 3. Shuffle
        this.shuffle(deck);
        this.state.cards = deck;
        console.log("Game Started. Cards generated.");
    },

    /**
     * Reveals a card at the given index.
     * Returns the result of the action.
     */
    revealCard: function(index) {
        if (this.state.isGameOver) return null;
        if (index < 0 || index >= this.state.cards.length) return null;

        const card = this.state.cards[index];
        if (card.revealed) return null; // Already revealed

        // Update State
        card.revealed = true;
        this.state.revealedCount++;

        if (card.isTarget) {
            this.state.foundTargets++;
        }

        // Check Win Condition
        const mode = this.MODES[this.state.currentModeIndex];
        if (this.state.foundTargets === mode.targetCount) {
            this.state.isGameOver = true;
            this.state.lastPrize = this.calculateReward();
            this.state.gold += this.state.lastPrize;
            this.saveUserData(); // Save win
            return {
                success: true,
                card: card,
                gameOver: true,
                win: true,
                prize: this.state.lastPrize
            };
        }

        return {
            success: true,
            card: card,
            gameOver: false
        };
    },

    /**
     * Calculates reward based on efficiency.
     */
    calculateReward: function() {
        return this.calculateRewardForRevealed(this.state.revealedCount);
    },

    /**
     * Helper to calculate reward based on a specific revealed count.
     */
    calculateRewardForRevealed: function(revealedCount) {
        const mode = this.MODES[this.state.currentModeIndex];
        const M = revealedCount;
        const N = mode.totalCards;
        const K = mode.targetCount;

        const numerator = N - M;
        const denominator = N - K;

        if (denominator === 0) return mode.maxPrize;

        const factor = numerator / denominator;
        const clampedFactor = Math.min(1, factor);

        const prize = Math.floor(mode.maxPrize * Math.pow(clampedFactor, 2));

        return Math.max(0, prize);
    },

    getCurrentPrizeValue: function() {
        return this.calculateRewardForRevealed(this.state.revealedCount);
    },

    shuffle: function(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
};

// Export for testing if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Game;
} else {
    window.Game = Game;
}
