import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
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
