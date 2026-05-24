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

export function useDiscounts(pais?: string, region?: string) {
  const [discounts, setDiscounts] = useState<DiscountCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, 'discounts'), where('activo', '==', true));
        const snap = await getDocs(q);

        let validRestaurantIds = new Set<string>();
        if (pais || region) {
          let branchQ = query(collection(db, 'branches'));
          if (pais) branchQ = query(branchQ, where('pais', '==', pais));
          if (region) branchQ = query(branchQ, where('region', '==', region));
          const branchSnap = await getDocs(branchQ);
          branchSnap.forEach(b => {
             const data = b.data();
             if (data.restaurant_id) validRestaurantIds.add(data.restaurant_id);
          });
        }

        // Deduplicate by restaurant_id to show one card per restaurant
        const seen = new Set<string>();
        const unique = snap.docs.filter((d) => {
          const rid = d.data().restaurant_id;
          if (!rid || seen.has(rid)) return false;
          if ((pais || region) && !validRestaurantIds.has(rid)) return false;
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
  }, [pais, region]);

  return { discounts, loading };
}
