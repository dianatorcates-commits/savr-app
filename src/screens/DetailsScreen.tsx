import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { getBranchesByRestaurant, Branch } from '../services/branches';
import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { db } from '../services/firebase';
import { Colors } from '../../constants/theme';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

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

interface BankDiscount {
  banco: string;
  beneficio: string;
  detalleTexto: string;
  branch_ids?: string[];
  dias_validos?: string[];
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
  
  // Estados para precarga en segundo plano de sucursales e interfaz del Modal
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [loadingBackground, setLoadingBackground] = useState(true);
  const [showBranchesModal, setShowBranchesModal] = useState(false);

  useEffect(() => {
    setIsExpanded(false);
  }, [selectedBanco]);

  useEffect(() => {
    if (!restaurantId) return;
    (async () => {
      setLoading(true);
      setLoadingBackground(true);
      
      // 1. Obtener geolocalización en segundo plano (no bloquea el spinner de carga inicial)
      Location.requestForegroundPermissionsAsync().then(async ({ status }) => {
        console.log(`[DetailsScreen] Background geolocation permission: ${status}`);
        if (status === 'granted') {
          try {
            // Ubicación rápida cached
            const lastKnown = await Location.getLastKnownPositionAsync({});
            if (lastKnown) {
              console.log(`[DetailsScreen] Background fast location fetched.`);
              setUserLocation(lastKnown);
            }

            // Ubicación actual equilibrada
            const current = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            console.log(`[DetailsScreen] Background precise location fetched.`);
            setUserLocation(current);
          } catch (locErr) {
            console.warn('[DetailsScreen] Background location retrieval error:', locErr);
          }
        }
      }).catch(err => {
        console.error('[DetailsScreen] Geolocation permission query error:', err);
      });

      // 2. Cargar sucursales en segundo plano (en paralelo)
      getBranchesByRestaurant(restaurantId as string).then((resBranches) => {
        console.log(`[DetailsScreen] Background branches loaded. Count: ${resBranches.length}`);
        setAllBranches(resBranches);
        setLoadingBackground(false);
      }).catch((err) => {
        console.error('[DetailsScreen] Background branches fetch error:', err);
        setLoadingBackground(false);
      });

      // 3. Consulta concurrente en Firestore de restaurante y descuentos activos (Carga rápida principal)
      try {
        const restaurantPromise = getDoc(doc(db, 'restaurants', restaurantId));
        const discountsPromise = getDocs(
          query(collection(db, 'discounts'), where('restaurant_id', '==', restaurantId))
        );

        const [rDoc, discountsSnap] = await Promise.all([
          restaurantPromise,
          discountsPromise
        ]);

        if (rDoc.exists()) {
          const r = rDoc.data();
          setRestaurantName(r.nombre || '');
          setUrlImagen(r.url_imagen || '');
        }

        const results: BankDiscount[] = discountsSnap.docs
          .filter((d) => d.data().activo !== false)
          .map((d) => ({
            banco: d.data().bank_nombre || '',
            beneficio: d.data().beneficio_porcentaje ? `${d.data().beneficio_porcentaje}%` : '',
            detalleTexto: d.data().descripcion_descuento || '',
            branch_ids: d.data().branch_ids || [],
            dias_validos: d.data().dias_validos || [],
          }));
        setBankDiscounts(results);
        setSelectedBanco((prev) => {
          if (!prev && results.length > 0) {
            return results[0].banco;
          }
          return prev;
        });

      } catch (error) {
        console.error('DetailsScreen fetch error:', error);
      } finally {
        setLoading(false); // Quitar spinner inicial de carga (~200ms)
      }
    })();
  }, [restaurantId]);

  // Filtrar, ordenar por distancia y limitar al Top 10 de sucursales aplicables
  const nearbyBranches = useMemo(() => {
    if (allBranches.length === 0) return [];

    const currentDiscount = bankDiscounts.find((d) => d.banco === selectedBanco) ?? bankDiscounts[0];
    
    let applicableBranches = allBranches;
    // Si la promoción está restringida a sucursales específicas, filtrar de acuerdo a branch_ids
    if (currentDiscount?.branch_ids && currentDiscount.branch_ids.length > 0) {
      applicableBranches = allBranches.filter(b => currentDiscount.branch_ids!.includes(b.id));
    }

    // Calcular distancias y mapear
    const withDistance = applicableBranches.map((branch) => {
      if (!branch.ubicacion) return { ...branch, distance: Infinity };
      
      const distance = getDistanceFromLatLonInKm(
        userLocation?.coords.latitude ?? -33.4489, // Fallback a Santiago Centro
        userLocation?.coords.longitude ?? -70.6693,
        branch.ubicacion.latitude,
        branch.ubicacion.longitude
      );
      return { ...branch, distance };
    });

    // Ordenar de más cercanas a más lejanas
    withDistance.sort((a, b) => a.distance - b.distance);

    // Obtener las Top 10 más cercanas
    return withDistance.slice(0, 10);
  }, [allBranches, userLocation, selectedBanco, bankDiscounts]);

  const current = bankDiscounts.find((d) => d.banco === selectedBanco) ?? bankDiscounts[0];
  const displayText = current?.detalleTexto ?? '';

