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
            maxPrize: 200 // Fixed per user request (Mode 0: 200)
        },
        {
            id: 1,
            name: "4/10 Cards",
            totalCards: 10,
            targetCount: 4,
            maxNumber: 10,
            cost: 100,
            maxPrize: 20000 // Fixed per memory (Mode 1: 20,000)
        },
        {
            id: 2,
            name: "6/20 Cards",
            totalCards: 20,
            targetCount: 6,
            maxNumber: 20,
            cost: 500,
            maxPrize: 7500000 // Fixed per memory (Mode 2: 7,500,000)
        }
    ],

    // State
    state: {
        gold: 0,
        currentModeIndex: null,
        targetNumbers: [],
        cards: [],
        revealedCount: 0,
        foundTargets: 0,
        isGameOver: false,
        lastPrize: 0
    },

    loadUserData: async function(uid) {
        try {
            const snapshot = await firebase.database().ref('users/' + uid).once('value');
            const data = snapshot.val();
            if (data) {
                this.state.gold = data.gold || 0;
            } else {
                this.state.gold = 1000; // Fallback
            }
            return this.state.gold;
        } catch (e) {
            console.error("Error loading user data:", e);
            this.state.gold = 1000;
            return 1000;
        }
    },

    saveGold: function() {
        const user = Auth.getCurrentUser();
        if (user) {
            firebase.database().ref('users/' + user.uid).update({
                gold: this.state.gold
            });
        }
    },

    addGold: function(amount) {
        this.state.gold += amount;
        this.saveGold();
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
    },

    /**
     * Starts the game with selected numbers.
     */
    startGame: function(selectedNumbers) {
        const mode = this.MODES[this.state.currentModeIndex];

        if (selectedNumbers.length !== mode.targetCount) {
            throw new Error(`Select exactly ${mode.targetCount} numbers.`);
        }

        // Deduct Gold
        this.state.gold -= mode.cost;
        this.saveGold();

        this.state.targetNumbers = selectedNumbers;

        // Generate Cards
        let deck = selectedNumbers.map(num => ({
            value: num,
            isTarget: true,
            revealed: false
        }));

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

        this.shuffle(deck);
        this.state.cards = deck;
    },

    /**
     * Reveals a card at the given index.
     */
    revealCard: function(index) {
        if (this.state.isGameOver) return null;
        if (index < 0 || index >= this.state.cards.length) return null;

        const card = this.state.cards[index];
        if (card.revealed) return null;

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
            this.addGold(this.state.lastPrize); // Auto save
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

    calculateReward: function() {
        return this.calculateRewardForRevealed(this.state.revealedCount);
    },

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
    },

    /**
     * Sends a gift to another user.
     * Admin: Infinite amount, no min limit.
     * User: Deducted from balance, min 100,000.
     */
    sendGift: async function(recipientUsername, amount) {
        amount = parseInt(amount);
        if (isNaN(amount) || amount <= 0) {
            return { success: false, message: "Invalid amount" };
        }

        const isAdmin = Auth.isAdmin();
        const currentUser = Auth.getCurrentUser();

        // 1. Validation
        if (!isAdmin) {
            if (amount < 100000) {
                return { success: false, message: "Minimum gift is 100,000 Gold" };
            }
            if (this.state.gold < amount) {
                return { success: false, message: "Not enough gold" };
            }
        }

        // 2. Find Recipient
        const snapshot = await firebase.database().ref('users')
            .orderByChild('username')
            .equalTo(recipientUsername)
            .once('value');

        const val = snapshot.val();

        if (!val) {
             return { success: false, message: "User not found" };
        }

        const recipientUid = Object.keys(val)[0];
        const recipientData = val[recipientUid];

        // 3. Execute Transfer
        const updates = {};

        // Add to recipient
        updates['users/' + recipientUid + '/gold'] = (recipientData.gold || 0) + amount;

        // Deduct from sender (if not admin)
        if (!isAdmin) {
             this.state.gold -= amount;
             updates['users/' + currentUser.uid + '/gold'] = this.state.gold;
        }

        try {
            await firebase.database().ref().update(updates);
            if (isAdmin) {
                // Refresh gold display just in case, though balance didn't change
                // Or maybe Admin has infinite gold so we just set it to a high number?
                // Nah, just don't deduct.
            } else {
                this.saveGold(); // Redundant with update above but good for local state sync safety
            }
            return { success: true, message: `Successfully sent ${amount.toLocaleString()} Gold to ${recipientUsername}!` };
        } catch(e) {
            return { success: false, message: e.message };
        }
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Game;
} else {
    window.Game = Game;
}
