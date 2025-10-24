// app/screens/Notes/public-note-viewer.tsx
import { Note } from '@/app/types/notebook';
import { getMergedNoteContent, getNoteById } from '@/services/notes-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function PublicNoteViewer() {
  const router = useRouter();
  const { noteId } = useLocalSearchParams();
  const [note, setNote] = useState<Note | null>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (noteId && typeof noteId === 'string') {
      loadNote(noteId);
    }
  }, [noteId]);

  const loadNote = async (id: string) => {
    try {
      setLoading(true);
      const noteData = await getNoteById(id);
      
      if (!noteData) {
        Alert.alert('Error', 'Note not found');
        router.back();
        return;
      }

      if (!noteData.isPublic) {
        Alert.alert('Error', 'This note is not public');
        router.back();
        return;
      }

      setNote(noteData);
      
      // Load the merged content
      const mergedContent = await getMergedNoteContent(id);
      setContent(mergedContent);
    } catch (error) {
      console.error('Error loading public note:', error);
      Alert.alert('Error', 'Failed to load note');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={['#0f2c45', '#324762']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6ADBCE" />
            <Text style={styles.loadingText}>Loading note...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!note) {
    return (
      <LinearGradient colors={['#0f2c45', '#324762']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#EE007F" />
            <Text style={styles.errorText}>Note not found</Text>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0f2c45', '#324762']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.container}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {note.title}
            </Text>
            <View style={styles.publicBadge}>
              <Ionicons name="globe-outline" size={12} color="#52C72B" />
              <Text style={styles.publicBadgeText}>Public</Text>
            </View>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Note Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Note Metadata */}
          <View style={styles.metadataCard}>
            <View style={styles.metadataRow}>
              <View style={styles.metadataItem}>
                <Ionicons name="calendar-outline" size={16} color="#6ADBCE" />
                <Text style={styles.metadataLabel}>Created</Text>
                <Text style={styles.metadataValue}>
                  {note.createdAt.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <View style={styles.metadataDivider} />
              <View style={styles.metadataItem}>
                <Ionicons name="time-outline" size={16} color="#568CD2" />
                <Text style={styles.metadataLabel}>Updated</Text>
                <Text style={styles.metadataValue}>
                  {note.updatedAt.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>

            {/* Tags */}
            {note.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {note.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Ionicons name="pricetag" size={10} color="#F2CD41" />
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Properties */}
            {note.properties.length > 0 && (
              <View style={styles.propertiesContainer}>
                {note.properties.map((prop, index) => (
                  <View key={index} style={styles.propertyRow}>
                    <Text style={styles.propertyKey}>{prop.key}:</Text>
                    <Text style={styles.propertyValue}>{prop.value}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Content Card */}
          <View style={styles.contentCard}>
            <View style={styles.contentHeader}>
              <Ionicons name="document-text-outline" size={20} color="#6ADBCE" />
              <Text style={styles.contentHeaderText}>Content</Text>
            </View>
            <View style={styles.contentBody}>
              {content ? (
                <Text style={styles.contentText}>{content}</Text>
              ) : (
                <Text style={styles.emptyContent}>No content available</Text>
              )}
            </View>
          </View>

          {/* Read-only Notice */}
          <View style={styles.noticeCard}>
            <Ionicons name="information-circle-outline" size={20} color="#568CD2" />
            <Text style={styles.noticeText}>
              This is a public view. You cannot edit this note.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(82, 199, 43, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  publicBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#52C72B',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  metadataCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(106, 219, 206, 0.2)',
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metadataItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  metadataDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  metadataLabel: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  metadataValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(242, 205, 65, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#F2CD41',
    fontWeight: '600',
  },
  propertiesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
  },
  propertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  propertyKey: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  propertyValue: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  contentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(106, 219, 206, 0.2)',
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  contentHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6ADBCE',
  },
  contentBody: {
    padding: 16,
  },
  contentText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#e5e7eb',
  },
  emptyContent: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(86, 140, 210, 0.15)',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(86, 140, 210, 0.3)',
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: '#568CD2',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#EE007F',
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#6ADBCE',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});