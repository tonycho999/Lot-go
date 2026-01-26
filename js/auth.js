// js/auth.js

const Auth = {
    CREDENTIALS: {
        username: 'admin',
        password: '999999'
    },

    /**
     * Verifies the username and password.
     * @param {string} username
     * @param {string} password
     * @returns {boolean}
     */
    login: function(username, password) {
        if (username === this.CREDENTIALS.username && password === this.CREDENTIALS.password) {
            console.log("Login Successful");
            localStorage.setItem('lotgo_user', username);
            return true;
        }
        console.log("Login Failed");
        return false;
    },

    logout: function() {
        localStorage.removeItem('lotgo_user');
    },

    isLoggedIn: function() {
        return localStorage.getItem('lotgo_user') === this.CREDENTIALS.username;
    }
};
