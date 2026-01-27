// js/multiplayer.js
import { db, auth } from './firebase-config.js';
import {
    collection,
    addDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    doc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    getDoc,
    setDoc,
    runTransaction
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const Multiplayer = {
    currentRoomId: null,
    currentRoomUnsubscribe: null,
    roomsUnsubscribe: null,

    // UI Callbacks
    onRoomsUpdate: null,
    onRoomStateUpdate: null,
    onJoinSuccess: null,
    onError: null,

    init: function(callbacks) {
        this.onRoomsUpdate = callbacks.onRoomsUpdate;
        this.onRoomStateUpdate = callbacks.onRoomStateUpdate;
        this.onJoinSuccess = callbacks.onJoinSuccess;
        this.onError = callbacks.onError;
        this.onGameStart = callbacks.onGameStart;
    },

    subscribeToRooms: function() {
        if (this.roomsUnsubscribe) return;

        // Ensure we are logged in. Wait a split second if needed?
        // Actually, if called from Lobby, Auth should be ready.
        // But to be safe against the "permission-denied" race condition:
        if (!auth.currentUser) {
            // Retry once after short delay or just error?
            // Better to let the caller handle timing, but let's just error safely.
            console.warn("subscribeToRooms called without auth");
            return;
        }

        // Simplified query to avoid index requirements during development
        // "Failed-precondition" error usually means a missing composite index.
        const q = query(
            collection(db, "rooms"),
            where("status", "==", "waiting")
        );

        this.roomsUnsubscribe = onSnapshot(q, (snapshot) => {
            const rooms = [];
            snapshot.forEach(doc => {
                rooms.push({ id: doc.id, ...doc.data() });
            });
            // Client-side sort since we removed orderBy
            rooms.sort((a, b) => b.createdAt - a.createdAt);

            if (this.onRoomsUpdate) this.onRoomsUpdate(rooms);
        }, (error) => {
            console.error("Error fetching rooms:", error);

            let message = `Failed to load rooms: ${error.code || error.message}`;
            if (error.code === 'permission-denied') {
                message = "Permission Denied: Please update Firestore Rules in Firebase Console (See SETUP.md).";
            }

            if (this.onError) this.onError(message);
        });
    },

    unsubscribeFromRooms: function() {
        if (this.roomsUnsubscribe) {
            this.roomsUnsubscribe();
            this.roomsUnsubscribe = null;
        }
    },

    createRoom: async function(modeIndex, openType, password) {
        if (!auth.currentUser) return;

        const roomData = {
            hostId: auth.currentUser.uid,
            hostName: auth.currentUser.email.split('@')[0], // Simple name
            modeIndex: parseInt(modeIndex),
            openType: openType,
            password: password || null,
            status: 'waiting',
            createdAt: new Date(),
            players: [{
                uid: auth.currentUser.uid,
                name: auth.currentUser.email.split('@')[0],
                ready: false,
                isHost: true
            }]
        };

        try {
            const docRef = await addDoc(collection(db, "rooms"), roomData);
            this.currentRoomId = docRef.id;
            this.subscribeToRoom(this.currentRoomId);
            if (this.onJoinSuccess) this.onJoinSuccess(this.currentRoomId);
        } catch (e) {
            console.error(e);
            if (this.onError) this.onError("Failed to create room.");
        }
    },

    joinRoom: async function(roomId, passwordInput) {
        if (!auth.currentUser) return;

        try {
            const roomRef = doc(db, "rooms", roomId);

            await runTransaction(db, async (transaction) => {
                const roomDoc = await transaction.get(roomRef);
                if (!roomDoc.exists()) throw new Error("Room does not exist.");

                const roomData = roomDoc.data();

                if (roomData.password && roomData.password !== passwordInput) {
                    throw new Error("Incorrect password.");
                }

                if (roomData.status !== 'waiting') {
                    throw new Error("Game already started.");
                }

                // Max Players Check
                if (roomData.players.length >= 10) {
                    throw new Error("Room is full (Max 10).");
                }

                const existing = roomData.players.find(p => p.uid === auth.currentUser.uid);
                if (!existing) {
                     const newPlayer = {
                        uid: auth.currentUser.uid,
                        name: auth.currentUser.email.split('@')[0],
                        ready: false,
                        isHost: false
                    };
                    // Use arrayUnion logic or manual push
                    const newPlayers = [...roomData.players, newPlayer];
                    transaction.update(roomRef, { players: newPlayers });
                }
            });

            this.currentRoomId = roomId;
            this.subscribeToRoom(roomId);
            if (this.onJoinSuccess) this.onJoinSuccess(roomId);

        } catch (e) {
            if (this.onError) this.onError(e.message);
        }
    },

    subscribeToRoom: function(roomId) {
        if (this.currentRoomUnsubscribe) this.currentRoomUnsubscribe();

        const roomRef = doc(db, "rooms", roomId);
        this.currentRoomUnsubscribe = onSnapshot(roomRef, (doc) => {
            if (!doc.exists()) {
                // Room deleted
                this.leaveRoom();
                return;
            }
            const data = doc.data();
            if (this.onRoomStateUpdate) this.onRoomStateUpdate({ id: doc.id, ...data });

            if (data.status === 'playing' && this.onGameStart) {
                this.onGameStart({ id: doc.id, ...data });
            }

        });
    },

    leaveRoom: async function() {
        if (!this.currentRoomId || !auth.currentUser) return;

        const roomId = this.currentRoomId;
        const roomRef = doc(db, "rooms", roomId);

        // Unsubscribe first
        if (this.currentRoomUnsubscribe) {
            this.currentRoomUnsubscribe();
            this.currentRoomUnsubscribe = null;
        }
        this.currentRoomId = null;

        try {
            const roomSnap = await getDoc(roomRef);
            if (roomSnap.exists()) {
                const roomData = roomSnap.data();
                const player = roomData.players.find(p => p.uid === auth.currentUser.uid);

                if (player) {
                    await updateDoc(roomRef, {
                        players: arrayRemove(player)
                    });
                }

                // If host leaves, maybe delete room or assign new host?
                // Simple: if players empty, delete.
                // We'll leave it for now.
            }
        } catch (e) {
            console.error(e);
        }
    },

    setReady: async function(isReady) {
        if (!this.currentRoomId || !auth.currentUser) return;

        const roomRef = doc(db, "rooms", this.currentRoomId);

        try {
            await runTransaction(db, async (transaction) => {
                const roomDoc = await transaction.get(roomRef);
                if (!roomDoc.exists()) throw new Error("Room does not exist.");
                const data = roomDoc.data();

                const newPlayers = data.players.map(p => {
                    if (p.uid === auth.currentUser.uid) {
                        return { ...p, ready: isReady };
                    }
                    return p;
                });

                transaction.update(roomRef, { players: newPlayers });
            });
        } catch (e) {
            console.error(e);
        }
    },

    startGame: async function() {
        if (!this.currentRoomId) return;
        const roomRef = doc(db, "rooms", this.currentRoomId);
        // Move to setup phase first to let players pick numbers
        await updateDoc(roomRef, { status: 'setup' });
    },

    submitSetup: async function(numbers) {
        if (!this.currentRoomId || !auth.currentUser) return;
        const roomRef = doc(db, "rooms", this.currentRoomId);

        try {
            await runTransaction(db, async (transaction) => {
                const roomDoc = await transaction.get(roomRef);
                if (!roomDoc.exists()) throw new Error("Room does not exist.");
                const data = roomDoc.data();

                const newPlayers = data.players.map(p => {
                    if (p.uid === auth.currentUser.uid) {
                        return { ...p, targetNumbers: numbers, hasSetup: true };
                    }
                    return p;
                });

                // Check if all players have setup
                const allSetup = newPlayers.every(p => p.hasSetup);

                let updates = { players: newPlayers };

                if (allSetup) {
                    // Last player to setup triggers the start
                    // We need to generate the deck. Since this is deterministic or random,
                    // doing it in the transaction is fine as long as all clients agree on the result...
                    // Wait, runTransaction runs on client. If I generate random deck here,
                    // it writes to DB and everyone sees it. That is fine.

                    const maxNumber = Game.MODES[data.modeIndex].maxNumber;
                    const deck = this.generateDeck(maxNumber);

                    updates.status = 'playing';
                    updates.deck = deck;
                    updates.currentTurn = newPlayers[0].uid;
                    updates.turnIndex = 0;
                }

                transaction.update(roomRef, updates);
            });
        } catch (e) {
            console.error(e);
        }
    },

    generateDeck: function(maxNumber) {
        // Create 1..maxNumber
        const cards = [];
        for (let i = 1; i <= maxNumber; i++) {
            cards.push({
                value: i,
                revealed: false
            });
        }
        // Shuffle
        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }
        return cards;
    },

    revealCard: async function(index) {
        if (!this.currentRoomId) return;
        const roomRef = doc(db, "rooms", this.currentRoomId);

        try {
            await runTransaction(db, async (transaction) => {
                const roomDoc = await transaction.get(roomRef);
                if (!roomDoc.exists()) throw new Error("Room does not exist.");
                const data = roomDoc.data();

                if (data.deck[index].revealed) return; // Already revealed

                const newDeck = [...data.deck];
                newDeck[index].revealed = true;

                const updates = { deck: newDeck };

                // Turn Logic
                if (data.openType === 'turn') {
                    const nextIndex = (data.turnIndex + 1) % data.players.length;
                    updates.turnIndex = nextIndex;
                    updates.currentTurn = data.players[nextIndex].uid;
                }

                transaction.update(roomRef, updates);
            });
        } catch (e) {
            console.error(e);
        }
    },

    claimWin: async function(prize) {
        if (!this.currentRoomId) return;
        const roomRef = doc(db, "rooms", this.currentRoomId);

        try {
            await runTransaction(db, async (transaction) => {
                const roomDoc = await transaction.get(roomRef);
                if (!roomDoc.exists()) throw new Error("Room does not exist.");
                const data = roomDoc.data();

                if (data.status === 'finished') return; // Already claimed

                transaction.update(roomRef, {
                    status: 'finished',
                    winner: {
                        uid: auth.currentUser.uid,
                        name: auth.currentUser.email.split('@')[0],
                        prize: prize
                    }
                });
            });
        } catch (e) {
            console.error(e);
        }
    },

    // Auto Loop (Host Only)
    startAutoLoop: function() {
        if (this.autoInterval) clearInterval(this.autoInterval);

        this.autoInterval = setInterval(async () => {
            if (!this.currentRoomId) {
                clearInterval(this.autoInterval);
                return;
            }

            // Check if game still playing
            const roomRef = doc(db, "rooms", this.currentRoomId);
            const snap = await getDoc(roomRef);
            if (!snap.exists()) return;
            const data = snap.data();

            if (data.status !== 'playing') {
                clearInterval(this.autoInterval);
                return;
            }

            // Find unrevealed cards
            const unrevealedIndices = data.deck
                .map((c, i) => c.revealed ? -1 : i)
                .filter(i => i !== -1);

            if (unrevealedIndices.length === 0) {
                clearInterval(this.autoInterval); // No more cards
                return;
            }

            const randIndex = unrevealedIndices[Math.floor(Math.random() * unrevealedIndices.length)];

            // Just reveal it (this triggers snapshot update for everyone)
            // We use updateDoc directly to avoid race conditions with local state
            // But since we are host, we are the source of truth for auto.
            // Actually, we should reuse revealCard logic but we can't call async easily in interval without care.
            // It's fine.

            const newDeck = [...data.deck];
            newDeck[randIndex].revealed = true;
            await updateDoc(roomRef, { deck: newDeck });

        }, 2000); // Open every 2 seconds
    },

    stopAutoLoop: function() {
        if (this.autoInterval) clearInterval(this.autoInterval);
    }
};

export default Multiplayer;
