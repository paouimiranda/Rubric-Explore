// components/JoinNoteModal.tsx
import { useAuth } from '@/app/contexts/AuthContext';
import { sharingService } from '@/services/sharing-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

interface JoinNoteModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (noteId: string, permission: 'view' | 'edit') => void;
}

type InputMethod = 'code' | 'url';

export default function JoinNoteModal({ 
  visible, 
  onClose, 
  onSuccess 
}: JoinNoteModalProps) {
  const { user } = useAuth();
  const [inputMethod, setInputMethod] = useState<InputMethod>('code');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(0.9));
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  // Extract token from various input formats
  const extractToken = (inputText: string): string | null => {
    const trimmedInput = inputText.trim();
    
    if (!trimmedInput) return null;

    // If it's already a clean token (8 chars for share code, 32+ for URL token)
    if (/^[A-Z0-9]{8}$/.test(trimmedInput)) {
      return trimmedInput; // Share code
    }
    
    if (/^[A-Za-z0-9]{20,}$/.test(trimmedInput)) {
      return trimmedInput; // Direct token
    }

    // Extract from URLs
    const urlPatterns = [
      /(?:https?:\/\/)?(?:www\.)?yourapp\.com\/shared\/([A-Za-z0-9]+)/i,
      /(?:https?:\/\/)?(?:localhost|127\.0\.0\.1)(?::\d+)?\/shared\/([A-Za-z0-9]+)/i,
      /yourapp:\/\/shared\/([A-Za-z0-9]+)/i,
      /\/shared\/([A-Za-z0-9]+)(?:[\/\?#]|$)/i,
    ];

    for (const pattern of urlPatterns) {
      const match = trimmedInput.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  };

  const handleJoinNote = async () => {
    if (!user) {
      Alert.alert(
        'Login Required', 
        'You need to be logged in to join shared notes.',
        [
          {
            text: 'Login',
            onPress: () => {
              onClose();
              router.push('../../index');
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    const token = extractToken(input);
    
    if (!token) {
      Alert.alert(
        'Invalid Input', 
        'Please enter a valid share code or URL.\n\nExamples:\n• Share code: ABC12345\n• URL: https://yourapp.com/shared/abc123...'
      );
      return;
    }

    try {
      setLoading(true);
      
      const result = await sharingService.useShareToken(token, user?.uid);
      
      Alert.alert(
          'Success!', 
          `You now have ${result.permission} access to "${result.note.title}"`,
          [
            {
              text: 'Open Note',
              style: 'default',
              onPress: () => {
                onClose();
                setInput('');
                
                // Route based on permission
                if (result.permission === 'edit') {
                  router.push({
                    pathname: '/screens/Notes/note-editor',
                    params: {
                      noteId: result.note.id,
                      isSharedAccess: 'true',
                      sharedPermission: 'edit',
                    }
                  });
                } else {
                  router.push({
                    pathname: '/screens/Notes/shared-note-viewer',
                    params: {
                      noteId: result.note.id,
                      permission: 'view',
                      isSharedAccess: 'true',
                    }
                  });
                }
                
                onSuccess?.(result.note.id, result.permission);
              }
            },
          {
            text: 'Close',
            style: 'cancel',
            onPress: () => {
              onClose();
              setInput('');
            }
          }
        ]
      );

    } catch (error: any) {
      console.error('Error joining note:', error);
      
      let errorMessage = 'Failed to join note. Please check your input and try again.';
      
      if (error.message.includes('Invalid or expired')) {
        errorMessage = 'This share link is invalid or has expired.';
      } else if (error.message.includes('usage limit')) {
        errorMessage = 'This share link has reached its usage limit.';
      } else if (error.message.includes('no longer exists')) {
        errorMessage = 'The shared note no longer exists.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setInput('');
    setInputMethod('code');
    onClose();
  };

  const getPlaceholderText = () => {
    switch (inputMethod) {
      case 'code':
        return 'Enter 8-character code';
      case 'url':
        return 'Paste share URL here';
      default:
        return 'Enter code or URL';
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <Animated.View 
            style={[
              styles.modalWrapper,
              {
                transform: [{ scale: scaleAnim }],
                opacity: fadeAnim,
              }
            ]}
          >
            <LinearGradient 
              colors={["#1a1f2e", "#0f1419"]} 
              style={styles.modalContainer}
            >
              {/* Decorative Top Bar */}
              <LinearGradient
                colors={['#6366f1', '#8b5cf6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.topBar}
              />

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={['#6366f1', '#8b5cf6']}
                    style={styles.iconGradient}
                  >
                    <Ionicons name="link" size={24} color="#fff" />
                  </LinearGradient>
                </View>
                <Text style={styles.title}>Join Shared Note</Text>
                <Text style={styles.subtitle}>
                  Access notes shared with you
                </Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Ionicons name="close-circle" size={28} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.content}>
                {/* Input Method Tabs */}
                <View style={styles.methodSelection}>
                  <View style={styles.tabsContainer}>
                    <TouchableOpacity
                      style={[
                        styles.tab,
                        inputMethod === 'code' && styles.tabActive
                      ]}
                      onPress={() => {
                        setInputMethod('code');
                        setInput('');
                      }}
                      activeOpacity={0.7}
                    >
                      {inputMethod === 'code' && (
                        <LinearGradient
                          colors={['#6366f1', '#8b5cf6']}
                          style={styles.tabGradient}
                        />
                      )}
                      <Ionicons 
                        name="keypad" 
                        size={18} 
                        color={inputMethod === 'code' ? '#fff' : '#6b7280'} 
                        style={styles.tabIcon}
                      />
                      <Text style={[
                        styles.tabText,
                        inputMethod === 'code' && styles.tabTextActive
                      ]}>Code</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.tab,
                        inputMethod === 'url' && styles.tabActive
                      ]}
                      onPress={() => {
                        setInputMethod('url');
                        setInput('');
                      }}
                      activeOpacity={0.7}
                    >
                      {inputMethod === 'url' && (
                        <LinearGradient
                          colors={['#6366f1', '#8b5cf6']}
                          style={styles.tabGradient}
                        />
                      )}
                      <Ionicons 
                        name="link" 
                        size={18} 
                        color={inputMethod === 'url' ? '#fff' : '#6b7280'} 
                        style={styles.tabIcon}
                      />
                      <Text style={[
                        styles.tabText,
                        inputMethod === 'url' && styles.tabTextActive
                      ]}>URL</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Input Field */}
                <View style={styles.inputContainer}>
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputIconContainer}>
                      <Ionicons 
                        name={inputMethod === 'code' ? 'keypad-outline' : 'link-outline'} 
                        size={20} 
                        color="#6366f1" 
                      />
                    </View>
                    <TextInput
                      style={[
                        styles.textInput,
                        inputMethod === 'url' && styles.textInputMultiline
                      ]}
                      value={input}
                      onChangeText={setInput}
                      placeholder={getPlaceholderText()}
                      placeholderTextColor="#4b5563"
                      autoCapitalize={inputMethod === 'code' ? 'characters' : 'none'}
                      autoCorrect={false}
                      multiline={inputMethod === 'url'}
                      numberOfLines={inputMethod === 'url' ? 3 : 1}
                    />
                    {input.length > 0 && (
                      <TouchableOpacity 
                        onPress={() => setInput('')}
                        style={styles.clearButton}
                      >
                        <Ionicons name="close-circle" size={20} color="#6b7280" />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  {/* Helper Text */}
                  <View style={styles.helperContainer}>
                    <Ionicons name="information-circle-outline" size={14} color="#6b7280" />
                    <Text style={styles.helperText}>
                      {inputMethod === 'code' 
                        ? '8 characters (e.g., ABC12345)'
                        : 'Full URL from message or browser'}
                    </Text>
                  </View>
                </View>

                {/* Action Button */}
                <TouchableOpacity
                  style={[
                    styles.joinButton,
                    (!input.trim() || loading) && styles.joinButtonDisabled
                  ]}
                  onPress={handleJoinNote}
                  disabled={!input.trim() || loading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={(!input.trim() || loading) ? ['#374151', '#1f2937'] : ['#6366f1', '#8b5cf6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.joinButtonGradient}
                  >
                    {loading ? (
                      <>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={styles.joinButtonText}>Joining...</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="arrow-forward-circle" size={22} color="#fff" />
                        <Text style={styles.joinButtonText}>Join Note</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Info Cards */}
                <View style={styles.infoCards}>
                  <View style={styles.infoCard}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons name="shield-checkmark" size={16} color="#10b981" />
                    </View>
                    <Text style={styles.infoCardText}>Secure access</Text>
                  </View>
                  <View style={styles.infoCard}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons name="time" size={16} color="#f59e0b" />
                    </View>
                    <Text style={styles.infoCardText}>Real-time sync</Text>
                  </View>
                  <View style={styles.infoCard}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons name="people" size={16} color="#6366f1" />
                    </View>
                    <Text style={styles.infoCardText}>Sharing</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalWrapper: {
    width: '90%',
    maxWidth: 420,
  },
  modalContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 25,
  },
  topBar: {
    height: 4,
  },
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 24,
    position: 'relative',
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '400',
  },
  content: {
    padding: 24,
    paddingTop: 8,
  },
  methodSelection: {
    marginBottom: 24,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#0f1419',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  tabActive: {
    // Active state handled by gradient
  },
  tabGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1419',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1f2937',
    overflow: 'hidden',
  },
  inputIconContainer: {
    paddingLeft: 16,
    paddingRight: 12,
  },
  textInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 16,
    paddingRight: 16,
  },
  textInputMultiline: {
    paddingTop: 16,
    paddingBottom: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  clearButton: {
    paddingRight: 16,
    paddingLeft: 8,
  },
  helperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  helperText: {
    color: '#6b7280',
    fontSize: 13,
    marginLeft: 6,
  },
  joinButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  joinButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  joinButtonDisabled: {
    opacity: 0.5,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: 0.2,
  },
  infoCards: {
    flexDirection: 'row',
    gap: 8,
  },
  infoCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1419',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  infoIconContainer: {
    marginRight: 6,
  },
  infoCardText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
  },
});