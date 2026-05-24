import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, query, where } from 'firebase/firestore';

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
    console.log("Fetching branches...");
    const bSnap = await getDocs(collection(db, 'branches'));
    const uniqueCountries = new Set();
    const uniqueRegions = new Set();

    bSnap.forEach(d => {
      const data = d.data();
      if (data.pais) {
        const p = data.pais.trim();
        if (p) uniqueCountries.add(p);
      }
      if (data.region) {
        const r = data.region.trim();
        if (r) uniqueRegions.add(r);
      }
    });

    console.log(`Found ${uniqueCountries.size} unique countries and ${uniqueRegions.size} unique regions in branches.`);

    // 1. Seed countries
    console.log("Checking existing countries...");
    const cSnap = await getDocs(collection(db, 'countries'));
    const existingCountries = new Set();
    cSnap.forEach(d => {
      if (d.data().pais) {
        existingCountries.add(d.data().pais.trim());
      }
    });

    for (const country of uniqueCountries) {
      if (!existingCountries.has(country)) {
        console.log(`Adding country: ${country}`);
        await addDoc(collection(db, 'countries'), { pais: country });
      } else {
        console.log(`Country already exists: ${country}`);
      }
    }

    // 2. Seed regions
    console.log("Checking existing regions...");
    const rSnap = await getDocs(collection(db, 'regions'));
    const existingRegions = new Set();
    rSnap.forEach(d => {
      if (d.data().region) {
        existingRegions.add(d.data().region.trim());
      }
    });

    for (const region of uniqueRegions) {
      if (!existingRegions.has(region)) {
        console.log(`Adding region: ${region}`);
        await addDoc(collection(db, 'regions'), { region: region });
      } else {
        console.log(`Region already exists: ${region}`);
      }
    }

    console.log("Seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding locations:", error);
  }
  process.exit(0);
}

run();
