import { initializeApp } from "firebase/app";
import { initializeFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "jatalaproperties.vercel.app", // 🛡️ CRITICAL SECURITY FIX: Domain must match Vercel production URL
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.replace('gs://', '').replace(/\/$/, ''),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);

// 🛡️ STRICT CONNECTIVITY FIX: Force Long Polling to bypass ISP QUIC/Websocket blocks
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});

// 💾 Enable Offline Persistence for zero-latency loading from cache
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn("Firestore Persistence Failed: Multiple tabs open.");
  } else if (err.code === 'unimplemented') {
    console.warn("Firestore Persistence Not Supported by Browser.");
  }
});

export const storage = getStorage(app);
export const auth = getAuth(app);

// Enable security rules compliance by signing in anonymously
signInAnonymously(auth).catch(err => console.error("Firebase Auth Error:", err));

export const APP_VERSION = '1.3.0'; 
export const getDataPath = (collectionName) => collectionName;
