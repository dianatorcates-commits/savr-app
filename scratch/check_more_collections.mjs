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

const collectionsToTry = [
  'countries', 'Countries', 'paises', 'Paises', 'country', 'Country', 'pais', 'Pais',
  'regions', 'Regions', 'regiones', 'Regiones', 'region', 'Region'
];

async function run() {
  for (const name of collectionsToTry) {
    try {
      const snap = await getDocs(collection(db, name));
      console.log(`Collection '${name}' documents count: ${snap.size}`);
      if (snap.size > 0) {
        console.log(`Sample from '${name}':`);
        let count = 0;
        snap.forEach(d => {
          if (count < 2) {
            console.log("  ID:", d.id, "Data:", d.data());
            count++;
          }
        });
      }
    } catch (err) {
      console.log(`Error checking '${name}':`, err.message);
    }
  }
  process.exit(0);
}

run();
