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
    const countryMap = {};
    cSnap.forEach(d => {
      countryMap[d.id] = d.data().pais;
    });
    console.log("Countries mapping:", countryMap);

    const rSnap = await getDocs(collection(db, 'regions'));
    console.log("Regions data:");
    rSnap.forEach(d => {
      const data = d.data();
      console.log(`Region ID: ${d.id}, region: ${data.region}, pais_id: ${data.pais_id} (${countryMap[data.pais_id] || 'Unknown'})`);
    });
  } catch (error) {
    console.error("Firestore error:", error);
  }
  process.exit(0);
}

run();
