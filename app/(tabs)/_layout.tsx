import { Tabs } from 'expo-router';
import React from 'react';
import { FloatingTabBar } from '@/components/floating-tab-bar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index"   options={{ title: 'Inicio' }} />
      <Tabs.Screen name="map"     options={{ title: 'Mapa' }} />
      <Tabs.Screen name="split"   options={{ title: 'Dividir' }} />
      <Tabs.Screen name="friends" options={{ title: 'Amigos' }} />
      <Tabs.Screen name="profile" options={{ title: 'Tu' }} />
      <Tabs.Screen name="saved-bills" options={{ href: null } as any} />
    </Tabs>
  );
}
