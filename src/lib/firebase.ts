import { initializeApp, getApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Defer initialization to be called on the client.
let app: any;
let db: any;

const initializeFirebase = () => {
    if (typeof window !== 'undefined') {
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

        if (!getApps().length) {
            if (!firebaseConfig.projectId || !firebaseConfig.apiKey || !firebaseConfig.databaseURL) {
                throw new Error("Firebase config is not set up correctly. Please make sure all NEXT_PUBLIC_FIREBASE_ environment variables are set in your .env file.");
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
