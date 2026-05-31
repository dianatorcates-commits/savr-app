import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { SavedBill, FriendBillDetail } from '../types/bill';

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
      isActive: true,
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
      if (data.isActive === false) return;
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

/**
 * Obtiene todas las cuentas divididas de un usuario ordenadas por fecha descendente
 */
export async function getUserBills(userId: string): Promise<SavedBill[]> {
  try {
    const billsCol = collection(db, 'bills');
    const q = query(billsCol, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const bills: SavedBill[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.isActive === false) return;
      bills.push({
        id: doc.id,
        userId: data.userId,
        restaurantName: data.restaurantName,
        generalDiscount: data.generalDiscount || 0,
        grandTotal: data.grandTotal || 0,
        tipPercentage: data.tipPercentage || 0,
        grandTotalTip: data.grandTotalTip || 0,
        friends: data.friends || [],
        consumedItems: data.consumedItems || [],
        isActive: data.isActive,
        createdAt: data.createdAt,
      });
    });

    // Ordenar en memoria por fecha descendente
    bills.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return dateB - dateA;
    });

    return bills;
  } catch (error) {
    console.error('Error al obtener las cuentas del usuario:', error);
    return [];
  }
}

/**
 * Actualiza la lista de amigos (incluyendo sus estados de pago) en una cuenta guardada
 */
export async function updateBillFriends(billId: string, friends: FriendBillDetail[]): Promise<void> {
  try {
    const billDocRef = doc(db, 'bills', billId);
    await updateDoc(billDocRef, { friends });
  } catch (error) {
    console.error('Error al actualizar amigos de la cuenta:', error);
    throw error;
  }
}

/**
 * Actualiza una cuenta dividida existente en Firestore
 */
export async function updateBillFull(billId: string, data: Partial<SavedBill>): Promise<void> {
  try {
    const billDocRef = doc(db, 'bills', billId);
    
    // Firestore no acepta valores 'undefined'.
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

    const cleanData = cleanObject(data);
    await updateDoc(billDocRef, cleanData);
  } catch (error) {
    console.error('Error al actualizar la cuenta completa:', error);
    throw error;
  }
}

/**
 * Realiza un borrado lógico (soft delete) de una cuenta en Firestore
 */
export async function softDeleteBill(billId: string): Promise<void> {
  try {
    const billDocRef = doc(db, 'bills', billId);
    await updateDoc(billDocRef, { isActive: false });
  } catch (error) {
    console.error('Error al realizar borrado lógico de la cuenta:', error);
    throw error;
  }
}
