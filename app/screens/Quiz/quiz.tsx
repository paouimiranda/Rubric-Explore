// File: app/Quiz/quiz.tsx - Enhanced Quiz Home Screen
import JoinSessionModal from '@/components/Interface/join-session-modal';
import BottomNavigation from "@/components/Interface/nav-bar";
import { QuizService, type Quiz } from '@/services/quiz-service';
import { useQuizStore } from '@/services/stores/quiz-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
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

  useFocusEffect(
    useCallback(() => {
      loadQuizzes();
    }, [])
  );

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const data = await QuizService.getAllQuizzes();
      setQuizzes(data);
    } catch (error) {
      console.error('Error loading quizzes:', error);
      Alert.alert('Error', 'Failed to load quizzes');
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
    resetToDefaults();
    router.push('./quiz-overview');
  };

  const handleEditQuiz = (quizId: string) => {
    resetToDefaults();
    router.push({
      pathname: './quiz-overview',
      params: { quizId }
    });
  };

  const handlePlayQuiz = (quizId: string) => {
    router.push({
      pathname: './quiz-preview',
      params: { quizId }
    });
  };

  const handleDeleteQuiz = (quizId: string, quizTitle: string) => {
    Alert.alert(
      'Delete Quiz',
      `Are you sure you want to delete "${quizTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await QuizService.deleteQuiz(quizId);
              loadQuizzes();
            } catch (error) {
              console.error('Error deleting quiz:', error);
              Alert.alert('Error', 'Failed to delete quiz');
            }
          }
        }
      ]
    );
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
          onPress={() => handlePlayQuiz(item.id!)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          {/* Gradient Accent Bar */}
          <LinearGradient
            colors={['#8b5cf6', '#ec4899', '#f59e0b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.accentBar}
          />

          {/* Header Section */}
          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.quizTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.questionBadge}>
                <Text style={styles.questionBadgeText}>{item.questions.length}</Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={() => handleEditQuiz(item.id!)}
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
        {/* Enhanced Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>My Quizzes</Text>
            <Text style={styles.headerSubtitle}>{quizzes.length} total</Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.joinButton}
              onPress={handleJoinMultiplayer}
            >
              <LinearGradient
                colors={['#f59e0b', '#d97706']}
                style={styles.buttonGradient}
              >
                <Ionicons name="people" size={18} color="#ffffff" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addButton}
              onPress={handleCreateNewQuiz}
            >
              <LinearGradient
                colors={['#8b5cf6', '#7c3aed']}
                style={styles.buttonGradient}
              >
                <Ionicons name="add" size={20} color="#ffffff" />
              </LinearGradient>
            </TouchableOpacity>
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
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingTop: 24,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  joinButton: {
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addButton: {
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
    padding: 20,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    marginTop: 4,
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
  questionBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  questionBadgeText: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '700',
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
    width: width * 0.9,
    height: width * 0.9,
  },
});

export default QuizHome;