// js/auth.js

const Auth = {
    currentUser: null,

    init: function() {
        if (Config.isMock) {
            console.log("Auth running in Mock Mode");
            // Check local storage for mock session
            const storedUser = localStorage.getItem('lotgo_mock_user');
            if (storedUser) {
                this.currentUser = JSON.parse(storedUser);
                this.onUserChange(this.currentUser);
            }
            return;
        }

        if (!Config.auth) return;

        Config.auth.onAuthStateChanged(user => {
            this.currentUser = user;
            this.onUserChange(user);
        });
    },

    onUserChange: function(user) {
        if (user) {
            console.log("User logged in:", user.email);
            if (window.Store) Store.initUser(user);
            if (window.App) App.showLobby();
        } else {
            console.log("User logged out");
            if (window.App) App.showScreen('login');
        }
    },

    login: async function(email, password) {
        if (Config.isMock) {
            // Simulate API delay
            await new Promise(r => setTimeout(r, 500));

            // Allow any login in mock mode, or enforce specific ones if desired.
            // For now, allow any non-empty.
            if (!email || !password) {
                return { success: false, message: "Email and password required" };
            }

            const mockUser = {
                uid: 'mock-uid-' + email,
                email: email,
                displayName: email.split('@')[0]
            };

            this.currentUser = mockUser;
            localStorage.setItem('lotgo_mock_user', JSON.stringify(mockUser));
            this.onUserChange(mockUser);
            return { success: true };
        }

        if (!Config.auth) return { success: false, message: "Firebase not initialized" };
        try {
            await Config.auth.signInWithEmailAndPassword(email, password);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    register: async function(email, password) {
        if (Config.isMock) {
            // Same as login for mock
            return this.login(email, password);
        }

        if (!Config.auth) return { success: false, message: "Firebase not initialized" };
        try {
            await Config.auth.createUserWithEmailAndPassword(email, password);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    logout: async function() {
        if (Config.isMock) {
            this.currentUser = null;
            localStorage.removeItem('lotgo_mock_user');
            if (window.Store) Store.unsubscribe && Store.unsubscribe();
            this.onUserChange(null);
            return;
        }

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
window.Auth = Auth;
Auth.init();
