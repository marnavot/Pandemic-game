// Modular imports for Firebase v9+
import { 
    initializeApp, 
    getApps, 
    getApp, 
    deleteApp,
    type FirebaseApp 
} from "firebase/app";
import { 
    getFirestore, 
    initializeFirestore, 
    memoryLocalCache,
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
// YOUR FIREBASE CONFIGURATION
// ====================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyB3-1Tzh_NPLrQZB5lSYdZNZfL8QOMrfNo",
  authDomain: "pandemic-464616.firebaseapp.com",
  projectId: "pandemic-464616",
  storageBucket: "pandemic-464616.firebasestorage.app",
  messagingSenderId: "351119674329",
  appId: "1:351119674329:web:bc60220f0e0ef82d2a27c8",
  measurementId: "G-HV5NF2RJ09"
};
export const isFirebaseConfigured = !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId);
// ====================================================================================

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
export let isFirebaseInitialized = false;

// Function to initialize Firebase safely
const initializeFirebase = () => {
    try {
        // 1. Aggressively clean up existing apps to prevent "Duplicate App" errors 
        // or stale configurations during hot-reloads.
        // We use a specific name to isolate our app instance.
        const appName = "pandemic-game-instance";
        const existingApp = getApps().find(a => a.name === appName);
        
        if (existingApp) {
            app = existingApp;
            // If the app exists, we try to get the existing Firestore instance.
            // We cannot re-initialize it with different settings if it already exists.
            db = getFirestore(app);
            isFirebaseInitialized = true;
            console.log("Reusing existing Firebase instance.");
        } else {
            // 2. Create a new App instance
            app = initializeApp(firebaseConfig, appName);
            
            // 3. Initialize Firestore with MEMORY CACHE.
            // This is critical to prevent "TYPE=terminate" errors caused by 
            // IndexedDB conflicts or restricted environments.
            db = initializeFirestore(app, {
                localCache: memoryLocalCache(),
                experimentalForceLongPolling: true, // Keep this for stability
            });
            isFirebaseInitialized = true;
            console.log("Firebase initialized with Memory Cache & Long Polling.");
        }
    } catch (e) {
        console.error("Firebase initialization failed:", e);
        // Fallback: Try to get the default app if our named instance failed
        try {
            if (!getApps().length) {
                app = initializeApp(firebaseConfig);
            } else {
                app = getApp();
            }
            db = getFirestore(app);
            isFirebaseInitialized = true;
            console.log("Fallback to default Firebase instance.");
        } catch (e2) {
            console.error("Fatal Firebase Error:", e2);
            isFirebaseInitialized = false;
        }
    }
};

// Run the initialization function immediately
initializeFirebase();

const gamesCollectionRef = () => {
    if (!db) initializeFirebase(); 
    if (!db) throw new Error("Firebase failed to initialize.");
    return collection(db, 'games');
};

/**
 * Creates a new game document in Firestore.
 */
export const createGame = async (initialGameState: GameState): Promise<string> => {
    if (!isFirebaseInitialized) initializeFirebase();
    if (!isFirebaseInitialized) throw new Error("Firebase is not configured.");
    
    try {
        const { actionHistory, ...stateToSave } = deepClone(initialGameState);
        const docRef = await addDoc(gamesCollectionRef(), stateToSave);
        console.log("Game created with ID: ", docRef.id);
        return docRef.id;
    } catch (e) {
        console.error("Error adding document: ", e);
        throw new Error(`Could not create game in Firebase: ${(e as Error).message}`);
    }
};

/**
 * Updates an existing game document in Firestore.
 */
export const updateGame = async (gameId: string, gameState: GameState): Promise<void> => {
    if (!isFirebaseInitialized || !db) return;
    const gameDocRef = doc(db, 'games', gameId);
    const { actionHistory, ...restOfState } = deepClone(gameState);
    await setDoc(gameDocRef, restOfState, { merge: true });
};

/**
 * Gets a single snapshot of a game
 */
export const getGame = async (gameId: string): Promise<GameState | null> => {
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
 */
export const getGameStream = (gameId: string, onUpdate: (gameState: GameState) => void, onError: (error: Error) => void): Unsubscribe => {
    if (!isFirebaseInitialized || !db) {
        if (onError) onError(new Error("Firebase not initialized"));
        return () => {}; 
    }
    const gameDocRef = doc(db, 'games', gameId);
    
    const unsubscribe = onSnapshot(gameDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data() as DocumentData;
            const gameState: GameState = { ...data as GameState, actionHistory: [] };
            onUpdate(gameState);
        } else {
            console.error("Game document disappeared.");
        }
    }, (error) => {
        console.error("Error in game stream listener: ", error);
        if (onError) onError(error); 
    });
    return unsubscribe;
};

/**
 * Allows a new player to join a game lobby if there is space.
 */
export const joinGame = async (gameId: string): Promise<number | null> => {
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

export const updatePlayerName = async (gameId: string, playerId: number, name: string): Promise<void> => {
    if (!isFirebaseInitialized || !db) return;
    const gameDocRef = doc(db, 'games', gameId);
    await updateDoc(gameDocRef, {
        [`players.${playerId}.name`]: name,
    });
};

export const setPlayerOnlineStatus = async (gameId: string, playerId: number, isOnline: boolean): Promise<void> => {
    if (!isFirebaseInitialized || !db) return;
    const gameDocRef = doc(db, 'games', gameId);
    try {
        await updateDoc(gameDocRef, {
            [`players.${playerId}.isOnline`]: isOnline,
        });
    } catch (error) {
        console.log(`Could not set online status for player ${playerId}.`);
    }
};
