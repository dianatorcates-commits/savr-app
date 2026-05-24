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
    const bSnap = await getDocs(collection(db, 'branches'));
    const countries = new Set();
    const regions = new Set();
    bSnap.forEach(d => {
      const data = d.data();
      if (data.pais) countries.add(data.pais);
      if (data.region) regions.add(data.region);
    });
    console.log("Unique countries in branches:", Array.from(countries));
    console.log("Unique regions in branches count:", regions.size);
    console.log("Unique regions in branches:", Array.from(regions));
  } catch (error) {
    console.error("Firestore error:", error);
  }
  process.exit(0);
}

run();
