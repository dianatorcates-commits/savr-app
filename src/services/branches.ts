import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

export interface Branch {
  id: string;
  restaurant_id?: string;
  restaurant_nombre?: string;
  direccion?: string;
  comuna?: string;
  ubicacion?: {
    latitude: number;
    longitude: number;
  };
  discountText?: string;
  categoria?: string;
  rating?: number;
  total_reviews?: number;
}

/**
 * Fetch all branches from the Firestore 'branches' collection
 */
export async function getBranches(): Promise<Branch[]> {
  try {
    const branchesCol = collection(db, 'branches');
    const branchSnapshot = await getDocs(branchesCol);
    
    return branchSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      } as Branch;
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    return [];
  }
}

/**
 * Fetch branches for a specific restaurant ID
 */
export async function getBranchesByRestaurant(restaurantId: string): Promise<Branch[]> {
  try {
    const branchesCol = collection(db, 'branches');
    const q = query(branchesCol, where('restaurant_id', '==', restaurantId));
    const branchSnapshot = await getDocs(q);
    
    return branchSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      } as Branch;
    });
  } catch (error) {
    console.error('Error fetching branches by restaurant:', error);
    return [];
  }
}
