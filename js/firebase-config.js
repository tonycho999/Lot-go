// js/firebase-config.js

// TODO: Replace with your project's config object
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const Config = {
    db: null,
    auth: null,

    init: function() {
        if (typeof firebase === 'undefined') {
            console.error("Firebase SDK not loaded.");
            return;
        }

        try {
            const app = firebase.initializeApp(firebaseConfig);
            this.db = firebase.firestore();
            this.auth = firebase.auth();
            console.log("Firebase Initialized Successfully");
        } catch (error) {
            console.error("Firebase Initialization Failed:", error);
            if (error.code === 'app/no-app' || error.message.includes('valid config')) {
                alert("Firebase configuration is missing or invalid. Please check the console and js/firebase-config.js.");
            }
        }
    }
};

// Initialize immediately
Config.init();
