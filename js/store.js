import { db, auth } from './firebase-config.js';
import {
    doc,
    setDoc,
    getDoc,
    onSnapshot,
    updateDoc,
    increment,
    runTransaction,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const UserStore = {
    unsubscribeUser: null,

    // Initialize User Data on Login
    initUser: async function(user) {
        if (!user) return;
        const userRef = doc(db, "users", user.uid);

        try {
            const snap = await getDoc(userRef);
            if (!snap.exists()) {
                // Create new user doc
                await setDoc(userRef, {
                    email: user.email,
                    gold: 1000, // Starting Gold
                    createdAt: new Date()
                });
            } else {
                // Ensure email is up to date (rarely changes but good practice)
                if (snap.data().email !== user.email) {
                    await updateDoc(userRef, { email: user.email });
                }
            }
        } catch (e) {
            console.error("Error initializing user:", e);
        }
    },

    // Listen to Gold Changes
    subscribeToUser: function(uid, onUpdate) {
        if (this.unsubscribeUser) this.unsubscribeUser();

        const userRef = doc(db, "users", uid);
        this.unsubscribeUser = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
                onUpdate(doc.data());
            }
        });
    },

    unsubscribe: function() {
        if (this.unsubscribeUser) {
            this.unsubscribeUser();
            this.unsubscribeUser = null;
        }
    },

    // Update Gold (Game Logic)
    updateGold: async function(uid, amount) {
        try {
            const userRef = doc(db, "users", uid);
            // Use setDoc with merge: true to create doc if missing (robustness)
            await setDoc(userRef, {
                gold: increment(amount)
            }, { merge: true });
            console.log(`Updated gold for ${uid}: ${amount}`);
        } catch (e) {
            console.error("Failed to update gold:", e);
            alert(`Error saving progress: ${e.message}`);
            throw e;
        }
    },

    // Gifting Logic
    sendGift: async function(senderUid, recipientEmail, amount) {
        if (amount < 100000) {
            throw new Error("Minimum gift amount is 100,000 Gold.");
        }

        // 1. Find Recipient by Email
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", recipientEmail));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error("Recipient not found.");
        }

        const recipientDoc = querySnapshot.docs[0];
        const recipientUid = recipientDoc.id;

        if (recipientUid === senderUid) {
            throw new Error("You cannot gift yourself.");
        }

        // 2. Transaction
        await runTransaction(db, async (transaction) => {
            const senderRef = doc(db, "users", senderUid);
            const receiverRef = doc(db, "users", recipientUid);

            const senderSnap = await transaction.get(senderRef);
            if (!senderSnap.exists()) throw new Error("Sender not found.");

            const senderGold = senderSnap.data().gold || 0;
            if (senderGold < amount) {
                throw new Error("Insufficient gold.");
            }

            transaction.update(senderRef, { gold: increment(-amount) });
            transaction.update(receiverRef, { gold: increment(amount) });
        });
    },

    // Admin Grant Logic
    adminGrantGold: async function(recipientEmail, amount) {
        // 1. Find Recipient
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", recipientEmail));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error("Recipient not found.");
        }

        const recipientDoc = querySnapshot.docs[0];
        const recipientUid = recipientDoc.id;

        // 2. Just Add Gold
        const receiverRef = doc(db, "users", recipientUid);
        await updateDoc(receiverRef, {
            gold: increment(amount)
        });
    }
};

export default UserStore;
