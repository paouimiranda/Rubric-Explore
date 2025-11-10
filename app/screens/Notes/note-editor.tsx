// app/screens/Notes/note-editor.tsx 
import { Note, NotebookProperty } from "@/app/types/notebook";
import RichTextEditor, { RichTextEditorRef } from '@/components/Interface/rich-text-editor';
import RichTextToolbar from "@/components/Interface/rich-text-toolbar";
import SharingModal from "@/components/Interface/sharing-modal";
import { db } from "@/firebase";
import { useCollaborativeEditing } from '@/hooks/CollaborativeEditing';
import { useBacklogLogger } from "@/hooks/useBackLogLogger";
import { BACKLOG_EVENTS } from "@/services/backlogEvents";
import { updateNote } from '@/services/notes-service';
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import {
  doc,
  getDoc
} from "firebase/firestore";
import LottieView from 'lottie-react-native';
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  NativeSyntheticEvent,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputSelectionChangeEventData,
  TouchableOpacity,
  View
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import OCRModal from "./ocr";
import PropertiesModal from './properties';
type NoteEditorProps = {
  isSharedAccess?: boolean;
  sharedPermission?: "view" | "edit";
  sharedNote?: Note | null;
};

export default function NoteEditor({
  isSharedAccess = false,
  sharedPermission,
  sharedNote,
}: NoteEditorProps) {
  const { user } = useAuth();
  const uid = user?.uid;
  const { addBacklogEvent } = useBacklogLogger();
  const hasLoggedOpen = useRef(false);
  if (!uid) {
    return (
      <LinearGradient colors={["#324762", "#0A1C3C"]} style={styles.loadingContainer}>
        <SafeAreaView style={styles.loadingContent}>
          <Text style={styles.loadingText}>Please log in to edit notes</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const { 
    noteId: routeNoteId, 
    notebookId, 
    isSharedAccess: routeIsSharedAccess, 
    sharedPermission: routeSharedPermission 
  } = useLocalSearchParams();
  
  const effectiveIsSharedAccess = isSharedAccess || routeIsSharedAccess === 'true';
  const effectiveSharedPermission = sharedPermission || (routeSharedPermission as 'view' | 'edit');
  const [note, setNote] = useState<Note | null>(null);
  const effectiveNote = effectiveIsSharedAccess ? sharedNote : note;
  const [properties, setProperties] = useState<NotebookProperty[]>([]);
  const [loading, setLoading] = useState(true); 
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [visible, setVisible] = useState(false);

  const [ocrModalVisible, setOcrModalVisible] = useState(false);
  const [propertiesModalVisible, setPropertiesModalVisible] = useState(false);
  const [ellipsisMenuVisible, setEllipsisMenuVisible] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [metadataModalVisible, setMetadataModalVisible] = useState(false);
    
  const richEditorRef = useRef<RichTextEditorRef>(null);
  
  const isUserTyping = useCallback(() => {
    return richEditorRef.current?.isTyping() || false;
  }, []);
  
  const handlePropertiesUpdate = (updatedProperties: NotebookProperty[]) => {
    // Mark all updated properties as manually edited
    const propertiesWithSource = updatedProperties.map(prop => ({
      ...prop,
      source: 'manual' as const
    }));
    setProperties(propertiesWithSource);
    setHasUnsavedChanges(true);
    addBacklogEvent(BACKLOG_EVENTS.USER_UPDATED_PROPERTIES, { noteId: routeNoteId });
  };

  const collaborative = useCollaborativeEditing(
    routeNoteId as string,
    user,
    note?.title || '',
  );

  const title = collaborative.title;  
  const content = collaborative.content;

  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedContent = useRef('');
  const isSyncing = useRef(false);

  useEffect(() => {
    if (isSyncing.current || isUserTyping() || content === lastSyncedContent.current) {
      return;
    }

    console.log('🔄 Yjs content changed, scheduling sync');
    
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(async () => {
      if (!isUserTyping() && richEditorRef.current && !isSyncing.current) {
        isSyncing.current = true;
        console.log('📥 Applying Yjs update with cursor preservation');
        
        try {
          await richEditorRef.current.setContentHtml(content);
          lastSyncedContent.current = content;
        } catch (error) {
          console.error('Error syncing content:', error);
        } finally {
          isSyncing.current = false;
        }
      }
    }, 200);
    
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [content, isUserTyping]);

  const handleTitleChange = useCallback((newTitle: string, event?: NativeSyntheticEvent<any>) => {
    if (effectiveIsSharedAccess && effectiveSharedPermission === "view") return;
    
    const selectionStart = event?.nativeEvent?.selection?.start;
    const selectionEnd = event?.nativeEvent?.selection?.end;
    
    collaborative.handleTitleChange(newTitle, selectionStart, selectionEnd);
  }, [collaborative, effectiveIsSharedAccess, effectiveSharedPermission]);

  const handleContentChange = useCallback((newContent: string) => {
    if (effectiveIsSharedAccess && effectiveSharedPermission === "view") return;
    
    console.log('⌨️ Editor content changed');
    lastSyncedContent.current = newContent;
    collaborative.handleContentChange(newContent);
  }, [collaborative, effectiveIsSharedAccess, effectiveSharedPermission]);

  const handleTitleSelectionChange = useCallback((event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    const { start } = event.nativeEvent.selection;
    collaborative.updateCursor('title', start);
  }, [collaborative]);

  const handleContentCursorPosition = useCallback((position: number) => {
    collaborative.updateCursor('content', position);
  }, [collaborative]);

  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (routeNoteId && uid) {
      fetchNote(routeNoteId as string);
    }
  }, [routeNoteId, uid]);

  useEffect(() => {
    if (note && properties !== note.properties) {
      setHasUnsavedChanges(true);
      
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveNote(false);
      }, 2000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [properties, uid, note]);

  useEffect(() => {
    if (!hasLoggedOpen.current) {
      hasLoggedOpen.current = true;
      addBacklogEvent(BACKLOG_EVENTS.USER_OPENED_NOTE_EDITOR, { noteId: routeNoteId });
      if (effectiveIsSharedAccess) {
        addBacklogEvent(BACKLOG_EVENTS.USER_VIEWED_SHARED_NOTE, { noteId: routeNoteId, permission: effectiveSharedPermission });
      }
    }
  }, []);

  const fetchNote = async (id: string) => {
    try {
      setLoading(true);
      const docRef = doc(db, "notes", id);
      const snap = await getDoc(docRef);
      
      if (snap.exists()) {
        const data = snap.data();
        
        if (!data.chunkCount || data.chunkCount === 0) {
          console.log('Note needs migration, migrating now...');
          const { migrateNoteToChunks } = await import('@/services/migration/notes-migration');
          await migrateNoteToChunks(id);
        }
        
        const noteData = {
          id: snap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Note;
        
        setNote(noteData);
        setProperties(noteData.properties || []);
      } else {
        Alert.alert("Error", "Note not found");
        addBacklogEvent("note_not_found", { noteId: id });
        router.back();
      }
    } catch (error) {
      console.error("Error fetching note:", error);
      Alert.alert("Error", "Failed to load note");
      addBacklogEvent("note_fetch_error", { noteId: id, error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const saveNote = async (showFeedback = true) => {
    if (!note || !uid) return;
    
    const isOwner = note.uid === uid;
    const isCollaborator = note.collaborators && note.collaborators[uid];
    const hasEditPermission = isOwner || 
      (isCollaborator && isCollaborator.permission === 'edit') ||
      (effectiveIsSharedAccess && effectiveSharedPermission === 'edit');

    if (!hasEditPermission) {
      Alert.alert("Error", "You don't have permission to edit this note");
      addBacklogEvent("note_save_permission_error", { noteId: note.id });
      return;
    }
    
    try {
      setSaving(true);
      
      const metadataUpdates = {
        properties,
      };
      
      await updateNote(note.id, metadataUpdates, uid);
      
      setHasUnsavedChanges(false);
      if (showFeedback) {
        console.log("Note metadata saved successfully");
      }
      addBacklogEvent(BACKLOG_EVENTS.USER_SAVED_NOTE, { noteId: note.id });
    } catch (error) {
      console.error("Error saving note:", error);
      if (showFeedback) {
        Alert.alert("Error", "Failed to save note");
      }
      addBacklogEvent("note_save_error", { noteId: note.id, error: String(error) });
    } finally {
      setSaving(false);
    }
  };
  
  const handleBack = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Do you want to save before leaving?",
        [
          { text: "Don't Save", style: "destructive", onPress: () => router.back() },
          { text: "Cancel", style: "cancel" },
          { text: "Save", onPress: async () => { await saveNote(); router.back(); } },
        ]
      );
    } else {
      router.back();
    }
  };

  const handleOCRTextInsert = useCallback((text: string) => {
    if (effectiveIsSharedAccess && effectiveSharedPermission === "view") return;
    
    const newContent = content + (content ? '<p><br></p>' : '') + `<p>${text}</p>`;
    collaborative.handleContentChange(newContent);
    setHasUnsavedChanges(true);
    addBacklogEvent(BACKLOG_EVENTS.USER_USED_OCR, { noteId: routeNoteId });
  }, [collaborative, content, effectiveIsSharedAccess, effectiveSharedPermission]);

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Show loading screen while note metadata is loading OR content is not ready
  if (loading || !collaborative.contentReady) {
    return (
      <LinearGradient colors={["#324762", "#0A1C3C"]} style={styles.loadingContainer}>
        <SafeAreaView style={styles.loadingContent}>
          <LottieView
            source={require('@/assets/animations/quiz-loading.json')}
            autoPlay
            loop
            style={styles.lottieAnimation}
          />
          <Text style={styles.loadingText}>
            {loading ? 'Loading note...' : 'Loading content...'}
          </Text>
          {collaborative.chunkCount > 0 && (
            <Text style={styles.loadingSubtext}>
              Loading {collaborative.chunkCount} chunk{collaborative.chunkCount !== 1 ? 's' : ''}
            </Text>
          )}
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#324762", "#324762"]} style={styles.container}>
      <SafeAreaView style={styles.container}>
        {/* Minimalist Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerRight}>
            {!effectiveIsSharedAccess && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setOcrModalVisible(true)}
              >
                <Ionicons name="scan-outline" size={22} color="#fff" />
              </TouchableOpacity>
            )}
            
            {!effectiveIsSharedAccess && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => {
                  if (note) {
                    setVisible(true);
                    addBacklogEvent(BACKLOG_EVENTS.USER_SHARED_NOTE, { noteId: routeNoteId });
                  } else {
                    Alert.alert('Error', 'Please save the note first before sharing');
                  }
                }}
              >
                <Ionicons name="share-social-outline" size={22} color="#fff" />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setEllipsisMenuVisible(true)}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView 
          style={styles.content} 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title */}
            <TextInput
              ref={collaborative.titleInputRef}
              style={styles.titleInput}
              value={title}
              onChangeText={(text) => handleTitleChange(text)}
              onSelectionChange={handleTitleSelectionChange}
              editable={!(effectiveIsSharedAccess && effectiveSharedPermission === "view")}
              placeholder="Untitled"
              placeholderTextColor="#6b7280"
              multiline
              textAlignVertical="top"
              autoCapitalize="sentences"
              autoCorrect={true}
              spellCheck={true}
            />

            {/* Properties Section */}
            {properties.length > 0 && (
              <View style={styles.propertiesSection}>
                {properties.map((property, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.propertyRow}
                    onPress={() => !effectiveIsSharedAccess && setPropertiesModalVisible(true)}
                    activeOpacity={0.7}
                    disabled={effectiveIsSharedAccess}
                  >
                    {/* Icon Display */}
                    {property.icon && (
                      <Ionicons 
                        name={property.icon as any} 
                        size={18} 
                        color={property.iconColor || '#6b7280'} 
                        style={{ marginRight: 8 }}
                      />
                    )}
                    
                    <Text style={styles.propertyKey}>
                      {truncateText(property.key, 20)}
                    </Text>
                    <Text style={styles.propertyValue}>
                      {property.value}
                    </Text>
                  </TouchableOpacity>
                ))}
                
                {!effectiveIsSharedAccess && (
                  <TouchableOpacity
                    style={styles.addPropertyButton}
                    onPress={() => setPropertiesModalVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={16} color="#6b7280" />
                    <Text style={styles.addPropertyText}>Add property</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Add property button when no properties exist */}
            {properties.length === 0 && !effectiveIsSharedAccess && (
              <View style={styles.propertiesSection}>
                <TouchableOpacity
                  style={styles.addPropertyButton}
                  onPress={() => setPropertiesModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={16} color="#6b7280" />
                  <Text style={styles.addPropertyText}>Add property</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Rich Text Editor */}
            <View style={styles.editorWrapper}>
              <RichTextEditor
                ref={richEditorRef}
                initialContent={content}
                onContentChange={handleContentChange}
                editable={!(effectiveIsSharedAccess && effectiveSharedPermission === "view")}
                placeholder="Start writing..."
                onCursorPosition={handleContentCursorPosition}
                style={styles.richEditor}
                onEditorReady={(editor) => {
                  // console.log('✅ Rich text editor ready');
                }}
              />
            </View>
          </ScrollView>

          {!(effectiveIsSharedAccess && effectiveSharedPermission === "view") && (
            <RichTextToolbar
              getEditor={() => richEditorRef.current?.getEditor()}
              onMetadataPress={() => setMetadataModalVisible(true)}
              noteId={routeNoteId as string}
              userId={uid!}
              onUndo={collaborative.undo}
              onRedo={collaborative.redo}
              canUndo={collaborative.canUndo}
              canRedo={collaborative.canRedo}              
            />
          )}
        </KeyboardAvoidingView>

        {/* Ellipsis Bottom Sheet Menu */}
        <Modal
          visible={ellipsisMenuVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setEllipsisMenuVisible(false)}
        >
          <TouchableOpacity 
            style={styles.bottomSheetOverlay}
            activeOpacity={1}
            onPress={() => setEllipsisMenuVisible(false)}
          >
            <View style={styles.bottomSheet}>
              <View style={styles.bottomSheetHandle} />
              
              {effectiveIsSharedAccess && (
                <View style={styles.menuItem}>
                  <Ionicons 
                    name={effectiveSharedPermission === 'edit' ? 'create' : 'eye'} 
                    size={20} 
                    color={effectiveSharedPermission === 'edit' ? '#22c55e' : '#60a5fa'} 
                  />
                  <Text style={styles.menuItemText}>
                    Shared with {effectiveSharedPermission} access
                  </Text>
                </View>
              )}
              
              {collaborative.isConnected && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowCollaborators(!showCollaborators);
                    if (!showCollaborators && collaborative.activeUsers.length === 0) {
                      setEllipsisMenuVisible(false);
                    }
                  }}
                >
                  <Ionicons name="people" size={20} color="#4ade80" />
                  <Text style={styles.menuItemText}>
                    {collaborative.activeUsers.length} {collaborative.activeUsers.length === 1 ? 'Collaborator' : 'Collaborators'}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.menuItem, (saving || (effectiveIsSharedAccess && effectiveSharedPermission === 'view')) && styles.menuItemDisabled]}
                onPress={() => {
                  saveNote(true);
                  setEllipsisMenuVisible(false);
                }}
                disabled={saving || (effectiveIsSharedAccess && effectiveSharedPermission === 'view')}
              >
                <Ionicons 
                  name={saving ? "reload" : "save-outline"} 
                  size={20} 
                  color={saving ? "#9ca3af" : "#fff"} 
                />
                <Text style={styles.menuItemText}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMetadataModalVisible(true);
                  setEllipsisMenuVisible(false);
                }}
              >
                <Ionicons name="information-circle-outline" size={20} color="#fff" />
                <Text style={styles.menuItemText}>Note Information</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Collaborators List Modal */}
        <Modal
          visible={showCollaborators}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCollaborators(false)}
        >
          <TouchableOpacity 
            style={styles.bottomSheetOverlay}
            activeOpacity={1}
            onPress={() => setShowCollaborators(false)}
          >
            <View style={styles.bottomSheet}>
              <View style={styles.bottomSheetHandle} />
              
              <Text style={styles.bottomSheetTitle}>Active Collaborators</Text>
              
              {collaborative.activeUsers.map((user, index) => (
                <View key={user.uid} style={styles.collaboratorItem}>
                  <View
                    style={[
                      styles.collaboratorAvatar, 
                      { backgroundColor: user.color }
                    ]} 
                  />
                  <Text style={styles.collaboratorName}>{user.name}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Metadata Modal */}
        <Modal
          visible={metadataModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMetadataModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.metadataModal}>
              <View style={styles.metadataHeader}>
                <Text style={styles.metadataTitle}>Note Information</Text>
                <TouchableOpacity onPress={() => setMetadataModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#1f2937" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.metadataContent}>
                {note && (
                  <>
                    <View style={styles.metadataItem}>
                      <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                      <View style={styles.metadataTextContainer}>
                        <Text style={styles.metadataLabel}>Created</Text>
                        <Text style={styles.metadataValue}>
                          {note.createdAt.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                    
                    {note.updatedAt.getTime() !== note.createdAt.getTime() && (
                      <View style={styles.metadataItem}>
                        <Ionicons name="time-outline" size={20} color="#6b7280" />
                        <View style={styles.metadataTextContainer}>
                          <Text style={styles.metadataLabel}>Last Updated</Text>
                          <Text style={styles.metadataValue}>
                            {note.updatedAt.toLocaleString()}
                          </Text>
                        </View>
                      </View>
                    )}
                    
                    <View style={styles.metadataItem}>
                      <Ionicons name="document-text-outline" size={20} color="#6b7280" />
                      <View style={styles.metadataTextContainer}>
                        <Text style={styles.metadataLabel}>Statistics</Text>
                        <Text style={styles.metadataValue}>
                          {content.replace(/<[^>]*>/g, '').length} characters • {content.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(word => word.length > 0).length} words
                        </Text>
                      </View>
                    </View>
                    
                    {collaborative.chunkCount > 0 && (
                      <View style={styles.metadataItem}>
                        <Ionicons name="cube-outline" size={20} color="#6b7280" />
                        <View style={styles.metadataTextContainer}>
                          <Text style={styles.metadataLabel}>Storage</Text>
                          <Text style={styles.metadataValue}>
                            {collaborative.chunkCount} chunks • Active: {collaborative.activeChunkId || 'N/A'}
                          </Text>
                        </View>
                      </View>
                    )}
                    
                    {collaborative.isConnected && (
                      <View style={styles.metadataItem}>
                        <Ionicons name="cloud-done-outline" size={20} color="#10b981" />
                        <View style={styles.metadataTextContainer}>
                          <Text style={styles.metadataLabel}>Collaboration</Text>
                          <Text style={[styles.metadataValue, { color: '#10b981' }]}>
                            Connected - Real-time collaboration active
                          </Text>
                        </View>
                      </View>
                    )}
                  </>
                )}
              </View>
            </View>
          </View>
        </Modal>

        {!effectiveIsSharedAccess && (
          <PropertiesModal
            visible={propertiesModalVisible}
            onClose={() => setPropertiesModalVisible(false)}
            properties={properties}
            onUpdateProperties={handlePropertiesUpdate}
          />
        )}

        {!effectiveIsSharedAccess && (
          <OCRModal
            isVisible={ocrModalVisible}
            onClose={() => setOcrModalVisible(false)}
            onInsertText={handleOCRTextInsert}
          />
        )}

        {!effectiveIsSharedAccess && note && (
          <SharingModal
            visible={visible}
            onClose={() => setVisible(false)}
            noteId={routeNoteId as string}
            noteTitle={note?.title || 'Untitled Note'}
            userUid={uid!}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  lottieAnimation: {
    width: 200,
    height: 200,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    textAlign: 'center',
  },
  loadingSubtext: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  iconButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  titleInput: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
    minHeight: 60,
  },
  propertiesSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  propertyRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  propertyKey: {
    flex: 0.4,
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  propertyValue: {
    flex: 0.6,
    color: '#ffffff',
    fontSize: 14,
  },
  addPropertyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  addPropertyText: {
    color: '#6b7280',
    fontSize: 14,
    marginLeft: 6,
  },
  editorWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    minHeight: 400,
  },
  richEditor: {
    flex: 1,
    minHeight: 300,
  },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    paddingHorizontal: 20,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#4b5563',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemText: {
    color: '#ffffff',
    fontSize: 16,
    marginLeft: 16,
  },
  collaboratorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  collaboratorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  collaboratorName: {
    color: '#ffffff',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metadataModal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: width * 0.9,
    maxWidth: 400,
    maxHeight: '80%',
  },
  metadataHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  metadataTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  metadataContent: {
    padding: 20,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  metadataTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  metadataLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  metadataValue: {
    fontSize: 14,
    color: '#1f2937',
  },
})