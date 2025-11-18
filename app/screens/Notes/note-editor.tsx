// app/screens/Notes/note-editor.tsx (COMPLETE - ScrollView Fixed)
import { Note, NotebookProperty } from "@/app/types/notebook";
import NoteSidebar from "@/components/Interface/note-sidebar";
import RichTextEditor, { RichTextEditorRef } from '@/components/Interface/rich-text-editor';
import RichTextToolbar from "@/components/Interface/rich-text-toolbar";
import SharingModal from "@/components/Interface/sharing-modal";
import { createThemedStyles } from "@/constants/themedStyles";
import { db } from "@/firebase";
import { useCollaborativeEditing } from '@/hooks/CollaborativeEditing';
import { useBacklogLogger } from "@/hooks/useBackLogLogger";
import { useTheme } from "@/hooks/useTheme";
import { BACKLOG_EVENTS } from "@/services/backlogEvents";
import { getNotesInNotebook, updateNote } from '@/services/notes-service';
import PDFService from '@/services/pdf-service';
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  doc,
  getDoc
} from "firebase/firestore";
import LottieView from 'lottie-react-native';
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  NativeSyntheticEvent,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TextInputSelectionChangeEventData,
  TouchableOpacity,
  View,
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

  const { colors, themeMode, toggleTheme, isLoading } = useTheme();
  const styles = createThemedStyles(colors, themeMode);
  
  const [pdfExportModalVisible, setPdfExportModalVisible] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    includeProperties: true,
    includeMetadata: true,
  });

  const handleExportPDF = async () => {
    if (!note) {
      Alert.alert('Error', 'No note to export');
      return;
    }

    setEllipsisMenuVisible(false);
    setPdfExportModalVisible(true);
  };

  const confirmExportPDF = async () => {
    setPdfExportModalVisible(false);
    
    if (!note) return;
    
    try {
      Alert.alert('Exporting...', 'Generating PDF file');
      
      const filePath = await PDFService.exportNoteToPDF(
        note,
        content,
        {
          includeProperties: exportOptions.includeProperties,
          includeMetadata: exportOptions.includeMetadata,
          fileName: `${note.title || 'note'}.pdf`
        }
      );
      
      if (filePath) {
        Alert.alert(
          'Success',
          'PDF exported successfully!',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export PDF');
    }
  };

  const handleImportPDF = async () => {
    setEllipsisMenuVisible(false);
    
    try {
      const result = await PDFService.importPDFAsNote();
      
      if (result) {
        Alert.alert(
          'PDF Imported',
          `Successfully extracted text from "${result.title}"\n\n${result.metadata?.pages ? `Pages: ${result.metadata.pages}\n` : ''}Characters: ${result.metadata?.characterCount || 0}`,
          [
            {
              text: 'Cancel',
              style: 'cancel'
            },
            {
              text: 'Replace Current Note',
              style: 'destructive',
              onPress: () => {
                collaborative.handleTitleChange(result.title);
                collaborative.handleContentChange(result.content);
                setHasUnsavedChanges(true);                   
              }
            },
            {
              text: 'Append to Note',
              onPress: () => {
                const newContent = content + '<p><br></p>' + result.content;
                collaborative.handleContentChange(newContent);
                setHasUnsavedChanges(true);
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Import error:', error);
    }
  };
  
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
  
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [notebookNotes, setNotebookNotes] = useState<Note[]>([]);
  const [notebookTitle, setNotebookTitle] = useState('');

  // Add these state variables after your existing useState declarations:
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const headerHeight = useRef(new Animated.Value(1)).current; // 1 = expanded, 0 = collapsed

  const gradientColors = themeMode === 'dark' 
    ? ["#324762", "#324762"] 
    : ["#ffffff", "#f8fafc"];
    
  const richEditorRef = useRef<RichTextEditorRef>(null);

  const toggleHeader = () => {
    const toValue = headerCollapsed ? 1 : 0;
    
    Animated.timing(headerHeight, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    
    setHeaderCollapsed(!headerCollapsed);
  };
  
  const isUserTyping = useCallback(() => {
    return richEditorRef.current?.isTyping() || false;
  }, []);
  
  const handlePropertiesUpdate = (updatedProperties: NotebookProperty[]) => {
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

  const fetchNotebookNotes = useCallback(async () => {
    if (!notebookId || !uid) return;
    
    try {
      const notes = await getNotesInNotebook(notebookId as string, uid);
      setNotebookNotes(notes as any);
    } catch (error) {
      console.error("Error fetching notebook notes:", error);
    }
  }, [notebookId, uid]);

  const fetchNotebookTitle = useCallback(async () => {
    if (!notebookId) return;
    
    try {
      const docRef = doc(db, "notebooks", notebookId as string);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setNotebookTitle(snap.data().title || 'Untitled Notebook');
      }
    } catch (error) {
      console.error("Error fetching notebook title:", error);
    }
  }, [notebookId]);

  useFocusEffect(
    useCallback(() => {
      if (notebookId && uid) {
        fetchNotebookNotes();
      }
    }, [notebookId, uid, fetchNotebookNotes])
  );

  useEffect(() => {
    if (routeNoteId && uid) {
      fetchNote(routeNoteId as string);
    }
  }, [routeNoteId, uid]);

  useEffect(() => {
    if (notebookId) {
      fetchNotebookTitle();
      fetchNotebookNotes();
    }
  }, [notebookId, fetchNotebookTitle, fetchNotebookNotes]);

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

  const handleNoteSelect = useCallback((noteId: string) => {
    setSidebarVisible(false);
    
    setTimeout(() => {
      if (hasUnsavedChanges) {
        saveNote(false);
      }
      
      router.replace({
        pathname: "./note-editor",
        params: { noteId, notebookId },
      });
    }, 300);
  }, [hasUnsavedChanges, notebookId]);

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
            {loading ? 'Loading note...' : 'Syncing content...'}
          </Text>
          {collaborative.chunkCount > 0 && (
            <Text style={styles.loadingSubtext}>
              Loading {collaborative.chunkCount} chunk{collaborative.chunkCount !== 1 ? 's' : ''}
            </Text>
          )}
          {!loading && !collaborative.contentReady && (
            <Text style={[styles.loadingSubtext, { marginTop: 8 }]}>
              First-time initialization may take a moment...
            </Text>
          )}
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={gradientColors as any} style={styles.container}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={() => setSidebarVisible(true)}
          >
            <Ionicons name="menu" size={22} color={colors.text} />
          </TouchableOpacity>
          
          <View style={styles.headerRight}>
            {/* NEW: Collapse/Expand Button */}
            <TouchableOpacity
              style={styles.iconButton}
              onPress={toggleHeader}
            >
              <Ionicons 
                name={headerCollapsed ? "chevron-down" : "chevron-up"} 
                size={22} 
                color={colors.text} 
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={toggleTheme}
            >
              <Ionicons 
                name={themeMode === 'dark' ? 'sunny' : 'moon'} 
                size={22} 
                color={colors.text} 
              />
            </TouchableOpacity>

            {!effectiveIsSharedAccess && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setOcrModalVisible(true)}
              >
                <Ionicons name="scan-outline" size={22} color={colors.text} />
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
                <Ionicons name="share-social-outline" size={22} color={colors.text} />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setEllipsisMenuVisible(true)}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView 
  style={styles.content} 
  behavior={Platform.OS === "ios" ? "padding" : "height"}
  keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
>
  {/* Animated Collapsible Header */}
  <Animated.View
    style={[
      styles.headerContainer,
      {
        maxHeight: headerHeight.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 500],
        }),
        opacity: headerHeight.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, 0.5, 1],
        }),
        overflow: 'hidden',
      }
    ]}
  >
    <ScrollView
      showsVerticalScrollIndicator={false}
      bounces={false}
      scrollEnabled={!headerCollapsed}
    >
      <TextInput
        ref={collaborative.titleInputRef}
        style={styles.titleInput}
        value={title}
        onChangeText={(text) => handleTitleChange(text)}
        onSelectionChange={handleTitleSelectionChange}
        editable={!(effectiveIsSharedAccess && effectiveSharedPermission === "view") && !headerCollapsed}
        placeholder="Untitled"
        placeholderTextColor="#6b7280"
        multiline
        textAlignVertical="top"
        autoCapitalize="sentences"
        autoCorrect={true}
        spellCheck={true}
      />

      {properties.length > 0 && (
        <View style={styles.propertiesSection}>
          {properties.map((property, index) => (
            <TouchableOpacity
              key={index}
              style={styles.propertyRow}
              onPress={() => !effectiveIsSharedAccess && setPropertiesModalVisible(true)}
              activeOpacity={0.7}
              disabled={effectiveIsSharedAccess || headerCollapsed}
            >
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
              disabled={headerCollapsed}
            >
              <Ionicons name="add" size={16} color="#6b7280" />
              <Text style={styles.addPropertyText}>Add property</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {properties.length === 0 && !effectiveIsSharedAccess && (
        <View style={styles.propertiesSection}>
          <TouchableOpacity
            style={styles.addPropertyButton}
            onPress={() => setPropertiesModalVisible(true)}
            activeOpacity={0.7}
            disabled={headerCollapsed}
          >
            <Ionicons name="add" size={16} color="#6b7280" />
            <Text style={styles.addPropertyText}>Add property</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  </Animated.View>

  {/* Editor - takes remaining space and scrolls above toolbar */}
  <View style={{ flex: 1, paddingHorizontal: 20, }}>
    <RichTextEditor
      key={`editor-${themeMode}`}
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

  {/* Toolbar pinned to bottom, above keyboard */}
  {!(effectiveIsSharedAccess && effectiveSharedPermission === "view") && (
    <View style={{ paddingBottom: Platform.OS === 'ios' ? 0 : 8 }}>
      <RichTextToolbar
        key={`toolbar-${themeMode}`}
        getEditor={() => richEditorRef.current?.getEditor()}
        onMetadataPress={() => setMetadataModalVisible(true)}
        noteId={routeNoteId as string}
        userId={uid!}
        onUndo={collaborative.undo}
        onRedo={collaborative.redo}
        canUndo={collaborative.canUndo}
        canRedo={collaborative.canRedo}     
        style={styles.toolbar}         
      />
    </View>
  )}
</KeyboardAvoidingView>

        <NoteSidebar
          visible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
          notes={notebookNotes as any}
          currentNoteId={routeNoteId as string}
          notebookId={notebookId as string}
          notebookTitle={notebookTitle}
          onNoteSelect={handleNoteSelect}
        />

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
                  color={saving ? "#9ca3af" : colors.text} 
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
                <Ionicons name="information-circle-outline" size={20} color={colors.text} />
                <Text style={styles.menuItemText}>Note Information</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleExportPDF}
              >
                <Ionicons name="download-outline" size={20} color={colors.text} />
                <Text style={styles.menuItemText}>Export as PDF</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

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

        <Modal
          visible={pdfExportModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPdfExportModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.metadataModal}>
              <View style={styles.metadataHeader}>
                <Text style={styles.metadataTitle}>Export Options</Text>
                <TouchableOpacity onPress={() => setPdfExportModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#1f2937" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.exportOptionsContent}>
                <TouchableOpacity
                  style={styles.exportOption}
                  onPress={() => setExportOptions(prev => ({ 
                    ...prev, 
                    includeProperties: !prev.includeProperties 
                  }))}
                >
                  <Ionicons 
                    name={exportOptions.includeProperties ? "checkbox" : "square-outline"} 
                    size={24} 
                    color="#3b82f6" 
                  />
                  <View style={styles.exportOptionText}>
                    <Text style={styles.exportOptionTitle}>Include Properties</Text>
                    <Text style={styles.exportOptionDescription}>
                      Export note properties like tags and custom fields
                    </Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.exportOption}
                  onPress={() => setExportOptions(prev => ({ 
                    ...prev, 
                    includeMetadata: !prev.includeMetadata 
                  }))}
                >
                  <Ionicons 
                    name={exportOptions.includeMetadata ? "checkbox" : "square-outline"} 
                    size={24} 
                    color="#3b82f6" 
                  />
                  <View style={styles.exportOptionText}>
                    <Text style={styles.exportOptionTitle}>Include Metadata</Text>
                    <Text style={styles.exportOptionDescription}>
                      Export creation date, last modified, and statistics
                    </Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.exportButton}
                  onPress={confirmExportPDF}
                >
                  <Ionicons name="download" size={20} color="#ffffff" />
                  <Text style={styles.exportButtonText}>Export PDF</Text>
                </TouchableOpacity>
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

