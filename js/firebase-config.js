// js/firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDvXGhasq7tSVUxpQjfvklzgxXRD29GuXk",
  authDomain: "lot-go.firebaseapp.com",
  projectId: "lot-go",
  storageBucket: "lot-go.firebasestorage.app",
  messagingSenderId: "397328831286",
  appId: "1:397328831286:web:7005a3634a9426a1b5d997",
  measurementId: "G-F46H492LBX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // For Rooms
const rtdb = getDatabase(app); // For fast game state if needed, or stick to Firestore

export { auth, db, rtdb };
