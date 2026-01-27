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
The multiplayer features use Cloud Firestore to sync game state.

1. In the left sidebar, click on **Build** > **Firestore Database**.
2. Click **Create database**.
3. Choose a location (e.g., `nam5 (us-central)` or closest to you).
4. Start in **Test mode** (for development) or **Production mode**.
   - *Note: In Test mode, anyone with the config can read/write your database. For production, you will need to set up Security Rules.*
5. Click **Enable**.

### 3. Firestore Rules (Basic)
If you are in Production mode or need to reset rules, use these basic rules for development:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
This allows any logged-in user to read and write to the database.
