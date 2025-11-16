// services/friendsService.ts
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  DocumentData,
  DocumentSnapshot,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  query,
  QuerySnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from '../firebase';

// Type definitions
export interface User {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  displayName: string;
  avatarId?: number; // Preset avatar ID (1-10 for example)
  bio: string;
  followers: number;
  following: number;
  posts: number;
  friends?: number;
  pendingRequests?: number;
  isVerified: boolean;
  isActive: boolean;
  isOnline?: boolean;
  lastSeen?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  avatarIndex?: number;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  senderInfo: User;
}

export interface Friendship {
  id: string;
  user1Id: string;
  user2Id: string;
  status: 'active' | 'inactive';
  createdAt: Timestamp;
}

export interface SearchUser extends User {
  // Can extend with search-specific fields if needed
}

// Search users by username or display name
export const searchUsers = async (
  searchTerm: string, 
  currentUserId: string, 
  limitCount: number = 20
): Promise<SearchUser[]> => {
  try {
    if (!searchTerm.trim()) return [];
    
    const searchLower = searchTerm.toLowerCase();
    
    // Use separate queries to avoid complex index requirements
    // Search by username only (more reliable for partial matches)
    const usernameQuery = query(
      collection(db, 'users'),
      where('username', '>=', searchLower),
      where('username', '<=', searchLower + '\uf8ff'),
      limit(limitCount)
    );
    
    const usernameSnapshot: QuerySnapshot<DocumentData> = await getDocs(usernameQuery);
    const users = new Map<string, SearchUser>();
    
    // Filter out current user and collect results
    usernameSnapshot.docs.forEach(doc => {
      const userData = doc.data() as User;
      if (doc.id !== currentUserId) {
        users.set(doc.id, { ...userData, uid: doc.id });
      }
    });
    
    // If we have fewer results, also search by display name
    if (users.size < 5) {
      try {
        const displayNameQuery = query(
          collection(db, 'users'),
          where('displayName', '>=', searchTerm),
          where('displayName', '<=', searchTerm + '\uf8ff'),
          limit(limitCount - users.size)
        );
        
        const displayNameSnapshot: QuerySnapshot<DocumentData> = await getDocs(displayNameQuery);
        
        displayNameSnapshot.docs.forEach(doc => {
          const userData = doc.data() as User;
          if (doc.id !== currentUserId && !users.has(doc.id)) {
            users.set(doc.id, { ...userData, uid: doc.id });
          }
        });
      } catch (displayNameError) {
        console.log('Display name search failed, using username results only');
      }
    }
    
    return Array.from(users.values());
  } catch (error) {
    console.error('Error searching users:', error);
    throw new Error('Failed to search users');
  }
};

