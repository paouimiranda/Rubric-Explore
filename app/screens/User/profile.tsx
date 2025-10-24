import { getCurrentUserData, updateUserProfile } from '@/services/auth-service';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

const AVATAR_PRESETS = [
  // Red gradient (new)
  'https://api.dicebear.com/9.x/fun-emoji/png?seed=Leah&size=200&backgroundType=gradientLinear&backgroundColor=ef4444,b91c1c',

  // Orange gradient
  'https://api.dicebear.com/9.x/fun-emoji/png?seed=Max&size=200&backgroundType=gradientLinear&backgroundColor=f59e0b,f97316',

  // Yellow gradient (new)
  'https://api.dicebear.com/9.x/fun-emoji/png?seed=Aneka&size=200&backgroundType=gradientLinear&backgroundColor=facc15,eab308',

  // Green gradient
  'https://api.dicebear.com/9.x/fun-emoji/png?seed=Jocelyn&size=200&backgroundType=gradientLinear&backgroundColor=10b981,059669',

  // Cyan gradient
  'https://api.dicebear.com/9.x/fun-emoji/png?seed=Chase&size=200&backgroundType=gradientLinear&backgroundColor=06b6d4,0891b2',

  // Blue gradient
  'https://api.dicebear.com/9.x/fun-emoji/png?seed=Liam&size=200&backgroundType=gradientLinear&backgroundColor=3b82f6,2563eb',

  // Purple gradient
  'https://api.dicebear.com/9.x/fun-emoji/png?seed=Cooper&size=200&backgroundType=gradientLinear&backgroundColor=8b5cf6,6366f1',

  // Pink gradient
  'https://api.dicebear.com/9.x/fun-emoji/png?seed=Sawyer&size=200&backgroundType=gradientLinear&backgroundColor=ec4899,d946ef',
];



// Header gradient presets
const HEADER_GRADIENTS = [
  ['#FF999A', '#EE007F'],
  ['#F2CD41', '#E77F00'],
  ['#63DC9A', '#52C72B'],
  ['#6ADBCE', '#568CD2'],
  ['#EE007F', '#568CD2'],
  ['#E77F00', '#FF999A'],
  ['#52C72B', '#6ADBCE'],
  ['#568CD2', '#EE007F'],
];

