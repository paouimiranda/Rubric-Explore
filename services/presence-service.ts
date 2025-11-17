// services/presence-service.ts
import {
    DatabaseReference,
    get,
    onDisconnect,
    onValue,
    ref,
    serverTimestamp,
    set,
    Unsubscribe,
} from 'firebase/database';
import { AppState, AppStateStatus } from 'react-native';
import { rtdb } from '../firebase';

export interface PresenceData {
  status: 'online' | 'offline' | 'away';
  lastChanged: number | object; // Can be serverTimestamp
}

class PresenceService {
  private appStateSubscription: any = null;
  private currentUserId: string | null = null;
  private userPresenceRef: DatabaseReference | null = null;
  private connectionListener: Unsubscribe | null = null;
  private isInitialized: boolean = false;

  /**
   * Initialize presence tracking for a user
   */
  async initializePresence(userId: string): Promise<void> {
    try {
      // Prevent duplicate initialization
      if (this.isInitialized && this.currentUserId === userId) {
        console.log('⚠️ Presence already initialized for user:', userId);
        return;
      }

      // Clean up any existing presence before reinitializing
      if (this.currentUserId && this.currentUserId !== userId) {
        await this.cleanup();
      }

      console.log('🔄 Initializing presence for user:', userId);
      
      this.currentUserId = userId;
      this.userPresenceRef = ref(rtdb, `presence/${userId}`);

      // Set up connection monitoring FIRST
      this.setupConnectionListener(userId);

      // Set up app state monitoring
      this.setupAppStateListener(userId);

      // Set initial online status
      await this.setUserOnline(userId);

      this.isInitialized = true;
      console.log('✅ Presence initialized for user:', userId);
    } catch (error) {
      console.error('❌ Error initializing presence:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Monitor Firebase connection and restore presence on reconnect
   */
  private setupConnectionListener(userId: string): void {
    const connectedRef = ref(rtdb, '.info/connected');
    
    // Clean up existing listener
    if (this.connectionListener) {
      this.connectionListener();
    }
    
    this.connectionListener = onValue(connectedRef, async (snapshot) => {
      const isConnected = snapshot.val() === true;
      
      if (isConnected) {
        console.log('🟢 Connected to Firebase RTDB');
        
        // Set up disconnect handler first
        const presenceRef = ref(rtdb, `presence/${userId}`);
        await onDisconnect(presenceRef).set({
          status: 'offline',
          lastChanged: serverTimestamp(),
        });

        // Then set current status based on app state
        const currentState = AppState.currentState;
        if (currentState === 'active') {
          await this.setUserOnline(userId);
        } else {
          await this.setUserAway(userId);
        }
      } else {
        console.log('🔴 Disconnected from Firebase RTDB');
      }
    });
  }

  /**
   * Set user status to online
   */
  private async setUserOnline(userId: string): Promise<void> {
    try {
      const presenceRef = ref(rtdb, `presence/${userId}`);
      
      // Set up onDisconnect handler
      await onDisconnect(presenceRef).set({
        status: 'offline',
        lastChanged: serverTimestamp(),
      });

      // Set online status
      await set(presenceRef, {
        status: 'online',
        lastChanged: serverTimestamp(),
      });

      console.log('✅ User set to ONLINE:', userId);
    } catch (error) {
      console.error('❌ Error setting user online:', error);
    }
  }

  /**
   * Set user status to offline
   */
  private async setUserOffline(userId: string): Promise<void> {
    try {
      const presenceRef = ref(rtdb, `presence/${userId}`);
      
      // Cancel onDisconnect
      await onDisconnect(presenceRef).cancel();
      
      // Set offline status immediately
      await set(presenceRef, {
        status: 'offline',
        lastChanged: serverTimestamp(),
      });

      console.log('✅ User set to OFFLINE:', userId);
    } catch (error) {
      console.error('❌ Error setting user offline:', error);
    }
  }

  /**
   * Set user status to away (app in background)
   */
  private async setUserAway(userId: string): Promise<void> {
    try {
      const presenceRef = ref(rtdb, `presence/${userId}`);
      
      // Keep the onDisconnect handler active
      await onDisconnect(presenceRef).set({
        status: 'offline',
        lastChanged: serverTimestamp(),
      });
      
      // Set away status
      await set(presenceRef, {
        status: 'away',
        lastChanged: serverTimestamp(),
      });

      console.log('✅ User set to AWAY:', userId);
    } catch (error) {
      console.error('❌ Error setting user away:', error);
    }
  }

  /**
   * Listen to app state changes (foreground/background)
   */
  private setupAppStateListener(userId: string): void {
    // Clean up existing listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    this.appStateSubscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      console.log('📱 App state changed to:', nextAppState);
      
      if (nextAppState === 'active') {
        // App came to foreground - set online
        await this.setUserOnline(userId);
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App went to background/inactive - set away
        await this.setUserAway(userId);
      }
    });
  }

  /**
   * Clean up presence tracking
   */
  async cleanup(): Promise<void> {
    try {
      console.log('🧹 Cleaning up presence...');

      // Remove connection listener
      if (this.connectionListener) {
        this.connectionListener();
        this.connectionListener = null;
      }

      // Remove app state listener
      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
        this.appStateSubscription = null;
      }

      // Set user offline if we have a current user
      if (this.currentUserId) {
        await this.setUserOffline(this.currentUserId);
      }

      this.userPresenceRef = null;
      this.currentUserId = null;
      this.isInitialized = false;
      
      console.log('✅ Presence cleaned up');
    } catch (error) {
      console.error('❌ Error cleaning up presence:', error);
    }
  }

  /**
   * Listen to user presence changes in real-time
   */
  getUserPresence(userId: string, callback: (presence: PresenceData | null) => void): Unsubscribe {
    const presenceRef = ref(rtdb, `presence/${userId}`);
    
    console.log('👁️ Setting up presence listener for:', userId);
    
    const unsubscribe = onValue(
      presenceRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val() as PresenceData;
          console.log(`📊 Presence update for ${userId}:`, data.status);
          callback(data);
        } else {
          console.log(`❌ No presence data for ${userId}`);
          callback(null);
        }
      },
      (error) => {
        console.error('❌ Error listening to presence:', error);
        callback(null);
      }
    );

    return unsubscribe;
  }

  /**
   * Get user presence once (without listening)
   */
  async getUserPresenceOnce(userId: string): Promise<PresenceData | null> {
    try {
      const presenceRef = ref(rtdb, `presence/${userId}`);
      const snapshot = await get(presenceRef);
      
      if (snapshot.exists()) {
        return snapshot.val() as PresenceData;
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting presence:', error);
      return null;
    }
  }

  /**
   * Check if user is currently online
   */
  isUserOnline(presence: PresenceData | null): boolean {
    return presence?.status === 'online';
  }

  /**
   * Get formatted last seen time
   */
  getLastSeenText(presence: PresenceData | null): string {
    if (!presence) return 'Unknown';
    
    if (presence.status === 'online') return 'Online';
    if (presence.status === 'away') return 'Away';
    
    // Format offline time
    const lastChanged = presence.lastChanged;
    if (!lastChanged || typeof lastChanged !== 'number') return 'Offline';
    
    const now = Date.now();
    const diff = now - lastChanged;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    
    return new Date(lastChanged).toLocaleDateString();
  }
}

// Export singleton instance
export const presenceService = new PresenceService();