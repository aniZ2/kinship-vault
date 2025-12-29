// src/lib/firebase/admin.ts
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App | undefined;
let adminAuth: Auth;
let adminDb: Firestore;

/**
 * Initialize Firebase Admin SDK
 *
 * Uses service account credentials from environment variables.
 * Required env vars:
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_CLIENT_EMAIL
 * - FIREBASE_PRIVATE_KEY (base64 encoded or raw with escaped newlines)
 */
function getFirebaseAdmin() {
  if (app) {
    return { adminAuth, adminDb };
  }

  if (getApps().length > 0) {
    app = getApps()[0];
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    // Skip initialization during build if env vars are missing
    if (!projectId || !clientEmail || !privateKey) {
      console.warn('Firebase Admin SDK not initialized: missing environment variables');
      // Return mock objects that will throw at runtime if used
      return {
        adminAuth: new Proxy({} as Auth, {
          get() {
            throw new Error('Firebase Admin not initialized: missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY');
          },
        }),
        adminDb: new Proxy({} as Firestore, {
          get() {
            throw new Error('Firebase Admin not initialized: missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY');
          },
        }),
      };
    }

    // Parse private key - handle both base64 and escaped formats
    if (!privateKey.includes('-----BEGIN')) {
      try {
        privateKey = Buffer.from(privateKey, 'base64').toString('utf-8');
      } catch {
        // Not base64, try to unescape newlines
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
    } else {
      // Already in PEM format, just unescape any escaped newlines
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  adminAuth = getAuth(app);
  adminDb = getFirestore(app);

  return { adminAuth, adminDb };
}

// Lazy initialization - export getters
const adminExports = getFirebaseAdmin();
const adminAuth_ = adminExports.adminAuth;
const adminDb_ = adminExports.adminDb;

export { adminAuth_ as adminAuth, adminDb_ as adminDb };
