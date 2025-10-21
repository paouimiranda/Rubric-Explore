// services/friendsService.ts
import {
  addDoc,
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

// Send friend request
export const sendFriendRequest = async (
  fromUserId: string, 
  toUserId: string
): Promise<boolean> => {
  try {
    // Check if request already exists
    const existingRequest = await checkExistingFriendRequest(fromUserId, toUserId);
    if (existingRequest) {
      throw new Error('Friend request already sent or friendship already exists');
    }
    
    // Create friend request document
    const requestData = {
      fromUserId,
      toUserId,
      status: 'pending' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await addDoc(collection(db, 'friendRequests'), requestData);
    
    // Update recipient's pending requests count (optional)
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
    
    // Check if already friends
    const friendshipQuery1 = query(
      collection(db, 'friendships'),
      where('user1Id', '==', userId1),
      where('user2Id', '==', userId2)
    );
    
    const friendshipQuery2 = query(
      collection(db, 'friendships'),
      where('user1Id', '==', userId2),
      where('user2Id', '==', userId1)
    );
    
    const [request1, request2, friendship1, friendship2]: QuerySnapshot<DocumentData>[] = await Promise.all([
      getDocs(requestQuery1),
      getDocs(requestQuery2),
      getDocs(friendshipQuery1),
      getDocs(friendshipQuery2)
    ]);
    
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
    // Find and delete friendship document
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
    
    if (friendshipDoc) {
      await deleteDoc(friendshipDoc.ref);
      
      // Update both users' friend counts
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
      
      return true;
    }
    
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