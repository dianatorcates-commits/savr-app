import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { getBranchesByRestaurant, Branch } from '../services/branches';

// Helper function to calculate distance in km using Haversine formula
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { db } from '../services/firebase';
import { Colors } from '../../constants/theme';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

interface BankDiscount {
  banco: string;
  beneficio: string;
  detalleTexto: string;
}

export default function DetailsScreen() {
  const { restaurantId, initialBanco } = useLocalSearchParams<{
    restaurantId: string;
    initialBanco: string;
  }>();

  const [restaurantName, setRestaurantName] = useState('');
  const [urlImagen, setUrlImagen] = useState('');

  const [bankDiscounts, setBankDiscounts] = useState<BankDiscount[]>([]);
  const [selectedBanco, setSelectedBanco] = useState(initialBanco ?? '');
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const [branches, setBranches] = useState<Branch[]>([]);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [closestBranch, setClosestBranch] = useState<Branch | null>(null);
  const [showAllBranches, setShowAllBranches] = useState(false);

  useEffect(() => {
    setIsExpanded(false);
  }, [selectedBanco]);

  useEffect(() => {
    if (!restaurantId) return;
    (async () => {
      try {
        // Datos del restaurante: nombre, imagen y descripción general
        const rDoc = await getDoc(doc(db, 'restaurants', restaurantId));
        if (rDoc.exists()) {
          const r = rDoc.data();
          setRestaurantName(r.nombre || '');
          setUrlImagen(r.url_imagen || '');
        }

        // Todos los descuentos para este restaurante (filtro activo en cliente)
        const q = query(
          collection(db, 'discounts'),
          where('restaurant_id', '==', restaurantId)
        );
        const snap = await getDocs(q);
        const results: BankDiscount[] = snap.docs
          .filter((d) => d.data().activo !== false)
          .map((d) => ({
            banco: d.data().bank_nombre || '',
            beneficio: d.data().beneficio_porcentaje ? `${d.data().beneficio_porcentaje}%` : '',
            detalleTexto: d.data().descripcion_descuento || '',
          }));
        setBankDiscounts(results);
        const { status } = await Location.requestForegroundPermissionsAsync();
        let loc = null;
        if (status === 'granted') {
          loc = await Location.getCurrentPositionAsync({});
          setUserLocation(loc);
        }

        const restaurantBranches = await getBranchesByRestaurant(restaurantId as string);
        
        if (loc && restaurantBranches.length > 0) {
          const sortedBranches = [...restaurantBranches].sort((a, b) => {
            if (!a.ubicacion || !b.ubicacion) return 0;
            const distA = getDistanceFromLatLonInKm(loc!.coords.latitude, loc!.coords.longitude, a.ubicacion.latitude, a.ubicacion.longitude);
            const distB = getDistanceFromLatLonInKm(loc!.coords.latitude, loc!.coords.longitude, b.ubicacion.latitude, b.ubicacion.longitude);
            return distA - distB;
          });
          setClosestBranch(sortedBranches[0]);
          setBranches(sortedBranches);
        } else {
          setBranches(restaurantBranches);
          if (restaurantBranches.length > 0) setClosestBranch(restaurantBranches[0]);
        }
      } catch (error) {
        console.error('DetailsScreen fetch error:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [restaurantId]);

  const current = bankDiscounts.find((d) => d.banco === selectedBanco) ?? bankDiscounts[0];
  const displayText = current?.detalleTexto ?? '';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Círculos decorativos */}
      <View style={[styles.decorativeCircle, styles.circle1]} />
      <View style={[styles.decorativeCircle, styles.circle2]} />

      {/* Imagen Inmersiva */}
      <View style={styles.imageContainer}>
        {urlImagen ? (
          <Image source={{ uri: urlImagen }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder} />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(30, 27, 50, 0.8)', Colors.background]}
          style={styles.imageGradient}
        />
        
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <BlurView intensity={30} tint="light" style={styles.backBtnBlur}>
            <Text style={styles.backIcon}>←</Text>
          </BlurView>
        </TouchableOpacity>
      </View>

      {/* Tarjeta de Cristal Superpuesta */}
      <View style={styles.cardWrapper}>
        <BlurView intensity={60} tint="dark" style={styles.glassCard}>
          <ScrollView contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            
            <View style={styles.headerRow}>
              <Text style={styles.restaurantName} numberOfLines={2}>{restaurantName}</Text>
              {current?.beneficio ? (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{current.beneficio}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.separator} />

            <Text style={styles.sectionLabel}>Bancos con beneficios</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.banksRow}
              contentContainerStyle={styles.banksRowContent}
            >
              {bankDiscounts.map((d) => {
                const active = d.banco === selectedBanco;
                return (
                  <TouchableOpacity
                    key={d.banco}
                    style={[styles.bankPill, active && styles.bankPillActive]}
                    onPress={() => setSelectedBanco(d.banco)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.bankPillText, active && styles.bankPillTextActive]}>
                      {d.banco}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionLabel}>Detalles del Descuento</Text>
            <View style={styles.descriptionBox}>
              {displayText ? (
                <>
                  <Text style={styles.description} numberOfLines={isExpanded ? undefined : 3}>
                    {displayText}
                  </Text>
                  {displayText.length > 120 && (
                    <TouchableOpacity
                      style={styles.toggleButton}
                      onPress={() => setIsExpanded(!isExpanded)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.toggleText}>
                        {isExpanded ? 'Ver menos' : 'Ver más'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <Text style={styles.description}>No hay detalles adicionales.</Text>
              )}
            </View>

            <View style={[styles.separator, { marginTop: 24 }]} />

            <Text style={styles.sectionLabel}>Sucursal más cercana</Text>
            <View style={styles.descriptionBox}>
              {closestBranch ? (
                <>
                  <Text style={styles.branchName}>{closestBranch.restaurant_nombre || restaurantName}</Text>
                  <Text style={styles.branchAddress}>📍 {closestBranch.direccion || 'Dirección no disponible'}</Text>
                  <View style={styles.ratingRow}>
                    <Text style={styles.ratingText}>
                      {closestBranch.rating ? '★'.repeat(Math.round(closestBranch.rating)) + '☆'.repeat(5 - Math.round(closestBranch.rating)) : '★★★★★'}
                    </Text>
                    <Text style={styles.reviewsText}>({closestBranch.total_reviews || 0} reviews)</Text>
                  </View>

                  {branches.length > 1 && (
                    <>
                      {showAllBranches && (
                        <View style={styles.allBranchesContainer}>
                          <Text style={styles.otherBranchesLabel}>Otras sucursales:</Text>
                          {branches.slice(1).map(b => (
                            <View key={b.id} style={styles.otherBranchItem}>
                              <Text style={styles.branchNameSmall}>{b.restaurant_nombre || restaurantName}</Text>
                              <Text style={styles.branchAddressSmall}>📍 {b.direccion || 'Dirección no disponible'}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.toggleButton}
                        onPress={() => setShowAllBranches(!showAllBranches)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.toggleText}>
                          {showAllBranches ? 'Ocultar sucursales' : 'Ver más sucursales'}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}

                  <TouchableOpacity
                    style={styles.registerVisitBtn}
                    onPress={() => {
                      router.push({
                        pathname: '/register-visit',
                        params: {
                          restaurantId: restaurantId as string,
                          branchId: closestBranch.id,
                          restaurantName: closestBranch.restaurant_nombre || restaurantName
                        }
                      });
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.registerVisitBtnText}>Registrar Visita</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.description}>No hay sucursales registradas.</Text>
              )}
            </View>

          </ScrollView>
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  decorativeCircle: { position: 'absolute', borderRadius: 999, opacity: 0.15 },
  circle1: { width: 350, height: 350, top: -100, right: -100, backgroundColor: Colors.primary },
  circle2: { width: 280, height: 280, bottom: -80, left: -80, backgroundColor: Colors.primaryLight },
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(222,185,141,0.1)',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  backBtn: {
    position: 'absolute',
    top: 60,
    left: 20,
    borderRadius: 24,
    overflow: 'hidden',
  },
  backBtnBlur: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  backIcon: {
    color: Colors.white,
    fontSize: 24,
    lineHeight: 28,
  },
  cardWrapper: {
    flex: 1,
    marginTop: 260,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  glassCard: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 50, 0.65)',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  bodyContent: {
    padding: 24,
    paddingBottom: 100,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 16,
  },
  restaurantName: {
    flex: 1,
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.white,
    lineHeight: 38,
  },
  discountBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  discountText: {
    color: Colors.background,
    fontSize: 20,
    fontWeight: '900',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  banksRow: {
    marginBottom: 32,
  },
  banksRowContent: {
    paddingRight: 20,
    gap: 12,
  },
  bankPill: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  bankPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  bankPillText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  bankPillTextActive: {
    color: Colors.background,
    fontWeight: 'bold',
  },
  descriptionBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  description: {
    fontSize: 16,
    color: Colors.white,
    lineHeight: 26,
    opacity: 0.9,
  },
  toggleButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  toggleText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  branchName: {
    fontSize: 18,
    color: Colors.white,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  branchAddress: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingText: {
    color: '#FFD700',
    fontSize: 16,
    letterSpacing: 2,
  },
  reviewsText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
  },
  allBranchesContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  otherBranchesLabel: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  otherBranchItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 12,
    borderRadius: 8,
  },
  branchNameSmall: {
    fontSize: 15,
    color: Colors.white,
    fontWeight: '600',
    marginBottom: 2,
  },
  branchAddressSmall: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  registerVisitBtn: {
    backgroundColor: Colors.primary,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  registerVisitBtnText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
