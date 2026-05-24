import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { authService } from '../../src/services/auth';
import { addFriend, getRecentFriends } from '../../src/services/friends';
import { Colors } from '../../constants/theme';
import { Friend } from '../../src/types';

const { width, height } = Dimensions.get('window');

export default function FriendsScreen() {
  const user = authService.getCurrentUser();
  const userId = user?.uid;

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [addMode, setAddMode] = useState<'app' | 'invite'>('app');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);

  // List states
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);

  // Success Modal states
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch recent friends
  const fetchFriends = useCallback(async () => {
    if (!userId) return;
    try {
      const recentFriends = await getRecentFriends(userId);
      setFriends(recentFriends);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setIsLoadingList(false);
    }
  }, [userId]);

  // Refresh list when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setIsLoadingList(true);
      fetchFriends();
    }, [fetchFriends])
  );

  const validateEmail = (val: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(val.trim().toLowerCase());
  };

  const handleAddFriend = async () => {
    if (!userId) {
      Alert.alert('Error', 'Debes iniciar sesión para agregar amigos.');
      return;
    }

    if (!name.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Campo requerido', 'Por favor ingresa el nombre de tu amigo.');
      return;
    }

    let friendEmail: string | undefined = undefined;
    let status: 'agregado' | 'solicitud enviada' = 'agregado';

    if (addMode === 'invite') {
      if (!email.trim()) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Campo requerido', 'Para enviar una invitación, debes ingresar un correo electrónico.');
        return;
      }
      if (!validateEmail(email)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Correo inválido', 'Por favor ingresa un correo electrónico válido.');
        return;
      }
      friendEmail = email.trim().toLowerCase();
      status = 'solicitud enviada';
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await addFriend({
        userId,
        name: name.trim(),
        email: friendEmail,
        status,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccessMessage(addMode === 'invite' ? 'Invitación enviada y amigo registrado.' : 'Amigo agregado exitosamente.');
      setShowSuccess(true);
      
      // Reset form
      setName('');
      setEmail('');
      setAddMode('app');

      // Refresh list
      fetchFriends();
    } catch (error) {
      console.error('Error adding friend:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'No se pudo agregar al amigo. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (friendName: string): string => {
    if (!friendName) return '?';
    const parts = friendName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const renderFriendItem = ({ item, index }: { item: Friend; index: number }) => {
    const isPending = item.status === 'solicitud enviada';

    return (
      <Animated.View entering={FadeInDown.delay(index * 50).duration(400)}>
        <BlurView intensity={20} tint="light" style={styles.friendCard}>
          <View style={styles.friendAvatar}>
            <Text style={styles.friendAvatarText}>{getInitials(item.name)}</Text>
          </View>

          <View style={styles.friendInfo}>
            <Text style={styles.friendName} numberOfLines={1}>{item.name}</Text>
            {item.email && (
              <Text style={styles.friendEmail} numberOfLines={1}>{item.email}</Text>
            )}
          </View>

          <View style={[styles.badge, isPending ? styles.badgePending : styles.badgeAdded]}>
            <Text style={[styles.badgeText, isPending ? styles.badgeTextPending : styles.badgeTextAdded]}>
              {isPending ? 'Pendiente' : 'Agregado'}
            </Text>
          </View>
        </BlurView>
      </Animated.View>
    );
  };

  const renderFormHeader = () => (
    <View style={styles.formContainer}>
      <Animated.View entering={FadeInDown.duration(600).springify()}>
        <BlurView intensity={35} tint="dark" style={styles.formCard}>
          <Text style={styles.formTitle}>Agregar amigo</Text>

          <Text style={styles.inputLabel}>Nombre</Text>
          <TextInput
            style={[styles.input, isNameFocused && styles.inputFocused]}
            placeholder="Nombre de tu amigo"
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            value={name}
            onChangeText={setName}
            onFocus={() => setIsNameFocused(true)}
            onBlur={() => setIsNameFocused(false)}
          />

          <Text style={styles.inputLabel}>Tipo de adición</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleBtn, addMode === 'app' && styles.toggleBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setAddMode('app');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleBtnText, addMode === 'app' && styles.toggleBtnTextActive]}>
                Solo en la app
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, addMode === 'invite' && styles.toggleBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setAddMode('invite');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleBtnText, addMode === 'invite' && styles.toggleBtnTextActive]}>
                Enviar invitación
              </Text>
            </TouchableOpacity>
          </View>

          {addMode === 'invite' && (
            <Animated.View entering={FadeInDown.duration(300)}>
              <Text style={styles.inputLabel}>Correo electrónico</Text>
              <TextInput
                style={[styles.input, isEmailFocused && styles.inputFocused]}
                placeholder="correo@ejemplo.com"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setIsEmailFocused(true)}
                onBlur={() => setIsEmailFocused(false)}
              />
            </Animated.View>
          )}

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleAddFriend}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.background} />
            ) : (
              <>
                <Ionicons name="person-add" size={20} color={Colors.background} style={{ marginRight: 8 }} />
                <Text style={styles.submitButtonText}>Agregar amigo</Text>
              </>
            )}
          </TouchableOpacity>
        </BlurView>
      </Animated.View>

      <Text style={styles.sectionTitle}>Amigos recientes</Text>
    </View>
  );

  const renderEmptyList = () => {
    if (isLoadingList) {
      return (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      );
    }
    return (
      <Animated.View entering={FadeIn.duration(500)} style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={48} color={Colors.primary} style={{ marginBottom: 12, opacity: 0.8 }} />
        <Text style={styles.emptyTitle}>Aún no tienes amigos</Text>
        <Text style={styles.emptySubtitle}>Agrega amigos en la sección de arriba para verlos aquí.</Text>
      </Animated.View>
    );
  };

  if (!userId) {
    return (
      <LinearGradient colors={[Colors.background, Colors.backgroundSecondary]} style={styles.container}>
        <View style={styles.centeredContent}>
          <Ionicons name="lock-closed-outline" size={60} color={Colors.primary} style={{ marginBottom: 16 }} />
          <Text style={styles.notLoggedInTitle}>Iniciar Sesión</Text>
          <Text style={styles.notLoggedInSubtitle}>Debes iniciar sesión para ver y agregar amigos.</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[Colors.background, Colors.backgroundSecondary]} style={styles.container}>
      {/* Decorative Circles */}
      <Animated.View entering={FadeIn.duration(1500)} style={[styles.decorativeCircle, styles.circle1]} />
      <Animated.View entering={FadeIn.duration(1500).delay(300)} style={[styles.decorativeCircle, styles.circle2]} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <FlatList
          data={friends}
          renderItem={renderFriendItem}
          keyExtractor={(item) => item.id || ''}
          ListHeaderComponent={renderFormHeader()}
          ListEmptyComponent={renderEmptyList()}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        />
      </KeyboardAvoidingView>

      <Modal
        visible={showSuccess}
        transparent
        animationType="fade"
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
            <Text style={styles.successModalText}>{successMessage}</Text>
            
            <TouchableOpacity
              style={styles.successModalButton}
              onPress={() => setShowSuccess(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.successModalButtonText}>Aceptar</Text>
            </TouchableOpacity>
          </Animated.View>
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
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.15,
  },
  circle1: {
    width: width * 0.8,
    height: width * 0.8,
    top: -height * 0.1,
    right: -width * 0.2,
    backgroundColor: Colors.primary,
  },
  circle2: {
    width: width * 0.7,
    height: width * 0.7,
    bottom: height * 0.1,
    left: -width * 0.2,
    backgroundColor: '#6A5ACD',
  },
  formContainer: {
    marginBottom: 20,
  },
  formCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(222, 185, 141, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    overflow: 'hidden',
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(222, 185, 141, 0.9)',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(222, 185, 141, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 16,
  },
  inputFocused: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(222, 185, 141, 0.15)',
    borderColor: Colors.primary,
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  toggleBtnTextActive: {
    color: Colors.primary,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.background,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    overflow: 'hidden',
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(222, 185, 141, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(222, 185, 141, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  friendAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  friendInfo: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  friendEmail: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeAdded: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderColor: 'rgba(74, 222, 128, 0.3)',
  },
  badgePending: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextAdded: {
    color: '#4ADE80',
  },
  badgeTextPending: {
    color: '#FBBF24',
  },
  loaderContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    lineHeight: 20,
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  notLoggedInTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  notLoggedInSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  successModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  successModalContent: {
    backgroundColor: '#1E1A34',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(222, 185, 141, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  successIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(222, 185, 141, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(222, 185, 141, 0.3)',
  },
  successModalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  successModalText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  successModalButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
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
    color: '#1E1A34',
    fontSize: 18,
    fontWeight: '700',
  },
});
