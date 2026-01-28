// js/store.js

const Store = {
    unsubscribe: null,

    /**
     * Initializes the user document in Firestore if it doesn't exist.
     * Sets up the real-time listener.
     */
    initUser: async function(user) {
        if (!user) return;

        if (Config.isMock) {
            console.log("Store: Initializing Mock User");
            const key = `lotgo_mock_data_${user.uid}`;
            let data = localStorage.getItem(key);
            if (!data) {
                data = {
                    username: user.email ? user.email.split('@')[0] : 'User',
                    email: user.email,
                    gold: 1000,
                    createdAt: Date.now()
                };
                localStorage.setItem(key, JSON.stringify(data));
            }
            this.subscribeToUser(user.uid);
            return;
        }

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
            this.unsubscribe = null;
        }

        if (Config.isMock) {
            const updateFromStorage = () => {
                const key = `lotgo_mock_data_${uid}`;
                const dataStr = localStorage.getItem(key);
                if (dataStr) {
                    const data = JSON.parse(dataStr);
                    if (window.Game) {
                        Game.state.gold = data.gold !== undefined ? data.gold : 0;
                    }
                    if (window.App && App.updateGoldDisplays) {
                        App.updateGoldDisplays();
                    }
                }
            };

            // Initial call
            updateFromStorage();

            // Mock listener (polling or custom event)
            // Since we are the only ones updating it in this session, we can just update explicitly.
            // But to simulate "subscription", we can set an interval or hook into updateGold.
            // For simplicity, updateGold will trigger the "listener" logic if mock.
            return;
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
        if (Config.isMock) {
            const key = `lotgo_mock_data_${uid}`;
            let data = JSON.parse(localStorage.getItem(key) || '{}');
            data.gold = (data.gold || 0) + amount;
            localStorage.setItem(key, JSON.stringify(data));

            // Simulate real-time update
            if (window.Game) Game.state.gold = data.gold;
            if (window.App && App.updateGoldDisplays) App.updateGoldDisplays();
            return;
        }

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

window.Store = Store;
