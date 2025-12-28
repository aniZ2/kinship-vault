// src/lib/firebase/client.ts
import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth as firebaseGetAuth, Auth } from "firebase/auth";
import { getFirestore as firebaseGetFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Only initialize on client side
const isClient = typeof window !== "undefined";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isClient) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = firebaseGetAuth(app);
    db = firebaseGetFirestore(app);
  } catch (error) {
    console.error("Firebase initialization error:", error);
  }
}

export { app, auth, db };
