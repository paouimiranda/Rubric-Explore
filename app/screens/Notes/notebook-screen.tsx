// app/screens/Notes/notebook-screen.tsx - Enhanced with Dynamic Colors
import { useAuth } from '@/app/contexts/AuthContext';
import { CustomAlertModal } from '@/components/Interface/custom-alert-modal';
import EditNotebookModal from '@/components/Interface/edit-notebook-modal';
import NotebookSettingsModal from '@/components/Interface/notebook-settings-modal';
import { db } from "@/firebase";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  doc,
  getDoc,
} from "firebase/firestore";
import LottieView from 'lottie-react-native';
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

// Import service functions
import { getColorScheme } from '@/constants/colorUtils';
import { useBacklogLogger } from "@/hooks/useBackLogLogger";
import { BACKLOG_EVENTS } from "@/services/backlogEvents";
import { createNote, deleteNote, getNotesInNotebook, syncNotePropertiesWithNotebook, updateNotebook } from '../../../services/notes-service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_IMAGE_HEIGHT = 280;

interface NotebookProperty {
  key: string;
  value: string;
  source?: 'inherited' | 'manual';
  icon?: string;
  iconColor?: string;
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

interface AlertState {
  visible: boolean;
  type: 'info' | 'success' | 'error' | 'warning';
  title: string;
  message: string;
  buttons: Array<{
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel' | 'primary';
  }>;
}

export default function NotebookScreen() {
  const { user } = useAuth();
  const uid = user?.uid;
  const lottieRef = useRef<LottieView>(null);
  const { addBacklogEvent } = useBacklogLogger();
  
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
  
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [isPublicToggle, setIsPublicToggle] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const [editModalVisible, setEditModalVisible] = useState(false);

  const [pendingNoteNavigation, setPendingNoteNavigation] = useState(false);

  const [pendingNoteCreation, setPendingNoteCreation] = useState(false);

  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    buttons: [],
  });

  // Get dynamic color scheme based on notebook color
  const colorScheme = getColorScheme(notebook?.color || '#3b82f6');

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

  const showAlert = (
    type: AlertState['type'],
    title: string,
    message: string,
    buttons: AlertState['buttons']
  ) => {
    setAlertState({
      visible: true,
      type,
      title,
      message,
      buttons,
    });
  };

  const closeAlert = () => {
    setAlertState(prev => ({ ...prev, visible: false }));
  };

  const fetchNotebook = async (id: string) => {
    try {
      const docRef = doc(db, "notebooks", id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.uid !== uid) {
          showAlert(
            'error',
            'Access Denied',
            "You don't have permission to view this notebook",
            [
              {
                text: 'Go Back',
                onPress: () => {
                  closeAlert();
                  router.back();
                },
                style: 'primary',
              },
            ]
          );
          addBacklogEvent("notebook_access_denied", { notebookId: id });
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
      showAlert(
        'error',
        'Error',
        'Failed to load notebook',
        [
          {
            text: 'OK',
            onPress: closeAlert,
            style: 'primary',
          },
        ]
      );
      addBacklogEvent("notebook_fetch_error", { notebookId: id, error: String(error) });
    }
  };

  const fetchNotes = async (id: string) => {
    try {
      const data = await getNotesInNotebook(id, uid);
      setNotes(data as any);
    } catch (error) {
      console.error("Error fetching notes:", error);
      showAlert(
        'error',
        'Error',
        'Failed to load notes',
        [
          {
            text: 'OK',
            onPress: closeAlert,
            style: 'primary',
          },
        ]
      );
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
    if (notebookId) {
      addBacklogEvent(BACKLOG_EVENTS.USER_OPENED_NOTEBOOK, { notebookId });
    }
  }, [notebookId]);
  
  useEffect(() => {
    loadData();
  }, [notebookId, uid]);

  useFocusEffect(
    useCallback(() => {
      if (notebookId) {
        setPendingNoteNavigation(false);
        setPendingNoteCreation(false); // Add this line
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
    if (!notebookId || !notebook || pendingNoteCreation) return;
    
    setPendingNoteCreation(true);
    
    try {
      const inheritedProperties: NotebookProperty[] = (notebook.properties || []).map(prop => ({
        key: prop.key,
        value: prop.value,
        source: 'inherited' as const,
        icon: prop.icon || '',
        iconColor: prop.iconColor || '',
      }));
      
      const noteData = {
        notebookId: notebookId as string,
        title: "Untitled Note",
        content: "",
        isPublic: false,
        properties: inheritedProperties,
      };
      
      const docId = await createNote(noteData, uid);
      
      console.log(`📝 Created note with ${inheritedProperties.length} inherited properties`);
      
      router.push({
        pathname: "./note-editor",
        params: { noteId: docId, notebookId },
      });
      addBacklogEvent(BACKLOG_EVENTS.USER_CREATED_NOTE, { notebookId, noteId: docId });
    } catch (error) {
      console.error("Error creating note:", error);
      setPendingNoteCreation(false); // Reset on error
      showAlert(
        'error',
        'Error',
        'Failed to create note',
        [
          {
            text: 'OK',
            onPress: closeAlert,
            style: 'primary',
          },
        ]
      );
      addBacklogEvent("note_creation_error", { notebookId, error: String(error) });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    showAlert(
      'warning',
      'Delete Note',
      'Are you sure you want to delete this note? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          onPress: closeAlert,
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            closeAlert();
            try {
              await deleteNote(noteId, uid);
              fetchNotes(notebookId as string);
              showAlert(
                'success',
                'Success',
                'Note deleted successfully',
                [
                  {
                    text: 'OK',
                    onPress: closeAlert,
                    style: 'primary',
                  },
                ]
              );
              addBacklogEvent(BACKLOG_EVENTS.USER_DELETED_NOTE, { notebookId, noteId });
            } catch (error) {
              console.error("Error deleting note:", error);
              showAlert(
                'error',
                'Error',
                'Failed to delete note',
                [
                  {
                    text: 'OK',
                    onPress: closeAlert,
                    style: 'primary',
                  },
                ]
              );
              addBacklogEvent("note_deletion_error", { notebookId, noteId, error: String(error) });
            }
          },
          style: 'primary',
        },
      ]
    );
  };

  const handleSaveSettings = async (settings: {
  isPublic: boolean;
  title?: string;
  description?: string;
  coverImage?: string;
  color?: string;
  tags?: string[];
  properties?: NotebookProperty[];
}) => {
  if (!notebookId || !uid || !notebook) return;

  setSavingSettings(true);
  try {
    await updateNotebook(
      notebookId as string,
      {
        isPublic: settings.isPublic,
        title: settings.title || notebook.title,
        coverImage: settings.coverImage || notebook.coverImage,
        color: settings.color || notebook.color,
        tags: settings.tags || notebook.tags,
        properties: settings.properties || notebook.properties,
      },
      uid
    );

    setNotebook({
      ...notebook,
      isPublic: settings.isPublic,
      title: settings.title || notebook.title,
      coverImage: settings.coverImage || notebook.coverImage,
      color: settings.color || notebook.color,
      tags: settings.tags || notebook.tags,
      properties: settings.properties || notebook.properties,
    });

    setIsPublicToggle(settings.isPublic);

    setEditModalVisible(false);
    setSettingsModalVisible(false);
    showAlert(
      'success',
      'Notebook Updated',
      'Your notebook has been updated successfully',
      [
        {
          text: 'OK',
          onPress: closeAlert,
          style: 'primary',
        },
      ]
    );
    addBacklogEvent(BACKLOG_EVENTS.USER_UPDATED_NOTEBOOK_SETTINGS, {
      notebookId,
      isPublic: settings.isPublic,
      title: settings.title,
    });
  } catch (error) {
    console.error("Error updating notebook settings:", error);
    showAlert(
      'error',
      'Error',
      'Failed to update notebook',
      [
        {
          text: 'OK',
          onPress: closeAlert,
          style: 'primary',
        },
      ]
    );
    addBacklogEvent("notebook_settings_error", { notebookId, error: String(error) });
  } finally {
    setSavingSettings(false);
  }
};

const handleQuickPublicToggle = async (value: boolean) => {
  if (!notebookId || !uid || !notebook) return;

  try {
    await updateNotebook(
      notebookId as string,
      { isPublic: value },
      uid
    );

    setNotebook({ ...notebook, isPublic: value });
    setIsPublicToggle(value);
  } catch (error) {
    console.error("Error updating public status:", error);
    showAlert(
      'error',
      'Error',
      'Failed to update notebook',
      [
        {
          text: 'OK',
          onPress: closeAlert,
          style: 'primary',
        },
      ]
    );
  }
};

  const handleSyncProperties = async () => {
    if (!notebookId || !uid || !notebook) return;
    
    showAlert(
      'info',
      'Sync Properties',
      'This will update all notes in this notebook with the current notebook properties. Manually edited properties will be preserved.',
      [
        {
          text: 'Cancel',
          onPress: closeAlert,
          style: 'cancel',
        },
        {
          text: 'Sync',
          onPress: async () => {
            closeAlert();
            try {
              const notebookProperties = notebook.properties || [];
              await syncNotePropertiesWithNotebook(notebookId as string, notebookProperties, uid);
              fetchNotes(notebookId as string);
              showAlert(
                'success',
                'Success',
                'Properties synced successfully',
                [
                  {
                    text: 'OK',
                    onPress: closeAlert,
                    style: 'primary',
                  },
                ]
              );
              addBacklogEvent("notebook_properties_synced", { notebookId });
            } catch (error) {
              console.error("Error syncing properties:", error);
              showAlert(
                'error',
                'Error',
                'Failed to sync properties',
                [
                  {
                    text: 'OK',
                    onPress: closeAlert,
                    style: 'primary',
                  },
                ]
              );
              addBacklogEvent("notebook_properties_sync_error", { notebookId, error: String(error) });
            }
          },
          style: 'primary',
        },
      ]
    );
  };

  const openSettingsModal = () => {
    if (notebook) {
      setIsPublicToggle(notebook.isPublic);
      setSettingsModalVisible(true);
    }
  };

  const renderNote = ({ item }: { item: Note }) => {
    const primaryProperty = item.properties?.[0];
    const inheritedCount = item.properties?.filter(p => p.source === 'inherited').length || 0;
    const manualCount = item.properties?.filter(p => p.source === 'manual').length || 0;
    
    return (
      <TouchableOpacity
        style={[styles.noteCard, { borderColor: colorScheme.border }]}
        onPress={() =>
          {
            if (!pendingNoteNavigation) {
              setPendingNoteNavigation(true);
              router.push({
                pathname: "./note-editor",
                params: { noteId: item.id, notebookId },
              });
            }
          }
        }
        onLongPress={() => handleDeleteNote(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.noteLeftSection}>
          <View style={[styles.noteIconContainer, { 
            backgroundColor: colorScheme.overlay,
            borderColor: colorScheme.border 
          }]}>
            <Ionicons name="document-text" size={20} color={colorScheme.primary} />
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
            <View style={[styles.propertyBadge, {
              backgroundColor: colorScheme.overlay,
              borderColor: colorScheme.border
            }]}>
              <Ionicons 
                name={primaryProperty.source === 'inherited' ? 'link-outline' : 'pricetag'} 
                size={10} 
                color={colorScheme.accent} 
              />
              <Text style={[styles.propertyBadgeText, { color: colorScheme.light }]}>
                {primaryProperty.key}: {primaryProperty.value}
              </Text>
            </View>
          )}
          <View style={styles.noteDateContainer}>
            <Ionicons name="time-outline" size={12} color="#6b7280" />
            <Text style={styles.noteDate}>
              {item.updatedAt.toLocaleDateString()}
            </Text>
            {(inheritedCount > 0 || manualCount > 0) && (
              <Text style={styles.propertyCount}>
                • {inheritedCount + manualCount} properties
              </Text>
            )}
          </View>
        </View>

        <View style={styles.noteActions}>
          <View style={[styles.chevronCircle, {
            backgroundColor: colorScheme.overlay,
            borderColor: colorScheme.border
          }]}>
            <Ionicons name="chevron-forward" size={18} color={colorScheme.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderNotebookHeader = () => (
    <View>
      {/* Cover Image with Dynamic Overlay */}
      <View style={styles.coverImageContainer}>
        {notebook?.coverImage ? (
          <>
            <Image 
              source={getCoverImageSource(notebook.coverImage) || require('@/assets/covers/notebook1.jpg')} 
              style={styles.coverImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', `#0A1C3C`]}
              style={styles.coverGradient}
            />
          </>
        ) : (
          <LinearGradient 
            colors={[colorScheme.primary, colorScheme.dark]} 
            style={styles.coverPlaceholder}
          >
            <Ionicons name="book-outline" size={64} color="rgba(255,255,255,0.4)" />
          </LinearGradient>
        )}
        
        {/* Color accent bar at top */}
        <LinearGradient
          colors={[colorScheme.primary, colorScheme.light]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.topColorAccent}
        />
      </View>

      {/* Enhanced Info Card with Dynamic Colors */}
      <View style={styles.infoCardContainer}>
        <LinearGradient
          colors={['rgba(31, 41, 55, 0.95)', 'rgba(17, 24, 39, 0.95)']}
          style={[styles.infoCard, { borderColor: colorScheme.border }]}
        >
          {/* Header with Dynamic Accent */}
          <View style={styles.infoCardHeader}>
            <LinearGradient
              colors={[colorScheme.primary, colorScheme.light]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.accentLine}
            />
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={openSettingsModal}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={colorScheme.light} />
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
            <View style={[styles.descriptionContainer, {
              backgroundColor: colorScheme.overlay,
              borderLeftColor: colorScheme.primary
            }]}>
              <View style={styles.descriptionIconRow}>
                <Ionicons name="reader-outline" size={16} color={colorScheme.light} />
                <Text style={[styles.descriptionLabel, { color: colorScheme.light }]}>About</Text>
              </View>
              <Text style={styles.notebookDescription}>{notebook.description}</Text>
            </View>
          ) : null}
          
          {/* Tags with Dynamic Colors */}
          {notebook?.tags && notebook.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <View style={styles.tagsSectionHeader}>
                <Ionicons name="pricetags-outline" size={14} color={colorScheme.light} />
                <Text style={[styles.sectionLabel, { color: colorScheme.light }]}>Tags</Text>
              </View>
              <View style={styles.tagsContainer}>
                {notebook.tags.map((tag, index) => (
                  <View key={index} style={[styles.tag, {
                    backgroundColor: colorScheme.overlay,
                    borderColor: colorScheme.border
                  }]}>
                    <Text style={[styles.tagText, { color: colorScheme.light }]}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Properties with Dynamic Colors */}
          {notebook?.properties && notebook.properties.length > 0 && (
            <View style={styles.propertiesSection}>
              <View style={styles.propertiesSectionHeader}>
                <Ionicons name="list-outline" size={14} color={colorScheme.light} />
                <Text style={[styles.sectionLabel, { color: colorScheme.light }]}>Default Properties</Text>
                <Text style={styles.inheritanceHint}>(inherited by new notes)</Text>
              </View>
              <View style={[styles.propertiesContainer, {
                backgroundColor: `${colorScheme.darker}80`
              }]}>
                {notebook.properties.map((property, index) => (
                  <View key={index} style={styles.propertyRow}>
                    {property.icon && (
                      <Ionicons 
                        name={property.icon as any} 
                        size={16} 
                        color={property.iconColor || colorScheme.accent} 
                        style={{ marginRight: 8 }}
                      />
                    )}
                    <Text style={styles.propertyKey}>{property.key}</Text>
                    <Text style={styles.propertySeparator}>·</Text>
                    <Text style={styles.propertyValue}>{property.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Stats Row with Dynamic Colors */}
          <View style={[styles.statsRow, { borderTopColor: colorScheme.border }]}>
            <View style={styles.statItem}>
              <Ionicons name="document-text-outline" size={18} color={colorScheme.primary} />
              <Text style={styles.statValue}>{notes.length}</Text>
              <Text style={styles.statLabel}>
                {notes.length === 1 ? 'note' : 'notes'}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colorScheme.border }]} />
            <View style={styles.statItem}>
              <Ionicons name="calendar-outline" size={18} color={colorScheme.primary} />
              <Text style={styles.statValue}>
                {notebook?.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
              <Text style={styles.statLabel}>created</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Notes Section Header with Dynamic Colors */}
      <View style={styles.notesHeader}>
        <View style={styles.notesHeaderContent}>
          <Ionicons name="folder-open-outline" size={20} color={colorScheme.primary} />
          <Text style={styles.notesHeaderTitle}>All Notes</Text>
        </View>
        <LinearGradient
          colors={[colorScheme.primary, colorScheme.light]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.notesHeaderDivider}
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <LinearGradient colors={["#324762", "#0A1C3C"]} style={styles.loadingContainer}>
        <SafeAreaView style={styles.loadingContent}>
          <View style={styles.lottieContainer}>
            <LottieView
              ref={lottieRef}
              source={require('@/assets/animations/quiz-loading.json')}
              autoPlay
              loop
              style={styles.lottieAnimation}
            />
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
        {/* Floating Header with Dynamic Color */}
        <View style={styles.floatingHeader}>
          <TouchableOpacity 
            style={[styles.floatingBackBtn, {
              backgroundColor: `${colorScheme.primary}CC`,
              borderColor: colorScheme.light
            }]}
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
              tintColor={colorScheme.primary}
              colors={[colorScheme.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyCircle, {
                backgroundColor: colorScheme.overlay,
                borderColor: colorScheme.border
              }]}>
                <Ionicons name="document-text-outline" size={48} color={colorScheme.primary} />
              </View>
              <Text style={styles.emptyText}>No notes yet</Text>
              <Text style={styles.emptySubtext}>
                Tap the + button to create your first note
              </Text>
            </View>
          }
        />

        {/* Floating Action Button with Dynamic Colors */}
        <TouchableOpacity 
          style={styles.fab} 
          onPress={handleCreateNote}
          disabled={pendingNoteCreation}
          activeOpacity={pendingNoteCreation ? 1 : 0.8}
        >
          <LinearGradient
            colors={[colorScheme.primary, colorScheme.dark]}
            style={styles.fabGradient}
          >
            <Ionicons name="add" size={28} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Settings View Modal */}
<NotebookSettingsModal
  visible={settingsModalVisible}
  notebook={notebook}
  isPublicToggle={isPublicToggle}
  onClose={() => setSettingsModalVisible(false)}
  onPublicToggle={handleQuickPublicToggle}
  onSyncProperties={handleSyncProperties}
  onEdit={() => setEditModalVisible(true)}
  colorScheme={colorScheme}
/>

{/* Edit Notebook Modal */}
<EditNotebookModal
  visible={editModalVisible}
  notebook={notebook}
  isPublicToggle={isPublicToggle}
  onClose={() => setEditModalVisible(false)}
  onSaveSettings={handleSaveSettings}
  savingSettings={savingSettings}
  colorScheme={colorScheme}
/>

        {/* Custom Alert Modal */}
        <CustomAlertModal
          visible={alertState.visible}
          type={alertState.type}
          title={alertState.title}
          message={alertState.message}
          buttons={alertState.buttons}
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
  loadingContainer: {
    flex: 1,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 0,
    top: 10,
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
    height: 120,
  },
  topColorAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
  },
  infoCardContainer: {
    paddingHorizontal: 16,
    marginTop: -40,
    marginBottom: 24,
  },
  infoCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 0,
  },
  infoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  accentLine: {
    width: 60,
    height: 5,
    borderRadius: 3,
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
    borderLeftWidth: 3,
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
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  inheritanceHint: {
    color: '#6b7280',
    fontSize: 10,
    fontStyle: 'italic',
    marginLeft: 6,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  tagText: {
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
    borderRadius: 12,
    padding: 12,
  },
  propertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
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
    borderTopWidth: 2,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statDivider: {
    width: 2,
    height: 30,
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
    height: 3,
    borderRadius: 2,
  },
  noteCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.7)',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 0,
  },
  noteLeftSection: {
    marginRight: 12,
  },
  noteIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 2,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
  },
  propertyBadgeText: {
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
  propertyCount: {
    color: '#9ca3af',
    fontSize: 12,
    marginLeft: 4,
  },
  noteActions: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
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
    shadowColor: '#000',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
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
    borderWidth: 2,
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
    marginBottom: 16,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
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
    marginTop: 0,
    marginBottom: 16,
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
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  syncButtonText: {
    fontSize: 15,
    fontWeight: '600',
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
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
});