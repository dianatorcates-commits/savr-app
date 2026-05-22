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

export interface Friend {
  id?: string;
  userId: string;
  name: string;
  email?: string;
  status: 'solicitud enviada' | 'agregado';
  createdAt?: any;
}