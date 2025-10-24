// app/screens/Profile/ProfileScreen.tsx
import { useAuth } from '@/app/contexts/AuthContext';
import { Note } from '@/app/types/notebook';
import EditProfileModal from '@/components/Interface/edit-profile-modal';
import BottomNavigation from '@/components/Interface/nav-bar';
import { getAvatarUrl } from '@/constants/avatars';
import { db } from '@/firebase';
import { getPublicNotes } from '@/services/notes-service';
import { Quiz, QuizService } from '@/services/quiz-service';
import { getPublicUserStats, getUserStats } from '@/services/user-stats-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';


interface UserData {
  uid: string;
  firstName: string;
  lastName: string;
  displayName: string;
  bio: string;
  avatarIndex: number;
  createdAt: any;
}

type TabType = 'overview' | 'notes' | 'quizzes';

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { userId } = useLocalSearchParams();
  
  // Determine if viewing own profile or someone else's
  const viewingUserId = (userId as string) || user?.uid;
  const isOwnProfile = !userId || userId === user?.uid;
  
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [publicQuizzes, setPublicQuizzes] = useState<Quiz[]>([]);
  const [publicNotes, setPublicNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (viewingUserId) {
      loadProfileData();
    }
  }, [viewingUserId]);

  useFocusEffect(
    useCallback(() => {
      if (viewingUserId) {
        loadProfileData();
      }
    }, [viewingUserId])
  );

  const loadProfileData = async () => {
    try {
      setLoading(true);
      
      // Fetch user document
      const userRef = doc(db, 'users', viewingUserId!);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        Alert.alert('Error', 'User not found');
        router.back();
        return;
      }
      
      const userData = userSnap.data() as UserData;
      setUserData(userData);
      
      // Fetch stats (own profile gets full stats, others get public stats only)
      if (isOwnProfile && !previewMode) {
        const userStats = await getUserStats(viewingUserId!);
        setStats(userStats);
      } else {
        const publicStats = await getPublicUserStats(viewingUserId!);
        setStats(publicStats);
      }
      
      // Fetch public content
      const [quizzes, notes] = await Promise.all([
        QuizService.getPublicQuizzes(viewingUserId!),
        getPublicNotes(viewingUserId!),
      ]);
      
      setPublicQuizzes(quizzes);
      setPublicNotes(notes);
      
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfileData();
    setRefreshing(false);
  };

  const formatMemberSince = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleEditProfile = () => {
    setEditModalVisible(true);
  };

  const handleQuizPress = (quizId: string) => {
    router.push({
      pathname: '/screens/Quiz/quiz-preview',
      params: { quizId },
    });
  };

  const handleNotePress = (noteId: string) => {
    router.push({
      pathname: '/screens/Notes/public-note-viewer',
      params: { noteId },
    });
  };

  if (loading) {
    return (
      <LinearGradient colors={['#0f2c45', '#324762']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6ADBCE" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!userData) {
    return (
      <LinearGradient colors={['#0f2c45', '#324762']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Ionicons name="person-outline" size={64} color="#EE007F" />
            <Text style={styles.errorText}>Profile not found</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {isOwnProfile && !previewMode ? (
          <>
            <View style={[styles.statCard, { backgroundColor: '#FF999A' }]}>
              <Ionicons name="create-outline" size={28} color="#fff" />
              <Text style={styles.statNumber}>{stats.totalQuizzesCreated}</Text>
              <Text style={styles.statLabel}>Quizzes Created</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#568CD2' }]}>
              <Ionicons name="document-text-outline" size={28} color="#fff" />
              <Text style={styles.statNumber}>{stats.totalNotesCreated}</Text>
              <Text style={styles.statLabel}>Notes Created</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#52C72B' }]}>
              <Ionicons name="checkmark-circle-outline" size={28} color="#fff" />
              <Text style={styles.statNumber}>{stats.quizzesTaken}</Text>
              <Text style={styles.statLabel}>Quizzes Taken</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#F2CD41' }]}>
              <Ionicons name="trophy-outline" size={28} color="#fff" />
              <Text style={styles.statNumber}>{stats.averageQuizScore}%</Text>
              <Text style={styles.statLabel}>Avg Score</Text>
            </View>
          </>
        ) : (
          <>
            <View style={[styles.statCard, { backgroundColor: '#FF999A' }]}>
              <Ionicons name="game-controller-outline" size={28} color="#fff" />
              <Text style={styles.statNumber}>{stats.publicQuizzes}</Text>
              <Text style={styles.statLabel}>Public Quizzes</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#568CD2' }]}>
              <Ionicons name="document-text-outline" size={28} color="#fff" />
              <Text style={styles.statNumber}>{stats.publicNotes}</Text>
              <Text style={styles.statLabel}>Public Notes</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );

  const renderNotesTab = () => (
    <View style={styles.tabContent}>
      {publicNotes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-outline" size={64} color="#6b7280" />
          <Text style={styles.emptyText}>No public notes</Text>
        </View>
      ) : (
        publicNotes.map((note) => (
          <TouchableOpacity
            key={note.id}
            style={styles.contentCard}
            onPress={() => handleNotePress(note.id)}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="document-text" size={24} color="#568CD2" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {note.title}
              </Text>
              <Text style={styles.cardDate}>
                Updated {note.updatedAt.toLocaleDateString()}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const renderQuizzesTab = () => (
    <View style={styles.tabContent}>
      {publicQuizzes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="game-controller-outline" size={64} color="#6b7280" />
          <Text style={styles.emptyText}>No public quizzes</Text>
        </View>
      ) : (
        publicQuizzes.map((quiz) => (
          <TouchableOpacity
            key={quiz.id}
            style={styles.contentCard}
            onPress={() => handleQuizPress(quiz.id!)}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="game-controller" size={24} color="#FF999A" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {quiz.title}
              </Text>
              <View style={styles.quizMeta}>
                <View style={styles.quizMetaItem}>
                  <Ionicons name="help-circle-outline" size={14} color="#6ADBCE" />
                  <Text style={styles.quizMetaText}>{quiz.questions.length} questions</Text>
                </View>
                {quiz.category && (
                  <View style={styles.quizMetaItem}>
                    <Ionicons name="folder-outline" size={14} color="#F2CD41" />
                    <Text style={styles.quizMetaText}>{quiz.category}</Text>
                  </View>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  return (
    <LinearGradient colors={['#0f2c45', '#324762']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.container}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6ADBCE"
              colors={['#6ADBCE']}
            />
          }
        >
          {/* Profile Header Card */}
          <View style={styles.profileCard}>
            <LinearGradient
              colors={['#FF999A', '#EE007F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileGradient}
            />
            
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: getAvatarUrl(userData.avatarIndex || 0) }}
                style={styles.avatar}
              />
            </View>

            <Text style={styles.displayName}>{userData.displayName}</Text>
            
            {userData.bio && (
              <Text style={styles.bio}>{userData.bio}</Text>
            )}

            <View style={styles.memberInfo}>
              <Ionicons name="calendar-outline" size={16} color="#6ADBCE" />
              <Text style={styles.memberText}>
                Joined {formatMemberSince(userData.createdAt?.toDate ? userData.createdAt.toDate() : new Date())}
              </Text>
              <Text style={styles.memberDot}>•</Text>
              <Text style={styles.memberText}>
                {stats?.publicQuizzes || 0} Public Quizzes
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {isOwnProfile && (
                <>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleEditProfile}
                  >
                    <Ionicons name="create-outline" size={18} color="#fff" />
                    <Text style={styles.primaryButtonText}>Edit Profile</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.secondaryButton, previewMode && styles.activePreview]}
                    onPress={() => {
                      setPreviewMode(!previewMode);
                      loadProfileData();
                    }}
                  >
                    <Ionicons name={previewMode ? "eye-off-outline" : "eye-outline"} size={18} color="#6ADBCE" />
                    <Text style={styles.secondaryButtonText}>
                      {previewMode ? 'Exit Preview' : 'Preview as Public'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
              onPress={() => setActiveTab('overview')}
            >
              <Ionicons
                name="grid-outline"
                size={20}
                color={activeTab === 'overview' ? '#6ADBCE' : '#6b7280'}
              />
              <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
                Overview
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'notes' && styles.activeTab]}
              onPress={() => setActiveTab('notes')}
            >
              <Ionicons
                name="document-text-outline"
                size={20}
                color={activeTab === 'notes' ? '#6ADBCE' : '#6b7280'}
              />
              <Text style={[styles.tabText, activeTab === 'notes' && styles.activeTabText]}>
                Notes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'quizzes' && styles.activeTab]}
              onPress={() => setActiveTab('quizzes')}
            >
              <Ionicons
                name="game-controller-outline"
                size={20}
                color={activeTab === 'quizzes' ? '#6ADBCE' : '#6b7280'}
              />
              <Text style={[styles.tabText, activeTab === 'quizzes' && styles.activeTabText]}>
                Quizzes
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'notes' && renderNotesTab()}
          {activeTab === 'quizzes' && renderQuizzesTab()}
        </ScrollView>

        {/* Edit Profile Modal */}
        <EditProfileModal
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          currentData={{
            firstName: userData.firstName,
            lastName: userData.lastName,
            bio: userData.bio || '',
            avatarIndex: userData.avatarIndex || 0,
            uid: userData.uid,
          }}
          onSave={() => {
            loadProfileData();
          }}
        />
        <BottomNavigation/>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileCard: {
    margin: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(106, 219, 206, 0.2)',
    position: 'relative',
    overflow: 'hidden',
  },
  profileGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    opacity: 0.1,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#6ADBCE',
    marginBottom: 16,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 6,
  },
  memberText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  memberDot: {
    fontSize: 13,
    color: '#6b7280',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#52C72B',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(106, 219, 206, 0.15)',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(106, 219, 206, 0.3)',
  },
  activePreview: {
    backgroundColor: 'rgba(106, 219, 206, 0.25)',
    borderColor: '#6ADBCE',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6ADBCE',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  activeTab: {
    backgroundColor: 'rgba(106, 219, 206, 0.2)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#6ADBCE',
  },
  tabContent: {
    paddingHorizontal: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },
  contentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(106, 219, 206, 0.2)',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  quizMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  quizMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quizMetaText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
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
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#EE007F',
    fontWeight: '600',
  },
});