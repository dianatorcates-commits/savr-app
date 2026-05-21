import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDB6T7i81pqFX2LfukGqK6ZxdQ0yZikwNM",
  authDomain: "savr-f5076.firebaseapp.com",
  projectId: "savr-f5076",
  storageBucket: "savr-f5076.firebasestorage.app",
  messagingSenderId: "301787533350",
  appId: "1:301787533350:web:f47226204345196e6c96e7",
  measurementId: "G-YHY287D6CH"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);