// Send friend request - UPDATED: Clean up any leftover requests from current user before sending
export const sendFriendRequest = async (
  fromUserId: string, 
  toUserId: string
): Promise<boolean> => {
  try {
    // NEW: Clean up any existing requests FROM the current user TO the target user (any status)
    // This handles leftovers from unfriending/re-adding without affecting requests from the other user
    const cleanupQuery = query(
      collection(db, 'friendRequests'),
      where('fromUserId', '==', fromUserId),
      where('toUserId', '==', toUserId)
    );
    
    const cleanupSnapshot = await getDocs(cleanupQuery);
    if (!cleanupSnapshot.empty) {
      console.log('sendFriendRequest Debug: Cleaning up leftover request(s)', cleanupSnapshot.docs.map(doc => doc.id));
      await Promise.all(cleanupSnapshot.docs.map(doc => deleteDoc(doc.ref)));
    }
    
    // Now check if request already exists (should be clean after cleanup)
    const existingRequest = await checkExistingFriendRequest(fromUserId, toUserId);
    if (existingRequest) {
      throw new Error('Friend request already sent or friendship already exists');
    }
    
    // Create new friend request document
    const requestData = {
      fromUserId,
      toUserId,
      status: 'pending' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await addDoc(collection(db, 'friendRequests'), requestData);
    
    // Update recipient's pending requests count
    await updateDoc(doc(db, 'users', toUserId), {
      pendingRequests: increment(1),
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error sending friend request:', error);
    throw error;
  }
};

// Check if friend request already exists or users are already friends
const checkExistingFriendRequest = async (
  userId1: string, 
  userId2: string
): Promise<boolean> => {
  try {
    // Check for existing friend requests in both directions
    const requestQuery1 = query(
      collection(db, 'friendRequests'),
      where('fromUserId', '==', userId1),
      where('toUserId', '==', userId2)
    );
    
    const requestQuery2 = query(
      collection(db, 'friendRequests'),
      where('fromUserId', '==', userId2),
      where('toUserId', '==', userId1)
    );
    
    // Check if already friends (filter by status to only detect active friendships)
    const friendshipQuery1 = query(
      collection(db, 'friendships'),
      where('user1Id', '==', userId1),
      where('user2Id', '==', userId2),
      where('status', '==', 'active')  // Ensures only active friendships are detected
    );
    
    const friendshipQuery2 = query(
      collection(db, 'friendships'),
      where('user1Id', '==', userId2),
      where('user2Id', '==', userId1),
      where('status', '==', 'active')  // Ensures only active friendships are detected
    );
    
    const [request1, request2, friendship1, friendship2]: QuerySnapshot<DocumentData>[] = await Promise.all([
      getDocs(requestQuery1),
      getDocs(requestQuery2),
      getDocs(friendshipQuery1),
      getDocs(friendshipQuery2)
    ]);
    
    // DEBUG LOGS: Check console to see what's detected
    console.log('checkExistingFriendRequest Debug:', {
      userId1,
      userId2,
      request1Empty: request1.empty,
      request2Empty: request2.empty,
      friendship1Empty: friendship1.empty,
      friendship2Empty: friendship2.empty,
      friendship1Docs: friendship1.docs.map(doc => doc.data()),  // Log friendship data
      friendship2Docs: friendship2.docs.map(doc => doc.data())
    });
    
    return !request1.empty || !request2.empty || !friendship1.empty || !friendship2.empty;
  } catch (error) {
    console.error('Error checking existing friend request:', error);
    return false;
  }
};


// Get friend requests received by user
export const getFriendRequests = async (userId: string): Promise<FriendRequest[]> => {
  try {
    // Simplified query without orderBy to avoid index requirement
    const requestsQuery = query(
      collection(db, 'friendRequests'),
      where('toUserId', '==', userId),
      where('status', '==', 'pending')
    );
    
    const snapshot: QuerySnapshot<DocumentData> = await getDocs(requestsQuery);
    const requests: FriendRequest[] = [];
    
    for (const docSnapshot of snapshot.docs) {
      const requestData = docSnapshot.data();
      
      // Get sender's information
      const senderDoc: DocumentSnapshot<DocumentData> = await getDoc(
        doc(db, 'users', requestData.fromUserId)
      );
      
      if (senderDoc.exists()) {
        const senderData = senderDoc.data() as User;
        requests.push({
          id: docSnapshot.id,
          fromUserId: requestData.fromUserId,
          toUserId: requestData.toUserId,
          status: requestData.status,
          createdAt: requestData.createdAt,
          updatedAt: requestData.updatedAt,
          senderInfo: senderData
        });
      }
    }
    
    // Sort by createdAt in JavaScript instead of Firestore
    return requests.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return b.createdAt.seconds - a.createdAt.seconds;
      }
      return 0;
    });
  } catch (error) {
    console.error('Error getting friend requests:', error);
    throw new Error('Failed to get friend requests');
  }
};

// Accept friend request
export const acceptFriendRequest = async (
  requestId: string, 
  fromUserId: string, 
  toUserId: string
): Promise<boolean> => {
  try {
    // Create friendship document
    const friendshipData = {
      user1Id: fromUserId,
      user2Id: toUserId,
      createdAt: serverTimestamp(),
      status: 'active' as const
    };
    
    await addDoc(collection(db, 'friendships'), friendshipData);
    
    // Update friend request status
    await updateDoc(doc(db, 'friendRequests', requestId), {
      status: 'accepted',
      updatedAt: serverTimestamp()
    });
    
    // Update both users' friend counts
    await Promise.all([
      updateDoc(doc(db, 'users', fromUserId), {
        friends: increment(1),
        updatedAt: serverTimestamp()
      }),
      updateDoc(doc(db, 'users', toUserId), {
        friends: increment(1),
        pendingRequests: increment(-1),
        updatedAt: serverTimestamp()
      })
    ]);
    
    return true;
  } catch (error) {
    console.error('Error accepting friend request:', error);
    throw new Error('Failed to accept friend request');
  }
};

