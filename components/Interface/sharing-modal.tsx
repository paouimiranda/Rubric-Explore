//components/SharingModal.tsx
import { CustomAlertModal } from '@/components/Interface/custom-alert-modal';
import {
  ShareMethod,
  SharePermission,
  ShareToken,
  sharingService
} from '@/services/sharing-service';
import { Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold, useFonts } from '@expo-google-fonts/montserrat';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

interface AlertState {
  visible: boolean;
  type: 'info' | 'success' | 'error' | 'warning';
  title: string;
  message: string;
  buttons?: Array<{
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel' | 'primary';
  }>;
}

export default function SharingModal({ 
  visible, 
  onClose, 
  noteId, 
  noteTitle, 
  userUid 
}: SharingModalProps) {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  const [shareTokens, setShareTokens] = useState<ShareToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const [permission, setPermission] = useState<SharePermission>('view');
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const [maxUses, setMaxUses] = useState<number | null>(null);
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [shareMethod, setShareMethod] = useState<ShareMethod>('public_url');

  const [notePrivacy, setNotePrivacy] = useState<'public' | 'private'>('private');
  const [togglingPrivacy, setTogglingPrivacy] = useState(false);

  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  const showAlert = (
    type: 'info' | 'success' | 'error' | 'warning',
    title: string,
    message: string,
    buttons?: AlertState['buttons']
  ) => {
    setAlertState({
      visible: true,
      type,
      title,
      message,
      buttons: buttons || [
        {
          text: 'OK',
          onPress: () => closeAlert(),
          style: 'primary',
        },
      ],
    });
  };

  const closeAlert = () => {
    setAlertState(prev => ({ ...prev, visible: false }));
  };

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
      showAlert('error', 'Error', 'Failed to load sharing options');
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
      
      setInviteeEmail('');
      setExpiresIn(null);
      setMaxUses(null);
      
      showAlert('success', 'Success', 'Share link created successfully!');
      
    } catch (error) {
      console.error('Error creating share link:', error);
      showAlert('error', 'Error', 'Failed to create share link');
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = async (token: string) => {
    const url = sharingService.generateShareUrl(token);
    await Clipboard.setString(url);
    showAlert('success', 'Copied!', 'Share link copied to clipboard');
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
      showAlert('success', 'Success', 'Share link revoked');
    } catch (error) {
      console.error('Error revoking token:', error);
      showAlert('error', 'Error', 'Failed to revoke share link');
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
      
      const { updateNote } = await import('@/services/notes-service');
      await updateNote(noteId, { isPublic }, userUid);
      
      setNotePrivacy(newPrivacy);
      
      showAlert(
        'success',
        'Success',
        `Note is now ${newPrivacy}. ${isPublic ? 'It will appear in your public profile.' : 'It will only be accessible via share links.'}`
      );
    } catch (error) {
      console.error('Error toggling privacy:', error);
      showAlert('error', 'Error', 'Failed to update note privacy');
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
        <LinearGradient colors={['#0A1C3C', '#324762']} style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.headerIconBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="share-social" size={20} color="#ffffff" />
              </LinearGradient>
              <Text style={styles.title}>Share Note</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Note Info Card */}
            <View style={styles.noteInfoCard}>
              <LinearGradient
                colors={['rgba(102, 126, 234, 0.2)', 'rgba(118, 75, 162, 0.2)']}
                style={styles.noteInfoGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="document-text" size={24} color="#667eea" />
                <Text style={styles.noteTitle} numberOfLines={2}>{noteTitle}</Text>
              </LinearGradient>
            </View>

            {/* Privacy Toggle Card */}
            <View style={styles.card}>
              <View style={styles.privacyHeader}>
                <View style={styles.privacyLeft}>
                  <View style={styles.privacyIconContainer}>
                    <Ionicons 
                      name={notePrivacy === 'public' ? 'globe' : 'lock-closed'} 
                      size={20} 
                      color={notePrivacy === 'public' ? '#22c55e' : '#ef4444'} 
                    />
                  </View>
                  <View style={styles.privacyTextContainer}>
                    <Text style={styles.sectionTitle}>Note Privacy</Text>
                    <Text style={styles.privacyDescription}>
                      {notePrivacy === 'public' 
                        ? 'Visible in public profile' 
                        : 'Only via share links'}
                    </Text>
                  </View>
                </View>
                
                <TouchableOpacity
                  style={styles.privacyToggleContainer}
                  onPress={togglePrivacy}
                  disabled={togglingPrivacy}
                >
                  <View style={[
                    styles.toggleSwitch,
                    notePrivacy === 'public' && styles.toggleSwitchActive
                  ]}>
                    <LinearGradient
                      colors={notePrivacy === 'public' ? ['#22c55e', '#16a34a'] : ['#ef4444', '#dc2626']}
                      style={[
                        styles.toggleThumb,
                        notePrivacy === 'public' && styles.toggleThumbActive
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                  </View>
                  <Text style={[
                    styles.privacyLabel,
                    notePrivacy === 'public' ? styles.privacyLabelPublic : styles.privacyLabelPrivate
                  ]}>
                    {notePrivacy === 'public' ? 'Public' : 'Private'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {notePrivacy === 'public' && (
                <View style={styles.publicWarning}>
                  <Ionicons name="information-circle" size={18} color="#f59e0b" />
                  <Text style={styles.publicWarningText}>
                    This note will be visible in your public profile
                  </Text>
                </View>
              )}
            </View>

            {/* Create New Share Link Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="add-circle" size={20} color="#667eea" />
                <Text style={styles.sectionTitle}>Create Share Link</Text>
              </View>
              
              {/* Permission Selection */}
              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>Permission Level</Text>
                <View style={styles.permissionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.permissionButton,
                      permission === 'view' && styles.permissionButtonActive
                    ]}
                    onPress={() => setPermission('view')}
                    activeOpacity={0.7}
                  >
                    {permission === 'view' ? (
                      <LinearGradient
                        colors={['#4facfe', '#00f2fe']}
                        style={styles.permissionGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Ionicons name="eye" size={16} color="#fff" />
                        <Text style={styles.permissionTextActive}>View</Text>
                      </LinearGradient>
                    ) : (
                      <>
                        <Ionicons name="eye" size={16} color="#9ca3af" />
                        <Text style={styles.permissionText}>View</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.permissionButton,
                      permission === 'edit' && styles.permissionButtonActive
                    ]}
                    onPress={() => setPermission('edit')}
                    activeOpacity={0.7}
                  >
                    {permission === 'edit' ? (
                      <LinearGradient
                        colors={['#f093fb', '#f5576c']}
                        style={styles.permissionGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Ionicons name="create" size={16} color="#fff" />
                        <Text style={styles.permissionTextActive}>Edit</Text>
                      </LinearGradient>
                    ) : (
                      <>
                        <Ionicons name="create" size={16} color="#9ca3af" />
                        <Text style={styles.permissionText}>Edit</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Share Method */}
              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>Share Method</Text>
                <View style={styles.methodButtons}>
                  <TouchableOpacity
                    style={styles.methodButton}
                    onPress={() => setShareMethod('public_url')}
                    activeOpacity={0.7}
                  >
                    {shareMethod === 'public_url' ? (
                      <LinearGradient
                        colors={['#667eea', '#764ba2']}
                        style={styles.methodGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text style={styles.methodTextActive}>Public URL</Text>
                      </LinearGradient>
                    ) : (
                      <Text style={styles.methodText}>Public URL</Text>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.methodButton}
                    onPress={() => setShareMethod('share_code')}
                    activeOpacity={0.7}
                  >
                    {shareMethod === 'share_code' ? (
                      <LinearGradient
                        colors={['#667eea', '#764ba2']}
                        style={styles.methodGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text style={styles.methodTextActive}>Share Code</Text>
                      </LinearGradient>
                    ) : (
                      <Text style={styles.methodText}>Share Code</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Expiration & Max Uses */}
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.optionLabel}>Expires (hours)</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="time" size={16} color="#667eea" />
                    <TextInput
                      style={styles.input}
                      value={expiresIn?.toString() || ''}
                      onChangeText={(text) => setExpiresIn(text ? parseInt(text) : null)}
                      placeholder="Never"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.optionLabel}>Max Uses</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="people" size={16} color="#667eea" />
                    <TextInput
                      style={styles.input}
                      value={maxUses?.toString() || ''}
                      onChangeText={(text) => setMaxUses(text ? parseInt(text) : null)}
                      placeholder="Unlimited"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>


              {/* Create Button */}
              <TouchableOpacity
                onPress={createShareLink}
                disabled={creating}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={creating ? ['#475569', '#64748b'] : ['#10b981', '#059669']}
                  style={styles.createButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {creating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="add-circle" size={20} color="#fff" />
                      <Text style={styles.createButtonText}>Create Share Link</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Existing Share Links */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#667eea" />
              </View>
            ) : shareTokens.length > 0 ? (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="link" size={20} color="#667eea" />
                  <Text style={styles.sectionTitle}>Active Share Links</Text>
                </View>
                
                {shareTokens.map((token) => (
                  <View key={token.id} style={styles.tokenCard}>
                    <View style={styles.tokenHeader}>
                      <View style={styles.tokenInfo}>
                        <LinearGradient
                          colors={token.permission === 'edit' ? ['#f093fb', '#f5576c'] : ['#4facfe', '#00f2fe']}
                          style={styles.tokenBadge}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Ionicons 
                            name={token.permission === 'edit' ? 'create' : 'eye'} 
                            size={14} 
                            color="#fff" 
                          />
                        </LinearGradient>
                        <View>
                          <Text style={styles.tokenPermission}>
                            {token.permission === 'edit' ? 'Can Edit' : 'View Only'}
                          </Text>
                          {token.method === 'share_code' && (
                            <View style={styles.codeChip}>
                              <Text style={styles.codeText}>{token.token}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      
                      <TouchableOpacity
                        onPress={() => revokeToken(token.id)}
                        style={styles.revokeButton}
                      >
                        <Ionicons name="trash" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.tokenDetails}>
                      <View style={styles.tokenDetailItem}>
                        <Ionicons name="time-outline" size={14} color="#aaa" />
                        <Text style={styles.tokenDetailText}>
                          {formatExpiry(token.expiresAt)}
                        </Text>
                      </View>
                      <View style={styles.tokenDetailItem}>
                        <Ionicons name="stats-chart" size={14} color="#aaa" />
                        <Text style={styles.tokenDetailText}>
                          {token.usageCount}{token.maxUses ? `/${token.maxUses}` : ''} uses
                        </Text>
                      </View>
                    </View>

                    <View style={styles.tokenActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => copyToClipboard(token.token)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="copy" size={16} color="#667eea" />
                        <Text style={styles.actionText}>Copy</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => shareNative(token.token)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="share-outline" size={16} color="#667eea" />
                        <Text style={styles.actionText}>Share</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>
        </LinearGradient>

        {/* Custom Alert Modal */}
        <CustomAlertModal
          visible={alertState.visible}
          type={alertState.type}
          title={alertState.title}
          message={alertState.message}
          buttons={alertState.buttons}
          onClose={closeAlert}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Montserrat_700Bold',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  noteInfoCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  noteInfoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  noteTitle: {
    color: '#fff',
    flex: 1,
    fontSize: 15,
    fontFamily: 'Montserrat_600SemiBold',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Montserrat_600SemiBold',
  },
  privacyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  privacyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  privacyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  privacyTextContainer: {
    flex: 1,
  },
  privacyDescription: {
    color: '#aaa',
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 2,
  },
  privacyToggleContainer: {
    alignItems: 'center',
    gap: 6,
  },
  toggleSwitch: {
    width: 52,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 3,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  privacyLabel: {
    fontSize: 11,
    fontFamily: 'Montserrat_600SemiBold',
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
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  publicWarningText: {
    color: '#f59e0b',
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    flex: 1,
  },
  optionRow: {
    marginBottom: 16,
  },
  optionLabel: {
    color: '#d1d5db',
    fontSize: 13,
    fontFamily: 'Montserrat_600SemiBold',
    marginBottom: 8,
  },
  permissionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  permissionButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  permissionButtonActive: {
    backgroundColor: 'transparent',
  },
  permissionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  permissionText: {
    color: '#9ca3af',
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
    marginLeft: 6,
  },
  permissionTextActive: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
  },
  methodButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  methodButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  methodGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  methodText: {
    color: '#9ca3af',
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
    paddingVertical: 12,
    textAlign: 'center',
  },
  methodTextActive: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 44,
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  tokenCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    gap: 10,
    flex: 1,
  },
  tokenBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenPermission: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
  },
  codeChip: {
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  codeText: {
    color: '#667eea',
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 1,
  },
  revokeButton: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
  },
  tokenDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  tokenDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tokenDetailText: {
    color: '#aaa',
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
  },
  tokenActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: 'rgba(102, 126, 234, 0.15)',
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  actionText: {
    color: '#667eea',
    fontSize: 13,
    fontFamily: 'Montserrat_600SemiBold',
  },
});