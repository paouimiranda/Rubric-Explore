// app/components/EditProfileModal.tsx
import { AVATAR_PRESETS } from '@/constants/avatars';
import { db } from '@/firebase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
    Alert,
    Image,
    Keyboard,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  currentData: {
    firstName: string;
    lastName: string;
    bio: string;
    avatarIndex: number;
    uid: string;
  };
  onSave: () => void;
}

export default function EditProfileModal({
  visible,
  onClose,
  currentData,
  onSave,
}: EditProfileModalProps) {
  const [firstName, setFirstName] = useState(currentData.firstName);
  const [lastName, setLastName] = useState(currentData.lastName);
  const [bio, setBio] = useState(currentData.bio);
  const [selectedAvatarIndex, setSelectedAvatarIndex] = useState(currentData.avatarIndex);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'First name and last name are required');
      return;
    }

    try {
      setSaving(true);
      const userRef = doc(db, 'users', currentData.uid);
      
      await updateDoc(userRef, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bio: bio.trim(),
        avatarIndex: selectedAvatarIndex,
        displayName: `${firstName.trim()} ${lastName.trim()}`,
        updatedAt: new Date(),
      });

      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFirstName(currentData.firstName);
    setLastName(currentData.lastName);
    setBio(currentData.bio);
    setSelectedAvatarIndex(currentData.avatarIndex);
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <View style={styles.modalWrapper}>
            <LinearGradient 
              colors={["#0a1628", "#1a1f2e", "#0f1419"]} 
              style={styles.modalContainer}
            >
              {/* Decorative Top Bar */}
              <LinearGradient
                colors={['#6ADBCE', '#52C72B', '#63DC9A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.topBar}
              />

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={['#6ADBCE', '#52C72B']}
                    style={styles.iconGradient}
                  >
                    <Ionicons name="create" size={26} color="#fff" />
                  </LinearGradient>
                </View>
                <Text style={styles.title}>Edit Profile</Text>
                <Text style={styles.subtitle}>
                  Customize your identity
                </Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Ionicons name="close-circle" size={28} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.contentContainer}
              >
                {/* Avatar Selection */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="images" size={18} color="#EE007F" />
                    <Text style={styles.sectionLabel}>Choose Avatar</Text>
                  </View>
                  <View style={styles.avatarContainer}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.avatarScrollContent}
                    >
                      {AVATAR_PRESETS.map((avatar) => (
                        <TouchableOpacity
                          key={avatar.index}
                          onPress={() => setSelectedAvatarIndex(avatar.index)}
                          style={styles.avatarOption}
                          activeOpacity={0.7}
                        >
                          <View style={[
                            styles.avatarImageContainer,
                            selectedAvatarIndex === avatar.index && styles.avatarImageContainerSelected
                          ]}>
                            <Image source={{ uri: avatar.url }} style={styles.avatarImage} />
                            {selectedAvatarIndex === avatar.index && (
                              <>
                                <View style={styles.avatarOverlay} />
                                <View style={styles.avatarCheckmark}>
                                  <LinearGradient
                                    colors={['#52C72B', '#63DC9A']}
                                    style={styles.checkmarkGradient}
                                  >
                                    <Ionicons name="checkmark" size={18} color="#fff" />
                                  </LinearGradient>
                                </View>
                              </>
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>

                {/* Name Fields */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="person" size={18} color="#F2CD41" />
                    <Text style={styles.sectionLabel}>First Name</Text>
                  </View>
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputIconContainer}>
                      <Ionicons name="person-outline" size={20} color="#6ADBCE" />
                    </View>
                    <TextInput
                      style={styles.textInput}
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="Enter first name"
                      placeholderTextColor="#4b5563"
                      maxLength={50}
                    />
                    {firstName.length > 0 && (
                      <TouchableOpacity 
                        onPress={() => setFirstName('')}
                        style={styles.clearButton}
                      >
                        <Ionicons name="close-circle" size={18} color="#6b7280" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="people" size={18} color="#E77F00" />
                    <Text style={styles.sectionLabel}>Last Name</Text>
                  </View>
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputIconContainer}>
                      <Ionicons name="person-outline" size={20} color="#6ADBCE" />
                    </View>
                    <TextInput
                      style={styles.textInput}
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Enter last name"
                      placeholderTextColor="#4b5563"
                      maxLength={50}
                    />
                    {lastName.length > 0 && (
                      <TouchableOpacity 
                        onPress={() => setLastName('')}
                        style={styles.clearButton}
                      >
                        <Ionicons name="close-circle" size={18} color="#6b7280" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Bio */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="chatbubbles" size={18} color="#568CD2" />
                    <Text style={styles.sectionLabel}>Bio</Text>
                  </View>
                  <View style={[styles.inputWrapper, styles.bioWrapper]}>
                    <TextInput
                      style={[styles.textInput, styles.bioInput]}
                      value={bio}
                      onChangeText={setBio}
                      placeholder="Tell us about yourself..."
                      placeholderTextColor="#4b5563"
                      multiline
                      numberOfLines={4}
                      maxLength={200}
                      textAlignVertical="top"
                    />
                  </View>
                  <View style={styles.charCountContainer}>
                    <Ionicons name="text-outline" size={12} color="#6b7280" />
                    <Text style={styles.charCount}>{bio.length}/200 characters</Text>
                  </View>
                </View>

                {/* Profile Stats */}
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <View style={styles.statIconContainer}>
                      <LinearGradient
                        colors={['#EE007F', '#F2CD41']}
                        style={styles.statIconGradient}
                      >
                        <Ionicons name="star" size={16} color="#fff" />
                      </LinearGradient>
                    </View>
                    <View style={styles.statTextContainer}>
                      <Text style={styles.statValue}>Level Up</Text>
                      <Text style={styles.statLabel}>Make it yours</Text>
                    </View>
                  </View>
                  
                  <View style={styles.statDivider} />
                  
                  <View style={styles.statItem}>
                    <View style={styles.statIconContainer}>
                      <LinearGradient
                        colors={['#568CD2', '#6ADBCE']}
                        style={styles.statIconGradient}
                      >
                        <Ionicons name="eye" size={16} color="#fff" />
                      </LinearGradient>
                    </View>
                    <View style={styles.statTextContainer}>
                      <Text style={styles.statValue}>Stand Out</Text>
                      <Text style={styles.statLabel}>Be memorable</Text>
                    </View>
                  </View>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    saving && styles.saveButtonDisabled
                  ]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={saving ? ['#374151', '#1f2937'] : ['#52C72B', '#63DC9A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.saveButtonGradient}
                  >
                    {saving ? (
                      <Text style={styles.saveButtonText}>Saving...</Text>
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalWrapper: {
    height: '92%',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#6ADBCE',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 25,
    flex: 1,
  },
  topBar: {
    height: 4,
  },
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 24,
    position: 'relative',
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6ADBCE',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '400',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  avatarContainer: {
    backgroundColor: '#0f1419',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#1f2937',
  },
  avatarScrollContent: {
    gap: 12,
    paddingVertical: 4,
  },
  avatarOption: {
    position: 'relative',
  },
  avatarImageContainer: {
    width: 85,
    height: 85,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1f2937',
    overflow: 'hidden',
    backgroundColor: '#0a1628',
  },
  avatarImageContainerSelected: {
    borderColor: '#EE007F',
    shadowColor: '#EE007F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  avatarCheckmark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -16,
    marginLeft: -16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  checkmarkGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1419',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1f2937',
    overflow: 'hidden',
  },
  inputIconContainer: {
    paddingLeft: 16,
    paddingRight: 12,
  },
  textInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 16,
    paddingRight: 16,
  },
  clearButton: {
    paddingRight: 16,
    paddingLeft: 8,
  },
  bioWrapper: {
    alignItems: 'flex-start',
  },
  bioInput: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingLeft: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingHorizontal: 4,
    gap: 6,
  },
  charCount: {
    color: '#6b7280',
    fontSize: 13,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1419',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#1f2937',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIconContainer: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  statIconGradient: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#1f2937',
    marginHorizontal: 12,
  },
  infoCards: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  infoCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f1419',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  infoIconContainer: {
    marginRight: 6,
  },
  infoCardText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    backgroundColor: 'rgba(15, 20, 25, 0.5)',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#0f1419',
    borderWidth: 2,
    borderColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});