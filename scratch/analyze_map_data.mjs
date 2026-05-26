import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

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
  console.log("Testing range query on latitude...");
  try {
    const q = query(
      collection(db, 'branches'),
      where('ubicacion.latitude', '>=', -33.5),
      where('ubicacion.latitude', '<=', -33.4)
    );
    const snap = await getDocs(q);
    console.log("Query success! Documents found:", snap.size);
    if (snap.size > 0) {
      console.log("Sample document location:", snap.docs[0].data().ubicacion);
    }
  } catch (err) {
    console.error("Query failed:", err);
  }
  process.exit(0);
}

run().catch(console.error);
