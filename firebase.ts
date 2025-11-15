// firebase.ts
// Import the functions you need from the SDKs you need
import AsyncStorage from '@react-native-async-storage/async-storage'; // Keep for Firebase persistence
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth"; // Updated: Import getReactNativePersistence
import { getFirestore } from "firebase/firestore";
import { getFunctions } from 'firebase/functions';
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCONDSrcw_pHqXzWDjSTvucv7zFxGuavaQ",
  authDomain: "rubric-app-8f65c.firebaseapp.com",
  projectId: "rubric-app-8f65c",
  storageBucket: "rubric-app-8f65c.firebasestorage.app",
  messagingSenderId: "383859518826",
  appId: "1:383859518826:web:de8fce781ecd0a887c0913",
  measurementId: "G-SJQ5HCRDX3"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Auth with React Native persistence (enables offline auth state)
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage) // Enabled: Persists auth state across app restarts
});

// Initialize Firestore and Storage
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Optional: Add basic error handling for initialization (logs if something goes wrong)
try {
  console.log('🔥 Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
}