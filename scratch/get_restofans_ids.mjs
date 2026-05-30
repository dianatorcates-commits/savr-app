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
    const branchesSnap = await getDocs(collection(db, 'branches'));
    const restofansBranches = [];

    branchesSnap.forEach(doc => {
      const data = doc.data();
      const restaurantNombre = data.restaurant_nombre || '';
      if (restaurantNombre.toLowerCase() === 'restofans') {
        restofansBranches.push({
          id: doc.id,
          nombre_sucursal: data.nombre_sucursal || data.restaurant_nombre,
          direccion: data.direccion || 'Sin dirección',
          comuna: data.comuna || ''
        });
      }
    });

    console.log(JSON.stringify(restofansBranches, null, 2));
  } catch (error) {
    console.error(error);
  }
  process.exit(0);
}

run();
