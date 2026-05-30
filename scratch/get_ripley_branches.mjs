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
    console.log(`Total descuentos activos obtenidos: ${discountsSnap.size}`);
    
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

    console.log(`Descuentos Banco Ripley activos encontrados: ${ripleyDiscountsMap.size}`);
    if (ripleyDiscountsMap.size === 0) {
      console.log("No se encontraron descuentos para Banco Ripley.");
      process.exit(0);
    }

    // Listar descuentos de Ripley
    console.log("\n--- Descuentos Banco Ripley ---");
    for (const [rid, disc] of ripleyDiscountsMap.entries()) {
      console.log(`- Restaurante: ${disc.restaurant_nombre} (${disc.beneficio} dto, aplica todos los días: ${disc.aplica_todos_los_dias}, días: ${JSON.stringify(disc.dias_validos)})`);
    }

    // 2. Obtener todas las sucursales (branches)
    console.log("\nObteniendo todas las sucursales (branches)...");
    const branchesSnap = await getDocs(collection(db, 'branches'));
    console.log(`Total sucursales obtenidas: ${branchesSnap.size}`);

    // Agrupar por días
    const groupedByDay = {
      'lunes': [],
      'martes': [],
      'miércoles': [],
      'jueves': [],
      'viernes': [],
      'sábado': [],
      'domingo': []
    };

    let totalMatchingBranchesCount = 0;
    const matchedBranchesDetails = [];

    branchesSnap.forEach(doc => {
      const branch = doc.data();
      const branchId = doc.id;
      const rid = branch.restaurant_id;

      if (ripleyDiscountsMap.has(rid)) {
        totalMatchingBranchesCount++;
        const discount = ripleyDiscountsMap.get(rid);
        
        const branchInfo = {
          id: branchId,
          restaurant_nombre: branch.restaurant_nombre || discount.restaurant_nombre,
          nombre_sucursal: branch.nombre_sucursal || branch.restaurant_nombre || discount.restaurant_nombre,
          direccion: branch.direccion || 'Sin dirección',
          ubicacion: branch.ubicacion || null,
          beneficio: discount.beneficio,
          descripcion: discount.descripcion,
          aplica_todos_los_dias: discount.aplica_todos_los_dias,
          dias_validos: discount.dias_validos
        };

        matchedBranchesDetails.push(branchInfo);

        // Clasificar en cada día
        DAYS.forEach(day => {
          const normDay = normalizeDay(day);
          let isActiveOnDay = false;

          if (discount.aplica_todos_los_dias) {
            isActiveOnDay = true;
          } else {
            // Verificar si el día está en los días válidos del descuento
            isActiveOnDay = discount.dias_validos.some(dv => normalizeDay(dv) === normDay);
          }

          if (isActiveOnDay) {
            groupedByDay[day].push(branchInfo);
          }
        });
      }
    });

    console.log(`\nSucursales que coinciden con Banco Ripley en total (sin importar el día): ${totalMatchingBranchesCount}`);
    
    console.log("\n--- RESULTADOS POR DÍA ---");
    DAYS.forEach(day => {
      console.log(`\n========================================`);
      console.log(`📅 ${day.toUpperCase()} (${groupedByDay[day].length} sucursales)`);
      console.log(`========================================`);
      if (groupedByDay[day].length === 0) {
        console.log("  No hay sucursales disponibles para este día.");
      } else {
        groupedByDay[day].forEach((b, idx) => {
          console.log(`  ${idx + 1}. ${b.restaurant_nombre} (${b.nombre_sucursal})`);
          console.log(`     📍 Dirección: ${b.direccion}`);
          console.log(`     🎁 Descuento: ${b.beneficio} - ${b.descripcion}`);
          if (b.ubicacion) {
            console.log(`     🌐 Ubicación: Lat ${b.ubicacion.latitude}, Lon ${b.ubicacion.longitude}`);
          }
          console.log(`     ⏱️ Días válidos: ${b.aplica_todos_los_dias ? 'Todos los días' : b.dias_validos.join(', ')}`);
          console.log(`     ----------------------------------------`);
        });
      }
    });

    // Guardar un JSON con los resultados para referencia o para formatear más tarde si es necesario
    const resultsJson = {
      resumen: {
        total_descuentos_ripley: ripleyDiscountsMap.size,
        total_sucursales_ripley: totalMatchingBranchesCount,
        sucursales_por_dia: DAYS.reduce((acc, d) => {
          acc[d] = groupedByDay[d].length;
          return acc;
        }, {})
      },
      sucursales_por_dia: groupedByDay,
      todas_las_sucursales_ripley: matchedBranchesDetails
    };

    console.log("\nResultados guardados exitosamente.");

  } catch (error) {
    console.error("Error al ejecutar la consulta:", error);
  }
  process.exit(0);
}

run();
