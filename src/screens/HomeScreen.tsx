import { router } from 'expo-router';
import React, { useMemo, useState, useCallback } from 'react';
import {
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { authService } from '../services/auth';
import { useDiscounts, DiscountCard } from '../hooks/useDiscounts';
import { getUserVisitsCountForCurrentMonth } from '../services/visits';
import { Colors } from '../../constants/theme';

export default function HomeScreen() {
  const user = authService.getCurrentUser();
  const nombre = user?.nombre || 'Usuario';
  const { discounts, loading: loadingDiscounts } = useDiscounts();
  const [visitsCount, setVisitsCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (user?.uid) {
        getUserVisitsCountForCurrentMonth(user.uid)
          .then((count) => {
            setVisitsCount(count);
          })
          .catch((err) => {
            console.error('Error fetching visits count:', err);
          });
      }
    }, [user?.uid])
  );

  const getDiaActual = () => {
    const dayIndex = new Date().getDay();
    const unaccentedDays = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    return unaccentedDays[dayIndex];
  };
  const diaActual = getDiaActual();

  const descuentosHoy = useMemo(() => {
    return discounts.filter(d => 
      d.dias_validos && d.dias_validos.some(dia => 
        dia.toLowerCase().replace('é', 'e').replace('á', 'a') === diaActual
      )
    );
  }, [discounts, diaActual]);


  const renderDiscountCard = ({ item }: { item: DiscountCard }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/details', params: { restaurantId: item.restaurantId, initialBanco: item.banco } })}
    >
      <BlurView intensity={20} tint="light" style={styles.discountCard}>
        <View style={styles.cardImageContainer}>
          {item.urlImagen ? (
            <Image source={{ uri: item.urlImagen }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <View style={[styles.cardImage, styles.cardImagePlaceholder]} />
          )}
          <View style={styles.beneficioBadge}>
            <Text style={styles.beneficioText}>{item.beneficio}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.restaurantName} numberOfLines={1}>{item.restaurante}</Text>
          <Text style={styles.bankName}>{item.banco}</Text>
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map((key) => (
        <View key={key} style={styles.skeletonCard}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonBody}>
            <View style={styles.skeletonTextLarge} />
            <View style={styles.skeletonTextSmall} />
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <LinearGradient
      colors={[Colors.background, Colors.backgroundSecondary]}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Círculos decorativos */}
        <View style={[styles.decorativeCircle, styles.circle1]} />
        <View style={[styles.decorativeCircle, styles.circle2]} />

        {/* Header con Blur */}
        <BlurView intensity={30} tint="dark" style={styles.header}>
          <Text style={styles.headerName}>Hola, {nombre}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statNumber}>{visitsCount} restaurantes visitados</Text>
              <Text style={styles.statNumber}>$5.000 Ahorrados</Text>
            </View>
          </View>
        </BlurView>

        {/* Location Banner */}
        <View style={styles.locationBanner}>
          <Text style={styles.locationIcon}>📍</Text>
          <View style={styles.locationInfo}>
            <Text style={styles.locationText}>Tu ubicación</Text>
            <Text style={styles.locationAddress}>Santiago, Región Metropolitana</Text>
          </View>
        </View>

        {/* Descuentos del Día Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Descuentos del día</Text>
          <TouchableOpacity onPress={() => router.push({ pathname: '/all-discounts', params: { day: diaActual } })}>
            <Text style={styles.viewAll}>Ver todos →</Text>
          </TouchableOpacity>
        </View>

        {/* Hoy List */}
        {loadingDiscounts ? (
          renderSkeleton()
        ) : descuentosHoy.length > 0 ? (
          <FlatList
            data={descuentosHoy.slice(0, 5)}
            renderItem={renderDiscountCard}
            keyExtractor={(item) => `hoy-${item.id}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.discountsListContent}
            style={styles.discountsList}
          />
        ) : (
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <Text style={{ color: Colors.inactive, fontSize: 14 }}>No hay descuentos especiales para hoy.</Text>
          </View>
        )}

        {/* Section Title */}
        <View style={[styles.sectionHeader, { marginTop: 8 }]}>
          <Text style={styles.sectionTitle}>Todos los disponibles</Text>
          <TouchableOpacity onPress={() => router.push('/all-discounts')}>
            <Text style={styles.viewAll}>Explorar →</Text>
          </TouchableOpacity>
        </View>

        {/* Discounts List */}
        {loadingDiscounts ? (
          renderSkeleton()
        ) : (
          <FlatList
            data={discounts.slice(0, 5)}
            renderItem={renderDiscountCard}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.discountsListContent}
            style={styles.discountsList}
          />
        )}

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.15,
  },
  circle1: {
    width: 350,
    height: 350,
    top: -100,
    right: -100,
    backgroundColor: Colors.primary,
  },
  circle2: {
    width: 280,
    height: 280,
    bottom: -80,
    left: -80,
    backgroundColor: Colors.primaryLight,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  headerName: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statChip: {
    flex: 1,
    alignItems: 'flex-start',
    padding: 0,
  },
  statNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  locationBanner: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 24,
    backgroundColor: 'rgba(222, 185, 141, 0.1)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(222, 185, 141, 0.25)',
  },
  locationIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  locationAddress: {
    fontSize: 15,
    color: Colors.white,
    fontWeight: '500',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  viewAll: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  discountsList: {
    marginBottom: 24,
  },
  discountsListContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  discountCard: {
    borderRadius: 20,
    overflow: 'hidden',
    width: 220,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cardImageContainer: {
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 120,
  },
  cardImagePlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  beneficioBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(30, 27, 50, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(222, 185, 141, 0.3)',
  },
  beneficioText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  cardBody: {
    padding: 16,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
  },
  bankName: {
    fontSize: 13,
    color: Colors.primaryLight,
    fontWeight: '500',
  },
  skeletonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 24,
  },
  skeletonCard: {
    width: 220,
    height: 190,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  skeletonImage: {
    width: '100%',
    height: 120,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  skeletonBody: {
    padding: 16,
  },
  skeletonTextLarge: {
    width: '70%',
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonTextSmall: {
    width: '40%',
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
  },
});
