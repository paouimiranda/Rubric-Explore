// app/screens/Notes/notebook-screen.tsx
import { useAuth } from '@/app/contexts/AuthContext';
import { db } from "@/firebase";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  doc,
  getDoc,
} from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from "react-native";

// Import service functions
import { createNote, deleteNote, getNotesInNotebook, updateNotebook } from '../../../services/notes-service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_IMAGE_HEIGHT = 280;

interface NotebookProperty {
  key: string;
  value: string;
}

interface Notebook {
  id: string;
  uid: string;
  title: string;
  description?: string;
  coverImage?: string;
  properties?: NotebookProperty[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  color?: string;
  isPublic: boolean;
}

interface Note {
  id: string;
  uid: string;
  notebookId: string;
  title: string;
  content?: string;
  properties?: NotebookProperty[];
  createdAt: Date;
  updatedAt: Date;
  isPublic?: boolean;
}

export default function NotebookScreen() {
  const { user } = useAuth();
  const uid = user?.uid;

  // Add early return for unauthenticated users
  if (!uid) {
    return (
      <LinearGradient colors={["#324762", "#0A1C3C"]} style={styles.loadingContainer}>
        <SafeAreaView style={styles.loadingContent}>
          <Text style={styles.errorText}>Please log in to view this notebook</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const { notebookId } = useLocalSearchParams();
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Settings modal state
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [isPublicToggle, setIsPublicToggle] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Default cover images mapping
  const defaultCoverImages = {
    'notebook1': require('@/assets/covers/notebook1.jpg'),
    'notebook2': require('@/assets/covers/notebook2.jpg'),
    'notebook3': require('@/assets/covers/notebook3.jpg'),
    'notebook4': require('@/assets/covers/notebook4.jpg'),
    'notebook5': require('@/assets/covers/notebook5.jpg'),
    'notebook6': require('@/assets/covers/notebook6.jpg'),
  };

  const getCoverImageSource = (coverImage?: string) => {
    if (!coverImage) return null;
    
    if (defaultCoverImages[coverImage as keyof typeof defaultCoverImages]) {
      return defaultCoverImages[coverImage as keyof typeof defaultCoverImages];
    }
    
    if (coverImage.startsWith('http')) {
      return { uri: coverImage };
    }
    
    return null;
  };

  const fetchNotebook = async (id: string) => {
    try {
      const docRef = doc(db, "notebooks", id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.uid !== uid) {
          Alert.alert("Error", "You don't have permission to view this notebook");
          router.back();
          return;
        }
        const notebookData = {
          id: snap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          isPublic: data.isPublic ?? false,
        } as Notebook;
        setNotebook(notebookData);
        setIsPublicToggle(notebookData.isPublic);
      }
    } catch (error) {
      console.error("Error fetching notebook:", error);
      Alert.alert("Error", "Failed to load notebook");
    }
  };

  const fetchNotes = async (id: string) => {
    try {
      const data = await getNotesInNotebook(id, uid);
      setNotes(data as any);
    } catch (error) {
      console.error("Error fetching notes:", error);
      Alert.alert("Error", "Failed to load notes");
    }
  };

  const loadData = async () => {
    if (notebookId) {
      setLoading(true);
      await Promise.all([
        fetchNotebook(notebookId as string),
        fetchNotes(notebookId as string)
      ]);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [notebookId, uid]);

  useFocusEffect(
    useCallback(() => {
      if (notebookId) {
        fetchNotes(notebookId as string);
      }
    }, [notebookId, uid])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreateNote = async () => {
    if (!notebookId) return;
    
    try {
      const noteData = {
        notebookId: notebookId as string,
        title: "Untitled Note",
        content: "",
        isPublic: false, // NEW LINE
      };
      const docId = await createNote(noteData, uid);
      router.push({
        pathname: "./note-editor",
        params: { noteId: docId, notebookId },
      });
    } catch (error) {
      console.error("Error creating note:", error);
      Alert.alert("Error", "Failed to create note");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    Alert.alert(
      "Delete Note", 
      "Are you sure you want to delete this note?", 
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteNote(noteId, uid);
              fetchNotes(notebookId as string);
            } catch (error) {
              console.error("Error deleting note:", error);
              Alert.alert("Error", "Failed to delete note");
            }
          },
        },
      ]
    );
  };

  const handleSaveSettings = async () => {
    if (!notebookId || !uid) return;
    
    setSavingSettings(true);
    try {
      await updateNotebook(
        notebookId as string,
        { isPublic: isPublicToggle },
        uid
      );
      
      // Update local state
      if (notebook) {
        setNotebook({ ...notebook, isPublic: isPublicToggle });
      }
      
      setSettingsModalVisible(false);
      Alert.alert(
        "Success",
        `Notebook is now ${isPublicToggle ? 'public' : 'private'}`
      );
    } catch (error) {
      console.error("Error updating notebook settings:", error);
      Alert.alert("Error", "Failed to update notebook settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const openSettingsModal = () => {
    if (notebook) {
      setIsPublicToggle(notebook.isPublic);
      setSettingsModalVisible(true);
    }
  };

  const renderNote = ({ item }: { item: Note }) => {
    const primaryProperty = item.properties?.[0];
    
    return (
      <TouchableOpacity
        style={styles.noteCard}
        onPress={() =>
          router.push({
            pathname: "./note-editor",
            params: { noteId: item.id, notebookId },
          })
        }
        onLongPress={() => handleDeleteNote(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.noteLeftSection}>
          <View style={styles.noteIconContainer}>
            <Ionicons name="document-text" size={20} color="#3b82f6" />
          </View>
        </View>
        
        <View style={styles.noteContent}>
          <View style={styles.noteTitleRow}>
            <Text style={styles.noteTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {item.isPublic && (
              <View style={styles.notePublicBadge}>
                <Ionicons name="globe" size={10} color="#52C72B" />
              </View>
            )}
          </View>
          {primaryProperty && (
            <View style={styles.propertyBadge}>
              <Ionicons name="pricetag" size={10} color="#60a5fa" />
              <Text style={styles.propertyBadgeText}>
                {primaryProperty.key}: {primaryProperty.value}
              </Text>
            </View>
          )}
          <View style={styles.noteDateContainer}>
            <Ionicons name="time-outline" size={12} color="#6b7280" />
            <Text style={styles.noteDate}>
              {item.updatedAt.toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.noteActions}>
          <View style={styles.chevronCircle}>
            <Ionicons name="chevron-forward" size={18} color="#3b82f6" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderNotebookHeader = () => (
    <View>
      {/* Cover Image */}
      <View style={styles.coverImageContainer}>
        {notebook?.coverImage ? (
          <Image 
            source={getCoverImageSource(notebook.coverImage) || require('@/assets/covers/notebook1.jpg')} 
            style={styles.coverImage}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient 
            colors={["#3b82f6", "#1e40af"]} 
            style={styles.coverPlaceholder}
          >
            <Ionicons name="book-outline" size={64} color="rgba(255,255,255,0.3)" />
          </LinearGradient>
        )}
        
        {/* Gradient Overlay at bottom of image */}
        <LinearGradient
          colors={['transparent', 'rgba(10, 28, 60, 0.95)']}
          style={styles.coverGradient}
        />
      </View>

      {/* Notebook Info Card */}
      <View style={styles.infoCardContainer}>
        <LinearGradient
          colors={['rgba(31, 41, 55, 0.95)', 'rgba(17, 24, 39, 0.95)']}
          style={styles.infoCard}
        >
          {/* Header with Settings Button */}
          <View style={styles.infoCardHeader}>
            <View style={styles.accentLine} />
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={openSettingsModal}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.titleRow}>
            <Text style={styles.notebookTitle}>{notebook?.title}</Text>
            {notebook?.isPublic && (
              <View style={styles.publicBadge}>
                <Ionicons name="globe-outline" size={14} color="#52C72B" />
                <Text style={styles.publicBadgeText}>Public</Text>
              </View>
            )}
          </View>
          
          {notebook?.description ? (
            <View style={styles.descriptionContainer}>
              <View style={styles.descriptionIconRow}>
                <Ionicons name="reader-outline" size={16} color="#9ca3af" />
                <Text style={styles.descriptionLabel}>About</Text>
              </View>
              <Text style={styles.notebookDescription}>{notebook.description}</Text>
            </View>
          ) : null}
          
          {/* Tags */}
          {notebook?.tags && notebook.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <View style={styles.tagsSectionHeader}>
                <Ionicons name="pricetags-outline" size={14} color="#9ca3af" />
                <Text style={styles.sectionLabel}>Tagay</Text>
              </View>
              <View style={styles.tagsContainer}>
                {notebook.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Properties */}
          {notebook?.properties && notebook.properties.length > 0 && (
            <View style={styles.propertiesSection}>
              <View style={styles.propertiesSectionHeader}>
                <Ionicons name="list-outline" size={14} color="#9ca3af" />
                <Text style={styles.sectionLabel}>Properties</Text>
              </View>
              <View style={styles.propertiesContainer}>
                {notebook.properties.map((property, index) => (
                  <View key={index} style={styles.propertyRow}>
                    <View style={styles.propertyDot} />
                    <Text style={styles.propertyKey}>{property.key}</Text>
                    <Text style={styles.propertySeparator}>·</Text>
                    <Text style={styles.propertyValue}>{property.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="document-text-outline" size={18} color="#3b82f6" />
              <Text style={styles.statValue}>{notes.length}</Text>
              <Text style={styles.statLabel}>
                {notes.length === 1 ? 'note' : 'notes'}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="calendar-outline" size={18} color="#3b82f6" />
              <Text style={styles.statValue}>
                {notebook?.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
              <Text style={styles.statLabel}>created</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Notes Section Header */}
      <View style={styles.notesHeader}>
        <View style={styles.notesHeaderContent}>
          <Ionicons name="folder-open-outline" size={20} color="#3b82f6" />
          <Text style={styles.notesHeaderTitle}>All Notes</Text>
        </View>
        <View style={styles.notesHeaderDivider} />
      </View>
    </View>
  );

  if (loading) {
    return (
      <LinearGradient colors={["#324762", "#0A1C3C"]} style={styles.loadingContainer}>
        <SafeAreaView style={styles.loadingContent}>
          <View style={styles.loadingCircle}>
            <Ionicons name="book-outline" size={48} color="#3b82f6" />
          </View>
          <Text style={styles.loadingText}>Loading notebook...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!notebook) {
    return (
      <LinearGradient colors={["#324762", "#0A1C3C"]} style={styles.loadingContainer}>
        <SafeAreaView style={styles.loadingContent}>
          <View style={styles.errorCircle}>
            <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          </View>
          <Text style={styles.errorText}>Notebook not found</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#0A1C3C", "#0A1C3C"]} style={styles.container}>
      <SafeAreaView style={styles.container}>
        {/* Floating Header with Back Button */}
        <View style={styles.floatingHeader}>
          <TouchableOpacity 
            style={styles.floatingBackBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={notes}
          renderItem={renderNote}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderNotebookHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3b82f6"
              colors={["#3b82f6"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyCircle}>
                <Ionicons name="document-text-outline" size={48} color="#4b5563" />
              </View>
              <Text style={styles.emptyText}>No notes yet</Text>
              <Text style={styles.emptySubtext}>
                Tap the + button to create your first note
              </Text>
            </View>
          }
        />

        {/* Floating Action Button */}
        <TouchableOpacity 
          style={styles.fab} 
          onPress={handleCreateNote}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#3b82f6', '#2563eb']}
            style={styles.fabGradient}
          >
            <Ionicons name="add" size={28} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Settings Modal */}
        <Modal
          animationType="fade"
          transparent
          visible={settingsModalVisible}
          onRequestClose={() => setSettingsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.settingsModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Notebook Settings</Text>
                <TouchableOpacity 
                  onPress={() => setSettingsModalVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              <View style={styles.settingsSection}>
                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <View style={styles.settingIconContainer}>
                      <Ionicons 
                        name={isPublicToggle ? "globe" : "lock-closed"} 
                        size={20} 
                        color={isPublicToggle ? "#52C72B" : "#9ca3af"} 
                      />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text style={styles.settingTitle}>Public Notebook</Text>
                      <Text style={styles.settingDescription}>
                        {isPublicToggle 
                          ? "Anyone can view this notebook on your profile" 
                          : "Only you can see this notebook"}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={isPublicToggle}
                    onValueChange={setIsPublicToggle}
                    trackColor={{ false: "#374151", true: "#52C72B" }}
                    thumbColor={isPublicToggle ? "#ffffff" : "#9ca3af"}
                    ios_backgroundColor="#374151"
                  />
                </View>

                {isPublicToggle && (
                  <View style={styles.warningBox}>
                    <Ionicons name="information-circle-outline" size={20} color="#f59e0b" />
                    <Text style={styles.warningText}>
                      Public notebooks will be visible on your profile. Individual notes still need to be set to public separately.
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setSettingsModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton, 
                    styles.saveButton,
                    savingSettings && styles.disabledButton
                  ]}
                  onPress={handleSaveSettings}
                  disabled={savingSettings}
                >
                  <Text style={styles.saveButtonText}>
                    {savingSettings ? "Saving..." : "Save Changes"}
                  </Text>
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
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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
    marginTop: 16,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  floatingHeader: {
    position: 'absolute',
    top: 8,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  floatingBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  listContent: {
    paddingBottom: 100,
  },
  coverImageContainer: {
    width: '100%',
    height: HEADER_IMAGE_HEIGHT,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
  infoCardContainer: {
    paddingHorizontal: 16,
    marginTop: -40,
    marginBottom: 24,
  },
  infoCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  infoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  accentLine: {
    width: 60,
    height: 4,
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.2)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  notebookTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    flex: 1,
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(82, 199, 43, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(82, 199, 43, 0.3)',
  },
  publicBadgeText: {
    color: '#52C72B',
    fontSize: 12,
    fontWeight: '600',
  },
  descriptionContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  descriptionIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  descriptionLabel: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  notebookDescription: {
    color: '#d1d5db',
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.95,
  },
  tagsSection: {
    marginBottom: 20,
  },
  tagsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionLabel: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#60a5fa',
    fontSize: 13,
    fontWeight: '600',
  },
  propertiesSection: {
    marginBottom: 20,
  },
  propertiesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  propertiesContainer: {
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
    borderRadius: 12,
    padding: 12,
  },
  propertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  propertyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
    marginRight: 10,
  },
  propertyKey: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  propertySeparator: {
    color: '#4b5563',
    fontSize: 14,
    marginHorizontal: 8,
  },
  propertyValue: {
    color: '#d1d5db',
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(75, 85, 99, 0.3)',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(75, 85, 99, 0.3)',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    marginRight: 4,
  },
  statLabel: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '500',
  },
  notesHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  notesHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  notesHeaderTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 10,
  },
  notesHeaderDivider: {
    height: 2,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 1,
  },
  noteCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.7)',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  noteLeftSection: {
    marginRight: 12,
  },
  noteIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteContent: {
    flex: 1,
    marginRight: 12,
  },
  noteTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  noteTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
    flex: 1,
  },
  notePublicBadge: {
    backgroundColor: 'rgba(82, 199, 43, 0.2)',
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(82, 199, 43, 0.3)',
  },
  propertyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  propertyBadgeText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  noteDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noteDate: {
    color: '#6b7280',
    fontSize: 13,
    marginLeft: 6,
  },
  noteActions: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(75, 85, 99, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  settingsModalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(75, 85, 99, 0.3)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsSection: {
    padding: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#f59e0b',
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(75, 85, 99, 0.3)',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(107, 114, 128, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.3)',
  },
  cancelButtonText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
});