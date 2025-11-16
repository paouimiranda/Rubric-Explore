import { onAuthStateChanged, User } from "firebase/auth";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import { auth } from "../../firebase";
import { getCurrentUserData } from "../../services/auth-service";
import {
  clearUserData,
  getUserData,
  saveUserData,
} from "../../services/storage";

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
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
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
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      console.log("🔥 Firebase auth state changed");

      if (!authUser) {
        console.log("🚪 Logged out");
        setUser(null);
        setUserData(null);
        await clearUserData();
        setLoading(false);
        return;
      }

      console.log("🔐 Logged in:", authUser.uid);
      setUser(authUser);

      try {
        // 1️⃣ Load cached data instantly (faster UI)
        const cached = await getUserData();
        if (cached) {
          setUserData(cached);
          console.log("💾 Loaded cached user data");
        }

        // 2️⃣ Fetch fresh Firestore data in background
        const fresh = await getCurrentUserData();
        if (fresh) {
          setUserData(fresh as UserData);
          await saveUserData(fresh as UserData);
          console.log("🌐 Updated user data from Firestore");
        }
      } catch (err) {
        console.error("❌ Error loading user data:", err);
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
