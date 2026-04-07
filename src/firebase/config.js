// Firebase Configuration & Initialization
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyApIMVMowIc87ETwr8Wp8HuTQgMZQB1TXM",
  authDomain: "choosukkum.firebaseapp.com",
  projectId: "choosukkum",
  storageBucket: "choosukkum.firebasestorage.app",
  messagingSenderId: "1055918152879",
  appId: "1:1055918152879:web:119546c74c9d2bba67485a",
  measurementId: "G-70QRPFL1HY"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Analytics (optional, only in production)
try { getAnalytics(app); } catch (e) { /* dev mode */ }

export default app;
