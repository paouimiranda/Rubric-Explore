// File: services/profile-theme-shop-service.ts
import {
    arrayUnion,
    doc,
    getDoc,
    increment,
    serverTimestamp,
    updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { clearUserProfileThemeCache } from './profile-theme-service';

// ============================================
// INTERFACES
// ============================================

export interface ProfileThemeInventory {
  ownedProfileThemes: string[]; // Array of profile theme IDs
  selectedProfileTheme: string; // Currently selected profile theme ID
  updatedAt?: any;
}

export interface PurchaseResult {
  success: boolean;
  message: string;
  newShardsBalance?: number;
}

// ============================================
// SERVICE CLASS
// ============================================

export class ProfileThemeShopService {
  /**
   * Get current user ID
   */
  private static getCurrentUserId(): string {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated.');
    }
    return user.uid;
  }

  /**
   * Get user's shards balance from userStats
   */
  static async getUserShards(): Promise<number> {
    try {
      const userId = this.getCurrentUserId();
      const statsDoc = await getDoc(doc(db, 'userStats', userId));
      
      if (!statsDoc.exists()) {
        return 0;
      }
      
      return statsDoc.data().shards || 0;
    } catch (error) {
      console.error('Error fetching user shards:', error);
      return 0;
    }
  }

  /**
   * Get user profile theme inventory from users collection
   */
  static async getUserInventory(): Promise<ProfileThemeInventory> {
    try {
      const userId = this.getCurrentUserId();
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        // Return default inventory if user doc doesn't exist
        return {
          ownedProfileThemes: ['default'], // Everyone starts with default theme
          selectedProfileTheme: 'default',
        };
      }
      
      const userData = userDoc.data();
      return {
        ownedProfileThemes: userData.inventory?.ownedProfileThemes || ['default'],
        selectedProfileTheme: userData.inventory?.selectedProfileTheme || 'default',
      };
    } catch (error) {
      console.error('Error fetching profile theme inventory:', error);
      throw error;
    }
  }

  /**
   * Check if user owns a specific profile theme
   */
  static async ownsProfileTheme(themeId: string): Promise<boolean> {
    try {
      const inventory = await this.getUserInventory();
      return inventory.ownedProfileThemes.includes(themeId);
    } catch (error) {
      console.error('Error checking profile theme ownership:', error);
      return false;
    }
  }

  /**
   * Purchase a profile theme
   */
  static async purchaseProfileTheme(themeId: string, price: number): Promise<PurchaseResult> {
    try {
      const userId = this.getCurrentUserId();
      
      // Check if already owned
      const alreadyOwned = await this.ownsProfileTheme(themeId);
      if (alreadyOwned) {
        return {
          success: false,
          message: 'You already own this theme',
        };
      }
      
      // Check if user has enough shards
      const currentShards = await this.getUserShards();
      if (currentShards < price) {
        return {
          success: false,
          message: `Not enough shards. You need ${price - currentShards} more shards.`,
        };
      }
      
      // Deduct shards from userStats
      await updateDoc(doc(db, 'userStats', userId), {
        shards: increment(-price),
        updatedAt: serverTimestamp(),
      });
      
      // Add profile theme to inventory in users collection
      await updateDoc(doc(db, 'users', userId), {
        'inventory.ownedProfileThemes': arrayUnion(themeId),
        'inventory.updatedAt': serverTimestamp(),
      });
      
      const newBalance = currentShards - price;
      
      return {
        success: true,
        message: 'Profile theme purchased successfully!',
        newShardsBalance: newBalance,
      };
    } catch (error) {
      console.error('Error purchasing profile theme:', error);
      return {
        success: false,
        message: 'An error occurred while purchasing. Please try again.',
      };
    }
  }

  /**
   * Set selected profile theme
   */
  static async setSelectedProfileTheme(themeId: string): Promise<{ success: boolean; message: string }> {
    try {
      const userId = this.getCurrentUserId();
      
      // Check if user owns the theme
      const ownsIt = await this.ownsProfileTheme(themeId);
      if (!ownsIt) {
        return {
          success: false,
          message: 'You do not own this theme',
        };
      }
      
      // Update selected profile theme
      await updateDoc(doc(db, 'users', userId), {
        'inventory.selectedProfileTheme': themeId,
        'inventory.updatedAt': serverTimestamp(),
      });
      
      // Clear the cache so the new theme is reflected immediately
      clearUserProfileThemeCache(userId);
      
      return {
        success: true,
        message: 'Profile theme activated successfully!',
      };
    } catch (error) {
      console.error('Error setting selected profile theme:', error);
      return {
        success: false,
        message: 'An error occurred. Please try again.',
      };
    }
  }

  /**
   * Initialize user profile theme inventory (call on first app launch or registration)
   */
  static async initializeUserInventory(): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      // Only initialize if inventory doesn't exist or doesn't have profile themes
      if (!userDoc.exists() || !userDoc.data().inventory?.ownedProfileThemes) {
        const existingInventory = userDoc.exists() ? userDoc.data().inventory || {} : {};
        
        await updateDoc(doc(db, 'users', userId), {
          inventory: {
            ...existingInventory,
            ownedProfileThemes: ['default'],
            selectedProfileTheme: 'default',
            updatedAt: serverTimestamp(),
          },
        });
      }
    } catch (error) {
      console.error('Error initializing profile theme inventory:', error);
      throw error;
    }
  }

  /**
   * Get selected profile theme ID
   */
  static async getSelectedProfileTheme(): Promise<string> {
    try {
      const inventory = await this.getUserInventory();
      return inventory.selectedProfileTheme;
    } catch (error) {
      console.error('Error getting selected profile theme:', error);
      return 'default';
    }
  }
}