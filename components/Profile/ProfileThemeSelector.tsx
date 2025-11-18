// components/Profile/ProfileThemeSelector.tsx
import { FRIEND_CARD_THEMES, ThemeRarity } from '@/constants/friend-card-themes';
import { PROFILE_THEMES, ProfileTheme } from '@/constants/profile-theme';
import { db } from '@/firebase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

type TabType = 'profile' | 'friendCard';

interface ProfileThemeSelectorProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  currentThemeId: string;
  onThemeSelected: (themeId: string) => void;
  ownedThemes?: string[];
  currentFriendCardTheme?: string;
  onFriendCardThemeSelected?: (themeId: string) => void;
}

const RARITY_COLORS: Record<ThemeRarity, string[]> = {
  common: ['#9ca3af', '#6b7280'],
  rare: ['#3b82f6', '#2563eb'],
  epic: ['#8b5cf6', '#7c3aed'],
  legendary: ['#f59e0b', '#d97706'],
  mythic: ['#ec4899', '#db2777'],
};

const RARITY_LABELS: Record<ThemeRarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  mythic: 'Mythic',
};

export default function ProfileThemeSelector({
  visible,
  onClose,
  userId,
  currentThemeId,
  onThemeSelected,
  ownedThemes = ['default'],
  currentFriendCardTheme = 'default',
  onFriendCardThemeSelected,
}: ProfileThemeSelectorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [loading, setLoading] = useState(false);
  const [ownedFriendCardThemes, setOwnedFriendCardThemes] = useState<string[]>(['default']);
  const [selectedFriendCardTheme, setSelectedFriendCardTheme] = useState<string>(currentFriendCardTheme);
  const [savingFriendCard, setSavingFriendCard] = useState(false);

  useEffect(() => {
    if (visible) {
      loadOwnedFriendCardThemes();
      setSelectedFriendCardTheme(currentFriendCardTheme);
    }
  }, [visible, currentFriendCardTheme]);

  const loadOwnedFriendCardThemes = async () => {
    try {
      setLoading(true);
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const themes = userData.inventory?.ownedThemes || [];
        const validThemes = themes.filter((themeId: string) => FRIEND_CARD_THEMES[themeId]);
        const allThemes = ['default', ...validThemes.filter((id: string) => id !== 'default')];
        setOwnedFriendCardThemes(allThemes);
      } else {
        setOwnedFriendCardThemes(['default']);
      }
    } catch (error) {
      console.error('Error loading friend card themes:', error);
      setOwnedFriendCardThemes(['default']);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileThemeSelect = async (themeId: string) => {
    if (!ownedThemes.includes(themeId)) {
      Alert.alert(
        'Theme Locked',
        'You need to unlock this theme first to use it!',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setLoading(true);
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'inventory.selectedProfileTheme': themeId,
      });
      onThemeSelected(themeId);
      Alert.alert('Success', 'Profile theme updated!');
      onClose();
    } catch (error) {
      console.error('Error updating theme:', error);
      Alert.alert('Error', 'Failed to update theme');
    } finally {
      setLoading(false);
    }
  };

  const handleFriendCardThemeSave = async () => {
    if (selectedFriendCardTheme === currentFriendCardTheme) {
      onClose();
      return;
    }

    try {
      setSavingFriendCard(true);
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'inventory.selectedFriendCardTheme': selectedFriendCardTheme,
      });
      if (onFriendCardThemeSelected) {
        onFriendCardThemeSelected(selectedFriendCardTheme);
      }
      Alert.alert('Success', 'Friend card theme updated!');
      onClose();
    } catch (error) {
      console.error('Error saving friend card theme:', error);
      Alert.alert('Error', 'Failed to save theme. Please try again.');
    } finally {
      setSavingFriendCard(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return '#9ca3af';
      case 'rare':
        return '#3b82f6';
      case 'epic':
        return '#8b5cf6';
      case 'legendary':
        return '#f59e0b';
      default:
        return '#9ca3af';
    }
  };

  const renderProfileThemeCard = (theme: ProfileTheme) => {
    const isOwned = ownedThemes.includes(theme.id);
    const isSelected = theme.id === currentThemeId;

    return (
      <View key={theme.id} style={styles.themeCardWrapper}>
        <TouchableOpacity
          style={[
            styles.profileThemeCard,
            isSelected && styles.themeCardSelected,
            !isOwned && styles.themeCardLocked,
          ]}
          onPress={() => handleProfileThemeSelect(theme.id)}
          activeOpacity={0.7}
          disabled={loading}
        >
          <LinearGradient
            colors={theme.gradient.background as any}
            style={styles.themePreview}
          >
            <LinearGradient
              colors={theme.gradient.decorativeBar as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.miniDecorativeBar}
            />
            <View style={styles.themeIconContainer}>
              <Ionicons name={theme.icon as any} size={32} color="#fff" />
            </View>
            {!isOwned && (
              <View style={styles.lockedOverlay}>
                <Ionicons name="lock-closed" size={28} color="#fff" />
              </View>
            )}
            {isSelected && (
              <View style={styles.selectedBadge}>
                <Ionicons name="checkmark-circle" size={22} color="#52c72b" />
              </View>
            )}
            {theme.hasParticles && (
              <View style={styles.featureBadge}>
                <Ionicons name="sparkles" size={14} color="#ffd700" />
              </View>
            )}
          </LinearGradient>
          <View style={styles.themeInfo}>
            <View style={styles.themeHeader}>
              <Text style={styles.themeName} numberOfLines={1}>
                {theme.name}
              </Text>
              <View
                style={[
                  styles.rarityBadgeSmall,
                  { backgroundColor: getRarityColor(theme.rarity) },
                ]}
              >
                <Text style={styles.rarityText}>{theme.rarity.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.themeDescription} numberOfLines={2}>
              {theme.description}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFriendCardTheme = (themeId: string) => {
    const theme = FRIEND_CARD_THEMES[themeId];
    if (!theme) return null;
    
    const isSelected = selectedFriendCardTheme === themeId;
    const isCurrentlyActive = currentFriendCardTheme === themeId;

    return (
      <TouchableOpacity
        key={themeId}
        style={[styles.friendCardThemeCard, isSelected && styles.themeCardSelected]}
        onPress={() => setSelectedFriendCardTheme(themeId)}
        activeOpacity={0.7}
      >
        <View style={styles.friendCardPreview}>
          {theme.gradientColors ? (
            <LinearGradient
              colors={theme.gradientColors as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.friendCardGradient}
            >
              {theme.borderGlow && (
                <View style={[styles.glowEffect, { backgroundColor: theme.glowColor || theme.borderColor }]} />
              )}
            </LinearGradient>
          ) : (
            <View style={[styles.friendCardSolid, { backgroundColor: theme.backgroundColor }]}>
              {theme.borderGlow && (
                <View style={[styles.glowEffect, { backgroundColor: theme.glowColor || theme.borderColor }]} />
              )}
            </View>
          )}
          
          {theme.borderColor && (
            <View
              style={[
                styles.friendCardBorder,
                {
                  borderColor: theme.borderColor,
                  borderWidth: theme.borderWidth || 1,
                },
              ]}
            />
          )}

          {isSelected && (
            <View style={styles.selectedOverlay}>
              <LinearGradient
                colors={['rgba(106, 219, 206, 0.3)', 'rgba(86, 140, 210, 0.3)']}
                style={styles.selectedGradient}
              >
                <Ionicons name="checkmark-circle" size={32} color="#6ADBCE" />
              </LinearGradient>
            </View>
          )}

          {isCurrentlyActive && !isSelected && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>ACTIVE</Text>
            </View>
          )}

          {theme.animated && (
            <View style={styles.animatedBadge}>
              <Ionicons name="sparkles" size={12} color="#fbbf24" />
            </View>
          )}
        </View>

        <View style={styles.friendCardInfo}>
          <View style={styles.themeHeader}>
            <Text style={styles.themeName} numberOfLines={1}>
              {theme.name}
            </Text>
            <LinearGradient
              colors={RARITY_COLORS[theme.rarity] as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.rarityBadgeLarge}
            >
              <Text style={styles.rarityText}>{RARITY_LABELS[theme.rarity]}</Text>
            </LinearGradient>
          </View>
          <Text style={styles.themeDescription} numberOfLines={2}>
            {theme.description}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const profileThemesArray = Object.values(PROFILE_THEMES);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <LinearGradient
              colors={['#6ADBCE', '#568CD2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.headerGradient}
            />
            <View style={styles.headerContent}>
              <View style={styles.headerTextContainer}>
                <Text style={styles.modalTitle}>Customize Themes</Text>
                <Text style={styles.modalSubtitle}>
                  {activeTab === 'profile' ? 'Profile appearance' : 'Friend card style'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                disabled={loading || savingFriendCard}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabSelector}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'profile' && styles.tabActive]}
              onPress={() => setActiveTab('profile')}
              activeOpacity={0.7}
            >
              {activeTab === 'profile' && (
                <LinearGradient
                  colors={['#6ADBCE', '#568CD2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.tabGradient}
                />
              )}
              <Ionicons
                name="person"
                size={18}
                color={activeTab === 'profile' ? '#fff' : '#6b7280'}
                style={styles.tabIcon}
              />
              <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>
                Profile Themes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'friendCard' && styles.tabActive]}
              onPress={() => setActiveTab('friendCard')}
              activeOpacity={0.7}
            >
              {activeTab === 'friendCard' && (
                <LinearGradient
                  colors={['#6ADBCE', '#568CD2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.tabGradient}
                />
              )}
              <Ionicons
                name="card"
                size={18}
                color={activeTab === 'friendCard' ? '#fff' : '#6b7280'}
                style={styles.tabIcon}
              />
              <Text style={[styles.tabText, activeTab === 'friendCard' && styles.tabTextActive]}>
                Friend Card
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'profile' ? (
              <View style={styles.themesGrid}>
                {profileThemesArray.length > 0 ? (
                  profileThemesArray.map(renderProfileThemeCard)
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="color-palette-outline" size={48} color="#6b7280" />
                    <Text style={styles.emptyText}>No themes available</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.friendCardGrid}>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading themes...</Text>
                  </View>
                ) : ownedFriendCardThemes.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="card-outline" size={48} color="#6b7280" />
                    <Text style={styles.emptyText}>No friend card themes available</Text>
                  </View>
                ) : (
                  ownedFriendCardThemes.map(renderFriendCardTheme)
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          {activeTab === 'friendCard' && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, savingFriendCard && styles.saveButtonDisabled]}
                onPress={handleFriendCardThemeSave}
                disabled={savingFriendCard}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={savingFriendCard ? ['#4b5563', '#374151'] : ['#6ADBCE', '#568CD2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveButtonGradient}
                >
                  {savingFriendCard ? (
                    <Text style={styles.saveButtonText}>Saving...</Text>
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={styles.saveButtonText}>Apply Theme</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'profile' && (
            <View style={styles.infoFooter}>
              <Ionicons name="information-circle" size={18} color="#6ADBCE" />
              <Text style={styles.infoText} adjustsFontSizeToFit numberOfLines={1}>
                Unlock new themes by playing in the explore section!""
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0f1419',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.85,
    minHeight: height * 0.6,
    overflow: 'hidden',
  },
  modalHeader: {
    position: 'relative',
    overflow: 'hidden',
  },
  headerGradient: {
    height: 3,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(106, 219, 206, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Tab Selector
  tabSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#1a2332',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(106, 219, 206, 0.15)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9,
    position: 'relative',
    overflow: 'hidden',
  },
  tabActive: {},
  tabGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabIcon: {
    marginRight: 6,
    zIndex: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    zIndex: 1,
  },
  tabTextActive: {
    color: '#fff',
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  
  // Profile Themes Grid
  themesGrid: {
    padding: 16,
    paddingTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  themeCardWrapper: {
    width: '48%',
    marginBottom: 16,
  },
  profileThemeCard: {
    backgroundColor: '#1a2332',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeCardSelected: {
    borderColor: '#52c72b',
    shadowColor: '#52c72b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  themeCardLocked: {
    opacity: 0.6,
  },
  themePreview: {
    height: 130,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniDecorativeBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  themeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#52c72b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  featureBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 6,
  },
  themeInfo: {
    padding: 14,
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  themeName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.2,
    marginRight: 8,
  },
  rarityBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rarityBadgeLarge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rarityText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  themeDescription: {
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 16,
  },

  // Friend Card Themes
  friendCardGrid: {
    padding: 16,
  },
  friendCardThemeCard: {
    backgroundColor: '#1a2332',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  friendCardPreview: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  friendCardGradient: {
    width: '100%',
    height: '100%',
  },
  friendCardSolid: {
    width: '100%',
    height: '100%',
  },
  friendCardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  glowEffect: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.3,
    transform: [{ translateX: -30 }, { translateY: -30 }],
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  animatedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.9)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendCardInfo: {
    marginTop: 4,
  },

  // Footer
  infoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(106, 219, 206, 0.08)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(106, 219, 206, 0.15)',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#6ADBCE',
    lineHeight: 16,
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(106, 219, 206, 0.15)',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(75, 85, 99, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9ca3af',
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  // Empty & Loading States
  emptyState: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
});