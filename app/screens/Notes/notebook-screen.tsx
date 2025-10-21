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
import { createNote, deleteNote, getNotesInNotebook } from '../../../services/notes-service';

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

  // Default cover images mapping (same as in index.tsx)
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
    
    // Check if it's a default image ID
    if (defaultCoverImages[coverImage as keyof typeof defaultCoverImages]) {
      return defaultCoverImages[coverImage as keyof typeof defaultCoverImages];
    }
    
    // Otherwise treat as URL
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
        // Add user validation for security
        if (data.uid !== uid) {
          Alert.alert("Error", "You don't have permission to view this notebook");
          router.back();
          return;
        }
        setNotebook({
          id: snap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Notebook);
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

  // Refresh data when screen comes into focus
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
      >
        <View style={styles.noteContent}>
          <Text style={styles.noteTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {primaryProperty && (
            <Text style={styles.noteProperty}>
              {primaryProperty.key}: {primaryProperty.value}
            </Text>
          )}
          <View style={styles.noteDateContainer}>
            <Text style={styles.noteDate}>
              Created: {item.createdAt.toLocaleDateString()}
            </Text>
            {item.updatedAt.getTime() !== item.createdAt.getTime() && (
              <Text style={styles.noteDate}>
                Updated: {item.updatedAt.toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.noteActions}>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderNotebookHeader = () => (
    <View style={styles.headerContainer}>
      {/* Cover Image */}
      {notebook?.coverImage ? (
        <Image 
          source={getCoverImageSource(notebook.coverImage) || require('@/assets/covers/notebook1.jpg')} 
          style={styles.coverImage} 
        />
      ) : (
        <View style={styles.coverPlaceholder}>
          <Ionicons name="book-outline" size={48} color="#9ca3af" />
        </View>
      )}

      {/* Notebook Info */}
      <View style={styles.notebookHeader}>
        <Text style={styles.notebookTitle}>{notebook?.title}</Text>
        {notebook?.description ? (
          <Text style={styles.notebookDescription}>{notebook.description}</Text>
        ) : null}
        
        {/* Tags */}
        {notebook?.tags && notebook.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {notebook.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Properties */}
        {notebook?.properties && notebook.properties.length > 0 && (
          <View style={styles.propertiesContainer}>
            {notebook.properties.map((property, index) => (
              <Text key={index} style={styles.notebookProperty}>
                {property.key}: {property.value}
              </Text>
            ))}
          </View>
        )}

        {/* Notes Count */}
        <Text style={styles.notesCount}>
          {notes.length} {notes.length === 1 ? 'note' : 'notes'}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <LinearGradient colors={["#324762", "#0A1C3C"]} style={styles.loadingContainer}>
        <SafeAreaView style={styles.loadingContent}>
          <Ionicons name="book-outline" size={64} color="#4b5563" />
          <Text style={styles.loadingText}>Loading notebook...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!notebook) {
    return (
      <LinearGradient colors={["#324762", "#0A1C3C"]} style={styles.loadingContainer}>
        <SafeAreaView style={styles.loadingContent}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
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
    <LinearGradient colors={["#324762", "#0A1C3C"]} style={styles.container}>
      <SafeAreaView style={styles.container}>
        {/* Header with Back Button */}
        <View style={styles.topHeader}>
          <TouchableOpacity 
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notebook</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlatList
          data={notes}
          renderItem={renderNote}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderNotebookHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#fff"
              colors={["#3b82f6"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color="#4b5563" />
              <Text style={styles.emptyText}>No notes yet</Text>
              <Text style={styles.emptySubtext}>
                Tap the + button to create your first note
              </Text>
            </View>
          }
        />

        {/* Floating Action Button */}
        <TouchableOpacity style={styles.fab} onPress={handleCreateNote}>
          <Ionicons name="add" size={28} color="#ffffff" />
        </TouchableOpacity>
      </SafeAreaView>
    </LinearGradient>
  );
}

// Add your existing styles here - they should remain the same
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
  loadingText: {
    color: '#9ca3af',
    fontSize: 16,
    marginTop: 16,
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
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  backBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 120,
  },
  headerContainer: {
    padding: 16,
  },
  coverImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  coverPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  notebookHeader: {
    marginBottom: 20,
  },
  notebookTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  notebookDescription: {
    color: '#d1d5db',
    fontSize: 16,
    marginBottom: 12,
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  propertiesContainer: {
    marginBottom: 12,
  },
  notebookProperty: {
    color: '#d1d5db',
    fontSize: 14,
    marginBottom: 4,
  },
  notesCount: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  noteCard: {
    backgroundColor: '#1f2937',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  noteContent: {
    flex: 1,
    marginRight: 12,
  },
  noteTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  noteProperty: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 8,
  },
  noteDateContainer: {
    flexDirection: 'column',
  },
  noteDate: {
    color: '#6b7280',
    fontSize: 12,
    marginBottom: 2,
  },
  noteActions: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});