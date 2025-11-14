// File: components/Shop/ShopTab.tsx
import { CustomAlertModal } from '@/components/Interface/custom-alert-modal';
import { FRIEND_CARD_THEMES, FriendCardTheme, ThemeRarity } from '@/constants/friend-card-themes';
import { ShopService } from '@/services/shop-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 56) / 2;

type ShopCategory = 'themes' | 'avatars' | 'badges' | 'effects';

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

const CATEGORIES = [
  { id: 'themes' as const, label: 'Themes', icon: 'color-palette' as const },
  { id: 'avatars' as const, label: 'Avatars', icon: 'person-circle' as const },
  { id: 'badges' as const, label: 'Badges', icon: 'ribbon' as const },
  { id: 'effects' as const, label: 'Effects', icon: 'sparkles' as const },
];

const RARITIES: (ThemeRarity | 'all')[] = ['all', 'common', 'rare', 'epic', 'legendary', 'mythic'];

const RARITY_CONFIG = {
  all: { color: '#667eea', label: 'All' },
  common: { color: '#9ca3af', label: 'Common' },
  rare: { color: '#3b82f6', label: 'Rare' },
  epic: { color: '#a855f7', label: 'Epic' },
  legendary: { color: '#fbbf24', label: 'Legendary' },
  mythic: { color: '#f43f5e', label: 'Mythic' },
};

const ShopTab = () => {
  const [category, setCategory] = useState<ShopCategory>('themes');
  const [rarity, setRarity] = useState<ThemeRarity | 'all'>('all');
  const [selected, setSelected] = useState<FriendCardTheme | null>(null);
  const [shards, setShards] = useState(0);
  const [owned, setOwned] = useState<string[]>([]);
  const [active, setActive] = useState('default');
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<AlertState>({
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
    setAlert({
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
    setAlert(prev => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userShards, inventory] = await Promise.all([
        ShopService.getUserShards(),
        ShopService.getUserInventory(),
      ]);
      setShards(userShards);
      setOwned(inventory.ownedThemes);
      setActive(inventory.activeTheme);
    } catch (error) {
      showAlert('error', 'Error', 'Failed to load shop data');
    } finally {
      setLoading(false);
    }
  };

  const themes = Object.values(FRIEND_CARD_THEMES).filter(
    t => rarity === 'all' || t.rarity === rarity
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Cosmic Shop</Text>
          <Text style={styles.subtitle}>Customize your journey</Text>
        </View>
        <View style={styles.shards}>
          <Ionicons name="diamond" size={18} color="#fbbf24" />
          <Text style={styles.shardsText}>{shards}</Text>
        </View>
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={c => c.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setCategory(item.id)}>
              <View style={[styles.category, category === item.id && styles.categoryActive]}>
                {category === item.id && (
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                )}
                <Ionicons
                  name={item.icon}
                  size={16}
                  color={category === item.id ? '#fff' : '#888'}
                />
                <Text style={[styles.categoryText, category === item.id && styles.categoryTextActive]}>
                  {item.label}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Content */}
      {category === 'themes' ? (
        <>
          {/* Rarity Filters */}
          <View style={styles.filtersContainer}>
            <FlatList
              horizontal
              data={RARITIES}
              keyExtractor={r => r}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersContent}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => setRarity(item)}>
                  <View
                    style={[
                      styles.filter,
                      rarity === item && {
                        backgroundColor: RARITY_CONFIG[item].color + '20',
                        borderColor: RARITY_CONFIG[item].color,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        rarity === item && { color: RARITY_CONFIG[item].color },
                      ]}
                    >
                      {RARITY_CONFIG[item].label}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>

          {/* Themes Grid */}
          <FlatList
            data={themes}
            keyExtractor={t => t.id}
            numColumns={2}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <ThemeCard
                theme={item}
                owned={owned.includes(item.id)}
                active={active === item.id}
                onPress={() => setSelected(item)}
              />
            )}
          />
        </>
      ) : (
        <View style={styles.comingSoon}>
          <Ionicons name={CATEGORIES.find(c => c.id === category)?.icon || 'cube'} size={64} color="#555" />
          <Text style={styles.comingSoonTitle}>Coming Soon</Text>
          <Text style={styles.comingSoonText}>This feature is under development</Text>
        </View>
      )}

      {/* Modal */}
      {selected && (
        <ThemeModal
          theme={selected}
          owned={owned.includes(selected.id)}
          active={active === selected.id}
          shards={shards}
          onClose={() => setSelected(null)}
          onSuccess={loadData}
        />
      )}

      {/* Custom Alert Modal */}
      <CustomAlertModal
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        buttons={alert.buttons}
        onClose={closeAlert}
      />
    </View>
  );
};

