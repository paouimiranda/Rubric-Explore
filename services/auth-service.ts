//services/auth-service.ts
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
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  dateOfBirth: string;
  displayName: string;
  createdAt: any;
  updatedAt: any;
  profilePicture: string | null;
  avatar: string | null; // New field for avatar URL
  headerGradient: string[]; // New field for header gradient colors
  bio: string;
  followers: number;
  following: number;
  posts: number;
  isVerified: boolean;
  isActive: boolean;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
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
  try {
    const usernamesRef = collection(db, 'usernames');
    const q = query(usernamesRef, where('username', '==', username.toLowerCase()));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty; // Returns true if username is available
  } catch (error) {
    console.error('Error checking username availability:', error);
    throw new Error('Failed to check username availability');
  }
};

// --- Email Availability ---
export const checkEmailAvailability = async (email: string): Promise<boolean> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
  } catch (error) {
    console.error('Error checking email availability:', error);
    throw new Error('Failed to check email availability');
  }
};

// --- Register User ---
export const registerUser = async (userData: RegisterData): Promise<UserData> => {
  try {
    const { firstName, lastName, email, username, password, dateOfBirth } = userData;

    const emailAvailable = await checkEmailAvailability(email);
    if (!emailAvailable) throw new Error('Email address is already registered');

    const usernameAvailable = await checkUsernameAvailability(username);
    if (!usernameAvailable) throw new Error('Username is already taken');

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, {
      displayName: `${firstName} ${lastName}`,
    });

    const userDoc: Omit<UserData, 'uid'> = {
      firstName,
      lastName,
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      dateOfBirth,
      displayName: `${firstName} ${lastName}`,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      profilePicture: null,
      avatar: null, // Default avatar
      headerGradient: ['#FF999A', '#EE007F'], // Default header gradient
      bio: '',
      followers: 0,
      following: 0,
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
  } catch (error: any) {
    console.error('Registration error:', error);

    switch (error.code) {
      case 'auth/email-already-in-use':
        throw new Error('Email address is already registered');
      case 'auth/invalid-email':
        throw new Error('Invalid email address');
      case 'auth/weak-password':
        throw new Error('Password should be at least 6 characters long');
      case 'auth/network-request-failed':
        throw new Error('Network error. Please check your connection');
      default:
        throw new Error(error.message || 'Registration failed');
    }
  }
};

// --- Login User ---
export const loginUser = async (email: string, password: string): Promise<UserData> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) throw new Error('User data not found');

    return userDoc.data() as UserData;
  } catch (error: any) {
    console.error('Login error:', error);
    switch (error.code) {
      case 'auth/user-not-found':
        throw new Error('No account found with this email');
      case 'auth/wrong-password':
        throw new Error('Incorrect password');
      case 'auth/invalid-email':
        throw new Error('Invalid email address');
      case 'auth/too-many-requests':
        throw new Error('Too many failed attempts. Please try again later');
      case 'auth/network-request-failed':
        throw new Error('Network error. Please check your connection');
      default:
        throw new Error(error.message || 'Login failed');
    }
  }
};

// --- Logout User ---
export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
    throw new Error('Failed to logout');
  }
};

// --- Update User Profile ---
export const updateUserProfile = async (
  uid: string,
  updates: UpdateProfileData
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new Error('Failed to update profile');
  }
};

// --- Get User by Username ---
export const getUserByUsername = async (username: string): Promise<UserData | null> => {
  try {
    const usernameDoc = await getDoc(doc(db, 'usernames', username.toLowerCase()));
    if (!usernameDoc.exists()) return null;

    const { uid } = usernameDoc.data() as { uid: string };
    const userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.exists() ? (userDoc.data() as UserData) : null;
  } catch (error) {
    console.error('Error getting user by username:', error);
    throw new Error('Failed to get user data');
  }
};

// --- Get Current User Data ---
export const getCurrentUserData = async (): Promise<UserData | null> => {
  try {
    const user: FirebaseUser | null = auth.currentUser;
    if (!user) return null;

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    return userDoc.exists() ? (userDoc.data() as UserData) : null;
  } catch (error) {
    console.error('Error getting current user data:', error);
    throw new Error('Failed to get user data');
  }
};