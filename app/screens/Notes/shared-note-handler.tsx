// app/screens/Notes/shared-note-handler.tsx
import { useAuth } from '@/app/contexts/AuthContext';
import { Note } from '@/app/types/notebook';
import RichTextEditor, { RichTextEditorRef } from '@/components/Interface/rich-text-editor';
import { useBacklogLogger } from "@/hooks/useBackLogLogger";
import { ShareToken, sharingService } from '@/services/sharing-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface SharedNoteState {
  note: Note | null;
  permission: 'view' | 'edit' | null;
  shareToken: ShareToken | null;
  loading: boolean;
  error: string | null;
  migrationNeeded: boolean;
}

export default function SharedNoteHandler() {
  const { token } = useLocalSearchParams();
  const { user } = useAuth();
  const [state, setState] = useState<SharedNoteState>({
    note: null,
    permission: null,
    shareToken: null,
    loading: true,
    error: null,
    migrationNeeded: false,
  });
  const [previewContent, setPreviewContent] = useState<string>('');
  const richEditorRef = useRef<RichTextEditorRef>(null);
  const { addBacklogEvent } = useBacklogLogger();
  useEffect(() => {
    if (token && typeof token === 'string') {
      addBacklogEvent("shared_note_opened", { token });
      loadSharedNote(token);
    } else {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Invalid share link' 
      }));
    }
  }, [token, user]);

  const loadSharedNote = async (shareToken: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const result = await sharingService.useShareToken(shareToken, user?.uid);
      
      // Check if the note needs migration (has old content field)
      const migrationNeeded = result.note.chunkCount === 0 || 
        result.note.chunkCount === undefined;
      
      if (migrationNeeded) {
        console.log('Shared note needs migration to chunk-based structure');
      }

      // Load preview content from chunks
      try {
        const { getMergedNoteContent } = await import('@/services/notes-service');
        const content = await getMergedNoteContent(result.note.id);
        setPreviewContent(content || '<p>This note is empty.</p>');
      } catch (error) {
        console.error('Error loading preview content:', error);
        setPreviewContent('<p>Unable to load preview</p>');
      }
      
      setState({
        note: result.note,
        permission: result.permission,
        shareToken: result.shareToken,
        loading: false,
        error: null,
        migrationNeeded,
      });

    } catch (error: any) {
      console.error('Error loading shared note:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load shared note'
      }));
      addBacklogEvent("shared_note_load_error", { token: shareToken, error: error.message });
    }
  };

  const handleViewNote = () => {
    if (state.note && state.permission) {
      // For edit permission and migration needed, show warning
      if (state.permission === 'edit' && state.migrationNeeded && user) {
        Alert.alert(
          'Migration Required',
          'This note needs to be migrated to the new format for optimal collaborative editing. It will be migrated when you open it.',
          [
            { text: 'Continue', onPress: navigateToNote },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
        return;
      }
      
      navigateToNote();
    }
  };

  const navigateToNote = () => {
    // Navigate to the main note-editor with shared access params
    router.push({
      pathname: '../../screens/Notes/note-editor',
      params: {
        noteId: state.note!.id,
        isSharedAccess: 'true',
        sharedPermission: state.permission!,
      }
    });
    addBacklogEvent("shared_note_viewed", { noteId: state.note!.id, permission: state.permission });
  };

  const handleLoginToEdit = () => {
    router.push({
      pathname: '../../index',
      params: {
        returnUrl: `/shared/${token}`,
        message: 'Login to edit this shared note'
      }
    });
    addBacklogEvent("shared_note_login_to_edit", { token });
  };

  const renderError = () => (
    <View style={styles.messageContainer}>
      <Ionicons name="alert-circle" size={64} color="#ef4444" />
      <Text style={styles.errorTitle}>Unable to Access Note</Text>
      <Text style={styles.errorMessage}>{state.error}</Text>
      <TouchableOpacity 
        style={styles.primaryButton} 
        onPress={() => router.back()}
      >
        <Text style={styles.buttonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.messageContainer}>
      <ActivityIndicator size="large" color="#60a5fa" />
      <Text style={styles.loadingText}>Loading shared note...</Text>
    </View>
  );

  const renderNotePreview = () => {
    if (!state.note || !state.shareToken) return null;

    const isOwner = state.note.uid === user?.uid;
    const canEdit = state.permission === 'edit' && user;
    const needsLogin = state.permission === 'edit' && !user;

    // Strip HTML tags for character count
    const stripHtml = (html: string) => {
      return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    };

    return (
      <ScrollView style={styles.previewContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.previewHeader}>
          <View style={styles.noteIcon}>
            <Ionicons name="document-text" size={32} color="#60a5fa" />
          </View>
          <Text style={styles.noteTitle}>{state.note.title || 'Untitled Note'}</Text>
          
          {/* Permission indicator */}
          <View style={[
            styles.permissionBadge,
            state.permission === 'edit' ? styles.editBadge : styles.viewBadge
          ]}>
            <Ionicons 
              name={state.permission === 'edit' ? 'create' : 'eye'} 
              size={14} 
              color="#fff" 
            />
            <Text style={styles.permissionText}>
              {state.permission === 'edit' ? 'Can Edit' : 'View Only'}
            </Text>
          </View>

          {/* Collaboration status indicator */}
          {state.permission === 'edit' && (
            <View style={[
              styles.collabBadge,
              state.migrationNeeded ? styles.collabWarning : styles.collabReady
            ]}>
              <Ionicons 
                name={state.migrationNeeded ? "warning" : "people"} 
                size={12} 
                color="#fff" 
              />
              <Text style={styles.collabText}>
                {state.migrationNeeded ? 'Needs Migration' : 'Real-time Ready'}
              </Text>
            </View>
          )}
        </View>

        {/* Note info */}
        <View style={styles.noteInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={16} color="#9ca3af" />
            <Text style={styles.noteInfoText}>
              Shared by: {state.shareToken.createdBy === user?.uid ? 'You' : 'Someone'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={16} color="#9ca3af" />
            <Text style={styles.noteInfoText}>
              Created: {state.note.createdAt.toLocaleDateString()}
            </Text>
          </View>
          
          {state.note.updatedAt && state.note.updatedAt.getTime() !== state.note.createdAt.getTime() && (
            <View style={styles.infoRow}>
              <Ionicons name="time" size={16} color="#9ca3af" />
              <Text style={styles.noteInfoText}>
                Last updated: {state.note.updatedAt.toLocaleDateString()}
              </Text>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <Ionicons name="document-text" size={16} color="#9ca3af" />
            <Text style={styles.noteInfoText}>
              Length: {stripHtml(previewContent).length} characters
            </Text>
          </View>
          
          {/* Collaboration info */}
          {state.note.collaborators && Object.keys(state.note.collaborators).length > 0 && (
            <View style={styles.infoRow}>
              <Ionicons name="people" size={16} color="#9ca3af" />
              <Text style={styles.noteInfoText}>
                {Object.keys(state.note.collaborators).length} collaborator(s)
              </Text>
            </View>
          )}

          {/* Chunk info for debugging */}
          {state.note.chunkCount !== undefined && state.note.chunkCount > 0 && (
            <View style={styles.infoRow}>
              <Ionicons name="cube" size={16} color="#9ca3af" />
              <Text style={styles.noteInfoText}>
                Storage: {state.note.chunkCount} chunk(s)
              </Text>
            </View>
          )}
        </View>

        {/* Rich Text Preview */}
        <View style={styles.previewContent}>
          <Text style={styles.previewLabel}>Preview:</Text>
          <View style={styles.richPreviewContainer}>
            <RichTextEditor
              ref={richEditorRef}
              initialContent={previewContent}
              onContentChange={() => {}} // Read-only preview
              editable={false}
              placeholder="Loading preview..."
              style={styles.richPreview}
            />
          </View>
        </View>

        {/* Migration warning for edit users */}
        {state.permission === 'edit' && state.migrationNeeded && (
          <View style={styles.warningContainer}>
            <Ionicons name="information-circle" size={20} color="#f59e0b" />
            <Text style={styles.warningText}>
              This note will be migrated to support real-time collaboration when you open it. 
              This is a one-time process and won't affect the content.
            </Text>
          </View>
        )}

        {/* Owner note */}
        {isOwner && (
          <View style={styles.ownerContainer}>
            <Ionicons name="star" size={20} color="#fbbf24" />
            <Text style={styles.ownerNote}>
              This is your note. You have full editing permissions.
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleViewNote}
          >
            <Ionicons 
              name={canEdit ? "create" : "eye"} 
              size={20} 
              color="#fff" 
            />
            <Text style={styles.buttonText}>
              {canEdit ? 'Open & Edit Note' : 'View Note'}
            </Text>
          </TouchableOpacity>

          {needsLogin && (
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={handleLoginToEdit}
            >
              <Ionicons name="log-in" size={20} color="#60a5fa" />
              <Text style={styles.secondaryButtonText}>Login to Edit</Text>
            </TouchableOpacity>
          )}

          {!user && state.permission === 'view' && (
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={handleLoginToEdit}
            >
              <Ionicons name="person-add" size={20} color="#60a5fa" />
              <Text style={styles.secondaryButtonText}>Login for More Features</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Share info */}
        <View style={styles.shareInfo}>
          {state.shareToken.expiresAt && (
            <View style={styles.shareInfoItem}>
              <Ionicons name="time-outline" size={16} color="#9ca3af" />
              <Text style={styles.shareInfoText}>
                Expires: {state.shareToken.expiresAt.toLocaleDateString()}
              </Text>
            </View>
          )}
          {state.shareToken.maxUses && (
            <View style={styles.shareInfoItem}>
              <Ionicons name="repeat-outline" size={16} color="#9ca3af" />
              <Text style={styles.shareInfoText}>
                Uses: {state.shareToken.usageCount}/{state.shareToken.maxUses}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <LinearGradient colors={["#324762", "#0A1C3C"]} style={styles.container}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shared Note</Text>
          <View style={styles.headerSpacer} />
        </View>

        {state.loading && renderLoading()}
        {state.error && renderError()}
        {!state.loading && !state.error && state.note && renderNotePreview()}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  messageContainer: {
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
  errorMessage: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 16,
    marginTop: 16,
  },
  previewContainer: {
    flex: 1,
    padding: 16,
  },
  previewHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  noteIcon: {
    marginBottom: 12,
  },
  noteTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  editBadge: {
    backgroundColor: '#22c55e',
  },
  viewBadge: {
    backgroundColor: '#60a5fa',
  },
  permissionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  collabBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  collabReady: {
    backgroundColor: '#059669',
  },
  collabWarning: {
    backgroundColor: '#d97706',
  },
  collabText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  noteInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteInfoText: {
    color: '#d1d5db',
    fontSize: 14,
    marginLeft: 8,
  },
  previewContent: {
    marginBottom: 20,
  },
  previewLabel: {
    color: '#60a5fa',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  richPreviewContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 200,
    maxHeight: 300,
    overflow: 'hidden',
  },
  richPreview: {
    flex: 1,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
    marginBottom: 16,
  },
  warningText: {
    color: '#f59e0b',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  ownerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  ownerNote: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  actionsContainer: {
    marginBottom: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#60a5fa',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#60a5fa',
  },
  secondaryButtonText: {
    color: '#60a5fa',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  shareInfo: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  shareInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  shareInfoText: {
    color: '#9ca3af',
    fontSize: 12,
    marginLeft: 6,
  },
});