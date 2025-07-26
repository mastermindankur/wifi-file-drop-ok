import { initializeApp, getApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  projectId: 'wifi-file-drop',
  appId: '1:4561600461:web:1753ac4c9b66ea4b478e84',
  storageBucket: 'wifi-file-drop.firebasestorage.app',
  apiKey: 'AIzaSyB4M6rT1fbXJn0kGbxAr-a7fHvStmte89U',
  authDomain: 'wifi-file-drop.firebaseapp.com',
  measurementId: '',
  messagingSenderId: '4561600461',
  databaseURL: 'https://wifi-file-drop-default-rtdb.firebaseio.com',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getDatabase(app);

export { app, db };
