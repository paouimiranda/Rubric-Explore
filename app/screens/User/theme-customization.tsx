// components/Interface/theme-customization-modal.tsx
import { FRIEND_CARD_THEMES, ThemeRarity } from '@/constants/friend-card-themes';
import { db } from '@/firebase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface ThemeCustomizationModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  onThemeChanged?: () => void;
}

const RARITY_COLORS: Record<ThemeRarity, string[]> = {
  common: ['#6b7280', '#9ca3af'],
  rare: ['#3b82f6', '#60a5fa'],
  epic: ['#8b5cf6', '#a78bfa'],
  legendary: ['#f59e0b', '#fbbf24'],
  mythic: ['#ec4899', '#f472b6'],
};

export default function ThemeCustomizationModal({
  visible,
  onClose,
  userId,
  onThemeChanged,
}: ThemeCustomizationModalProps) {
  const [ownedThemes, setOwnedThemes] = useState<string[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string>('default');
  const [currentTheme, setCurrentTheme] = useState<string>('default');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      loadUserThemes();
    }
  }, [visible, userId]);

  const loadUserThemes = async () => {
    try {
      setLoading(true);
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const owned = userData.inventory?.ownedThemes || ['default'];
        const current = userData.friendCardTheme || userData.inventory?.activeTheme || 'default';
        
        console.log('Loaded themes:', { owned, current });
        
        setOwnedThemes(owned);
        setSelectedTheme(current);
        setCurrentTheme(current);
      } else {
        console.log('User document does not exist');
        setOwnedThemes(['default']);
        setSelectedTheme('default');
        setCurrentTheme('default');
      }
    } catch (error) {
      console.error('Error loading themes:', error);
      Alert.alert('Error', 'Failed to load themes');
      setOwnedThemes(['default']);
      setSelectedTheme('default');
      setCurrentTheme('default');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (selectedTheme === currentTheme) {
      onClose();
      return;
    }

    try {
      setSaving(true);
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        friendCardTheme: selectedTheme,
      });

      setCurrentTheme(selectedTheme);
      Alert.alert('Success', 'Friend card theme updated!');
      onThemeChanged?.();
      onClose();
    } catch (error) {
      console.error('Error saving theme:', error);
      Alert.alert('Error', 'Failed to save theme');
    } finally {
      setSaving(false);
    }
  };

  const renderThemePreview = (themeId: string) => {
    const theme = FRIEND_CARD_THEMES[themeId];
    
    // Safety check - if theme doesn't exist, skip it
    if (!theme) {
      console.warn(`Theme ${themeId} not found in FRIEND_CARD_THEMES`);
      return null;
    }

    const isOwned = ownedThemes.includes(themeId);
    const isSelected = selectedTheme === themeId;
    const isCurrent = currentTheme === themeId;

    return (
      <TouchableOpacity
        key={themeId}
        style={[
          styles.themeCard,
          isSelected && styles.themeCardSelected,
        ]}
        onPress={() => isOwned && setSelectedTheme(themeId)}
        disabled={!isOwned}
        activeOpacity={0.7}
      >
        <View style={styles.themePreview}>
          {theme.gradientColors ? (
            <LinearGradient
              colors={theme.gradientColors as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.themePreviewGradient}
            >
              {!isOwned && (
                <View style={styles.lockedOverlay}>
                  <Ionicons name="lock-closed" size={24} color="#fff" />
                </View>
              )}
            </LinearGradient>
          ) : (
            <View
              style={[
                styles.themePreviewSolid,
                { backgroundColor: theme.backgroundColor || '#1f2937' },
              ]}
            >
              {!isOwned && (
                <View style={styles.lockedOverlay}>
                  <Ionicons name="lock-closed" size={24} color="#fff" />
                </View>
              )}
            </View>
          )}
          
          {theme.borderWidth ? (
            <View
              style={[
                styles.themeBorder,
                {
                  borderColor: theme.borderColor || 'transparent',
                  borderWidth: theme.borderWidth,
                },
              ]}
            />
          ) : null}

          {isSelected && (
            <View style={styles.selectedIndicator}>
              <LinearGradient
                colors={['#6ADBCE', '#568CD2']}
                style={styles.selectedIndicatorGradient}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
              </LinearGradient>
            </View>
          )}

          {isCurrent && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>Current</Text>
            </View>
          )}
        </View>

        <View style={styles.themeInfo}>
          <Text style={styles.themeName} numberOfLines={1}>
            {theme.name}
          </Text>
          
          <LinearGradient
            colors={RARITY_COLORS[theme.rarity] as any}
            style={styles.rarityBadge}
          >
            <Text style={styles.rarityText}>{theme.rarity.toUpperCase()}</Text>
          </LinearGradient>
        </View>

        {!isOwned && theme.price !== undefined && (
          <View style={styles.priceTag}>
            <Ionicons name="diamond" size={12} color="#fbbf24" />
            <Text style={styles.priceText}>{theme.price}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Get available theme IDs
  const themeIds = Object.keys(FRIEND_CARD_THEMES);

  // Debug logging
  console.log('=== THEME DEBUG ===');
  console.log('Loading state:', loading);
  console.log('Total themes in FRIEND_CARD_THEMES:', Object.keys(FRIEND_CARD_THEMES).length);
  console.log('Available theme IDs:', themeIds);
  console.log('Owned themes:', ownedThemes);
  console.log('Selected theme:', selectedTheme);
  console.log('Current theme:', currentTheme);
  console.log('themeIds.length:', themeIds.length);

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
          <LinearGradient
            colors={['#6ADBCE', '#568CD2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.modalHeader}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIconContainer}>
                  <Ionicons name="color-palette" size={24} color="#fff" />
                </View>
                <Text style={styles.modalTitle}>Friend Card Theme</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Theme Grid */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6ADBCE" />
                <Text style={styles.loadingText}>Loading themes...</Text>
              </View>
            ) : (
              <>
                <View style={{ backgroundColor: 'red', padding: 10, marginBottom: 10 }}>
                  <Text style={{ color: 'white' }}>TEST: Can you see this red box?</Text>
                  <Text style={{ color: 'white' }}>Loading: {loading.toString()}</Text>
                  <Text style={{ color: 'white' }}>Themes: {themeIds.length}</Text>
                </View>
                
                <Text style={styles.sectionTitle}>
                  {ownedThemes.length} Theme{ownedThemes.length !== 1 ? 's' : ''} Owned
                </Text>
                
                <Text style={styles.debugText}>
                  Total themes available: {themeIds.length}
                </Text>
                
                {themeIds.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No themes found in config</Text>
                  </View>
                ) : (
                  <View style={styles.themesGrid}>
                    {themeIds.map((themeId) => renderThemePreview(themeId))}
                  </View>
                )}
              </>
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
              style={[
                styles.saveButton,
                (saving || selectedTheme === currentTheme) && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={saving || selectedTheme === currentTheme}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  saving || selectedTheme === currentTheme
                    ? ['#4b5563', '#6b7280']
                    : ['#6ADBCE', '#568CD2']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButtonGradient}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
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
    backgroundColor: '#0f1419',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  debugText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  themesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  themeCard: {
    width: '47%',
    borderRadius: 16,
    backgroundColor: '#1a2332',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  themeCardSelected: {
    borderColor: '#6ADBCE',
    borderWidth: 2,
  },
  themePreview: {
    width: '100%',
    height: 120,
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
    borderRadius: 14,
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
  },
  selectedIndicatorGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(106, 219, 206, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  themeInfo: {
    padding: 12,
    gap: 6,
  },
  themeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.2,
  },
  rarityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rarityText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fbbf24',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    backgroundColor: '#0f1419',
    borderTopWidth: 1,
    borderTopColor: 'rgba(106, 219, 206, 0.1)',
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
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
});