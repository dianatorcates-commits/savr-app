import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, documentId } from 'firebase/firestore';

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
    console.log("1. Fetching active discounts...");
    const discStart = Date.now();
    const qDiscounts = query(collection(db, 'discounts'), where('activo', '==', true));
    const discSnap = await getDocs(qDiscounts);
    console.log(`Fetched ${discSnap.size} active discounts in ${Date.now() - discStart}ms`);

    // Get unique restaurant IDs
    const restaurantIds = new Set();
    discSnap.forEach(d => {
      const rid = d.data().restaurant_id;
      if (rid) restaurantIds.add(rid);
    });
    const restaurantIdList = Array.from(restaurantIds);
    console.log("Unique restaurant IDs:", restaurantIdList.length, restaurantIdList);

    // 2. Fetch branches for Región Metropolitana the old way (filtering on client)
    console.log("\n2. Fetching branches the OLD way (all branches in Región Metropolitana)...");
    const oldStart = Date.now();
    const qOld = query(collection(db, 'branches'), where('region', '==', 'Región Metropolitana'));
    const oldSnap = await getDocs(qOld);
    const oldValidRestaurantIds = new Set();
    oldSnap.forEach(b => {
      const rid = b.data().restaurant_id;
      if (rid && restaurantIds.has(rid)) {
        oldValidRestaurantIds.add(rid);
      }
    });
    console.log(`Old way: Fetched ${oldSnap.size} branch documents in ${Date.now() - oldStart}ms`);
    console.log("Old way valid restaurant count:", oldValidRestaurantIds.size);

    // 3. Fetch branches the NEW way (filtering in query using 'in')
    console.log("\n3. Fetching branches the NEW way (using 'in' operator)...");
    const newStart = Date.now();
    // Firestore 'in' query allows up to 30 items
    const restaurantIdChunks = [];
    for (let i = 0; i < restaurantIdList.length; i += 30) {
      restaurantIdChunks.push(restaurantIdList.slice(i, i + 30));
    }

    const newValidRestaurantIds = new Set();
    let totalBranchesFetched = 0;

    for (const chunk of restaurantIdChunks) {
      const qNew = query(
        collection(db, 'branches'),
        where('region', '==', 'Región Metropolitana'),
        where('restaurant_id', 'in', chunk)
      );
      const newSnap = await getDocs(qNew);
      totalBranchesFetched += newSnap.size;
      newSnap.forEach(b => {
        const rid = b.data().restaurant_id;
        if (rid) newValidRestaurantIds.add(rid);
      });
    }

    console.log(`New way: Fetched ${totalBranchesFetched} branch documents in ${Date.now() - newStart}ms`);
    console.log("New way valid restaurant count:", newValidRestaurantIds.size);

  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

run();
