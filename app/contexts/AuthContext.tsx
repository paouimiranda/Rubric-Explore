// contexts/AuthContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, User } from 'firebase/auth';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { auth } from '../../firebase';
import { getCurrentUserData } from '../../services/auth-service';

interface UserData {
  uid: string;
  username: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  profilePicture: string | null;
  avatar: string | null;
  headerGradient: string[];
  bio: string;
  followers: number;
  following: number;
  posts: number;
  isVerified: boolean;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        console.log('🔐 User signed in:', user.uid);

        try {
          // 🧠 Try loading cached user data first
          const cachedData = await AsyncStorage.getItem('userData');
          if (cachedData) {
            console.log('💾 Loaded userData from AsyncStorage.');
            setUserData(JSON.parse(cachedData));
          } else {
            console.log('⚠️ No cached userData found in AsyncStorage.');
          }

          // 🔄 Then fetch latest user data from Firestore
          const data = await getCurrentUserData();
          if (data) {
            setUserData(data as UserData);
            await AsyncStorage.setItem('userData', JSON.stringify(data));
            console.log('✅ Updated and saved userData to AsyncStorage.');
          }
        } catch (error) {
          console.error('❌ Error fetching user data:', error);
          setUserData(null);
          await AsyncStorage.removeItem('userData');
          console.log('🧹 Cleared AsyncStorage due to error.');
        }
      } else {
        console.log('🚪 User signed out.');
        setUser(null);
        setUserData(null);
        await AsyncStorage.removeItem('userData');
        console.log('🧹 AsyncStorage cleared (logout).');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    user,
    userData,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
