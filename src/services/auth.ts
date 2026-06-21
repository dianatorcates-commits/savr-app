import { createOrUpdateUser, deleteUserProfileAndData } from '../services/firebaseUsers';
import { UserProfile } from '../types';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth } from './firebase'; // Import Firebase auth from our config
import { GoogleAuthProvider, OAuthProvider, signInWithCredential, signOut, deleteUser } from 'firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';

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

  async signInWithApple(): Promise<UserProfile> {
    try {
      // 1. Iniciar el flujo nativo de Apple Authentication
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken, fullName, email } = credential;

      if (!identityToken) {
        throw new Error('No se obtuvo el Identity Token de Apple');
      }

      // 2. Crear una credencial de Firebase usando OAuthProvider
      const provider = new OAuthProvider('apple.com');
      const firebaseCredential = provider.credential({
        idToken: identityToken,
      });

      // 3. Iniciar sesión en Firebase con la credencial
      const userCredential = await signInWithCredential(auth, firebaseCredential);
      const firebaseUser = userCredential.user;

      // Intentar obtener el nombre a partir de fullName enviado por Apple (solo en el primer registro)
      let name = firebaseUser.displayName;
      if (fullName) {
        const parts = [fullName.givenName, fullName.familyName].filter(Boolean);
        if (parts.length > 0) {
          name = parts.join(' ');
        }
      }
      
      const userEmail = email || firebaseUser.email || '';
      const displayName = name || userEmail.split('@')[0] || 'Usuario Apple';

      // 4. Crear o actualizar el perfil en Firestore
      const userProfile = await createOrUpdateUser(
        firebaseUser.uid,
        displayName,
        userEmail,
        firebaseUser.photoURL,
        'apple'
      );

      this._currentUser = userProfile;
      this._listeners.forEach(callback => callback(userProfile));

      return userProfile;
    } catch (error) {
      console.error('Error en Apple Sign-In:', error);
      throw error;
    }
  }

  async deleteAccount(): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No hay un usuario autenticado para eliminar.');
    }
    const uid = user.uid;

    try {
      // 1. Eliminar todos los datos de Firestore
      await deleteUserProfileAndData(uid);
      
      // 2. Eliminar el usuario de Firebase Auth
      try {
        await deleteUser(user);
      } catch (authError: any) {
        console.warn('No se pudo eliminar el usuario de Firebase Auth (puede requerir inicio de sesión reciente):', authError);
        // Si falla por recent-login, de todas formas cerramos la sesión para limpiar el estado
        await this.signOut();
      }

      // 3. Limpiar variables locales y notificar a los listeners
      this._currentUser = null;
      this._listeners.forEach(callback => callback(null));
    } catch (error) {
      console.error('Error al eliminar la cuenta:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();