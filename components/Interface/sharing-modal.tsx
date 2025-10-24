//components/SharingModal.tsx
import {
  ShareMethod,
  SharePermission,
  ShareToken,
  sharingService
} from '@/services/sharing-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Clipboard,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface SharingModalProps {
  visible: boolean;
  onClose: () => void;
  noteId: string;
  noteTitle: string;
  userUid: string;
}

export default function SharingModal({ 
  visible, 
  onClose, 
  noteId, 
  noteTitle, 
  userUid 
}: SharingModalProps) {
  const [shareTokens, setShareTokens] = useState<ShareToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Share options state
  const [permission, setPermission] = useState<SharePermission>('view');
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const [maxUses, setMaxUses] = useState<number | null>(null);
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [shareMethod, setShareMethod] = useState<ShareMethod>('public_url');

  const [notePrivacy, setNotePrivacy] = useState<'public' | 'private'>('private');
  const [togglingPrivacy, setTogglingPrivacy] = useState(false);

  useEffect(() => {
    if (visible && noteId) {
      loadNotePrivacy();
    }
  }, [visible, noteId]);

  const loadNotePrivacy = async () => {
    try {
      const { getNoteById } = await import('@/services/notes-service');
      const note = await getNoteById(noteId);
      if (note) {
        setNotePrivacy(note.isPublic ? 'public' : 'private');
      }
    } catch (error) {
      console.error('Error loading note privacy:', error);
    }
  };

  useEffect(() => {
    if (visible) {
      loadShareTokens();
    }
  }, [visible, noteId]);

  const loadShareTokens = async () => {
    try {
      setLoading(true);
      const tokens = await sharingService.getShareTokensForNote(noteId, userUid);
      setShareTokens(tokens.filter(token => token.isActive));
    } catch (error) {
      console.error('Error loading share tokens:', error);
      Alert.alert('Error', 'Failed to load sharing options');
    } finally {
      setLoading(false);
    }
  };

  const createShareLink = async () => {
    try {
      setCreating(true);
      
      const options = {
        permission,
        expiresIn: expiresIn || undefined,
        maxUses: maxUses || undefined,
        inviteeEmail: inviteeEmail || undefined,
      };

      const shareToken = await sharingService.createShareLink(
        noteId,
        userUid,
        shareMethod,
        options
      );

      setShareTokens(prev => [...prev, shareToken]);
      
      // Reset form
      setInviteeEmail('');
      setExpiresIn(null);
      setMaxUses(null);
      
      Alert.alert('Success', 'Share link created successfully!');
      
    } catch (error) {
      console.error('Error creating share link:', error);
      Alert.alert('Error', 'Failed to create share link');
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = async (token: string) => {
    const url = sharingService.generateShareUrl(token);
    await Clipboard.setString(url);
    Alert.alert('Copied!', 'Share link copied to clipboard');
  };

  const shareNative = async (token: string) => {
    try {
      const url = sharingService.generateShareUrl(token);
      const message = `Check out this note: "${noteTitle}"\n\n${url}`;
      
      await Share.share({
        message: Platform.OS === 'ios' ? message : url,
        url: Platform.OS === 'ios' ? url : undefined,
        title: `Shared Note: ${noteTitle}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const revokeToken = async (tokenId: string) => {
    try {
      await sharingService.revokeShareToken(tokenId, userUid);
      setShareTokens(prev => prev.filter(token => token.id !== tokenId));
      Alert.alert('Success', 'Share link revoked');
    } catch (error) {
      console.error('Error revoking token:', error);
      Alert.alert('Error', 'Failed to revoke share link');
    }
  };

  const formatExpiry = (expiresAt: Date | null) => {
    if (!expiresAt) return 'Never expires';
    const now = new Date();
    const diffHours = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Expired';
    if (diffHours < 24) return `Expires in ${diffHours}h`;
    const diffDays = Math.ceil(diffHours / 24);
    return `Expires in ${diffDays}d`;
  };

  const togglePrivacy = async () => {
    try {
      setTogglingPrivacy(true);
      
      const newPrivacy = notePrivacy === 'public' ? 'private' : 'public';
      const isPublic = newPrivacy === 'public';
      
      // Update in Firestore
      const { updateNote } = await import('@/services/notes-service');
      await updateNote(noteId, { isPublic }, userUid);
      
      setNotePrivacy(newPrivacy);
      
      Alert.alert(
        'Success',
        `Note is now ${newPrivacy}. ${isPublic ? 'It will appear in your public profile.' : 'It will only be accessible via share links.'}`
      );
    } catch (error) {
      console.error('Error toggling privacy:', error);
      Alert.alert('Error', 'Failed to update note privacy');
    } finally {
      setTogglingPrivacy(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <LinearGradient colors={["#324762", "#0A1C3C"]} style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Share Note</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Note Info */}
            <View style={styles.noteInfo}>
              <Ionicons name="document-text" size={20} color="#60a5fa" />
              <Text style={styles.noteTitle} numberOfLines={1}>{noteTitle}</Text>
            </View>

            {/* Privacy Toggle Section */}
              <View style={styles.section}>
                <View style={styles.privacyHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Note Privacy</Text>
                    <Text style={styles.privacyDescription}>
                      {notePrivacy === 'public' 
                        ? 'Anyone can view this note when shared publicly' 
                        : 'Only people with share links can access this note'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.privacyToggle,
                      notePrivacy === 'public' && styles.privacyToggleActive
                    ]}
                    onPress={togglePrivacy}
                    disabled={togglingPrivacy}
                  >
                    <View style={[
                      styles.toggleSwitch,
                      notePrivacy === 'public' && styles.toggleSwitchActive
                    ]}>
                      <View style={[
                        styles.toggleThumb,
                        notePrivacy === 'public' && styles.toggleThumbActive
                      ]} />
                    </View>
                    <View style={styles.privacyLabelContainer}>
                      <Ionicons 
                        name={notePrivacy === 'public' ? 'globe' : 'lock-closed'} 
                        size={16} 
                        color={notePrivacy === 'public' ? '#22c55e' : '#ef4444'} 
                      />
                      <Text style={[
                        styles.privacyLabel,
                        notePrivacy === 'public' ? styles.privacyLabelPublic : styles.privacyLabelPrivate
                      ]}>
                        {notePrivacy === 'public' ? 'Public' : 'Private'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
                
                {notePrivacy === 'public' && (
                  <View style={styles.publicWarning}>
                    <Ionicons name="information-circle" size={16} color="#f59e0b" />
                    <Text style={styles.publicWarningText}>
                      This note will be visible in your public profile
                    </Text>
                  </View>
                )}
              </View>

            {/* Create New Share Link */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Create Share Link</Text>
              
              {/* Permission Selection */}
              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>Permission</Text>
                <View style={styles.permissionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.permissionButton,
                      permission === 'view' && styles.permissionButtonActive
                    ]}
                    onPress={() => setPermission('view')}
                  >
                    <Ionicons name="eye" size={16} color={permission === 'view' ? '#fff' : '#9ca3af'} />
                    <Text style={[
                      styles.permissionText,
                      permission === 'view' && styles.permissionTextActive
                    ]}>View</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.permissionButton,
                      permission === 'edit' && styles.permissionButtonActive
                    ]}
                    onPress={() => setPermission('edit')}
                  >
                    <Ionicons name="create" size={16} color={permission === 'edit' ? '#fff' : '#9ca3af'} />
                    <Text style={[
                      styles.permissionText,
                      permission === 'edit' && styles.permissionTextActive
                    ]}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Share Method */}
              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>Share Method</Text>
                <View style={styles.methodButtons}>
                  <TouchableOpacity
                    style={[
                      styles.methodButton,
                      shareMethod === 'public_url' && styles.methodButtonActive
                    ]}
                    onPress={() => setShareMethod('public_url')}
                  >
                    <Text style={[
                      styles.methodText,
                      shareMethod === 'public_url' && styles.methodTextActive
                    ]}>Public URL</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.methodButton,
                      shareMethod === 'share_code' && styles.methodButtonActive
                    ]}
                    onPress={() => setShareMethod('share_code')}
                  >
                    <Text style={[
                      styles.methodText,
                      shareMethod === 'share_code' && styles.methodTextActive
                    ]}>Share Code</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Expiration */}
              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>Expires in (hours)</Text>
                <TextInput
                  style={styles.numberInput}
                  value={expiresIn?.toString() || ''}
                  onChangeText={(text) => setExpiresIn(text ? parseInt(text) : null)}
                  placeholder="Never"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
              </View>

              {/* Max Uses */}
              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>Max uses</Text>
                <TextInput
                  style={styles.numberInput}
                  value={maxUses?.toString() || ''}
                  onChangeText={(text) => setMaxUses(text ? parseInt(text) : null)}
                  placeholder="Unlimited"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
              </View>

              {/* Email Invite (optional) */}
              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>Invite Email (optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={inviteeEmail}
                  onChangeText={setInviteeEmail}
                  placeholder="Enter email address"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Create Button */}
              <TouchableOpacity
                style={[styles.createButton, creating && styles.createButtonDisabled]}
                onPress={createShareLink}
                disabled={creating}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.createButtonText}>
                  {creating ? 'Creating...' : 'Create Share Link'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Existing Share Links */}
            {shareTokens.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Active Share Links</Text>
                
                {shareTokens.map((token) => (
                  <View key={token.id} style={styles.tokenCard}>
                    <View style={styles.tokenHeader}>
                      <View style={styles.tokenInfo}>
                        <Ionicons 
                          name={token.permission === 'edit' ? 'create' : 'eye'} 
                          size={16} 
                          color={token.permission === 'edit' ? '#22c55e' : '#60a5fa'} 
                        />
                        <Text style={styles.tokenPermission}>
                          {token.permission === 'edit' ? 'Can Edit' : 'View Only'}
                        </Text>
                        {token.method === 'share_code' && (
                          <View style={styles.codeChip}>
                            <Text style={styles.codeText}>{token.token}</Text>
                          </View>
                        )}
                      </View>
                      
                      <TouchableOpacity
                        onPress={() => revokeToken(token.id)}
                        style={styles.revokeButton}
                      >
                        <Ionicons name="trash" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.tokenDetails}>
                      <Text style={styles.tokenDetailText}>
                        {formatExpiry(token.expiresAt)}
                      </Text>
                      <Text style={styles.tokenDetailText}>
                        Used: {token.usageCount}{token.maxUses ? `/${token.maxUses}` : ''}
                      </Text>
                    </View>

                    <View style={styles.tokenActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => copyToClipboard(token.token)}
                      >
                        <Ionicons name="copy" size={16} color="#60a5fa" />
                        <Text style={styles.actionText}>Copy</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => shareNative(token.token)}
                      >
                        <Ionicons name="share" size={16} color="#60a5fa" />
                        <Text style={styles.actionText}>Share</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </LinearGradient>
      </View>
    </Modal>
  );
  
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    flex: 1,
    padding: 20,
  },
  noteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  noteTitle: {
    color: '#60a5fa',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  optionRow: {
    marginBottom: 16,
  },
  optionLabel: {
    color: '#d1d5db',
    fontSize: 14,
    marginBottom: 8,
  },
  permissionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    flex: 1,
    justifyContent: 'center',
  },
  permissionButtonActive: {
    backgroundColor: '#60a5fa',
  },
  permissionText: {
    color: '#9ca3af',
    marginLeft: 8,
    fontSize: 14,
  },
  permissionTextActive: {
    color: '#fff',
  },
  methodButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  methodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    flex: 1,
    alignItems: 'center',
  },
  methodButtonActive: {
    backgroundColor: '#22c55e',
  },
  methodText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  methodTextActive: {
    color: '#fff',
  },
  numberInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  tokenCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  tokenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tokenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tokenPermission: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  codeChip: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 12,
  },
  codeText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: 'bold',
  },
  revokeButton: {
    padding: 8,
  },
  tokenDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tokenDetailText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  tokenActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    borderRadius: 6,
  },
  actionText: {
    color: '#60a5fa',
    marginLeft: 6,
    fontSize: 14,
  },
  privacyHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  },
  privacyDescription: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
    maxWidth: '60%',
  },
  privacyToggle: {
    alignItems: 'center',
    gap: 8,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    backgroundColor: '#22c55e',
    alignSelf: 'flex-end',
  },
  privacyLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  privacyLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  privacyLabelPublic: {
    color: '#22c55e',
  },
  privacyLabelPrivate: {
    color: '#ef4444',
  },
  publicWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  publicWarningText: {
    color: '#f59e0b',
    fontSize: 12,
    flex: 1,
  },
});