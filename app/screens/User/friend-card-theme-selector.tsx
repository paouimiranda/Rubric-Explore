// components/Interface/friend-card-theme-selector.tsx
import { FRIEND_CARD_THEMES, ThemeRarity } from '@/constants/friend-card-themes';
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

const { width } = Dimensions.get('window');

interface FriendCardThemeSelectorProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  currentThemeId?: string;
  onThemeSelected: (themeId: string) => void;
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

export default function FriendCardThemeSelector({
  visible,
  onClose,
  userId,
  currentThemeId = 'default',
  onThemeSelected,
}: FriendCardThemeSelectorProps) {
  const [ownedThemes, setOwnedThemes] = useState<string[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string>(currentThemeId);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      loadOwnedThemes();
      setSelectedTheme(currentThemeId);
    }
  }, [visible, currentThemeId]);

  const loadOwnedThemes = async () => {
    try {
      setLoading(true);
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        console.log('User data:', userData);
        console.log('Inventory:', userData.inventory);
        
        // Get owned themes from inventory
        const themes = userData.inventory?.ownedThemes || [];
        console.log('Owned themes:', themes);
        
        // Filter out any invalid theme IDs
        const validThemes = themes.filter((themeId: string) => FRIEND_CARD_THEMES[themeId]);
        console.log('Valid themes:', validThemes);
        
        // Always ensure 'default' theme is included (everyone has this)
        const allThemes = ['default', ...validThemes.filter((id: string) => id !== 'default')];
        console.log('All themes with default:', allThemes);
        
        setOwnedThemes(allThemes);
      } else {
        console.log('User document does not exist');
        setOwnedThemes(['default']);
      }
    } catch (error) {
      console.error('Error loading owned themes:', error);
      Alert.alert('Error', 'Failed to load your themes');
      setOwnedThemes(['default']);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTheme = async () => {
    if (selectedTheme === currentThemeId) {
      onClose();
      return;
    }

    try {
      setSaving(true);
      const userRef = doc(db, 'users', userId);
      
      await updateDoc(userRef, {
        'inventory.selectedFriendCardTheme': selectedTheme,
      });

      onThemeSelected(selectedTheme);
      Alert.alert('Success', 'Friend card theme updated!');
      onClose();
    } catch (error) {
      console.error('Error saving theme:', error);
      Alert.alert('Error', 'Failed to save theme. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderThemePreview = (themeId: string) => {
    const theme = FRIEND_CARD_THEMES[themeId];
    
    if (!theme) {
      console.log('Theme not found:', themeId);
      return null;
    }
    
    console.log('Rendering theme:', themeId, theme.name);
    
    const isSelected = selectedTheme === themeId;
    const isCurrentlyActive = currentThemeId === themeId;

    return (
      <TouchableOpacity
        key={themeId}
        style={[styles.themeCard, isSelected && styles.themeCardSelected]}
        onPress={() => setSelectedTheme(themeId)}
        activeOpacity={0.7}
      >
        {/* Theme Preview */}
        <View style={styles.themePreview}>
          {theme.gradientColors ? (
            <LinearGradient
              colors={theme.gradientColors as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.themePreviewGradient}
            >
              {theme.borderGlow && (
                <View style={[styles.glowEffect, { backgroundColor: theme.glowColor || theme.borderColor }]} />
              )}
            </LinearGradient>
          ) : (
            <View style={[styles.themePreviewSolid, { backgroundColor: theme.backgroundColor }]}>
              {theme.borderGlow && (
                <View style={[styles.glowEffect, { backgroundColor: theme.glowColor || theme.borderColor }]} />
              )}
            </View>
          )}
          
          {/* Border */}
          {theme.borderColor && (
            <View
              style={[
                styles.themeBorder,
                {
                  borderColor: theme.borderColor,
                  borderWidth: theme.borderWidth || 1,
                },
              ]}
            />
          )}

          {/* Selection Indicator */}
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

          {/* Currently Active Badge */}
          {isCurrentlyActive && !isSelected && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>ACTIVE</Text>
            </View>
          )}

          {/* Animated Indicator */}
          {theme.animated && (
            <View style={styles.animatedBadge}>
              <Ionicons name="sparkles" size={12} color="#fbbf24" />
            </View>
          )}
        </View>

        {/* Theme Info */}
        <View style={styles.themeInfo}>
          <Text style={styles.themeName} numberOfLines={1}>
            {theme.name}
          </Text>
          
          {/* Rarity Badge */}
          <LinearGradient
            colors={RARITY_COLORS[theme.rarity] as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.rarityBadge}
          >
            <Text style={styles.rarityText}>{RARITY_LABELS[theme.rarity]}</Text>
          </LinearGradient>
        </View>

        {/* Description */}
        <Text style={styles.themeDescription} numberOfLines={2}>
          {theme.description}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <LinearGradient
              colors={['#6ADBCE', '#568CD2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.headerGradient}
            />
            
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIconContainer}>
                  <LinearGradient
                    colors={['#6ADBCE', '#568CD2']}
                    style={styles.headerIcon}
                  >
                    <Ionicons name="color-palette" size={20} color="#fff" />
                  </LinearGradient>
                </View>
                <Text style={styles.headerTitle}>Friend Card Theme</Text>
              </View>
              
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading themes...</Text>
              </View>
            ) : ownedThemes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="color-palette-outline" size={48} color="#6b7280" />
                <Text style={styles.emptyText}>No themes available</Text>
              </View>
            ) : (
              <View style={styles.themesGrid}>
                {ownedThemes.map((themeId) => renderThemePreview(themeId))}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSaveTheme}
              disabled={saving}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={saving ? ['#4b5563', '#374151'] : ['#6ADBCE', '#568CD2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButtonGradient}
              >
                {saving ? (
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
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1a2332',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },

  // Header
  header: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(106, 219, 206, 0.15)',
  },
  headerGradient: {
    height: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
  },
  headerIcon: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Themes Grid
  themesGrid: {
    flex: 1,
  },
  themeCard: {
    backgroundColor: '#0f1419',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  themeCardSelected: {
    borderColor: '#6ADBCE',
    shadowColor: '#6ADBCE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  // Theme Preview
  themePreview: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  themePreviewGradient: {
    width: '100%',
    height: '100%',
  },
  themePreviewSolid: {
    width: '100%',
    height: '100%',
  },
  themeBorder: {
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

  // Theme Info
  themeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  themeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    marginRight: 8,
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  themeDescription: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 18,
  },

  // Loading & Empty States
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },

  // Footer
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
});