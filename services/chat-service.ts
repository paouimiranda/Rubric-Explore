// services/chat-service.ts
import {
  collection,
  deleteDoc,
  doc,
  DocumentData,
  DocumentSnapshot,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  QuerySnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';

// Type definitions
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Timestamp;
  readBy: string[];
  type: 'text' | 'image' | 'file';
  edited?: boolean;
  editedAt?: Timestamp;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantInfo: {
    [userId: string]: {
      displayName: string;
      username: string;
      isOnline?: boolean;
    };
  };
  lastMessage?: {
    text: string;
    senderId: string;
    senderName: string;
    timestamp: Timestamp;
  };
  lastMessageTime: Timestamp;
  createdAt: Timestamp;
  unreadCount: {
    [userId: string]: number;
  };
}

export interface ConversationPreview {
  id: string;
  otherUser: {
    id: string;
    displayName: string;
    username: string;
    isOnline?: boolean;
  };
  lastMessage?: {
    text: string;
    senderId: string;
    senderName: string;
    timestamp: Timestamp;
  };
  lastMessageTime: Timestamp;
  unreadCount: number;
}

// Create or get existing conversation between two users

export const createOrGetConversation = async (
  user1Id: string,  // This is the current/logged-in user
  user2Id: string
): Promise<string> => {
  try {
    // Check if conversation already exists (both directions)
    const conversationsQuery1 = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user1Id)
    );
    
    const snapshot: QuerySnapshot<DocumentData> = await getDocs(conversationsQuery1);
    
    // Check if any conversation contains both users
    for (const convDoc of snapshot.docs) {  // RENAMED: 'doc' -> 'convDoc' to avoid shadowing
      const data = convDoc.data();
      if (data.participants.includes(user2Id)) {
        // FOUND EXISTING CONVERSATION: Reset isDeleted for user1Id (current user) so it shows in their chat list
        const userConvRef = doc(db, 'userConversations', user1Id, 'conversations', convDoc.id);  // UPDATED: Use convDoc.id
        await updateDoc(userConvRef, { isDeleted: false });  // Un-delete for this user only
        return convDoc.id;  // UPDATED: Return convDoc.id
      }
    }
    
    // NO EXISTING CONVERSATION: Create new one (with userConversations docs)
    // Get user information for both participants
    const [user1Doc, user2Doc]: [DocumentSnapshot<DocumentData>, DocumentSnapshot<DocumentData>] = await Promise.all([
      getDoc(doc(db, 'users', user1Id)),
      getDoc(doc(db, 'users', user2Id))
    ]);
    
    if (!user1Doc.exists() || !user2Doc.exists()) {
      throw new Error('One or both users not found');
    }
    
    const user1Data = user1Doc.data();
    const user2Data = user2Doc.data();
    
    // Create new conversation and userConversations in a batch
    const batch = writeBatch(db);
    
    const conversationData = {
      participants: [user1Id, user2Id],
      participantInfo: {
        [user1Id]: {
          displayName: user1Data.displayName,
          username: user1Data.username,
          isOnline: user1Data.isOnline || false
        },
        [user2Id]: {
          displayName: user2Data.displayName,
          username: user2Data.username,
          isOnline: user2Data.isOnline || false
        }
      },
      lastMessageTime: serverTimestamp(),
      createdAt: serverTimestamp(),
      unreadCount: {
        [user1Id]: 0,
        [user2Id]: 0
      }
    };
    
    // Create main conversation document
    const conversationRef = doc(collection(db, 'conversations'));
    batch.set(conversationRef, conversationData);
    
    // Create userConversations documents for both users
    const userConvData = {
      conversationId: conversationRef.id,
      lastMessageTime: serverTimestamp(),
      unreadCount: 0,
      isDeleted: false  // New conversations start as not deleted
    };
    batch.set(doc(db, 'userConversations', user1Id, 'conversations', conversationRef.id), userConvData);
    batch.set(doc(db, 'userConversations', user2Id, 'conversations', conversationRef.id), userConvData);
    
    await batch.commit();
    return conversationRef.id;
  } catch (error) {
    console.error('Error creating/getting conversation:', error);
    throw new Error('Failed to create or get conversation');
  }
};

