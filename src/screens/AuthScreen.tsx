import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions, Image } from 'react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { authService } from '../services/auth';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    setError(null);
    try {
      await authService.signInWithGoogle();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('No se pudo iniciar sesión. Intenta de nuevo.');
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Círculos decorativos desenfocados (Fondo) */}
      <Animated.View entering={FadeIn.duration(1500)} style={[styles.decorativeCircle, styles.circle1]} />
      <Animated.View entering={FadeIn.duration(1500).delay(300)} style={[styles.decorativeCircle, styles.circle2]} />
      <Animated.View entering={FadeIn.duration(1500).delay(600)} style={[styles.decorativeCircle, styles.circle3]} />

      <BlurView intensity={40} tint="dark" style={styles.blurBackground}>
        {/* Contenido Principal */}
        <View style={styles.content}>
          <Animated.View entering={FadeInDown.duration(1000).springify()}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/images/logo-login.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.title}>Savr</Text>
            </View>
            <Text style={styles.subtitle}>Tus finanzas y descuentos, unificados.</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(1000).delay(400).springify()} style={styles.buttonContainerWrapper}>
            <BlurView intensity={20} tint="light" style={styles.buttonContainer}>
              {error && <Text style={styles.error}>{error}</Text>}

              <TouchableOpacity
                style={[styles.button, styles.googleButton, loading && styles.buttonDisabled]}
                onPress={handleGoogleSignIn}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#463E6D" />
                ) : (
                  <>
                    <FontAwesome name="google" size={22} color="#463E6D" />
                    <Text style={styles.buttonText}>Continuar con Google</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.appleButton]}
                disabled={true}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-apple" size={22} color="#FFFFFF" />
                <Text style={styles.appleButtonText}>Continuar con Apple</Text>
              </TouchableOpacity>
            </BlurView>
          </Animated.View>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2A2445', // Un morado aún más oscuro y premium
  },
  blurBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.4,
  },
  circle1: {
    width: width * 0.8,
    height: width * 0.8,
    top: -height * 0.1,
    right: -width * 0.2,
    backgroundColor: '#DEB98D',
    filter: 'blur(50px)', // Expo web / React Native 0.73+ may support blur in styles natively depending on platform, but we rely on opacity/BlurView
  },
  circle2: {
    width: width * 0.7,
    height: width * 0.7,
    bottom: -height * 0.1,
    left: -width * 0.2,
    backgroundColor: '#6A5ACD', // Toque violeta
  },
  circle3: {
    width: width * 0.5,
    height: width * 0.5,
    top: height * 0.4,
    right: width * 0.1,
    backgroundColor: '#DEB98D',
    opacity: 0.2,
  },
  content: {
    alignItems: 'center',
    zIndex: 10,
    width: '100%',
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  title: {
    fontSize: 58,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(222, 185, 141, 0.9)',
    marginBottom: 50,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  buttonContainerWrapper: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(222, 185, 141, 0.3)',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    width: '100%',
    gap: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  error: {
    color: '#FF6B6B',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 14,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    gap: 12,
  },
  googleButton: {
    backgroundColor: '#DEB98D',
  },
  appleButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: {
    color: '#2A2445',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  appleButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