// Reject friend request
export const rejectFriendRequest = async (
  requestId: string, 
  toUserId: string
): Promise<boolean> => {
  try {
    // Update friend request status
    await updateDoc(doc(db, 'friendRequests', requestId), {
      status: 'rejected',
      updatedAt: serverTimestamp()
    });
    
    // Update user's pending requests count
    await updateDoc(doc(db, 'users', toUserId), {
      pendingRequests: increment(-1),
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    throw new Error('Failed to reject friend request');
  }
};

// Get user's friends list
export const getUserFriends = async (userId: string): Promise<User[]> => {
  try {
    const friendsQuery1 = query(
      collection(db, 'friendships'),
      where('user1Id', '==', userId),
      where('status', '==', 'active')
    );
    
    const friendsQuery2 = query(
      collection(db, 'friendships'),
      where('user2Id', '==', userId),
      where('status', '==', 'active')
    );
    
    const [snapshot1, snapshot2]: [QuerySnapshot<DocumentData>, QuerySnapshot<DocumentData>] = await Promise.all([
      getDocs(friendsQuery1),
      getDocs(friendsQuery2)
    ]);
    
    const friendIds = new Set<string>();
    
    snapshot1.docs.forEach(doc => {
      const data = doc.data();
      friendIds.add(data.user2Id);
    });
    
    snapshot2.docs.forEach(doc => {
      const data = doc.data();
      friendIds.add(data.user1Id);
    });
    
    // Get friends' information
    const friends: User[] = [];
    for (const friendId of friendIds) {
      const friendDoc: DocumentSnapshot<DocumentData> = await getDoc(doc(db, 'users', friendId));
      if (friendDoc.exists()) {
        const friendData = friendDoc.data() as User;
        friends.push(friendData);
      }
    }
    
    // Sort friends: online first, then alphabetically
    return friends.sort((a, b) => {
      const aOnline = a.isOnline || false;
      const bOnline = b.isOnline || false;
      
      if (aOnline !== bOnline) {
        return bOnline ? 1 : -1; // online first
      }
      return a.displayName.localeCompare(b.displayName);
    });
  } catch (error) {
    console.error('Error getting friends:', error);
    throw new Error('Failed to get friends list');
  }
};

// Listen to real-time friend requests
export const listenToFriendRequests = (
  userId: string, 
  callback: (requests: FriendRequest[]) => void
): Unsubscribe => {
  // Simplified query without orderBy to avoid index requirement
  const requestsQuery = query(
    collection(db, 'friendRequests'),
    where('toUserId', '==', userId),
    where('status', '==', 'pending')
  );
  
  return onSnapshot(requestsQuery, async (snapshot: QuerySnapshot<DocumentData>) => {
    const requests: FriendRequest[] = [];
    
    for (const docSnapshot of snapshot.docs) {
      const requestData = docSnapshot.data();
      
      // Get sender's information
      const senderDoc: DocumentSnapshot<DocumentData> = await getDoc(
        doc(db, 'users', requestData.fromUserId)
      );
      
      if (senderDoc.exists()) {
        const senderData = senderDoc.data() as User;
        requests.push({
          id: docSnapshot.id,
          fromUserId: requestData.fromUserId,
          toUserId: requestData.toUserId,
          status: requestData.status,
          createdAt: requestData.createdAt,
          updatedAt: requestData.updatedAt,
          senderInfo: senderData
        });
      }
    }
    
    // Sort by createdAt in JavaScript instead of Firestore
    const sortedRequests = requests.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return b.createdAt.seconds - a.createdAt.seconds;
      }
      return 0;
    });
    
    callback(sortedRequests);
  });
};

