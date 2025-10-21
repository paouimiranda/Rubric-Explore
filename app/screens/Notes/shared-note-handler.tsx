// app/screens/Notes/shared-note-handler.tsx (UPDATED FOR GRANULAR COLLABORATION)
import { useAuth } from '@/app/contexts/AuthContext';
import { Note } from '@/app/types/notebook';
import { ShareToken, sharingService } from '@/services/sharing-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
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

  useEffect(() => {
    if (token && typeof token === 'string') {
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
      console.log('Shared note may need migration to chunk-based structure');
      setPreviewContent('Preview unavailable for this note format.');
    }

    // Load preview content from chunks
    try {
      const { getMergedNoteContent } = await import('@/services/notes-service');
      const content = await getMergedNoteContent(result.note.id);
      setPreviewContent(content || 'This note is empty.');
    } catch (error) {
      console.error('Error loading preview content:', error);
      setPreviewContent('Unable to load preview');
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
  }
};

  const handleViewNote = () => {
    if (state.note && state.permission) {
      // For edit permission and migration needed, show warning
      if (state.permission === 'edit' && state.migrationNeeded && user) {
        Alert.alert(
          'Collaborative Features',
          'This note may have limited real-time collaboration features. The owner should update the app for optimal collaborative editing.',
          [
            { text: 'Continue Anyway', onPress: navigateToNote },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
        return;
      }
      
      navigateToNote();
    }
  };

  const navigateToNote = () => {
    router.push({
      pathname: '../screens/Notes/shared-note-viewer',
      params: {
        noteId: state.note!.id,
        permission: state.permission!,
        isSharedAccess: 'true',
      }
    });
  };

  const handleLoginToEdit = () => {
    router.push({
      pathname: '../../index',
      params: {
        returnUrl: `/shared/${token}`,
        message: 'Login to edit this shared note'
      }
    });
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

    return (
      <View style={styles.previewContainer}>
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
                {state.migrationNeeded ? 'Limited Collab' : 'Real-time Ready'}
              </Text>
            </View>
          )}
        </View>

        {/* Note info */}
        <View style={styles.noteInfo}>
          <Text style={styles.noteInfoText}>
            Shared by: {state.shareToken.createdBy === user?.uid ? 'You' : 'Someone'}
          </Text>
          <Text style={styles.noteInfoText}>
            Created: {state.note.createdAt.toLocaleDateString()}
          </Text>
          {state.note.updatedAt && state.note.updatedAt.getTime() !== state.note.createdAt.getTime() && (
            <Text style={styles.noteInfoText}>
              Updated: {state.note.updatedAt.toLocaleDateString()}
            </Text>
          )}
          {state.note && (
            <Text style={styles.noteInfoText}>
              Length: {previewContent.length} characters
            </Text>
          )}
          
          {/* Collaboration info */}
          {state.note.collaborators && Object.keys(state.note.collaborators).length > 0 && (
            <Text style={styles.noteInfoText}>
              Collaborators: {Object.keys(state.note.collaborators).length}
            </Text>
          )}
        </View>

        {/* Preview content */}
        <View style={styles.previewContent}>
          <Text style={styles.previewLabel}>Preview:</Text>
          <Text style={styles.previewText} numberOfLines={6}>
            {previewContent || 'This note is empty.'}
          </Text>
        </View>

        {/* Migration warning for edit users */}
        {state.permission === 'edit' && state.migrationNeeded && (
          <View style={styles.warningContainer}>
            <Ionicons name="information-circle" size={20} color="#f59e0b" />
            <Text style={styles.warningText}>
              This note may have limited real-time collaboration features. 
              Some edits might not sync immediately with other users.
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {isOwner && (
            <Text style={styles.ownerNote}>
              This is your note. You can edit it normally.
            </Text>
          )}

          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleViewNote}
          >
            <Ionicons name="eye" size={20} color="#fff" />
            <Text style={styles.buttonText}>
              {canEdit ? 'Open & Edit' : 'View Note'}
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
            <Text style={styles.shareInfoText}>
              Expires: {state.shareToken.expiresAt.toLocaleDateString()}
            </Text>
          )}
          {state.shareToken.maxUses && (
            <Text style={styles.shareInfoText}>
              Uses: {state.shareToken.usageCount}/{state.shareToken.maxUses}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={["#324762", "#0A1C3C"]} style={styles.container}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shared Note</Text>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
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
  noteInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  noteInfoText: {
    color: '#d1d5db',
    fontSize: 14,
    marginBottom: 4,
  },
  previewContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flex: 1,
  },
  previewLabel: {
    color: '#60a5fa',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  previewText: {
    color: '#e5e7eb',
    fontSize: 14,
    lineHeight: 20,
  },
  actionsContainer: {
    marginBottom: 16,
  },
  ownerNote: {
    color: '#fbbf24',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
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
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
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
  },
  shareInfoText: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 4,
  },
  collabBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
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
  
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
    marginVertical: 8,
  },
  
  warningText: {
    color: '#f59e0b',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
});