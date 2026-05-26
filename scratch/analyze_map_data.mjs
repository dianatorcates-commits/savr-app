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
  console.log("Analyzing active discounts for missing restaurant_id...");
  const dSnap = await getDocs(query(collection(db, 'discounts'), where('activo', '==', true)));
  let missingCount = 0;
  let emptyStringCount = 0;
  let validCount = 0;

  dSnap.forEach((doc) => {
    const data = doc.data();
    if (data.restaurant_id === undefined || data.restaurant_id === null) {
      missingCount++;
    } else if (data.restaurant_id === "") {
      emptyStringCount++;
    } else {
      validCount++;
    }
  });

  console.log("Active discounts count:", dSnap.size);
  console.log("Valid restaurant_id:", validCount);
  console.log("Missing restaurant_id (null/undefined):", missingCount);
  console.log("Empty string restaurant_id:", emptyStringCount);

  process.exit(0);
}

run().catch(console.error);
