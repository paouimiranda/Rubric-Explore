// app/screens/Notes/note-editor.tsx 
import { Note, NotebookProperty } from "@/app/types/notebook";
import RichTextEditor, { RichTextEditorRef } from '@/components/Interface/rich-text-editor';
import RichTextToolbar from "@/components/Interface/rich-text-toolbar";
import SharingModal from "@/components/Interface/sharing-modal";
import { db } from "@/firebase";
import { useCollaborativeEditing } from '@/hooks/CollaborativeEditing';
import { updateNote } from '@/services/notes-service';
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import {
  doc,
  getDoc
} from "firebase/firestore";
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

  if (!uid) {
    return (
      <LinearGradient colors={["#324762", "#0A1C3C"]} style={styles.loadingContainer}>
        <SafeAreaView style={styles.loadingContent}>
          <Text style={styles.loadingText}>Please log in to edit notes</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const { noteId: routeNoteId, notebookId } = useLocalSearchParams();
  const [note, setNote] = useState<Note | null>(null);
  const effectiveNote = isSharedAccess ? sharedNote : note;
  const isTyping = useRef(false);
  
  const [properties, setProperties] = useState<NotebookProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [visible, setVisible] = useState(false);

  const [ocrModalVisible, setOcrModalVisible] = useState(false);
  const [propertiesModalVisible, setPropertiesModalVisible] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [metadataModalVisible, setMetadataModalVisible] = useState(false);
  
  // Rich text editor ref
  const richEditorRef = useRef<RichTextEditorRef>(null);
  
  // Track if we're applying Y.js updates to prevent feedback loops
  const isApplyingYjsUpdate = useRef(false);
  
  const handlePropertiesUpdate = (updatedProperties: NotebookProperty[]) => {
    setProperties(updatedProperties);
    setHasUnsavedChanges(true);
  };

  // Initialize collaborative editing with the note ID
  const collaborative = useCollaborativeEditing(
    routeNoteId as string,
    user,
    note?.title || '',
  );

  // Use collaborative state instead of local state
  const title = collaborative.title;  
  const content = collaborative.content;

  // Sync Yjs content to rich text editor
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedContent = useRef('');

  useEffect(() => {
    // Only sync if content actually changed from remote
    if (content !== lastSyncedContent.current && richEditorRef.current && !isApplyingYjsUpdate.current) {
      // Clear any pending sync
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      
      // Debounce the sync to avoid rapid updates during typing
      syncTimeoutRef.current = setTimeout(() => {
        if (richEditorRef.current) {
          richEditorRef.current.setContentHtml(content);
          lastSyncedContent.current = content;
        }
      }, 150); // Small delay to batch updates
    }
    
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [content]);

  

  // Enhanced text change handlers that work with granular updates
  const handleTitleChange = useCallback((newTitle: string, event?: NativeSyntheticEvent<any>) => {
    if (isSharedAccess && sharedPermission === "view") return;
    if (isApplyingYjsUpdate.current) return;
    
    const selectionStart = event?.nativeEvent?.selection?.start;
    const selectionEnd = event?.nativeEvent?.selection?.end;
    
    // Use the granular change handler
    collaborative.handleTitleChange(newTitle, selectionStart, selectionEnd);
  }, [collaborative, isSharedAccess, sharedPermission]);

  const handleContentChange = useCallback((newContent: string) => {
    if (isSharedAccess && sharedPermission === "view") return;
    
    // Set typing flag
    isTyping.current = true;
    isApplyingYjsUpdate.current = true;
    
    // Use the granular change handler for HTML content
    collaborative.handleContentChange(newContent);
    
    // Reset flags after a brief delay
    setTimeout(() => {
      isApplyingYjsUpdate.current = false;
      isTyping.current = false;
    }, 100);
  }, [collaborative, isSharedAccess, sharedPermission]);

  // Enhanced cursor tracking
  const handleTitleSelectionChange = useCallback((event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    const { start } = event.nativeEvent.selection;
    collaborative.updateCursor('title', start);
  }, [collaborative]);

  const handleContentCursorPosition = useCallback((position: number) => {
    collaborative.updateCursor('content', position);
  }, [collaborative]);

  const renderCollaborativeIndicators = () => (
    <View style={styles.collaborativeIndicators}>
      {collaborative.isConnected && (
        <TouchableOpacity 
          style={styles.connectedIndicator}
          onPress={() => setShowCollaborators(!showCollaborators)}
        >
          <Ionicons name="people" size={16} color="#4ade80" />
          <Text style={styles.collaboratorCount}>
            {collaborative.activeUsers.length}
          </Text>
        </TouchableOpacity>
      )}
      
      {!collaborative.isConnected && (
        <View style={styles.disconnectedIndicator}>
          <Ionicons name="wifi" size={16} color="#ef4444" />
          <Text style={styles.offlineText}>Offline</Text>
        </View>
      )}
    </View>
  );

  const renderSharingStatus = () => {
    if (!isSharedAccess) return null;
    
    return (
      <View style={styles.sharingStatus}>
        <Ionicons 
          name={sharedPermission === 'edit' ? 'create' : 'eye'} 
          size={16} 
          color={sharedPermission === 'edit' ? '#22c55e' : '#60a5fa'} 
        />
        <Text style={styles.sharingStatusText}>
          Shared with {sharedPermission} access
        </Text>
      </View>
    );
  };

  // Auto-save functionality - only for properties now, Y.js handles content
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (routeNoteId && uid) {
      fetchNote(routeNoteId as string);
    }
  }, [routeNoteId, uid]);

  // Auto-save only for properties (Y.js handles title/content sync)
  useEffect(() => {
    if (note && properties !== note.properties) {
      setHasUnsavedChanges(true);
      
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Auto-save properties only
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

  const fetchNote = async (id: string) => {
    try {
      setLoading(true);
      const docRef = doc(db, "notes", id);
      const snap = await getDoc(docRef);
      
      if (snap.exists()) {
        const data = snap.data();
        
        // Check if migration needed
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
        
        // DON'T set title/content - collaborative hook handles it
        // The hook will load chunks automatically
        
      } else {
        Alert.alert("Error", "Note not found");
        router.back();
      }
    } catch (error) {
      console.error("Error fetching note:", error);
      Alert.alert("Error", "Failed to load note");
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
      (isSharedAccess && sharedPermission === 'edit');

    if (!hasEditPermission) {
      Alert.alert("Error", "You don't have permission to edit this note");
      return;
    }
    
    try {
      setSaving(true);
      
      // Only update properties and metadata
      // Y.js collaborative service handles title/content updates
      const metadataUpdates = {
        properties,
      };
      
      await updateNote(note.id, metadataUpdates, uid);
      
      setHasUnsavedChanges(false);
      if (showFeedback) {
        console.log("Note metadata saved successfully");
      }
    } catch (error) {
      console.error("Error saving note:", error);
      if (showFeedback) {
        Alert.alert("Error", "Failed to save note");
      }
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

  // Enhanced OCR text insertion
  const handleOCRTextInsert = useCallback((text: string) => {
    if (isSharedAccess && sharedPermission === "view") return;
    
    const newContent = content + (content ? '\n\n' : '') + text;
    collaborative.handleContentChange(newContent);
    setHasUnsavedChanges(true);
  }, [collaborative, content, isSharedAccess, sharedPermission]);

  if (loading) {
    return (
      <LinearGradient colors={["#324762", "#0A1C3C"]} style={styles.loadingContainer}>
        <SafeAreaView style={styles.loadingContent}>
          <Ionicons name="document-text-outline" size={64} color="#4b5563" />
          <Text style={styles.loadingText}>Loading note...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#324762", "#0A1C3C"]} style={styles.container}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Edit Note</Text>
            {renderCollaborativeIndicators()}
            {hasUnsavedChanges && (
              <Text style={styles.unsavedIndicator}>● Unsaved changes</Text>
            )}
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setOcrModalVisible(true)}
            >
              <Ionicons name="scan-outline" size={24} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setPropertiesModalVisible(true)}
            >
              <Ionicons name="pricetag-outline" size={24} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.headerButton, saving && styles.headerButtonDisabled]}
              onPress={() => saveNote(true)}
              disabled={saving}
            >
              {saving ? (
                <Ionicons name="reload" size={24} color="#9ca3af" />
              ) : (
                <Ionicons name="save-outline" size={24} color="#fff" />
              )}
            </TouchableOpacity>
              
            <TouchableOpacity
              style={[styles.headerButton]}
              onPress={() => {
                if (note) {
                  setVisible(true);
                } else {
                  Alert.alert('Error', 'Please save the note first before sharing');
                }
              }}
            >
              <Ionicons name="share-social-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Render Status */}
        {renderSharingStatus()}

        {/* Collaborators List */}
        {showCollaborators && collaborative.activeUsers.length > 0 && (
          <View style={styles.collaboratorsList}>
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
        )}

        <KeyboardAvoidingView 
          style={styles.content} 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Properties Display */}
          {properties.length > 0 && (
            <View style={styles.propertiesDisplay}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {properties.map((property, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.propertyChip}
                    onPress={() => setPropertiesModalVisible(true)}
                  >
                    <Text style={styles.propertyText}>
                      {property.key}: {property.value}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Editor Container */}
          <View style={styles.editorContainer}>
            {/* Title Input */}
            <TextInput
              ref={collaborative.titleInputRef}
              style={styles.titleInput}
              value={title}
              onChangeText={(text) => handleTitleChange(text)}
              onSelectionChange={handleTitleSelectionChange}
              editable={!(isSharedAccess && sharedPermission === "view")}
              placeholder="Note title..."
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
              autoCapitalize="sentences"
              autoCorrect={true}
              spellCheck={true}
            />

            {/* Rich Text Content Editor */}
          <RichTextEditor
            ref={richEditorRef}
            initialContent={content}
            onContentChange={handleContentChange}
            editable={!(isSharedAccess && sharedPermission === "view")}
            placeholder="Start writing your note..."
            onCursorPosition={handleContentCursorPosition}
            style={styles.richEditor}
            onEditorReady={(editor) => {
              // Editor is ready
              console.log('Rich text editor ready');
            }}
          />
          </View>
        </KeyboardAvoidingView>

        {/* Rich Text Toolbar */}
        <RichTextToolbar
          getEditor={() => richEditorRef.current?.getEditor()}
          onMetadataPress={() => setMetadataModalVisible(true)}
          noteId={routeNoteId as string}
          userId={uid!}
        />

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
                          {content.length} characters • {content.trim().split(/\s+/).filter(word => word.length > 0).length} words
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

        {/* Properties Modal */}
        <PropertiesModal
          visible={propertiesModalVisible}
          onClose={() => setPropertiesModalVisible(false)}
          properties={properties}
          onUpdateProperties={handlePropertiesUpdate}
        />

        {/* OCR Modal */}
        <OCRModal
          isVisible={ocrModalVisible}
          onClose={() => setOcrModalVisible(false)}
          onInsertText={handleOCRTextInsert}
        />

        {/* Sharing Modal */}
        <SharingModal
          visible={visible}
          onClose={() => setVisible(false)}
          noteId={routeNoteId as string}
          noteTitle={note?.title || 'Untitled Note'}
          userUid={uid!}
        />
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
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  collaborativeIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  connectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  collaboratorCount: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  disconnectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offlineText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  unsavedIndicator: {
    color: '#fbbf24',
    fontSize: 12,
    marginTop: 2,
  },
  sharingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sharingStatusText: {
    color: '#60a5fa',
    fontSize: 14,
    marginLeft: 8,
  },
  collaboratorsList: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  collaboratorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  collaboratorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
  },
  collaboratorName: {
    color: '#ffffff',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  propertiesDisplay: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  propertyChip: {
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  propertyText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '500',
  },
  editorContainer: {
    flex: 1,
    padding: 16,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    minHeight: 40,
  },
  richEditor: {
    flex: 1,
    minHeight: 200,
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
});