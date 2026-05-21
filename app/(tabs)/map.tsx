import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { getBranches, Branch } from '../../src/services/branches';
import { collection, getDocs, query, where } from 'firebase/firestore';
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

export default function MapScreen() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  useEffect(() => {
    const initMap = async () => {
      try {
        // 1. Pedir permisos de ubicación
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const userLoc = await Location.getCurrentPositionAsync({});
          setLocation(userLoc);
        }

        // 2. Cargar sucursales de Firebase
        const branchesData = await getBranches();

        // 3. Cargar descuentos activos
        const discountsQuery = query(collection(db, 'discounts'), where('activo', '==', true));
        const discountsSnap = await getDocs(discountsQuery);
        const discountsMap: { [key: string]: { beneficio: string; banco: string } } = {};
        discountsSnap.forEach((doc) => {
          const data = doc.data();
          if (data.restaurant_id) {
            discountsMap[data.restaurant_id] = {
              beneficio: data.beneficio_porcentaje ? `${data.beneficio_porcentaje}%` : '',
              banco: data.bank_nombre || '',
            };
          }
        });

        // 4. Combinar datos
        const combined = branchesData.map((branch) => {
          const discount = branch.restaurant_id ? discountsMap[branch.restaurant_id] : null;
          
          return {
            ...branch,
            discountText: discount ? `${discount.beneficio} dcto. con ${discount.banco}` : 'Descuento disponible',
            bankName: discount ? discount.banco : '',
          };
        });

        setBranches(combined);
      } catch (error) {
        console.error('Error inicializando el mapa:', error);
      } finally {
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
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        customMapStyle={darkMapStyle}
        initialRegion={defaultLocation}
        showsUserLocation={true}
        showsMyLocationButton={true}
        onPress={() => setSelectedBranch(null)} // Cerrar tarjeta al presionar fuera
      >
        {branches.map((branch) => {
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
});
