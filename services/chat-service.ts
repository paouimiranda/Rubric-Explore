// services/chat-service.ts
import {
    addDoc,
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
  user1Id: string,
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
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.participants.includes(user2Id)) {
        return doc.id;
      }
    }
    
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
    
    // Create new conversation
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
    
    const docRef = await addDoc(collection(db, 'conversations'), conversationData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating/getting conversation:', error);
    throw new Error('Failed to create or get conversation');
  }
};

// Send a message
export const sendMessage = async (
  conversationId: string,
  senderId: string,
  text: string
): Promise<boolean> => {
  try {
    // Get sender info
    const senderDoc: DocumentSnapshot<DocumentData> = await getDoc(doc(db, 'users', senderId));
    if (!senderDoc.exists()) {
      throw new Error('Sender not found');
    }
    
    const senderData = senderDoc.data();
    
    // Create message
    const messageData = {
      conversationId,
      senderId,
      senderName: senderData.displayName,
      text: text.trim(),
      timestamp: serverTimestamp(),
      readBy: [senderId], // Sender has read it
      type: 'text' as const
    };
    
    const batch = writeBatch(db);
    
    // Add message
    const messageRef = doc(collection(db, 'messages'));
    batch.set(messageRef, messageData);
    
    // Update conversation's last message and unread counts
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc: DocumentSnapshot<DocumentData> = await getDoc(conversationRef);
    
    if (conversationDoc.exists()) {
      const conversationData = conversationDoc.data();
      const otherParticipantId = conversationData.participants.find((id: string) => id !== senderId);
      
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
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const snapshot: QuerySnapshot<DocumentData> = await getDocs(messagesQuery);
    const messages: Message[] = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        ...data
      } as Message);
    });
    
    // Return in chronological order (oldest first)
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
    collection(db, 'messages'),
    where('conversationId', '==', conversationId),
    orderBy('timestamp', 'desc'),
    limit(100)
  );
  
  return onSnapshot(messagesQuery, (snapshot: QuerySnapshot<DocumentData>) => {
    const messages: Message[] = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        ...data
      } as Message);
    });
    
    // Return in chronological order (oldest first)
    callback(messages.reverse());
  });
};

// Get user's conversations
export const getUserConversations = async (userId: string): Promise<ConversationPreview[]> => {
  try {
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId),
      orderBy('lastMessageTime', 'desc')
    );
    
    const snapshot: QuerySnapshot<DocumentData> = await getDocs(conversationsQuery);
    const conversations: ConversationPreview[] = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const otherParticipantId = data.participants.find((id: string) => id !== userId);
      const otherUserInfo = data.participantInfo[otherParticipantId];
      
      conversations.push({
        id: doc.id,
        otherUser: {
          id: otherParticipantId,
          displayName: otherUserInfo.displayName,
          username: otherUserInfo.username,
          isOnline: otherUserInfo.isOnline || false
        },
        lastMessage: data.lastMessage,
        lastMessageTime: data.lastMessageTime,
        unreadCount: data.unreadCount?.[userId] || 0
      });
    });
    
    return conversations;
  } catch (error) {
    console.error('Error getting conversations:', error);
    throw new Error('Failed to get conversations');
  }
};

// Listen to real-time conversations
export const listenToConversations = (
  userId: string,
  callback: (conversations: ConversationPreview[]) => void
): Unsubscribe => {
  const conversationsQuery = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', userId),
    orderBy('lastMessageTime', 'desc')
  );
  
  return onSnapshot(conversationsQuery, (snapshot: QuerySnapshot<DocumentData>) => {
    const conversations: ConversationPreview[] = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const otherParticipantId = data.participants.find((id: string) => id !== userId);
      const otherUserInfo = data.participantInfo[otherParticipantId];
      
      conversations.push({
        id: doc.id,
        otherUser: {
          id: otherParticipantId,
          displayName: otherUserInfo.displayName,
          username: otherUserInfo.username,
          isOnline: otherUserInfo.isOnline || false
        },
        lastMessage: data.lastMessage,
        lastMessageTime: data.lastMessageTime,
        unreadCount: data.unreadCount?.[userId] || 0
      });
    });
    
    callback(conversations);
  });
};

// Mark messages as read
export const markMessagesAsRead = async (
  conversationId: string,
  userId: string
): Promise<boolean> => {
  try {
    const batch = writeBatch(db);
    
    // Reset unread count in conversation
    const conversationRef = doc(db, 'conversations', conversationId);
    batch.update(conversationRef, {
      [`unreadCount.${userId}`]: 0
    });
    
    // Mark recent messages as read (optional - for read receipts)
    const messagesQuery = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
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
    return true;
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw new Error('Failed to mark messages as read');
  }
};

// Delete a message
export const deleteMessage = async (messageId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'messages', messageId));
    return true;
  } catch (error) {
    console.error('Error deleting message:', error);
    throw new Error('Failed to delete message');
  }
};

// Edit a message
export const editMessage = async (
  messageId: string,
  newText: string
): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'messages', messageId), {
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

// Get total unread messages count for user
export const getTotalUnreadCount = async (userId: string): Promise<number> => {
  try {
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId)
    );
    
    const snapshot: QuerySnapshot<DocumentData> = await getDocs(conversationsQuery);
    let totalUnread = 0;
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      totalUnread += data.unreadCount?.[userId] || 0;
    });
    
    return totalUnread;
  } catch (error) {
    console.error('Error getting total unread count:', error);
    return 0;
  }
};