// Send a message
// UPDATED: Send a message (now to subcollection and update userConversations)
export const sendMessage = async (
  conversationId: string,
  senderId: string,
  text: string
): Promise<boolean> => {
  try {
    const senderDoc: DocumentSnapshot<DocumentData> = await getDoc(doc(db, 'users', senderId));
    if (!senderDoc.exists()) {
      throw new Error('Sender not found');
    }
    const senderData = senderDoc.data();
    const messageData = {
      senderId,
      senderName: senderData.displayName,
      text: text.trim(),
      timestamp: serverTimestamp(),
      readBy: [senderId],
      type: 'text' as const
    };
    const batch = writeBatch(db);
    // Add message to subcollection
    const messageRef = doc(collection(db, 'conversations', conversationId, 'messages'));
    batch.set(messageRef, messageData);
    // Update conversation's last message
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc: DocumentSnapshot<DocumentData> = await getDoc(conversationRef);
    if (conversationDoc.exists()) {
      const conversationData = conversationDoc.data();
      const otherParticipantId = conversationData.participants.find((id: string) => id !== senderId);
      if (!otherParticipantId) {
        throw new Error('Invalid conversation participants');
      }
      batch.update(conversationRef, {
        lastMessage: {
          text: text.trim(),
          senderId,
          senderName: senderData.displayName,
          timestamp: serverTimestamp()
        },
        lastMessageTime: serverTimestamp(),
        [`unreadCount.${otherParticipantId}`]: (conversationData.unreadCount?.[otherParticipantId] || 0) + 1
      });
      // UPDATED: Update userConversations for both users, reset isDeleted for recipient
      const senderConvRef = doc(db, 'userConversations', senderId, 'conversations', conversationId);
      const recipientConvRef = doc(db, 'userConversations', otherParticipantId, 'conversations', conversationId);
      
      // For sender: Update last message and unread count (keep isDeleted as is)
      batch.set(senderConvRef, {
        lastMessage: {
          text: text.trim(),
          senderId,
          senderName: senderData.displayName,
          timestamp: serverTimestamp()
        },
        lastMessageTime: serverTimestamp(),
        unreadCount: 0  // Sender has read their own message
      }, { merge: true });
      
      // For recipient: Update last message, increment unread count, and RESET isDeleted to false
      batch.set(recipientConvRef, {
        lastMessage: {
          text: text.trim(),
          senderId,
          senderName: senderData.displayName,
          timestamp: serverTimestamp()
        },
        lastMessageTime: serverTimestamp(),
        unreadCount: (conversationData.unreadCount?.[otherParticipantId] || 0) + 1,
        isDeleted: false  // KEY: Reset to false so it reappears in recipient's chat list
      }, { merge: true });
      
      console.log(`Message sent: Reset isDeleted for recipient ${otherParticipantId}`);  // DEBUG: Remove after testing
    }
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error sending message:', error);
    throw new Error('Failed to send message');
  }
};


// Get messages for a conversation
export const getMessages = async (
  conversationId: string,
  limitCount: number = 50
): Promise<Message[]> => {
  try {
    const messagesQuery = query(
      collection(db, 'conversations', conversationId, 'messages'),  // UPDATED: Subcollection path
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const snapshot: QuerySnapshot<DocumentData> = await getDocs(messagesQuery);
    const messages: Message[] = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        conversationId,  // Add back for compatibility
        ...data
      } as Message);
    });
    
    return messages.reverse();
  } catch (error) {
    console.error('Error getting messages:', error);
    throw new Error('Failed to get messages');
  }
};

