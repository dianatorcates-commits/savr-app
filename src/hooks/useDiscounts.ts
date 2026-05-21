import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';

export interface DiscountCard {
  id: string;
  urlImagen: string;
  beneficio: string;
  banco: string;
  restaurante: string;
  restaurantId: string;
  dias_validos: string[];
}

export function useDiscounts() {
  const [discounts, setDiscounts] = useState<DiscountCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, 'discounts'), where('activo', '==', true));
        const snap = await getDocs(q);

        // Deduplicate by restaurant_id to show one card per restaurant
        const seen = new Set<string>();
        const unique = snap.docs.filter((d) => {
          const rid = d.data().restaurant_id;
          if (!rid || seen.has(rid)) return false;
          seen.add(rid);
          return true;
        });

        const results = await Promise.all(
          unique.map(async (d) => {
            const data = d.data();
            let urlImagen = '';
            if (data.restaurant_id) {
              const rDoc = await getDoc(doc(db, 'restaurants', data.restaurant_id));
              if (rDoc.exists()) urlImagen = rDoc.data()?.url_imagen || '';
            }
            return {
              id: d.id,
              urlImagen,
              beneficio: data.beneficio_porcentaje ? `${data.beneficio_porcentaje}%` : '',
              banco: data.bank_nombre || '',
              restaurantId: data.restaurant_id || '',
              restaurante: data.restaurant_nombre || '',
              dias_validos: data.dias_validos || [],
            };
          })
        );
        setDiscounts(results);
      } catch (error) {
        console.error('Error fetching discounts:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { discounts, loading };
}
