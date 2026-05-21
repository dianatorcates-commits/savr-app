import React, { useState, useEffect } from 'react';
import { useNavigation } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/src/services/firebase';
import { authService } from '@/src/services/auth';
import { UserProfile } from '@/src/types';
import AuthScreen from '@/src/screens/AuthScreen';
import OnboardingScreen from '@/src/screens/OnboardingScreen';
import HomeScreen from '@/src/screens/HomeScreen';

export default function Index() {
  const navigation = useNavigation();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const showTabBar = !loading && !!user && onboardingCompleted;
    navigation.setOptions({ tabBarHidden: !showTabBar } as any);
  }, [loading, user, onboardingCompleted, navigation]);

  useEffect(() => {
    const unsubscribe = authService.onAuthChange(async (user) => {
      setUser(user);

      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          setOnboardingCompleted(userDoc.data()?.onboarding ?? false);
        } catch {
          setOnboardingCompleted(false);
        }
      }

      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return null;

  if (!user) return <AuthScreen />;
  if (!onboardingCompleted) return <OnboardingScreen onComplete={() => setOnboardingCompleted(true)} />;
  return <HomeScreen />;
}
