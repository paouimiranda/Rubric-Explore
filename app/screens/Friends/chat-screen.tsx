// app/screens/Chat/chat-screen.tsx
import { auth } from '@/firebase';
import {
  createOrGetConversation,
  listenToMessages,
  markMessagesAsRead,
  Message,
  sendMessage
} from '@/services/chat-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function ChatScreen() {
  const router = useRouter();
  const { conversationId: paramConversationId, otherUserId, otherUserName } = useLocalSearchParams<{
    conversationId?: string;
    otherUserId: string;
    otherUserName: string;
  }>();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string>(paramConversationId || '');
  const scrollViewRef = useRef<ScrollView>(null);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser || !otherUserId) {
      router.back();
      return;
    }

    initializeChat();
  }, [currentUser, otherUserId]);

  useEffect(() => {
    if (!conversationId) return;

    // Set up real-time message listener
    const unsubscribe = listenToMessages(conversationId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      
      // Mark messages as read
      if (currentUser) {
        markMessagesAsRead(conversationId, currentUser.uid).catch(console.error);
      }
      
      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => unsubscribe();
  }, [conversationId, currentUser]);

  const initializeChat = async () => {
    if (!currentUser || !otherUserId) return;
    
    try {
      let chatId = conversationId;
      
      if (!chatId) {
        // Create or get conversation
        chatId = await createOrGetConversation(currentUser.uid, otherUserId);
        setConversationId(chatId);
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      Alert.alert('Error', 'Failed to load chat');
      router.back();
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !currentUser || sending) {
      return;
    }

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      await sendMessage(conversationId, currentUser.uid, messageText);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      setNewMessage(messageText); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString() + ' ' + 
             date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const renderMessage = (message: Message, index: number) => {
    const isOwnMessage = message.senderId === currentUser?.uid;
    const showAvatar = index === 0 || 
                      messages[index - 1]?.senderId !== message.senderId;
    
    return (
      <View key={message.id} style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
      ]}>
        {!isOwnMessage && showAvatar && (
          <View style={styles.messageAvatar}>
            <Text style={styles.messageAvatarText}>
              {message.senderName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
          !isOwnMessage && !showAvatar && styles.messageWithoutAvatar
        ]}>
          {!isOwnMessage && showAvatar && (
            <Text style={styles.senderName}>{message.senderName}</Text>
          )}
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {message.text}
          </Text>
          <Text style={[
            styles.messageTime,
            isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
          ]}>
            {formatMessageTime(message.timestamp)}
            {message.edited && ' (edited)'}
          </Text>
        </View>
        
        {isOwnMessage && showAvatar && (
          <View style={styles.messageAvatar}>
            <Text style={styles.messageAvatarText}>
              {currentUser?.displayName?.charAt(0)?.toUpperCase() || 'M'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const goBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#324762', '#0A1C3C']}
        start={{ x: 1, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0EA5E9" />
            <Text style={styles.loadingText}>Loading chat...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#324762', '#0A1C3C']}
      start={{ x: 1, y: 1 }}
      end={{ x: 1, y: 0 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{otherUserName}</Text>
          </View>
        </View>

        <KeyboardAvoidingView 
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => 
              scrollViewRef.current?.scrollToEnd({ animated: true })
            }
          >
            {messages.length === 0 ? (
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatText}>
                  Start your conversation with {otherUserName}
                </Text>
              </View>
            ) : (
              messages.map((message, index) => renderMessage(message, index))
            )}
          </ScrollView>

          {/* Message Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type a message..."
                placeholderTextColor="#94A3B8"
                multiline
                maxLength={1000}
              />
              <TouchableOpacity
                onPress={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                style={[
                  styles.sendButton,
                  (!newMessage.trim() || sending) && styles.sendButtonDisabled
                ]}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="send" size={20} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
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
  },
  loadingText: {
    color: '#CBD5E1',
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerStatus: {
    color: '#22C55E',
    fontSize: 12,
    marginTop: 2,
  },
  headerAction: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyChatText: {
    color: '#94A3B8',
    fontSize: 16,
    textAlign: 'center',
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  messageAvatarText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    marginHorizontal: 4,
  },
  messageWithoutAvatar: {
    marginLeft: 40,
  },
  ownMessageBubble: {
    backgroundColor: '#0EA5E9',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFF',
  },
  otherMessageText: {
    color: '#FFF',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#94A3B8',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#1E293B',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
    paddingVertical: 8,
  },
  sendButton: {
    backgroundColor: '#0EA5E9',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#475569',
  },
});