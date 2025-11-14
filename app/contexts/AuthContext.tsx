import { onAuthStateChanged, User } from 'firebase/auth';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { auth } from '../../firebase';
import { getCurrentUserData } from '../../services/auth-service';
import { clearUserData, getUserData, saveUserData } from '../../services/storage';

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
    // ✅ FIXED: This listener fires AFTER Firebase checks AsyncStorage
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🧠 Auth state changed:', user ? `Signed in as ${user.uid}` : 'Signed out');

      if (user) {
        setUser(user);

        try {
          // Try cached data first for instant load
          const cached = await getUserData();
          if (cached) {
            setUserData(cached);
            console.log('💾 Loaded userData from secure storage');
          }

          // Fetch fresh data in background
          const freshData = await getCurrentUserData();
          if (freshData) {
            setUserData(freshData as UserData);
            await saveUserData(freshData as UserData);
            console.log('✅ Updated userData from Firestore');
          }
        } catch (err) {
          console.error('❌ Failed to load user data:', err);
          // Keep user logged in even if Firestore fetch fails
          if (!userData) {
            setUserData(null);
          }
        }
      } else {
        // User signed out
        setUser(null);
        setUserData(null);
        await clearUserData();
      }

      // ✅ CRITICAL: Only set loading to false AFTER auth state is determined
      setLoading(false);
    });

    return unsubscribe;
  }, []); // ✅ Empty dependency array - only run once on mount

  const value: AuthContextType = {
    user,
    userData,
    loading, // ✅ Simplified: just use loading directly
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};