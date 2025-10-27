// app/screens/Profile/ProfileScreen.tsx
import { useAuth } from '@/app/contexts/AuthContext';
import { Notebook } from '@/app/types/notebook';
import EditProfileModal from '@/components/Interface/edit-profile-modal';
import BottomNavigation from '@/components/Interface/nav-bar';
import { getAvatarUrl } from '@/constants/avatars';
import { db } from '@/firebase';
import { getPublicNotebooks } from '@/services/notes-service';
import { Quiz, QuizService } from '@/services/quiz-service';
import { getPublicUserStats, getUserStats } from '@/services/user-stats-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import LottieView from 'lottie-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
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

type TabType = 'overview' | 'notebooks' | 'quizzes';

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
  const [publicNotebooks, setPublicNotebooks] = useState<Notebook[]>([]);
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
      const [quizzes, notebooks] = await Promise.all([
        QuizService.getPublicQuizzes(viewingUserId!),
        getPublicNotebooks(viewingUserId!),
      ]);
      
      setPublicQuizzes(quizzes);
      setPublicNotebooks(notebooks);
      
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
      month: 'short',
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

  const handleNotebookPress = (notebookId: string) => {
    router.push({
      pathname: '/screens/Notes/public-note-viewer',
      params: { notebookId },
    });
  };

  if (loading) {
    return (
      <LinearGradient colors={['#0f2c45', '#1a3a52']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <LottieView
              source={require('@/assets/animations/quiz-loading.json')}
              autoPlay
              loop
              style={styles.lottieAnimation}
            />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!userData) {
    return (
      <LinearGradient colors={['#0f2c45', '#1a3a52']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <View style={styles.errorIconContainer}>
              <Ionicons name="person-outline" size={48} color="#EE007F" />
            </View>
            <Text style={styles.errorText}>Profile not found</Text>
            <Text style={styles.errorSubtext}>This user may no longer exist</Text>
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
            <View style={styles.statCard}>
              <LinearGradient
                colors={['#FF999A', '#EE007F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statGradient}
              />
              <View style={styles.statContent}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="create" size={20} color="#fff" />
                </View>
                <View style={styles.statInfo}>
                  <Text style={styles.statNumber}>{stats.totalQuizzesCreated}</Text>
                  <Text style={styles.statLabel}>Quizzes</Text>
                </View>
              </View>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={['#6ADBCE', '#568CD2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statGradient}
              />
              <View style={styles.statContent}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="book" size={20} color="#fff" />
                </View>
                <View style={styles.statInfo}>
                  <Text style={styles.statNumber}>{stats.totalNotebooksCreated || 0}</Text>
                  <Text style={styles.statLabel}>Notebooks</Text>
                </View>
              </View>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={['#63DC9A', '#52C72B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statGradient}
              />
              <View style={styles.statContent}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                </View>
                <View style={styles.statInfo}>
                  <Text style={styles.statNumber}>{stats.quizzesTaken}</Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
              </View>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={['#F2CD41', '#E77F00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statGradient}
              />
              <View style={styles.statContent}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="trophy" size={20} color="#fff" />
                </View>
                <View style={styles.statInfo}>
                  <Text style={styles.statNumber}>{stats.averageQuizScore}%</Text>
                  <Text style={styles.statLabel}>Avg Score</Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.statCard}>
              <LinearGradient
                colors={['#FF999A', '#EE007F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statGradient}
              />
              <View style={styles.statContent}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="game-controller" size={20} color="#fff" />
                </View>
                <View style={styles.statInfo}>
                  <Text style={styles.statNumber}>{stats.publicQuizzes}</Text>
                  <Text style={styles.statLabel}>Public Quizzes</Text>
                </View>
              </View>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={['#6ADBCE', '#568CD2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statGradient}
              />
              <View style={styles.statContent}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="book" size={20} color="#fff" />
                </View>
                <View style={styles.statInfo}>
                  <Text style={styles.statNumber}>{stats.publicNotebooks || 0}</Text>
                  <Text style={styles.statLabel}>Public Notebooks</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );

  const renderNotebooksTab = () => (
    <View style={styles.tabContent}>
      {publicNotebooks.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <LinearGradient
              colors={['#568CD2', '#6ADBCE']}
              style={styles.emptyIconGradient}
            >
              <Ionicons name="book-outline" size={32} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.emptyText}>No public notebooks yet</Text>
          <Text style={styles.emptySubtext}>Notebooks will appear here when shared publicly</Text>
        </View>
      ) : (
        publicNotebooks.map((notebook) => (
          <TouchableOpacity
            key={notebook.id}
            style={styles.contentCard}
            onPress={() => handleNotebookPress(notebook.id!)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#568CD2', '#6ADBCE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.contentCardAccent}
            />
            
            <View style={styles.cardIconWrapper}>
              <LinearGradient
                colors={['#568CD2', '#6ADBCE']}
                style={styles.cardIconGradient}
              >
                <Ionicons name="book" size={22} color="#fff" />
              </LinearGradient>
            </View>
            
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {notebook.title}
              </Text>
              {notebook.description && (
                <Text style={styles.cardDescription} numberOfLines={1}>
                  {notebook.description}
                </Text>
              )}
              <View style={styles.cardFooter}>
                <View style={styles.cardDate}>
                  <Ionicons name="time-outline" size={12} color="#6b7280" />
                  <Text style={styles.cardDateText}>
                    {notebook.updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={styles.cardArrow}>
              <Ionicons name="chevron-forward" size={18} color="#6b7280" />
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const renderQuizzesTab = () => (
    <View style={styles.tabContent}>
      {publicQuizzes.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <LinearGradient
              colors={['#FF999A', '#EE007F']}
              style={styles.emptyIconGradient}
            >
              <Ionicons name="game-controller-outline" size={32} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.emptyText}>No public quizzes yet</Text>
          <Text style={styles.emptySubtext}>Quizzes will appear here when shared publicly</Text>
        </View>
      ) : (
        publicQuizzes.map((quiz) => (
          <TouchableOpacity
            key={quiz.id}
            style={styles.contentCard}
            onPress={() => handleQuizPress(quiz.id!)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#FF999A', '#EE007F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.contentCardAccent}
            />
            
            <View style={styles.cardIconWrapper}>
              <LinearGradient
                colors={['#FF999A', '#EE007F']}
                style={styles.cardIconGradient}
              >
                <Ionicons name="game-controller" size={20} color="#fff" />
              </LinearGradient>
            </View>
            
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {quiz.title}
              </Text>
              <View style={styles.quizMeta}>
                <View style={styles.quizMetaItem}>
                  <Ionicons name="help-circle" size={12} color="#6ADBCE" />
                  <Text style={styles.quizMetaText}>{quiz.questions.length} questions</Text>
                </View>
                {quiz.category && (
                  <View style={styles.quizMetaItem}>
                    <Ionicons name="pricetag" size={12} color="#F2CD41" />
                    <Text style={styles.quizMetaText}>{quiz.category}</Text>
                  </View>
                )}
              </View>
            </View>
            
            <View style={styles.cardArrow}>
              <Ionicons name="chevron-forward" size={18} color="#6b7280" />
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  return (
    <LinearGradient 
      colors={['#0f2c45', '#1a3a52']} 
      start={{ x: 0, y: 0 }} 
      end={{ x: 0, y: 1 }} 
      style={styles.container}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
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
            {/* Decorative gradient bar */}
            <LinearGradient
              colors={['#6ADBCE', '#568CD2', '#EE007F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.decorativeBar}
            />
            
            <View style={styles.profileHeader}>
              <View style={styles.avatarWrapper}>
                <LinearGradient
                  colors={['#6ADBCE', '#568CD2']}
                  style={styles.avatarBorder}
                >
                  <View style={styles.avatarInner}>
                    <Image
                      source={{ uri: getAvatarUrl(userData.avatarIndex || 0) }}
                      style={styles.avatar}
                    />
                  </View>
                </LinearGradient>
              </View>

              <View style={styles.profileInfo}>
                <Text style={styles.displayName}>{userData.displayName}</Text>
                
                {userData.bio && (
                  <Text style={styles.bio} numberOfLines={2}>{userData.bio}</Text>
                )}

                <View style={styles.memberBadge}>
                  <Ionicons name="calendar" size={13} color="#6ADBCE" />
                  <Text style={styles.memberText}>
                    Joined {formatMemberSince(userData.createdAt?.toDate ? userData.createdAt.toDate() : new Date())}
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            {isOwnProfile && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={handleEditProfile}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#6ADBCE', '#568CD2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.editButtonBorder}
                  >
                    <View style={styles.editButtonInner}>
                      <Ionicons name="create" size={16} color="#6ADBCE" />
                      <Text style={styles.editButtonText}>Edit Profile</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.previewButton, previewMode && styles.previewButtonActive]}
                  onPress={() => {
                    setPreviewMode(!previewMode);
                    loadProfileData();
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons 
                    name={previewMode ? "eye-off" : "eye"} 
                    size={18} 
                    color={previewMode ? "#fff" : "#6ADBCE"} 
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Segment Control Tabs */}
          <View style={styles.segmentControl}>
            <TouchableOpacity
              style={[styles.segment, activeTab === 'overview' && styles.segmentActive]}
              onPress={() => setActiveTab('overview')}
              activeOpacity={0.7}
            >
              {activeTab === 'overview' && (
                <LinearGradient
                  colors={['#6ADBCE', '#568CD2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.segmentGradient}
                />
              )}
              <Ionicons
                name="grid"
                size={16}
                color={activeTab === 'overview' ? '#fff' : '#6b7280'}
                style={styles.segmentIcon}
              />
              <Text style={[styles.segmentText, activeTab === 'overview' && styles.segmentTextActive]}>
                Overview
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segment, activeTab === 'notebooks' && styles.segmentActive]}
              onPress={() => setActiveTab('notebooks')}
              activeOpacity={0.7}
            >
              {activeTab === 'notebooks' && (
                <LinearGradient
                  colors={['#6ADBCE', '#568CD2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.segmentGradient}
                />
              )}
              <Ionicons
                name="book"
                size={16}
                color={activeTab === 'notebooks' ? '#fff' : '#6b7280'}
                style={styles.segmentIcon}
              />
              <Text style={[styles.segmentText, activeTab === 'notebooks' && styles.segmentTextActive]}>
                Notebooks
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segment, activeTab === 'quizzes' && styles.segmentActive]}
              onPress={() => setActiveTab('quizzes')}
              activeOpacity={0.7}
            >
              {activeTab === 'quizzes' && (
                <LinearGradient
                  colors={['#6ADBCE', '#568CD2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.segmentGradient}
                />
              )}
              <Ionicons
                name="game-controller"
                size={16}
                color={activeTab === 'quizzes' ? '#fff' : '#6b7280'}
                style={styles.segmentIcon}
              />
              <Text style={[styles.segmentText, activeTab === 'quizzes' && styles.segmentTextActive]}>
                Quizzes
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'notebooks' && renderNotebooksTab()}
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
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(106, 219, 206, 0.1)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  
  // Profile Card
  profileCard: {
    margin: 20,
    marginBottom: 16,
    backgroundColor: '#1a2332',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(106, 219, 206, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  decorativeBar: {
    height: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 16,
  },
  avatarWrapper: {
    marginRight: 16,
  },
  avatarBorder: {
    padding: 3,
    borderRadius: 50,
  },
  avatarInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#0f1419',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  bio: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 18,
    marginBottom: 8,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(106, 219, 206, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  memberText: {
    fontSize: 12,
    color: '#6ADBCE',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  editButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  editButtonBorder: {
    padding: 1.5,
    borderRadius: 12,
  },
  editButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a2332',
    paddingVertical: 11.5,
    borderRadius: 10.5,
    gap: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6ADBCE',
    letterSpacing: 0.2,
  },
  previewButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(106, 219, 206, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(106, 219, 206, 0.3)',
  },
  previewButtonActive: {
    backgroundColor: 'rgba(106, 219, 206, 0.25)',
    borderColor: '#6ADBCE',
  },

  // Segment Control
  segmentControl: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#1a2332',
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(106, 219, 206, 0.15)',
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
    position: 'relative',
    overflow: 'hidden',
    gap: 6,
  },
  segmentActive: {
    // Gradient applied via LinearGradient
  },
  segmentGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  segmentIcon: {
    zIndex: 1,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    zIndex: 1,
  },
  segmentTextActive: {
    color: '#fff',
  },

  // Tab Content
  tabContent: {
    paddingHorizontal: 20,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  statGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.85,
    marginTop: 2,
  },

  // Content Cards
  contentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a2332',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(106, 219, 206, 0.15)',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  contentCardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  cardIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 14,
    marginLeft: 6,
  },
  cardIconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notebookCover: {
    width: '100%',
    height: '100%',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  cardDescription: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 8,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardDateText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  cardArrow: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // Quiz Meta
  quizMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  quizMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quizMetaText: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    marginBottom: 16,
  },
  emptyIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIconContainer: {
    marginBottom: 20,
  },
  loadingIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6ADBCE',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  loadingText: {
    fontSize: 15,
    color: '#9ca3af',
    fontWeight: '500',
  },

  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(238, 0, 127, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(238, 0, 127, 0.3)',
  },
  errorText: {
    fontSize: 18,
    color: '#EE007F',
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  lottieAnimation: {
    width: 100,
    height: 100,
    marginBottom: 3,
  },
});