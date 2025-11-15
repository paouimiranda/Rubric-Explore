import AsyncStorage from '@react-native-async-storage/async-storage'; // Fallback for non-sensitive data
import * as SecureStore from 'expo-secure-store'; // New: Expo-compatible secure storage

const USER_KEY = 'userData';

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

export const saveUserData = async (data: UserData): Promise<void> => {
  const jsonValue = JSON.stringify(data);
  try {
    await SecureStore.setItemAsync(USER_KEY, jsonValue); // Encrypted save
    console.log('🔒 SecureStore: userData saved securely');
  } catch (error) {
    console.error('❌ Error saving to SecureStore:', error);
    // Fallback to AsyncStorage if SecureStore fails
    try {
      await AsyncStorage.setItem(USER_KEY, jsonValue);
      console.warn('⚠️ Fallback: Saved to AsyncStorage (not encrypted)');
    } catch (fallbackError) {
      console.error('❌ Fallback save failed:', fallbackError);
      throw new Error('Failed to save user data');
    }
  }
};

export const getUserData = async (): Promise<UserData | null> => {
  try {
    const jsonValue = await SecureStore.getItemAsync(USER_KEY); // Encrypted read
    if (jsonValue) {
      const data = JSON.parse(jsonValue);
      console.log('🔓 SecureStore: userData loaded');
      return data as UserData;
    }
    return null;
  } catch (error) {
    console.error('❌ Error reading from SecureStore:', error);
    // Fallback to AsyncStorage
    try {
      const fallbackValue = await AsyncStorage.getItem(USER_KEY);
      if (fallbackValue) {
        const data = JSON.parse(fallbackValue);
        console.warn('⚠️ Fallback: Loaded from AsyncStorage (not encrypted)');
        return data as UserData;
      }
    } catch (fallbackError) {
      console.error('❌ Fallback read failed:', fallbackError);
    }
    return null;
  }
};

export const clearUserData = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(USER_KEY); // Encrypted clear
    console.log('🗑️ SecureStore: userData cleared');
  } catch (error) {
    console.error('❌ Error clearing from SecureStore:', error);
    // Fallback
    try {
      await AsyncStorage.removeItem(USER_KEY);
      console.warn('⚠️ Fallback: Cleared from AsyncStorage');
    } catch (fallbackError) {
      console.error('❌ Fallback clear failed:', fallbackError);
      throw new Error('Failed to clear user data');
    }
  }
};