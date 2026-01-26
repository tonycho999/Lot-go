// js/game.js

const Game = {
    // Configuration
    MODES: [
        {
            id: 0,
            name: "2/4 Cards",
            totalCards: 4,
            targetCount: 2,
            cost: 50,
            maxPrize: 200
        },
        {
            id: 1,
            name: "4/10 Cards",
            totalCards: 10,
            targetCount: 4,
            cost: 100,
            maxPrize: 10000
        },
        {
            id: 2,
            name: "6/20 Cards",
            totalCards: 20,
            targetCount: 6,
            cost: 500,
            maxPrize: 1000000000
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
        const dudsNeeded = mode.totalCards - mode.targetCount;
        for (let i = 0; i < dudsNeeded; i++) {
            let dud;
            do {
                dud = Math.floor(Math.random() * 99) + 1;
            } while (selectedNumbers.includes(dud) || deck.some(c => c.value === dud)); // Avoid duplicates

            deck.push({
                value: dud,
                isTarget: false,
                revealed: false
            });
        }

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
        const mode = this.MODES[this.state.currentModeIndex];
        const M = this.state.revealedCount;
        const N = mode.totalCards;
        const K = mode.targetCount;

        // If M == K (perfect game), term is 1.
        // If M == N (worst game), term is 0.
        // Denominator: The range of "extra" clicks allowed.
        const numerator = N - M;
        const denominator = N - K;

        if (denominator === 0) return mode.maxPrize; // Should not happen as N > K always

        const factor = numerator / denominator;
        const prize = Math.floor(mode.maxPrize * Math.pow(factor, 2));

        return Math.max(0, prize);
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