// Listen to real-time messages
export const listenToMessages = (
  conversationId: string,
  callback: (messages: Message[]) => void
): Unsubscribe => {
  const messagesQuery = query(
    collection(db, 'conversations', conversationId, 'messages'),  // UPDATED: Subcollection path
    orderBy('timestamp', 'desc'),
    limit(100)
  );
  
  return onSnapshot(messagesQuery, (snapshot: QuerySnapshot<DocumentData>) => {
    const messages: Message[] = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        conversationId,  // Add back for compatibility
        ...data
      } as Message);
    });
    
    callback(messages.reverse());
  });
};
// Get user's conversations
// UPDATED: Get user's conversations (now from userConversations, filter out deleted)
export const getUserConversations = async (userId: string): Promise<ConversationPreview[]> => {
  try {
    const userConversationsQuery = query(
      collection(db, 'userConversations', userId, 'conversations'),
      where('isDeleted', '==', false),
      orderBy('lastMessageTime', 'desc')
    );
    const snapshot: QuerySnapshot<DocumentData> = await getDocs(userConversationsQuery);
    const conversations: ConversationPreview[] = [];
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const conversationId = data.conversationId;
      // Get other user info from the main conversation
      const convDoc = await getDoc(doc(db, 'conversations', conversationId));
      if (convDoc.exists()) {
        const convData = convDoc.data() as Conversation;  // SAFE CAST
        const otherParticipantId = convData.participants.find((id: string) => id !== userId);
        if (!otherParticipantId) continue;  // SKIP IF INVALID
        const otherUserInfo = convData.participantInfo[otherParticipantId];
        conversations.push({
          id: conversationId,
          otherUser: {
            id: otherParticipantId,
            displayName: otherUserInfo.displayName,
            username: otherUserInfo.username,
            isOnline: otherUserInfo.isOnline || false
          },
          lastMessage: data.lastMessage,
          lastMessageTime: data.lastMessageTime,
          unreadCount: data.unreadCount || 0
        });
      }
    }   
    return conversations;
  } catch (error) {
    console.error('Error getting conversations:', error);
    throw new Error('Failed to get conversations');
  }
};


// Listen to real-time conversations
// UPDATED: Listen to real-time conversations (now from userConversations)
export const listenToConversations = (
  userId: string,
  callback: (conversations: ConversationPreview[]) => void
): Unsubscribe => {
  const userConversationsQuery = query(
    collection(db, 'userConversations', userId, 'conversations'),
    where('isDeleted', '==', false),
    orderBy('lastMessageTime', 'desc')
  );
  return onSnapshot(userConversationsQuery, async (snapshot: QuerySnapshot<DocumentData>) => {
    console.log(`listenToConversations fired for user ${userId}, docs: ${snapshot.docs.length}`);  // DEBUG
    const conversations: ConversationPreview[] = [];
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      console.log(`Processing conversation ${data.conversationId}, unreadCount: ${data.unreadCount}`);  // DEBUG
      const conversationId = data.conversationId;
      // Get other user info
      const convDoc = await getDoc(doc(db, 'conversations', conversationId));
      if (convDoc.exists()) {
        const convData = convDoc.data() as Conversation;
        const otherParticipantId = convData.participants.find((id: string) => id !== userId);
        if (!otherParticipantId) continue;
        const otherUserInfo = convData.participantInfo[otherParticipantId];
        conversations.push({
          id: conversationId,
          otherUser: {
            id: otherParticipantId,
            displayName: otherUserInfo.displayName,
            username: otherUserInfo.username,
            isOnline: otherUserInfo.isOnline || false
          },
          lastMessage: data.lastMessage,
          lastMessageTime: data.lastMessageTime,
          unreadCount: data.unreadCount || 0
        });
      }
    }
    console.log(`Callback with ${conversations.length} conversations`);  // DEBUG
    callback(conversations);
  });
};


