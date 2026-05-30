import { createOrUpdateUser } from '../services/firebaseUsers';
import { UserProfile } from '../types';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth } from './firebase'; // Import Firebase auth from our config
import { GoogleAuthProvider, signInWithCredential, signOut } from 'firebase/auth';

// Inicializar Google Sign-In (PENDIENTE CLIENT ID)
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'TU_WEB_CLIENT_ID_AQUI',
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '301787533350-ou9vr0qqgmfn9mr1a46661cte2tvvo1j.apps.googleusercontent.com',
});

class AuthService {
  private _currentUser: UserProfile | null = null;
  private _listeners = new Set<(user: UserProfile | null) => void>();

  onAuthChange(callback: (user: UserProfile | null) => void) {
    this._listeners.add(callback);
    
    setTimeout(() => {
      callback(this._currentUser);
    }, 100);
    
    return () => {
      this._listeners.delete(callback);
    };
  }

  async signInWithGoogle(): Promise<UserProfile> {
    try {
      // 1. Check if device has Play Services
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      // 2. Start Sign In process
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;

      if (!idToken) {
        throw new Error('No se obtuvo el ID Token de Google');
      }

      // 3. Create Firebase credential
      const googleCredential = GoogleAuthProvider.credential(idToken);

      // 4. Sign in with Firebase
      const userCredential = await signInWithCredential(auth, googleCredential);
      const firebaseUser = userCredential.user;
      
      // 5. Update user in our Firestore DB
      const userProfile = await createOrUpdateUser(
        firebaseUser.uid,
        firebaseUser.displayName || 'Usuario',
        firebaseUser.email || '',
        firebaseUser.photoURL,
        'google'
      );
      
      this._currentUser = userProfile;
      this._listeners.forEach(callback => callback(userProfile));
      
      return userProfile;
    } catch (error) {
      console.error('Error en Google Sign-In:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      await GoogleSignin.signOut();
      await signOut(auth);
      this._currentUser = null;
      this._listeners.forEach(callback => callback(null));
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }

  getCurrentUser(): UserProfile | null {
    return this._currentUser;
  }
}

export const authService = new AuthService();