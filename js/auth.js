// js/auth.js

const Auth = {
    currentUser: null,

    init: function() {
        if (!Config.auth) return;

        Config.auth.onAuthStateChanged(user => {
            this.currentUser = user;
            if (user) {
                console.log("User logged in:", user.email);
                if (window.Store) Store.initUser(user);
                if (window.App) App.showLobby();
            } else {
                console.log("User logged out");
                if (window.App) App.showScreen('login');
            }
        });
    },

    login: async function(email, password) {
        if (!Config.auth) return { success: false, message: "Firebase not initialized" };
        try {
            await Config.auth.signInWithEmailAndPassword(email, password);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    register: async function(email, password) {
        if (!Config.auth) return { success: false, message: "Firebase not initialized" };
        try {
            await Config.auth.createUserWithEmailAndPassword(email, password);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    logout: async function() {
        if (!Config.auth) return;
        try {
            await Config.auth.signOut();
            if (window.Store) Store.unsubscribe && Store.unsubscribe();
        } catch (error) {
            console.error("Logout failed:", error);
        }
    },

    isLoggedIn: function() {
        return !!this.currentUser;
    }
};

// Initialize listener
Auth.init();
