import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../app/contexts/AuthContext';
import { logoutUser } from '../../services/auth-service';

const AuthDebug = () => {
  const { user, userData, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logoutUser();
      Alert.alert('Success', 'Logged out successfully');
      router.replace('/screens/login');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.status}>🔄 Loading auth state...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔐 Auth Debug Panel</Text>
      
      <View style={styles.section}>
        <Text style={styles.label}>Authentication Status:</Text>
        <Text style={[styles.value, { color: isAuthenticated ? '#4CAF50' : '#F44336' }]}>
          {isAuthenticated ? '✅ Logged In' : '❌ Not Logged In'}
        </Text>
      </View>

      {user && (
        <View style={styles.section}>
          <Text style={styles.label}>Firebase User ID:</Text>
          <Text style={styles.value}>{user.uid}</Text>
        </View>
      )}

      {user && (
        <View style={styles.section}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{user.email}</Text>
        </View>
      )}

      {userData && (
        <>
          <View style={styles.section}>
            <Text style={styles.label}>Full Name:</Text>
            <Text style={styles.value}>{userData.firstName} {userData.lastName}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Username:</Text>
            <Text style={styles.value}>@{userData.username}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Account Created:</Text>
            <Text style={styles.value}>
              {userData.createdAt ? new Date(userData.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
        </>
      )}

      {!isAuthenticated && (
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.push('/screens/login')}
        >
          <Text style={styles.buttonText}>Go to Login</Text>
        </TouchableOpacity>
      )}

      {isAuthenticated && (
        <TouchableOpacity 
          style={[styles.button, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.note}>
        💡 This component shows the current auth state from anywhere in your app
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  section: {
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  status: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 15,
    fontStyle: 'italic',
  },
});

export default AuthDebug;