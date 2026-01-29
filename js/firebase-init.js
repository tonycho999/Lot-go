const firebaseConfig = {
  apiKey: "AIzaSyDvXGhasq7tSVUxpQjfvklzgxXRD29GuXk",
  authDomain: "lot-go.firebaseapp.com",
  databaseURL: "https://lot-go-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "lot-go",
  storageBucket: "lot-go.firebasestorage.app",
  messagingSenderId: "397328831286",
  appId: "1:397328831286:web:7005a3634a9426a1b5d997",
  measurementId: "G-F46H492LBX"
};

// Initialize Firebase
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase Initialized");
} else {
    console.error("Firebase SDK not loaded");
}
