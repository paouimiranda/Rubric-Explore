// services/theme-service.ts
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const themeCache = new Map<string, { themeId: string; timestamp: number }>();

/**
 * Fetches a user's selected friend card theme from Firestore
 * Uses caching to minimize Firestore reads
 * @param userId - The UID of the user
 * @returns The theme ID (defaults to 'default' if not found)
 */
export async function getUserTheme(userId: string): Promise<string> {
  try {
    // Check cache first
    const cached = themeCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.themeId;
    }

    // FIX: Access the user document directly, not a subcollection
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    let themeId = 'default';
    if (userDoc.exists()) {
      const data = userDoc.data();
      // Access the inventory map field
      themeId = data?.inventory?.selectedFriendCardTheme || 'default';
    }

    // Update cache
    themeCache.set(userId, { themeId, timestamp: Date.now() });
    
    console.log(`✅ Fetched theme for ${userId}: ${themeId}`);
    return themeId;
  } catch (error) {
    console.error(`Error fetching theme for user ${userId}:`, error);
    return 'default';
  }
}

/**
 * Batch fetches themes for multiple users
 * Optimizes Firestore reads by checking cache first
 * @param userIds - Array of user IDs
 * @returns Map of userId -> themeId
 */
export async function getUserThemesBatch(userIds: string[]): Promise<Map<string, string>> {
  const themeMap = new Map<string, string>();
  const uncachedUsers: string[] = [];
  
  // Separate cached vs uncached users
  for (const userId of userIds) {
    const cached = themeCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      themeMap.set(userId, cached.themeId);
    } else {
      uncachedUsers.push(userId);
    }
  }
  
  // Fetch uncached themes in parallel
  if (uncachedUsers.length > 0) {
    const fetchPromises = uncachedUsers.map(async (userId) => {
      const themeId = await getUserTheme(userId);
      return { userId, themeId };
    });
    
    try {
      const results = await Promise.all(fetchPromises);
      results.forEach(({ userId, themeId }) => {
        themeMap.set(userId, themeId);
      });
    } catch (error) {
      console.error('Error in batch theme fetch:', error);
      // Fill remaining with defaults
      uncachedUsers.forEach(userId => {
        if (!themeMap.has(userId)) {
          themeMap.set(userId, 'default');
        }
      });
    }
  }
  
  return themeMap;
}

/**
 * Clears the theme cache for a specific user
 * Useful when a user changes their theme or is unfriended
 * @param userId - The UID of the user
 */
export function clearUserThemeCache(userId: string): void {
  themeCache.delete(userId);
}

/**
 * Clears the entire theme cache
 * Useful for logout or major state changes
 */
export function clearAllThemeCache(): void {
  themeCache.clear();
}

/**
 * Preloads themes for users (fire-and-forget)
 * Useful for warming the cache before rendering
 * @param userIds - Array of user IDs to preload
 */
export function preloadUserThemes(userIds: string[]): void {
  // Fire and forget - don't await
  getUserThemesBatch(userIds).catch(error => {
    console.error('Error preloading themes:', error);
  });
}

/**
 * Gets the current cache size
 * Useful for debugging and monitoring
 */
export function getThemeCacheSize(): number {
  return themeCache.size;
}

/**
 * Gets cache statistics
 * @returns Object with cache stats
 */
export function getThemeCacheStats(): {
  size: number;
  entries: Array<{ userId: string; themeId: string; age: number }>;
} {
  const now = Date.now();
  const entries = Array.from(themeCache.entries()).map(([userId, data]) => ({
    userId,
    themeId: data.themeId,
    age: now - data.timestamp,
  }));
  
  return {
    size: themeCache.size,
    entries,
  };
}