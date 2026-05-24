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
    const q = query(collection(db, 'discounts'), where('activo', '==', true));
    const snap = await getDocs(q);
    const discountsDocs = snap.docs;

    const seen = new Set();
    const uniqueDocs = discountsDocs.filter((d) => {
      const rid = d.data().restaurant_id;
      if (!rid || seen.has(rid)) return false;
      seen.add(rid);
      return true;
    });

    const first20 = uniqueDocs.slice(0, 20);
    console.log("First 20 unique active discounts:");
    first20.forEach((d, index) => {
      const data = d.data();
      console.log(`${index + 1}: ${data.restaurant_nombre} - dias_validos:`, data.dias_validos);
    });

    // Check which days are valid for these 20
    const dayCounts = {};
    first20.forEach(d => {
      const dias = d.data().dias_validos || [];
      dias.forEach(day => {
        const cleanDay = day.toLowerCase().replace('é', 'e').replace('á', 'a');
        dayCounts[cleanDay] = (dayCounts[cleanDay] || 0) + 1;
      });
      if (dias.length === 0 || d.data().aplica_todos_los_dias) {
        dayCounts['todos'] = (dayCounts['todos'] || 0) + 1;
      }
    });
    console.log("\nDays distribution in first 20:", dayCounts);

  } catch (error) {
    console.error(error);
  }
  process.exit(0);
}

run();
