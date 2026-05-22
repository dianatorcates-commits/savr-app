import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { VisitReview } from '../types/visit';

/**
 * Register a new visit review in Firestore
 */
export async function registerVisit(review: Omit<VisitReview, 'id' | 'createdAt'>): Promise<string> {
  try {
    const visitsCol = collection(db, 'visits');
    const docRef = await addDoc(visitsCol, {
      ...review,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error registering visit:', error);
    throw error;
  }
}

/**
 * Get the count of visits for a user in the current month
 */
export async function getUserVisitsCountForCurrentMonth(userId: string): Promise<number> {
  try {
    const visitsCol = collection(db, 'visits');
    const q = query(visitsCol, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    let count = 0;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.createdAt) {
        let visitDate: Date;
        if (typeof data.createdAt.toDate === 'function') {
          visitDate = data.createdAt.toDate();
        } else if (data.createdAt instanceof Date) {
          visitDate = data.createdAt;
        } else if (typeof data.createdAt === 'number') {
          visitDate = new Date(data.createdAt);
        } else if (data.createdAt.seconds !== undefined) {
          visitDate = new Date(data.createdAt.seconds * 1000);
        } else {
          visitDate = new Date(data.createdAt);
        }

        if (visitDate >= startOfMonth && visitDate <= endOfMonth) {
          count++;
        }
      }
    });

    return count;
  } catch (error) {
    console.error('Error getting user visits count for current month:', error);
    return 0;
  }
}

/**
 * Get the total count of visits for a user
 */
export async function getUserTotalVisitsCount(userId: string): Promise<number> {
  try {
    const visitsCol = collection(db, 'visits');
    const q = query(visitsCol, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error getting user total visits count:', error);
    return 0;
  }
}

