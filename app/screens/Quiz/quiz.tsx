// File: app/Quiz/quiz.tsx - Enhanced Quiz Home Screen with Cover Images
import { CustomAlertModal } from '@/components/Interface/custom-alert-modal';
import JoinSessionModal from '@/components/Interface/join-session-modal';
import BottomNavigation from "@/components/Interface/nav-bar";
import { useBacklogLogger } from '@/hooks/useBackLogLogger'; // NEW: Added import
import { BACKLOG_EVENTS } from '@/services/backlogEvents';
import { getQuizImageSource } from '@/services/image-service';
import { QuizService, type Quiz } from '@/services/quiz-service';
import { useQuizStore } from '@/services/stores/quiz-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useCallback, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width } = Dimensions.get('window');

const QuizHome = () => {
  const router = useRouter();
  const resetToDefaults = useQuizStore((state) => state.resetToDefaults);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { addBacklogEvent, logError } = useBacklogLogger();
  const [pendingQuizNavigation, setPendingQuizNavigation] = useState(false);
  const [pendingQuizCreation, setPendingQuizCreation] = useState(false);
  // Alert modal state
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

  useFocusEffect(
    useCallback(() => {
      setPendingQuizNavigation(false);
      setPendingQuizCreation(false);
      loadQuizzes();
    }, [])
  );

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const data = await QuizService.getAllQuizzes();
      setQuizzes(data);
      addBacklogEvent(BACKLOG_EVENTS.USER_VIEWED_QUIZ_LIST, {
        quizCount: data.length,
      });
    } catch (error) {
      console.error('Error loading quizzes:', error);
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to load quizzes. Please try again.',
        buttons: [
          {
            text: 'OK',
            onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
            style: 'primary',
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMultiplayer = () => {
    setJoinModalVisible(true);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadQuizzes();
    setRefreshing(false);
  };

  const handleCreateNewQuiz = () => {
    if (pendingQuizCreation) return;
    
    setPendingQuizCreation(true);
    resetToDefaults();
    router.push('./quiz-overview');
    addBacklogEvent(BACKLOG_EVENTS.USER_CREATED_QUIZ);
  };

  const handleEditQuiz = (quizId: string) => {
    resetToDefaults();
    addBacklogEvent(BACKLOG_EVENTS.USER_EDIT_QUIZ, {
      quizId
    });
    router.push({
      pathname: './quiz-overview',
      params: { quizId }
    });
  };

  const handlePlayQuiz = (quizId: string) => {
    addBacklogEvent(BACKLOG_EVENTS.USER_HOSTED_QUIZ_SESSION, {
      quizId
    });
    router.push({
      pathname: './quiz-preview',
      params: { quizId }
    });
  };

  const handleDeleteQuiz = (quizId: string, quizTitle: string) => {
    setAlertConfig({
      visible: true,
      type: 'warning',
      title: 'Delete Quiz',
      message: `Are you sure you want to delete "${quizTitle}"? This action cannot be undone.`,
      buttons: [
        {
          text: 'Cancel',
          onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            try {
              await QuizService.deleteQuiz(quizId);
              await loadQuizzes();
              setAlertConfig({
                visible: true,
                type: 'success',
                title: 'Success',
                message: 'Quiz deleted successfully!',
                buttons: [
                  {
                    text: 'OK',
                    onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
                    style: 'primary',
                  },
                ],
              });
              addBacklogEvent(BACKLOG_EVENTS.USER_DELETED_QUIZ, {
                quizId,
                quizTitle,
              });
            } catch (error) {
              console.error('Error deleting quiz:', error);
              setAlertConfig({
                visible: true,
                type: 'error',
                title: 'Error',
                message: 'Failed to delete quiz. Please try again.',
                buttons: [
                  {
                    text: 'OK',
                    onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
                    style: 'primary',
                  },
                ],
              });
            }
          },
          style: 'primary',
        },
      ],
    });
  };

  const getQuestionTypesPreview = (questions: any[]): string => {
    const types = [...new Set(questions.map(q => q.type))];
    const typeLabels = {
      'multiple_choice': 'Multiple Choice',
      'fill_blank': 'Fill in the Blank',
      'matching': 'Matching'
    };
    
    return types.map(type => typeLabels[type as keyof typeof typeLabels] || type).join(', ');
  };

  const getTotalTimeEstimate = (questions: any[]): string => {
    const totalSeconds = questions.reduce((sum, q) => sum + (q.timeLimit || 30), 0);
    const minutes = Math.ceil(totalSeconds / 60);
    return `${minutes}m`;
  };

  const QuizCard = ({ item }: { item: Quiz }) => {
    const [scaleAnim] = useState(new Animated.Value(1));
    const coverImageSource = item.coverImage ? getQuizImageSource(item.coverImage) : null;

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View style={[styles.quizCard, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          style={styles.quizCardContent}
          onPress={() =>
            {
              if (!pendingQuizNavigation) {
                setPendingQuizNavigation(true);
                handlePlayQuiz(item.id!);
              }
            }}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          {/* Gradient Accent Bar - Always shown */}
          <LinearGradient
            colors={['#8b5cf6', '#ec4899', '#f59e0b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.accentBar}
          />

          {/* Cover Image Section - Optional */}
          {coverImageSource && (
            <View style={styles.coverImageContainer}>
              <Image 
                source={coverImageSource}
                style={styles.coverImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(30, 41, 59, 0.9)', '#1e293b']}
                style={styles.imageGradientOverlay}
              />
            </View>
          )}

          {/* Content Section */}
          <View style={[styles.contentSection, !coverImageSource && styles.contentSectionNoCover]}>
            {/* Header Section */}
            <View style={styles.cardHeader}>
              <View style={styles.titleContainer}>
                <Text style={styles.quizTitle} numberOfLines={2}>
                  {item.title}
                </Text>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  disabled={pendingQuizNavigation}
                  onPress={() => {
                    if (!pendingQuizNavigation) {
                      setPendingQuizNavigation(true);
                      handleEditQuiz(item.id!);
                    }
                  }}
                  style={styles.iconButton}
                >
                  <Ionicons name="create-outline" size={20} color="#94a3b8" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteQuiz(item.id!, item.title)}
                  style={styles.iconButton}
                >
                  <Ionicons name="trash-outline" size={20} color="#f87171" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statChip}>
                <View style={[styles.statIcon, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                  <Ionicons name="help-circle" size={14} color="#a78bfa" />
                </View>
                <Text style={styles.statLabel}>{item.questions.length} Questions</Text>
              </View>

              <View style={styles.statChip}>
                <View style={[styles.statIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Ionicons name="time" size={14} color="#34d399" />
                </View>
                <Text style={styles.statLabel}>{getTotalTimeEstimate(item.questions)}</Text>
              </View>
            </View>

            {/* Question Types */}
            <View style={styles.typesContainer}>
              <Ionicons name="albums-outline" size={12} color="#64748b" />
              <Text style={styles.typesText} numberOfLines={1}>
                {getQuestionTypesPreview(item.questions)}
              </Text>
            </View>

            {/* Footer */}
            <View style={styles.cardFooter}>
              <Text style={styles.dateText}>
                {item.createdAt?.toDate?.()?.toLocaleDateString?.() || 'Recently'}
              </Text>
              
              <TouchableOpacity
                style={styles.playButtonCompact}
                onPress={() => handlePlayQuiz(item.id!)}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.playButtonGradient}
                >
                  <Ionicons name="play" size={16} color="#ffffff" />
                  <Text style={styles.playButtonCompactText}>Play</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.1)', 'rgba(236, 72, 153, 0.1)']}
          style={styles.emptyIconGradient}
        >
          <Ionicons name="library-outline" size={48} color="#8b5cf6" />
        </LinearGradient>
      </View>
      <Text style={styles.emptyStateTitle}>No Quizzes Yet</Text>
      <Text style={styles.emptyStateSubtext}>
        Create your first quiz and start learning
      </Text>
     <TouchableOpacity
        style={styles.createFirstQuizBtn}
        disabled={pendingQuizCreation}
        onPress={handleCreateNewQuiz}
      >
        <LinearGradient
          colors={['#8b5cf6', '#7c3aed']}
          style={styles.createFirstQuizGradient}
        >
          <Ionicons name="add-circle-outline" size={22} color="#ffffff" />
          <Text style={styles.createFirstQuizBtnText}>Create Your First Quiz</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const LoadingState = () => (
    <View style={styles.loadingState}>
      <LottieView
        source={require('@/assets/animations/quiz-loading.json')}
        autoPlay
        loop={false}
        style={styles.animation}
      />
      <Text style={styles.loadingText}>Loading your quizzes...</Text>
    </View>
  );

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#334155']}
      style={styles.container}
    >
      <SafeAreaView style={styles.container}>
        {/* Refactored Header - Title and buttons in single row */}
<View style={styles.headerContainer}>
  <View style={styles.titleSection}>
    <View style={styles.titleAndButtonsRow}>
      <Text style={styles.mainTitle} adjustsFontSizeToFit numberOfLines={1}>
        My Quizzes
      </Text>
      
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity 
          onPress={handleJoinMultiplayer}
          activeOpacity={0.8}
          style={styles.actionButtonWrapper}
        >
          <LinearGradient
            colors={['#f59e0b', '#d97706']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionButton}
          >
            <Ionicons name="people" size={16} color="#ffffff" />
            <Text style={styles.actionButtonText}>Join</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={handleCreateNewQuiz}
          disabled={pendingQuizCreation}
          activeOpacity={pendingQuizCreation ? 1 : 0.8}
          style={styles.actionButtonWrapper}
        >
          <LinearGradient
            colors={['#8b5cf6', '#7c3aed']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionButton}
          >
            <Ionicons name="add" size={16} color="#ffffff" />
            <Text style={styles.actionButtonText}>New</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</View>

        {/* Quiz List */}
        <FlatList
          data={quizzes}
          renderItem={({ item }) => <QuizCard item={item} />}
          keyExtractor={(item) => item.id!}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#8b5cf6"
              colors={['#8b5cf6']}
            />
          }
          ListEmptyComponent={loading ? LoadingState : EmptyState}
        />

        <BottomNavigation/>
        
        <JoinSessionModal
          visible={joinModalVisible}
          onClose={() => setJoinModalVisible(false)}
        />

        {/* Custom Alert Modal */}
        <CustomAlertModal
          visible={alertConfig.visible}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
        />
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },


  buttonGradient: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    padding: 24,
    paddingTop: 8,
    paddingBottom: 100,
  },
  quizCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  quizCardContent: {
    position: 'relative',
  },
  coverImageContainer: {
    width: '100%',
    height: 160,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  imageGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 10,
  },
  accentBar: {
    height: 4,
    width: '100%',
  },
  contentSection: {
    padding: 20,
  },
  contentSectionNoCover: {
    paddingTop: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  quizTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.2)',
  },
  statIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 13,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  typesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(51, 65, 85, 0.3)',
    borderRadius: 10,
    marginBottom: 16,
  },
  typesText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  iconText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  playButtonCompact: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  playButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
  },
  playButtonCompactText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptyStateSubtext: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  createFirstQuizBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  createFirstQuizGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 28,
    gap: 10,
  },
  createFirstQuizBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 16,
    fontWeight: '500',
  },
  animation: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  headerContainer: {
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  titleSection: {
    marginBottom: 20,
    paddingTop: 16,
  },
  titleAndButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mainTitle: {
  fontSize: 32,
  fontWeight: '800',
  color: '#ffffff',
  letterSpacing: -0.5,
  flex: 1,
  marginRight: 16, // Additional explicit margin for safety
  maxWidth: '60%', // Ensures title doesn't take up too much space on small screens
},
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 6,
    minWidth: 78,
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
});

export default QuizHome;