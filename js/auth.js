// js/auth.js

const Auth = {
    // Helper to convert username to email
    usernameToEmail: function(username) {
        // 1. Check if it's the admin
        const cleanName = username.trim().toLowerCase();
        if (cleanName === 'admin') {
            return 'admin@test.com';
        }

        // 2. If it contains '@', assume it's a valid email
        if (cleanName.includes('@')) {
            return cleanName;
        }

        // 3. Otherwise, sanitize for local part
        // Remove everything that isn't a-z, 0-9, ., _, or -
        const sanitized = cleanName.replace(/[^a-z0-9._-]/g, '');
        return `${sanitized}@lotgo.app`;
    },

    /**
     * Logs in the user using Firebase Auth
     */
    login: async function(username, password) {
        try {
            const email = this.usernameToEmail(username);
            await firebase.auth().signInWithEmailAndPassword(email, password);
            return { success: true };
        } catch (error) {
            console.error("Login Error:", error);

            // Auto-provision admin account if it doesn't exist
            if (error.code === 'auth/user-not-found' && username === 'admin') {
                console.log("Admin account not found. Attempting to auto-create...");
                return this.signUp(username, password);
            }

            return { success: false, message: error.message };
        }
    },

    /**
     * Signs up a new user using Firebase Auth
     */
    signUp: async function(username, password) {
        try {
            const email = this.usernameToEmail(username);
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);

            // Initialize user data in Realtime Database
            const uid = userCredential.user.uid;
            await firebase.database().ref('users/' + uid).set({
                username: username,
                gold: 1000, // Initial gold
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });

            return { success: true };
        } catch (error) {
            console.error("Signup Error:", error);
            return { success: false, message: error.message };
        }
    },

    logout: async function() {
        try {
            await firebase.auth().signOut();
            localStorage.removeItem('lotgo_user'); // Clear legacy if any
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    getCurrentUser: function() {
        return firebase.auth().currentUser;
    },

    isAdmin: function() {
        const user = this.getCurrentUser();
        // Check hardcoded admin email or check DB logic later
        return user && user.email === 'admin@test.com';
    },

    deleteAccount: async function() {
        try {
            const user = this.getCurrentUser();
            if (!user) throw new Error("No user logged in");

            // Delete data first
            await firebase.database().ref('users/' + user.uid).remove();

            // Delete auth user
            await user.delete();
            return { success: true };
        } catch (error) {
            console.error("Delete Account Error:", error);
            return { success: false, message: error.message };
        }
    }
};
