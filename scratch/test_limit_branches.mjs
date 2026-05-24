import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, limit } from 'firebase/firestore';

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
    for (const lim of [30, 50, 80, 100]) {
      const start = Date.now();
      const q = query(
        collection(db, 'branches'),
        where('region', '==', 'Región Metropolitana'),
        limit(lim)
      );
      const snap = await getDocs(q);
      const uniqueRestaurants = new Set();
      snap.forEach(d => {
        const rid = d.data().restaurant_id;
        if (rid) uniqueRestaurants.add(rid);
      });
      console.log(`Limit ${lim}: Fetched ${snap.size} branches in ${Date.now() - start}ms. Unique restaurants: ${uniqueRestaurants.size}`);
    }
  } catch (error) {
    console.error(error);
  }
  process.exit(0);
}

run();
