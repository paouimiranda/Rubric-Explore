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
      // Production URL: https://yourapp.com/shared/TOKEN
      /(?:https?:\/\/)?(?:www\.)?yourapp\.com\/shared\/([A-Za-z0-9]+)/i,
      // Development URL: http://localhost:3000/shared/TOKEN
      /(?:https?:\/\/)?(?:localhost|127\.0\.0\.1)(?::\d+)?\/shared\/([A-Za-z0-9]+)/i,
      // Deep link: yourapp://shared/TOKEN
      /yourapp:\/\/shared\/([A-Za-z0-9]+)/i,
      // Generic pattern: any URL ending with the token
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
    // Check if user is logged in
    if (!user) {
      Alert.alert(
        'Login Required', 
        'You need to be logged in to join shared notes.',
        [
          {
            text: 'Login',
            onPress: () => {
              onClose();
              // Navigate to login screen
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
      
      // Use the sharing service to validate and access the shared note
      const result = await sharingService.useShareToken(token, user?.uid);
      
      // Show success message
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
              
              // Navigate to the shared note
              router.push({
                pathname: '/screens/Notes/shared-note-viewer',
                params: {
                  noteId: result.note.id,
                  permission: result.permission,
                  isSharedAccess: 'true',
                }
              });
              
              // Call success callback if provided
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
        return 'Enter 8-character code (e.g., ABC12345)';
      case 'url':
        return 'Paste share URL here';
      default:
        return 'Enter code or URL';
    }
  };

  const getExampleText = () => {
    switch (inputMethod) {
      case 'code':
        return 'Example: ABC12345';
      case 'url':
        return 'Example: https://yourapp.com/shared/abc123...';
      default:
        return '';
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <LinearGradient colors={["#324762", "#0A1C3C"]} style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Join Shared Note</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              {/* Instructions */}
              <View style={styles.instructionsContainer}>
                <Ionicons name="information-circle" size={20} color="#60a5fa" />
                <Text style={styles.instructionsText}>
                  Enter a share code or paste a share URL to access a note someone shared with you.
                </Text>
              </View>

              {/* Input Method Selection */}
              <View style={styles.methodSelection}>
                <Text style={styles.methodLabel}>Input Method</Text>
                <View style={styles.methodButtons}>
                  <TouchableOpacity
                    style={[
                      styles.methodButton,
                      inputMethod === 'code' && styles.methodButtonActive
                    ]}
                    onPress={() => {
                      setInputMethod('code');
                      setInput('');
                    }}
                  >
                    <Ionicons 
                      name="keypad" 
                      size={16} 
                      color={inputMethod === 'code' ? '#fff' : '#9ca3af'} 
                    />
                    <Text style={[
                      styles.methodText,
                      inputMethod === 'code' && styles.methodTextActive
                    ]}>Share Code</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.methodButton,
                      inputMethod === 'url' && styles.methodButtonActive
                    ]}
                    onPress={() => {
                      setInputMethod('url');
                      setInput('');
                    }}
                  >
                    <Ionicons 
                      name="link" 
                      size={16} 
                      color={inputMethod === 'url' ? '#fff' : '#9ca3af'} 
                    />
                    <Text style={[
                      styles.methodText,
                      inputMethod === 'url' && styles.methodTextActive
                    ]}>Share URL</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Input Field */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  {inputMethod === 'code' ? 'Share Code' : 'Share URL'}
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={input}
                  onChangeText={setInput}
                  placeholder={getPlaceholderText()}
                  placeholderTextColor="#9ca3af"
                  autoCapitalize={inputMethod === 'code' ? 'characters' : 'none'}
                  autoCorrect={false}
                  multiline={inputMethod === 'url'}
                  numberOfLines={inputMethod === 'url' ? 3 : 1}
                />
                
                {/* Example text */}
                <Text style={styles.exampleText}>{getExampleText()}</Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.joinButton,
                    (!input.trim() || loading) && styles.joinButtonDisabled
                  ]}
                  onPress={handleJoinNote}
                  disabled={!input.trim() || loading}
                >
                  {loading ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={styles.joinButtonText}>Joining...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="enter" size={20} color="#fff" />
                      <Text style={styles.joinButtonText}>Join Note</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>

              {/* Tips */}
              <View style={styles.tipsContainer}>
                <Text style={styles.tipsTitle}>💡 Tips:</Text>
                <Text style={styles.tipText}>• Share codes are 8 characters (e.g., ABC12345)</Text>
                <Text style={styles.tipText}>• You can paste full URLs from messages or browsers</Text>
                <Text style={styles.tipText}>• Some links may require login for edit access</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  instructionsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  instructionsText: {
    color: '#d1d5db',
    fontSize: 14,
    lineHeight: 18,
    marginLeft: 8,
    flex: 1,
  },
  methodSelection: {
    marginBottom: 20,
  },
  methodLabel: {
    color: '#d1d5db',
    fontSize: 14,
    marginBottom: 8,
  },
  methodButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    flex: 1,
    justifyContent: 'center',
  },
  methodButtonActive: {
    backgroundColor: '#60a5fa',
  },
  methodText: {
    color: '#9ca3af',
    marginLeft: 8,
    fontSize: 14,
  },
  methodTextActive: {
    color: '#fff',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    color: '#d1d5db',
    fontSize: 14,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    textAlignVertical: 'top',
  },
  exampleText: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
  buttonsContainer: {
    marginBottom: 20,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#52C72B',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  tipsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 8,
  },
  tipsTitle: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  tipText: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 4,
  },
});