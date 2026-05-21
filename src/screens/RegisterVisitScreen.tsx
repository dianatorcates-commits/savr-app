import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/theme';
import { StarRating } from '../components/StarRating';
import { BlurView } from 'expo-blur';
import { registerVisit } from '../services/visits';
import { authService } from '../services/auth';

export default function RegisterVisitScreen() {
  const { restaurantId, branchId, restaurantName } = useLocalSearchParams<{
    restaurantId: string;
    branchId: string;
    restaurantName: string;
  }>();

  const user = authService.getCurrentUser();

  const [rating, setRating] = useState(0);
  const [likedIt, setLikedIt] = useState<boolean | null>(null);
  const [wouldReturn, setWouldReturn] = useState<boolean | null>(null);
  const [serviceRating, setServiceRating] = useState(0);
  const [foodRating, setFoodRating] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para registrar una visita.');
      return;
    }

    if (rating === 0 || likedIt === null || wouldReturn === null || serviceRating === 0 || foodRating === 0) {
      Alert.alert('Incompleto', 'Por favor completa todas las preguntas de la encuesta.');
      return;
    }

    setLoading(true);
    try {
      await registerVisit({
        userId: user.uid,
        branchId: branchId || restaurantId || 'unknown',
        restaurantId: restaurantId,
        rating,
        likedIt,
        wouldReturn,
        serviceRating,
        foodRating,
      });

      Alert.alert('¡Gracias!', 'Tu visita ha sido registrada exitosamente.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Hubo un problema al registrar la visita. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const renderToggleButton = (
    label: string,
    value: boolean | null,
    targetValue: boolean,
    onPress: () => void
  ) => {
    const isActive = value === targetValue;
    return (
      <TouchableOpacity
        style={[styles.toggleBtn, isActive && styles.toggleBtnActive]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={[styles.toggleBtnText, isActive && styles.toggleBtnTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registrar Visita</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BlurView intensity={60} tint="dark" style={styles.card}>
          <Text style={styles.restaurantName}>{restaurantName || 'Restaurante'}</Text>
          
          <View style={styles.section}>
            <Text style={styles.questionLabel}>¿Cómo calificarías tu experiencia general?</Text>
            <StarRating rating={rating} onRatingChange={setRating} starSize={40} />
          </View>

          <View style={styles.separator} />

          <View style={styles.section}>
            <Text style={styles.questionLabel}>¿Te gustó?</Text>
            <View style={styles.toggleRow}>
              {renderToggleButton('Sí', likedIt, true, () => setLikedIt(true))}
              {renderToggleButton('No', likedIt, false, () => setLikedIt(false))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.questionLabel}>¿Volverías a visitarlo?</Text>
            <View style={styles.toggleRow}>
              {renderToggleButton('Sí', wouldReturn, true, () => setWouldReturn(true))}
              {renderToggleButton('No', wouldReturn, false, () => setWouldReturn(false))}
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.section}>
            <Text style={styles.questionLabel}>Puntúa la atención</Text>
            <StarRating rating={serviceRating} onRatingChange={setServiceRating} starSize={32} />
          </View>

          <View style={styles.section}>
            <Text style={styles.questionLabel}>Califica la comida</Text>
            <StarRating rating={foodRating} onRatingChange={setFoodRating} starSize={32} />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.background} />
            ) : (
              <Text style={styles.submitButtonText}>Guardar Visita</Text>
            )}
          </TouchableOpacity>
        </BlurView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(30, 27, 50, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  questionLabel: {
    fontSize: 16,
    color: Colors.white,
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  toggleBtn: {
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  toggleBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toggleBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  toggleBtnTextActive: {
    color: Colors.background,
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 8,
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: Colors.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
