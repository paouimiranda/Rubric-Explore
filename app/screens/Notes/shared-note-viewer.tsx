// app/screens/Notes/shared-note-viewer.tsx
import { useAuth } from '@/app/contexts/AuthContext';
import { Note } from '@/app/types/notebook';
import RichTextEditor, { RichTextEditorRef } from '@/components/Interface/rich-text-editor';
import { createThemedStyles } from "@/constants/themedStyles";
import { db } from '@/firebase';
import { useBacklogLogger } from "@/hooks/useBackLogLogger";
import { useTheme } from "@/hooks/useTheme";
import PDFService from '@/services/pdf-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function SharedNoteViewer() {
  const { noteId, permission, isSharedAccess } = useLocalSearchParams();
  const { user } = useAuth();
  const { colors, themeMode, toggleTheme, isLoading } = useTheme();
  const styles = createThemedStyles(colors, themeMode);
  
  const [note, setNote] = useState<Note | null>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metadataModalVisible, setMetadataModalVisible] = useState(false);
  const [ellipsisMenuVisible, setEllipsisMenuVisible] = useState(false);
  const [pdfExportModalVisible, setPdfExportModalVisible] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    includeProperties: true,
    includeMetadata: true,
  });
  
  const richEditorRef = useRef<RichTextEditorRef>(null);
  const { addBacklogEvent } = useBacklogLogger();

  // Collapsible header state
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const headerHeight = useRef(new Animated.Value(1)).current;

  const gradientColors = themeMode === 'dark' 
    ? ["#324762", "#324762"] 
    : ["#ffffff", "#f8fafc"];

  useEffect(() => {
    if (noteId && typeof noteId === 'string') {
      addBacklogEvent("shared_note_viewer_opened", { noteId, isSharedAccess });
      fetchSharedNote(noteId);
    } else {
      setError('Invalid note ID');
      setLoading(false);
    }
  }, [noteId]);

  const fetchSharedNote = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const docRef = doc(db, "notes", id);
      const snap = await getDoc(docRef);
      
      if (!snap.exists()) {
        throw new Error("Note not found");
      }

      const data = snap.data();
      
      const noteData = {
        id: snap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Note;
      
      setNote(noteData);
      await loadNoteContent(id);
      addBacklogEvent("shared_note_viewed", { noteId: id, isSharedAccess });
    } catch (error: any) {
      console.error("Error fetching shared note:", error);
      setError(error.message || "Failed to load note");
      addBacklogEvent("shared_note_viewer_error", { noteId: id, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const loadNoteContent = async (noteId: string) => {
    try {
      const { getMergedNoteContent } = await import('@/services/notes-service');
      const noteContent = await getMergedNoteContent(noteId);
      setContent(noteContent || '<p>This note is empty.</p>');
    } catch (error) {
      console.error('Error loading note content:', error);
      setContent('<p>Unable to load content</p>');
    }
  };

  const toggleHeader = () => {
    const toValue = headerCollapsed ? 1 : 0;
    
    Animated.timing(headerHeight, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    
    setHeaderCollapsed(!headerCollapsed);
  };

  const handleBack = () => {
    router.back();
  };

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

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <LinearGradient colors={["#324762", "#0A1C3C"]} style={styles.loadingContainer}>
        <SafeAreaView style={styles.loadingContent}>
          <LottieView
            source={require('@/assets/animations/quiz-loading.json')}
            autoPlay
            loop
            style={styles.lottieAnimation}
          />
          <Text style={styles.loadingText}>Loading note...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (error || !note) {
    return (
      <LinearGradient colors={["#324762", "#0A1C3C"]} style={styles.loadingContainer}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContent}>
            <Ionicons name="alert-circle" size={64} color="#ef4444" />
            <Text style={[styles.loadingText, { fontSize: 20, fontWeight: 'bold', marginTop: 16 }]}>
              Unable to Access Note
            </Text>
            <Text style={[styles.loadingText, { marginTop: 8, marginBottom: 24 }]}>
              {error || 'Note not found'}
            </Text>
            <TouchableOpacity 
              style={[styles.iconButton, { backgroundColor: '#60a5fa', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12 }]}
              onPress={handleBack}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={gradientColors as any} style={styles.container}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          
          <View style={styles.headerRight}>
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
              onPress={() => setEllipsisMenuVisible(true)}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
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
                style={styles.titleInput}
                value={note.title || 'Untitled Note'}
                editable={false}
                multiline
                textAlignVertical="top"
              />
              
              {permission && (
                <View style={[styles.iconButton, { 
                  backgroundColor: 'rgba(96, 165, 250, 0.2)', 
                  flexDirection: 'row',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 12,
                  alignSelf: 'flex-start',
                  marginTop: 8,
                  marginBottom: 8
                }]}>
                  <Ionicons name="eye" size={14} color="#60a5fa" />
                  <Text style={{ color: '#60a5fa', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>
                    View Only
                  </Text>
                </View>
              )}

              {note.properties && note.properties.length > 0 && (
                <View style={styles.propertiesSection}>
                  {note.properties.map((property, index) => (
                    <View
                      key={index}
                      style={styles.propertyRow}
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
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </Animated.View>

          {/* Editor */}
          <View style={{ flex: 1, paddingHorizontal: 20 }}>
            <RichTextEditor
              key={`editor-${themeMode}`}
              ref={richEditorRef}
              initialContent={content}
              onContentChange={() => {}}
              editable={false}
              placeholder="No content available..."
              style={styles.richEditor}
            />
          </View>
        </View>

        {/* Ellipsis Menu Modal */}
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
              
              <View style={styles.menuItem}>
                <Ionicons name="eye" size={20} color="#60a5fa" />
                <Text style={styles.menuItemText}>
                  Shared with view access
                </Text>
              </View>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  toggleTheme();
                  setEllipsisMenuVisible(false);
                }}
              >
                <Ionicons 
                  name={themeMode === 'dark' ? 'sunny' : 'moon'} 
                  size={20} 
                  color={colors.text} 
                />
                <Text style={styles.menuItemText}>
                  Switch to {themeMode === 'dark' ? 'Light' : 'Dark'} Mode
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
                
                {note.chunkCount && note.chunkCount > 0 && (
                  <View style={styles.metadataItem}>
                    <Ionicons name="cube-outline" size={20} color="#6b7280" />
                    <View style={styles.metadataTextContainer}>
                      <Text style={styles.metadataLabel}>Storage</Text>
                      <Text style={styles.metadataValue}>
                        {note.chunkCount} chunk{note.chunkCount !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.metadataItem}>
                  <Ionicons name="link-outline" size={20} color="#6b7280" />
                  <View style={styles.metadataTextContainer}>
                    <Text style={styles.metadataLabel}>Access</Text>
                    <Text style={[styles.metadataValue, { color: '#10b981' }]}>
                      Shared via join code
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* PDF Export Modal */}
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
      </SafeAreaView>
    </LinearGradient>
  );
}

const { width } = Dimensions.get('window');