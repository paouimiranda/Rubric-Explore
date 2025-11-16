// contexts/AuthContext.tsx
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

interface UserData { /* keep your fields as-is */ }

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  /** true while auth/user data still initializing */
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

  // true until onAuthStateChanged fires the first time
  const [initializing, setInitializing] = useState<boolean>(true);
  // true while fetching fresh user data from network
  const [userDataLoading, setUserDataLoading] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      console.log("🔥 Firebase auth state changed");

      // first time onAuthStateChanged called -> not initializing anymore
      if (initializing) setInitializing(false);

      if (!authUser) {
        console.log("🚪 Logged out");
        setUser(null);
        setUserData(null);
        await clearUserData();
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

        // 2️⃣ Fetch fresh Firestore data in background (set loading flag)
        setUserDataLoading(true);
        const fresh = await getCurrentUserData();
        if (fresh) {
          setUserData(fresh as UserData);
          await saveUserData(fresh as UserData);
          console.log("🌐 Updated user data from Firestore");
        }
      } catch (err) {
        console.error("❌ Error loading user data:", err);
      } finally {
        setUserDataLoading(false);
      }
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  // expose a single `loading` that callers can use to wait for auth + data
  const loading = initializing || userDataLoading;

  const value: AuthContextType = {
    user,
    userData,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