export default function ProfileScreen() {
  const { userData: contextUserData, loading: authLoading } = useAuth();
  const [userData, setUserData] = useState(contextUserData);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [headerModalVisible, setHeaderModalVisible] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [selectedHeader, setSelectedHeader] = useState<string[]>(['#FF999A', '#EE007F']);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refresh user data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const refreshUserData = async () => {
        setIsRefreshing(true);
        try {
          const freshData = await getCurrentUserData();
          if (freshData) {
            setUserData(freshData);
            setSelectedAvatar(freshData.avatar || null);
            setSelectedHeader(freshData.headerGradient || ['#FF999A', '#EE007F']);
          }
        } catch (error) {
          console.error('Error refreshing user data:', error);
        } finally {
          setIsRefreshing(false);
        }
      };
      
      refreshUserData();
    }, [])
  );

  useEffect(() => {
    if (contextUserData) {
      setUserData(contextUserData);
      setSelectedAvatar(contextUserData.avatar || null);
      setSelectedHeader(contextUserData.headerGradient || ['#FF999A', '#EE007F']);
    }
  }, [contextUserData]);

  const handleAvatarSelect = (avatar: string) => {
    setSelectedAvatar(avatar);
    setHasChanges(true);
    setAvatarModalVisible(false);
  };

  const handleHeaderSelect = (gradient: string[]) => {
    setSelectedHeader(gradient);
    setHasChanges(true);
    setHeaderModalVisible(false);
  };

  const handleSaveChanges = async () => {
    if (!userData || !hasChanges) return;

    setIsSaving(true);
    try {
      await updateUserProfile(userData.uid, {
        avatar: selectedAvatar,
        headerGradient: selectedHeader,
      });
      setHasChanges(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return (
      <LinearGradient
        colors={['#0f2c45ff', '#324762']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#63DC9A" />
        </View>
      </LinearGradient>
    );
  }

  if (!userData) {
    return (
      <LinearGradient
        colors={['#0f2c45ff', '#324762']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Unable to load profile</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#0f2c45ff', '#324762']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Section with Custom Gradient */}
        <LinearGradient
          colors={selectedHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.editHeaderButton}
            onPress={() => setHeaderModalVisible(true)}
          >
            <Text style={styles.editHeaderButtonText}>✨ Change Theme</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => setAvatarModalVisible(true)}
          >
            {selectedAvatar ? (
              <Image source={{ uri: selectedAvatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>+</Text>
              </View>
            )}
            <View style={styles.editAvatarBadge}>
              <Text style={styles.editAvatarBadgeText}>✏️</Text>
            </View>
          </TouchableOpacity>

          {/* User Info */}
          <Text style={styles.displayName}>{userData.displayName}</Text>
          <Text style={styles.username}>@{userData.username}</Text>

          {userData.bio && <Text style={styles.bio}>{userData.bio}</Text>}

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userData.posts}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userData.followers}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userData.following}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>

          {/* Save Button */}
          {hasChanges && (
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSaveChanges}
              disabled={isSaving}
            >
              <LinearGradient
                colors={['#63DC9A', '#52C72B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButtonGradient}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Avatar Selection Modal */}
      <Modal
        visible={avatarModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Avatar</Text>
              <TouchableOpacity onPress={() => setAvatarModalVisible(false)}>
                <Text style={styles.modalCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.avatarGrid}>
              {AVATAR_PRESETS.map((avatar, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.avatarOption,
                    selectedAvatar === avatar && styles.avatarOptionSelected,
                  ]}
                  onPress={() => handleAvatarSelect(avatar)}
                >
                  <Image source={{ uri: avatar }} style={styles.avatarOptionImage} />
                  {selectedAvatar === avatar && (
                    <View style={styles.avatarSelectedBadge}>
                      <Text style={styles.avatarSelectedBadgeText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Header Gradient Selection Modal */}
      <Modal
        visible={headerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setHeaderModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Header Theme</Text>
              <TouchableOpacity onPress={() => setHeaderModalVisible(false)}>
                <Text style={styles.modalCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.headerGrid}>
              {HEADER_GRADIENTS.map((gradient, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.headerOption}
                  onPress={() => handleHeaderSelect(gradient)}
                >
                  <LinearGradient
                    colors={gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.headerOptionGradient,
                      selectedHeader[0] === gradient[0] &&
                        selectedHeader[1] === gradient[1] &&
                        styles.headerOptionSelected,
                    ]}
                  >
                    {selectedHeader[0] === gradient[0] &&
                      selectedHeader[1] === gradient[1] && (
                        <Text style={styles.headerSelectedText}>✓</Text>
                      )}
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF999A',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    height: 180,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  editHeaderButton: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backdropFilter: 'blur(10px)',
  },
  editHeaderButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  avatarSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: -60,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#324762',
    backgroundColor: '#1a3a52',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1a3a52',
    borderWidth: 4,
    borderColor: '#324762',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 48,
    color: '#63DC9A',
    fontWeight: '300',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#568CD2',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#324762',
  },
  editAvatarBadgeText: {
    fontSize: 16,
  },
  displayName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#6ADBCE',
    fontWeight: '500',
    marginBottom: 12,
  },
  bio: {
    fontSize: 15,
    color: '#b0c4d4',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#8a9fb3',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  saveButton: {
    marginTop: 24,
    marginBottom: 32,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a3a52',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  modalCloseButton: {
    fontSize: 28,
    color: '#8a9fb3',
    fontWeight: '300',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  avatarOption: {
    width: '23%',
    aspectRatio: 1,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0f2c45',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  avatarOptionSelected: {
    borderColor: '#63DC9A',
  },
  avatarOptionImage: {
    width: '100%',
    height: '100%',
  },
  avatarSelectedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#63DC9A',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSelectedBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  headerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  headerOption: {
    width: '48%',
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  headerOptionGradient: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
    borderRadius: 12,
  },
  headerOptionSelected: {
    borderColor: '#fff',
  },
  headerSelectedText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
});