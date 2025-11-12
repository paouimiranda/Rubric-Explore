// app/components/Notes/NoteSidebar.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef } from "react";
import {
    Animated,
    Dimensions,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.75;

interface NotebookProperty {
  key: string;
  value: string;
  source?: 'inherited' | 'manual';
  icon?: string;
  iconColor?: string;
}

interface Note {
  id: string;
  uid: string;
  notebookId: string;
  title: string;
  content?: string;
  properties?: NotebookProperty[];
  createdAt: Date;
  updatedAt: Date;
  isPublic?: boolean;
}

interface NoteSidebarProps {
  visible: boolean;
  onClose: () => void;
  notes: Note[];
  currentNoteId: string;
  notebookId: string;
  notebookTitle: string;
  onNoteSelect: (noteId: string) => void;
}

export default function NoteSidebar({
  visible,
  onClose,
  notes,
  currentNoteId,
  notebookId,
  notebookTitle,
  onNoteSelect,
}: NoteSidebarProps) {
  
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);

  useEffect(() => {
    if (visible) {
      isAnimating.current = true;
      // Slide in and fade in backdrop
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        isAnimating.current = false;
      });
    } else {
      isAnimating.current = true;
      // Slide out and fade out backdrop
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        isAnimating.current = false;
      });
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    if (isAnimating.current) return;
    
    isAnimating.current = true;
    // Animate out before closing
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -SIDEBAR_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      isAnimating.current = false;
      onClose();
    });
  }, [onClose, slideAnim, fadeAnim]);
  
  const handleNotePress = useCallback((noteId: string) => {
    if (isAnimating.current) return;
    
    if (noteId === currentNoteId) {
      handleClose();
      return;
    }
    
    // Call onNoteSelect which will handle closing the sidebar
    onNoteSelect(noteId);
  }, [currentNoteId, handleClose, onNoteSelect]);

  const handleBackToNotebook = useCallback(() => {
    if (isAnimating.current) return;
    
    isAnimating.current = true;
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -SIDEBAR_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      isAnimating.current = false;
      onClose();
      // Use requestAnimationFrame to defer navigation
      requestAnimationFrame(() => {
        setTimeout(() => {
          router.back();
        }, 50);
      });
    });
  }, [onClose, slideAnim, fadeAnim]);

  const renderNote = useCallback(({ item }: { item: Note }) => {
    const isActive = item.id === currentNoteId;
    const primaryProperty = item.properties?.[0];
    
    return (
      <TouchableOpacity
        style={[
          styles.noteItem,
          isActive && styles.noteItemActive
        ]}
        onPress={() => handleNotePress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.noteItemLeft}>
          <View style={[
            styles.noteItemIcon,
            isActive && styles.noteItemIconActive
          ]}>
            <Ionicons 
              name="document-text" 
              size={18} 
              color={isActive ? "#3b82f6" : "#6b7280"} 
            />
          </View>
        </View>
        
        <View style={styles.noteItemContent}>
          <Text 
            style={[
              styles.noteItemTitle,
              isActive && styles.noteItemTitleActive
            ]} 
            numberOfLines={2}
          >
            {item.title}
          </Text>
          
          {primaryProperty && (
            <View style={styles.noteItemProperty}>
              <Ionicons 
                name={primaryProperty.source === 'inherited' ? 'link-outline' : 'pricetag'} 
                size={10} 
                color={primaryProperty.source === 'inherited' ? '#a78bfa' : '#60a5fa'} 
              />
              <Text style={styles.noteItemPropertyText} numberOfLines={1}>
                {primaryProperty.key}: {primaryProperty.value}
              </Text>
            </View>
          )}
          
          <Text style={styles.noteItemDate}>
            {item.updatedAt.toLocaleDateString()}
          </Text>
        </View>
        
        {isActive && (
          <View style={styles.activeIndicator}>
            <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />
          </View>
        )}
      </TouchableOpacity>
    );
  }, [currentNoteId, handleNotePress]);

  const keyExtractor = useCallback((item: Note) => item.id, []);

  const ListEmptyComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-outline" size={48} color="#4b5563" />
      <Text style={styles.emptyText}>No notes yet</Text>
    </View>
  ), []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {/* Animated Darkened Background */}
        <Animated.View 
          style={[
            styles.backdrop,
            {
              opacity: fadeAnim,
            }
          ]}
        >
          <TouchableOpacity 
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>
        
        {/* Animated Sidebar */}
        <Animated.View 
          style={[
            styles.sidebar,
            {
              transform: [{ translateX: slideAnim }],
            }
          ]}
        >
          <LinearGradient
            colors={['#1f2937', '#111827']}
            style={styles.sidebarGradient}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={handleBackToNotebook}
                >
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={handleClose}
                >
                  <Ionicons name="close" size={24} color="#9ca3af" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.headerContent}>
                <View style={styles.notebookIcon}>
                  <Ionicons name="book" size={24} color="#3b82f6" />
                </View>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.headerLabel}>Notebook</Text>
                  <Text style={styles.headerTitle} numberOfLines={2}>
                    {notebookTitle}
                  </Text>
                </View>
              </View>
              
              <View style={styles.headerDivider} />
              
              <View style={styles.notesCount}>
                <Ionicons name="document-text-outline" size={16} color="#9ca3af" />
                <Text style={styles.notesCountText}>
                  {notes.length} {notes.length === 1 ? 'note' : 'notes'}
                </Text>
              </View>
            </View>

            {/* Notes List */}
            <FlatList
              data={notes}
              renderItem={renderNote}
              keyExtractor={keyExtractor}
              contentContainerStyle={styles.notesList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={ListEmptyComponent}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={10}
            />
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 16,
  },
  sidebarGradient: {
    flex: 1,
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(75, 85, 99, 0.3)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  notebookIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  headerDivider: {
    height: 2,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 1,
    marginVertical: 12,
  },
  notesCount: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  notesCountText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af',
    marginLeft: 8,
  },
  notesList: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  noteItemActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  noteItemLeft: {
    marginRight: 10,
  },
  noteItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(107, 114, 128, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteItemIconActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  noteItemContent: {
    flex: 1,
    marginRight: 8,
  },
  noteItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  noteItemTitleActive: {
    color: '#60a5fa',
  },
  noteItemProperty: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
    maxWidth: '90%',
  },
  noteItemPropertyText: {
    fontSize: 11,
    color: '#60a5fa',
    marginLeft: 4,
    fontWeight: '500',
  },
  noteItemDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  activeIndicator: {
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
  },
});