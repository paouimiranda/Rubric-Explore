// components/JoinNoteModal.tsx
import { useAuth } from '@/app/contexts/AuthContext';
import { sharingService } from '@/services/sharing-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Keyboard,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { db } from '../../firebase';
import { CustomAlertModal } from './custom-alert-modal';

interface JoinNoteModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (noteId: string, permission: 'view' | 'edit') => void;
}

type InputMethod = 'code' | 'recent';

interface RecentNote {
  id: string;
  noteId: string;
  title: string;
  permission: 'view' | 'edit';
  visitedAt: Date;
  ownerName?: string;
}

export default function JoinNoteModal({ 
  visible, 
  onClose, 
  onSuccess 
}: JoinNoteModalProps) {
  const { user } = useAuth();
  const [inputMethod, setInputMethod] = useState<InputMethod>('code');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentNotes, setRecentNotes] = useState<RecentNote[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isFirstRender = useRef(true);
  
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    type: 'info' | 'success' | 'error' | 'warning';
    title: string;
    message: string;
    buttons: Array<{
      text: string;
      onPress: () => void;
      style?: 'default' | 'cancel' | 'primary';
    }>;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    buttons: [],
  });

  const fetchRecentNotes = useCallback(async () => {
    if (!user?.uid) return;
    
    setLoadingRecent(true);
    try {
      const recentRef = collection(db, 'users', user.uid, 'recentSharedNotes');
      const q = query(recentRef, orderBy('visitedAt', 'desc'), limit(10));
      const snapshot = await getDocs(q);
      
      const notes: RecentNote[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const noteRef = doc(db, 'notes', data.noteId);
        const noteSnap = await getDoc(noteRef);
        
        if (noteSnap.exists()) {
          notes.push({
            id: docSnap.id,
            noteId: data.noteId,
            title: noteSnap.data().title || 'Untitled Note',
            permission: data.permission,
            visitedAt: data.visitedAt?.toDate() || new Date(),
            ownerName: data.ownerName,
          });
        }
      }
      setRecentNotes(notes);
    } catch (error) {
      console.error('Error fetching recent notes:', error);
    } finally {
      setLoadingRecent(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (visible) {
      isFirstRender.current = true;
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
      
      if (user?.uid) {
        fetchRecentNotes();
      }
    } else {
      scaleAnim.setValue(0.9);
      fadeAnim.setValue(0);
    }
  }, [visible, user?.uid, fetchRecentNotes, scaleAnim, fadeAnim]);

  // Animate modal when switching tabs (skip first render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [inputMethod, scaleAnim]);

  const trackVisitedNote = async (
    noteId: string, 
    noteTitle: string, 
    permission: 'view' | 'edit',
    ownerName?: string
  ) => {
    if (!user?.uid) return;
    
    try {
      const recentRef = doc(db, 'users', user.uid, 'recentSharedNotes', noteId);
      await setDoc(recentRef, {
        noteId,
        title: noteTitle,
        permission,
        visitedAt: serverTimestamp(),
        ownerName: ownerName || null,
      }, { merge: true });
    } catch (error) {
      console.error('Error tracking visited note:', error);
    }
  };

  const extractToken = (inputText: string): string | null => {
    const trimmedInput = inputText.trim().toUpperCase();
    if (!trimmedInput) return null;
    if (/^[A-Z0-9]{8}$/.test(trimmedInput)) {
      return trimmedInput;
    }
    return null;
  };

  const handleJoinNote = async () => {
    if (!user) {
      setAlertConfig({
        visible: true,
        type: 'warning',
        title: 'Login Required',
        message: 'You need to be logged in to join shared notes.',
        buttons: [
          {
            text: 'Login',
            onPress: () => {
              setAlertConfig(prev => ({ ...prev, visible: false }));
              onClose();
              router.push('../../index');
            },
            style: 'primary',
          },
          {
            text: 'Cancel',
            onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
            style: 'cancel',
          }
        ],
      });
      return;
    }

    const token = extractToken(input);
    
    if (!token) {
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Invalid Code',
        message: 'Please enter a valid 8-character share code.\n\nExample: ABC12345',
        buttons: [
          {
            text: 'OK',
            onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
            style: 'primary',
          }
        ],
      });
      return;
    }

    try {
      setLoading(true);
      const result = await sharingService.useShareToken(token, user?.uid);
      
      await trackVisitedNote(
        result.note.id, 
        result.note.title, 
        result.permission
      );
      
      setAlertConfig({
        visible: true,
        type: 'success',
        title: 'Success!',
        message: `You now have ${result.permission} access to "${result.note.title}"`,
        buttons: [
          {
            text: 'Open Note',
            onPress: () => {
              setAlertConfig(prev => ({ ...prev, visible: false }));
              onClose();
              setInput('');
              
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
            },
            style: 'primary',
          },
          {
            text: 'Close',
            onPress: () => {
              setAlertConfig(prev => ({ ...prev, visible: false }));
              onClose();
              setInput('');
            },
            style: 'cancel',
          }
        ],
      });

    } catch (error: any) {
      console.error('Error joining note:', error);
      
      let errorMessage = 'Failed to join note. Please check your code and try again.';
      
      if (error.message.includes('Invalid or expired')) {
        errorMessage = 'This share code is invalid or has expired.';
      } else if (error.message.includes('usage limit')) {
        errorMessage = 'This share code has reached its usage limit.';
      } else if (error.message.includes('no longer exists')) {
        errorMessage = 'The shared note no longer exists.';
      }
      
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Error',
        message: errorMessage,
        buttons: [
          {
            text: 'OK',
            onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
            style: 'primary',
          }
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRecentNote = async (note: RecentNote) => {
    await trackVisitedNote(note.noteId, note.title, note.permission, note.ownerName);
    
    onClose();
    
    if (note.permission === 'edit') {
      router.push({
        pathname: '/screens/Notes/note-editor',
        params: {
          noteId: note.noteId,
          isSharedAccess: 'true',
          sharedPermission: 'edit',
        }
      });
    } else {
      router.push({
        pathname: '/screens/Notes/shared-note-viewer',
        params: {
          noteId: note.noteId,
          permission: 'view',
          isSharedAccess: 'true',
        }
      });
    }
    
    onSuccess?.(note.noteId, note.permission);
  };

  const handleClose = () => {
    setInput('');
    setInputMethod('code');
    onClose();
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const renderRecentNote = ({ item }: { item: RecentNote }) => (
    <TouchableOpacity
      style={styles.recentNoteItem}
      onPress={() => handleOpenRecentNote(item)}
      activeOpacity={0.7}
    >
      <View style={styles.recentNoteIcon}>
        <Ionicons 
          name={item.permission === 'edit' ? 'create-outline' : 'eye-outline'} 
          size={20} 
          color={item.permission === 'edit' ? '#6366f1' : '#10b981'} 
        />
      </View>
      <View style={styles.recentNoteContent}>
        <Text style={styles.recentNoteTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.recentNoteMeta}>
          <View style={[
            styles.permissionBadge,
            item.permission === 'edit' ? styles.editBadge : styles.viewBadge
          ]}>
            <Text style={styles.permissionText}>
              {item.permission === 'edit' ? 'Edit' : 'View'}
            </Text>
          </View>
          <Text style={styles.recentNoteTime}>
            {formatTimeAgo(item.visitedAt)}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#4b5563" />
    </TouchableOpacity>
  );

  return (
    <>
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
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.topBar}
                />

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
                    Enter a code or revisit recent notes
                  </Text>
                  <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                    <Ionicons name="close-circle" size={28} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <View style={styles.content}>
                  {/* Tab Selection */}
                  <View style={styles.methodSelection}>
                    <View style={styles.tabsContainer}>
                      <TouchableOpacity
                        style={[styles.tab, inputMethod === 'code' && styles.tabActive]}
                        onPress={() => setInputMethod('code')}
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
                        style={[styles.tab, inputMethod === 'recent' && styles.tabActive]}
                        onPress={() => setInputMethod('recent')}
                        activeOpacity={0.7}
                      >
                        {inputMethod === 'recent' && (
                          <LinearGradient
                            colors={['#6366f1', '#8b5cf6']}
                            style={styles.tabGradient}
                          />
                        )}
                        <Ionicons 
                          name="time" 
                          size={18} 
                          color={inputMethod === 'recent' ? '#fff' : '#6b7280'} 
                          style={styles.tabIcon}
                        />
                        <Text style={[
                          styles.tabText,
                          inputMethod === 'recent' && styles.tabTextActive
                        ]}>Recent</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {inputMethod === 'code' ? (
                    <>
                      {/* Code Input */}
                      <View style={styles.inputContainer}>
                        <View style={styles.inputWrapper}>
                          <View style={styles.inputIconContainer}>
                            <Ionicons name="keypad-outline" size={20} color="#6366f1" />
                          </View>
                          <TextInput
                            style={styles.textInput}
                            value={input}
                            onChangeText={(text) => setInput(text.toUpperCase())}
                            placeholder="Enter 8-character code"
                            placeholderTextColor="#4b5563"
                            autoCapitalize="characters"
                            autoCorrect={false}
                            maxLength={8}
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
                        
                        <View style={styles.helperContainer}>
                          <Ionicons name="information-circle-outline" size={14} color="#6b7280" />
                          <Text style={styles.helperText}>
                            8 characters (e.g., ABC12345)
                          </Text>
                          <Text style={styles.charCount}>{input.length}/8</Text>
                        </View>
                      </View>

                      {/* Join Button */}
                      <TouchableOpacity
                        style={[
                          styles.joinButton,
                          (input.length !== 8 || loading) && styles.joinButtonDisabled
                        ]}
                        onPress={handleJoinNote}
                        disabled={input.length !== 8 || loading}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={(input.length !== 8 || loading) ? ['#374151', '#1f2937'] : ['#6366f1', '#8b5cf6']}
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
                    </>
                  ) : (
                    /* Recent Notes List */
                    <View style={styles.recentContainer}>
                      {loadingRecent ? (
                        <View style={styles.loadingContainer}>
                          <ActivityIndicator size="large" color="#6366f1" />
                          <Text style={styles.loadingText}>Loading recent notes...</Text>
                        </View>
                      ) : recentNotes.length === 0 ? (
                        <View style={styles.emptyContainer}>
                          <Ionicons name="document-text-outline" size={48} color="#4b5563" />
                          <Text style={styles.emptyTitle}>No Recent Notes</Text>
                          <Text style={styles.emptyText}>
                            Notes you join will appear here for quick access
                          </Text>
                        </View>
                      ) : (
                        <FlatList
                          data={recentNotes}
                          renderItem={renderRecentNote}
                          keyExtractor={(item) => item.id}
                          showsVerticalScrollIndicator={false}
                          style={styles.recentList}
                          contentContainerStyle={styles.recentListContent}
                        />
                      )}
                    </View>
                  )}

                  {/* Info Cards */}
                  <View style={styles.infoCards}>
                    <View style={styles.infoCard}>
                      <View style={styles.infoIconContainer}>
                        <Ionicons name="shield-checkmark" size={16} color="#10b981" />
                      </View>
                      <Text style={styles.infoCardText}>Secure</Text>
                    </View>
                    <View style={styles.infoCard}>
                      <View style={styles.infoIconContainer}>
                        <Ionicons name="time" size={16} color="#f59e0b" />
                      </View>
                      <Text style={styles.infoCardText}>Real-time</Text>
                    </View>
                    <View style={styles.infoCard}>
                      <View style={styles.infoIconContainer}>
                        <Ionicons name="people" size={16} color="#6366f1" />
                      </View>
                      <Text style={styles.infoCardText}>Collab</Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>

      <CustomAlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </>
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
    maxHeight: '80%',
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
  topBar: { height: 4 },
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 24,
    position: 'relative',
  },
  iconContainer: { marginBottom: 16 },
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
  methodSelection: { marginBottom: 24 },
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
  tabActive: {},
  tabGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabIcon: { marginRight: 6 },
  tabText: {
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '600',
  },
  tabTextActive: { color: '#fff' },
  inputContainer: { marginBottom: 24 },
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
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 2,
    paddingVertical: 16,
    paddingRight: 16,
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
    flex: 1,
  },
  charCount: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '600',
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
  joinButtonDisabled: { opacity: 0.5 },
  joinButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: 0.2,
  },
  recentContainer: {
    minHeight: 200,
    maxHeight: 280,
    marginBottom: 24,
  },
  recentList: { flex: 1 },
  recentListContent: { gap: 8 },
  recentNoteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1419',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  recentNoteIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recentNoteContent: { flex: 1 },
  recentNoteTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  recentNoteMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  permissionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  editBadge: { backgroundColor: 'rgba(99, 102, 241, 0.2)' },
  viewBadge: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
  permissionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
  },
  recentNoteTime: {
    color: '#6b7280',
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 13,
    textAlign: 'center',
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
  infoIconContainer: { marginRight: 6 },
  infoCardText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
  },
});