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
            return { success: false, message: this.getFriendlyErrorMessage(error) };
        }
    },

    signup: async function(email, password) {
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (error) {
            return { success: false, message: this.getFriendlyErrorMessage(error) };
        }
    },

    getFriendlyErrorMessage: function(error) {
        console.error(error);
        if (error.code === 'auth/configuration-not-found' || error.code === 'auth/operation-not-allowed') {
            return "Login failed: Email/Password login is not enabled in Firebase Console.";
        }
        if (error.code === 'auth/invalid-email') return "Invalid email address.";
        if (error.code === 'auth/user-not-found') return "User not found.";
        if (error.code === 'auth/wrong-password') return "Incorrect password.";
        if (error.code === 'auth/email-already-in-use') return "Email already in use.";
        if (error.code === 'auth/weak-password') return "Password should be at least 6 characters.";

        return error.message;
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