interface ThemeCardProps {
  theme: FriendCardTheme;
  owned: boolean;
  active: boolean;
  onPress: () => void;
}

const ThemeCard: React.FC<ThemeCardProps> = ({ theme, owned, active, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.cardWrapper}>
    <View style={styles.card}>
      {theme.gradientColors ? (
        <LinearGradient
          colors={theme.gradientColors as any}
          style={styles.cardPreview}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      ) : (
        <View style={[styles.cardPreview, { backgroundColor: theme.backgroundColor }]} />
      )}

      {/* Badges */}
      {active && (
        <View style={styles.activeBadge}>
          <Ionicons name="checkmark-circle" size={18} color="#10b981" />
        </View>
      )}
      {owned && !active && (
        <View style={[styles.badge, { backgroundColor: '#3b82f6' }]}>
          <Ionicons name="checkmark" size={14} color="#fff" />
        </View>
      )}
      {theme.animated && !owned && (
        <View style={[styles.badge, { backgroundColor: '#fbbf24' }]}>
          <Ionicons name="flash" size={12} color="#fff" />
        </View>
      )}

      {/* Rarity */}
      <View style={[styles.rarityBadge, { backgroundColor: RARITY_CONFIG[theme.rarity].color }]}>
        <Text style={styles.rarityText}>{theme.rarity[0].toUpperCase()}</Text>
      </View>
    </View>

    <View style={styles.cardInfo}>
      <Text style={styles.cardName} numberOfLines={1}>
        {theme.name}
      </Text>
      {!owned ? (
        <View style={styles.price}>
          <Ionicons name="diamond" size={12} color="#fbbf24" />
          <Text style={styles.priceText}>{theme.price}</Text>
        </View>
      ) : (
        <Text style={styles.ownedText}>{active ? 'Active' : 'Owned'}</Text>
      )}
    </View>
  </TouchableOpacity>
);

interface ThemeModalProps {
  theme: FriendCardTheme;
  owned: boolean;
  active: boolean;
  shards: number;
  onClose: () => void;
  onSuccess: () => void;
}

