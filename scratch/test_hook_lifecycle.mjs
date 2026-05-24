import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, documentId, limit } from 'firebase/firestore';

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

// Mock caches
const restaurantImageCache = new Map();
let cachedActiveDiscounts = null;
const locationBranchCache = new Map();

async function simulateHook(pais, region, limitCount) {
  const hookStart = Date.now();
  console.log(`\n--- SIMULATING HOOK FETCH: country="${pais}", region="${region}", limit=${limitCount} ---`);
  try {
    // 1. Get active discounts (from cache if available)
    const dStart = Date.now();
    let discountsDocs = cachedActiveDiscounts;
    let fetchedDiscountsFromNet = false;
    if (!discountsDocs) {
      fetchedDiscountsFromNet = true;
      const q = query(collection(db, 'discounts'), where('activo', '==', true));
      const snap = await getDocs(q);
      discountsDocs = snap.docs;
      cachedActiveDiscounts = discountsDocs;
    }
    const dEnd = Date.now();
    console.log(`Step 1: Active discounts loaded. Count: ${discountsDocs.length}. Net read: ${fetchedDiscountsFromNet}. Time: ${dEnd - dStart}ms`);

    if (fetchedDiscountsFromNet && discountsDocs) {
      const batchStart = Date.now();
      const uniqueRestaurantIds = new Set();
      discountsDocs.forEach(d => {
        const rid = d.data().restaurant_id;
        if (rid && !restaurantImageCache.has(rid)) {
          uniqueRestaurantIds.add(rid);
        }
      });

      const ridList = Array.from(uniqueRestaurantIds);
      if (ridList.length > 0) {
        console.log(`Step 1.1: Fetching images for ${ridList.length} unique restaurants...`);
        const chunks = [];
        for (let i = 0; i < ridList.length; i += 30) {
          chunks.push(ridList.slice(i, i + 30));
        }

        await Promise.all(
          chunks.map(async (chunk) => {
            const qRest = query(
              collection(db, 'restaurants'),
              where(documentId(), 'in', chunk)
            );
            const restSnap = await getDocs(qRest);
            restSnap.forEach(rDoc => {
              const imgUrl = rDoc.data()?.url_imagen || '';
              restaurantImageCache.set(rDoc.id, imgUrl);
            });
          })
        );
      }
      console.log(`Step 1.2: Restaurant batch fetch completed in ${Date.now() - batchStart}ms`);
    }

    // 2. Get valid restaurant IDs for the location filter (from cache if available)
    const bStart = Date.now();
    let validRestaurantIds = new Set();
    let fetchedBranchesFromNet = false;
    if (pais || region) {
      const cacheKey = `${pais || ''}|${region || ''}`;
      if (locationBranchCache.has(cacheKey)) {
        validRestaurantIds = locationBranchCache.get(cacheKey);
      } else {
        fetchedBranchesFromNet = true;
        let branchQ = query(collection(db, 'branches'));
        if (pais) branchQ = query(branchQ, where('pais', '==', pais));
        if (region) branchQ = query(branchQ, where('region', '==', region));
        
        if (limitCount) {
          branchQ = query(branchQ, limit(limitCount * 4));
        }
        
        const branchSnap = await getDocs(branchQ);
        branchSnap.forEach(b => {
          const data = b.data();
          if (data.restaurant_id) validRestaurantIds.add(data.restaurant_id);
        });
        locationBranchCache.set(cacheKey, validRestaurantIds);
      }
    }
    console.log(`Step 2: Branches filter resolved. Valid restaurant IDs count: ${validRestaurantIds.size}. Net read: ${fetchedBranchesFromNet}. Time: ${Date.now() - bStart}ms`);

    // 3. Deduplicate by restaurant_id and filter by location
    const filterStart = Date.now();
    const seen = new Set();
    let uniqueDocs = discountsDocs.filter((d) => {
      const rid = d.data().restaurant_id;
      if (!rid || seen.has(rid)) return false;
      if ((pais || region) && !validRestaurantIds.has(rid)) return false;
      seen.add(rid);
      return true;
    });

    if (limitCount) {
      uniqueDocs = uniqueDocs.slice(0, limitCount);
    }

    // 4. Map to DiscountCard structure
    const results = uniqueDocs.map((d) => {
      const data = d.data();
      const rid = data.restaurant_id;
      const urlImagen = (rid && restaurantImageCache.get(rid)) || '';
      return {
        id: d.id,
        urlImagen,
        beneficio: data.beneficio_porcentaje ? `${data.beneficio_porcentaje}%` : '',
        banco: data.bank_nombre || '',
        restaurantId: rid || '',
        restaurante: data.restaurant_nombre || '',
        dias_validos: data.dias_validos || [],
      };
    });
    console.log(`Step 3 & 4: Completed. Final displayed cards count: ${results.length}. Time: ${Date.now() - filterStart}ms`);
  } catch (error) {
    console.error("Error:", error);
  }
}

async function run() {
  // First render: no filters
  await simulateHook("", "", 20);

  // Second render: filter by region
  await simulateHook("", "Región Metropolitana", 20);

  // Third render: clear filters
  await simulateHook("", "", 20);
  
  process.exit(0);
}

run();
