import React from 'react';
import { Stack } from 'expo-router';
import AllDiscountsScreen from '../src/screens/AllDiscountsScreen';

export default function AllDiscountsRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false, animation: 'slide_from_right' }} />
      <AllDiscountsScreen />
    </>
  );
}
