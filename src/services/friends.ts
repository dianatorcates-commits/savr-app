import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { Friend } from '../types';

/**
 * Agrega un nuevo amigo a Firestore
 */
export async function addFriend(friend: Omit<Friend, 'id' | 'createdAt'>): Promise<string> {
  try {
    const friendsCol = collection(db, 'friends');
    
    // Firestore no acepta valores 'undefined'. Los filtramos antes de guardar.
    const cleanFriend: any = {};
    Object.keys(friend).forEach((key) => {
      const val = (friend as any)[key];
      if (val !== undefined) {
        cleanFriend[key] = val;
      }
    });

    const docRef = await addDoc(friendsCol, {
      ...cleanFriend,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error al agregar amigo:', error);
    throw error;
  }
}

/**
 * Obtiene la lista de amigos agregados por el usuario
 * Para evitar errores de índices compuestos en Firestore, se ordenan y limitan en el cliente.
 */
export async function getRecentFriends(userId: string): Promise<Friend[]> {
  try {
    const friendsCol = collection(db, 'friends');
    const q = query(friendsCol, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    const friendsList: Friend[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      let createdAtDate: Date | null = null;

      if (data.createdAt) {
        if (typeof data.createdAt.toDate === 'function') {
          createdAtDate = data.createdAt.toDate();
        } else if (data.createdAt instanceof Date) {
          createdAtDate = data.createdAt;
        } else if (typeof data.createdAt === 'number') {
          createdAtDate = new Date(data.createdAt);
        } else if (data.createdAt.seconds !== undefined) {
          createdAtDate = new Date(data.createdAt.seconds * 1000);
        } else {
          createdAtDate = new Date(data.createdAt);
        }
      }

      friendsList.push({
        id: doc.id,
        userId: data.userId,
        name: data.name,
        email: data.email,
        status: data.status,
        createdAt: createdAtDate,
      });
    });

    // Ordenar por fecha de creación descendente (los más recientes primero)
    friendsList.sort((a, b) => {
      const dateA = a.createdAt ? a.createdAt.getTime() : 0;
      const dateB = b.createdAt ? b.createdAt.getTime() : 0;
      return dateB - dateA;
    });

    // Retornar los primeros 20 amigos
    return friendsList.slice(0, 20);
  } catch (error) {
    console.error('Error al obtener amigos recientes:', error);
    return [];
  }
}
