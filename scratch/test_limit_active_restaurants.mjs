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
    // Get active restaurants first
    const q = query(collection(db, 'discounts'), where('activo', '==', true));
    const snapDiscounts = await getDocs(q);
    const activeRestaurantIds = new Set();
    snapDiscounts.forEach(d => {
      const rid = d.data().restaurant_id;
      if (rid) activeRestaurantIds.add(rid);
    });
    console.log(`Active restaurants count: ${activeRestaurantIds.size}`);

    // Query branches with limit 80
    const branchQ = query(
      collection(db, 'branches'),
      where('pais', '==', 'Chile'),
      limit(80)
    );
    const branchSnap = await getDocs(branchQ);
    const branchRestaurants = new Set();
    const activeBranchRestaurants = new Set();
    branchSnap.forEach(b => {
      const rid = b.data().restaurant_id;
      if (rid) {
        branchRestaurants.add(rid);
        if (activeRestaurantIds.has(rid)) {
          activeBranchRestaurants.add(rid);
        }
      }
    });

    console.log(`Limit 80 branches in Chile:`);
    console.log(`- Total branches fetched: ${branchSnap.size}`);
    console.log(`- Unique restaurants in these branches: ${branchRestaurants.size}`);
    console.log(`- Unique restaurants WITH active discounts: ${activeBranchRestaurants.size}`);
  } catch (error) {
    console.error(error);
  }
  process.exit(0);
}

run();
