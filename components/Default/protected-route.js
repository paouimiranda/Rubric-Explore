// components/ProtectedRoute.js
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // If no user, redirect to login
  if (!user) {
    router.replace('/screens/login');
    return null;
  }

  // User is authenticated, show the protected content
  return children;
};

export default ProtectedRoute;

// Usage example:
// <ProtectedRoute>
//   <YourProtectedScreen />
// </ProtectedRoute>