// notes.tsx - Refined and Restructured UI - COMPLETE VERSION
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
  Dimensions,
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { Notebook, NotebookProperty } from "../../types/notebook";

type ViewMode = 'list' | 'compact' | 'grid';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 20;
const GRID_CARD_WIDTH = (width - (CARD_MARGIN * 3)) / 2;

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
        colors={['#0f172a','#1e293b' ]}
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
        colors={['#0f172a','#1e293b' ]}
        start={{x: 0, y: 0}}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <View style={styles.errorCircle}>
              <Ionicons name="lock-closed-outline" size={56} color="#ef4444" />
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
      
      if (notebookData.coverImage.startsWith('file://')) {
        const tempId = `temp_${Date.now()}`;
        const uploadResult = await uploadNotebookCoverImage(
          tempId, 
          notebookData.coverImage, 
          uid
        );
        finalCoverImage = uploadResult.url;
      }
      
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

  const NotebookCard = ({ item }: { item: Notebook }) => {
    const primaryProperty = item.properties?.[0];
    const coverImageSource = getCoverImageSource(item.coverImage);
    const notebookColor = item.color || "#3b82f6";
    const lighterColor = lightenColor(notebookColor, 35);
    const darkerColor = darkenColor(notebookColor, 18);

    if (viewMode === 'list') {
      return (
        <View style={styles.listCardWrapper}>
          <TouchableOpacity
            style={styles.listCardContainer}
            onPress={() =>
              router.push({ pathname: "./notebook-screen", params: { notebookId: item.id } })
            }
            onLongPress={() => handleDeleteNotebook(item.id!)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[notebookColor, lighterColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.listTopAccent}
            />
            
            {coverImageSource ? (
              <View style={styles.listCoverContainer}>
                <Image source={coverImageSource} style={styles.listCover} />
                <LinearGradient
                  colors={['transparent', 'rgba(15, 23, 42, 0.6)', 'rgba(15, 23, 42, 0.9)']}
                  style={styles.listCoverGradient}
                />
              </View>
            ) : (
              <LinearGradient
                colors={[darkerColor, notebookColor]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.listCoverPlaceholder}
              >
                <Ionicons name="book" size={48} color="rgba(255,255,255,0.9)" />
              </LinearGradient>
            )}

            {item.isPublic && (
              <View style={styles.listPublicBadge}>
                <Ionicons name="globe" size={14} color="#ffffff" />
                <Text style={styles.publicBadgeText}>Public</Text>
              </View>
            )}

            <LinearGradient
              colors={[darkerColor, notebookColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.listContent}
            >
              <Text style={styles.listTitle} numberOfLines={2}>
                {item.title}
              </Text>
              
              {primaryProperty && (
                <View style={styles.propertyChip}>
                  <Ionicons name="pricetag" size={12} color="#ffffff" />
                  <Text style={styles.propertyText}>
                    {primaryProperty.key}: {primaryProperty.value}
                  </Text>
                </View>
              )}
              
              <View style={styles.listMetaRow}>
                <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.7)" />
                <Text style={styles.listDate}>
                  {item.createdAt.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </Text>
              </View>
              
              {item.tags && item.tags.length > 0 && (
                <View style={styles.listTagsContainer}>
                  {item.tags.slice(0, 3).map((tag, index) => (
                    <View 
                      key={index} 
                      style={[
                        styles.listTag, 
                        { 
                          backgroundColor: `${tagColors[tag as keyof typeof tagColors] || "#6b7280"}30`,
                          borderColor: `${tagColors[tag as keyof typeof tagColors] || "#6b7280"}80`
                        }
                      ]}
                    >
                      <Text style={styles.listTagText}>{tag}</Text>
                    </View>
                  ))}
                  {item.tags.length > 3 && (
                    <View style={styles.moreTagsBadge}>
                      <Text style={styles.moreTagsText}>+{item.tags.length - 3}</Text>
                    </View>
                  )}
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }

    if (viewMode === 'compact') {
      return (
        <View style={styles.compactCardWrapper}>
          <TouchableOpacity
            style={styles.compactCardContainer}
            onPress={() =>
              router.push({ pathname: "./notebook-screen", params: { notebookId: item.id } })
            }
            onLongPress={() => handleDeleteNotebook(item.id!)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[notebookColor, lighterColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.compactTopAccent}
            />
            
            <LinearGradient
              colors={[darkerColor, notebookColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.compactContent}
            >
              <View style={styles.compactCoverWrapper}>
                {coverImageSource ? (
                  <View style={styles.compactCoverContainer}>
                    <Image source={coverImageSource} style={styles.compactCover} />
                    <View style={styles.compactCoverOverlay} />
                  </View>
                ) : (
                  <LinearGradient
                    colors={[darkenColor(notebookColor, 25), darkerColor]}
                    style={styles.compactCoverPlaceholder}
                  >
                    <Ionicons name="book" size={28} color="rgba(255,255,255,0.9)" />
                  </LinearGradient>
                )}
                {item.isPublic && (
                  <View style={styles.compactPublicBadge}>
                    <Ionicons name="globe" size={11} color="#ffffff" />
                  </View>
                )}
              </View>
              
              <View style={styles.compactTextContent}>
                <Text style={styles.compactTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={styles.compactMetaRow}>
                  <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.65)" />
                  <Text style={styles.compactDate}>
                    {item.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                {item.tags && item.tags.length > 0 && (
                  <View style={styles.compactTags}>
                    {item.tags.slice(0, 2).map((tag, index) => (
                      <View 
                        key={index} 
                        style={[
                          styles.compactTag, 
                          { 
                            backgroundColor: `${tagColors[tag as keyof typeof tagColors] || "#6b7280"}30`,
                            borderColor: `${tagColors[tag as keyof typeof tagColors] || "#6b7280"}80`
                          }
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
        </View>
      );
    }

    return (
      <View style={styles.gridCardWrapper}>
        <TouchableOpacity
          style={styles.gridCardContainer}
          onPress={() =>
            router.push({ pathname: "./notebook-screen", params: { notebookId: item.id } })
          }
          onLongPress={() => handleDeleteNotebook(item.id!)}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[notebookColor, lighterColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gridTopAccent}
          />
          
          {coverImageSource ? (
            <View style={styles.gridCoverContainer}>
              <Image source={coverImageSource} style={styles.gridCover} />
              <LinearGradient
                colors={['transparent', 'rgba(15, 23, 42, 0.5)']}
                style={styles.gridCoverGradient}
              />
            </View>
          ) : (
            <LinearGradient
              colors={[darkerColor, notebookColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gridCoverPlaceholder}
            >
              <Ionicons name="book" size={36} color="rgba(255,255,255,0.9)" />
            </LinearGradient>
          )}
          
          {item.isPublic && (
            <View style={styles.gridPublicBadge}>
              <Ionicons name="globe" size={11} color="#ffffff" />
            </View>
          )}
          
          <LinearGradient
            colors={[darkerColor, notebookColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gridContent}
          >
            <Text style={styles.gridTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.gridMetaRow}>
              <Ionicons name="calendar-outline" size={11} color="rgba(255,255,255,0.7)" />
              <Text style={styles.gridDate}>
                {item.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
            {item.tags && item.tags.length > 0 && (
              <View style={styles.gridTagDots}>
                {item.tags.slice(0, 3).map((tag, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.gridTagDot, 
                      { backgroundColor: tagColors[tag as keyof typeof tagColors] || "#6b7280" }
                    ]}
                  />
                ))}
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
      colors={['#0f172a','#1e293b' ]}
      start={{x: 0, y: 0}}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1}}>
      <SafeAreaView style={styles.container}>
        <FlatList
          data={filtered}
          renderItem={({ item }) => <NotebookCard item={item} />}
          keyExtractor={(item) => item.id!}
          key={viewMode}
          numColumns={viewMode === 'grid' ? 2 : 1}
          contentContainerStyle={{ 
            paddingHorizontal: CARD_MARGIN, 
            paddingBottom: 140,
            paddingTop: 8,
          }}
          columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.headerContainer}>
              <View style={styles.titleSection}>
                <View style={styles.titleRow}>
                  <View style={styles.titleTextContainer}>
                    <Text style={styles.mainTitle} adjustsFontSizeToFit numberOfLines={1}>My Notebooks</Text>
                    <Text style={styles.subtitle} adjustsFontSizeToFit numberOfLines={1}>Organize your thoughts and ideas</Text>
                  </View>
                  
                  <View style={styles.headerButtons}>
                    <View style={styles.actionButtonWrapper}>
                      <LinearGradient
                        colors={['#8b5cf6', '#7c3aed']}
                        style={styles.actionButton}
                      >
                        <JoinNoteIconButton 
                          style={styles.joinButtonOverride}
                          onNoteJoined={(noteId, permission) => {}}
                        />
                      </LinearGradient>
                    </View>
                    
                    <TouchableOpacity 
                      onPress={cycleViewMode}
                      activeOpacity={0.8}
                      style={styles.actionButtonWrapper}
                    >
                      <LinearGradient
                        colors={['#f59e0b', '#d97706']}
                        style={styles.actionButton}
                      >
                        <Ionicons name={getViewIcon()} size={22} color="#ffffff" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tagsScrollContent}
                style={styles.tagsScroll}
              >
                {["All", ...availableTags].map((tag) => {
                  const active = activeTag === tag;
                  const tagColor = tagColors[tag as keyof typeof tagColors];
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.tagPill,
                        { borderColor: tagColor },
                        active && { backgroundColor: tagColor }
                      ]}
                      onPress={() => setActiveTag(tag)}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.tagText, 
                        active ? styles.tagTextActive : { color: tagColor }
                      ]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.loadingContainer}>
                <View style={styles.lottieContainer}>
                  <LottieView
                    source={require('@/assets/animations/quiz-loading.json')}
                    autoPlay
                    loop
                    style={styles.lottieAnimation}
                  />
                </View>
                <Text style={styles.loadingText}>Loading notebooks...</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <LinearGradient
                    colors={['#1e293b', '#334155']}
                    style={styles.emptyIconGradient}
                  >
                    <Ionicons name="book-outline" size={72} color="#475569" />
                  </LinearGradient>
                </View>
                <Text style={styles.emptyTitle}>
                  {search ? 'No notebooks found' : 'No notebooks yet'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {search 
                    ? `No notebooks match "${search}". Try a different search.`
                    : 'Create your first notebook to start organizing your thoughts'
                  }
                </Text>
              </View>
            )
          }
        />

        <View style={styles.fabContainer}>
          <TouchableOpacity 
            onPress={() => setModalVisible(true)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#14b8a6', '#10b981', '#84cc16']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fab}
            >
              <Ionicons name="add" size={34} color="#ffffff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        <BottomNavigation/>
        
        <CreateNotebookModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onCreate={handleCreateNotebook}
          creating={creating}
          userId={uid}
        />

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
  container: { 
    flex: 1,
  },

  // ========== HEADER SECTION ==========
  headerContainer: {
    marginBottom: 20,
  },
  titleSection: {
    marginBottom: 24,
    paddingTop: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleTextContainer: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
    marginLeft: 16,
  },
  actionButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  actionButton: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinButtonOverride: {
    backgroundColor: 'transparent',
    width: 52,
    height: 52,
    borderRadius: 0,
    shadowColor: 'transparent',
    elevation: 0,
  },

  // ========== TAGS ==========
  tagsScroll: {
    marginBottom: 4,
  },
  tagsScrollContent: {
    paddingRight: 20,
  },
  tagPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    marginRight: 10,
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tagTextActive: {
    color: '#ffffff',
  },

  // ========== GRID ROW ==========
  gridRow: {
    justifyContent: 'space-between',
  },

  // ========== LOADING & EMPTY STATES ==========
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottieContainer: {
    width: 220,
    height: 220,
  },
  lottieAnimation: {
    width: 100,
    height: 100,
    margin: 'auto',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 17,
    fontWeight: '600',
  },
  errorCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    marginBottom: 28,
  },
  emptyIconGradient: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#334155',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#94a3b8',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },

  // ========== FAB ==========
  fabContainer: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    zIndex: 999,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },

  // ========== LIST VIEW ==========
  listCardWrapper: {
    marginBottom: 20,
  },
  listCardContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  listTopAccent: {
    height: 6,
    width: '100%',
  },
  listCoverContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  listCover: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  listCoverGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  listCoverPlaceholder: {
    width: '100%',
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listPublicBadge: {
    position: 'absolute',
    top: 20,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  publicBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  listContent: {
    padding: 20,
  },
  listTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 12,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  propertyChip: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    marginBottom: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  propertyText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '700',
  },
  listMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  listDate: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  listTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  listTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  listTagText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '700',
  },
  moreTagsBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  moreTagsText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '700',
  },

  // ========== COMPACT VIEW ==========
  compactCardWrapper: {
    marginBottom: 14,
  },
  compactCardContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  compactTopAccent: {
    height: 4,
    width: '100%',
  },
  compactContent: {
    padding: 16,
    flexDirection: 'row',
    gap: 16,
  },
  compactCoverWrapper: {
    position: 'relative',
  },
  compactCoverContainer: {
    width: 80,
    height: 80,
    borderRadius: 14,
    overflow: 'hidden',
  },
  compactCover: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
    width: 80,
    height: 80,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactPublicBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  compactTextContent: {
    flex: 1,
    justifyContent: 'center',
  },
  compactTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  compactMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  compactDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  compactTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  compactTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  compactTagText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '700',
  },

  // ========== GRID VIEW ==========
  gridCardWrapper: {
    marginBottom: 20,
    width: GRID_CARD_WIDTH,
  },
  gridCardContainer: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 8,
  },
  gridTopAccent: {
    height: 5,
    width: '100%',
  },
  gridCoverContainer: {
    width: '100%',
    height: 130,
    position: 'relative',
  },
  gridCover: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridCoverGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  gridCoverPlaceholder: {
    width: '100%',
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridPublicBadge: {
    position: 'absolute',
    top: 14,
    right: 10,
    backgroundColor: '#10b981',
    borderRadius: 14,
    padding: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  gridContent: {
    padding: 14,
  },
  gridTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 10,
    letterSpacing: -0.2,
    lineHeight: 20,
    minHeight: 40,
  },
  gridMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  gridDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '600',
  },
  gridTagDots: {
    flexDirection: 'row',
    gap: 6,
  },
  gridTagDot: {
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