import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '../services/auth';

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
}

const features: Feature[] = [
  {
    id: '1',
    title: 'Descuentos',
    description: 'Explora descuentos de todos los bancos chilenos',
    icon: '💳',
    route: '/discounts',
  },
  {
    id: '2',
    title: 'Dividir Cuenta',
    description: 'Divide gastos entre amigos automáticamente',
    icon: '👥',
    route: '/split-bill',
  },
  {
    id: '3',
    title: 'Mi Ubicación',
    description: 'Descuentos cercanos a tu localización',
    icon: '📍',
    route: '/nearby',
  },
  {
    id: '4',
    title: 'Recomendaciones',
    description: 'Sugerencias según tus preferencias',
    icon: '⭐',
    route: '/recommendations',
  },
];

export default function LandingScreen() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await authService.signOut();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Círculos decorativos */}
        <View style={[styles.decorativeCircle, styles.circle1]} />
        <View style={[styles.decorativeCircle, styles.circle2]} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>¡Hola!</Text>
          <Text style={styles.tagline}>¿Qué deseas hacer hoy?</Text>
        </View>

        {/* Features Grid */}
        <View style={styles.featuresGrid}>
          {features.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              style={styles.featureCard}
              onPress={() => router.push(feature.route as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
              <View style={styles.arrowContainer}>
                <Text style={styles.arrow}>→</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#463E6D',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 40,
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.12,
  },
  circle1: {
    width: 350,
    height: 350,
    top: -100,
    right: -100,
    backgroundColor: '#DEB98D',
  },
  circle2: {
    width: 280,
    height: 280,
    bottom: -80,
    left: -80,
    backgroundColor: '#DEB98D',
  },
  header: {
    marginBottom: 40,
    zIndex: 10,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    color: '#DEB98D',
    fontWeight: '500',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 40,
    zIndex: 10,
  },
  featureCard: {
    width: '48%',
    backgroundColor: 'rgba(222, 185, 141, 0.15)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(222, 185, 141, 0.3)',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  featureIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 13,
    color: '#DEB98D',
    lineHeight: 18,
    marginBottom: 12,
  },
  arrowContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  arrow: {
    fontSize: 20,
    color: '#DEB98D',
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: 'rgba(222, 185, 141, 0.2)',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#DEB98D',
    alignSelf: 'center',
    marginTop: 20,
  },
  signOutText: {
    color: '#DEB98D',
    fontSize: 15,
    fontWeight: '600',
  },
});
