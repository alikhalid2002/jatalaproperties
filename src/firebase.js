import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  getFirestore
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "jatalaproperties.vercel.app", 
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.replace('gs://', '').replace(/\/$/, ''),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// 🛡️ FIREBASE SAFETY: Ensure single initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    }),
    experimentalAutoDetectLongPolling: true,
  });
} catch (e) {
  db = getFirestore(app);
}

export const storage = getStorage(app);
export const auth = getAuth(app);

// Enable security rules compliance by signing in anonymously
signInAnonymously(auth).catch(err => console.error("Firebase Auth Error:", err));

export const APP_VERSION = '1.3.0'; 
export const getDataPath = (collectionName) => collectionName;
