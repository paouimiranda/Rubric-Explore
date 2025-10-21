// File: app/Quiz/quiz.tsx - Updated Quiz Home Screen
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

  // Load quizzes when screen comes into focus
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
    // Reset store and navigate to quiz overview
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
              loadQuizzes(); // Refresh the list
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
    return `~${minutes} min`;
  };

  const renderQuizCard = ({ item }: { item: Quiz }) => (
    <View style={styles.quizCard}>
      <TouchableOpacity
        style={styles.quizCardContent}
        onPress={() => handlePlayQuiz(item.id!)}
        activeOpacity={0.7}
      >
        <View style={styles.quizHeader}>
          <Text style={styles.quizTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <TouchableOpacity
            onPress={() => handleEditQuiz(item.id!)}
            style={styles.editButton}
          >
            <Ionicons name="pencil" size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.quizStats}>
          <View style={styles.statItem}>
            <Ionicons name="help-circle-outline" size={16} color="#8b5cf6" />
            <Text style={styles.statText}>{item.questions.length} questions</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={16} color="#10b981" />
            <Text style={styles.statText}>{getTotalTimeEstimate(item.questions)}</Text>
          </View>
        </View>

        <Text style={styles.quizTypes} numberOfLines={1}>
          {getQuestionTypesPreview(item.questions)}
        </Text>

        <View style={styles.quizFooter}>
          <Text style={styles.createdDate}>
            Created {item.createdAt?.toDate?.()?.toLocaleDateString?.() || 'Recently'}
          </Text>
          
          <TouchableOpacity
            onPress={() => handleDeleteQuiz(item.id!, item.title)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.playButton}
        onPress={() => handlePlayQuiz(item.id!)}
      >
        <Ionicons name="play" size={20} color="#ffffff" />
        <Text style={styles.playButtonText}>Play</Text>
      </TouchableOpacity>
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="library-outline" size={64} color="#6b7280" />
      <Text style={styles.emptyStateTitle}>No Quizzes Yet</Text>
      <Text style={styles.emptyStateSubtext}>
        Create your first quiz to get started
      </Text>
      <TouchableOpacity
        style={styles.createFirstQuizBtn}
        onPress={handleCreateNewQuiz}
      >
        <Ionicons name="add" size={20} color="#ffffff" />
        <Text style={styles.createFirstQuizBtnText}>Create Quiz</Text>
      </TouchableOpacity>
    </View>
  );

  const LoadingState = () => (
    <View style={styles.loadingState}>
      <LottieView
                source={require('@/assets/animations/quiz-loading.json')} // adjust path
                autoPlay
                loop={false}
                style={{width: width * 0.90, height: width * 0.90}}
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}> My Quizzes </Text>
          <TouchableOpacity 
            style={[styles.createButton, {backgroundColor: '#E77F00'}]}
            onPress={handleJoinMultiplayer}>
              <Ionicons name="person-add-outline" size={20} color="#ffffff" />
              <Text style={styles.createButtonText}>Join</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateNewQuiz}>
            <Ionicons name="add" size={20} color="#ffffff" />
            <Text style={styles.createButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Quiz List */}
        <FlatList
          data={quizzes}
          renderItem={renderQuizCard}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 4,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
    paddingTop: 0,
  },
  quizCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  quizCardContent: {
    padding: 16,
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  quizTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    marginRight: 8,
  },
  editButton: {
    padding: 4,
  },
  quizStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  quizTypes: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
  },
  quizFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createdDate: {
    fontSize: 11,
    color: '#64748b',
  },
  deleteButton: {
    padding: 4,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    gap: 6,
  },
  playButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  createFirstQuizBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 6,
  },
  createFirstQuizBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
  },
  animation: {
    width: width * 0.9,
    height: width * 0.9,

  }
});


export default QuizHome;