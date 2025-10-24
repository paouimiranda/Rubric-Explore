// app/screens/Notes/shared-note-viewer.tsx (VERY OUTDATED!)
import { useAuth } from '@/app/contexts/AuthContext';
import { Note } from '@/app/types/notebook';
import { db } from '@/firebase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import NoteEditor from './note-editor';


export default function SharedNoteViewer() {
  const { noteId, permission, isSharedAccess } = useLocalSearchParams();
  const { user } = useAuth();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  

  useEffect(() => {
    if (noteId) {
      fetchSharedNote(noteId as string);
    }
  }, [noteId]);

  const fetchSharedNote = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const docRef = doc(db, "notes", id);
      const snap = await getDoc(docRef);
      
      if (snap.exists()) {
        const data = snap.data();
        
        // Enhanced permission validation for shared access
        const isOwner = user && data.uid === user.uid;
        const isCollaborator = user && data.collaborators && data.collaborators[user.uid];
        const hasValidShare = isSharedAccess === 'true'; // Coming from share link
        
        // For shared access, we trust the permission from the share token validation
        // but still check basic access rights
        if (!hasValidShare && !isOwner && !isCollaborator) {
          throw new Error("You don't have permission to access this note");
        }
        
        const noteData = {
          id: snap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Note;
        
        // Ensure collaborative fields exist for granular updates
        
        setNote(noteData);
        
      } else {
        throw new Error("Note not found");
      }
    } catch (error: any) {
      console.error("Error fetching shared note:", error);
      setError(error.message || "Failed to load shared note");
      Alert.alert("Error", error.message || "Failed to load shared note");
    } finally {
      setLoading(false);
    }
  };

  // Don't render until we have the note data
  // The collaborative hook needs the note to exist for proper initialization
  if (loading) {
  return (
    <LinearGradient colors={["#324762", "#0A1C3C"]} style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#60a5fa" />
        <Text style={styles.loadingText}>Loading shared note...</Text>
      </View>
    </LinearGradient>
  );
}

if (error) {
  return (
    <LinearGradient colors={["#324762", "#0A1C3C"]} style={styles.container}>
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

if (!note) {
  return null;
}


  // Enhanced shared props with better collaborative support
  const sharedProps = {
    isSharedAccess: isSharedAccess === 'true',
    sharedPermission: permission as 'view' | 'edit',
    sharedNote: note,
  };

  return (
    <NoteEditor 
      {...sharedProps}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 24,
    backgroundColor: '#60a5fa',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
});