const ThemeModal: React.FC<ThemeModalProps> = ({ theme, owned, active, shards, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(300));
  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });
  const canAfford = shards >= theme.price;

  const showAlert = (
    type: 'info' | 'success' | 'error' | 'warning',
    title: string,
    message: string,
    buttons?: AlertState['buttons']
  ) => {
    setAlert({
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
    setAlert(prev => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const handlePurchase = async () => {
    if (theme.price === 0 || owned) {
      handleActivate();
      return;
    }

    try {
      setLoading(true);
      const result = await ShopService.purchaseTheme(theme.id, theme.price);
      if (result.success) {
        showAlert(
          'success',
          'Success! ✨',
          result.message,
          [
            {
              text: 'OK',
              onPress: () => {
                closeAlert();
                onSuccess();
                handleClose();
              },
              style: 'primary',
            },
          ]
        );
      } else {
        showAlert('error', 'Failed', result.message);
      }
    } catch (error) {
      showAlert('error', 'Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    try {
      setLoading(true);
      const result = await ShopService.setActiveTheme(theme.id);
      if (result.success) {
        showAlert(
          'success',
          'Activated! ✨',
          result.message,
          [
            {
              text: 'OK',
              onPress: () => {
                closeAlert();
                onSuccess();
                handleClose();
              },
              style: 'primary',
            },
          ]
        );
      } else {
        showAlert('error', 'Error', result.message);
      }
    } catch (error) {
      showAlert('error', 'Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const buttonText = active ? 'Active' : owned ? 'Use Theme' : theme.price === 0 ? 'Get Free' : 'Purchase';
  const disabled = active || (!owned && !canAfford);

  return (
    <>
      <Modal visible animationType="none" transparent onRequestClose={handleClose}>
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} activeOpacity={1} />
          
          <Animated.View style={[styles.modal, { transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.modalHandle} />
            
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Preview */}
            <View style={styles.modalPreview}>
              {theme.gradientColors ? (
                <LinearGradient
                  colors={theme.gradientColors as any}
                  style={styles.modalPreviewInner}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              ) : (
                <View style={[styles.modalPreviewInner, { backgroundColor: theme.backgroundColor }]} />
              )}
              {active && (
                <View style={styles.modalActiveBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text style={styles.modalActiveBadgeText}>Active</Text>
                </View>
              )}
            </View>

            {/* Details */}
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{theme.name}</Text>
                <View style={[styles.modalRarity, { backgroundColor: RARITY_CONFIG[theme.rarity].color }]}>
                  <Text style={styles.modalRarityText}>{theme.rarity.toUpperCase()}</Text>
                </View>
              </View>

              <Text style={styles.modalDesc}>{theme.description}</Text>

              {/* Features */}
              <View style={styles.features}>
                {theme.animated && (
                  <View style={styles.feature}>
                    <Ionicons name="flash" size={14} color="#fbbf24" />
                    <Text style={styles.featureText}>Animated</Text>
                  </View>
                )}
                {theme.borderGlow && (
                  <View style={styles.feature}>
                    <Ionicons name="sparkles" size={14} color="#a855f7" />
                    <Text style={styles.featureText}>Glow</Text>
                  </View>
                )}
                {theme.particles && (
                  <View style={styles.feature}>
                    <Ionicons name="water" size={14} color="#3b82f6" />
                    <Text style={styles.featureText}>Particles</Text>
                  </View>
                )}
              </View>

              {/* Price */}
              {!owned && (
                <View style={styles.modalPrice}>
                  <Ionicons name="diamond" size={22} color="#fbbf24" />
                  <Text style={styles.modalPriceValue}>{theme.price}</Text>
                  <Text style={styles.modalPriceLabel}>Shards</Text>
                </View>
              )}

              {/* Warning */}
              {!owned && !canAfford && theme.price > 0 && (
                <View style={styles.warning}>
                  <Ionicons name="warning" size={16} color="#f59e0b" />
                  <Text style={styles.warningText}>Need {theme.price - shards} more shards</Text>
                </View>
              )}

              {/* Button */}
              <TouchableOpacity
                style={[styles.button, disabled && styles.buttonDisabled]}
                onPress={owned ? handleActivate : handlePurchase}
                disabled={loading || disabled}
              >
                <LinearGradient
                  colors={disabled ? ['#555', '#444'] : ['#667eea', '#764ba2']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>{buttonText}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Custom Alert Modal */}
      <CustomAlertModal
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        buttons={alert.buttons}
        onClose={closeAlert}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Montserrat',
    fontSize: 14,
    color: '#888',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontFamily: 'Montserrat',
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontFamily: 'Montserrat',
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  shards: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  shardsText: {
    fontFamily: 'Montserrat',
    fontSize: 15,
    fontWeight: '700',
    color: '#fbbf24',
  },
  categoriesContainer: {
    marginBottom: 12,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  category: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  categoryActive: {
    borderColor: 'rgba(102, 126, 234, 0.5)',
  },
  categoryText: {
    fontFamily: 'Montserrat',
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  filtersContainer: {
    marginBottom: 8,
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filter: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterText: {
    fontFamily: 'Montserrat',
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
  },
  grid: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
  card: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardPreview: {
    flex: 1,
  },
  activeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 10,
    padding: 5,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 10,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rarityBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rarityText: {
    fontFamily: 'Montserrat',
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  cardInfo: {
    marginTop: 8,
  },
  cardName: {
    fontFamily: 'Montserrat',
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 3,
  },
  price: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceText: {
    fontFamily: 'Montserrat',
    fontSize: 12,
    fontWeight: '700',
    color: '#fbbf24',
  },
  ownedText: {
    fontFamily: 'Montserrat',
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  comingSoon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  comingSoonTitle: {
    fontFamily: 'Montserrat',
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
  },
  comingSoonText: {
    fontFamily: 'Montserrat',
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  modal: {
    backgroundColor: '#1a2f4f',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPreview: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalPreviewInner: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalActiveBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  modalActiveBadgeText: {
    fontFamily: 'Montserrat',
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  modalContent: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontFamily: 'Montserrat',
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  modalRarity: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  modalRarityText: {
    fontFamily: 'Montserrat',
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  modalDesc: {
    fontFamily: 'Montserrat',
    fontSize: 14,
    color: '#aaa',
    lineHeight: 20,
    marginBottom: 16,
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureText: {
    fontFamily: 'Montserrat',
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  modalPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    marginBottom: 12,
  },
  modalPriceValue: {
    fontFamily: 'Montserrat',
    fontSize: 26,
    fontWeight: '700',
    color: '#fbbf24',
  },
  modalPriceLabel: {
    fontFamily: 'Montserrat',
    fontSize: 13,
    fontWeight: '600',
    color: '#fbbf24',
    opacity: 0.8,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 12,
  },
  warningText: {
    fontFamily: 'Montserrat',
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
  },
  button: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: 'Montserrat',
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});

export default ShopTab;