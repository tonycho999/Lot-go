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
            maxPrize: 198
        },
        {
            id: 1,
            name: "4/10 Cards",
            totalCards: 10,
            targetCount: 4,
            maxNumber: 10,
            cost: 100,
            maxPrize: 1113
        },
        {
            id: 2,
            name: "6/20 Cards",
            totalCards: 20,
            targetCount: 6,
            maxNumber: 20,
            cost: 500,
            maxPrize: 11414
        }
    ],

    // State
    state: {
        gold: 1000,
        currentModeIndex: null,
        targetNumbers: [],
        cards: [],
        revealedCount: 0,
        foundTargets: 0,
        isGameOver: false,
        lastPrize: 0
    },

    addGold: function(amount) {
        this.state.gold += amount;
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
        this.state.targetNumbers = selectedNumbers;

        // Generate Cards
        // 1. Add Target Cards
        let deck = selectedNumbers.map(num => ({
            value: num,
            isTarget: true,
            revealed: false
        }));

        // 2. Add Dud Cards
        // For duds, we pick numbers from the allowed range (1 to maxNumber) that are NOT in selectedNumbers
        const allNumbers = Array.from({length: mode.maxNumber}, (_, i) => i + 1);
        const availableDuds = allNumbers.filter(n => !selectedNumbers.includes(n));

        // Shuffle available duds to pick random ones
        this.shuffle(availableDuds);

        const dudsNeeded = mode.totalCards - mode.targetCount;
        // In "Bingo" logic with full set (e.g. 2/4 from 1-4), dudsNeeded == availableDuds.length
        // But if logic changes, we take dudsNeeded
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
     * Formula: MaxPrize * ((TotalCards - OpenedCards) / (TotalCards - TargetCount))^2
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

        // If M == K (perfect game), factor is 1.
        // For each additional card, reduce prize by 50%.
        const extraCards = M - K;

        if (extraCards <= 0) {
            return mode.maxPrize;
        }

        const decayFactor = Math.pow(0.5, extraCards);
        const prize = Math.floor(mode.maxPrize * decayFactor);

        return Math.max(0, prize);
    },

    /**
     * Calculates the prize based on the current revealed count.
     * Use this for display if we want to show "Current Pot" status
     * rather than "Projected Win".
     */
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
