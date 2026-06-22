import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Image, Dimensions } from 'react-native';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { authService } from '../services/auth';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeInRight, FadeOutLeft, FadeInLeft } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface Bank {
  id: string;
  name: string;
  logo?: string;
  color?: string;
}

const FOOD_PREFERENCES = ['Pizza', 'Sushi', 'Italiana', 'Peruana', 'Mexicana', 'Ramen'];
type OnboardingSection = 'banks' | 'food' | 'consent';

interface Props {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: Props) {
  const [section, setSection] = useState<OnboardingSection>('banks');
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const banksCollection = collection(db, 'banks');
        const snapshot = await getDocs(banksCollection);
        const banksList: Bank[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.nombre || data.name || doc.id,
            logo: data.logo,
            color: data.color || '#463E6D',
          };
        });
        setBanks(banksList);
      } catch (error) {
        console.error('Error fetching banks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBanks();
  }, []);

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleNextSection = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!selectedBank) return;
    setSection('food');
  };

  const handleFoodNextSection = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedFoods.length === 0) return;
    setSection('consent');
  };

  const handleCompleteOnboarding = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!selectedBank || selectedFoods.length === 0 || !consentAccepted) return;

    setSaving(true);
    setSaveError(null);
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        setSaveError('No se pudo identificar el usuario. Intenta de nuevo.');
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        preferences: {
          bank: {
            id: selectedBank.id,
            name: selectedBank.name,
            logo: selectedBank.logo ?? null,
            color: selectedBank.color ?? '#463E6D',
          },
          foodPreferences: selectedFoods,
        },
        onboarding: true,
        onboardingCompletedAt: new Date().toISOString(),
        termsAccepted: true,
        termsAcceptedAt: new Date().toISOString(),
      }, { merge: true });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
    } catch (error) {
      console.error('Error saving onboarding:', error);
      setSaveError('No se pudieron guardar tus preferencias. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const toggleFoodPreference = (food: string) => {
    Haptics.selectionAsync();
    setSelectedFoods((prev) =>
      prev.includes(food) ? prev.filter((f) => f !== food) : [...prev, food]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#DEB98D" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background Circles matching AuthScreen */}
      <View style={[styles.decorativeCircle, styles.circle1]} />
      <View style={[styles.decorativeCircle, styles.circle2]} />
      
      <BlurView intensity={50} tint="dark" style={styles.blurBackground}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {section === 'banks' ? (
            <Animated.View entering={FadeInRight.duration(600).springify()} exiting={FadeOutLeft.duration(400)} style={styles.section}>
              <Text style={styles.sectionTitle}>¿Qué banco usas?</Text>
              <Text style={styles.sectionSubtitle}>Selecciona tu banco principal para personalizar tus descuentos</Text>

              <View style={styles.banksList}>
                {banks.map((bank, index) => (
                  <Animated.View key={bank.id} entering={FadeIn.delay(index * 100).duration(500)}>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedBank(bank);
                      }}
                      activeOpacity={0.8}
                      style={[
                        styles.cardContainer,
                        selectedBank?.id === bank.id && styles.cardContainerSelected
                      ]}
                    >
                      <BlurView 
                        intensity={selectedBank?.id === bank.id ? 40 : 15} 
                        tint={selectedBank?.id === bank.id ? "light" : "dark"} 
                        style={styles.cardBlur}
                      >
                        <View style={styles.bankCardContent}>
                          {bank.logo ? (
                            <Image source={{ uri: bank.logo }} style={styles.bankLogo} />
                          ) : (
                            <View style={styles.bankInitials}>
                              <Text style={styles.bankInitialsText}>{getInitials(bank.name)}</Text>
                            </View>
                          )}
                          <Text style={styles.bankName}>{bank.name}</Text>
                        </View>
                        {selectedBank?.id === bank.id && (
                          <View style={styles.checkmark}>
                            <Text style={styles.checkmarkText}>✓</Text>
                          </View>
                        )}
                      </BlurView>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.button, !selectedBank && styles.buttonDisabled]}
                onPress={handleNextSection}
                disabled={!selectedBank}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Continuar</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : section === 'food' ? (
            <Animated.View entering={FadeInRight.duration(600).springify()} exiting={FadeOutLeft.duration(400)} style={styles.section}>
              <Text style={styles.sectionTitle}>¿Qué te gusta?</Text>
              <Text style={styles.sectionSubtitle}>Selecciona tu comida favorita</Text>

              <View style={styles.foodGrid}>
                {FOOD_PREFERENCES.map((food, index) => (
                  <Animated.View key={food} entering={FadeIn.delay(index * 100).duration(500)} style={{ width: '48%' }}>
                    <TouchableOpacity
                      onPress={() => toggleFoodPreference(food)}
                      activeOpacity={0.8}
                      style={[
                        styles.cardContainer,
                        selectedFoods.includes(food) && styles.cardContainerSelected
                      ]}
                    >
                      <BlurView 
                        intensity={selectedFoods.includes(food) ? 40 : 15} 
                        tint={selectedFoods.includes(food) ? "light" : "dark"} 
                        style={[styles.cardBlur, { flexDirection: 'column', justifyContent: 'center', paddingVertical: 24, gap: 12, alignItems: 'center' }]}
                      >
                        <Text style={styles.foodEmoji}>{getFoodEmoji(food)}</Text>
                        <Text style={styles.foodName}>{food}</Text>
                        {selectedFoods.includes(food) && (
                          <View style={[styles.checkmark, { position: 'absolute', top: 12, right: 12 }]}>
                            <Text style={styles.checkmarkText}>✓</Text>
                          </View>
                        )}
                      </BlurView>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.backButton]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSection('banks');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.backButtonText}>Atrás</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, { flex: 2 }, !selectedFoods.length && styles.buttonDisabled]}
                  onPress={handleFoodNextSection}
                  disabled={!selectedFoods.length}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>Continuar</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInRight.duration(600).springify()} exiting={FadeOutLeft.duration(400)} style={styles.section}>
              <Text style={styles.sectionTitle}>Términos y Privacidad</Text>
              <Text style={styles.sectionSubtitle}>Para poder continuar, lee y acepta los términos de servicio y políticas de privacidad de Savr.</Text>

              {/* Botones para consultar documentos */}
              <View style={{ gap: 16, marginBottom: 32 }}>
                <TouchableOpacity
                  style={styles.documentBtn}
                  onPress={async () => {
                    await openBrowserAsync('https://github.com/dianatorcates-commits/savr-app/wiki/Savr-Pol%C3%ADtica-de-Privacidad', {
                      presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
                    });
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="shield-checkmark-outline" size={24} color="#DEB98D" />
                  <Text style={styles.documentBtnText}>Ver Políticas de Privacidad</Text>
                  <Ionicons name="chevron-forward" size={20} color="#DEB98D" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.documentBtn}
                  onPress={async () => {
                    await openBrowserAsync('https://github.com/dianatorcates-commits/savr-app/wiki/T%C3%A9rminos-y-Condiciones-%E2%80%90-Savr', {
                      presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
                    });
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="document-text-outline" size={24} color="#DEB98D" />
                  <Text style={styles.documentBtnText}>Ver Términos y Condiciones</Text>
                  <Ionicons name="chevron-forward" size={20} color="#DEB98D" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              </View>

              {/* Checkbox de consentimiento */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  setConsentAccepted(!consentAccepted);
                }}
                activeOpacity={0.8}
                style={styles.checkboxContainer}
              >
                <Ionicons
                  name={consentAccepted ? "checkbox" : "square-outline"}
                  size={28}
                  color={consentAccepted ? "#DEB98D" : "rgba(255,255,255,0.4)"}
                />
                <Text style={styles.checkboxText}>
                  Acepto las Políticas de Privacidad y confirmo que he leído los Términos y Condiciones.
                </Text>
              </TouchableOpacity>

              {saveError && <Text style={styles.errorText}>{saveError}</Text>}

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.backButton]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSection('food');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.backButtonText}>Atrás</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, { flex: 2 }, !consentAccepted && styles.buttonDisabled]}
                  onPress={handleCompleteOnboarding}
                  disabled={!consentAccepted || saving}
                  activeOpacity={0.8}
                >
                  {saving ? (
                    <ActivityIndicator color="#2A2445" />
                  ) : (
                    <Text style={styles.buttonText}>Empezar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </BlurView>
    </View>
  );
}

function getFoodEmoji(food: string): string {
  const emojiMap: Record<string, string> = {
    Pizza: '🍕',
    Sushi: '🍣',
    Italiana: '🍝',
    Peruana: '🍲',
    Mexicana: '🌮',
    Ramen: '🍜',
  };
  return emojiMap[food] || '🍽️';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2A2445',
  },
  blurBackground: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 80,
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.3,
  },
  circle1: {
    width: width * 0.9,
    height: width * 0.9,
    top: -height * 0.1,
    right: -width * 0.25,
    backgroundColor: '#DEB98D',
  },
  circle2: {
    width: width * 0.8,
    height: width * 0.8,
    bottom: -height * 0.05,
    left: -width * 0.3,
    backgroundColor: '#6A5ACD',
  },
  section: {
    zIndex: 10,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -1,
  },
  sectionSubtitle: {
    fontSize: 17,
    color: 'rgba(222, 185, 141, 0.9)',
    fontWeight: '500',
    marginBottom: 32,
    lineHeight: 24,
  },
  banksList: {
    marginBottom: 40,
    gap: 16,
  },
  cardContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardContainerSelected: {
    borderColor: '#DEB98D',
    transform: [{ scale: 1.02 }], // Pequeño rebote
  },
  cardBlur: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bankCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  bankLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  bankInitials: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(222, 185, 141, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(222, 185, 141, 0.4)',
  },
  bankInitialsText: {
    color: '#DEB98D',
    fontSize: 16,
    fontWeight: '800',
  },
  bankName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DEB98D',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DEB98D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  checkmarkText: {
    color: '#2A2445',
    fontSize: 14,
    fontWeight: '800',
  },
  foodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
    marginBottom: 40,
  },
  foodEmoji: {
    fontSize: 42,
  },
  foodName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#DEB98D',
    paddingHorizontal: 30,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#2A2445',
    fontSize: 17,
    fontWeight: '800',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    elevation: 0,
    shadowOpacity: 0,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  documentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  documentBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  checkboxText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    flex: 1,
  },
});
