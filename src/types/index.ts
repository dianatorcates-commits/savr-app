export interface UserProfile {
  uid: string;
  email: string;
  nombre?: string;
  foto?: string;
  proveedor: 'google' | 'apple';
  fechaRegistro: number;
  ultimoLogin: number;
  bancoPrincipal?: string;
}