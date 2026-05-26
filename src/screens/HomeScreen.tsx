import { router } from 'expo-router';
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { authService } from '../services/auth';
import { useDiscounts, DiscountCard } from '../hooks/useDiscounts';
import { getUserVisitsCountForCurrentMonth } from '../services/visits';
import { getUserMonthlySavings } from '../services/bills';
import { Colors } from '../../constants/theme';

export default function HomeScreen() {
  const user = authService.getCurrentUser();
  const nombre = user?.nombre || 'Usuario';
  const [selectedCountry] = useState<string>('Chile');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const { discounts, loading: loadingDiscounts } = useDiscounts(selectedCountry, selectedRegion, 100);
  const [visitsCount, setVisitsCount] = useState(0);
  const [savingsCount, setSavingsCount] = useState(0);

  interface Country {
    id: string;
    pais: string;
  }

  interface Region {
    id: string;
    region: string;
    pais_id: string;
  }

  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  
  const [showRegionModal, setShowRegionModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const cSnap = await getDocs(collection(db, 'countries'));
        const rSnap = await getDocs(collection(db, 'regions'));
        
        const cList: Country[] = [];
        cSnap.forEach(d => {
          const data = d.data();
          if (data.pais) {
            cList.push({ id: d.id, pais: data.pais });
          }
        });
        setCountries(cList);

        const rList: Region[] = [];
        rSnap.forEach(d => {
          const data = d.data();
          if (data.region) {
            rList.push({ id: d.id, region: data.region, pais_id: data.pais_id || '' });
          }
        });
        setRegions(rList);
      } catch (err) {
        console.error('Error fetching countries/regions:', err);
      }
    })();
  }, []);

  const filteredRegions = useMemo(() => {
    if (!selectedCountry) {
      return regions;
    }
    const countryObj = countries.find(c => c.pais === selectedCountry);
    if (!countryObj) return [];
    return regions.filter(r => r.pais_id === countryObj.id);
  }, [selectedCountry, countries, regions]);

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

        getUserMonthlySavings(user.uid)
          .then((savings) => {
            setSavingsCount(savings);
          })
          .catch((err) => {
            console.error('Error fetching monthly savings:', err);
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
              <Text style={styles.statNumber}>${Math.round(savingsCount).toLocaleString('es-CL')} Ahorrados</Text>
            </View>
          </View>
        </BlurView>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <Text style={styles.filtersLabel}>Filtrar por:</Text>
          <View style={styles.filtersRow}>
            <TouchableOpacity 
              style={styles.filterPill} 
              onPress={() => setShowRegionModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.filterPillText} numberOfLines={1}>
                {selectedRegion ? selectedRegion : 'Todas las Regiones'}
              </Text>
              <Text style={styles.filterIcon}>▼</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Descuentos del Día Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Descuentos del día</Text>
          <TouchableOpacity onPress={() => router.push({ pathname: '/all-discounts', params: { day: diaActual, pais: selectedCountry, region: selectedRegion } })}>
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
          <TouchableOpacity onPress={() => router.push({ pathname: '/all-discounts', params: { pais: selectedCountry, region: selectedRegion } })}>
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

      {/* Region Modal */}
      <Modal visible={showRegionModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecciona una Región</Text>
            <ScrollView style={{maxHeight: 300}}>
              <TouchableOpacity 
                style={styles.modalOption} 
                onPress={() => { setSelectedRegion(''); setShowRegionModal(false); }}
              >
                <Text style={styles.modalOptionText}>Todas las Regiones</Text>
              </TouchableOpacity>
              {filteredRegions.map(r => (
                <TouchableOpacity 
                  key={r.id}
                  style={styles.modalOption} 
                  onPress={() => { setSelectedRegion(r.region); setShowRegionModal(false); }}
                >
                  <Text style={styles.modalOptionText}>{r.region}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowRegionModal(false)}>
              <Text style={styles.modalCloseButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  filtersContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 24,
  },
  filtersLabel: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterPill: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  filterPillText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  filterIcon: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.background,
    width: '100%',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    color: Colors.white,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  modalOptionText: {
    fontSize: 16,
    color: Colors.white,
    textAlign: 'center',
  },
  modalCloseButton: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: 'bold',
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
