import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.container}>
        <Text style={styles.title}>MedWaste Mobile</Text>
        <Text style={styles.subtitle}>You are logged in successfully.</Text>

        <View style={styles.card}>
          <Text style={styles.item}>Name: {user?.fullName || '-'}</Text>
          <Text style={styles.item}>Email: {user?.email || '-'}</Text>
          <Text style={styles.item}>Role: {user?.role || '-'}</Text>
        </View>

        <Pressable style={styles.button} onPress={logout}>
          <Text style={styles.buttonText}>Log Out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#020617' },
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { color: '#fff', fontSize: 30, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#94A3B8', marginBottom: 20 },
  card: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 14,
  },
  item: { color: '#E2E8F0', fontSize: 16, marginBottom: 8 },
  button: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D4ED8',
    marginTop: 20,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
