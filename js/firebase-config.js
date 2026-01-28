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
    isMock: false,

    init: function() {
        // Check if config is still default placeholder
        if (firebaseConfig.apiKey === "YOUR_API_KEY") {
            console.warn("Firebase Config is using placeholders. Switching to Mock Mode.");
            this.isMock = true;
            return;
        }

        if (typeof firebase === 'undefined') {
            console.error("Firebase SDK not loaded.");
            this.isMock = true;
            return;
        }

        try {
            const app = firebase.initializeApp(firebaseConfig);
            this.db = firebase.firestore();
            this.auth = firebase.auth();
            console.log("Firebase Initialized Successfully");
        } catch (error) {
            console.error("Firebase Initialization Failed:", error);
            this.isMock = true;
        }
    }
};

// Initialize immediately
Config.init();
