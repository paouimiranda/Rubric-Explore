// components/Chat/ChatList.tsx
import { auth } from '@/firebase';
import {
  ConversationPreview,
  getUserConversations,
  listenToConversations
} from '@/services/chat-service';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface ChatListProps {
  refreshing?: boolean;
  onRefresh?: () => void;
}

export default function ChatList({ refreshing = false, onRefresh }: ChatListProps) {
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;

    // Set up real-time listener for conversations
    const unsubscribe = listenToConversations(currentUser.uid, (convos) => {
      setConversations(convos);
      setLoading(false);
    });

    // Initial load
    loadConversations();

    return () => unsubscribe();
  }, [currentUser]);

  const loadConversations = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const convos = await getUserConversations(currentUser.uid);
      setConversations(convos);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadConversations();
    if (onRefresh) onRefresh();
  };

  const openChat = (conversation: ConversationPreview) => {
    router.push({
      pathname: './chat-screen',
      params: {
        conversationId: conversation.id,
        otherUserId: conversation.otherUser.id,
        otherUserName: conversation.otherUser.displayName
      }
    });
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes < 1 ? 'now' : `${minutes}m`;
    } else if (hours < 24) {
      return `${Math.floor(hours)}h`;
    } else {
      const days = Math.floor(hours / 24);
      return days === 1 ? '1d' : `${days}d`;
    }
  };

  const truncateMessage = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0EA5E9" />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <ScrollView 
        contentContainerStyle={styles.emptyContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.emptyTitle}>No conversations yet</Text>
        <Text style={styles.emptySubtitle}>
          Start chatting with your friends from the Friends tab!
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {conversations.map((conversation) => (
        <TouchableOpacity
          key={conversation.id}
          style={styles.conversationItem}
          onPress={() => openChat(conversation)}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            <View style={[
              styles.avatar,
              conversation.otherUser.isOnline && styles.onlineAvatar
            ]}>
              <Text style={styles.avatarText}>
                {conversation.otherUser.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            {conversation.otherUser.isOnline && <View style={styles.onlineIndicator} />}
          </View>
          
          <View style={styles.conversationContent}>
            <View style={styles.conversationHeader}>
              <Text style={styles.userName}>
                {conversation.otherUser.displayName}
              </Text>
              <Text style={styles.timestamp}>
                {formatTime(conversation.lastMessageTime)}
              </Text>
            </View>
            
            <View style={styles.messageRow}>
              <Text style={[
                styles.lastMessage,
                conversation.unreadCount > 0 && styles.unreadMessage
              ]}>
                {conversation.lastMessage?.text ? 
                  truncateMessage(conversation.lastMessage.text) : 
                  'Start a conversation...'
                }
              </Text>
              {conversation.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCount}>
                    {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  loadingText: {
    color: '#CBD5E1',
    marginTop: 10,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#CBD5E1',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1E293B',
    marginBottom: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineAvatar: {
    borderWidth: 2,
    borderColor: '#22C55E',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#1E293B',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  timestamp: {
    color: '#94A3B8',
    fontSize: 12,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    color: '#94A3B8',
    fontSize: 14,
    flex: 1,
  },
  unreadMessage: {
    color: '#CBD5E1',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#0EA5E9',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  unreadCount: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});