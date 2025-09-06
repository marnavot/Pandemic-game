// Modular imports for Firebase v9+
import * as firebase from "firebase/app";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    doc, 
    setDoc, 
    getDoc, 
    onSnapshot, 
    updateDoc, 
    type Firestore,
    type DocumentData,
    type Unsubscribe
} from "firebase/firestore";
import { GameState } from '../types';
import { deepClone } from '../utils';

// ====================================================================================
// IMPORTANT: PASTE YOUR FIREBASE CONFIGURATION OBJECT HERE
// You can get this from the Firebase Console:
// Project Settings > General > Your apps > Web app > SDK setup and configuration
// ====================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyB3-1Tzh_NPLrQZB5lSYdZNZfL8QOMrfNo",
  authDomain: "pandemic-464616.firebaseapp.com",
  projectId: "pandemic-464616",
  // Corrected storageBucket URL
  storageBucket: "pandemic-464616.appspot.com", 
  messagingSenderId: "351119674329",
  appId: "1:351119674329:web:bc60220f0e0ef82d2a27c8",
  measurementId: "G-HV5NF2RJ09"
};
// ====================================================================================

let app: firebase.FirebaseApp | null = null;
let db: Firestore | null = null;
export let isFirebaseInitialized = false;

// Function to initialize Firebase on demand, preventing crashes on startup.
const initializeFirebase = () => {
    if (isFirebaseInitialized) {
        return; // Already initialized, do nothing.
    }
    if (firebaseConfig.apiKey && firebaseConfig.projectId) {
        try {
            // Check if an app is already initialized to prevent errors in hot-reloading environments.
            if (!firebase.getApps().length) {
                app = firebase.initializeApp(firebaseConfig);
            } else {
                app = firebase.getApp(); // Get the default app if it already exists.
            }
            db = getFirestore(app);
            isFirebaseInitialized = true;
            console.log("Firebase connected successfully on-demand.");
        } catch (e) {
            console.error("Firebase initialization failed:", e);
            isFirebaseInitialized = false; // Ensure this is false on failure.
        }
    } else {
        console.warn("Firebase config is missing or incomplete in services/firebase.ts. Multiplayer features will be disabled.");
    }
};


const gamesCollectionRef = () => {
    initializeFirebase(); // Ensure initialization before use
    if (!db) throw new Error("Firebase not initialized.");
    return collection(db, 'games');
};

/**
 * Creates a new game document in Firestore.
 * @param initialGameState The initial state of the game to be saved.
 * @returns The unique ID of the newly created game.
 */
export const createGame = async (initialGameState: GameState): Promise<string> => {
    initializeFirebase();
    if (!isFirebaseInitialized) throw new Error("Firebase is not configured. Cannot create multiplayer game.");
    try {
        // Sanitize the data before sending it to Firebase
        const { actionHistory, ...stateToSave } = deepClone(initialGameState);
        const docRef = await addDoc(gamesCollectionRef(), stateToSave);
        console.log("Game created with ID: ", docRef.id);
        return docRef.id;
    } catch (e) {
        console.error("Error adding document: ", e);
        throw new Error("Could not create game in Firebase.");
    }
};

/**
 * Updates an existing game document in Firestore.
 * @param gameId The ID of the game to update.
 * @param gameState The new state to save.
 */
export const updateGame = async (gameId: string, gameState: GameState): Promise<void> => {
    initializeFirebase();
    if (!isFirebaseInitialized || !db) return;
    const gameDocRef = doc(db, 'games', gameId);
    // Sanitize the data before sending it to Firebase
    const { actionHistory, ...restOfState } = deepClone(gameState);
    await setDoc(gameDocRef, restOfState, { merge: true });
};


/**
 * Gets a single snapshot of a game
 * @param gameId The ID of the game to fetch.
 * @returns The GameState or null if not found.
 */
export const getGame = async (gameId: string): Promise<GameState | null> => {
    initializeFirebase();
    if (!isFirebaseInitialized || !db) return null;
    const gameDocRef = doc(db, 'games', gameId);
    const docSnap = await getDoc(gameDocRef);
    if (docSnap.exists()) {
        return docSnap.data() as GameState;
    } else {
        console.error("No such game document!");
        return null;
    }
};


/**
 * Listens for real-time updates to a game document.
 * @param gameId The ID of the game to listen to.
 * @param onUpdate A callback function that will be invoked with the new game state whenever it changes.
 * @returns An unsubscribe function to stop listening for updates.
 */
export const getGameStream = (gameId: string, onUpdate: (gameState: GameState) => void): Unsubscribe => {
    initializeFirebase();
    if (!isFirebaseInitialized || !db) {
        console.error("Firebase not initialized, cannot create game stream.");
        return () => {}; // Return a no-op unsubscribe function
    }
    const gameDocRef = doc(db, 'games', gameId);
    const unsubscribe = onSnapshot(gameDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data() as DocumentData;
            // The action history is not saved, so we initialize it here for the client
            const gameState: GameState = { ...data as GameState, actionHistory: [] };
            onUpdate(gameState);
        } else {
            console.error("Game document disappeared or does not exist.");
            // Handle this case appropriately, e.g., by navigating the user away
        }
    }, (error) => {
        console.error("Error in game stream listener: ", error);
    });
    return unsubscribe;
};

/**
 * Allows a new player to join a game lobby if there is space.
 * @param gameId The ID of the game to join.
 * @returns The player ID assigned to the new player, or null if the lobby is full.
 */
export const joinGame = async (gameId: string): Promise<number | null> => {
    initializeFirebase();
    if (!isFirebaseInitialized || !db) throw new Error("Firebase not configured.");
    const gameDocRef = doc(db, 'games', gameId);
    
    try {
        const docSnap = await getDoc(gameDocRef);
        if (!docSnap.exists()) throw new Error("Game not found.");
        
        const gameState = docSnap.data() as GameState;
        const firstEmptySlot = gameState.players.find(p => !p.isOnline);
        
        if (firstEmptySlot) {
            const playerId = firstEmptySlot.id;
            await updateDoc(gameDocRef, {
                [`players.${playerId}.isOnline`]: true,
            });
            return playerId;
        } else {
            return null; // Lobby is full
        }
    } catch (error) {
        console.error("Error joining game: ", error);
        throw error;
    }
};

/**
 * Updates a player's name in the lobby.
 * @param gameId The ID of the game.
 * @param playerId The ID of the player to update.
 * @param name The new name for the player.
 */
export const updatePlayerName = async (gameId: string, playerId: number, name: string): Promise<void> => {
    initializeFirebase();
    if (!isFirebaseInitialized || !db) return;
    const gameDocRef = doc(db, 'games', gameId);
    await updateDoc(gameDocRef, {
        [`players.${playerId}.name`]: name,
    });
};

/**
 * Sets a player's online status.
 * @param gameId The ID of the game.
 * @param playerId The ID of the player.
 * @param isOnline The online status.
 */
export const setPlayerOnlineStatus = async (gameId: string, playerId: number, isOnline: boolean): Promise<void> => {
    initializeFirebase();
    if (!isFirebaseInitialized || !db) return;
    const gameDocRef = doc(db, 'games', gameId);
    try {
        await updateDoc(gameDocRef, {
            [`players.${playerId}.isOnline`]: isOnline,
        });
    } catch (error) {
        // This can fail if the document doesn't exist yet, which is fine on cleanup.
        console.log(`Could not set online status for player ${playerId} in game ${gameId}. This might be expected on page unload.`);
    }
};