// Mark messages as read
// UPDATED: Mark messages as read (now affects userConversations)
export const markMessagesAsRead = async (
  conversationId: string,
  userId: string
): Promise<boolean> => {
  try {
    console.log(`Marking messages as read for user ${userId} in conversation ${conversationId}`);  // DEBUG
    
    const batch = writeBatch(db);
    
    // Update main conversation
    const conversationRef = doc(db, 'conversations', conversationId);
    batch.update(conversationRef, {
      [`unreadCount.${userId}`]: 0
    });
    
    // Ensure userConversations doc exists and update it
    const userConvRef = doc(db, 'userConversations', userId, 'conversations', conversationId);
    const userConvSnap = await getDoc(userConvRef);
    
    if (!userConvSnap.exists()) {
      console.log('userConversations doc does not exist, creating it');  // DEBUG
      batch.set(userConvRef, {
        conversationId,
        lastMessageTime: serverTimestamp(),
        unreadCount: 0,
        isDeleted: false
      });
    } else {
      console.log('userConversations doc exists, updating unreadCount to 0');  // DEBUG
      batch.update(userConvRef, {
        unreadCount: 0
      });
    }
    
    // Mark messages as read in subcollection
    const messagesQuery = query(
      collection(db, 'conversations', conversationId, 'messages'),
      where('senderId', '!=', userId),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    
    const snapshot: QuerySnapshot<DocumentData> = await getDocs(messagesQuery);
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!data.readBy.includes(userId)) {
        batch.update(doc.ref, {
          readBy: [...data.readBy, userId]
        });
      }
    });
    
    await batch.commit();
    console.log('Batch committed successfully, messages marked as read');  // DEBUG
    return true;
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw new Error('Failed to mark messages as read');
  }
};


// UPDATED: Delete a message (now from subcollection)
export const deleteMessage = async (conversationId: string, messageId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'conversations', conversationId, 'messages', messageId));  // UPDATED: Subcollection
    return true;
  } catch (error) {
    console.error('Error deleting message:', error);
    throw new Error('Failed to delete message');
  }
};

// UPDATED: Edit a message (now from subcollection)
export const editMessage = async (
  conversationId: string,
  messageId: string,
  newText: string
): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {  // UPDATED: Subcollection
      text: newText.trim(),
      edited: true,
      editedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error editing message:', error);
    throw new Error('Failed to edit message');
  }
};

// UPDATED: Get total unread count (now from userConversations)
export const getTotalUnreadCount = async (userId: string): Promise<number> => {
  try {
    const userConversationsQuery = query(
      collection(db, 'userConversations', userId, 'conversations'),
      where('isDeleted', '==', false)
    );
    
    const snapshot: QuerySnapshot<DocumentData> = await getDocs(userConversationsQuery);
    let totalUnread = 0;
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      totalUnread += data.unreadCount || 0;
    });
    
    return totalUnread;
  } catch (error) {
    console.error('Error getting total unread count:', error);
    return 0;
  }
};
// NEW: Delete a conversation (for current user only - mark as deleted)
export const deleteConversation = async (conversationId: string, currentUserId: string): Promise<void> => {
  try {
    // Reference to the user's conversation metadata
    const userConvRef = doc(db, 'userConversations', currentUserId, 'conversations', conversationId);
    
    // Check if it exists and belongs to the user
    const userConvSnap = await getDoc(userConvRef);
    if (!userConvSnap.exists()) {
      throw new Error('Conversation not found for this user');
    }
    
    // Mark as deleted (no actual data deletion)
    await updateDoc(userConvRef, {
      isDeleted: true,
      updatedAt: serverTimestamp()
    });
    
    console.log('Conversation deleted for user successfully');
  } catch (error) {
    console.error('Error deleting conversation:', error);
    throw new Error('Failed to delete conversation');
  }
};

// NEW: Helper to toggle mute/pin (for userConversations)
export const toggleConversationMute = async (conversationId: string, userId: string, isMuted: boolean): Promise<void> => {
  const userConvRef = doc(db, 'userConversations', userId, 'conversations', conversationId);
  await updateDoc(userConvRef, { isMuted, updatedAt: serverTimestamp() });
};

export const toggleConversationPin = async (conversationId: string, userId: string, isPinned: boolean): Promise<void> => {
  const userConvRef = doc(db, 'userConversations', userId, 'conversations', conversationId);
  await updateDoc(userConvRef, { isPinned, updatedAt: serverTimestamp() });
};