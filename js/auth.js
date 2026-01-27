// js/auth.js
import { auth } from './firebase-config.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

const Auth = {
    user: null,

    init: function(onAuthChangeCallback) {
        onAuthStateChanged(auth, (user) => {
            this.user = user;
            if (user) {
                console.log("User logged in:", user.email);
                localStorage.setItem('lotgo_user', user.email);
            } else {
                console.log("User logged out");
                localStorage.removeItem('lotgo_user');
            }
            if (onAuthChangeCallback) onAuthChangeCallback(user);
        });
    },

    login: async function(email, password) {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    signup: async function(email, password) {
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    logout: async function() {
        await signOut(auth);
    },

    isLoggedIn: function() {
        return !!this.user;
    },

    getUserEmail: function() {
        return this.user ? this.user.email : null;
    }
};

window.Auth = Auth; // Keep global for backward compat if needed, but we should import.
export default Auth;
