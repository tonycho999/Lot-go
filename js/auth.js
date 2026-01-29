// js/auth.js

const Auth = {
    // LocalStorage Keys
    USERS_KEY: 'lotgo_users',
    CURRENT_USER_KEY: 'lotgo_user',

    init: function() {
        // Ensure Admin exists
        const users = this.getUsers();
        if (!users['admin']) {
            users['admin'] = { password: '999999' };
            this.saveUsers(users);
        }
    },

    getUsers: function() {
        const usersJSON = localStorage.getItem(this.USERS_KEY);
        return usersJSON ? JSON.parse(usersJSON) : {};
    },

    saveUsers: function(users) {
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    },

    getCurrentUser: function() {
        return localStorage.getItem(this.CURRENT_USER_KEY);
    },

    /**
     * Registers a new user.
     */
    signup: function(username, password) {
        const users = this.getUsers();
        if (users[username]) {
            return { success: false, message: "Username already exists" };
        }
        users[username] = { password: password };
        this.saveUsers(users);

        // Auto-login? Or return success. Let's return success.
        return { success: true, message: "Account created! Please login." };
    },

    /**
     * Verifies the username and password.
     */
    login: function(username, password) {
        const users = this.getUsers();
        const user = users[username];

        if (user && user.password === password) {
            console.log("Login Successful");
            localStorage.setItem(this.CURRENT_USER_KEY, username);
            return { success: true };
        }
        console.log("Login Failed");
        return { success: false, message: "Invalid credentials" };
    },

    logout: function() {
        localStorage.removeItem(this.CURRENT_USER_KEY);
    },

    isLoggedIn: function() {
        return !!this.getCurrentUser();
    },

    changePassword: function(username, newPassword) {
        const users = this.getUsers();
        if (!users[username]) return { success: false, message: "User not found" };

        users[username].password = newPassword;
        this.saveUsers(users);
        return { success: true, message: "Password updated successfully" };
    },

    deleteAccount: function(username) {
        const users = this.getUsers();
        if (!users[username]) return { success: false, message: "User not found" };

        // Cannot delete admin? Maybe allow for testing.
        delete users[username];
        this.saveUsers(users);
        this.logout();

        // Also clean up gold? Game module handles gold storage, but we might want to clean it here or leave it.
        // Leaving it is safer for simple implementations (orphaned data).
        localStorage.removeItem(`lotgo_gold_${username}`);

        return { success: true, message: "Account deleted" };
    }
};

// Initialize on load
Auth.init();
