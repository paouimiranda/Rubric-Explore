// firebase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getDatabase } from 'firebase/database';
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
  measurementId: "G-SJQ5HCRDX3",
  // FIXED: Removed trailing slash
  databaseURL: "https://rubric-app-8f65c-default-rtdb.asia-southeast1.firebasedatabase.app",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Auth with React Native persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export const rtdb = getDatabase(app);

// Log initialization status
console.log('🔥 Firebase initialized successfully');
console.log('📡 RTDB URL:', firebaseConfig.databaseURL);
console.log('✅ RTDB instance created:', !!rtdb);