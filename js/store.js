// js/store.js

const Store = {
    unsubscribe: null,

    /**
     * Initializes the user document in Firestore if it doesn't exist.
     * Sets up the real-time listener.
     */
    initUser: async function(user) {
        if (!user) return;
        const db = Config.db;
        if (!db) return;

        const userRef = db.collection('users').doc(user.uid);

        try {
            const doc = await userRef.get();
            if (!doc.exists) {
                // Create new user doc
                await userRef.set({
                    username: user.email ? user.email.split('@')[0] : 'User',
                    email: user.email,
                    gold: 1000, // Starting gold
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log("User profile created.");
            }

            // Start listening
            this.subscribeToUser(user.uid);
        } catch (e) {
            console.error("Error initializing user:", e);
        }
    },

    subscribeToUser: function(uid) {
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        const db = Config.db;
        if (!db) return;

        this.unsubscribe = db.collection('users').doc(uid)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    // Update Game State
                    if (window.Game) {
                        Game.state.gold = data.gold !== undefined ? data.gold : 0;
                    }
                    // Notify App to update UI if needed
                    if (window.App && App.updateGoldDisplays) {
                        App.updateGoldDisplays();
                    }

                    // Admin capability check (hardcoded in memory)
                    if (window.App && App.checkAdmin) {
                        App.checkAdmin(data.email);
                    }
                }
            }, (error) => {
                console.error("Error listening to user data:", error);
            });
    },

    /**
     * Updates the user's gold in Firestore.
     * @param {string} uid
     * @param {number} amount (can be positive or negative)
     * @returns {Promise<void>}
     */
    updateGold: async function(uid, amount) {
        const db = Config.db;
        if (!db) return;

        const userRef = db.collection('users').doc(uid);

        try {
            // Use atomic increment
            await userRef.set({
                gold: firebase.firestore.FieldValue.increment(amount)
            }, { merge: true });
        } catch (e) {
            console.error("Error updating gold:", e);
            throw e;
        }
    }
};
