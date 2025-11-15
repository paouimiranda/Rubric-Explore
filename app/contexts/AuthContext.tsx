import { onAuthStateChanged, User } from 'firebase/auth';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { auth } from '../../firebase';
import { getCurrentUserData } from '../../services/auth-service';
import { clearUserData, getUserData, saveUserData } from '../../services/storage'; // Updated: Use new storage service

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
  const [initialized, setInitialized] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🧠 Auth state changed');

      if (user) {
        console.log('🔐 Signed in as:', user.uid);
        setUser(user);

        try {
          // Try cached data first
          const cached = await getUserData(); // Updated: Use encrypted storage
          if (cached) {
            setUserData(cached);
            console.log('💾 Loaded userData from secure storage');
          }

          // Always refresh in background
          const freshData = await getCurrentUserData();
          if (freshData) {
            setUserData(freshData as UserData);
            await saveUserData(freshData as UserData); // Updated: Save securely
            console.log('✅ Updated userData from Firestore and saved securely');
          }
        } catch (err) {
          console.error('❌ Failed to load/save user data:', err);
          setUserData(null);
        }
      } else {
        console.log('🚪 User signed out');
        setUser(null);
        setUserData(null);
        await clearUserData(); // Updated: Clear securely
      }

      setLoading(false);
      setInitialized(true);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    user,
    userData,
    loading: !initialized || loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};