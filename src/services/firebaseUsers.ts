import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile } from '../types';

/**
 * Genera iniciales a partir del nombre
 */
function getInitials(name: string | null): string {
  if (!name) return 'U';
  
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);
}

/**
 * Crea o actualiza un usuario en la colección "users" de Firestore
 */
export async function createOrUpdateUser(
  uid: string,
  displayName: string | null,
  email: string | null,
  photoURL: string | null,
  proveedor: string = 'google'
): Promise<UserProfile> {
  try {
    const userRef = doc(db, 'users', uid);
    const now = Date.now();
    
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      // Usuario existente - solo actualizar ultimoLogin
      await updateDoc(userRef, {
        ultimoLogin: now
      });
      
      const userData = userSnap.data() as UserProfile;
      return { ...userData, uid };
    } else {
      // Nuevo usuario - crear documento SIN campos undefined
      const newUserData: any = {
        uid,
        displayName: displayName || 'Usuario',
        email: email || '',
        initials: getInitials(displayName),
        banks: [],
        preferences: [],
        fechaRegistro: now,
        nombre: displayName || 'Usuario',
        proveedor,
        ultimoLogin: now
      };
      
      // Solo agregar foto si no es null
      if (photoURL) {
        newUserData.foto = photoURL;
        newUserData.photoURL = photoURL;
      }
      
      await setDoc(userRef, newUserData);
      console.log('✅ Usuario creado:', email);
      return newUserData as UserProfile;
    }
  } catch (error) {
    console.error('❌ Error con usuario:', error);
    throw error;
  }
}

/**
 * Obtiene un usuario de la colección "users" por su UID
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { ...userSnap.data(), uid } as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error obteniendo perfil de usuario:', error);
    return null;
  }
}

/**
 * Actualiza el perfil de usuario
 */
export async function updateUserProfile(
  uid: string, 
  updates: Partial<UserProfile>
): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    
    // Si se actualizan los bancos, también actualizar bancoPrincipal si está vacío
    if (updates.banks && updates.banks.length > 0 && !updates.bancoPrincipal) {
      updates.bancoPrincipal = updates.banks[0]; // Primer banco como principal
    }
    
    await updateDoc(userRef, {
      ...updates,
      ultimoLogin: Date.now() // Actualizar timestamp de última actividad
    });
  } catch (error) {
    console.error('Error actualizando perfil de usuario:', error);
    throw error;
  }
}