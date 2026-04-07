import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { initializeFirestore, memoryLocalCache, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

const isFirebaseConfigured = Boolean(firebaseConfig.apiKey);

let app: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

if (isFirebaseConfigured) {
  app = getApps().length === 0
    ? initializeApp(firebaseConfig as Record<string, string>)
    : getApps()[0]!;
  // memoryLocalCache: avoids stale security rule decisions cached in IndexedDB
  // (GanttApp lesson — persistent cache retains stale permission_denied state)
  dbInstance = initializeFirestore(app, { localCache: memoryLocalCache() });
  authInstance = getAuth(app);
}

export const db = dbInstance;
export const auth = authInstance;
export const isFirebaseAvailable = isFirebaseConfigured && app !== null;
