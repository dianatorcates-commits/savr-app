import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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
  console.log("Fetching counts...");
  const bSnap = await getDocs(collection(db, 'branches'));
  console.log("Total branches:", bSnap.size);

  const dSnap = await getDocs(collection(db, 'discounts'));
  console.log("Total discounts:", dSnap.size);

  const activeDSnap = await getDocs(collection(db, 'discounts'));
  let activeCount = 0;
  activeDSnap.forEach(d => {
    if (d.data().activo === true) activeCount++;
  });
  console.log("Active discounts:", activeCount);

  // Print a sample branch and discount
  if (bSnap.size > 0) {
    console.log("Sample branch data:", bSnap.docs[0].data());
  }
  if (dSnap.size > 0) {
    console.log("Sample discount data:", dSnap.docs[0].data());
  }

  process.exit(0);
}

run().catch(console.error);
