# Lot-Go Setup Guide

## Firebase Configuration

To make the application work, you need to configure your Firebase Project settings in the [Firebase Console](https://console.firebase.google.com/).

### 1. Enable Authentication
1. Go to **Build** > **Authentication**.
2. Click **Get Started**.
3. Select **Email/Password**.
4. Toggle **Enable** to **On**.
5. Click **Save**.

### 2. Enable Cloud Firestore
1. Go to **Build** > **Firestore Database**.
2. Click **Create database**.
3. Choose a location.
4. Start in **Test mode** or **Production mode**.
5. Click **Enable**.

### 3. Set Firestore Rules (CRITICAL)
If you see **"Permission Denied"**, you must update your rules.

1. Go to the **Rules** tab in Firestore.
2. **Delete everything** and paste this exact code:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow any logged-in user to read/write EVERYTHING in the database.
    // This is required for the Gifting, Admin, and Multiplayer features to work
    // without a backend server.
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click **Publish**.

*Warning: These rules allow any signed-in user to modify database data. This is acceptable for this prototype but not for a production banking app.*

### 4. Troubleshooting
- **"permission-denied"**: Did you click **Publish** in Step 3? Are you logged in?
- **"configuration-not-found"**: Did you enable Email/Password in Step 1?
