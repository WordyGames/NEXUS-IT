import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import type { Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyBWOjYAajcHeWZ44fkNNngLoRP-Up8EhJg",
  authDomain: "nexus-it-e8568.firebaseapp.com",
  projectId: "nexus-it-e8568",
  storageBucket: "nexus-it-e8568.firebasestorage.app",
  messagingSenderId: "915769148490",
  appId: "1:915769148490:web:e72918686ca03c9256d2b3",
  measurementId: "G-JTWE0302CT"
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
