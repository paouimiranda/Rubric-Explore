// components/Profile/ProfileThemeSelector.tsx
import { db } from '@/firebase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
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
import { PROFILE_THEMES, ProfileTheme } from '../../constants/profile-theme';

const { width } = Dimensions.get('window');

interface ProfileThemeSelectorProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  currentThemeId: string;
  onThemeSelected: (themeId: string) => void;
  ownedThemes?: string[]; // List of theme IDs the user owns
}

export default function ProfileThemeSelector({
  visible,
  onClose,
  userId,
  currentThemeId,
  onThemeSelected,
  ownedThemes = ['default'], // Default theme is always owned
}: ProfileThemeSelectorProps) {
  const [loading, setLoading] = useState(false);

  const handleThemeSelect = async (themeId: string) => {
    // Check if user owns this theme
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

      // Update user's selected theme in Firestore
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

  const renderThemeCard = (theme: ProfileTheme) => {
    const isOwned = ownedThemes.includes(theme.id);
    const isSelected = theme.id === currentThemeId;

    return (
      <TouchableOpacity
        key={theme.id}
        style={[
          styles.themeCard,
          isSelected && styles.themeCardSelected,
          !isOwned && styles.themeCardLocked,
        ]}
        onPress={() => handleThemeSelect(theme.id)}
        activeOpacity={0.7}
        disabled={loading}
      >
        <LinearGradient
          colors={theme.gradient.background as any}
          style={styles.themePreview}
        >
          {/* Mini decorative bar */}
          <LinearGradient
            colors={theme.gradient.decorativeBar as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.miniDecorativeBar}
          />

          {/* Theme icon */}
          <View style={styles.themeIconContainer}>
            <Ionicons name={theme.icon as any} size={28} color="#fff" />
          </View>

          {/* Locked overlay */}
          {!isOwned && (
            <View style={styles.lockedOverlay}>
              <Ionicons name="lock-closed" size={24} color="#fff" />
            </View>
          )}

          {/* Selected badge */}
          {isSelected && (
            <View style={styles.selectedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#52c72b" />
            </View>
          )}

          {/* Particle indicator */}
          {theme.hasParticles && (
            <View style={styles.featureBadge}>
              <Ionicons name="sparkles" size={12} color="#ffd700" />
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
                styles.rarityBadge,
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
              <View>
                <Text style={styles.modalTitle}>Profile Themes</Text>
                <Text style={styles.modalSubtitle}>
                  Customize your profile appearance
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                disabled={loading}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Themes Grid */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.themesGrid}
            showsVerticalScrollIndicator={false}
          >
            {Object.values(PROFILE_THEMES).map(renderThemeCard)}
          </ScrollView>

          {/* Info Footer */}
          <View style={styles.infoFooter}>
            <Ionicons name="information-circle" size={16} color="#6ADBCE" />
            <Text style={styles.infoText}>
              Unlock new themes by completing achievements and challenges!
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0f1419',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
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
    backgroundColor: 'rgba(106, 219, 206, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  themesGrid: {
    padding: 20,
    paddingTop: 12,
    gap: 16,
  },
  themeCard: {
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
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  themeCardLocked: {
    opacity: 0.6,
  },
  themePreview: {
    height: 120,
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
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 4,
  },
  featureBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 6,
  },
  themeInfo: {
    padding: 16,
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  themeName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.2,
  },
  rarityBadge: {
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
  themeDescription: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 18,
  },
  infoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(106, 219, 206, 0.05)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(106, 219, 206, 0.1)',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#6ADBCE',
    lineHeight: 16,
  },
});