import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, documentId, limit } from 'firebase/firestore';
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

// Module-level caches to persist across hook re-renders
const restaurantImageCache = new Map<string, string>();
let cachedActiveDiscounts: any[] | null = null;
const locationBranchCache = new Map<string, Set<string>>();

export function useDiscounts(pais?: string, region?: string, limitCount?: number) {
  const [discounts, setDiscounts] = useState<DiscountCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const hookStart = Date.now();
      console.log(`[useDiscounts] Start fetching. Filters -> country: "${pais || ''}", region: "${region || ''}", limit: ${limitCount || 'none'}`);
      try {
        setLoading(true);

        // 1. Get active discounts (from cache if available)
        const dStart = Date.now();
        let discountsDocs = cachedActiveDiscounts;
        if (!discountsDocs) {
          const q = query(collection(db, 'discounts'), where('activo', '==', true));
          const snap = await getDocs(q);
          discountsDocs = snap.docs;
          cachedActiveDiscounts = discountsDocs;
        }
        const dEnd = Date.now();
        console.log(`[useDiscounts] Step 1: Active discounts loaded. Count: ${discountsDocs.length}. Time: ${dEnd - dStart}ms`);

        // 1.1 Fetch restaurant images in chunks of 30 if cache is empty
        if (discountsDocs && restaurantImageCache.size === 0) {
          const batchStart = Date.now();
          const uniqueRestaurantIds = new Set<string>();
          discountsDocs.forEach(d => {
            const rid = d.data().restaurant_id;
            if (rid && !restaurantImageCache.has(rid)) {
              uniqueRestaurantIds.add(rid);
            }
          });

          const ridList = Array.from(uniqueRestaurantIds);
          if (ridList.length > 0) {
            console.log(`[useDiscounts] Step 1.1: Fetching images for ${ridList.length} unique restaurants in batches...`);
            const chunks: string[][] = [];
            for (let i = 0; i < ridList.length; i += 30) {
              chunks.push(ridList.slice(i, i + 30));
            }

            await Promise.all(
              chunks.map(async (chunk) => {
                try {
                  const qRest = query(
                    collection(db, 'restaurants'),
                    where(documentId(), 'in', chunk)
                  );
                  const restSnap = await getDocs(qRest);
                  restSnap.forEach(rDoc => {
                    const imgUrl = rDoc.data()?.url_imagen || '';
                    restaurantImageCache.set(rDoc.id, imgUrl);
                  });
                } catch (err) {
                  console.error('Error fetching batch of restaurant details:', err);
                }
              })
            );
          }
          console.log(`[useDiscounts] Step 1.2: Restaurant batch fetch completed in ${Date.now() - batchStart}ms`);
        }

        // 2. Get valid restaurant IDs for the location filter (from cache if available)
        const bStart = Date.now();
        let validRestaurantIds = new Set<string>();
        let fetchedBranchesFromNet = false;
        if (region) {
          const cacheKey = region;
          if (locationBranchCache.has(cacheKey)) {
            validRestaurantIds = locationBranchCache.get(cacheKey)!;
          } else {
            fetchedBranchesFromNet = true;
            let branchQ = query(
              collection(db, 'branches'),
              where('region', '==', region)
            );
            
            // Limit the branches fetched to optimize speed when limitCount is provided
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
        console.log(`[useDiscounts] Step 2: Branches filter resolved. Valid restaurant IDs count: ${validRestaurantIds.size}. Net read: ${fetchedBranchesFromNet}. Time: ${Date.now() - bStart}ms`);

        if (!active) return;

        // 3. Deduplicate by restaurant_id and filter by location
        const filterStart = Date.now();
        const seen = new Set<string>();
        let uniqueDocs = discountsDocs.filter((d) => {
          const rid = d.data().restaurant_id;
          if (!rid || seen.has(rid)) return false;
          if (region && !validRestaurantIds.has(rid)) return false;
          seen.add(rid);
          return true;
        });

        // Limit the results count if limitCount is specified (e.g. for HomeScreen)
        if (limitCount) {
          uniqueDocs = uniqueDocs.slice(0, limitCount);
        }

        // 4. Map to DiscountCard structure (instantly from cache!)
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
        console.log(`[useDiscounts] Step 3 & 4: Deduplication and mapping completed. Final displayed cards count: ${results.length}. Time: ${Date.now() - filterStart}ms`);

        if (active) {
          setDiscounts(results);
        }
      } catch (error) {
        console.error('[useDiscounts] Error:', error);
      } finally {
        if (active) {
          setLoading(false);
          console.log(`[useDiscounts] Completed in ${Date.now() - hookStart}ms`);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [pais, region, limitCount]);

  return { discounts, loading };
}
