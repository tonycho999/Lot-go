
global.localStorage = {
    store: {},
    setItem: function(k, v) { this.store[k] = v; },
    getItem: function(k) { return this.store[k]; },
    removeItem: function(k) { delete this.store[k]; }
};

const fs = require('fs');
let authCode = fs.readFileSync('js/auth.js', 'utf8');
// Hack to make it work in Node eval by attaching to global
authCode = authCode.replace('const Auth =', 'global.Auth =');

eval(authCode);

console.log("Testing Login...");
if (global.Auth.login('admin', '999999') !== true) {
    console.error("Login with correct credentials failed");
    process.exit(1);
}
if (global.Auth.isLoggedIn() !== true) {
    console.error("isLoggedIn check failed");
    process.exit(1);
}

if (global.Auth.login('admin', 'wrong') === true) {
    console.error("Login with wrong password succeeded");
    process.exit(1);
}

global.Auth.logout();
if (global.Auth.isLoggedIn() === true) {
    console.error("Logout failed");
    process.exit(1);
}

console.log("Auth tests passed.");
