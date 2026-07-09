import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import type { Analytics } from 'firebase/analytics';
import { readEnv } from './env';

// Config de Firebase leida desde variables de entorno (nunca hardcodeada).
// Vite (desktop): VITE_FIREBASE_*  |  Expo (mobile): EXPO_PUBLIC_FIREBASE_*
const firebaseConfig = {
  apiKey: readEnv('VITE_FIREBASE_API_KEY', 'EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN', 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: readEnv('VITE_FIREBASE_PROJECT_ID', 'EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET', 'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', 'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: readEnv('VITE_FIREBASE_APP_ID', 'EXPO_PUBLIC_FIREBASE_APP_ID'),
  measurementId: readEnv('VITE_FIREBASE_MEASUREMENT_ID', 'EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID')
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let analytics: Analytics | null = null;
const isBrowserRuntime = typeof window !== 'undefined' && typeof document !== 'undefined';

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  // Analytics solo funciona en navegador web.
  if (isBrowserRuntime) {
    try {
      const { getAnalytics } = require('firebase/analytics') as typeof import('firebase/analytics');
      analytics = getAnalytics(app);
    } catch (error) {
      console.warn('Firebase Analytics no disponible en este entorno:', error);
      analytics = null;
    }
  }
} else {
  app = getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export { app, auth, db, storage, analytics };
export { firebaseConfig };
