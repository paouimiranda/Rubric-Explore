// services/auth-service.ts
import {
  createUserWithEmailAndPassword,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../firebase';

// --- Types ---
export interface UserData {
  uid: string;
  displayName: string;
  email: string;
  username: string;
  dateOfBirth: string;
  createdAt: any;
  updatedAt: any;
  profilePicture: string | null;
  avatar: string | null;
  headerGradient: string[];
  bio: string;
  posts: number;
  isVerified: boolean;
  isActive: boolean;
}

export interface RegisterData {
  displayName: string;
  email: string;
  username: string;
  password: string;
  dateOfBirth: string;
}

export interface UpdateProfileData {
  avatar?: string | null;
  headerGradient?: string[];
  bio?: string;
  displayName?: string;
}

// --- Username Availability ---
export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  const usernamesRef = collection(db, 'usernames');
  const q = query(usernamesRef, where('username', '==', username.toLowerCase()));
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty;
};

// --- Email Availability ---
export const checkEmailAvailability = async (email: string): Promise<boolean> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email.toLowerCase()));
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty;
};

// --- Register User ---
export const registerUser = async (userData: RegisterData): Promise<UserData> => {
  const { displayName, email, username, password, dateOfBirth } = userData;

  if (!(await checkEmailAvailability(email))) throw new Error('Email address is already registered');
  if (!(await checkUsernameAvailability(username))) throw new Error('Username is already taken');

  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  await updateProfile(user, { displayName });

  const userDoc: Omit<UserData, 'uid'> = {
    displayName,
    email: email.toLowerCase(),
    username: username.toLowerCase(),
    dateOfBirth,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    profilePicture: null,
    avatar: null,
    headerGradient: ['#FF999A', '#EE007F'],
    bio: '',
    posts: 0,
    isVerified: false,
    isActive: true,
  };

  await setDoc(doc(db, 'users', user.uid), { uid: user.uid, ...userDoc });

  await setDoc(doc(db, 'usernames', username.toLowerCase()), {
    uid: user.uid,
    username: username.toLowerCase(),
    createdAt: serverTimestamp(),
  });

  return { uid: user.uid, ...userDoc };
};

// --- Login User ---
export const loginUser = async (email: string, password: string): Promise<UserData> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (!userDoc.exists()) throw new Error('User data not found');

  return userDoc.data() as UserData;
};

// --- Logout User ---
export const logoutUser = async (): Promise<void> => {
  await signOut(auth);
};

// --- Update User Profile ---
export const updateUserProfile = async (uid: string, updates: UpdateProfileData): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { ...updates, updatedAt: serverTimestamp() });
};

// --- Get User by Username ---
export const getUserByUsername = async (username: string): Promise<UserData | null> => {
  const usernameDoc = await getDoc(doc(db, 'usernames', username.toLowerCase()));
  if (!usernameDoc.exists()) return null;

  const { uid } = usernameDoc.data() as { uid: string };
  const userDoc = await getDoc(doc(db, 'users', uid));
  return userDoc.exists() ? (userDoc.data() as UserData) : null;
};

// --- Get Current User Data ---
export const getCurrentUserData = async (): Promise<UserData | null> => {
  const user: FirebaseUser | null = auth.currentUser;
  if (!user) return null;

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  return userDoc.exists() ? (userDoc.data() as UserData) : null;
};
