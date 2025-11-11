// contexts/NotificationContext.tsx
import InAppNotification from '@/components/Interface/in-app-notification';
import { auth } from '@/firebase';
import { ConversationPreview, listenToConversations } from '@/services/chat-service';
import { useRouter, useSegments } from 'expo-router';
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
    senderName: string;
    message: string;
  } | null>(null);
  
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const previousConversations = useRef<ConversationPreview[]>([]);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Listen to all conversations
    const unsubscribe = listenToConversations(currentUser.uid, (conversations) => {
      // Find new messages
      conversations.forEach(conv => {
        const prevConv = previousConversations.current.find(c => c.id === conv.id);
        
        // Check if there's a new message
        if (prevConv && conv.lastMessage) {
          const hasNewMessage = 
            conv.lastMessage.timestamp !== prevConv.lastMessage?.timestamp &&
            conv.lastMessage.senderId !== currentUser.uid; // Not our own message

          // Only show notification if:
          // 1. There's a new message
          // 2. It's not from us
          // 3. We're not currently viewing this conversation
          if (hasNewMessage && conv.id !== activeConversationId) {
            setNotification({
              visible: true,
              conversationId: conv.id,
              senderName: conv.otherUser.displayName,
              message: conv.lastMessage.text,
            });
          }
        }
      });

      previousConversations.current = conversations;
    });

    return () => unsubscribe();
  }, [activeConversationId]);

  const handleNotificationPress = () => {
    if (!notification) return;

    // Navigate to the chat screen
    router.push({
      pathname: '/screens/Friends/chat-screen',
      params: {
        conversationId: notification.conversationId,
        otherUserId: '', // You might want to pass this too
        otherUserName: notification.senderName,
      },
    });

    setNotification(null);
  };

  const handleNotificationDismiss = () => {
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