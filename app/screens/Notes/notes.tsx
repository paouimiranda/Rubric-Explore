import { JoinNoteIconButton } from '@/components/Interface/join-button';
import BottomNavigation from "@/components/Interface/nav-bar";
import { createNotebook, deleteNotebook, getNotebooks } from "@/services/notes-service";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import LottieView from 'lottie-react-native';
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
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

  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string>("All");
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCoverImage, setNewCoverImage] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [newPropertyKey, setNewPropertyKey] = useState("");
  const [newPropertyValue, setNewPropertyValue] = useState("");
  const [properties, setProperties] = useState<NotebookProperty[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [showCoverImagePicker, setShowCoverImagePicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const availableTags = ["Personal", "School", "Work"];
  const defaultPropertyKeys = ["Course", "Instructor", "Status", "Custom"];
  
  const colorPalette = [
    { name: "Blue", color: "#3b82f6", tag: "All" },
    { name: "Green", color: "#10b981", tag: "Personal" },
    { name: "Orange", color: "#f59e0b", tag: "School" },
    { name: "Purple", color: "#8b5cf6", tag: "Work" },
    { name: "Red", color: "#ef4444", tag: null },
    { name: "Pink", color: "#ec4899", tag: null },
    { name: "Indigo", color: "#6366f1", tag: null },
    { name: "Teal", color: "#14b8a6", tag: null },
    { name: "Yellow", color: "#eab308", tag: null },
    { name: "Gray", color: "#6b7280", tag: null },
  ];
  
  const defaultCoverImages = [
    { id: 'notebook1', source: require('@/assets/covers/notebook1.jpg'), name: 'Classic Notebook' },
    { id: 'notebook2', source: require('@/assets/covers/notebook2.jpg'), name: 'Modern Blue' },
    { id: 'notebook3', source: require('@/assets/covers/notebook3.jpg'), name: 'Vintage Brown' },
    { id: 'notebook4', source: require('@/assets/covers/notebook4.jpg'), name: 'Minimalist Gray' },
    { id: 'notebook5', source: require('@/assets/covers/notebook5.jpg'), name: 'Colorful Pattern' },
    { id: 'notebook6', source: require('@/assets/covers/notebook6.jpg'), name: 'Nature Green' },
    { id: 'custom', source: null, name: 'Custom URL' },
  ];
  
  const tagColors = {
    "All": "#3b82f6",
    "Personal": "#10b981",
    "School": "#f59e0b",
    "Work": "#8b5cf6",
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

  useEffect(() => {
    if (selectedTags.length > 0) {
      const firstTag = selectedTags[0];
      const tagColor = tagColors[firstTag as keyof typeof tagColors];
      if (tagColor) {
        setNewColor(tagColor);
      }
    } else {
      setNewColor("#3b82f6");
    }
  }, [selectedTags]);

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
        style={{ 
          flex: 1}}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <LottieView
              autoPlay={true}
              source={require('@/assets/animations/quiz-loading.json')}
              loop={true}
              style={{width: 0.90, height: 0.90}}
              />
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
        style={{ 
          flex: 1}}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Please log in to view your notebooks</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const handleDeleteNotebook = async (id: string) => {
    if (!uid) return;
    
    Alert.alert("Delete Notebook", "Are you sure you want to delete this notebook?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteNotebook(id, uid);
            fetchNotebooks();
          } catch (err) {
            console.error("Error deleting notebook:", err);
            Alert.alert("Error", "Failed to delete notebook. You may not have permission.");
          }
        },
      },
    ]);
  };

  const handleCreateNotebook = async () => {
    if (!uid) return;
    setCreating(true);
    
    try {
      const notebookData = {
        title: newTitle || "Untitled Notebook",
        description: "",
        coverImage: newCoverImage,
        color: newColor,
        properties,
        tags: selectedTags,
      };
      
      const docId = await createNotebook(notebookData, uid);
      setModalVisible(false);
      resetDialog();
      router.push({
        pathname: "./notebook-screen",
        params: { notebookId: docId },
      });
    } catch (err) {
      console.error("Error creating notebook:", err);
      Alert.alert("Error", "Failed to create notebook. Please try again.");
    } finally {
      setCreating(false)  
    }
  };

  const resetDialog = () => {
    setNewTitle("");
    setNewCoverImage("");
    setNewColor("#3b82f6");
    setNewPropertyKey("");
    setNewPropertyValue("");
    setProperties([]);
    setSelectedTags([]);
    setShowColorPicker(false);
  };

  const addProperty = () => {
    if (newPropertyKey && newPropertyValue) {
      setProperties([...properties, { key: newPropertyKey, value: newPropertyValue }]);
      setNewPropertyKey("");
      setNewPropertyValue("");
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const selectPropertyKey = (key: string) => {
    if (key === "Custom") {
      setNewPropertyKey("");
    } else {
      setNewPropertyKey(key);
    }
    setShowPropertyDropdown(false);
  };

  const selectCoverImage = (imageId: string) => {
    if (imageId === 'custom') {
      setNewCoverImage("");
    } else {
      setNewCoverImage(imageId);
    }
    setShowCoverImagePicker(false);
  };

  const selectColor = (color: string) => {
    setNewColor(color);
    setShowColorPicker(false);
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
      // Reset animations when view mode changes
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      scaleAnim.setValue(0.9);

      // Stagger the animations based on index
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

    // Render based on view mode
    if (viewMode === 'list') {
      return (
        <Animated.View style={animatedStyle}>
          <TouchableOpacity
            style={[styles.notebookCard, { backgroundColor: notebookColor }]}
            onPress={() =>
              router.push({ pathname: "./notebook-screen", params: { notebookId: item.id } })
            }
            onLongPress={() => handleDeleteNotebook(item.id!)}
          >
            {coverImageSource ? (
              <Image source={coverImageSource} style={styles.notebookCover} />
            ) : (
              <View style={[styles.notebookCoverPlaceholder, { backgroundColor: `${notebookColor}CC` }]}>
                <Ionicons name="book-outline" size={32} color="#ffffff" />
              </View>
            )}

            <View style={styles.notebookContent}>
              <Text style={styles.notebookTitle} numberOfLines={1}>
                {item.title}
              </Text>
              {primaryProperty && (
                <Text style={styles.notebookProperty}>
                  {primaryProperty.key}: {primaryProperty.value}
                </Text>
              )}
              <Text style={styles.notebookDate}>{item.createdAt.toLocaleDateString()}</Text>
              
              <View style={styles.notebookFooter}>
                <View style={[styles.colorIndicator, { backgroundColor: notebookColor }]} />
                {item.tags && item.tags.length > 0 && (
                  <View style={styles.tagsContainer}>
                    {item.tags.slice(0, 2).map((tag, index) => (
                      <View 
                        key={index} 
                        style={[
                          styles.miniTag, 
                          { backgroundColor: tagColors[tag as keyof typeof tagColors] || "#6b7280" }
                        ]}
                      >
                        <Text style={styles.miniTagText}>{tag}</Text>
                      </View>
                    ))}
                    {item.tags.length > 2 && (
                      <Text style={styles.moreTagsText}>+{item.tags.length - 2}</Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      );
    }

    if (viewMode === 'compact') {
      return (
        <Animated.View style={animatedStyle}>
          <TouchableOpacity
            style={styles.compactCard}
            onPress={() =>
              router.push({ pathname: "./notebook-screen", params: { notebookId: item.id } })
            }
            onLongPress={() => handleDeleteNotebook(item.id!)}
          >
            {coverImageSource ? (
              <Image source={coverImageSource} style={styles.compactCover} />
            ) : (
              <View style={[styles.compactCoverPlaceholder, { backgroundColor: `${notebookColor}CC` }]}>
                <Ionicons name="book-outline" size={20} color="#ffffff" />
              </View>
            )}
            
            <View style={styles.compactContent}>
              <View style={styles.compactHeader}>
                <Text style={styles.compactTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={[styles.compactColorDot, { backgroundColor: notebookColor }]} />
              </View>
              <Text style={styles.compactDate}>{item.createdAt.toLocaleDateString()}</Text>
              {item.tags && item.tags.length > 0 && (
                <View style={styles.compactTags}>
                  {item.tags.slice(0, 3).map((tag, index) => (
                    <View 
                      key={index} 
                      style={[
                        styles.compactTag, 
                        { backgroundColor: tagColors[tag as keyof typeof tagColors] || "#6b7280" }
                      ]}
                    >
                      <Text style={styles.compactTagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>
      );
    }

    // Grid view
    return (
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          style={[styles.gridCard, { backgroundColor: notebookColor }]}
          onPress={() =>
            router.push({ pathname: "./notebook-screen", params: { notebookId: item.id } })
          }
          onLongPress={() => handleDeleteNotebook(item.id!)}
        >
          {coverImageSource ? (
            <Image source={coverImageSource} style={styles.gridCover} />
          ) : (
            <View style={[styles.gridCoverPlaceholder, { backgroundColor: `${notebookColor}CC` }]}>
              <Ionicons name="book-outline" size={28} color="#ffffff" />
            </View>
          )}
          
          <View style={styles.gridContent}>
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
          </View>
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
      style={{ 
        flex: 1}}>
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
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color="#ffffffff" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search notebooks..."
                    placeholderTextColor="#9ca3af"
                    value={search}
                    onChangeText={setSearch}
                  />             
                </View>
                
                <TouchableOpacity 
                  style={styles.viewToggleButton}
                  onPress={cycleViewMode}
                >
                  <Ionicons name={getViewIcon()} size={24} color="#ffffff" />
                </TouchableOpacity>
                
                <JoinNoteIconButton 
                  style={{ marginLeft: 10 }}
                  onNoteJoined={(noteId, permission) => {
                    // Handle successful join
                  }}
                />              
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

        <TouchableOpacity style={[styles.fab, {zIndex: 999, elevation: 5}]} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={28} color="#ffffff" />
        </TouchableOpacity>
        <BottomNavigation/>
        
        {/* Create Notebook Modal */}
        <Modal animationType="fade" transparent visible={modalVisible}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>New Notebook</Text>

              <TextInput
                style={styles.modalInput}
                placeholder="Title"
                placeholderTextColor="#9ca3af"
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <View style={styles.colorContainer}>
                <Text style={styles.inputLabel}>Color</Text>
                <View style={styles.colorRow}>
                  <View style={styles.selectedColorDisplay}>
                    <View style={[styles.selectedColorCircle, { backgroundColor: newColor }]} />
                    <Text style={styles.selectedColorText}>
                      {colorPalette.find(c => c.color === newColor)?.name || "Custom"}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.colorPickerButton}
                    onPress={() => setShowColorPicker(!showColorPicker)}
                  >
                    <Ionicons name="color-palette" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
                
                {showColorPicker && (
                  <View style={styles.colorPicker}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {colorPalette.map((colorOption) => (
                        <TouchableOpacity
                          key={colorOption.color}
                          style={[
                            styles.colorOption,
                            newColor === colorOption.color && styles.selectedColorOption
                          ]}
                          onPress={() => selectColor(colorOption.color)}
                        >
                          <View style={[styles.colorOptionCircle, { backgroundColor: colorOption.color }]} />
                          <Text style={styles.colorOptionName}>{colorOption.name}</Text>
                          {colorOption.tag && (
                            <Text style={styles.colorTagLabel}>{colorOption.tag}</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.coverImageContainer}>
                <Text style={styles.inputLabel}>Cover Image</Text>
                <View style={styles.coverImageRow}>
                  <TextInput
                    style={[styles.modalInput, styles.coverImageInput]}
                    placeholder="Enter URL or select default"
                    placeholderTextColor="#9ca3af"
                    value={newCoverImage.startsWith('http') ? newCoverImage : ''}
                    onChangeText={setNewCoverImage}
                  />
                  <TouchableOpacity 
                    style={styles.coverImageButton}
                    onPress={() => setShowCoverImagePicker(!showCoverImagePicker)}
                  >
                    <Ionicons name="images" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
                
                {newCoverImage && (
                  <View style={styles.coverPreview}>
                    <Image 
                      source={getCoverImageSource(newCoverImage) || require('@/assets/covers/notebook1.jpg')} 
                      style={styles.coverPreviewImage}
                    />
                  </View>
                )}
                
                {showCoverImagePicker && (
                  <View style={styles.coverImagePicker}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {defaultCoverImages.map((image) => (
                        <TouchableOpacity
                          key={image.id}
                          style={styles.coverOption}
                          onPress={() => selectCoverImage(image.id)}
                        >
                          {image.source ? (
                            <Image source={image.source} style={styles.coverOptionImage} />
                          ) : (
                            <View style={styles.customCoverOption}>
                              <Ionicons name="link" size={24} color="#9ca3af" />
                              <Text style={styles.customCoverText}>URL</Text>
                            </View>
                          )}
                          <Text style={styles.coverOptionName}>{image.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.propertyRow}>
                <View style={styles.propertyKeyContainer}>
                  <TextInput
                    style={[styles.modalInput, styles.propertyKeyInput]}
                    placeholder="Property Key"
                    placeholderTextColor="#9ca3af"
                    value={newPropertyKey}
                    onChangeText={setNewPropertyKey}
                  />
                  <TouchableOpacity 
                    style={styles.dropdownButton}
                    onPress={() => setShowPropertyDropdown(!showPropertyDropdown)}
                  >
                    <Ionicons name="chevron-down" size={16} color="#9ca3af" />
                  </TouchableOpacity>
                  
                  {showPropertyDropdown && (
                    <View style={styles.dropdownMenu}>
                      {defaultPropertyKeys.map((key) => (
                        <TouchableOpacity
                          key={key}
                          style={styles.dropdownItem}
                          onPress={() => selectPropertyKey(key)}
                        >
                          <Text style={styles.dropdownItemText}>{key}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                <TextInput
                  style={[styles.modalInput, { flex: 1, marginLeft: 4 }]}
                  placeholder="Property Value"
                  placeholderTextColor="#9ca3af"
                  value={newPropertyValue}
                  onChangeText={setNewPropertyValue}
                />
              </View>
              <TouchableOpacity style={styles.addPropertyBtn} onPress={addProperty}>
                <Text style={{ color: "#fff", fontWeight: "600" }}>+ Add Property</Text>
              </TouchableOpacity>

              <ScrollView style={{ maxHeight: 100, marginVertical: 8 }}>
                {properties.map((p, idx) => (
                  <Text key={idx} style={{ color: "#d1d5db" }}>
                    {p.key}: {p.value}
                  </Text>
                ))}
              </ScrollView>

              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagSelectionContainer}>
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  const tagColor = tagColors[tag as keyof typeof tagColors];
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.modalTagChip,
                        isSelected 
                          ? { backgroundColor: tagColor, borderColor: tagColor }
                          : { backgroundColor: "transparent", borderColor: tagColor }
                      ]}
                      onPress={() => toggleTag(tag)}
                    >
                      <Text style={[
                        styles.modalTagText,
                        isSelected 
                          ? { color: "#ffffff" }
                          : { color: tagColor }
                      ]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: "#6b7280" }]}
                  onPress={() => {
                    resetDialog();
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.modalBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: newColor, opacity: creating ? 0.5 : 1 }]}
                  onPress={handleCreateNotebook}
                  disabled={creating}
                >
                  <Text style={styles.modalBtnText}>{creating ? "Creating..." : "Create"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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

  searchContainer: {
    flexDirection: "row",
    flex: 1,
    alignItems: "center",
    backgroundColor: "#2563eb",
    marginHorizontal: '1%',
    marginTop: 8,
    marginBottom: '3%',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    maxWidth: '65%',
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: "#ffffff", fontSize: 12, },

  viewToggleButton: {
    backgroundColor: "#ff8223ff",
    borderRadius: 12,
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
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

  // LIST VIEW STYLES
  notebookCard: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  notebookCover: { width: "100%", height: 120 },
  notebookCoverPlaceholder: {
    width: "100%",
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  notebookContent: { padding: 12 },
  notebookTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  notebookProperty: { fontSize: 14, color: "#e5e7eb", marginTop: 4 },
  notebookDate: { fontSize: 12, color: "#d1d5db", marginTop: 2 },
  notebookFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  tagsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  miniTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  miniTagText: {
    fontSize: 10,
    color: "#ffffff",
    fontWeight: "500",
  },
  moreTagsText: {
    fontSize: 10,
    color: "#d1d5db",
    marginLeft: 4,
  },

  // COMPACT VIEW STYLES
  compactCard: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    borderRadius: 10,
    marginBottom: 10,
    overflow: "hidden",
    padding: 10,
  },
  compactCover: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  compactCoverPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  compactContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  compactHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    flex: 1,
  },
  compactColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
  },
  compactDate: {
    fontSize: 11,
    color: "#9ca3af",
    marginBottom: 4,
  },
  compactTags: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  compactTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 4,
    marginTop: 2,
  },
  compactTagText: {
    fontSize: 9,
    color: "#ffffff",
    fontWeight: "500",
  },

  // GRID VIEW STYLES
  gridRow: {
    justifyContent: "space-between",
  },
  gridCard: {
    width: (width - 48) / 2,
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  gridCover: {
    width: "100%",
    height: 100,
  },
  gridCoverPlaceholder: {
    width: "100%",
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  gridContent: {
    padding: 10,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  gridDate: {
    fontSize: 10,
    color: "#d1d5db",
    marginBottom: 6,
  },
  gridTagsContainer: {
    flexDirection: "row",
    marginTop: 4,
  },
  gridTag: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: { fontSize: 20, fontWeight: "bold", color: "#9ca3af", marginTop: 16 },
  emptySubtext: { fontSize: 14, color: "#6b7280", marginTop: 8, textAlign: "center" },

  fab: {
    position: "absolute",
    bottom: 100,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 20,
    maxHeight: "90%",
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 12 },
  modalInput: {
    backgroundColor: "#334155",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    marginBottom: 8,
  },

  colorContainer: {
    marginBottom: 8,
  },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedColorDisplay: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    backgroundColor: "#334155",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectedColorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  selectedColorText: {
    color: "#fff",
    fontSize: 16,
  },
  colorPickerButton: {
    backgroundColor: "#475569",
    borderRadius: 8,
    padding: 10,
    marginLeft: 8,
  },
  colorPicker: {
    marginTop: 8,
    backgroundColor: "#475569",
    borderRadius: 8,
    padding: 12,
  },
  colorOption: {
    alignItems: "center",
    marginRight: 16,
    padding: 8,
    borderRadius: 8,
  },
  selectedColorOption: {
    backgroundColor: "#334155",
  },
  colorOptionCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 4,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  colorOptionName: {
    fontSize: 12,
    color: "#d1d5db",
    textAlign: "center",
    fontWeight: "500",
  },
  colorTagLabel: {
    fontSize: 10,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 2,
  },

  propertyRow: { flexDirection: "row", marginBottom: 8 },
  propertyKeyContainer: {
    flex: 1,
    marginRight: 4,
    position: 'relative',
  },
  propertyKeyInput: {
    paddingRight: 40,
  },
  dropdownButton: {
    position: 'absolute',
    right: 12,
    top: 10,
    padding: 4,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: '#475569',
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 1000,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#64748b',
  },
  dropdownItemText: {
    color: '#fff',
    fontSize: 14,
  },
  addPropertyBtn: {
    backgroundColor: "#475569",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
  },
  modalBtn: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginLeft: 8,
  },
  modalBtnText: { color: "#fff", fontWeight: "600" },

  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#d1d5db",
    marginBottom: 4,
  },
  coverImageContainer: {
    marginBottom: 8,
  },
  coverImageRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  coverImageInput: {
    flex: 1,
    marginRight: 8,
    marginBottom: 0,
  },
  coverImageButton: {
    backgroundColor: "#475569",
    borderRadius: 8,
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  coverPreview: {
    marginTop: 8,
    alignItems: "center",
  },
  coverPreviewImage: {
    width: 100,
    height: 60,
    borderRadius: 8,
  },
  coverImagePicker: {
    marginTop: 12,
    backgroundColor: "#475569",
    borderRadius: 8,
    padding: 12,
  },
  coverOption: {
    alignItems: "center",
    marginRight: 12,
    width: 80,
  },
  coverOptionImage: {
    width: 60,
    height: 40,
    borderRadius: 6,
    marginBottom: 4,
  },
  customCoverOption: {
    width: 60,
    height: 40,
    borderRadius: 6,
    backgroundColor: "#334155",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  customCoverText: {
    fontSize: 10,
    color: "#9ca3af",
    marginTop: 2,
  },
  coverOptionName: {
    fontSize: 10,
    color: "#d1d5db",
    textAlign: "center",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginTop: 16,
    marginBottom: 8,
  },
  tagSelectionContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  modalTagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
  },
  modalTagText: {
    fontSize: 14,
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 16,
    marginTop: 16,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
});