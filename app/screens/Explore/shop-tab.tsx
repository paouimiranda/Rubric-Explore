// File: components/Shop/ShopTab.tsx
import { FRIEND_CARD_THEMES, FriendCardTheme, ThemeRarity } from '@/constants/friend-card-themes';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

// Shop category types (extensible for future items)
type ShopCategory = 'themes' | 'avatars' | 'badges' | 'effects';

interface ShopCategoryConfig {
  id: ShopCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}

const SHOP_CATEGORIES: ShopCategoryConfig[] = [
  {
    id: 'themes',
    label: 'Card Themes',
    icon: 'color-palette',
    description: 'Customize your friend cards',
  },
  {
    id: 'avatars',
    label: 'Avatars',
    icon: 'person-circle',
    description: 'Coming soon!',
  },
  {
    id: 'badges',
    label: 'Badges',
    icon: 'ribbon',
    description: 'Coming soon!',
  },
  {
    id: 'effects',
    label: 'Effects',
    icon: 'sparkles',
    description: 'Coming soon!',
  },
];

// Rarity filter options
const RARITY_FILTERS: (ThemeRarity | 'all')[] = ['all', 'common', 'rare', 'epic', 'legendary', 'mythic'];

const ShopTab = () => {
  const [activeCategory, setActiveCategory] = useState<ShopCategory>('themes');
  const [selectedRarity, setSelectedRarity] = useState<ThemeRarity | 'all'>('all');
  const [selectedTheme, setSelectedTheme] = useState<FriendCardTheme | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleCategoryChange = (category: ShopCategory) => {
    if (category === activeCategory) return;
    
    // Reset animations
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    
    setActiveCategory(category);
    setSelectedTheme(null);
    
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getFilteredThemes = (): FriendCardTheme[] => {
    const themes = Object.values(FRIEND_CARD_THEMES);
    if (selectedRarity === 'all') return themes;
    return themes.filter(theme => theme.rarity === selectedRarity);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Cosmic Shop</Text>
        <Text style={styles.subtitle}>Customize your journey</Text>
      </View>

      {/* Category Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
        style={styles.categoryContainer}
      >
        {SHOP_CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            onPress={() => handleCategoryChange(category.id)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.categoryPill,
                activeCategory === category.id && styles.categoryPillActive,
              ]}
            >
              {activeCategory === category.id && (
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              )}
              <Ionicons
                name={category.icon}
                size={18}
                color={activeCategory === category.id ? '#fff' : '#aaa'}
              />
              <Text
                style={[
                  styles.categoryLabel,
                  activeCategory === category.id && styles.categoryLabelActive,
                ]}
              >
                {category.label}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content Area */}
      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {activeCategory === 'themes' ? (
          <>
            {/* Rarity Filter */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
              style={styles.filterContainer}
            >
              {RARITY_FILTERS.map((rarity) => (
                <TouchableOpacity
                  key={rarity}
                  onPress={() => setSelectedRarity(rarity)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.filterChip,
                      selectedRarity === rarity && styles.filterChipActive,
                      selectedRarity === rarity && rarity !== 'all' && {
                        backgroundColor: getRarityColor(rarity as ThemeRarity) + '30',
                        borderColor: getRarityColor(rarity as ThemeRarity),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterLabel,
                        selectedRarity === rarity && styles.filterLabelActive,
                        selectedRarity === rarity && rarity !== 'all' && {
                          color: getRarityColor(rarity as ThemeRarity),
                        },
                      ]}
                    >
                      {rarity === 'all' ? 'All' : rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Theme Grid */}
            <ScrollView
              style={styles.themeScrollView}
              contentContainerStyle={styles.themeGrid}
              showsVerticalScrollIndicator={false}
            >
              {getFilteredThemes().map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  isSelected={selectedTheme?.id === theme.id}
                  onPress={() => setSelectedTheme(theme)}
                />
              ))}
              
              {/* Spacer */}
              <View style={{ height: 100 }} />
            </ScrollView>
          </>
        ) : (
          // Coming Soon for other categories
          <View style={styles.comingSoonContainer}>
            <Ionicons
              name={SHOP_CATEGORIES.find(c => c.id === activeCategory)?.icon || 'cube'}
              size={80}
              color="#555"
            />
            <Text style={styles.comingSoonTitle}>Coming Soon!</Text>
            <Text style={styles.comingSoonText}>
              {SHOP_CATEGORIES.find(c => c.id === activeCategory)?.description}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Theme Preview Modal (Bottom Sheet) */}
      {selectedTheme && (
        <ThemePreviewModal
          theme={selectedTheme}
          onClose={() => setSelectedTheme(null)}
        />
      )}
    </View>
  );
};

interface ThemeCardProps {
  theme: FriendCardTheme;
  isSelected: boolean;
  onPress: () => void;
}

const ThemeCard: React.FC<ThemeCardProps> = ({ theme, isSelected, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[styles.themeCardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        {/* Theme Preview */}
        <View style={styles.themeCard}>
          {/* Background Gradient Preview */}
          {theme.gradientColors ? (
            <LinearGradient
              colors={theme.gradientColors as any}
              style={styles.themePreview}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          ) : (
            <View style={[styles.themePreview, { backgroundColor: theme.backgroundColor }]} />
          )}

          {/* Animated Badge */}
          {theme.animated && (
            <View style={styles.animatedBadge}>
              <Ionicons name="flash" size={12} color="#fff" />
            </View>
          )}

          {/* Rarity Badge */}
          <LinearGradient
            colors={getRarityGradient(theme.rarity)}
            style={styles.rarityBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.rarityText}>
              {theme.rarity.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
        </View>

        {/* Theme Info */}
        <View style={styles.themeInfo}>
          <Text style={styles.themeName} numberOfLines={1}>
            {theme.name}
          </Text>
          <View style={styles.themePriceRow}>
            <Ionicons name="diamond" size={14} color="#fbbf24" />
            <Text style={styles.themePrice}>{theme.price}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Helper functions at module level
const getRarityColor = (rarity: ThemeRarity): string => {
  switch (rarity) {
    case 'common': return '#9ca3af';
    case 'rare': return '#3b82f6';
    case 'epic': return '#a855f7';
    case 'legendary': return '#fbbf24';
    case 'mythic': return '#f43f5e';
    default: return '#9ca3af';
  }
};

const getRarityGradient = (rarity: ThemeRarity): [string, string] => {
  switch (rarity) {
    case 'common': return ['#9ca3af', '#6b7280'];
    case 'rare': return ['#3b82f6', '#2563eb'];
    case 'epic': return ['#a855f7', '#9333ea'];
    case 'legendary': return ['#fbbf24', '#f59e0b'];
    case 'mythic': return ['#f43f5e', '#e11d48'];
    default: return ['#9ca3af', '#6b7280'];
  }
};

interface ThemePreviewModalProps {
  theme: FriendCardTheme;
  onClose: () => void;
}

const ThemePreviewModal: React.FC<ThemePreviewModalProps> = ({ theme, onClose }) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  return (
    <View style={styles.modalContainer}>
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.modalBackdrop,
          { opacity: backdropAnim },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          onPress={handleClose}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Modal Content */}
      <Animated.View
        style={[
          styles.modalContent,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.modalHandle} />

        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Large Preview */}
          <View style={styles.modalPreviewContainer}>
            {theme.gradientColors ? (
              <LinearGradient
                colors={theme.gradientColors as any}
                style={styles.modalPreview}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            ) : (
              <View style={[styles.modalPreview, { backgroundColor: theme.backgroundColor }]} />
            )}
          </View>

          {/* Theme Details */}
          <View style={styles.modalDetails}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{theme.name}</Text>
              <View
                style={[
                  styles.modalRarityBadge,
                  { backgroundColor: getRarityColor(theme.rarity) },
                ]}
              >
                <Text style={styles.modalRarityText}>
                  {theme.rarity.toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={styles.modalDescription}>{theme.description}</Text>

            {/* Features */}
            <View style={styles.featuresContainer}>
              {theme.animated && (
                <View style={styles.featureChip}>
                  <Ionicons name="flash" size={14} color="#fbbf24" />
                  <Text style={styles.featureText}>Animated</Text>
                </View>
              )}
              {theme.borderGlow && (
                <View style={styles.featureChip}>
                  <Ionicons name="sparkles" size={14} color="#a855f7" />
                  <Text style={styles.featureText}>Glow Effect</Text>
                </View>
              )}
              {theme.particles && (
                <View style={styles.featureChip}>
                  <Ionicons name="water" size={14} color="#3b82f6" />
                  <Text style={styles.featureText}>Particles</Text>
                </View>
              )}
            </View>

            {/* Price & Purchase */}
            <View style={styles.purchaseContainer}>
              <View style={styles.priceContainer}>
                <Ionicons name="diamond" size={24} color="#fbbf24" />
                <Text style={styles.modalPrice}>{theme.price}</Text>
                <Text style={styles.modalPriceLabel}>Shards</Text>
              </View>

              <TouchableOpacity
                style={styles.purchaseButton}
                onPress={() => {
                  // TODO: Implement purchase logic
                  console.log('Purchase theme:', theme.id);
                }}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.purchaseButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.purchaseButtonText}>
                    {theme.price === 0 ? 'Use Theme' : 'Purchase'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Montserrat',
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Montserrat',
    fontSize: 15,
    color: '#aaa',
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryScroll: {
    paddingHorizontal: 24,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
    overflow: 'hidden',
  },
  categoryPillActive: {
    borderColor: 'rgba(102, 126, 234, 0.5)',
  },
  categoryLabel: {
    fontFamily: 'Montserrat',
    fontSize: 13,
    fontWeight: '600',
    color: '#aaa',
  },
  categoryLabelActive: {
    color: '#fff',
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterScroll: {
    paddingHorizontal: 24,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    borderColor: '#667eea',
  },
  filterLabel: {
    fontFamily: 'Montserrat',
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
  },
  filterLabelActive: {
    color: '#667eea',
    fontWeight: '700',
  },
  themeScrollView: {
    flex: 1,
  },
  themeGrid: {
    paddingHorizontal: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  themeCardWrapper: {
    width: (width - 64) / 2,
    marginBottom: 16,
  },
  themeCard: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  themePreview: {
    flex: 1,
  },
  animatedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.9)',
    borderRadius: 10,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rarityBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rarityText: {
    fontFamily: 'Montserrat',
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  themeInfo: {
    marginTop: 8,
  },
  themeName: {
    fontFamily: 'Montserrat',
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  themePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  themePrice: {
    fontFamily: 'Montserrat',
    fontSize: 12,
    fontWeight: '700',
    color: '#fbbf24',
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  comingSoonTitle: {
    fontFamily: 'Montserrat',
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  comingSoonText: {
    fontFamily: 'Montserrat',
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  modalContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: '#1a2f4f',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPreviewContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  modalPreview: {
    width: '100%',
    height: 200,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalDetails: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: 'Montserrat',
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  modalRarityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  modalRarityText: {
    fontFamily: 'Montserrat',
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  modalDescription: {
    fontFamily: 'Montserrat',
    fontSize: 14,
    color: '#aaa',
    marginBottom: 20,
    lineHeight: 20,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureText: {
    fontFamily: 'Montserrat',
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  purchaseContainer: {
    gap: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  modalPrice: {
    fontFamily: 'Montserrat',
    fontSize: 28,
    fontWeight: '700',
    color: '#fbbf24',
  },
  modalPriceLabel: {
    fontFamily: 'Montserrat',
    fontSize: 14,
    fontWeight: '600',
    color: '#fbbf24',
    opacity: 0.8,
  },
  purchaseButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  purchaseButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  purchaseButtonText: {
    fontFamily: 'Montserrat',
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

export default ShopTab;