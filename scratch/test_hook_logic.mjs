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
  try {
    const pais = "";
    const region = "";
    const limitCount = 20;

    console.log("Fetching discounts...");
    const q = query(collection(db, 'discounts'), where('activo', '==', true));
    const snap = await getDocs(q);
    const discountsDocs = snap.docs;
    console.log(`Step 1: Loaded ${discountsDocs.length} discounts.`);

    let validRestaurantIds = new Set();
    if (pais || region) {
      console.log("Checking branches...");
      // ...
    } else {
      console.log("Step 2: Skipped branches because pais/region are empty.");
    }

    const seen = new Set();
    let uniqueDocs = discountsDocs.filter((d) => {
      const rid = d.data().restaurant_id;
      if (!rid || seen.has(rid)) return false;
      if ((pais || region) && !validRestaurantIds.has(rid)) return false;
      seen.add(rid);
      return true;
    });
    console.log(`Step 3: Unique discounts count before limit: ${uniqueDocs.length}`);

    if (limitCount) {
      uniqueDocs = uniqueDocs.slice(0, limitCount);
    }
    console.log(`Step 4: Unique discounts count after limit: ${uniqueDocs.length}`);
  } catch (error) {
    console.error(error);
  }
  process.exit(0);
}

run();
