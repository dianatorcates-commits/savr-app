import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/theme';
import { authService } from '../services/auth';
import { getUserProfile } from '../services/firebaseUsers';
import { getRecentFriends } from '../services/friends';
import { getUserBills } from '../services/bills';
import { getUserVisits } from '../services/visits';
import { UserProfile, Friend, VisitReview } from '../types';
import { SavedBill } from '../types/bill';

export default function ExportDataScreen() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [visits, setVisits] = useState<VisitReview[]>([]);
  const [bills, setBills] = useState<SavedBill[]>([]);

  useEffect(() => {
    loadAllUserData();
  }, []);

  const loadAllUserData = async () => {
    const user = authService.getCurrentUser();
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const [fetchedProfile, fetchedFriends, fetchedVisits, fetchedBills] = await Promise.all([
        getUserProfile(user.uid),
        getRecentFriends(user.uid),
        getUserVisits(user.uid),
        getUserBills(user.uid)
      ]);

      if (fetchedProfile) setProfile(fetchedProfile);
      setFriends(fetchedFriends);
      setVisits(fetchedVisits);
      setBills(fetchedBills);
    } catch (error) {
      console.error('Error cargando los datos para exportar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportJSON = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setExporting(true);

    const exportObject = {
      generadoEl: new Date().toISOString(),
      perfil: profile ? {
        uid: profile.uid,
        nombre: profile.nombre || 'Usuario',
        email: profile.email,
        proveedor: profile.proveedor,
        fechaRegistro: profile.fechaRegistro ? new Date(profile.fechaRegistro).toISOString() : null,
        ultimoLogin: profile.ultimoLogin ? new Date(profile.ultimoLogin).toISOString() : null,
        bancoPrincipal: profile.preferences?.bank?.name || null,
        comidasFavoritas: profile.preferences?.foodPreferences || []
      } : null,
      amigos: friends.map(f => ({
        nombre: f.name,
        email: f.email || null,
        estado: f.status,
        agregadoEl: f.createdAt ? new Date(f.createdAt).toISOString() : null
      })),
      visitas: visits.map(v => ({
        id: v.id,
        fecha: v.createdAt ? new Date(v.createdAt).toISOString() : null,
        calificacionGeneral: v.rating,
        calificacionComida: v.foodRating,
        calificacionServicio: v.serviceRating,
        leGusto: v.likedIt,
        volveria: v.wouldReturn
      })),
      cuentasDivididas: bills.map(b => ({
        id: b.id,
        restaurante: b.restaurantName,
        total: b.grandTotal,
        descuento: b.generalDiscount,
        propinaMonto: b.grandTotalTip,
        propinaPorcentaje: b.tipPercentage,
        fecha: b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate().toISOString() : new Date(b.createdAt).toISOString()) : null,
        participantes: b.friends.map(f => ({
          nombre: f.name,
          montoTotal: f.totalAmount,
          estadoPago: f.paymentStatus
        }))
      }))
    };

    try {
      const jsonString = JSON.stringify(exportObject, null, 2);
      await Share.share({
        message: jsonString,
        title: 'Mis Datos - Savr'
      });
    } catch (error) {
      console.error('Error al exportar los datos:', error);
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (dateValue: any) => {
    if (!dateValue) return 'N/A';
    let date: Date;
    if (typeof dateValue.toDate === 'function') {
      date = dateValue.toDate();
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'number' || typeof dateValue === 'string') {
      date = new Date(dateValue);
    } else if (dateValue.seconds !== undefined) {
      date = new Date(dateValue.seconds * 1000);
    } else {
      date = new Date(dateValue);
    }
    return date.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Preparando tus datos...</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[Colors.background, Colors.backgroundSecondary]}
      style={styles.container}
    >
      <View style={[styles.decorativeCircle, styles.circle1]} />
      <View style={[styles.decorativeCircle, styles.circle2]} />

      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tus Datos Guardados</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* DATOS DE PERFIL */}
          <BlurView intensity={40} tint="dark" style={styles.card}>
            <Text style={styles.sectionTitle}>Datos del Usuario</Text>
            <View style={styles.profileList}>
              <View style={styles.listItem}>
                <Text style={styles.listLabel}>Nombre:</Text>
                <Text style={styles.listValue}>{profile?.nombre || 'No registrado'}</Text>
              </View>
              <View style={styles.listItem}>
                <Text style={styles.listLabel}>Email:</Text>
                <Text style={styles.listValue}>{profile?.email || 'N/A'}</Text>
              </View>
              <View style={styles.listItem}>
                <Text style={styles.listLabel}>Proveedor:</Text>
                <Text style={styles.listValue}>{profile?.proveedor === 'apple' ? ' Apple' : '🌐 Google'}</Text>
              </View>
              <View style={styles.listItem}>
                <Text style={styles.listLabel}>Registro:</Text>
                <Text style={styles.listValue}>{formatDate(profile?.fechaRegistro)}</Text>
              </View>
              <View style={styles.listItem}>
                <Text style={styles.listLabel}>Banco principal:</Text>
                <Text style={styles.listValue}>{profile?.preferences?.bank?.name || 'No configurado'}</Text>
              </View>
            </View>
          </BlurView>

          {/* AMIGOS */}
          <BlurView intensity={40} tint="dark" style={styles.card}>
            <Text style={styles.sectionTitle}>Amigos Registrados</Text>
            {friends.length === 0 ? (
              <Text style={styles.emptyText}>No tienes amigos registrados.</Text>
            ) : (
              <View style={styles.profileList}>
                {friends.map((friend, idx) => (
                  <View key={idx} style={styles.listItem}>
                    <Text style={styles.listLabel}>{friend.name}</Text>
                    <Text style={styles.listValue}>{friend.status === 'agregado' ? 'Agregado ✅' : 'Pendiente ⏳'}</Text>
                  </View>
                ))}
              </View>
            )}
          </BlurView>

          {/* VISITAS (TABLA) */}
          <BlurView intensity={40} tint="dark" style={styles.card}>
            <Text style={styles.sectionTitle}>Visitas Registradas</Text>
            {visits.length === 0 ? (
              <Text style={styles.emptyText}>No has registrado visitas.</Text>
            ) : (
              <View style={styles.table}>
                {/* Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.headerCell, { flex: 1.5 }]}>Fecha</Text>
                  <Text style={[styles.headerCell, { flex: 1 }]}>General</Text>
                  <Text style={[styles.headerCell, { flex: 1 }]}>Comida</Text>
                  <Text style={[styles.headerCell, { flex: 1 }]}>Servicio</Text>
                </View>
                {/* Rows */}
                {visits.map((visit, idx) => (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={[styles.cell, { flex: 1.5 }]}>{formatDate(visit.createdAt)}</Text>
                    <Text style={[styles.cell, { flex: 1 }]}>⭐ {visit.rating}</Text>
                    <Text style={[styles.cell, { flex: 1 }]}>⭐ {visit.foodRating}</Text>
                    <Text style={[styles.cell, { flex: 1 }]}>⭐ {visit.serviceRating}</Text>
                  </View>
                ))}
              </View>
            )}
          </BlurView>

          {/* CUENTAS (TABLA) */}
          <BlurView intensity={40} tint="dark" style={styles.card}>
            <Text style={styles.sectionTitle}>Cuentas Divididas</Text>
            {bills.length === 0 ? (
              <Text style={styles.emptyText}>No tienes cuentas registradas.</Text>
            ) : (
              <View style={styles.table}>
                {/* Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.headerCell, { flex: 2 }]}>Restaurante</Text>
                  <Text style={[styles.headerCell, { flex: 1.5 }]}>Fecha</Text>
                  <Text style={[styles.headerCell, { flex: 1.2 }]}>Total</Text>
                </View>
                {/* Rows */}
                {bills.map((bill, idx) => (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={[styles.cell, { flex: 2, fontWeight: 'bold' }]} numberOfLines={1}>
                      {bill.restaurantName}
                    </Text>
                    <Text style={[styles.cell, { flex: 1.5 }]}>{formatDate(bill.createdAt)}</Text>
                    <Text style={[styles.cell, { flex: 1.2, color: Colors.primary }]}>
                      ${Math.round(bill.grandTotal).toLocaleString('es-CL')}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </BlurView>

          {/* ACCIÓN EXPORTAR */}
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={handleExportJSON}
            disabled={exporting}
            activeOpacity={0.8}
          >
            {exporting ? (
              <ActivityIndicator color={Colors.background} />
            ) : (
              <>
                <Ionicons name="share-social-outline" size={20} color={Colors.background} style={{ marginRight: 8 }} />
                <Text style={styles.exportBtnText}>Exportar como JSON</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    marginTop: 12,
    fontWeight: '500',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(30, 27, 50, 0.65)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 16,
  },
  profileList: {
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 10,
  },
  listLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
  listValue: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 12,
  },
  table: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerCell: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: 'bold',
    fontSize: 13,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  cell: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
  },
  exportBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  exportBtnText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
