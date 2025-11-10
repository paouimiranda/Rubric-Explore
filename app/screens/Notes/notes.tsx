//notes.tsx - Updated UI with improved search bar and gradient buttons
import CreateNotebookModal from '@/components/Interface/create-notebook-modal';
import { CustomAlertModal } from '@/components/Interface/custom-alert-modal';
import { JoinNoteIconButton } from '@/components/Interface/join-button';
import BottomNavigation from "@/components/Interface/nav-bar";
import { useBacklogLogger } from "@/hooks/useBackLogLogger";
import { BACKLOG_EVENTS } from "@/services/backlogEvents";
import { uploadNotebookCoverImage } from '@/services/image-service';
import { createNotebook, deleteNotebook, getNotebooks } from "@/services/notes-service";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import LottieView from 'lottie-react-native';
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { Notebook, NotebookProperty } from "../../types/notebook";

type ViewMode = 'list' | 'compact' | 'grid';

const { width } = Dimensions.get('window');

export default function NotesHome() { 
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid;
  const lottieRef = useRef<LottieView>(null);
  const { addBacklogEvent } = useBacklogLogger();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string>("All");
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [modalVisible, setModalVisible] = useState(false);

  // Custom Alert Modal states
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    type: 'info' | 'success' | 'error' | 'warning';
    title: string;
    message: string;
    buttons: Array<{
      text: string;
      onPress: () => void;
      style?: 'default' | 'cancel' | 'primary';
    }>;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    buttons: [],
  });

  const availableTags = ["Personal", "School", "Work"];
  
  const tagColors = {
    "All": "#3b82f6",
    "Personal": "#10b981",
    "School": "#f59e0b",
    "Work": "#8b5cf6",
  };

  const defaultCoverImages = [
    { id: 'notebook1', source: require('@/assets/covers/notebook1.jpg'), name: 'Classic Notebook' },
    { id: 'notebook2', source: require('@/assets/covers/notebook2.jpg'), name: 'Modern Blue' },
    { id: 'notebook3', source: require('@/assets/covers/notebook3.jpg'), name: 'Vintage Brown' },
    { id: 'notebook4', source: require('@/assets/covers/notebook4.jpg'), name: 'Minimalist Gray' },
    { id: 'notebook5', source: require('@/assets/covers/notebook5.jpg'), name: 'Colorful Pattern' },
    { id: 'notebook6', source: require('@/assets/covers/notebook6.jpg'), name: 'Nature Green' },
    { id: 'custom', source: null, name: 'Custom URL' },
  ];

  const lightenColor = (color: string, percent: number) => {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
  };

  const darkenColor = (color: string, percent: number) => {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (
      0x1000000 +
      (R > 0 ? R : 0) * 0x10000 +
      (G > 0 ? G : 0) * 0x100 +
      (B > 0 ? B : 0)
    ).toString(16).slice(1);
  };

  // Helper function to show custom alert
  const showAlert = (
    type: 'info' | 'success' | 'error' | 'warning',
    title: string,
    message: string,
    buttons: Array<{
      text: string;
      onPress: () => void;
      style?: 'default' | 'cancel' | 'primary';
    }>
  ) => {
    setAlertConfig({
      visible: true,
      type,
      title,
      message,
      buttons,
    });
  };

  const closeAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };
  
  const fetchNotebooks = async () => {
    if (!uid) return;
    
    try {
      setLoading(true);
      const data = await getNotebooks(uid);
      setNotebooks(data);
    } catch (err) {
      console.error("Error loading notebooks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (uid) {
      fetchNotebooks();
    }
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading && uid) {
        console.log("useFocusEffect: Fetching notebooks for uid:", uid);
        fetchNotebooks();
      }
    }, [uid, authLoading])
  );
  
  if (authLoading) {
    return (
      <LinearGradient
        colors={['#0f2c45ff','#324762' ]}
        start={{x: 0, y: 0}}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <View style={styles.lottieContainer}>
              <LottieView
                ref={lottieRef}
                source={require('@/assets/animations/quiz-loading.json')}
                autoPlay
                loop
                style={styles.lottieAnimation}
              />
            </View>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!user || !uid) {
    return (
      <LinearGradient
        colors={['#0f2c45ff','#324762' ]}
        start={{x: 0, y: 0}}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <View style={styles.errorCircle}>
              <Ionicons name="lock-closed-outline" size={48} color="#ef4444" />
            </View>
            <Text style={styles.errorText}>Please log in to view your notebooks</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const handleDeleteNotebook = async (id: string) => {
    if (!uid) return;
    
    showAlert(
      'warning',
      'Delete Notebook',
      'Are you sure you want to delete this notebook? This action cannot be undone.',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => closeAlert()
        },
        {
          text: 'Delete',
          style: 'primary',
          onPress: async () => {
            closeAlert();
            try {
              await deleteNotebook(id, uid);
              fetchNotebooks();
              showAlert(
                'success',
                'Success',
                'Notebook deleted successfully',
                [{ text: 'OK', style: 'primary', onPress: () => closeAlert() }]
              );
              addBacklogEvent(BACKLOG_EVENTS.USER_DELETED_NOTEBOOK, { notebookId: id });
            } catch (err) {
              console.error("Error deleting notebook:", err);
              showAlert(
                'error',
                'Error',
                'Failed to delete notebook. You may not have permission.',
                [{ text: 'OK', style: 'primary', onPress: () => closeAlert() }]
              );
              addBacklogEvent("notebook_deletion_error", { notebookId: id, error: String(err) });
            }
          },
        },
      ]
    );
  };

  const handleCreateNotebook = async (notebookData: {
    title: string;
    description: string;
    coverImage: string;
    color: string;
    properties: NotebookProperty[];
    tags: string[];
    isPublic: boolean;
  }) => {
    if (!uid) return;
    setCreating(true);
    
    try {
      let finalCoverImage = notebookData.coverImage;
      
      // If it's a local file (custom upload), upload it to Firebase first
      if (notebookData.coverImage.startsWith('file://')) {
        const tempId = `temp_${Date.now()}`;
        const uploadResult = await uploadNotebookCoverImage(
          tempId, 
          notebookData.coverImage, 
          uid
        );
        finalCoverImage = uploadResult.url;
      }
      
      // Create notebook with the final cover image URL
      const docId = await createNotebook(
        { ...notebookData, coverImage: finalCoverImage }, 
        uid
      );
      
      setModalVisible(false);
      router.push({
        pathname: "./notebook-screen",
        params: { notebookId: docId },
      });
      addBacklogEvent(BACKLOG_EVENTS.USER_CREATED_NOTEBOOK, { notebookId: docId, title: notebookData.title });
    } catch (err) {
      console.error("Error creating notebook:", err);
      showAlert(
        'error',
        'Error',
        'Failed to create notebook. Please try again.',
        [{ text: 'OK', style: 'primary', onPress: () => closeAlert() }]
      );
      addBacklogEvent("notebook_creation_error", { title: notebookData.title, error: String(err) });
    } finally {
      setCreating(false);
    }
  };

  const getCoverImageSource = (coverImage?: string) => {
    if (!coverImage) return null;
    
    const defaultImage = defaultCoverImages.find(img => img.id === coverImage);
    if (defaultImage && defaultImage.source) {
      return defaultImage.source;
    }
    
    if (coverImage.startsWith('http')) {
      return { uri: coverImage };
    }
    
    return null;
  };

  const cycleViewMode = () => {
    setViewMode(current => {
      if (current === 'list') return 'compact';
      if (current === 'compact') return 'grid';
      return 'list';
    });
  };

  const getViewIcon = () => {
    switch (viewMode) {
      case 'list': return 'list';
      case 'compact': return 'reorder-four';
      case 'grid': return 'grid';
    }
  };

  // Animated Notebook Card Component
  const AnimatedNotebookCard = ({ item, index }: { item: Notebook; index: number }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      scaleAnim.setValue(0.9);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          delay: index * 50,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          delay: index * 50,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          delay: index * 50,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }, [viewMode]);

    const animatedStyle = {
      opacity: fadeAnim,
      transform: [
        { translateY: slideAnim },
        { scale: scaleAnim },
      ],
    };

    const primaryProperty = item.properties?.[0];
    const coverImageSource = getCoverImageSource(item.coverImage);
    const notebookColor = item.color || "#3b82f6";
    const lighterColor = lightenColor(notebookColor, 40);
    const darkerColor = darkenColor(notebookColor, 20);

    // LIST VIEW
    if (viewMode === 'list') {
      return (
        <Animated.View style={animatedStyle}>
          <TouchableOpacity
            style={styles.listCardContainer}
            onPress={() =>
              router.push({ pathname: "./notebook-screen", params: { notebookId: item.id } })
            }
            onLongPress={() => handleDeleteNotebook(item.id!)}
          >
            {/* Top gradient strip */}
            <LinearGradient
              colors={[notebookColor, lighterColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.listTopStrip}
            />
            
            {/* Cover Image */}
            {coverImageSource ? (
              <View style={styles.listCoverContainer}>
                <Image source={coverImageSource} style={styles.listCover} />
                <View style={styles.listCoverOverlay} />
              </View>
            ) : (
              <View style={[styles.listCoverPlaceholder, { backgroundColor: darkerColor }]}>
                <Ionicons name="book-outline" size={36} color="#ffffff" />
              </View>
            )}

            {item.isPublic && (
              <View style={styles.listPublicBadge}>
                <Ionicons name="globe-outline" size={12} color="#52C72B" />
                <Text style={styles.publicBadgeText}>Public</Text>
              </View>
            )}

            {/* Solid Gradient Content */}
            <LinearGradient
              colors={[darkerColor, notebookColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.listContentGradient}
            >
              <Text style={styles.listTitle} numberOfLines={1}>
                {item.title}
              </Text>
              {primaryProperty && (
                <View style={styles.propertyPill}>
                  <Text style={styles.propertyText}>
                    {primaryProperty.key}: {primaryProperty.value}
                  </Text>
                </View>
              )}
              <Text style={styles.listDate}>{item.createdAt.toLocaleDateString()}</Text>
              
              {item.tags && item.tags.length > 0 && (
                <View style={styles.listTagsContainer}>
                  {item.tags.slice(0, 3).map((tag, index) => (
                    <View 
                      key={index} 
                      style={[
                        styles.listTag, 
                        { backgroundColor: `${tagColors[tag as keyof typeof tagColors] || "#6b7280"}33`,
                          borderColor: tagColors[tag as keyof typeof tagColors] || "#6b7280" }
                      ]}
                    >
                      <Text style={styles.listTagText}>{tag}</Text>
                    </View>
                  ))}
                  {item.tags.length > 3 && (
                    <Text style={styles.moreTagsText}>+{item.tags.length - 3}</Text>
                  )}
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      );
    }

    // COMPACT VIEW
    if (viewMode === 'compact') {
      return (
        <Animated.View style={animatedStyle}>
          <TouchableOpacity
            style={styles.compactCardContainer}
            onPress={() =>
              router.push({ pathname: "./notebook-screen", params: { notebookId: item.id } })
            }
            onLongPress={() => handleDeleteNotebook(item.id!)}
          >
            {/* Top gradient strip */}
            <LinearGradient
              colors={[notebookColor, lighterColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.compactTopStrip}
            />
            
            <LinearGradient
              colors={[darkerColor, notebookColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.compactContentGradient}
            >
              <View style={styles.compactCoverWrapper}>
                {coverImageSource ? (
                  <View style={styles.compactCoverContainer}>
                    <Image source={coverImageSource} style={styles.compactCover} />
                    <View style={styles.compactCoverOverlay} />
                  </View>
                ) : (
                  <View style={[styles.compactCoverPlaceholder, { backgroundColor: darkerColor }]}>
                    <Ionicons name="book-outline" size={24} color="#ffffff" />
                  </View>
                )}
                {item.isPublic && (
                  <View style={styles.compactPublicBadge}>
                    <Ionicons name="globe" size={10} color="#52C72B" />
                  </View>
                )}
              </View>
              
              <View style={styles.compactContent}>
                <Text style={styles.compactTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.compactDate}>{item.createdAt.toLocaleDateString()}</Text>
                {item.tags && item.tags.length > 0 && (
                  <View style={styles.compactTags}>
                    {item.tags.slice(0, 3).map((tag, index) => (
                      <View 
                        key={index} 
                        style={[
                          styles.compactTag, 
                          { backgroundColor: `${tagColors[tag as keyof typeof tagColors] || "#6b7280"}33`,
                            borderColor: tagColors[tag as keyof typeof tagColors] || "#6b7280" }
                        ]}
                      >
                        <Text style={styles.compactTagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      );
    }

    // GRID VIEW
    return (
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          style={styles.gridCardContainer}
          onPress={() =>
            router.push({ pathname: "./notebook-screen", params: { notebookId: item.id } })
          }
          onLongPress={() => handleDeleteNotebook(item.id!)}
        >
          {/* Top gradient strip */}
          <LinearGradient
            colors={[notebookColor, lighterColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gridTopStrip}
          />
          
          {/* Cover Image */}
          {coverImageSource ? (
            <View style={styles.gridCoverContainer}>
              <Image source={coverImageSource} style={styles.gridCover} />
              <View style={styles.gridCoverOverlay} />
            </View>
          ) : (
            <View style={[styles.gridCoverPlaceholder, { backgroundColor: darkerColor }]}>
              <Ionicons name="book-outline" size={32} color="#ffffff" />
            </View>
          )}
          
          {item.isPublic && (
            <View style={styles.gridPublicBadge}>
              <Ionicons name="globe-outline" size={10} color="#52C72B" />
            </View>
          )}
          
          {/* Solid Gradient Content */}
          <LinearGradient
            colors={[darkerColor, notebookColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gridContentGradient}
          >
            <Text style={styles.gridTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.gridDate}>{item.createdAt.toLocaleDateString()}</Text>
            {item.tags && item.tags.length > 0 && (
              <View style={styles.gridTagsContainer}>
                {item.tags.slice(0, 2).map((tag, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.gridTag, 
                      { backgroundColor: tagColors[tag as keyof typeof tagColors] || "#6b7280" }
                    ]}
                  />
                ))}
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const filtered = notebooks.filter((n) => {
    const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase());
    if (activeTag === "All") {
      return matchesSearch;
    }
    return matchesSearch && n.tags?.includes(activeTag);
  });

  return (
    <LinearGradient
      colors={['#0f2c45ff','#324762' ]}
      start={{x: 0, y: 0}}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1}}>
      <SafeAreaView style={styles.container}>
        <FlatList
          data={filtered}
          renderItem={({ item, index }) => <AnimatedNotebookCard item={item} index={index} />}
          keyExtractor={(item) => item.id!}
          key={viewMode}
          numColumns={viewMode === 'grid' ? 2 : 1}
          contentContainerStyle={{ 
            padding: '4%', 
            paddingBottom: 120,
          }}
          columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
          ListHeaderComponent={
            <>
              <View style={styles.searchRow}>
                {/* Enhanced Search Container with Gradient Border */}
                <View style={styles.searchOuterContainer}>
                  <LinearGradient
                    colors={['#ec4899', '#f472b6', '#fb7185']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.searchGradientBorder}
                  >
                    <View style={styles.searchInnerContainer}>
                      <Ionicons name="search" size={20} color="#f472b6" style={styles.searchIcon} />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Search"
                        placeholderTextColor="#6b7280"
                        value={search}
                        onChangeText={setSearch}
                      />
                      {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                          <Ionicons name="close-circle" size={20} color="#6b7280" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </LinearGradient>
                </View>
                
                {/* View Toggle Button with Gradient */}
                <TouchableOpacity 
                  style={styles.actionButtonContainer}
                  onPress={cycleViewMode}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#f59e0b', '#fbbf24']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionButton}
                  >
                    <Ionicons name={getViewIcon()} size={22} color="#ffffff" />
                  </LinearGradient>
                </TouchableOpacity>
                
                {/* Join Note Button with Gradient */}
                <View style={styles.actionButtonContainer}>
                  <LinearGradient
                    colors={['#8b5cf6', '#a78bfa']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionButton}
                  >
                    <JoinNoteIconButton 
                      style={styles.joinButtonOverride}
                      onNoteJoined={(noteId, permission) => {
                        // Handle successful join
                      }}
                    />
                  </LinearGradient>
                </View>
              </View>
              
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tagsRow}
                contentContainerStyle={{ paddingHorizontal: 16 }}
              >
                {["All", ...availableTags].map((tag) => {
                  const active = activeTag === tag;
                  const tagColor = tagColors[tag as keyof typeof tagColors];
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.tagChip,
                        active 
                          ? { backgroundColor: tagColor, borderColor: tagColor }
                          : { backgroundColor: "transparent", borderColor: tagColor }
                      ]}
                      onPress={() => setActiveTag(tag)}
                    >
                      <Text style={[
                        styles.tagText, 
                        active 
                          ? styles.tagTextActive 
                          : { color: tagColor }
                      ]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="book-outline" size={64} color="#4b5563" />
                <Text style={styles.emptyText}>No notebooks yet</Text>
                <Text style={styles.emptySubtext}>
                  Tap the + button to create your first notebook
                </Text>
              </View>
            ) : null
          }
        />

        {/* FAB with Gradient */}
        <TouchableOpacity 
          style={styles.fabContainer} 
          onPress={() => setModalVisible(true)}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#14b8a6', '#10b981', '#84cc16', '#facc15']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fab}
          >
            <Ionicons name="add" size={32} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>
        
        <BottomNavigation/>
        
        {/* Create Notebook Modal */}
        <CreateNotebookModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onCreate={handleCreateNotebook}
          creating={creating}
          userId={uid}
        />

        {/* Custom Alert Modal */}
        <CustomAlertModal
          visible={alertConfig.visible}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={closeAlert}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  headerSection: {
    backgroundColor: 'transparent',
    paddingBottom: 8,
  },

  // IMPROVED SEARCH BAR STYLES
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    gap: 10,
  },
  searchOuterContainer: {
    flex: 1,
  },
  searchGradientBorder: {
    borderRadius: 14,
    padding: 2,
    shadowColor: "#ec4899",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  searchInnerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: { 
    marginRight: 10,
  },
  searchInput: { 
    flex: 1, 
    color: "#ffffff", 
    fontSize: 15,
    fontWeight: '500',
  },

  // ACTION BUTTONS (View Toggle & Join Note)
  actionButtonContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  actionButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  joinButtonOverride: {
    backgroundColor: 'transparent',
    width: 48,
    height: 48,
    borderRadius: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  tagsRow: { marginBottom: 8 },
  tagChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 2,
    marginBottom: '1%'
  },
  tagText: { fontSize: 14, fontWeight: "500" },
  tagTextActive: { color: "#ffffff" },

  gridRow: {
    justifyContent: "space-between"
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: { fontSize: 20, fontWeight: "bold", color: "#9ca3af", marginTop: 16 },
  emptySubtext: { fontSize: 14, color: "#6b7280", marginTop: 8, textAlign: "center" },

  // IMPROVED FAB WITH GRADIENT
  fabContainer: {
    position: "absolute",
    bottom: 100,
    right: 24,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 999,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottieContainer: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  lottieAnimation: {
    width: '100%',
    height: '100%',
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '500',
  },
  errorCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 32,
  },
  
  // LIST VIEW STYLES
  listCardContainer: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  listTopStrip: {
    height: 6,
    width: '100%',
  },
  listCoverContainer: {
    width: '100%',
    height: 140,
    position: 'relative',
  },
  listCover: {
    width: '100%',
    height: '100%',
  },
  listCoverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  listCoverPlaceholder: {
    width: '100%',
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listPublicBadge: {
    position: 'absolute',
    top: 18,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(82, 199, 43, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  publicBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  listContentGradient: {
    padding: 16,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  propertyPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  propertyText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  listDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
  },
  listTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  listTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  listTagText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '600',
  },
  moreTagsText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    alignSelf: 'center',
    marginLeft: 4,
  },

  // COMPACT VIEW STYLES
  compactCardContainer: {
    marginBottom: 12,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  compactTopStrip: {
    height: 4,
    width: '100%',
  },
  compactContentGradient: {
    padding: 12,
    flexDirection: 'row',
  },
  compactCoverWrapper: {
    position: 'relative',
  },
  compactCoverContainer: {
    width: 70,
    height: 70,
    borderRadius: 12,
    overflow: 'hidden',
  },
  compactCover: {
    width: '100%',
    height: '100%',
  },
  compactCoverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  compactCoverPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactPublicBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(82, 199, 43, 0.95)',
    borderRadius: 10,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  compactContent: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  compactDate: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 6,
  },
  compactTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  compactTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  compactTagText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
  },

  // GRID VIEW STYLES
  gridCardContainer: {
    width: (width - 48) / 2,
    marginBottom: 16,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  gridTopStrip: {
    height: 5,
    width: '100%',
  },
  gridCoverContainer: {
    width: '100%',
    height: 110,
    position: 'relative',
  },
  gridCover: {
    width: '100%',
    height: '100%',
  },
  gridCoverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  gridCoverPlaceholder: {
    width: '100%',
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridPublicBadge: {
    position: 'absolute',
    top: 13,
    right: 8,
    backgroundColor: 'rgba(82, 199, 43, 0.95)',
    borderRadius: 12,
    padding: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  gridContentGradient: {
    padding: 12,
  },
  gridTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  gridDate: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  gridTagsContainer: {
    flexDirection: 'row',
    gap: 5,
  },
  gridTag: {
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
});