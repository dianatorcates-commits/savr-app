import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { authService } from '../services/auth';
import { UserProfile } from '../types';
import AuthScreen from '../screens/AuthScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LandingScreen from '../screens/LandingScreen';
import HomeScreen from '../screens/HomeScreen';

const Stack = createNativeStackNavigator();

export default function Navigation() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthChange(async (user) => {
      setUser(user);

      if (user) {
        // Check if onboarding is completed
        try {
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          const onboardingStatus = userDoc.data()?.onboarding ?? false;
          setOnboardingCompleted(onboardingStatus);
        } catch (error) {
          console.error('Error checking onboarding status:', error);
          setOnboardingCompleted(false);
        }
      }

      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return null; // Splash screen aquí
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          onboardingCompleted ? (
            <>
              <Stack.Screen name="Landing" component={LandingScreen} />
              <Stack.Screen name="Home" component={HomeScreen} />
            </>
          ) : (
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          )
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
