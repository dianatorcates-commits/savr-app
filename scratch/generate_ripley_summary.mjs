import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import * as fs from 'fs';

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

const DAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

function normalizeDay(day) {
  return day.toLowerCase()
    .trim()
    .replace('á', 'a')
    .replace('é', 'e')
    .replace('í', 'i')
    .replace('ó', 'o')
    .replace('ú', 'u');
}

async function run() {
  try {
    console.log("Conectando a Firestore...");
    
    // 1. Obtener descuentos activos
    const discountsSnap = await getDocs(query(collection(db, 'discounts'), where('activo', '==', true)));
    
    // Filtrar descuentos de Banco Ripley
    const ripleyDiscountsMap = new Map();
    discountsSnap.forEach(doc => {
      const data = doc.data();
      const bankName = data.bank_nombre || '';
      if (bankName.toLowerCase().includes('ripley')) {
        ripleyDiscountsMap.set(data.restaurant_id, {
          id: doc.id,
          restaurant_id: data.restaurant_id,
          restaurant_nombre: data.restaurant_nombre,
          beneficio: data.beneficio_porcentaje ? `${data.beneficio_porcentaje}%` : '',
          descripcion: data.descripcion_descuento || '',
          aplica_todos_los_dias: data.aplica_todos_los_dias ?? false,
          dias_validos: data.dias_validos || [],
          banco: bankName
        });
      }
    });

    if (ripleyDiscountsMap.size === 0) {
      console.log("No se encontraron descuentos para Banco Ripley.");
      process.exit(0);
    }

    // 2. Obtener todas las sucursales (branches)
    const branchesSnap = await getDocs(collection(db, 'branches'));

    // Agrupar sucursales por día
    const groupedByDay = {
      'lunes': [],
      'martes': [],
      'miércoles': [],
      'jueves': [],
      'viernes': [],
      'sábado': [],
      'domingo': []
    };

    branchesSnap.forEach(doc => {
      const branch = doc.data();
      const rid = branch.restaurant_id;

      if (ripleyDiscountsMap.has(rid)) {
        const discount = ripleyDiscountsMap.get(rid);
        
        const branchInfo = {
          id: doc.id,
          restaurant_nombre: branch.restaurant_nombre || discount.restaurant_nombre,
          nombre_sucursal: branch.nombre_sucursal || branch.restaurant_nombre || discount.restaurant_nombre,
          direccion: branch.direccion || 'Sin dirección',
          comuna: branch.comuna || '',
          beneficio: discount.beneficio,
          descripcion: discount.descripcion,
          aplica_todos_los_dias: discount.aplica_todos_los_dias,
          dias_validos: discount.dias_validos
        };

        DAYS.forEach(day => {
          const normDay = normalizeDay(day);
          let isActiveOnDay = false;

          if (discount.aplica_todos_los_dias) {
            isActiveOnDay = true;
          } else {
            isActiveOnDay = discount.dias_validos.some(dv => normalizeDay(dv) === normDay);
          }

          if (isActiveOnDay) {
            groupedByDay[day].push(branchInfo);
          }
        });
      }
    });

    // Crear agregación por restaurante para cada día
    const summary = {};
    DAYS.forEach(day => {
      const restaurantsMap = {};
      groupedByDay[day].forEach(b => {
        if (!restaurantsMap[b.restaurant_nombre]) {
          restaurantsMap[b.restaurant_nombre] = {
            restaurant: b.restaurant_nombre,
            beneficio: b.beneficio,
            descripcion: b.descripcion,
            dias_validos: b.aplica_todos_los_dias ? 'Todos los días' : b.dias_validos.join(', '),
            sucursales: []
          };
        }
        restaurantsMap[b.restaurant_nombre].sucursales.push({
          nombre: b.nombre_sucursal,
          direccion: b.direccion,
          comuna: b.comuna
        });
      });
      summary[day] = Object.values(restaurantsMap).sort((a, b) => b.sucursales.length - a.sucursales.length);
    });

    // Escribir a un archivo JSON para poder consumirlo
    fs.writeFileSync('scratch/ripley_summary_data.json', JSON.stringify(summary, null, 2), 'utf-8');
    console.log("Archivo scratch/ripley_summary_data.json escrito con éxito.");

    // Imprimir en consola el resumen de cantidad de sucursales por restaurante por día
    console.log("\n=================== RESUMEN POR DÍA Y MARCA ===================");
    DAYS.forEach(day => {
      console.log(`\n📅 ${day.toUpperCase()} (${groupedByDay[day].length} sucursales en total)`);
      summary[day].forEach(r => {
        console.log(`  - ${r.restaurant}: ${r.sucursales.length} sucursales (${r.beneficio} dto - ${r.dias_validos})`);
      });
    });

  } catch (error) {
    console.error("Error al ejecutar:", error);
  }
  process.exit(0);
}

run();
