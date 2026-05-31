import { GoogleGenerativeAI } from '@google/generative-ai';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useCallback } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../src/services/auth';
import { getRecentFriends } from '../../src/services/friends';
import { Friend as DbFriend } from '../../src/types';
import { Colors } from '../../constants/theme';
import { saveBill } from '../../src/services/bills';
import Animated, { FadeInDown } from 'react-native-reanimated';


type Friend = { id: string; name: string; color: string };
type ReceiptItem = { id: string; name: string; price: number; assignedTo: string[] }; // array of friend IDs

const MOCK_ITEMS: ReceiptItem[] = [
  { id: '1', name: 'Pizza Margarita', price: 12000, assignedTo: [] },
  { id: '2', name: 'Cerveza Artesanal', price: 4500, assignedTo: [] },
  { id: '3', name: 'Pisco Sour', price: 6000, assignedTo: [] },
  { id: '4', name: 'Ceviche Mixto', price: 15000, assignedTo: [] },
  { id: '5', name: 'Tiramisú', price: 5500, assignedTo: [] },
];

const FRIEND_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'];

// Initialize Gemini
const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export default function SplitScreen() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);

  const [friends, setFriends] = useState<Friend[]>([{ id: 'me', name: 'Yo', color: FRIEND_COLORS[0] }]);
  const [items, setItems] = useState<ReceiptItem[]>([]);

  const [newFriendName, setNewFriendName] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);

  const [selectedItem, setSelectedItem] = useState<ReceiptItem | null>(null);
  const [showItemAssign, setShowItemAssign] = useState(false);

  const [tipPercentage, setTipPercentage] = useState<number>(0);
  const [isTipPercentageMode, setIsTipPercentageMode] = useState<boolean>(true);
  const [manualTip, setManualTip] = useState<string>('');

  const handleManualTipChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setManualTip(cleaned);
  };

  // States for Manual Entry
  const [manualName, setManualName] = useState('');
  const [manualPrice, setManualPrice] = useState('');

  // States for Editing
  const [editingItem, setEditingItem] = useState<ReceiptItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');

  // States for Restaurant & Discounts (Issue #7)
  const [restaurantName, setRestaurantName] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);


  // State for expanded summaries per person (Issue #22)
  const [expandedFriends, setExpandedFriends] = useState<Record<string, boolean>>({});

  // States for DB Friends
  const [dbFriends, setDbFriends] = useState<DbFriend[]>([]);
  const [dbFriendsLoading, setDbFriendsLoading] = useState(false);
  const [dbFriendsPage, setDbFriendsPage] = useState(1);

  // Fetch db friends on screen focus
  const fetchDbFriends = useCallback(async () => {
    const user = authService.getCurrentUser();
    if (!user) return;
    setDbFriendsLoading(true);
    try {
      const recent = await getRecentFriends(user.uid);
      setDbFriends(recent);
    } catch (error) {
      console.error('Error fetching friends in split screen:', error);
    } finally {
      setDbFriendsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDbFriends();
    }, [fetchDbFriends])
  );

  const getInitials = (friendName: string): string => {
    if (!friendName) return '?';
    const parts = friendName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const toggleExistingFriend = (item: DbFriend) => {
    if (!item.id) return;
    const isSelected = friends.some(f => f.id === item.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isSelected) {
      // Remove friend
      setFriends(friends.filter(f => f.id !== item.id));
      // Remove from assignments
      setItems(items.map(i => ({
        ...i,
        assignedTo: i.assignedTo.filter(id => id !== item.id)
      })));
      if (selectedItem) {
        setSelectedItem({
          ...selectedItem,
          assignedTo: selectedItem.assignedTo.filter(id => id !== item.id)
        });
      }
    } else {
      // Add friend
      setFriends([
        ...friends,
        {
          id: item.id,
          name: item.name,
          color: FRIEND_COLORS[friends.length % FRIEND_COLORS.length]
        }
      ]);
    }
  };

  // STEP 1: Image Selection
  const pickImage = async (useCamera: boolean) => {
    try {
      let result;
      const options: ImagePicker.ImagePickerOptions = { quality: 0.7, base64: true };

      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permiso denegado', 'Necesitamos acceso a la cámara para tomar la foto.');
          return;
        }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setReceiptImage(asset.uri);
        if (asset.base64) {
          const mimeType = asset.uri.endsWith('.png') ? 'image/png' : 'image/jpeg';
          processReceiptWithAI(asset.base64, mimeType);
        } else {
          Alert.alert('Error', 'No se pudo obtener la imagen en alta calidad para procesar.');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar la imagen.');
    }
  };

  const handleManualEntry = () => {
    setItems([]);
    setTipPercentage(10);
    setStep(2);
  };

  const addManualItem = () => {
    if (!manualName.trim() || !manualPrice.trim()) {
      Alert.alert('Datos incompletos', 'Por favor ingresa un nombre y un precio.');
      return;
    }
    
    // Permitir precios negativos para representar descuentos específicos
    const isNegative = manualPrice.trim().startsWith('-');
    const cleanPrice = manualPrice.replace(/[^0-9]/g, '');
    let price = parseInt(cleanPrice, 10);
    if (isNaN(price) || price === 0) {
      Alert.alert('Precio inválido', 'El precio no puede ser 0.');
      return;
    }
    if (isNegative) {
      price = -price;
    }

    const newItem: ReceiptItem = {
      id: `manual-${Date.now()}`,
      name: manualName.trim(),
      price: price,
      assignedTo: []
    };

    setItems([...items, newItem]);
    setManualName('');
    setManualPrice('');
  };

  const openEditModal = (item: ReceiptItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditPrice(item.price.toString());
  };

  const saveEdit = () => {
    if (!editingItem) return;
    const isNegative = editPrice.trim().startsWith('-');
    const cleanPrice = editPrice.replace(/[^0-9]/g, '');
    let price = parseInt(cleanPrice, 10);
    if (!editName.trim() || isNaN(price) || price === 0) {
      Alert.alert('Datos inválidos', 'Revisa el nombre y el precio.');
      return;
    }
    if (isNegative) {
      price = -price;
    }
    setItems(items.map(i => i.id === editingItem.id ? { ...i, name: editName.trim(), price } : i));
    setEditingItem(null);
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
    if (selectedItem?.id === id) setShowItemAssign(false);
  };

  const processReceiptWithAI = async (base64Data: string, mimeType: string) => {
    setIsProcessing(true);
    try {
      const prompt = `Eres un sistema experto en contabilidad de restaurantes. Lee la boleta adjunta. 
Ignora los cobros por servicio y los totales generales como items. 
Tu tarea es extraer:
1. El nombre del restaurante (restaurantName).
2. El descuento general de la cuenta si se indica (generalDiscount - número entero positivo).
3. Los platos y bebidas individuales que se consumieron.
4. Descuentos específicos de platos: regístralos dentro de la lista de items con precio NEGATIVO (ej: {"name": "Descuento Pizza", "price": -2000}).
5. Si la boleta sugiere un porcentaje de propina.

Debes responder ÚNICAMENTE con un objeto JSON válido, con cuatro propiedades: "restaurantName" (string), "generalDiscount" (número entero), "suggestedTipPercentage" (número entero de propina, ej: 10), y "items" (arreglo de platos).
Ejemplo del formato de salida estricto:
{
  "restaurantName": "La Pizza Nostra",
  "generalDiscount": 3000,
  "suggestedTipPercentage": 10,
  "items": [
    {"id": "1", "name": "Pizza Margarita", "price": 12000},
    {"id": "2", "name": "Descuento Pizza", "price": -2000},
    {"id": "3", "name": "Bebida", "price": 2500}
  ]
}
NO agregues texto antes ni después del JSON. NO uses formato markdown (como \`\`\`json).`;

      const imageParts = [{ inlineData: { data: base64Data, mimeType } }];

      let text = '';
      const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
      const maxRetries = 3;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const modelName = modelsToTry[attempt] || modelsToTry[0];
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent([prompt, ...imageParts]);
          const response = await result.response;
          text = response.text();
          break; // Éxito, salimos del loop
        } catch (err: any) {
          console.log(`Intento ${attempt + 1} (${modelsToTry[attempt]}) falló:`, err.message);
          if (attempt === maxRetries - 1) {
            throw err; // Lanza el error si fue el último intento
          }
          // Esperar 1.5 segundos antes de reintentar (Backoff)
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      // Clean possible markdown syntax if the AI disobeys
      const cleanJson = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
      const parsedData = JSON.parse(cleanJson);

      // Ensure the structure is correct
      if (!parsedData.items || !Array.isArray(parsedData.items)) {
        throw new Error("El resultado no contiene un arreglo de items válido");
      }

      setTipPercentage(parsedData.suggestedTipPercentage || 0);
      setRestaurantName(parsedData.restaurantName || '');
      setDiscount(Number(parsedData.generalDiscount) || 0);

      const finalItems: ReceiptItem[] = parsedData.items.map((item: any, index: number) => ({
        id: item.id || String(index + 1),
        name: item.name || 'Ítem desconocido',
        price: Number(item.price) || 0,
        assignedTo: []
      }));

      setItems(finalItems);
      setStep(2);
    } catch (error: any) {
      console.error('Error con IA:', error);
      
      let errorMsg = 'No pudimos analizar la boleta automáticamente. Por favor intenta de nuevo o usa el ingreso manual.';
      if (error?.message?.includes('429')) {
        errorMsg = 'Hemos alcanzado el límite de uso de la IA. Por favor, usa el ingreso manual por ahora.';
      }

      Alert.alert('Error al procesar boleta 🚦', errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  // STEP 2: Logic
  const addFriend = () => {
    const name = newFriendName.trim();
    if (!name) return;

    if (friends.some(f => f.name.toLowerCase() === name.toLowerCase())) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Ya agregado', 'Esta persona ya está en la mesa.');
      return;
    }

    const newFriend: Friend = {
      id: Date.now().toString(),
      name,
      color: FRIEND_COLORS[friends.length % FRIEND_COLORS.length]
    };
    setFriends([...friends, newFriend]);
    setNewFriendName('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const toggleAssign = (friendId: string) => {
    if (!selectedItem) return;
    const isAssigned = selectedItem.assignedTo.includes(friendId);
    let newAssignedTo;

    if (isAssigned) {
      newAssignedTo = selectedItem.assignedTo.filter(id => id !== friendId);
    } else {
      newAssignedTo = [...selectedItem.assignedTo, friendId];
    }

    const updatedItem = { ...selectedItem, assignedTo: newAssignedTo };
    setSelectedItem(updatedItem);

    setItems(items.map(i => i.id === updatedItem.id ? updatedItem : i));
  };

  const allAssigned = items.every(i => i.assignedTo.length > 0);

  // STEP 3: Summary Logic
  const getFriendBaseTotals = () => {
    const totals: Record<string, number> = {};
    friends.forEach(f => totals[f.id] = 0);

    items.forEach(item => {
      if (item.assignedTo.length > 0) {
        const splitAmount = item.price / item.assignedTo.length;
        item.assignedTo.forEach(fId => {
          if (totals[fId] !== undefined) {
            totals[fId] += splitAmount;
          }
        });
      }
    });
    return totals;
  };

  const getAdjustedBaseTotals = () => {
    const base = getFriendBaseTotals();
    const grandTotalBaseRaw = Object.values(base).reduce((a, b) => a + b, 0);
    const discountedBase = Math.max(0, grandTotalBaseRaw - discount);

    const adjusted: Record<string, number> = {};
    friends.forEach(f => {
      const friendBase = base[f.id] || 0;
      if (grandTotalBaseRaw > 0) {
        adjusted[f.id] = friendBase * (discountedBase / grandTotalBaseRaw);
      } else {
        adjusted[f.id] = 0;
      }
    });
    return { base, adjusted, grandTotalBaseRaw, discountedBase };
  };

  const { base: friendBaseTotals, adjusted: adjustedBaseTotals, grandTotalBaseRaw, discountedBase } = getAdjustedBaseTotals();

  const grandTotalBase = grandTotalBaseRaw; // Keep it as raw for showing subtotal base in breakdown
  const grandTotalTip = isTipPercentageMode
    ? discountedBase * (tipPercentage / 100)
    : (parseInt(manualTip.replace(/\D/g, ''), 10) || 0);
  const grandTotal = discountedBase + grandTotalTip;

  const effectiveTipPercentage = isTipPercentageMode
    ? tipPercentage
    : (discountedBase > 0 ? (grandTotalTip / discountedBase) * 100 : 0);

  const getFinalTotals = () => {
    const final: Record<string, number> = {};
    friends.forEach(f => {
      const adjustedBase = adjustedBaseTotals[f.id] || 0;
      final[f.id] = adjustedBase * (1 + effectiveTipPercentage / 100);
    });
    return final;
  };

  const totals = getFinalTotals();

  const shareSummary = async () => {
    let message = `🧾 *Resumen de la Cuenta*\n`;
    if (restaurantName) {
      message += `📍 Restaurante: *${restaurantName}*\n`;
    }
    message += `Subtotal Base: $${Math.round(grandTotalBase).toLocaleString('es-CL')}\n`;
    if (discount > 0) {
      message += `Descuento General: -$${Math.round(discount).toLocaleString('es-CL')}\n`;
      message += `Subtotal c/Desc: $${Math.round(discountedBase).toLocaleString('es-CL')}\n`;
    }
    const formatTipPct = isTipPercentageMode
      ? `${tipPercentage}%`
      : `${Math.round(effectiveTipPercentage)}% manual`;
    message += `Propina (${formatTipPct}): $${Math.round(grandTotalTip).toLocaleString('es-CL')}\n`;
    message += `*Total Final: $${Math.round(grandTotal).toLocaleString('es-CL')}*\n\n`;
    message += `👤 *Detalle por persona:*\n`;
    friends.forEach(f => {
      const amount = totals[f.id];
      if (amount > 0) {
        message += `\n*${f.name}: $${Math.round(amount).toLocaleString('es-CL')}*\n`;
        
        const friendItems = items.filter(item => item.assignedTo.includes(f.id));
        friendItems.forEach(item => {
          const isShared = item.assignedTo.length > 1;
          const itemSharePrice = item.price / item.assignedTo.length;
          const shareText = isShared ? ` (compartido c/${item.assignedTo.length})` : '';
          message += `   • ${item.name}${shareText}: $${Math.round(itemSharePrice).toLocaleString('es-CL')}\n`;
        });
        
        const fBase = friendBaseTotals[f.id] || 0;
        const fAdjusted = adjustedBaseTotals[f.id] || 0;
        const fTip = fAdjusted * (effectiveTipPercentage / 100);
        
        message += `   ----------------\n`;
        message += `   Consumo base: $${Math.round(fBase).toLocaleString('es-CL')}\n`;
        if (discount > 0) {
          message += `   Descuento: -$${Math.round(fBase - fAdjusted).toLocaleString('es-CL')}\n`;
        }
        if (effectiveTipPercentage > 0) {
          message += `   Propina: $${Math.round(fTip).toLocaleString('es-CL')}\n`;
        }
      }
    });
    message += `\n💰 Por favor transferir a mi cuenta. ¡Gracias!`;

    try {
      await Share.share({ message });
    } catch (error) {
      console.log(error);
    }
  };

  const handleSaveBill = async () => {
    const user = authService.getCurrentUser();
    if (!user) {
      Alert.alert('Sesión requerida', 'Debes iniciar sesión para guardar la cuenta.');
      return;
    }

    setIsSaving(true);
    try {
      const friendDetails = friends.map(f => {
        const adjustedBase = adjustedBaseTotals[f.id] || 0;
        const friendTipAmount = adjustedBase * (effectiveTipPercentage / 100);
        const totalAmount = adjustedBase + friendTipAmount;

        const consumedItems = items
          .filter(item => item.assignedTo.includes(f.id))
          .map(item => ({
            name: item.name,
            price: item.price,
            splitPrice: item.price / item.assignedTo.length,
          }));

        return {
          friendId: f.id,
          name: f.name,
          consumedItems,
          baseAmount: adjustedBase,
          tipAmount: friendTipAmount,
          totalAmount: totalAmount,
          paymentStatus: 'pendiente' as const,
        };
      }).filter(detail => detail.totalAmount > 0 || detail.consumedItems.length > 0);

      await saveBill({
        userId: user.uid,
        restaurantName: restaurantName.trim() || 'Restaurante sin nombre',
        generalDiscount: discount,
        grandTotal: grandTotal,
        tipPercentage: effectiveTipPercentage,
        grandTotalTip,
        friends: friendDetails,
      });

      setShowSuccess(true);
    } catch (error) {
      console.error('Error al guardar la cuenta:', error);
      Alert.alert('Error 🚨', 'No se pudo guardar la cuenta. Por favor intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFriendExpansion = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedFriends(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const resetFlow = () => {
    setStep(1);
    setReceiptImage(null);
    setFriends([{ id: 'me', name: 'Yo', color: FRIEND_COLORS[0] }]);
    setItems([]);
    setRestaurantName('');
    setDiscount(0);
    setTipPercentage(0);
    setIsTipPercentageMode(true);
    setManualTip('');
    setExpandedFriends({});
  };

  return (
    <LinearGradient
      colors={[Colors.background, Colors.backgroundSecondary]}
      style={styles.container}
    >
      {/* Círculos decorativos */}
      <View style={[styles.decorativeCircle, styles.circle1]} />
      <View style={[styles.decorativeCircle, styles.circle2]} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          {step > 1 && (
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step === 3 ? 2 : 1)}>
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Dividir Cuenta</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* STEP 1: SCAN */}
        {step === 1 && (
          <View style={[styles.stepContainer, { paddingBottom: 110 }]}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={styles.stepSubtitle}>Sube una foto de la boleta y la Inteligencia Artificial extraerá los platos por ti.</Text>
              
              {isProcessing ? (
                <View style={[styles.processingContent, { marginVertical: 40 }]}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.processingText}>Analizando boleta con IA...</Text>
                  <Text style={styles.processingSubtext}>Detectando ítems y precios</Text>
                </View>
              ) : (
                <>
                  <View style={[styles.buttonRow, { marginTop: 40, marginBottom: 60, width: '100%' }]}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => pickImage(true)} disabled={isProcessing}>
                      <BlurView intensity={20} tint="light" style={[styles.actionBlur, { paddingVertical: 24 }]}>
                        <Text style={[styles.actionIcon, { fontSize: 40 }]}>📸</Text>
                        <Text style={styles.actionText}>Tomar Foto</Text>
                      </BlurView>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.actionButton} onPress={() => pickImage(false)} disabled={isProcessing}>
                      <BlurView intensity={20} tint="light" style={[styles.actionBlur, { paddingVertical: 24 }]}>
                        <Text style={[styles.actionIcon, { fontSize: 40 }]}>🖼️</Text>
                        <Text style={styles.actionText}>Subir Galería</Text>
                      </BlurView>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.manualLink} onPress={handleManualEntry} activeOpacity={0.7}>
                    <Text style={styles.manualLinkText}>¿Perdiste la boleta? Ingresa manualmente</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}

        {/* STEP 2: ASSIGN */}
        {step === 2 && (
          <ScrollView
            style={styles.stepScrollContainer}
            contentContainerStyle={styles.stepScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Friends Strip */}
            <View style={styles.friendsSection}>
              <Text style={styles.sectionLabel}>Amigos en la mesa</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendsScroll}>
                <TouchableOpacity style={styles.addFriendBtn} onPress={() => setShowAddFriend(true)}>
                  <Text style={styles.addFriendPlus}>+</Text>
                </TouchableOpacity>
                {friends.map(f => (
                  <View key={f.id} style={styles.friendAvatarContainer}>
                    <View style={[styles.friendAvatar, { backgroundColor: f.color }]}>
                      <Text style={styles.friendInitials}>{getInitials(f.name)}</Text>
                    </View>
                    <Text style={styles.friendName} numberOfLines={1}>{f.name}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Metadata de Cuenta: Restaurante y Descuento General */}
            <View style={styles.billMetaContainer}>
              <View style={styles.billMetaLabelsRow}>
                <Text style={[styles.sectionLabelSmall, { flex: 2 }]}>Restaurante 🍴</Text>
                <Text style={[styles.sectionLabelSmall, { flex: 1.2 }]}>Desc. General ($) 🏷️</Text>
              </View>
              <View style={styles.billMetaInputsRow}>
                <TextInput
                  style={[styles.metaInput, { flex: 2 }]}
                  placeholder="Ej: La Pizza Nostra"
                  value={restaurantName}
                  onChangeText={setRestaurantName}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                />
                <TextInput
                  style={[styles.metaInput, { flex: 1.2 }]}
                  placeholder="$0"
                  keyboardType="numeric"
                  value={discount > 0 ? discount.toString() : ''}
                  onChangeText={val => setDiscount(parseInt(val.replace(/\D/g, ''), 10) || 0)}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                />
              </View>
            </View>

            {/* Formulario Ingreso Manual */}
            <View style={styles.manualFormContainer}>
              <Text style={styles.sectionLabel}>Añadir plato manualmente</Text>
              <View style={styles.manualFormRow}>
                <TextInput
                  style={[styles.manualInput, { flex: 2 }]}
                  placeholder="Ej: Pisco Sour"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={manualName}
                  onChangeText={setManualName}
                />
                <TextInput
                  style={[styles.manualInput, { flex: 1 }]}
                  placeholder="$0"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  keyboardType="numeric"
                  value={manualPrice}
                  onChangeText={setManualPrice}
                />
                <TouchableOpacity style={styles.manualAddBtn} onPress={addManualItem} activeOpacity={0.8}>
                  <Text style={styles.manualAddIcon}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.itemsSection}>
              <Text style={styles.sectionLabel}>Platos consumidos</Text>

              {items.length === 0 ? (
                <Text style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginVertical: 20 }}>
                  Aún no hay platos registrados.
                </Text>
              ) : (
                items.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.itemCard]}
                    activeOpacity={0.8}
                    onPress={() => { setSelectedItem(item); setShowItemAssign(true); }}
                  >
                    <BlurView intensity={15} tint="light" style={styles.itemBlur}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={[styles.itemPrice, item.price < 0 && { color: '#4ECDC4' }]}>
                          {item.price < 0 
                            ? `-$${Math.abs(item.price).toLocaleString('es-CL')}`
                            : `$${item.price.toLocaleString('es-CL')}`
                          }
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginRight: 16 }}>
                        <TouchableOpacity onPress={() => openEditModal(item)} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Text style={{ fontSize: 18 }}>✏️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteItem(item.id)} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Text style={{ fontSize: 18 }}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.itemAvatars}>
                        {item.assignedTo.length === 0 ? (
                          <Text style={styles.unassignedBadge}>Sin asignar</Text>
                        ) : (
                          item.assignedTo.map(fId => {
                            const friend = friends.find(f => f.id === fId);
                            if (!friend) return null;
                            return (
                              <View key={fId} style={[styles.miniAvatar, { backgroundColor: friend.color }]}>
                                <Text style={styles.miniInitials}>{friend.name.substring(0, 1).toUpperCase()}</Text>
                              </View>
                            );
                          })
                        )}
                      </View>
                    </BlurView>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Next Step Button */}
            <View style={styles.bottomNav}>
              <TouchableOpacity
                style={[styles.primaryButton, !allAssigned && styles.buttonDisabled]}
                onPress={() => setStep(3)}
                disabled={!allAssigned}
              >
                <Text style={styles.primaryButtonText}>Ver Resumen</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* STEP 3: SUMMARY */}
        {step === 3 && (
          <ScrollView
            style={styles.stepScrollContainer}
            contentContainerStyle={styles.stepScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.stepSubtitle, { marginBottom: 16 }]}>Resumen final de lo que debe cada uno.</Text>

            <BlurView intensity={20} tint="light" style={[styles.summaryCard, { flex: 0, marginBottom: 20 }]}>
              <Text style={styles.summaryTotalLabel}>Total a Pagar</Text>
              <Text style={styles.summaryTotalAmount}>${Math.round(grandTotal).toLocaleString('es-CL')}</Text>

              {restaurantName ? (
                <View style={styles.summaryRestaurantBadge}>
                  <Text style={styles.summaryRestaurantText}>🍴 {restaurantName.trim()}</Text>
                </View>
              ) : null}

              <View style={styles.tipSectionContainer}>
                <View style={styles.tipSection}>
                  <Text style={styles.tipLabel}>Propina:</Text>
                  <View style={styles.tipButtonsRow}>
                    {[0, 10, 15].map(pct => (
                      <TouchableOpacity
                        key={pct}
                        style={[styles.tipBtn, isTipPercentageMode && tipPercentage === pct && styles.tipBtnActive]}
                        onPress={() => {
                          setTipPercentage(pct);
                          setIsTipPercentageMode(true);
                          setManualTip('');
                        }}
                      >
                        <Text style={[styles.tipBtnText, isTipPercentageMode && tipPercentage === pct && styles.tipBtnTextActive]}>{pct}%</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={[styles.tipBtn, !isTipPercentageMode && styles.tipBtnActive]}
                      onPress={() => {
                        setIsTipPercentageMode(false);
                      }}
                    >
                      <Text style={[styles.tipBtnText, !isTipPercentageMode && styles.tipBtnTextActive]}>Manual</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {!isTipPercentageMode && (
                  <View style={styles.manualTipInputContainer}>
                    <Text style={styles.manualTipInputLabel}>Monto de propina ($):</Text>
                    <TextInput
                      style={styles.manualTipInput}
                      placeholder="Ej: 5000"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      keyboardType="numeric"
                      value={manualTip}
                      onChangeText={handleManualTipChange}
                    />
                  </View>
                )}
              </View>

              {/* Desglose de Totales */}
              <View style={styles.breakdownContainer}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Subtotal Base:</Text>
                  <Text style={styles.breakdownValue}>${Math.round(grandTotalBaseRaw).toLocaleString('es-CL')}</Text>
                </View>
                {discount > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Descuento General:</Text>
                    <Text style={[styles.breakdownValue, { color: '#4ECDC4' }]}>-${Math.round(discount).toLocaleString('es-CL')}</Text>
                  </View>
                )}
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Propina ({isTipPercentageMode ? `${tipPercentage}%` : `${Math.round(effectiveTipPercentage)}% manual`}):</Text>
                  <Text style={styles.breakdownValue}>${Math.round(grandTotalTip).toLocaleString('es-CL')}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.summaryList}>
                {friends.map(f => {
                  const amount = totals[f.id];
                  if (amount === 0) return null;
                  return (
                    <TouchableOpacity
                      key={f.id}
                      style={styles.summaryRowContainer}
                      onPress={() => toggleFriendExpansion(f.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.summaryHeader}>
                        <View style={styles.summaryUser}>
                          <View style={[styles.miniAvatar, { backgroundColor: f.color, marginRight: 12, marginLeft: 0, width: 36, height: 36, borderRadius: 18 }]}>
                            <Text style={[styles.miniInitials, { fontSize: 14 }]}>{f.name.substring(0, 1).toUpperCase()}</Text>
                          </View>
                          <Text style={styles.summaryName} numberOfLines={1}>{f.name}</Text>
                          <Ionicons
                            name={expandedFriends[f.id] ? "chevron-up" : "chevron-down"}
                            size={16}
                            color={Colors.primaryLight}
                            style={styles.summaryChevron}
                          />
                        </View>
                        <Text style={styles.summaryUserAmount}>${Math.round(amount).toLocaleString('es-CL')}</Text>
                      </View>

                      {expandedFriends[f.id] && (
                        <View style={styles.expandedDetailContainer}>
                          <View style={styles.detailDivider} />
                          
                          <View style={styles.detailItemsList}>
                            {items
                              .filter(item => item.assignedTo.includes(f.id))
                              .map(item => {
                                const isShared = item.assignedTo.length > 1;
                                const splitPrice = item.price / item.assignedTo.length;
                                return (
                                  <View key={item.id} style={styles.detailItemRow}>
                                    <View style={{ flex: 1, paddingRight: 8 }}>
                                      <Text style={styles.detailItemName} numberOfLines={1}>{item.name}</Text>
                                      {isShared && (
                                        <Text style={styles.detailItemSubtitle}>
                                          Compartido con {item.assignedTo.length}
                                        </Text>
                                      )}
                                    </View>
                                    <Text style={[styles.detailItemPrice, item.price < 0 && { color: '#4ECDC4' }]}>
                                      {item.price < 0
                                        ? `-$${Math.round(Math.abs(splitPrice)).toLocaleString('es-CL')}`
                                        : `$${Math.round(splitPrice).toLocaleString('es-CL')}`
                                      }
                                    </Text>
                                  </View>
                                );
                              })}
                          </View>

                          <View style={styles.detailBreakdownContainer}>
                            <View style={styles.detailBreakdownRow}>
                              <Text style={styles.detailBreakdownLabel}>Consumo base:</Text>
                              <Text style={styles.detailBreakdownValue}>
                                ${Math.round(friendBaseTotals[f.id] || 0).toLocaleString('es-CL')}
                              </Text>
                            </View>
                            {discount > 0 && (
                              <View style={styles.detailBreakdownRow}>
                                <Text style={styles.detailBreakdownLabel}>Descuento:</Text>
                                <Text style={[styles.detailBreakdownValue, { color: '#4ECDC4' }]}>
                                  -${Math.round((friendBaseTotals[f.id] || 0) - (adjustedBaseTotals[f.id] || 0)).toLocaleString('es-CL')}
                                </Text>
                              </View>
                            )}
                            {effectiveTipPercentage > 0 && (
                              <View style={styles.detailBreakdownRow}>
                                <Text style={styles.detailBreakdownLabel}>Propina ({isTipPercentageMode ? `${tipPercentage}%` : `${Math.round(effectiveTipPercentage)}%`}):</Text>
                                <Text style={styles.detailBreakdownValue}>
                                  ${Math.round((adjustedBaseTotals[f.id] || 0) * (effectiveTipPercentage / 100)).toLocaleString('es-CL')}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </BlurView>

            <View style={styles.bottomNav}>
              <TouchableOpacity
                style={[styles.primaryButton, { marginBottom: 10 }]}
                onPress={shareSummary}
              >
                <Text style={styles.primaryButtonText}>Compartir Cobro 💬</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveDbButton, isSaving && styles.buttonDisabled]}
                onPress={handleSaveBill}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Text style={styles.saveDbButtonText}>Guardar Cuenta en la App 💾</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={resetFlow}>
                <Text style={styles.secondaryButtonText}>Empezar de nuevo</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* MODAL: ADD FRIEND */}
        <Modal visible={showAddFriend} transparent animationType="slide">
          {(() => {
            const totalPages = Math.ceil(dbFriends.length / 6);
            const currentPage = Math.max(1, Math.min(dbFriendsPage, totalPages));
            const paginatedDbFriends = dbFriends.slice((currentPage - 1) * 6, currentPage * 6);
            return (
              <View style={styles.modalOverlay}>
                <BlurView intensity={45} tint="dark" style={styles.modalContentBottom}>
                  <Text style={styles.modalTitle}>Añadir Amigos</Text>
                  
                  <Text style={styles.modalSubtitleSection}>Amigos guardados</Text>
                  {dbFriendsLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={Colors.primary} />
                    </View>
                  ) : dbFriends.length === 0 ? (
                    <Text style={styles.noDbFriendsText}>
                      No tienes amigos guardados. Agrégalos en la pestaña de Amigos.
                    </Text>
                  ) : (
                    <>
                      <View style={styles.dbFriendsGrid}>
                        {paginatedDbFriends.map(friend => {
                          const isSelected = friends.some(f => f.id === friend.id);
                          return (
                            <TouchableOpacity
                              key={friend.id}
                              style={[styles.dbFriendCard, isSelected && styles.dbFriendCardSelected]}
                              onPress={() => toggleExistingFriend(friend)}
                              activeOpacity={0.8}
                            >
                              <View style={styles.dbFriendAvatarWrapper}>
                                <View style={[styles.dbFriendAvatar, { backgroundColor: isSelected ? Colors.primary : 'rgba(255, 255, 255, 0.08)' }]}>
                                  <Text style={[styles.dbFriendAvatarText, isSelected && { color: Colors.background }]}>
                                    {getInitials(friend.name)}
                                  </Text>
                                </View>
                                {isSelected && (
                                  <View style={styles.checkmarkBadge}>
                                    <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                                  </View>
                                )}
                              </View>
                              <Text style={styles.dbFriendName} numberOfLines={1}>{friend.name}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {totalPages > 1 && (
                        <View style={styles.paginationRow}>
                          <TouchableOpacity
                            style={[styles.paginationBtn, currentPage === 1 && styles.paginationBtnDisabled]}
                            disabled={currentPage === 1}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              setDbFriendsPage(currentPage - 1);
                            }}
                          >
                            <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? 'rgba(255,255,255,0.2)' : Colors.primary} />
                          </TouchableOpacity>
                          <Text style={styles.paginationText}>
                            Página {currentPage} de {totalPages}
                          </Text>
                          <TouchableOpacity
                            style={[styles.paginationBtn, currentPage === totalPages && styles.paginationBtnDisabled]}
                            disabled={currentPage === totalPages}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              setDbFriendsPage(currentPage + 1);
                            }}
                          >
                            <Ionicons name="chevron-forward" size={20} color={currentPage === totalPages ? 'rgba(255,255,255,0.2)' : Colors.primary} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </>
                  )}

                  <View style={styles.modalDivider} />

                  <Text style={styles.modalSubtitleSection}>Añadir persona nueva</Text>
                  <View style={styles.customFriendInputRow}>
                    <TextInput
                      style={styles.customFriendInput}
                      placeholder="Nombre o apodo..."
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={newFriendName}
                      onChangeText={setNewFriendName}
                    />
                    <TouchableOpacity style={styles.customFriendAddBtn} onPress={addFriend} activeOpacity={0.8}>
                      <Text style={styles.customFriendAddBtnText}>Añadir</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryButton, { marginTop: 20 }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setShowAddFriend(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.primaryButtonText}>Listo</Text>
                  </TouchableOpacity>
                </BlurView>
              </View>
            );
          })()}
        </Modal>

        {/* MODAL: EDIT ITEM */}
        <Modal visible={!!editingItem} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <BlurView intensity={40} tint="dark" style={styles.modalContent}>
              <Text style={styles.modalTitle}>Editar Plato</Text>
              
              <TextInput
                style={styles.modalInput}
                placeholder="Nombre..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={editName}
                onChangeText={setEditName}
              />
              <TextInput
                style={[styles.modalInput, { marginBottom: 30 }]}
                placeholder="Precio ($)"
                placeholderTextColor="rgba(255,255,255,0.5)"
                keyboardType="numeric"
                value={editPrice}
                onChangeText={setEditPrice}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setEditingItem(null)}>
                  <Text style={styles.modalBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalBtnAdd} onPress={saveEdit}>
                  <Text style={[styles.modalBtnText, { color: Colors.background }]}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        </Modal>

        {/* MODAL: ASSIGN ITEM */}
        <Modal visible={showItemAssign} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <BlurView intensity={40} tint="dark" style={styles.modalContentBottom}>
              <Text style={styles.modalTitle}>¿Quién pagará esto?</Text>
              <Text style={styles.modalSubtitle}>
                {selectedItem?.name} -{' '}
                {selectedItem && selectedItem.price < 0
                  ? `-$${Math.abs(selectedItem.price).toLocaleString('es-CL')}`
                  : `$${selectedItem?.price.toLocaleString('es-CL')}`
                }
              </Text>

              <View style={styles.assignGrid}>
                {friends.map(f => {
                  const isSelected = selectedItem?.assignedTo.includes(f.id);
                  return (
                    <TouchableOpacity
                      key={f.id}
                      style={[styles.assignChip, isSelected && { borderColor: f.color, backgroundColor: 'rgba(255,255,255,0.1)' }]}
                      onPress={() => toggleAssign(f.id)}
                    >
                      <View style={[styles.miniAvatar, { backgroundColor: f.color, marginRight: 8 }]}>
                        <Text style={styles.miniInitials}>{f.name.substring(0, 1).toUpperCase()}</Text>
                      </View>
                      <Text style={styles.assignChipText}>{f.name}</Text>
                      {isSelected && <Text style={{ color: f.color, marginLeft: 'auto' }}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={() => setShowItemAssign(false)}>
                <Text style={styles.primaryButtonText}>Listo</Text>
              </TouchableOpacity>
            </BlurView>
          </View>
        </Modal>

        {/* MODAL: SUCCESS SAVE BILL */}
        <Modal
          visible={showSuccess}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setShowSuccess(false);
            resetFlow();
          }}
        >
          <View style={styles.successModalOverlay}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />
            
            <Animated.View 
              entering={FadeInDown.duration(400).springify()}
              style={styles.successModalContent}
            >
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark-circle" size={80} color={Colors.primary} />
              </View>
              
              <Text style={styles.successModalTitle}>¡Éxito! 🎉</Text>
              <Text style={styles.successModalText}>La cuenta ha sido guardada correctamente.</Text>
              
              <TouchableOpacity
                style={styles.successModalButton}
                onPress={() => {
                  setShowSuccess(false);
                  resetFlow();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.successModalButtonText}>Aceptar</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  decorativeCircle: { position: 'absolute', borderRadius: 999, opacity: 0.15 },
  circle1: { width: 350, height: 350, top: -100, right: -100, backgroundColor: Colors.primary },
  circle2: { width: 280, height: 280, bottom: -80, left: -80, backgroundColor: Colors.primaryLight },
  stepContainer: { flex: 1, padding: 20, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  backText: { color: Colors.white, fontSize: 20, fontWeight: 'bold' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.white },

  stepSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 30, paddingHorizontal: 10 },

  scannerBox: { width: '100%', height: 350, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  scanGuide: { width: 220, height: 280, justifyContent: 'center', alignItems: 'center' },
  scanInstruction: { color: Colors.primaryLight, opacity: 0.8, fontSize: 14, fontWeight: '600' },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: Colors.primary, borderWidth: 3 },
  topLeft: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 16 },
  topRight: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 16 },
  bottomLeft: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 16 },
  bottomRight: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 16 },

  processingContent: { alignItems: 'center' },
  processingText: { color: Colors.white, fontSize: 16, fontWeight: '600', marginTop: 16 },
  processingSubtext: { color: Colors.primary, fontSize: 13, marginTop: 4 },

  buttonRow: { flexDirection: 'row', gap: 16 },
  actionButton: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  actionBlur: { paddingVertical: 16, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },

  manualLink: { marginTop: 32, padding: 8, alignItems: 'center' },
  manualLinkText: { color: Colors.primary, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline', textAlign: 'center' },

  sectionLabel: { fontSize: 16, fontWeight: '700', color: Colors.white, marginBottom: 12 },
  friendsSection: { marginBottom: 10 },
  friendsScroll: { paddingVertical: 10, gap: 16 },
  friendAvatarContainer: { alignItems: 'center', width: 60 },
  friendAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 6, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  friendInitials: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  friendName: { color: Colors.white, fontSize: 12, opacity: 0.9 },
  addFriendBtn: { width: 48, height: 48, borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },
  addFriendPlus: { color: Colors.primary, fontSize: 24, fontWeight: '300' },

  manualFormContainer: { marginBottom: 24 },
  manualFormRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  manualInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', color: Colors.white, height: 48, borderRadius: 12, paddingHorizontal: 16, fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  manualAddBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  manualAddIcon: { color: Colors.background, fontSize: 24, fontWeight: 'bold', lineHeight: 28 },

  itemsSection: { flex: 1 },
  itemsList: { flex: 1 },
  itemCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  itemBlur: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.03)' },
  itemInfo: { flex: 1 },
  itemName: { color: Colors.white, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  itemPrice: { color: Colors.primaryLight, fontSize: 14 },
  itemAvatars: { flexDirection: 'row', alignItems: 'center' },
  unassignedBadge: { backgroundColor: 'rgba(255, 107, 107, 0.2)', color: '#FF6B6B', fontSize: 12, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  miniAvatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: -8, borderWidth: 1, borderColor: Colors.background },
  miniInitials: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

  bottomNav: { paddingTop: 20 },
  primaryButton: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 24, alignItems: 'center' },
  primaryButtonText: { color: Colors.background, fontSize: 16, fontWeight: '700' },
  secondaryButton: { paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  secondaryButtonText: { color: Colors.primaryLight, fontSize: 15, fontWeight: '600' },
  buttonDisabled: { opacity: 0.4 },

  summaryCard: { flex: 1, borderRadius: 24, padding: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  summaryTotalLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center', marginBottom: 2 },
  summaryTotalAmount: { color: Colors.primary, fontSize: 32, fontWeight: 'bold', textAlign: 'center' },
  tipSectionContainer: { marginTop: 12, gap: 8, width: '100%' },
  tipSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  tipLabel: { color: Colors.white, fontSize: 14, fontWeight: '500' },
  tipButtonsRow: { flexDirection: 'row', gap: 8 },
  tipBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  tipBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tipBtnText: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  tipBtnTextActive: { color: Colors.background },
  manualTipInputContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  manualTipInputLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  manualTipInput: { backgroundColor: 'rgba(255,255,255,0.08)', color: Colors.white, height: 44, width: 120, borderRadius: 8, paddingHorizontal: 10, fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', textAlign: 'center' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 16 },
  summaryList: { flex: 1, paddingHorizontal: 4 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.08)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  summaryRowContainer: { marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  summaryUser: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  summaryName: { color: Colors.white, fontSize: 16, fontWeight: '600', flexShrink: 1 },
  summaryChevron: { marginLeft: 8 },
  summaryUserAmount: { color: Colors.primaryLight, fontSize: 18, fontWeight: 'bold' },
  expandedDetailContainer: { paddingHorizontal: 16, paddingBottom: 16 },
  detailDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 12 },
  detailItemsList: { gap: 8, marginBottom: 12 },
  detailItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailItemName: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '500' },
  detailItemSubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 },
  detailItemPrice: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500' },
  detailBreakdownContainer: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 10, gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  detailBreakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailBreakdownLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  detailBreakdownValue: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', borderRadius: 24, padding: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(30, 27, 50, 0.85)' },
  modalContentBottom: { width: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, overflow: 'hidden', marginTop: 'auto', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(30, 27, 50, 0.95)' },
  modalTitle: { color: Colors.white, fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  modalSubtitle: { color: Colors.primary, fontSize: 15, textAlign: 'center', marginBottom: 20 },
  modalInput: { backgroundColor: 'rgba(255,255,255,0.1)', color: Colors.white, fontSize: 16, padding: 16, borderRadius: 12, marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  modalBtnCancel: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  modalBtnAdd: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: Colors.primary },
  modalBtnText: { color: Colors.white, fontSize: 16, fontWeight: '600' },

  assignGrid: { gap: 12, marginBottom: 24 },
  assignChip: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'transparent' },
  assignChipText: { color: Colors.white, fontSize: 16, fontWeight: '500' },

  // New styles for Issue #19 friends grid bottom sheet
  modalSubtitleSection: { fontSize: 14, fontWeight: '600', color: 'rgba(222, 185, 141, 0.9)', marginBottom: 12 },
  loadingContainer: { paddingVertical: 20, alignItems: 'center', justifyContent: 'center' },
  noDbFriendsText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', marginVertical: 12, paddingHorizontal: 20 },
  dbFriendsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  dbFriendCard: { width: '48%', flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  dbFriendCardSelected: { borderColor: Colors.primary, backgroundColor: 'rgba(222, 185, 141, 0.05)' },
  dbFriendAvatarWrapper: { position: 'relative', marginRight: 10 },
  dbFriendAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dbFriendAvatarText: { color: Colors.white, fontSize: 12, fontWeight: 'bold' },
  checkmarkBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: Colors.background, borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  dbFriendName: { color: Colors.white, fontSize: 14, fontWeight: '500', flex: 1 },
  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginVertical: 8 },
  paginationBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  paginationBtnDisabled: { opacity: 0.5 },
  paginationText: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  modalDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 16 },
  customFriendInputRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  customFriendInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', color: Colors.white, height: 44, borderRadius: 10, paddingHorizontal: 12, fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  customFriendAddBtn: { paddingHorizontal: 16, height: 44, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  customFriendAddBtnText: { color: Colors.background, fontSize: 14, fontWeight: '700' },
  stepScrollContainer: {
    flex: 1,
  },
  stepScrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  billMetaContainer: {
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  billMetaLabelsRow: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: 12,
  },
  billMetaInputsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sectionLabelSmall: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primaryLight,
    opacity: 0.8,
  },
  metaInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: Colors.white,
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  summaryRestaurantBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(222, 185, 141, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(222, 185, 141, 0.2)',
  },
  summaryRestaurantText: {
    color: Colors.primaryLight,
    fontSize: 14,
    fontWeight: '600',
  },
  breakdownContainer: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  breakdownValue: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  saveDbButton: {
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginTop: 10,
  },
  saveDbButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  successModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(10, 8, 20, 0.7)',
  },
  successModalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#2D2A45',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(222, 185, 141, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  successIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(222, 185, 141, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successModalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 12,
    textAlign: 'center',
  },
  successModalText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  successModalButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  successModalButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
