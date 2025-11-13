// File: services/shop-service.ts
import {
  arrayUnion,
  doc,
  getDoc,
  increment,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase';

// ============================================
// INTERFACES
// ============================================

export interface UserInventory {
  ownedThemes: string[]; // Array of theme IDs
  activeTheme: string; // Currently active theme ID
  ownedAvatars?: string[];
  activeAvatar?: string;
  ownedBadges?: string[];
  ownedEffects?: string[];
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

export class ShopService {
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
   * Get user inventory from users collection
   */
  static async getUserInventory(): Promise<UserInventory> {
    try {
      const userId = this.getCurrentUserId();
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        // Return default inventory if user doc doesn't exist
        return {
          ownedThemes: ['default'], // Everyone starts with default theme
          activeTheme: 'default',
          ownedAvatars: [],
          ownedBadges: [],
          ownedEffects: [],
        };
      }
      
      const userData = userDoc.data();
      return {
        ownedThemes: userData.inventory?.ownedThemes || ['default'],
        activeTheme: userData.inventory?.activeTheme || 'default',
        ownedAvatars: userData.inventory?.ownedAvatars || [],
        activeAvatar: userData.inventory?.activeAvatar,
        ownedBadges: userData.inventory?.ownedBadges || [],
        ownedEffects: userData.inventory?.ownedEffects || [],
      };
    } catch (error) {
      console.error('Error fetching user inventory:', error);
      throw error;
    }
  }

  /**
   * Check if user owns a specific theme
   */
  static async ownsTheme(themeId: string): Promise<boolean> {
    try {
      const inventory = await this.getUserInventory();
      return inventory.ownedThemes.includes(themeId);
    } catch (error) {
      console.error('Error checking theme ownership:', error);
      return false;
    }
  }

  /**
   * Purchase a theme
   */
  static async purchaseTheme(themeId: string, price: number): Promise<PurchaseResult> {
    try {
      const userId = this.getCurrentUserId();
      
      // Check if already owned
      const alreadyOwned = await this.ownsTheme(themeId);
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
      
      // Add theme to inventory in users collection
      await updateDoc(doc(db, 'users', userId), {
        'inventory.ownedThemes': arrayUnion(themeId),
        'inventory.updatedAt': serverTimestamp(),
      });
      
      const newBalance = currentShards - price;
      
      return {
        success: true,
        message: 'Theme purchased successfully!',
        newShardsBalance: newBalance,
      };
    } catch (error) {
      console.error('Error purchasing theme:', error);
      return {
        success: false,
        message: 'An error occurred while purchasing. Please try again.',
      };
    }
  }

  /**
   * Set active theme
   */
  static async setActiveTheme(themeId: string): Promise<{ success: boolean; message: string }> {
    try {
      const userId = this.getCurrentUserId();
      
      // Check if user owns the theme
      const ownsIt = await this.ownsTheme(themeId);
      if (!ownsIt) {
        return {
          success: false,
          message: 'You do not own this theme',
        };
      }
      
      // Update active theme
      await updateDoc(doc(db, 'users', userId), {
        'inventory.activeTheme': themeId,
        'inventory.updatedAt': serverTimestamp(),
      });
      
      return {
        success: true,
        message: 'Theme activated successfully!',
      };
    } catch (error) {
      console.error('Error setting active theme:', error);
      return {
        success: false,
        message: 'An error occurred. Please try again.',
      };
    }
  }

  /**
   * Initialize user inventory (call on first app launch or registration)
   */
  static async initializeUserInventory(): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists() || !userDoc.data().inventory) {
        await updateDoc(doc(db, 'users', userId), {
          inventory: {
            ownedThemes: ['default'],
            activeTheme: 'default',
            ownedAvatars: [],
            ownedBadges: [],
            ownedEffects: [],
            updatedAt: serverTimestamp(),
          },
        });
      }
    } catch (error) {
      console.error('Error initializing user inventory:', error);
      throw error;
    }
  }

  /**
   * Get active theme ID
   */
  static async getActiveTheme(): Promise<string> {
    try {
      const inventory = await this.getUserInventory();
      return inventory.activeTheme;
    } catch (error) {
      console.error('Error getting active theme:', error);
      return 'default';
    }
  }
}