// services/profile-theme-service.ts
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const profileThemeCache = new Map<string, { themeId: string; timestamp: number }>();

/**
 * Fetches a user's selected profile theme from Firestore
 * Uses caching to minimize Firestore reads
 * @param userId - The UID of the user
 * @returns The theme ID (defaults to 'default' if not found)
 */
export async function getUserProfileTheme(userId: string): Promise<string> {
  try {
    // Check cache first
    const cached = profileThemeCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.themeId;
    }

    // Access the user document directly
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    let themeId = 'default';
    if (userDoc.exists()) {
      const data = userDoc.data();
      // Access the inventory map field
      themeId = data?.inventory?.selectedProfileTheme || 'default';
    }

    // Update cache
    profileThemeCache.set(userId, { themeId, timestamp: Date.now() });
    
    console.log(`✅ Fetched profile theme for ${userId}: ${themeId}`);
    return themeId;
  } catch (error) {
    console.error(`Error fetching profile theme for user ${userId}:`, error);
    return 'default';
  }
}

/**
 * Gets owned profile themes for a user
 * @param userId - The UID of the user
 * @returns Array of owned theme IDs
 */
export async function getUserOwnedProfileThemes(userId: string): Promise<string[]> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      return data?.inventory?.ownedProfileThemes || ['default'];
    }
    
    return ['default'];
  } catch (error) {
    console.error(`Error fetching owned profile themes for user ${userId}:`, error);
    return ['default'];
  }
}

/**
 * Clears the profile theme cache for a specific user
 * Useful when a user changes their theme
 * @param userId - The UID of the user
 */
export function clearUserProfileThemeCache(userId: string): void {
  profileThemeCache.delete(userId);
}

/**
 * Clears the entire profile theme cache
 * Useful for logout or major state changes
 */
export function clearAllProfileThemeCache(): void {
  profileThemeCache.clear();
}

/**
 * Preloads profile theme for a user (fire-and-forget)
 * Useful for warming the cache before rendering
 * @param userId - User ID to preload
 */
export function preloadUserProfileTheme(userId: string): void {
  // Fire and forget - don't await
  getUserProfileTheme(userId).catch(error => {
    console.error('Error preloading profile theme:', error);
  });
}

/**
 * Gets the current cache size
 * Useful for debugging and monitoring
 */
export function getProfileThemeCacheSize(): number {
  return profileThemeCache.size;
}

/**
 * Gets cache statistics
 * @returns Object with cache stats
 */
export function getProfileThemeCacheStats(): {
  size: number;
  entries: Array<{ userId: string; themeId: string; age: number }>;
} {
  const now = Date.now();
  const entries = Array.from(profileThemeCache.entries()).map(([userId, data]) => ({
    userId,
    themeId: data.themeId,
    age: now - data.timestamp,
  }));
  
  return {
    size: profileThemeCache.size,
    entries,
  };
}