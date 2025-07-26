import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';

let app: FirebaseApp;
let db: Database;

const initializeFirebase = () => {
    if (typeof window !== 'undefined') {
        const firebaseConfig = {
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
        };

        if (!firebaseConfig.projectId || !firebaseConfig.apiKey || !firebaseConfig.databaseURL) {
            throw new Error("Firebase config is not set up correctly. Please check your .env file and ensure all NEXT_PUBLIC_FIREBASE_ variables are set.");
        }

        if (!getApps().length) {
            app = initializeApp(firebaseConfig);
        } else {
            app = getApp();
        }
        db = getDatabase(app);
    }
};

export { initializeFirebase, db };