  const diasSemana = useMemo(() => [
    { key: 'lunes', label: 'Lun' },
    { key: 'martes', label: 'Mar' },
    { key: 'miercoles', label: 'Mié' },
    { key: 'jueves', label: 'Jue' },
    { key: 'viernes', label: 'Vie' },
    { key: 'sabado', label: 'Sáb' },
    { key: 'domingo', label: 'Dom' },
  ], []);

  const activeDays = useMemo(() => {
    if (!current?.dias_validos || current.dias_validos.length === 0) {
      return ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    }
    const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return current.dias_validos.map(d => normalize(d));
  }, [current]);

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

            <Text style={styles.sectionLabel}>Días del Beneficio</Text>
            <View style={styles.daysContainer}>
              {diasSemana.map((day) => {
                const isActive = activeDays.includes(day.key);
                return (
                  <View
                    key={day.key}
                    style={[
                      styles.dayBadge,
                      isActive ? styles.dayBadgeActive : styles.dayBadgeInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayBadgeText,
                        isActive ? styles.dayBadgeTextActive : styles.dayBadgeTextInactive,
                      ]}
                    >
                      {day.label}
                    </Text>
                  </View>
                );
              })}
            </View>

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

            {/* Botón premium para abrir Modal de sucursales cercanas */}
            <TouchableOpacity
              style={styles.viewBranchesBtn}
              onPress={() => setShowBranchesModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.viewBranchesBtnText}>Ver Sucursales Cercanas 📍</Text>
            </TouchableOpacity>

          </ScrollView>
        </BlurView>
      </View>

      {/* Modal Deslizable (Bottom Sheet) para Sucursales Cercanas */}
      <Modal
        visible={showBranchesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBranchesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={95} tint="dark" style={styles.modalContent}>
            {/* Header del Modal */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>Sucursales Cercanas</Text>
                <Text style={styles.modalSubTitle} numberOfLines={1}>{restaurantName}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowBranchesModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalSeparator} />

            {/* Listado de Sucursales */}
            {loadingBackground ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.modalLoadingText}>Buscando locales cercanos...</Text>
              </View>
            ) : nearbyBranches.length > 0 ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                {nearbyBranches.map((item, index) => {
                  const hasUbicacion = !!item.ubicacion;
                  const distanceText = userLocation && hasUbicacion && item.distance !== Infinity
                    ? `${item.distance.toFixed(1)} km de ti`
                    : null;

                  return (
                    <View key={item.id} style={styles.modalBranchCard}>
                      <View style={styles.modalBranchInfo}>
                        <Text style={styles.modalBranchName} numberOfLines={1}>
                          {index + 1}. {item.nombre_sucursal || item.restaurant_nombre || restaurantName}
                        </Text>
                        <Text style={styles.modalBranchAddress} numberOfLines={1}>
                          📍 {item.direccion || 'Dirección no disponible'}
                        </Text>
                        
                        <View style={styles.modalRatingRow}>
                          <Text style={styles.modalRatingStars}>
                            {item.rating ? '★'.repeat(Math.round(item.rating)) + '☆'.repeat(5 - Math.round(item.rating)) : '★★★★★'}
                          </Text>
                          <Text style={styles.modalReviewsText}>
                            ({item.total_reviews || 0} reviews)
                          </Text>
                          {distanceText && (
                            <Text style={styles.modalDistanceText}>
                              • {distanceText}
                            </Text>
                          )}
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.modalRegisterVisitBtn}
                        onPress={() => {
                          setShowBranchesModal(false);
                          router.push({
                            pathname: '/register-visit',
                            params: {
                              restaurantId: restaurantId as string,
                              branchId: item.id,
                              restaurantName: item.nombre_sucursal || item.restaurant_nombre || restaurantName
                            }
                          });
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.modalRegisterVisitBtnText}>Registrar Visita</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.modalEmptyContainer}>
                <Text style={styles.modalEmptyText}>No hay sucursales disponibles para esta promoción.</Text>
              </View>
            )}
          </BlurView>
        </View>
      </Modal>

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
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 6,
  },
  dayBadge: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dayBadgeActive: {
    backgroundColor: 'rgba(222, 185, 141, 0.15)',
    borderColor: Colors.primary,
  },
  dayBadgeInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    opacity: 0.4,
  },
  dayBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dayBadgeTextActive: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  dayBadgeTextInactive: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  viewBranchesBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  viewBranchesBtnText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '75%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  modalSubTitle: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalSeparator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 24,
  },
  modalLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  modalLoadingText: {
    marginTop: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 15,
  },
  modalScrollContent: {
    padding: 24,
    gap: 16,
  },
  modalBranchCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 16,
    gap: 12,
  },
  modalBranchInfo: {
    flex: 1,
    gap: 4,
  },
  modalBranchName: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: 'bold',
  },
  modalBranchAddress: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  modalRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  modalRatingStars: {
    color: '#FFD700',
    fontSize: 13,
    letterSpacing: 1,
  },
  modalReviewsText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
  },
  modalDistanceText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  modalRegisterVisitBtn: {
    backgroundColor: 'rgba(222, 185, 141, 0.12)',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRegisterVisitBtnText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  modalEmptyText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
