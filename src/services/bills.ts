import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
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

/**
 * Obtiene el total de ahorro (generalDiscount) del usuario en el mes actual
 */
export async function getUserMonthlySavings(userId: string): Promise<number> {
  try {
    const billsCol = collection(db, 'bills');
    const q = query(billsCol, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    let totalSavings = 0;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.createdAt) {
        let billDate: Date;
        if (typeof data.createdAt.toDate === 'function') {
          billDate = data.createdAt.toDate();
        } else if (data.createdAt instanceof Date) {
          billDate = data.createdAt;
        } else if (typeof data.createdAt === 'number') {
          billDate = new Date(data.createdAt);
        } else if (data.createdAt.seconds !== undefined) {
          billDate = new Date(data.createdAt.seconds * 1000);
        } else {
          billDate = new Date(data.createdAt);
        }

        if (billDate >= startOfMonth && billDate <= endOfMonth) {
          const discount = typeof data.generalDiscount === 'number' ? data.generalDiscount : 0;
          totalSavings += discount;
        }
      }
    });

    return totalSavings;
  } catch (error) {
    console.error('Error getting user monthly savings:', error);
    return 0;
  }
}

