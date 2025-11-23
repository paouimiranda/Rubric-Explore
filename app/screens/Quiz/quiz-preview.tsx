// File: app/Quiz/quiz-preview.tsx
import { CustomAlertModal } from '@/components/Interface/custom-alert-modal';
import { useBacklogLogger } from '@/hooks/useBackLogLogger';
import { getCurrentUserData } from '@/services/auth-service';
import { BACKLOG_EVENTS } from '@/services/backlogEvents';
import { getQuizImageSource } from '@/services/image-service';
import { createMultiplayerSession } from '@/services/multiplayer-service';
import { QuizService, type Question, type Quiz } from '@/services/quiz-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,








  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const QuizPreview = () => {
  const router = useRouter();
  const { quizId } = useLocalSearchParams();
  const { addBacklogEvent, logError } = useBacklogLogger();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [pendingStartQuiz, setPendingStartQuiz] = useState(false);
  
  // Alert modal state
  const [alertModal, setAlertModal] = useState({
    visible: false,
    type: 'info' as 'info' | 'success' | 'error' | 'warning' | 'question',
    title: '',
    message: '',
    buttons: [] as Array<{
      text: string;
      onPress: () => void;
      style?: 'default' | 'cancel' | 'primary';
    }>,
  });

  useEffect(() => {
    if (quizId && typeof quizId === 'string') {
      loadQuiz(quizId);
    }0
  }, [quizId]);

  const showAlert = (
    type: 'info' | 'success' | 'error' | 'warning' | 'question',
    title: string,
    message: string,
    buttons: Array<{
      text: string;
      onPress: () => void;
      style?: 'default' | 'cancel' | 'primary';
    }>
  ) => {
    setAlertModal({
      visible: true,
      type,
      title,
      message,
      buttons,
    });
  };

  useFocusEffect(
    useCallback(() => {
      setPendingStartQuiz(false);
      
    }, [])
  );

  const hideAlert = () => {
    setAlertModal(prev => ({ ...prev, visible: false }));
  };

  const loadQuiz = async (id: string) => {
    try {
      setLoading(true);
      // Use getQuizById which now supports public quiz access
      const quizData = await QuizService.getQuizById(id);
      if (quizData) {
        setQuiz(quizData);
      } else {
        showAlert(
          'error',
          'Error',
          'Quiz not found',
          [
            {
              text: 'OK',
              onPress: () => {
                hideAlert();
                router.back();
              },
              style: 'primary',
            },
          ]
        );
      }
      addBacklogEvent(BACKLOG_EVENTS.USER_VIEWED_QUIZ);
    } catch (error: any) {
      console.error('Error loading quiz:', error);
      
      // Better error handling for permission issues
      if (error.message?.includes('permission')) {
        showAlert(
          'error',
          'Access Denied',
          'This quiz is private and you do not have permission to view it.',
          [
            {
              text: 'OK',
              onPress: () => {
                hideAlert();
                router.back();
              },
              style: 'primary',
            },
          ]
        );
      } else {
        showAlert(
          'error',
          'Error',
          'Failed to load quiz. Please try again.',
          [
            {
              text: 'OK',
              onPress: () => {
                hideAlert();
                router.back();
              },
              style: 'primary',
            },
          ]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = () => {
   {
  if (!quiz?.id || pendingStartQuiz) return;
  setPendingStartQuiz(true);
  addBacklogEvent(BACKLOG_EVENTS.USER_STARTED_QUIZ, { quizId: quiz?.id });
  router.push({
    pathname: './quiz-play',
    params: { quizId: quiz.id },
  });
};
  };

  const handleHostMultiplayer = async () => {
    if (!quiz?.id) return;

    try {
      // Get current user before showing confirmation
      const user = await getCurrentUserData();
      if (!user) {
        showAlert(
          'warning',
          'Login Required',
          'Please login to host a multiplayer session',
          [
            {
              text: 'OK',
              onPress: hideAlert,
              style: 'primary',
            },
          ]
        );
        return;
      }

      showAlert(
        'question',
        'Host Multiplayer Quiz',
        'Would you like to create a multiplayer lobby for this quiz?',
        [
          {
            text: 'Cancel',
            onPress: hideAlert,
            style: 'cancel',
          },
          {
            text: 'Create Lobby',
            onPress: async () => {
              hideAlert();
              try {
                // createMultiplayerSession returns { sessionId, sessionCode }
                const result: { sessionId: string; sessionCode: string } =
                  await createMultiplayerSession(
                    quiz,
                    user.uid,
                    user.displayName || 'Anonymous'
                  );
                const { sessionId, sessionCode } = result;

                console.log('Session created:', sessionId, sessionCode);

                // Navigate to multiplayer lobby with both quizId and sessionId
                router.push({
                  pathname: './multiplayer-lobby',
                  params: {
                    quizId: quiz.id,
                    sessionId: sessionId,
                  },
                });
                addBacklogEvent(BACKLOG_EVENTS.USER_CREATED_MULTIPLAYER_SESSION, {
                  quizId: quiz.id,
                });
              } catch (error) {
                console.error('Error creating session:', error);
                showAlert(
                  'error',
                  'Error',
                  'Failed to create multiplayer session. Please try again.',
                  [
                    {
                      text: 'OK',
                      onPress: hideAlert,
                      style: 'primary',
                    },
                  ]
                );
              }
            },
            style: 'primary',
          },
        ]
      );
    } catch (error) {
      console.error('Error getting user data:', error);
      showAlert(
        'error',
        'Error',
        'Failed to authenticate user. Please login again.',
        [
          {
            text: 'OK',
            onPress: hideAlert,
            style: 'primary',
          },
        ]
      );
    }
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'multiple_choice':
        return 'checkmark-circle-outline';
      case 'fill_blank':
        return 'create-outline';
      case 'matching':
        return 'git-compare-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'multiple_choice':
        return 'Multiple Choice';
      case 'fill_blank':
        return 'Fill in the Blank';
      case 'matching':
        return 'Matching';
      default:
        return 'Question';
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  };

  const getTotalTime = () => {
    if (!quiz) return '0s';
    const totalSeconds = quiz.questions.reduce(
      (sum, q) => sum + (q.timeLimit || 30),
      0
    );
    return formatTime(totalSeconds);
  };

  const getQuestionPreview = (question: Question): string => {
    if (question.type === 'matching' && question.matchPairs.length > 0) {
      return question.matchPairs
        .map((pair) => pair.left)
        .filter((left) => left.trim())
        .slice(0, 3)
        .join(', ');
    }
    return question.question || 'Untitled Question';
  };

  const renderAnswerPreview = (question: Question) => {
    switch (question.type) {
      case 'multiple_choice':
        return (
          <View style={styles.answerPreview}>
            {question.options.map((option, index) => (
              <View key={index} style={styles.answerOption}>
                <View
                  style={[
                    styles.answerIndicator,
                    question.correctAnswers.includes(index) &&
                      styles.correctIndicator,
                  ]}
                />
                <Text style={styles.answerText}>
                  {option || `Option ${index + 1}`}
                </Text>
              </View>
            ))}
          </View>
        );

      case 'fill_blank':
        return (
          <View style={styles.answerPreview}>
            <View style={styles.fillBlankPreview}>
              <Text style={styles.answerLabel}>Answer: </Text>
              <Text style={styles.fillBlankAnswer}>
                {question.correctAnswer || 'Not set'}
              </Text>
            </View>
          </View>
        );

      case 'matching':
        return (
          <View style={styles.answerPreview}>
            {question.matchPairs.map((pair, index) => (
              <View key={index} style={styles.matchPair}>
                <Text style={styles.matchLeft}>{pair.left}</Text>
                <Ionicons name="arrow-forward" size={12} color="#64748b" />
                <Text style={styles.matchRight}>{pair.right}</Text>
              </View>
            ))}
          </View>
        );

      default:
        return null;
    }
  };

  const renderQuestionItem = ({
    item,
    index,
  }: {
    item: Question;
    index: number;
  }) => {
    const isExpanded = expandedQuestion === index;

    return (
      <View style={styles.questionCard}>
        <TouchableOpacity
          style={styles.questionHeader}
          onPress={() => setExpandedQuestion(isExpanded ? null : index)}
          activeOpacity={0.7}
        >
          <View style={styles.questionNumber}>
            <Text style={styles.questionNumberText}>{index + 1}</Text>
          </View>

          <View style={styles.questionInfo}>
            <Text
              style={styles.questionTitle}
              numberOfLines={isExpanded ? undefined : 2}
            >
              {getQuestionPreview(item)}
            </Text>

            <View style={styles.questionMeta}>
              <View style={styles.questionType}>
                <Ionicons
                  name={getQuestionTypeIcon(item.type)}
                  size={14}
                  color="#8b5cf6"
                />
                <Text style={styles.questionTypeText}>
                  {getQuestionTypeLabel(item.type)}
                </Text>
              </View>

              <View style={styles.questionTime}>
                <Ionicons name="time-outline" size={14} color="#10b981" />
                <Text style={styles.questionTimeText}>
                  {formatTime(item.timeLimit)}
                </Text>
              </View>
            </View>
          </View>

          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#64748b"
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.questionDetails}>
            {item.image && (
              <Image source={{ uri: item.image }} style={styles.questionImage} />
            )}
            {renderAnswerPreview(item)}
          </View>
        )}
      </View>
    );
  };

  const QuizStats = () => {
    if (!quiz) return null;

    const questionTypes = quiz.questions.reduce((acc, q) => {
      acc[q.type] = (acc[q.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="help-circle-outline" size={24} color="#8b5cf6" />
          <Text style={styles.statNumber} numberOfLines={1} adjustsFontSizeToFit>
            {quiz.questions.length}
          </Text>
          <Text style={styles.statLabel} numberOfLines={2} adjustsFontSizeToFit>
            Questions
          </Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="time-outline" size={24} color="#10b981" />
          <Text style={styles.statNumber} numberOfLines={1} adjustsFontSizeToFit>
            {getTotalTime()}
          </Text>
          <Text style={styles.statLabel} numberOfLines={2} adjustsFontSizeToFit>
            Total Time
          </Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="layers-outline" size={24} color="#f59e0b" />
          <Text style={styles.statNumber} numberOfLines={1} adjustsFontSizeToFit>
            {Object.keys(questionTypes).length}
          </Text>
          <Text style={styles.statLabel} numberOfLines={2} adjustsFontSizeToFit>
            Types
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading quiz...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!quiz) {
    return (
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
            <Text style={styles.errorText}>Quiz not found</Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const coverImageSource = quiz.coverImage
    ? getQuizImageSource(quiz.coverImage)
    : null;

  return (
    <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
      <SafeAreaView style={styles.container}>
        {/* Fixed Back Button */}
        <TouchableOpacity
          style={styles.fixedBackButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Cover Image Header - Now inside ScrollView */}
          {coverImageSource ? (
            <View style={styles.coverHeaderContainer}>
              <Image
                source={coverImageSource}
                style={styles.coverHeaderImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(15, 23, 42, 0.8)', '#0f172a']}
                style={styles.coverHeaderGradient}
              />

              {/* Title Overlay */}
              <View style={styles.titleOverlay}>
                <Text style={styles.quizTitleOverlay}>{quiz.title}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.headerNoCover}>
              <Text style={styles.quizTitle}>{quiz.title}</Text>
            </View>
          )}

          <QuizStats />

          <Text style={styles.sectionTitle}>Questions</Text>
          <FlatList
            data={quiz.questions}
            renderItem={renderQuestionItem}
            keyExtractor={(_, index) => index.toString()}
            scrollEnabled={false}
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.startButton} onPress={handleStartQuiz}>
              <Ionicons name="play" size={20} color="#fff" />
              <Text style={styles.startButtonText}>Start Quiz</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.hostButton}
              onPress={handleHostMultiplayer}
            >
              <Ionicons name="rocket-outline" size={20} color="#fff" />
              <Text style={styles.startButtonText}>Host Session</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Custom Alert Modal */}
      <CustomAlertModal
        visible={alertModal.visible}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        buttons={alertModal.buttons}
        onClose={hideAlert}
      />
    </LinearGradient>
  );
};

export default QuizPreview;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedBackButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  coverHeaderContainer: {
    width: '100%',
    height: 280,
    position: 'relative',
    marginBottom: 24,
  },
  coverHeaderImage: {
    width: '100%',
    height: '100%',
  },
  coverHeaderGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  titleOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  quizTitleOverlay: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    lineHeight: 34,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerNoCover: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
  },
  quizTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    lineHeight: 30,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    minHeight: 100,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 8,
    textAlign: 'center',
    width: '100%',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
    width: '100%',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  questionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 8,
    marginHorizontal: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  questionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  questionNumberText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  questionInfo: {
    flex: 1,
    marginRight: 8,
  },
  questionTitle: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
    marginBottom: 8,
  },
  questionMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  questionType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  questionTypeText: {
    fontSize: 12,
    color: '#8b5cf6',
    fontWeight: '500',
  },
  questionTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  questionTimeText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  questionDetails: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  questionImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 12,
  },
  answerPreview: {
    gap: 8,
  },
  answerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  answerIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#64748b',
  },
  correctIndicator: {
    backgroundColor: '#10b981',
  },
  answerText: {
    fontSize: 14,
    color: '#d1d5db',
    flex: 1,
  },
  fillBlankPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  answerLabel: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  fillBlankAnswer: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  matchPair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  matchLeft: {
    fontSize: 14,
    color: '#d1d5db',
    flex: 1,
  },
  matchRight: {
    fontSize: 14,
    color: '#d1d5db',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  startButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  hostButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
});