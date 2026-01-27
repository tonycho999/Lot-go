# Lot-Go Setup Guide

## Firebase Configuration

To make the application work, you need to configure your Firebase Project settings in the [Firebase Console](https://console.firebase.google.com/).

### 1. Enable Authentication
The application uses Email/Password authentication. You must enable this provider:

1. Go to your Firebase Console.
2. Select your project (**lot-go**).
3. In the left sidebar, click on **Build** > **Authentication**.
4. Click **Get Started** if you haven't already.
5. Select the **Sign-in method** tab.
6. Click on **Email/Password**.
7. Toggle **Enable** to **On**.
8. Click **Save**.

### 2. Enable Cloud Firestore
The multiplayer features and user profiles use Cloud Firestore.

1. In the left sidebar, click on **Build** > **Firestore Database**.
2. Click **Create database**.
3. Choose a location (e.g., `nam5 (us-central)` or closest to you).
4. Start in **Test mode** (for development) or **Production mode**.
5. Click **Enable**.

### 3. Firestore Security Rules (CRITICAL)
If you see **"Missing or insufficient permissions"** or **"permission-denied"**, you must update your rules to allow authenticated users to access the data.

Since this application runs entirely in the browser (without a backend server), users need broad access to facilitate Gifting and Admin functions.

1. Go to the **Rules** tab in Firestore.
2. Replace the code with the following:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow any logged-in user to read/write everything.
    // This is required for the Client-side Admin and Gifting features to work.
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click **Publish**.

*Note: For a production application, you would use Cloud Functions to handle Gifting and Admin tasks securely. For this prototype, opening the rules is the correct solution.*

### 4. Troubleshooting
- **"permission-denied"**: Double check Step 3. Ensure you clicked **Publish**.
- **"configuration-not-found"**: Double check Step 1. Ensure Email/Password is **Enabled**.
