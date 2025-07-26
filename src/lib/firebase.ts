
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
let db: Database;

if (typeof window !== 'undefined') {
    if (!getApps().length) {
        if (
            !firebaseConfig.projectId ||
            !firebaseConfig.apiKey
        ) {
            console.error("Firebase config is not set up correctly. Please check your .env file");
        } else {
            app = initializeApp(firebaseConfig);
            db = getDatabase(app);
        }
    } else {
        app = getApp();
        db = getDatabase(app);
    }
}

export { db };
