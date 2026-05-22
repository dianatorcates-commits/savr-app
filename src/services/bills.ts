import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { SavedBill } from '../types/bill';

/**
 * Guarda una nueva cuenta dividida en Firestore
 */
export async function saveBill(bill: Omit<SavedBill, 'id' | 'createdAt'>): Promise<string> {
  try {
    const billsCol = collection(db, 'bills');
    
    // Firestore no acepta valores 'undefined'. Los filtramos de manera recursiva.
    const cleanObject = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(cleanObject);
      } else if (obj !== null && typeof obj === 'object') {
        const cleaned: any = {};
        Object.keys(obj).forEach((key) => {
          const val = obj[key];
          if (val !== undefined) {
            cleaned[key] = cleanObject(val);
          }
        });
        return cleaned;
      }
      return obj;
    };

    const cleanBill = cleanObject(bill);

    const docRef = await addDoc(billsCol, {
      ...cleanBill,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error al guardar la cuenta:', error);
    throw error;
  }
}
