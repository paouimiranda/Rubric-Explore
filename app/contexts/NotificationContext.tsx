// contexts/NotificationContext.tsx
import InAppNotification from '@/components/Interface/in-app-notification';
import { auth } from '@/firebase';
import { ConversationPreview, listenToConversations } from '@/services/chat-service';
import { useRouter } from 'expo-router';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface NotificationContextType {
  setActiveConversationId: (id: string | null) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  setActiveConversationId: () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notification, setNotification] = useState<{
    visible: boolean;
    conversationId: string;
    otherUserId: string;
    senderName: string;
    message: string;
  } | null>(null);
  
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const previousConversations = useRef<ConversationPreview[]>([]);
  const router = useRouter();

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log('No current user, skipping notification listener');
      return;
    }

    console.log('Setting up notification listener for user:', currentUser.uid);

    // Listen to all conversations
    const unsubscribe = listenToConversations(currentUser.uid, (conversations) => {
      console.log('Conversations updated:', conversations.length);
      
      // Find new messages
      conversations.forEach(conv => {
        const prevConv = previousConversations.current.find(c => c.id === conv.id);
        
        // Check if there's a new message
        if (conv.lastMessage) {
          const isNewConversation = !prevConv;
          const hasNewMessage = prevConv && conv.lastMessage.timestamp && prevConv.lastMessage?.timestamp &&
            conv.lastMessage.timestamp.toMillis() !== prevConv.lastMessage.timestamp.toMillis();
          
          const isFromOtherUser = conv.lastMessage.senderId !== currentUser.uid;
          const isNotActiveChat = conv.id !== activeConversationId;

          // Only show notification if:
          // 1. There's a new message (not a new conversation on first load)
          // 2. It's not from us
          // 3. We're not currently viewing this conversation
          if (hasNewMessage && isFromOtherUser && isNotActiveChat) {
            console.log('New message notification:', {
              from: conv.otherUser.displayName,
              message: conv.lastMessage.text,
            });

            setNotification({
              visible: true,
              conversationId: conv.id,
              otherUserId: conv.otherUser.id,
              senderName: conv.otherUser.displayName,
              message: conv.lastMessage.text,
            });
          }
        }
      });

      previousConversations.current = conversations;
    });

    return () => {
      console.log('Cleaning up notification listener');
      unsubscribe();
    };
  }, [activeConversationId]);

  const handleNotificationPress = () => {
    if (!notification) return;

    console.log('Notification pressed, navigating to chat');

    const navParams = {
      pathname: '/screens/Friends/chat-screen' as const,
      params: {
        conversationId: notification.conversationId,
        otherUserId: notification.otherUserId,
        otherUserName: notification.senderName,
      },
    };

    // Dismiss notification first
    setNotification(null);

    // Navigate after a brief delay to avoid update scheduling conflict
    setTimeout(() => {
      router.push(navParams);
    }, 100);
  };

  const handleNotificationDismiss = () => {
    console.log('Notification dismissed');
    setNotification(null);
  };

  return (
    <NotificationContext.Provider value={{ setActiveConversationId }}>
      {children}
      
      {notification && (
        <InAppNotification
          visible={notification.visible}
          senderName={notification.senderName}
          message={notification.message}
          onPress={handleNotificationPress}
          onDismiss={handleNotificationDismiss}
        />
      )}
    </NotificationContext.Provider>
  );
}