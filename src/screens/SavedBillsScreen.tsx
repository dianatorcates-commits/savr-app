import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
  RefreshControl,
  Share,
  SafeAreaView,
  Platform,
  StatusBar,
  Alert
} from 'react-native';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Colors } from '../../constants/theme';
import { authService } from '../services/auth';
import { getUserBills, updateBillFriends, softDeleteBill } from '../services/bills';
import { SavedBill } from '../types/bill';

export default function SavedBillsScreen() {
  const user = authService.getCurrentUser();
  const [bills, setBills] = useState<SavedBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBill, setSelectedBill] = useState<SavedBill | null>(null);

  const loadBills = useCallback(async (showIndicator = true) => {
    if (!user) return;
    if (showIndicator) setLoading(true);
    try {
      const fetchedBills = await getUserBills(user.uid);
      setBills(fetchedBills);
    } catch (error) {
      console.error('Error cargando cuentas guardadas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  const onRefresh = () => {
    setRefreshing(true);
    loadBills(false);
  };

  const handleDeleteBill = useCallback((billId: string) => {
    Alert.alert(
      'Eliminar Cuenta',
      '¿Estás seguro que deseas eliminar esta cuenta? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await softDeleteBill(billId);
              setSelectedBill(null);
              setBills((prev) => prev.filter((b) => b.id !== billId));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error('Error al eliminar cuenta:', error);
              Alert.alert('Error', 'No se pudo eliminar la cuenta. Intenta nuevamente.');
            }
          },
        },
      ]
    );
  }, []);

  const getBillGlobalStatus = (bill: SavedBill) => {
    if (!bill.friends || bill.friends.length === 0) {
      return { label: 'Sin participantes', color: '#9BA1A6', isCompleted: true };
    }
    const paidCount = bill.friends.filter(f => f.paymentStatus === 'pagado').length;
    const totalCount = bill.friends.length;

    if (paidCount === totalCount) {
      return { label: 'Completado ✅', color: '#4ECDC4', isCompleted: true };
    }
    return {
      label: `Pendiente (${paidCount}/${totalCount} pagados) ⏳`,
      color: '#DEB98D',
      isCompleted: false
    };
  };

  const formatDate = (createdAt: any) => {
    if (!createdAt) return 'Fecha desconocida';
    let date: Date;
    if (typeof createdAt.toDate === 'function') {
      date = createdAt.toDate();
    } else if (createdAt instanceof Date) {
      date = createdAt;
    } else if (typeof createdAt === 'number') {
      date = new Date(createdAt);
    } else if (createdAt.seconds !== undefined) {
      date = new Date(createdAt.seconds * 1000);
    } else {
      date = new Date(createdAt);
    }
    return date.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleFriendStatus = async (friendId: string) => {
    if (!selectedBill || !selectedBill.id) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Map new status
    const updatedFriends = selectedBill.friends.map(f => {
      if (f.friendId === friendId) {
        return {
          ...f,
          paymentStatus: f.paymentStatus === 'pagado' ? ('pendiente' as const) : ('pagado' as const)
        };
      }
      return f;
    });

    const updatedBill = {
      ...selectedBill,
      friends: updatedFriends
    };

    // Optimistic update
    setSelectedBill(updatedBill);
    setBills(prevBills => prevBills.map(b => b.id === selectedBill.id ? updatedBill : b));

    try {
      await updateBillFriends(selectedBill.id, updatedFriends);
    } catch (error) {
      console.error('Error al actualizar estado de pago:', error);
      // Revert if error
      loadBills(false);
    }
  };

  const handleShareAgain = async (bill: SavedBill) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    let message = `🧾 *Resumen de la Cuenta*\n`;
    if (bill.restaurantName) {
      message += `📍 Restaurante: *${bill.restaurantName}*\n`;
    }
    message += `📅 Fecha: ${formatDate(bill.createdAt)}\n`;
    
    const subtotalBase = bill.friends.reduce((sum, f) => sum + f.baseAmount, 0);
    message += `Subtotal Base: $${Math.round(subtotalBase).toLocaleString('es-CL')}\n`;
    
    if (bill.generalDiscount > 0) {
      message += `Descuento General: -$${Math.round(bill.generalDiscount).toLocaleString('es-CL')}\n`;
    }
    message += `Propina (${bill.tipPercentage}%): $${Math.round(bill.grandTotalTip).toLocaleString('es-CL')}\n`;
    message += `*Total Final: $${Math.round(bill.grandTotal).toLocaleString('es-CL')}*\n\n`;
    
    message += `👤 *Detalle de pago por persona:*\n`;
    bill.friends.forEach(f => {
      if (f.totalAmount > 0) {
        const statusEmoji = f.paymentStatus === 'pagado' ? '✅ Pagado' : '⏳ Pendiente';
        message += `\n*${f.name}: $${Math.round(f.totalAmount).toLocaleString('es-CL')}* (${statusEmoji})\n`;
        
        f.consumedItems.forEach(item => {
          message += `   • ${item.name}: $${Math.round(item.splitPrice).toLocaleString('es-CL')}\n`;
        });
        message += `   ----------------\n`;
        message += `   Consumo base: $${Math.round(f.baseAmount).toLocaleString('es-CL')}\n`;
        if (f.tipAmount > 0) {
          message += `   Propina: $${Math.round(f.tipAmount).toLocaleString('es-CL')}\n`;
        }
      }
    });

    const unassignedItems = bill.consumedItems?.filter(item => item.status === 'Sin Asignar') || [];
    if (unassignedItems.length > 0) {
      message += `\n📌 *Platos sin asignar:*\n`;
      unassignedItems.forEach(item => {
        message += `   • ${item.name}: $${Math.round(item.price).toLocaleString('es-CL')}\n`;
      });
    }

    message += `\n💰 Por favor transferir a mi cuenta. ¡Muchas gracias!`;

    try {
      await Share.share({ message });
    } catch (error) {
      console.error('Error compartiendo la cuenta:', error);
    }
  };

  const renderBillItem = ({ item }: { item: SavedBill }) => {
    const status = getBillGlobalStatus(item);
    const consumedItems = item.consumedItems || [];
    const totalCount = consumedItems.length;
    const assignedCount = consumedItems.filter(i => i.status === 'Asignado').length;
    const hasPendingAssignments = totalCount > 0 && assignedCount !== totalCount;

    return (
      <Animated.View entering={FadeInDown.duration(400)}>
        <TouchableOpacity
          style={styles.billCard}
          onPress={() => setSelectedBill(item)}
          activeOpacity={0.8}
        >
          <View style={styles.billCardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.restaurantName} numberOfLines={1}>
                {item.restaurantName}
              </Text>
              <Text style={styles.billDate}>{formatDate(item.createdAt)}</Text>
            </View>
            <View style={styles.totalBadge}>
              <Text style={styles.totalAmountText}>
                ${Math.round(item.grandTotal).toLocaleString('es-CL')}
              </Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.billCardFooter}>
            <View style={{ gap: 6, alignItems: 'flex-start', flex: 1 }}>
              {hasPendingAssignments && (
                <View style={[styles.statusBadge, { borderColor: '#DEB98D40', backgroundColor: '#DEB98D15' }]}>
                  <Text style={[styles.statusText, { color: '#DEB98D' }]}>
                    Pendiente ({assignedCount}/{totalCount} platos asignados) ⏳
                  </Text>
                </View>
              )}
              <View style={[styles.statusBadge, { borderColor: status.color + '40', backgroundColor: status.color + '15' }]}>
                <Text style={[styles.statusText, { color: status.color }]}>
                  {status.label}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando historial...</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[Colors.background, Colors.backgroundSecondary]}
      style={styles.container}
    >
      {/* Círculos decorativos de fondo */}
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
          <Text style={styles.headerTitle}>Cuentas Guardadas</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlatList
          data={bills}
          renderItem={renderBillItem}
          keyExtractor={item => item.id || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={80} color="rgba(255,255,255,0.15)" />
              <Text style={styles.emptyTitle}>Sin cuentas registradas</Text>
              <Text style={styles.emptySubtitle}>
                Las cuentas que dividas con tus amigos se guardarán automáticamente aquí.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/(tabs)/split')}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyBtnText}>Dividir nueva cuenta</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </SafeAreaView>

      {/* MODAL DE DETALLE EN BLUR */}
      <Modal
        visible={selectedBill !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedBill(null)}
      >
        {selectedBill && (
          <View style={styles.modalOverlay}>
            <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFillObject} />
            <SafeAreaView style={styles.modalContainer}>
              <Animated.View 
                entering={FadeInDown.duration(300)}
                style={styles.modalContent}
              >
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle} numberOfLines={1}>
                      {selectedBill.restaurantName}
                    </Text>
                    <Text style={styles.modalDate}>{formatDate(selectedBill.createdAt)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setSelectedBill(null)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close" size={24} color={Colors.white} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                  {/* RESUMEN DE LA CUENTA */}
                  <View style={styles.modalSummaryBox}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Total Cuenta</Text>
                      <Text style={styles.summaryValueGold}>
                        ${Math.round(selectedBill.grandTotal).toLocaleString('es-CL')}
                      </Text>
                    </View>
                    <View style={styles.modalDivider} />
                    {selectedBill.generalDiscount > 0 && (
                      <View style={styles.summarySubRow}>
                        <Text style={styles.summarySubLabel}>Descuento Aplicado</Text>
                        <Text style={styles.summarySubValueGreen}>
                          -${Math.round(selectedBill.generalDiscount).toLocaleString('es-CL')}
                        </Text>
                      </View>
                    )}
                    <View style={styles.summarySubRow}>
                      <Text style={styles.summarySubLabel}>Propina ({selectedBill.tipPercentage}%)</Text>
                      <Text style={styles.summarySubValue}>
                        ${Math.round(selectedBill.grandTotalTip).toLocaleString('es-CL')}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.participantsTitle}>Participantes y Pagos</Text>

                  {/* LISTADO DE AMIGOS */}
                  <View style={styles.friendsListContainer}>
                    {selectedBill.friends.map(friend => {
                      const isPaid = friend.paymentStatus === 'pagado';
                      return (
                        <View key={friend.friendId} style={styles.friendRow}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={styles.friendName}>{friend.name}</Text>
                            <Text style={styles.friendAmount}>
                              Total: ${Math.round(friend.totalAmount).toLocaleString('es-CL')}
                            </Text>
                            
                            {/* Ítems consumidos en tamaño pequeño */}
                            <View style={styles.consumedItemsBox}>
                              {friend.consumedItems.map((item, idx) => (
                                <Text key={idx} style={styles.consumedItemText}>
                                  • {item.name} (${Math.round(item.splitPrice).toLocaleString('es-CL')})
                                </Text>
                              ))}
                            </View>
                          </View>

                          <TouchableOpacity
                            style={[
                              styles.friendStatusBtn,
                              isPaid ? styles.statusPaidBtn : styles.statusPendingBtn
                            ]}
                            onPress={() => toggleFriendStatus(friend.friendId)}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.friendStatusText,
                                isPaid ? styles.statusPaidText : styles.statusPendingText
                              ]}
                            >
                              {isPaid ? 'Pagado ✅' : 'Pendiente ⏳'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>

                  {/* PLATOS SIN ASIGNAR */}
                  {(() => {
                    const unassigned = selectedBill.consumedItems?.filter(i => i.status === 'Sin Asignar') || [];
                    if (unassigned.length === 0) return null;
                    return (
                      <View style={{ marginTop: 24 }}>
                        <Text style={styles.participantsTitle}>Platos Sin Asignar</Text>
                        <View style={styles.unassignedContainer}>
                          {unassigned.map((item, idx) => (
                            <View key={idx} style={styles.unassignedRow}>
                              <Text style={styles.unassignedName} numberOfLines={1}>{item.name}</Text>
                              <Text style={styles.unassignedPrice}>
                                ${Math.round(item.price).toLocaleString('es-CL')}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  })()}
                  {/* ACCIONES DEL SCROLL */}
                  <View style={styles.modalScrollActions}>
                    <TouchableOpacity
                      style={styles.editBillBtn}
                      onPress={() => {
                        router.push({ 
                          pathname: '/(tabs)/split', 
                          params: { editBillData: JSON.stringify(selectedBill) } 
                        });
                        setSelectedBill(null);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.editBillBtnText}>Editar Cuenta ✏️</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.shareSummaryBtn}
                      onPress={() => handleShareAgain(selectedBill)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.shareSummaryBtnText}>Compartir Detalle 💬</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.shareSummaryBtn, { borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                      onPress={() => selectedBill.id && handleDeleteBill(selectedBill.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.shareSummaryBtnText, { color: '#ef4444' }]}>Eliminar Cuenta 🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>

                {/* BOTONES ACCIONES INFERIORES */}
                <View style={styles.modalFooterActions}>
                  <TouchableOpacity
                    style={styles.closeDetailsBtn}
                    onPress={() => setSelectedBill(null)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.closeDetailsBtnText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </SafeAreaView>
          </View>
        )}
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
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  billCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  billCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  billDate: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  totalBadge: {
    backgroundColor: 'rgba(222, 185, 141, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(222, 185, 141, 0.25)',
  },
  totalAmountText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 14,
  },
  billCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  emptyBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
  },
  emptyBtnText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 8, 20, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '90%',
  },
  modalContent: {
    backgroundColor: '#201D38', // Soft midnight
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  modalDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    maxHeight: 400,
    marginBottom: 20,
  },
  modalSummaryBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryValueGold: {
    color: Colors.primary,
    fontSize: 22,
    fontWeight: 'bold',
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 12,
  },
  summarySubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summarySubLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  summarySubValue: {
    fontSize: 13,
    color: Colors.white,
    fontWeight: '500',
  },
  summarySubValueGreen: {
    fontSize: 13,
    color: '#4ECDC4',
    fontWeight: '500',
  },
  participantsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 16,
  },
  friendsListContainer: {
    gap: 16,
    marginBottom: 16,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 2,
  },
  friendAmount: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '700',
    marginBottom: 6,
  },
  consumedItemsBox: {
    gap: 2,
  },
  consumedItemText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  friendStatusBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 110,
    alignItems: 'center',
  },
  statusPaidBtn: {
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    borderColor: '#4ECDC4',
  },
  statusPendingBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  friendStatusText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  statusPaidText: {
    color: '#4ECDC4',
  },
  statusPendingText: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  modalScrollActions: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 24,
    marginBottom: 8,
  },
  modalFooterActions: {
    paddingTop: 16,
  },
  editBillBtn: {
    width: '100%',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBillBtnText: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: 'bold',
  },
  shareSummaryBtn: {
    width: '100%',
    backgroundColor: 'rgba(222, 185, 141, 0.15)',
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(222, 185, 141, 0.3)',
  },
  shareSummaryBtnText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  closeDetailsBtn: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  closeDetailsBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
  unassignedContainer: {
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  unassignedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unassignedName: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    flex: 1,
    paddingRight: 8,
  },
  unassignedPrice: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
});
