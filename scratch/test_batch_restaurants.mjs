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
    console.log("Fetching unique restaurant IDs from discounts...");
    const discSnap = await getDocs(query(collection(db, 'discounts'), where('activo', '==', true)));
    const restaurantIds = new Set();
    discSnap.forEach(d => {
      const rid = d.data().restaurant_id;
      if (rid) restaurantIds.add(rid);
    });
    const restaurantIdList = Array.from(restaurantIds);
    console.log(`Found ${restaurantIdList.length} unique restaurant IDs.`);

    // 1. Measure sequential/parallel getDoc (first 50 only, to avoid rate limits)
    console.log("\nMethod 1: Fetching 50 restaurants using individual getDoc in parallel...");
    const start1 = Date.now();
    const promises = restaurantIdList.slice(0, 50).map(async (rid) => {
      // simulate what we do in hook
      const snap = await getDocs(query(collection(db, 'restaurants'), where('id', '==', rid)));
      return snap.size > 0 ? snap.docs[0].data().url_imagen : '';
    });
    await Promise.all(promises);
    console.log(`Method 1 completed in ${Date.now() - start1}ms`);

    // 2. Measure batch query (all restaurants, using documentId() 'in' operator)
    console.log("\nMethod 2: Fetching ALL restaurants in batches of 30 using 'in' operator...");
    const start2 = Date.now();
    
    // Chunk restaurant IDs into arrays of 30
    const chunks = [];
    for (let i = 0; i < restaurantIdList.length; i += 30) {
      chunks.push(restaurantIdList.slice(i, i + 30));
    }

    const restaurantMap = {};
    const batchPromises = chunks.map(async (chunk) => {
      // We use 'in' on document ID (since the document name/ID is the restaurant ID)
      const q = query(collection(db, 'restaurants'), where(documentId(), 'in', chunk));
      const snap = await getDocs(q);
      snap.forEach(d => {
        restaurantMap[d.id] = d.data().url_imagen || '';
      });
    });

    await Promise.all(batchPromises);
    console.log(`Method 2 completed in ${Date.now() - start2}ms`);
    console.log(`Fetched ${Object.keys(restaurantMap).length} restaurant images.`);

  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

run();
