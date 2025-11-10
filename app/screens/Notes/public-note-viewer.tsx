// app/screens/Notes/public-notebook-viewer.tsx
import { useAuth } from '@/app/contexts/AuthContext';
import { db } from "@/firebase";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import {
  doc,
  getDoc,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
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
import { useBacklogLogger } from "@/hooks/useBackLogLogger";
import { getNotesInNotebook } from '../../../services/notes-service';
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

export default function PublicNotebookViewer() {
  const { user } = useAuth();
  const { notebookId } = useLocalSearchParams();
  const { addBacklogEvent } = useBacklogLogger();
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
        
        // Check if notebook is public
        if (!data.isPublic) {
          Alert.alert("Error", "This notebook is not public");
          router.back();
          addBacklogEvent("public_notebook_access_denied", { notebookId: id });
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
      } else {
        Alert.alert("Error", "Notebook not found");
        router.back();
        addBacklogEvent("public_notebook_not_found", { notebookId: id });
      }
    } catch (error) {
      console.error("Error fetching notebook:", error);
      Alert.alert("Error", "Failed to load notebook");
      addBacklogEvent("public_notebook_fetch_error", { notebookId: id, error: String(error) });
    }
  };

  const fetchNotes = async (id: string, ownerId: string) => {
    try {
        const allNotes = await getNotesInNotebook(id, ownerId);
        // Filter to only show public notes
        const publicNotes = allNotes.filter((note: any) => note.isPublic === true);
        console.log('All notes:', allNotes.length, 'Public notes:', publicNotes.length); // Debug log
        setNotes(publicNotes as any);
    } catch (error) {
        console.error("Error fetching notes:", error);
        Alert.alert("Error", "Failed to load notes");
    }
    };

  const loadData = async () => {
    if (notebookId) {
      setLoading(true);
      await fetchNotebook(notebookId as string);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [notebookId]);
  // ✅ ADDED: Log opening public notebook
  useEffect(() => {
    if (notebookId) {
      addBacklogEvent("public_notebook_opened", { notebookId });
    }
  }, [notebookId]);
  // Fetch notes after notebook is loaded (need owner ID)
  useEffect(() => {
    if (notebook && notebookId) {
      fetchNotes(notebookId as string, notebook.uid);
    }
  }, [notebook, notebookId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    if (notebook && notebookId) {
      await fetchNotes(notebookId as string, notebook.uid);
    }
    setRefreshing(false);
  };

  const handleNotePress = (noteId: string) => {
    router.push({
      pathname: "/screens/Notes/shared-note-viewer",
      params: { noteId },
    });
    addBacklogEvent("public_note_viewed", { noteId, notebookId });
  };

  const renderNote = ({ item }: { item: Note }) => {
    const primaryProperty = item.properties?.[0];
    
    return (
      <TouchableOpacity
        style={styles.noteCard}
        onPress={() => handleNotePress(item.id)}
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
            <View style={styles.notePublicBadge}>
              <Ionicons name="globe" size={10} color="#52C72B" />
            </View>
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
          {/* Header with Public Badge */}
          <View style={styles.infoCardHeader}>
            <View style={styles.accentLine} />
            <View style={styles.publicBadge}>
              <Ionicons name="globe-outline" size={14} color="#52C72B" />
              <Text style={styles.publicBadgeText}>Public</Text>
            </View>
          </View>
          
          <View style={styles.titleRow}>
            <Text style={styles.notebookTitle}>{notebook?.title}</Text>
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
                <Text style={styles.sectionLabel}>Tags</Text>
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
                {notes.length === 1 ? 'public note' : 'public notes'}
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
          <Text style={styles.notesHeaderTitle}>Public Notes</Text>
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
                <Ionicons name="lock-closed-outline" size={48} color="#4b5563" />
              </View>
              <Text style={styles.emptyText}>No public notes</Text>
              <Text style={styles.emptySubtext}>
                The owner hasn't made any notes public yet
              </Text>
            </View>
          }
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
    paddingBottom: 40,
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
  titleRow: {
    marginBottom: 16,
  },
  notebookTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
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
});