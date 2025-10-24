// app/screens/Notes/shared-note-viewer.tsx
import { useAuth } from '@/app/contexts/AuthContext';
import { Note } from '@/app/types/notebook';
import RichTextEditor, { RichTextEditorRef } from '@/components/Interface/rich-text-editor';
import { db } from '@/firebase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function SharedNoteViewer() {
  const { noteId } = useLocalSearchParams();
  const { user } = useAuth();
  const [note, setNote] = useState<Note | null>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metadataModalVisible, setMetadataModalVisible] = useState(false);
  const richEditorRef = useRef<RichTextEditorRef>(null);

  useEffect(() => {
    if (noteId && typeof noteId === 'string') {
      fetchPublicNote(noteId);
    } else {
      setError('Invalid note ID');
      setLoading(false);
    }
  }, [noteId]);

  const fetchPublicNote = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const docRef = doc(db, "notes", id);
      const snap = await getDoc(docRef);
      
      if (!snap.exists()) {
        throw new Error("Note not found");
      }

      const data = snap.data();
      
      // Check if note is public
      if (!data.isPublic) {
        throw new Error("This note is not publicly accessible");
      }
      
      const noteData = {
        id: snap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Note;
      
      setNote(noteData);
      
      // Load content from chunks
      await loadNoteContent(id);
      
    } catch (error: any) {
      console.error("Error fetching public note:", error);
      setError(error.message || "Failed to load note");
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

  const handleBack = () => {
    router.back();
  };

  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  if (loading) {
    return (
      <LinearGradient colors={["#324762", "#0A1C3C"]} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#60a5fa" />
            <Text style={styles.loadingText}>Loading note...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (error || !note) {
    return (
      <LinearGradient colors={["#324762", "#0A1C3C"]} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={64} color="#ef4444" />
            <Text style={styles.errorTitle}>Unable to Access Note</Text>
            <Text style={styles.errorText}>{error || 'Note not found'}</Text>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={handleBack}
            >
              <Text style={styles.buttonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
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
            <Text style={styles.headerTitle}>Public Note</Text>
            <View style={styles.viewOnlyBadge}>
              <Ionicons name="eye" size={12} color="#60a5fa" />
              <Text style={styles.viewOnlyText}>View Only</Text>
            </View>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setMetadataModalVisible(true)}
            >
              <Ionicons name="information-circle-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Note Content */}
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Note Info Section */}
          <View style={styles.noteInfoCard}>
            <View style={styles.noteHeader}>
              <View style={styles.noteIcon}>
                <Ionicons name="document-text" size={32} color="#60a5fa" />
              </View>
              <Text style={styles.noteTitle}>{note.title || 'Untitled Note'}</Text>
            </View>

            <View style={styles.noteMetadata}>
              <View style={styles.metadataRow}>
                <Ionicons name="person-outline" size={16} color="#9ca3af" />
                <Text style={styles.metadataText}>
                  {user && note.uid === user.uid ? 'Your note' : 'Public note'}
                </Text>
              </View>
              
              <View style={styles.metadataRow}>
                <Ionicons name="calendar-outline" size={16} color="#9ca3af" />
                <Text style={styles.metadataText}>
                  {note.createdAt.toLocaleDateString()}
                </Text>
              </View>
              
              {note.updatedAt && note.updatedAt.getTime() !== note.createdAt.getTime() && (
                <View style={styles.metadataRow}>
                  <Ionicons name="time-outline" size={16} color="#9ca3af" />
                  <Text style={styles.metadataText}>
                    Updated {note.updatedAt.toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Properties Display */}
          {note.properties && note.properties.length > 0 && (
            <View style={styles.propertiesSection}>
              <Text style={styles.sectionLabel}>Properties</Text>
              <View style={styles.propertiesContainer}>
                {note.properties.map((property, index) => (
                  <View key={index} style={styles.propertyChip}>
                    <Text style={styles.propertyKey}>{property.key}:</Text>
                    <Text style={styles.propertyValue}>{property.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Rich Text Content */}
          <View style={styles.contentSection}>
            <Text style={styles.sectionLabel}>Content</Text>
            <View style={styles.richEditorContainer}>
              <RichTextEditor
                ref={richEditorRef}
                initialContent={content}
                onContentChange={() => {}} // Read-only
                editable={false}
                placeholder="No content available..."
                style={styles.richEditor}
              />
            </View>
          </View>

          {/* Footer Info */}
          <View style={styles.footer}>
            <View style={styles.footerItem}>
              <Ionicons name="document-text-outline" size={16} color="#9ca3af" />
              <Text style={styles.footerText}>
                {stripHtml(content).length} characters
              </Text>
            </View>
            <View style={styles.footerSeparator} />
            <View style={styles.footerItem}>
              <Ionicons name="reader-outline" size={16} color="#9ca3af" />
              <Text style={styles.footerText}>
                {getWordCount(stripHtml(content))} words
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Metadata Modal */}
        <Modal
          visible={metadataModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMetadataModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.metadataModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Note Information</Text>
                <TouchableOpacity onPress={() => setMetadataModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#1f2937" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalContent}>
                <View style={styles.modalItem}>
                  <Ionicons name="document-text-outline" size={20} color="#6b7280" />
                  <View style={styles.modalTextContainer}>
                    <Text style={styles.modalLabel}>Title</Text>
                    <Text style={styles.modalValue}>
                      {note.title || 'Untitled Note'}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalItem}>
                  <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                  <View style={styles.modalTextContainer}>
                    <Text style={styles.modalLabel}>Created</Text>
                    <Text style={styles.modalValue}>
                      {note.createdAt.toLocaleString()}
                    </Text>
                  </View>
                </View>
                
                {note.updatedAt.getTime() !== note.createdAt.getTime() && (
                  <View style={styles.modalItem}>
                    <Ionicons name="time-outline" size={20} color="#6b7280" />
                    <View style={styles.modalTextContainer}>
                      <Text style={styles.modalLabel}>Last Updated</Text>
                      <Text style={styles.modalValue}>
                        {note.updatedAt.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                )}
                
                <View style={styles.modalItem}>
                  <Ionicons name="stats-chart-outline" size={20} color="#6b7280" />
                  <View style={styles.modalTextContainer}>
                    <Text style={styles.modalLabel}>Statistics</Text>
                    <Text style={styles.modalValue}>
                      {stripHtml(content).length} characters • {getWordCount(stripHtml(content))} words
                    </Text>
                  </View>
                </View>
                
                {note.chunkCount && note.chunkCount > 0 && (
                  <View style={styles.modalItem}>
                    <Ionicons name="cube-outline" size={20} color="#6b7280" />
                    <View style={styles.modalTextContainer}>
                      <Text style={styles.modalLabel}>Storage</Text>
                      <Text style={styles.modalValue}>
                        {note.chunkCount} chunk{note.chunkCount !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.modalItem}>
                  <Ionicons name="eye-outline" size={20} color="#6b7280" />
                  <View style={styles.modalTextContainer}>
                    <Text style={styles.modalLabel}>Visibility</Text>
                    <Text style={[styles.modalValue, { color: '#10b981' }]}>
                      Public Note
                    </Text>
                  </View>
                </View>

                {note.properties && note.properties.length > 0 && (
                  <View style={styles.modalItem}>
                    <Ionicons name="pricetag-outline" size={20} color="#6b7280" />
                    <View style={styles.modalTextContainer}>
                      <Text style={styles.modalLabel}>Properties</Text>
                      <Text style={styles.modalValue}>
                        {note.properties.length} custom propert{note.properties.length !== 1 ? 'ies' : 'y'}
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
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
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  viewOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  viewOnlyText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  headerActions: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  noteInfoCard: {
    margin: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  noteHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  noteIcon: {
    marginBottom: 12,
  },
  noteTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  noteMetadata: {
    gap: 8,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadataText: {
    color: '#d1d5db',
    fontSize: 14,
    marginLeft: 8,
  },
  propertiesSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionLabel: {
    color: '#60a5fa',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  propertiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  propertyChip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  propertyKey: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  propertyValue: {
    color: '#93c5fd',
    fontSize: 12,
  },
  contentSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  richEditorContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 300,
    overflow: 'hidden',
  },
  richEditor: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerSeparator: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 16,
  },
  footerText: {
    color: '#9ca3af',
    fontSize: 12,
    marginLeft: 6,
  },
  primaryButton: {
    backgroundColor: '#60a5fa',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalContent: {
    padding: 20,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 14,
    color: '#1f2937',
  },
});