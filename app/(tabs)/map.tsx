import React, { useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { BlurView } from 'expo-blur';
import { getBranches, Branch } from '../../src/services/branches';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import { router } from 'expo-router';

// Estilo oscuro premium (combinando con #2A2445 de la app)
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#313945' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] }
];

// Variables de caché a nivel de módulo para persistir en cambios de tab
let cachedBranches: Branch[] = [];
let cachedDiscountsMap: { 
  [key: string]: { 
    beneficio: string; 
    banco: string; 
    dias_validos: string[]; 
    aplica_todos_los_dias: boolean;
  } 
} | null = null;
let isFullBranchesLoaded = false; // Bandera de estado para la carga en segundo plano completa

// Bancos disponibles para el filtro
const availableBanks = [
  'Todos',
  'Banco Security',
  'Full Copec',
  'Banco Consorcio',
  'Scotiabank',
  'Banco de Chile',
  'Santander',
  'Banco Falabella',
  'Banco Ripley',
  'BCI',
  'Banco BICE',
  'Tenpo'
];

// Días disponibles para el filtro
const availableDays = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'todos', label: 'Todos' },
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' }
];

// Búsqueda rápida por coordenadas (Bounding Box) en Firestore
async function fetchBranchesInRegion(lat: number, lon: number, latDelta: number, lonDelta: number): Promise<Branch[]> {
  const minLat = lat - latDelta;
  const maxLat = lat + latDelta;
  
  try {
    const branchesCol = collection(db, 'branches');
    // Consulta por latitud con un límite estricto de 250 documentos
    const q = query(
      branchesCol,
      where('ubicacion.latitude', '>=', minLat),
      where('ubicacion.latitude', '<=', maxLat),
      limit(250)
    );
    const snap = await getDocs(q);
    const results: Branch[] = [];
    snap.forEach((doc) => {
      const data = doc.data();
      const bLon = data.ubicacion?.longitude;
      // Filtrar por longitud en el cliente
      if (bLon !== undefined && bLon >= lon - lonDelta && bLon <= lon + lonDelta) {
        results.push({
          id: doc.id,
          ...data,
        } as Branch);
      }
    });
    return results;
  } catch (error) {
    console.error('[MapScreen] Error fetching branches in region:', error);
    return [];
  }
}

