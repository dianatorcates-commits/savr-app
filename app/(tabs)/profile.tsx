import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tu perfil</Text>
      <Text style={styles.sub}>Próximamente</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#463E6D', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  sub: { fontSize: 15, color: '#DEB98D' },
});
