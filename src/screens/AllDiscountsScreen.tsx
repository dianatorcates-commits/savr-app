import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, Platform, StatusBar, Modal, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useDiscounts, DiscountCard } from '../hooks/useDiscounts';
import { Colors } from '../../constants/theme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function AllDiscountsScreen() {
  const { day, pais, region } = useLocalSearchParams<{ day?: string; pais?: string; region?: string }>();

  const [selectedCountry, setSelectedCountry] = useState<string>(pais !== undefined ? pais : 'Chile');
  const [selectedRegion, setSelectedRegion] = useState<string>(region || '');
  const { discounts, loading } = useDiscounts(selectedCountry, selectedRegion);
  const [searchQuery, setSearchQuery] = useState('');
  const insets = useSafeAreaInsets();

  interface Country {
    id: string;
    pais: string;
  }

  interface Region {
    id: string;
    region: string;
    pais_id: string;
    region_id?: number;
  }

  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  
  const [showRegionModal, setShowRegionModal] = useState(false);

  useEffect(() => {
    if (pais !== undefined) {
      setSelectedCountry(pais);
    }
  }, [pais]);

  useEffect(() => {
    if (region !== undefined) {
      setSelectedRegion(region);
    }
  }, [region]);

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
            rList.push({
              id: d.id,
              region: data.region,
              pais_id: data.pais_id || '',
              region_id: typeof data.region_id === 'number' ? data.region_id : undefined
            });
          }
        });
        rList.sort((a, b) => {
          const idA = a.region_id !== undefined ? a.region_id : Number.MAX_SAFE_INTEGER;
          const idB = b.region_id !== undefined ? b.region_id : Number.MAX_SAFE_INTEGER;
          if (idA !== idB) {
            return idA - idB;
          }
          return a.region.localeCompare(b.region);
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

  const filteredDiscounts = useMemo(() => {
    let result = discounts;

    // Filter by day if provided
    if (day) {
      const targetDay = day.toLowerCase();
      result = result.filter(d => 
        d.dias_validos && d.dias_validos.some(dia => 
          dia.toLowerCase().replace('é', 'e').replace('á', 'a') === targetDay
        )
      );
    }

    // Filter by search query
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.restaurante.toLowerCase().includes(lowerQuery) ||
          d.banco.toLowerCase().includes(lowerQuery)
      );
    }

    return result;
  }, [discounts, searchQuery, day]);

  const renderDiscountCard = ({ item }: { item: DiscountCard }) => (
    <TouchableOpacity
      style={styles.cardWrapper}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/details', params: { restaurantId: item.restaurantId, initialBanco: item.banco } })}
    >
      <View style={[styles.discountCard, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
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
          <Text style={styles.bankName} numberOfLines={1}>{item.banco}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4, 5, 6].map((key) => (
        <View key={key} style={styles.cardWrapper}>
          <View style={styles.skeletonCard}>
            <View style={styles.skeletonImage} />
            <View style={styles.skeletonBody}>
              <View style={styles.skeletonTextLarge} />
              <View style={styles.skeletonTextSmall} />
            </View>
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
      {/* Círculos decorativos */}
      <View style={[styles.decorativeCircle, styles.circle1]} />
      <View style={[styles.decorativeCircle, styles.circle2]} />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Todos los Descuentos</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <BlurView intensity={20} tint="light" style={styles.searchBlur}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar restaurantes o bancos..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.clearIcon}>✖</Text>
              </TouchableOpacity>
            )}
          </BlurView>
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
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

        {/* Day Filter Chip (if active) */}
        {day && (
          <View style={styles.filterChipContainer}>
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>Descuentos del día</Text>
            </View>
          </View>
        )}

        {/* Grid List */}
        {loading ? (
          renderSkeleton()
        ) : (
          <FlatList
            data={filteredDiscounts}
            renderItem={renderDiscountCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
            columnWrapperStyle={styles.columnWrapper}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No se encontraron descuentos.</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>

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
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  backIcon: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterChipContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  filterChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(222, 185, 141, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  filterChipText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  searchBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: Colors.white,
    fontSize: 15,
  },
  clearIcon: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 12,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  cardWrapper: {
    width: '48%',
  },
  discountCard: {
    borderRadius: 20,
    overflow: 'hidden',
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
    top: 10,
    left: 10,
    backgroundColor: 'rgba(30, 27, 50, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(222, 185, 141, 0.3)',
  },
  beneficioText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  cardBody: {
    padding: 12,
  },
  restaurantName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
  },
  bankName: {
    fontSize: 12,
    color: Colors.primaryLight,
    fontWeight: '500',
  },
  skeletonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  skeletonCard: {
    width: '100%',
    height: 180,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
    marginBottom: 16,
  },
  skeletonImage: {
    width: '100%',
    height: 120,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  skeletonBody: {
    padding: 12,
  },
  skeletonTextLarge: {
    width: '80%',
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    marginBottom: 8,
  },
  skeletonTextSmall: {
    width: '50%',
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.inactive,
    fontSize: 16,
  },
  filtersContainer: {
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 16,
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
});
