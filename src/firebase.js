import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBzr51Vt9rRGV3OnRLZzTvbqN0oZz4BkGc",
  authDomain: "arte-encino-2026.firebaseapp.com",
  projectId: "arte-encino-2026",
  storageBucket: "arte-encino-2026.firebasestorage.app",
  messagingSenderId: "24011347",
  appId: "1:24011347:web:a956265647cee84d3fdca6",
  measurementId: "G-YBHVY1V6EK"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
