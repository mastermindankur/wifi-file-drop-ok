import { initializeApp, getApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

// Defer initialization to be called on the client.
let app: any;
let db: any;

const initializeFirebase = () => {
    if (typeof window !== 'undefined') {
        if (!getApps().length) {
            if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
                console.error("Firebase config is not set up correctly. Please check your .env.local file");
                return;
            }
            app = initializeApp(firebaseConfig);
            db = getDatabase(app);
        } else {
            app = getApp();
            db = getDatabase(app);
        }
    }
};


export { app, db, initializeFirebase };
