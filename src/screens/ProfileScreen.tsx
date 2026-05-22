import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/theme';
import { authService } from '../services/auth';
import { getUserProfile, updateUserProfile } from '../services/firebaseUsers';
import { UserProfile } from '../types';
import { getUserTotalVisitsCount } from '../services/visits';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

interface Bank {
  id: string;
  name: string;
  logo?: string;
  color?: string;
}

const FOOD_PREFERENCES = ['Pizza', 'Sushi', 'Italiana', 'Peruana', 'Mexicana', 'Ramen'];

function getFoodEmoji(food: string): string {
  const emojiMap: Record<string, string> = {
    Pizza: '🍕',
    Sushi: '🍣',
    Italiana: '🍝',
    Peruana: '🍲',
    Mexicana: '🌮',
    Ramen: '🍜',
  };
  return emojiMap[food] || '🍽️';
}

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  const [nombre, setNombre] = useState('');
  const [banksList, setBanksList] = useState<Bank[]>([]);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
  
  const [visitsCount, setVisitsCount] = useState(0);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      // Load Banks
      const banksCollection = collection(db, 'banks');
      const snapshot = await getDocs(banksCollection);
      const fetchedBanks: Bank[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.nombre || data.name || doc.id,
          logo: data.logo,
          color: data.color || '#463E6D',
        };
      });
      setBanksList(fetchedBanks);

      // Load User Profile
      const currentUser = authService.getCurrentUser();
      if (currentUser?.uid) {
        const userProfile = await getUserProfile(currentUser.uid);
        if (userProfile) {
          setProfile(userProfile);
          setNombre(userProfile.nombre || '');
          
          if (userProfile.preferences?.bank) {
            setSelectedBank({
              id: userProfile.preferences.bank.id,
              name: userProfile.preferences.bank.name,
              logo: userProfile.preferences.bank.logo || undefined,
              color: userProfile.preferences.bank.color,
            });
          }
          if (userProfile.preferences?.foodPreferences) {
            setSelectedFoods(userProfile.preferences.foodPreferences);
          }
        }
        
        const count = await getUserTotalVisitsCount(currentUser.uid);
        setVisitsCount(count);
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!profile?.uid) return;
    setSaving(true);
    try {
      await updateUserProfile(profile.uid, {
        nombre,
        preferences: {
          bank: selectedBank ? {
            id: selectedBank.id,
            name: selectedBank.name,
            logo: selectedBank.logo || null,
            color: selectedBank.color || '#463E6D',
          } : undefined,
          foodPreferences: selectedFoods,
        }
      });
      Alert.alert('Éxito', 'Perfil actualizado correctamente.');
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, salir', style: 'destructive', onPress: async () => {
            await authService.signOut();
          }
        }
      ]
    );
  };

  const toggleFoodPreference = (food: string) => {
    setSelectedFoods((prev) =>
      prev.includes(food) ? prev.filter((f) => f !== food) : [...prev, food]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[Colors.background, Colors.backgroundSecondary]}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Foto de perfil centrada y correo */}
        <View style={styles.header}>
          {profile?.foto ? (
            <Image source={{ uri: profile.foto }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>
                {nombre ? nombre.substring(0, 2).toUpperCase() : 'U'}
              </Text>
            </View>
          )}
          <Text style={styles.emailText}>{profile?.email}</Text>
        </View>

        {/* Sección de Modificar Información */}
        <BlurView intensity={40} tint="dark" style={styles.card}>
          <Text style={styles.sectionTitle}>Modificar Perfil</Text>
          
          <Text style={styles.label}>Nombre de Usuario</Text>
          <TextInput
            style={styles.input}
            placeholder="Tu nombre"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={nombre}
            onChangeText={setNombre}
          />

          <Text style={styles.label}>Banco Principal</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.banksScroll} contentContainerStyle={{ gap: 12, paddingBottom: 10 }}>
            {banksList.map((bank) => {
              const isSelected = selectedBank?.id === bank.id;
              return (
                <TouchableOpacity
                  key={bank.id}
                  onPress={() => setSelectedBank(bank)}
                  activeOpacity={0.8}
                  style={[
                    styles.bankCard,
                    isSelected && styles.bankCardSelected
                  ]}
                >
                  <View style={styles.bankContent}>
                    {bank.logo ? (
                      <Image source={{ uri: bank.logo }} style={styles.bankLogo} />
                    ) : (
                      <View style={styles.bankLogoPlaceholder}>
                        <Text style={styles.bankLogoInitials}>{bank.name.substring(0,2).toUpperCase()}</Text>
                      </View>
                    )}
                    <Text style={styles.bankName}>{bank.name}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.label}>Comida Favorita</Text>
          <View style={styles.foodGrid}>
            {FOOD_PREFERENCES.map((food) => {
              const isSelected = selectedFoods.includes(food);
              return (
                <TouchableOpacity
                  key={food}
                  onPress={() => toggleFoodPreference(food)}
                  activeOpacity={0.8}
                  style={[
                    styles.foodCard,
                    isSelected && styles.foodCardSelected
                  ]}
                >
                  <Text style={styles.foodEmoji}>{getFoodEmoji(food)}</Text>
                  <Text style={styles.foodName}>{food}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color={Colors.background} />
            ) : (
              <Text style={styles.saveBtnText}>Guardar Cambios</Text>
            )}
          </TouchableOpacity>
        </BlurView>

        {/* Sección de Métricas */}
        <BlurView intensity={40} tint="dark" style={styles.card}>
          <Text style={styles.sectionTitle}>Tus Métricas</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{visitsCount}</Text>
              <Text style={styles.metricLabel}>Visitas Registradas</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>0</Text>
              <Text style={styles.metricLabel}>Cuentas Divididas</Text>
            </View>
          </View>
        </BlurView>

        {/* Botón de Cerrar Sesión */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
          <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
        </TouchableOpacity>

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 80,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 3,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 40,
    color: Colors.white,
    fontWeight: 'bold',
  },
  emailText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  card: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(30, 27, 50, 0.65)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: Colors.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  banksScroll: {
    marginBottom: 20,
  },
  bankCard: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minWidth: 120,
  },
  bankCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(222, 185, 141, 0.1)',
  },
  bankContent: {
    alignItems: 'center',
    gap: 8,
  },
  bankLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  bankLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bankLogoInitials: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  bankName: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  foodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  foodCard: {
    flex: 1,
    minWidth: '28%',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  foodCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(222, 185, 141, 0.1)',
  },
  foodEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  foodName: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '500',
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  metricBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  metricValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    fontWeight: '500',
  },
  logoutBtn: {
    backgroundColor: 'rgba(255,107,107,0.1)',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.3)',
  },
  logoutBtnText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
