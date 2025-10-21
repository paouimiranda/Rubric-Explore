// components/AuthDebug.tsx
import { useAuth } from '@/app/contexts/AuthContext';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const AuthDebug = () => {
  const { user, userData, loading, isAuthenticated } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔐 Auth Debug</Text>
      <Text style={styles.item}>Loading: {loading ? 'Yes' : 'No'}</Text>
      <Text style={styles.item}>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</Text>
      <Text style={styles.item}>User UID: {user?.uid || 'None'}</Text>
      <Text style={styles.item}>Username: {userData?.username || 'None'}</Text>
      <Text style={styles.item}>Display Name: {userData?.displayName || 'None'}</Text>
      <Text style={styles.item}>Email: {userData?.email || 'None'}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 10,
    margin: 10,
    borderRadius: 5,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  item: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 2,
  },
});

export default AuthDebug;