// Remove friend (bonus function)
export const removeFriend = async (
  currentUserId: string, 
  friendUserId: string
): Promise<boolean> => {
  try {
    // Find and delete friendship document (unchanged)
    const friendshipQuery1 = query(
      collection(db, 'friendships'),
      where('user1Id', '==', currentUserId),
      where('user2Id', '==', friendUserId),
      where('status', '==', 'active')
    );
    
    const friendshipQuery2 = query(
      collection(db, 'friendships'),
      where('user1Id', '==', friendUserId),
      where('user2Id', '==', currentUserId),
      where('status', '==', 'active')
    );
    
    const [snapshot1, snapshot2]: [QuerySnapshot<DocumentData>, QuerySnapshot<DocumentData>] = await Promise.all([
      getDocs(friendshipQuery1),
      getDocs(friendshipQuery2)
    ]);
    
    const friendshipDoc = !snapshot1.empty ? snapshot1.docs[0] : 
                          !snapshot2.empty ? snapshot2.docs[0] : null;
    
    // UPDATED: Find and delete ALL friend requests between the users (any status: pending, accepted, rejected)
    const requestQuery1 = query(
      collection(db, 'friendRequests'),
      where('fromUserId', '==', currentUserId),
      where('toUserId', '==', friendUserId)
      // Removed status filter to catch ALL requests
    );
    
    const requestQuery2 = query(
      collection(db, 'friendRequests'),
      where('fromUserId', '==', friendUserId),
      where('toUserId', '==', currentUserId)
      // Removed status filter to catch ALL requests
    );
    
    const [requestSnapshot1, requestSnapshot2]: [QuerySnapshot<DocumentData>, QuerySnapshot<DocumentData>] = await Promise.all([
      getDocs(requestQuery1),
      getDocs(requestQuery2)
    ]);
    
    const requestDoc = !requestSnapshot1.empty ? requestSnapshot1.docs[0] : 
                       !requestSnapshot2.empty ? requestSnapshot2.docs[0] : null;
    
    // Collect all docs to delete
    const docsToDelete = [];
    if (friendshipDoc) {
      docsToDelete.push({ type: 'friendship', doc: friendshipDoc });
    }
    if (requestDoc) {
      docsToDelete.push({ type: 'request', doc: requestDoc });
    }
    
    // Log what we're deleting
    console.log('removeFriend Debug: Docs to delete:', docsToDelete.map(d => ({ type: d.type, id: d.doc.id, data: d.doc.data() })));
    
    // Delete all found docs
    if (docsToDelete.length > 0) {
      await Promise.all(docsToDelete.map(d => deleteDoc(d.doc.ref)));
      console.log('removeFriend Debug: All deletes successful');
      
      // Update both users' friend counts (only if friendship was deleted)
      if (friendshipDoc) {
        await Promise.all([
          updateDoc(doc(db, 'users', currentUserId), {
            friends: increment(-1),
            updatedAt: serverTimestamp()
          }),
          updateDoc(doc(db, 'users', friendUserId), {
            friends: increment(-1),
            updatedAt: serverTimestamp()
          })
        ]);
      }
      
      return true;
    }
    
    console.log('removeFriend Debug: No docs found to delete');
    throw new Error('Friendship not found');
  } catch (error) {
    console.error('Error removing friend:', error);
    throw new Error('Failed to remove friend');
  }
};



// Get mutual friends
export const getMutualFriends = async (
  userId1: string, 
  userId2: string
): Promise<User[]> => {
  try {
    const [friends1, friends2] = await Promise.all([
      getUserFriends(userId1),
      getUserFriends(userId2)
    ]);
    
    const friends1Ids = new Set(friends1.map(f => f.uid));
    const mutualFriends = friends2.filter(friend => friends1Ids.has(friend.uid));
    
    return mutualFriends;
  } catch (error) {
    console.error('Error getting mutual friends:', error);
    throw new Error('Failed to get mutual friends');
  }
};
// NEW: Load muted and pinned friends for a user
export const getUserPreferences = async (userId: string): Promise<{ mutedFriends: string[]; pinnedFriends: string[] }> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        mutedFriends: data.mutedFriends || [],
        pinnedFriends: data.pinnedFriends || [],
      };
    }
    return { mutedFriends: [], pinnedFriends: [] }; // Default if no doc
  } catch (error) {
    console.error('Error loading user preferences:', error);
    throw new Error('Failed to load user preferences');
  }
};
// NEW: Toggle mute for a friend (add/remove from array)
export const toggleMuteFriend = async (userId: string, friendId: string, isMuted: boolean): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    if (isMuted) {
      await updateDoc(userRef, {
        mutedFriends: arrayRemove(friendId), // Remove from muted
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        mutedFriends: arrayUnion(friendId), // Add to muted
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error toggling mute:', error);
    throw new Error('Failed to toggle mute');
  }
};

// NEW: Toggle pin for a friend (add/remove from array)
export const togglePinFriend = async (userId: string, friendId: string, isPinned: boolean): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    if (isPinned) {
      await updateDoc(userRef, {
        pinnedFriends: arrayRemove(friendId), // Remove from pinned
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        pinnedFriends: arrayUnion(friendId), // Add to pinned
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error toggling pin:', error);
    throw new Error('Failed to toggle pin');
  }
};