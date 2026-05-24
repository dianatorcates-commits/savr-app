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
  try {
    const cSnap = await getDocs(collection(db, 'countries'));
    console.log("Countries count:", cSnap.size);
    cSnap.forEach(d => console.log("Country ID:", d.id, "Data:", d.data()));

    const rSnap = await getDocs(collection(db, 'regions'));
    console.log("Regions count:", rSnap.size);
    rSnap.forEach(d => console.log("Region ID:", d.id, "Data:", d.data()));

    const bSnap = await getDocs(collection(db, 'branches'));
    console.log("Branches count:", bSnap.size);
    let count = 0;
    bSnap.forEach(d => {
      if (count < 5) {
        console.log("Branch ID:", d.id, "Data:", d.data());
        count++;
      }
    });
  } catch (error) {
    console.error("Firestore error:", error);
  }
  process.exit(0);
}

run();
