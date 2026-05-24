import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDB6T7i81pqFX2LfukGqK6ZxdQ0yZikwNM",
  authDomain: "savr-f5076.firebaseapp.com",
  projectId: "savr-f5076",
  storageBucket: "savr-f5076.firebasestorage.app",
  messagingSenderId: "301787533350",
  appId: "1:301787533350:web:f47226204345196e6c96e7",
  measurementId: "G-YHY287D6CH"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
    const snap = await getDocs(query(collection(db, 'restaurants'), limit(5)));
    console.log("Sample Restaurants:");
    snap.forEach(d => {
      console.log("ID:", d.id);
      console.log("Data:", JSON.stringify(d.data(), null, 2));
    });
  } catch (error) {
    console.error(error);
  }
  process.exit(0);
}

run();
