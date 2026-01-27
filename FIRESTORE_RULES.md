# Firestore Security Rules Guide

It looks like you provided rules for **Realtime Database** (JSON format), but this application uses **Cloud Firestore**.

To make the **Gifting** and **Admin** features work purely from the client-side (without a backend server), you need slightly broader rules than usual.

## Correct Firestore Rules

Go to the **Firestore Database** section in the Firebase Console, click the **Rules** tab, and paste this:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // --- Users Collection ---
    // We allow any logged-in user to read/write any user profile.
    // Why?
    // 1. Gifting: To send a gift, User A needs to update User B's gold.
    // 2. Admin: The admin needs to update any user's gold.
    // 3. User Lookup: To send a gift by email, we need to query the users collection.
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }

    // --- Rooms Collection ---
    // Multiplayer rooms need to be read/written by all players in the room.
    match /rooms/{roomId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Why your proposed rules wouldn't work

If you restricted `users` so that people can only write to their own ID (`auth.uid == $uid`):
1. **Gifting would fail:** You wouldn't be able to add gold to your friend's account.
2. **Admin would fail:** The admin account wouldn't be able to grant gold to others.

*Note: In a professional production app with a backend server, we would restrict these rules and use "Cloud Functions" to handle the secure transfers. For this web-only prototype, the rules above are necessary.*