// Cálculo de distancia de Haversine (en km)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Obtener el nombre del día actual sin tildes y en minúsculas
const getDiaActual = () => {
  const dayIndex = new Date().getDay();
  const unaccentedDays = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  return unaccentedDays[dayIndex];
};

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  // Estados de filtros
  const [selectedBank, setSelectedBank] = useState<string>('Todos');
  const [selectedDay, setSelectedDay] = useState<string>('hoy');
  
  // Coordenadas del centro visible del mapa para cálculos de proximidad
  const [mapCenter, setMapCenter] = useState({
    latitude: -33.4489,
    longitude: -70.6693,
  });

  // Animación del mapa hacia la ubicación del usuario cuando se resuelve
  useEffect(() => {
    if (location && mapRef.current) {
      console.log(`[MapScreen] Animating to position: ${location.coords.latitude}, ${location.coords.longitude}`);
      mapRef.current.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    }
  }, [location]);

  useEffect(() => {
    const startTime = Date.now();
    console.log('[MapScreen] Starting map initialization...');
    
    const initMap = async () => {
      try {
        // 1. Iniciar la obtención de ubicación en segundo plano (no bloqueante)
        const geoPromise = (async () => {
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
              // Obtener última ubicación conocida de forma súper rápida (normalmente <50ms)
              const lastKnown = await Location.getLastKnownPositionAsync({});
              if (lastKnown) {
                setLocation(lastKnown);
                setMapCenter({
                  latitude: lastKnown.coords.latitude,
                  longitude: lastKnown.coords.longitude,
                });
                return lastKnown;
              }

              // Obtener ubicación actual de precisión equilibrada (balanced) en segundo plano
              const current = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });
              setLocation(current);
              setMapCenter({
                latitude: current.coords.latitude,
                longitude: current.coords.longitude,
              });
              return current;
            }
          } catch (locErr) {
            console.warn('[MapScreen] Background location retrieval error:', locErr);
          }
          return null;
        })();

        // 2. Cargar descuentos activos o usar caché (Caché a nivel de módulo)
        const discountsStart = Date.now();
        if (!cachedDiscountsMap) {
          const discountsQuery = query(collection(db, 'discounts'), where('activo', '==', true));
          const discountsSnap = await getDocs(discountsQuery);
          const discountsMap: typeof cachedDiscountsMap = {};
          discountsSnap.forEach((doc) => {
            const data = doc.data();
            if (data.restaurant_id) {
              discountsMap[data.restaurant_id] = {
                beneficio: data.beneficio_porcentaje ? `${data.beneficio_porcentaje}%` : '',
                banco: data.bank_nombre || '',
                dias_validos: data.dias_validos || [],
                aplica_todos_los_dias: data.aplica_todos_los_dias ?? false,
              };
            }
          });
          cachedDiscountsMap = discountsMap;
        }
        console.log(`[MapScreen] Active discounts loaded. Time: ${Date.now() - discountsStart}ms`);

        // Esperar a que la geolocalización rápida inicial se resuelva (normalmente <100ms)
        const initialLoc = await geoPromise;
        const initialLat = initialLoc?.coords.latitude || -33.4489;
        const initialLon = initialLoc?.coords.longitude || -70.6693;

        // 3. FASE 1: Carga rápida del área inicial (~300ms de red)
        const initialBranchesStart = Date.now();
        let initialRawBranches: Branch[] = [];

        if (isFullBranchesLoaded) {
          initialRawBranches = cachedBranches;
          console.log(`[MapScreen] Loaded directly from full memory cache. Count: ${cachedBranches.length}`);
        } else {
          initialRawBranches = await fetchBranchesInRegion(initialLat, initialLon, 0.05, 0.05);
          console.log(`[MapScreen] Phase 1 local branches loaded. Count: ${initialRawBranches.length}. Time: ${Date.now() - initialBranchesStart}ms`);
        }

        // Combinar datos locales con descuentos
        const combined = initialRawBranches.map((branch) => {
          const discount = branch.restaurant_id ? cachedDiscountsMap![branch.restaurant_id] : null;
          return {
            ...branch,
            discountText: discount ? `${discount.beneficio} dcto. con ${discount.banco}` : 'Descuento disponible',
            bankName: discount ? discount.banco : '',
            diasValidos: discount ? discount.dias_validos : [],
            aplicaTodosLosDias: discount ? discount.aplica_todos_los_dias : false,
          };
        });

        setBranches(combined);
        setLoading(false); // FASE 1 COMPLETADA: El usuario ya ve su mapa de inmediato
        console.log(`[MapScreen] Phase 1 completed (loading spinner turned off) in ${Date.now() - startTime}ms`);

        // FASE 2: Carga silenciosa del resto en segundo plano
        if (!isFullBranchesLoaded) {
          console.log('[MapScreen] Phase 2: Starting background query for all branches...');
          getBranches().then((allBranches) => {
            if (allBranches.length > 0) {
              cachedBranches = allBranches;
              isFullBranchesLoaded = true;
              console.log(`[MapScreen] Phase 2 finished. Downloaded ${allBranches.length} branches in background.`);

              // Mapear el total de sucursales con descuentos
              const allCombined = allBranches.map((branch) => {
                const discount = branch.restaurant_id ? cachedDiscountsMap![branch.restaurant_id] : null;
                return {
                  ...branch,
                  discountText: discount ? `${discount.beneficio} dcto. con ${discount.banco}` : 'Descuento disponible',
                  bankName: discount ? discount.banco : '',
                  diasValidos: discount ? discount.dias_validos : [],
                  aplicaTodosLosDias: discount ? discount.aplica_todos_los_dias : false,
                };
              });

              // Fusionar sin duplicados en el estado local de React
              setBranches((prev) => {
                const map = new Map();
                prev.forEach(b => map.set(b.id, b));
                allCombined.forEach(b => map.set(b.id, b));
                return Array.from(map.values());
              });
            }
          }).catch(err => {
            console.error('[MapScreen] Phase 2 error loading all branches:', err);
          });
        }
      } catch (error) {
        console.error('Error inicializando el mapa:', error);
        setLoading(false);
      }
    };

    initMap();
  }, []);

  const handleDetailsPress = (branch: Branch) => {
    if (branch.restaurant_id) {
      router.push({
        pathname: '/details',
        params: {
          restaurantId: branch.restaurant_id,
          initialBanco: (branch as any).bankName || '',
        },
      });
    }
  };

  // Filtrar sucursales, ordenar por distancia al centro del mapa y limitar a las 150 más cercanas
  const filteredBranches = useMemo(() => {
    const dayToFilter = selectedDay.toLowerCase();
    const diaActual = getDiaActual();

    const filtered = branches.filter((branch) => {
      // Filtrar por Banco
      if (selectedBank !== 'Todos') {
        const branchBank = (branch as any).bankName;
        if (!branchBank || branchBank.toLowerCase() !== selectedBank.toLowerCase()) {
          return false;
        }
      }

      // Filtrar por Día de la Semana
      if (dayToFilter !== 'todos') {
        const targetDay = dayToFilter === 'hoy' ? diaActual : dayToFilter;
        
        const aplicaTodosLosDias = (branch as any).aplicaTodosLosDias ?? false;
        const diasValidos = (branch as any).diasValidos || [];
        
        if (!aplicaTodosLosDias) {
          const isDayValid = diasValidos.some((dv: string) => 
            dv.toLowerCase().replace('é', 'e').replace('á', 'a') === targetDay
          );
          if (!isDayValid) return false;
        }
      }

      // Debe tener coordenadas válidas
      return !!(branch.ubicacion?.latitude && branch.ubicacion?.longitude);
    });

    // Calcular distancia al centro actual del mapa y ordenar
    const withDistance = filtered.map((branch) => {
      const distance = calculateDistance(
        mapCenter.latitude,
        mapCenter.longitude,
        branch.ubicacion!.latitude,
        branch.ubicacion!.longitude
      );
      return { ...branch, distance };
    });

    withDistance.sort((a, b) => a.distance - b.distance);

    // Retornar sólo las 150 sucursales más cercanas
    return withDistance.slice(0, 150);
  }, [branches, selectedBank, selectedDay, mapCenter]);

  // Manejar arrastres y zoom en el mapa
  const handleRegionChange = async (region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }) => {
    setMapCenter({ latitude: region.latitude, longitude: region.longitude });
    
    // Si la descarga en segundo plano ya terminó, todo está en memoria local, no consultamos Firestore
    if (isFullBranchesLoaded) {
      return;
    }

    // Evitar consultar Firestore en zoom-out extremos
    if (region.latitudeDelta > 3) return;

    console.log(`[MapScreen] Fetching new bounds incrementally (full cache not ready yet)...`);
    try {
      const newRawBranches = await fetchBranchesInRegion(region.latitude, region.longitude, region.latitudeDelta, region.longitudeDelta);
      if (newRawBranches.length > 0 && cachedDiscountsMap) {
        const combined = newRawBranches.map((branch) => {
          const discount = branch.restaurant_id ? cachedDiscountsMap![branch.restaurant_id] : null;
          return {
            ...branch,
            discountText: discount ? `${discount.beneficio} dcto. con ${discount.banco}` : 'Descuento disponible',
            bankName: discount ? discount.banco : '',
            diasValidos: discount ? discount.dias_validos : [],
            aplicaTodosLosDias: discount ? discount.aplica_todos_los_dias : false,
          };
        });

        setBranches((prev) => {
          const map = new Map();
          prev.forEach(b => map.set(b.id, b));
          combined.forEach(b => map.set(b.id, b));
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.warn('[MapScreen] Incremental query failed:', err);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DEB98D" />
        <Text style={styles.loadingText}>Cargando descuentos cercanos...</Text>
      </View>
    );
  }

  const defaultLocation = {
    latitude: location?.coords.latitude || -33.4489,
    longitude: location?.coords.longitude || -70.6693,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={styles.container}>
      {/* Contenedor flotante de filtros */}
      <View style={styles.filterContainer}>
        <BlurView intensity={85} tint="dark" style={styles.filterBlur}>
          {/* Selector de Días */}
          <Text style={styles.filterLabel}>Día</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
          >
            {availableDays.map((day) => (
              <TouchableOpacity
                key={day.key}
                style={[
                  styles.pill,
                  selectedDay === day.key && styles.activePill,
                ]}
                onPress={() => setSelectedDay(day.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pillText,
                    selectedDay === day.key && styles.activePillText,
                  ]}
                >
                  {day.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Selector de Bancos */}
          <Text style={styles.filterLabel}>Banco</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
            style={{ marginBottom: 0 }}
          >
            {availableBanks.map((bank) => (
              <TouchableOpacity
                key={bank}
                style={[
                  styles.pill,
                  selectedBank === bank && styles.activePill,
                ]}
                onPress={() => setSelectedBank(bank)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pillText,
                    selectedBank === bank && styles.activePillText,
                  ]}
                >
                  {bank === 'Todos' ? 'Todos los Bancos' : bank}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </BlurView>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        customMapStyle={darkMapStyle}
        initialRegion={defaultLocation}
        showsUserLocation={true}
        showsMyLocationButton={true}
        onPress={() => setSelectedBranch(null)} // Cerrar tarjeta al presionar fuera
        onRegionChangeComplete={handleRegionChange}
      >
        {filteredBranches.map((branch) => {
          if (!branch.ubicacion?.latitude || !branch.ubicacion?.longitude) return null;
          
          return (
            <Marker
              key={branch.id}
              coordinate={{
                latitude: branch.ubicacion.latitude,
                longitude: branch.ubicacion.longitude,
              }}
              pinColor="#DEB98D" // Pin nativo dorado
              onPress={(e) => {
                e.stopPropagation(); // Evitar que el mapa reciba el evento y cierre la tarjeta
                setSelectedBranch(branch);
              }}
            />
          );
        })}
      </MapView>

      {/* Tarjeta de detalle flotante al estilo de Google Maps / Airbnb */}
      {selectedBranch && (
        <View style={styles.cardContainer}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => setSelectedBranch(null)}
            activeOpacity={0.7}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          
          <Text style={styles.restaurantName} numberOfLines={1}>
            {selectedBranch.restaurant_nombre || 'Descuento'}
          </Text>
          <Text style={styles.discountText}>
            {selectedBranch.discountText}
          </Text>
          {selectedBranch.direccion ? (
            <Text style={styles.addressText} numberOfLines={1}>
              📍 {selectedBranch.direccion}
            </Text>
          ) : null}

          <TouchableOpacity 
            style={styles.button}
            onPress={() => handleDetailsPress(selectedBranch)}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Ver detalles de promoción</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2A2445',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#2A2445',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#DEB98D',
    fontSize: 16,
    fontWeight: '600',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  cardContainer: {
    position: 'absolute',
    bottom: 90,
    left: 20,
    right: 20,
    backgroundColor: '#2A2445',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#DEB98D',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 16,
    padding: 6,
    zIndex: 10,
  },
  closeText: {
    color: '#DEB98D',
    fontSize: 16,
    fontWeight: 'bold',
  },
  restaurantName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    paddingRight: 24, // Evitar que el texto choque con el botón de cerrar
  },
  discountText: {
    color: '#4ADE80', // Verde de descuento
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  addressText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#DEB98D',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#2A2445',
    fontSize: 14,
    fontWeight: 'bold',
  },
  filterContainer: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 100,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(222, 185, 141, 0.2)',
  },
  filterBlur: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  filterLabel: {
    color: '#DEB98D',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scrollContainer: {
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  activePill: {
    backgroundColor: '#DEB98D',
    borderColor: '#DEB98D',
  },
  pillText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  activePillText: {
    color: '#2A2445',
    fontWeight: 'bold',
  },
});
