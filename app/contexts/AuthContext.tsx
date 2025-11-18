// contexts/AuthContext.tsx
import { onAuthStateChanged, User } from "firebase/auth";
import {
  doc,
  DocumentData,
  Unsubscribe as FirestoreUnsubscribe,
  onSnapshot
} from "firebase/firestore";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { auth, firestore } from "../../firebase";
import { getCurrentUserData } from "../../services/auth-service";
import {
  clearUserData,
  getUserData,
  saveUserData,
} from "../../services/storage";

/** Make sure UserData includes isVerified */
interface UserData {
  uid?: string;
  email?: string;
  displayName?: string;
  // ...other fields you use
  isVerified?: boolean;
  // Allow other arbitrary fields from Firestore
  [k: string]: any;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  /** true while auth/user data still initializing */
  loading: boolean;
  /** app-level "authenticated" means: firebase user exists AND userData.isVerified === true */
  isAuthenticated: boolean;
  /** convenient helper to refresh userData from Firestore on demand */
  refreshUserData: () => Promise<void>;
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
  // true while fetching fresh user data from network or refreshing
  const [userDataLoading, setUserDataLoading] = useState<boolean>(false);

  // keep a ref to the current Firestore doc unsubscribe so we can cleanup/replace it
  const docUnsubscribeRef = useRef<FirestoreUnsubscribe | null>(null);

  const loadFreshUserData = useCallback(async (): Promise<UserData | null> => {
    try {
      const fresh = await getCurrentUserData();
      if (fresh) {
        setUserData(fresh as UserData);
        await saveUserData(fresh as UserData);
        console.log("🌐 Loaded fresh user data from Firestore");
        return fresh as UserData;
      } else {
        setUserData(null);
        await clearUserData();
        return null;
      }
    } catch (err) {
      console.error("❌ Error loading fresh user data:", err);
      return null;
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    setUserDataLoading(true);
    try {
      await loadFreshUserData();
    } finally {
      setUserDataLoading(false);
    }
  }, [loadFreshUserData]);

  useEffect(() => {
    // Subscribe to Firebase auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      console.log("🔥 Firebase auth state changed");

      // first time onAuthStateChanged called -> not initializing anymore
      if (initializing) setInitializing(false);

      // cleanup any prior doc subscription
      if (docUnsubscribeRef.current) {
        try {
          docUnsubscribeRef.current();
        } catch {
          /* ignore */
        }
        docUnsubscribeRef.current = null;
      }

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
        // 1) Load cached data for immediate UI
        const cached = await getUserData();
        if (cached) {
          setUserData(cached);
          console.log("💾 Loaded cached user data");
        }

        // 2) Load fresh once (so we have up-to-date state quickly)
        setUserDataLoading(true);
        const fresh = await loadFreshUserData();

        // 3) Subscribe to realtime doc updates so changes (like isVerified toggling) flow automatically
        try {
          const userDocRef = doc(firestore, "users", authUser.uid);
          const unsubscribeDoc = onSnapshot(
            userDocRef,
            async (snap) => {
              const data = (snap.exists() ? (snap.data() as DocumentData) : null) ?? null;
              if (data) {
                // Normalize to isVerified boolean if remote uses that field
                const normalized = {
                  ...data,
                  isVerified: !!data.isVerified,
                } as UserData;

                setUserData(normalized);
                try {
                  await saveUserData(normalized);
                } catch (err) {
                  // non-fatal: still keep showing data
                  console.warn("⚠️ Failed to persist userData cache:", err);
                }
              } else {
                // doc deleted or missing
                setUserData(null);
                await clearUserData();
              }
            },
            (error) => {
              console.error("❌ onSnapshot user doc error:", error);
            }
          );

          // store unsubscribe so we can call it on sign-out or when auth changes
          docUnsubscribeRef.current = unsubscribeDoc;
        } catch (err) {
          console.error("❌ Failed to start onSnapshot for user doc:", err);
        }
      } catch (err) {
        console.error("❌ Error in auth state handling:", err);
      } finally {
        setUserDataLoading(false);
      }
    });

    return () => {
      // cleanup auth listener + any doc subscription
      unsubscribeAuth();
      if (docUnsubscribeRef.current) {
        try {
          docUnsubscribeRef.current();
        } catch {
          /* ignore */
        }
        docUnsubscribeRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadFreshUserData, initializing]);

  // expose a single `loading` that callers can use to wait for auth + data
  const loading = initializing || userDataLoading;

  // IMPORTANT: treat user as authenticated only if user exists AND userData.isVerified === true
  const isAuthenticated = !!user && !!userData && userData.isVerified === true;

  const value: AuthContextType = {
    user,
    userData,
    loading,
    isAuthenticated,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
