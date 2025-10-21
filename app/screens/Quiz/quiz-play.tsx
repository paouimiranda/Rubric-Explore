// File: app/Quiz/quiz-play.tsx - Updated Quiz Play Screen
import { QuizService, type Question, type Quiz } from '@/services/quiz-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface QuizAnswer {
  questionId: string;
  selectedAnswers?: number[];
  fillBlankAnswer?: string;
  matchingPairs?: { left: string; right: string }[];
  timeSpent: number;
}

interface QuizResult {
  questionId: string;
  isCorrect: boolean;
  userAnswer: any;
  correctAnswer: any;
  timeSpent: number;
  points: number;
}

const { width: screenWidth } = Dimensions.get('window');

const MATCHING_COLORS = [
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#10b981', // Green
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#a855f7', // Violet
];

const QuizPlay = () => {
  const router = useRouter();
  const { quizId } = useLocalSearchParams();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Timer and animations
  const timerRef = useRef<number | null>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const questionStartTime = useRef(Date.now());
  
  // Question-specific state
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [fillBlankText, setFillBlankText] = useState('');
  const [matchingPairs, setMatchingPairs] = useState<{ left: string; right: string }[]>([]);
  const [shuffledRightItems, setShuffledRightItems] = useState<string[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);

  useEffect(() => {
    if (quizId && typeof quizId === 'string') {
      loadQuiz(quizId);
    }
  }, [quizId]);

  useEffect(() => {
    if (quiz && quiz.questions.length > 0) {
      initializeQuestion();
    }
  }, [quiz, currentQuestionIndex]);

  useEffect(() => {
    if (timeLeft > 0 && !isPaused && !isQuizCompleted) {
      startTimer();
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timeLeft, isPaused, isQuizCompleted]);

  const loadQuiz = async (id: string) => {
    try {
      setLoading(true);
      const quizData = await QuizService.getQuizById(id);
      if (quizData) {
        setQuiz(quizData);
        setAnswers(quizData.questions.map(q => ({
          questionId: q.id,
          timeSpent: 0
        })));
      } else {
        Alert.alert('Error', 'Quiz not found');
        router.back();
      }
    } catch (error) {
      console.error('Error loading quiz:', error);
      Alert.alert('Error', 'Failed to load quiz');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const initializeQuestion = () => {
    if (!quiz) return;
    
    const question = quiz.questions[currentQuestionIndex];
    setTimeLeft(question.timeLimit || 30);
    questionStartTime.current = Date.now();
    
    // Reset question-specific state
    setSelectedAnswers([]);
    setFillBlankText('');
    setSelectedLeft(null);
    setSelectedRight(null);
    
    // Initialize matching pairs for matching questions
    if (question.type === 'matching') {
      const pairs = question.matchPairs.map(pair => ({ left: pair.left, right: '' }));
      setMatchingPairs(pairs);
      
      // Shuffle right-side items
      const rightItems = question.matchPairs.map(pair => pair.right);
      const shuffled = [...rightItems].sort(() => Math.random() - 0.5);
      setShuffledRightItems(shuffled);
    }
    
    // Start progress animation
    progressAnim.setValue(1);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: (question.timeLimit || 30) * 1000,
      useNativeDriver: false,
    }).start();
  };

  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000) as unknown as number;
  };

  const handleTimeUp = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Auto-submit current answer
    submitCurrentAnswer();
  };

  const submitCurrentAnswer = () => {
    if (!quiz) return;
    
    const timeSpent = Math.floor((Date.now() - questionStartTime.current) / 1000);
    const question = quiz.questions[currentQuestionIndex];
    
    const newAnswer: QuizAnswer = {
      questionId: question.id,
      timeSpent,
    };
    
    // Set answer based on question type
    switch (question.type) {
      case 'multiple_choice':
        newAnswer.selectedAnswers = selectedAnswers;
        break;
      case 'fill_blank':
        newAnswer.fillBlankAnswer = fillBlankText.trim();
        break;
      case 'matching':
        newAnswer.matchingPairs = matchingPairs;
        break;
    }
    
    // Update answers array
    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestionIndex] = newAnswer;
    setAnswers(updatedAnswers);
    
    // Move to next question or finish quiz
    if (currentQuestionIndex + 1 < quiz.questions.length) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      finishQuiz(updatedAnswers);
    }
  };

  const finishQuiz = (finalAnswers: QuizAnswer[]) => {
    if (!quiz) return;
    
    setIsQuizCompleted(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Calculate results
    const results = quiz.questions.map((question, index) => {
      const userAnswer = finalAnswers[index];
      let isCorrect = false;
      let points = 0;
      
      switch (question.type) {
        case 'multiple_choice':
          const userSelected = userAnswer.selectedAnswers || [];
          const correctAnswers = question.correctAnswers || [];
          isCorrect = userSelected.length === correctAnswers.length &&
                     userSelected.every(ans => correctAnswers.includes(ans));
          points = isCorrect ? 1 : 0;
          break;
          
        case 'fill_blank':
          const userText = (userAnswer.fillBlankAnswer || '').toLowerCase().trim();
          const correctText = (question.correctAnswer || '').toLowerCase().trim();
          isCorrect = userText === correctText;
          points = isCorrect ? 1 : 0;
          break;
          
        case 'matching':
          const userPairs = userAnswer.matchingPairs || [];
          const correctPairs = question.matchPairs || [];
          let correctMatches = 0;
          
          userPairs.forEach(userPair => {
            const correctPair = correctPairs.find(cp => cp.left === userPair.left);
            if (correctPair && correctPair.right === userPair.right) {
              correctMatches++;
            }
          });
          
          isCorrect = correctMatches === correctPairs.length;
          points = correctMatches / correctPairs.length; // Partial credit
          break;
      }
      
      return {
        questionId: question.id,
        isCorrect,
        userAnswer: userAnswer,
        correctAnswer: question,
        timeSpent: userAnswer.timeSpent,
        points,
      };
    });
    
    setQuizResults(results);
    setShowResults(true);
  };

  // Question type handlers
  const handleMultipleChoiceAnswer = (optionIndex: number) => {
    const newSelected = [...selectedAnswers];
    const existingIndex = newSelected.indexOf(optionIndex);
    
    if (existingIndex > -1) {
      newSelected.splice(existingIndex, 1);
    } else {
      newSelected.push(optionIndex);
    }
    
    setSelectedAnswers(newSelected);
  };

  const handleMatchingSelection = (side: 'left' | 'right', index: number) => {
  if (side === 'left') {
    // Check if this left item is already matched
    if (matchingPairs[index]?.right) {
      // Unmatch it
      const newPairs = [...matchingPairs];
      newPairs[index] = { left: quiz!.questions[currentQuestionIndex].matchPairs[index].left, right: '' };
      setMatchingPairs(newPairs);
      setSelectedLeft(null);
      setSelectedRight(null);
    } else {
      // Select it
      setSelectedLeft(selectedLeft === index ? null : index);
      setSelectedRight(null);
    }
  } else {
    // Right side
    const leftIndex = findLeftIndexForRightItem(shuffledRightItems[index]);
    
    // Check if this right item is already matched
    if (leftIndex !== -1) {
      // Unmatch it
      const newPairs = [...matchingPairs];
      newPairs[leftIndex] = { left: quiz!.questions[currentQuestionIndex].matchPairs[leftIndex].left, right: '' };
      setMatchingPairs(newPairs);
      setSelectedLeft(null);
      setSelectedRight(null);
    } else if (selectedLeft !== null) {
      // Create or update matching pair
      const newPairs = [...matchingPairs];
      newPairs[selectedLeft] = {
        left: quiz!.questions[currentQuestionIndex].matchPairs[selectedLeft].left,
        right: shuffledRightItems[index]
      };
      setMatchingPairs(newPairs);
      setSelectedLeft(null);
      setSelectedRight(null);
    } else {
      setSelectedRight(selectedRight === index ? null : index);
      }
    }
  };

  const getMatchColor = (leftIndex: number): string => {
    return MATCHING_COLORS[leftIndex % MATCHING_COLORS.length];
  };

const findLeftIndexForRightItem = (rightItem: string): number => {
    return matchingPairs.findIndex(pair => pair.right === rightItem);
  };
  

  const renderMultipleChoice = (question: Question) => (
    <View style={styles.questionContent}>
      <View style={styles.optionsGrid}>
        {question.options.map((option, index) => {
          const optionStyles: any[] = [
            styles.optionButton,
            selectedAnswers.includes(index) && styles.selectedOption
          ];
          
          // Add color style based on index
          switch (index) {
            case 0:
              optionStyles.push(styles.option0);
              break;
            case 1:
              optionStyles.push(styles.option1);
              break;
            case 2:
              optionStyles.push(styles.option2);
              break;
            case 3:
              optionStyles.push(styles.option3);
              break;
          }

          return (
            <TouchableOpacity
              key={index}
              style={optionStyles}
              onPress={() => handleMultipleChoiceAnswer(index)}
              activeOpacity={0.8}
            >
              <View style={styles.optionContent}>
                <View style={styles.optionIndicator}>
                  {selectedAnswers.includes(index) && (
                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                  )}
                </View>
                <Text style={styles.optionText}>{option}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderFillBlank = (question: Question) => (
    <View style={styles.questionContent}>
      <View style={styles.fillBlankContainer}>
        <Text style={styles.fillBlankLabel}>Your Answer:</Text>
        <TextInput
          style={styles.fillBlankInput}
          value={fillBlankText}
          onChangeText={setFillBlankText}
          placeholder="Type your answer here..."
          placeholderTextColor="#64748b"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    </View>
  );
  

  const renderMatching = (question: Question) => (
  <View style={styles.questionContent}>
    <Text style={styles.matchingInstructions}>
      Tap items to match them together
    </Text>
    
    <View style={styles.matchingContainer}>
      <View style={styles.matchingColumn}>
        <Text style={styles.columnHeader}>Match These</Text>
        {question.matchPairs.map((pair, index) => {
          const isMatched = matchingPairs[index]?.right;
          const matchColor = isMatched ? getMatchColor(index) : undefined;
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.matchingItem,
                styles.leftMatchingItem,
                selectedLeft === index && styles.selectedMatchingItem,
                isMatched && { 
                  backgroundColor: matchColor,
                  borderColor: matchColor,
                }
              ]}
              onPress={() => handleMatchingSelection('left', index)}
            >
              <Text style={[
                styles.matchingItemText,
                isMatched && styles.matchedItemText
              ]}>{pair.left}</Text>
              {isMatched && (
                <View style={styles.matchIndicator}>
                  <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.matchingArrow}>
        <Ionicons name="arrow-forward" size={24} color="#64748b" />
      </View>

      <View style={styles.matchingColumn}>
        <Text style={styles.columnHeader}>With These</Text>
        {shuffledRightItems.map((item, index) => {
          const leftIndex = findLeftIndexForRightItem(item);
          const isMatched = leftIndex !== -1;
          const matchColor = isMatched ? getMatchColor(leftIndex) : undefined;
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.matchingItem,
                styles.rightMatchingItem,
                selectedRight === index && styles.selectedMatchingItem,
                isMatched && {
                  backgroundColor: matchColor,
                  borderColor: matchColor,
                }
              ]}
              onPress={() => handleMatchingSelection('right', index)}
              disabled={isMatched}
            >
              <Text style={[
                styles.matchingItemText,
                isMatched && styles.matchedItemText
              ]}>{item}</Text>
              {isMatched && (
                <View style={styles.matchIndicator}>
                  <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  </View>
);

  const renderQuestion = () => {
    if (!quiz) return null;
    
    const question = quiz.questions[currentQuestionIndex];
    
    return (
      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>{question.question}</Text>
        
        {question.image && (
          <Image source={{ uri: question.image }} style={styles.questionImage} />
        )}
        
        {question.type === 'multiple_choice' && renderMultipleChoice(question)}
        {question.type === 'fill_blank' && renderFillBlank(question)}
        {question.type === 'matching' && renderMatching(question)}
      </View>
    );
  };

  const renderResults = () => {
    const totalQuestions = quizResults.length;
    const correctAnswers = quizResults.filter(r => r.isCorrect).length;
    const totalPoints = quizResults.reduce((sum, r) => sum + r.points, 0);
    const percentage = Math.round((totalPoints / totalQuestions) * 100);
    const totalTime = quizResults.reduce((sum, r) => sum + r.timeSpent, 0);
    
    return (
      <Modal visible={showResults} animationType="slide" presentationStyle="pageSheet">
        <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.resultsContainer}>
          <SafeAreaView style={styles.resultsContainer}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Quiz Complete!</Text>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.closeResultsBtn}
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.scoreCard}>
              <Text style={styles.scorePercentage}>{percentage}%</Text>
              <Text style={styles.scoreDetails}>
                {correctAnswers} of {totalQuestions} correct
              </Text>
              <Text style={styles.timeDetails}>
                Completed in {Math.floor(totalTime / 60)}:{(totalTime % 60).toString().padStart(2, '0')}
              </Text>
            </View>
            
            <FlatList
              data={quizResults}
              renderItem={({ item, index }) => (
                <View style={styles.resultItem}>
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultQuestionNumber}>Question {index + 1}</Text>
                    <View style={[
                      styles.resultStatus,
                      item.isCorrect ? styles.correctStatus : styles.incorrectStatus
                    ]}>
                      <Ionicons 
                        name={item.isCorrect ? "checkmark" : "close"} 
                        size={16} 
                        color="#ffffff" 
                      />
                    </View>
                  </View>
                  <Text style={styles.resultQuestion} numberOfLines={2}>
                    {quiz?.questions[index]?.question}
                  </Text>
                  <Text style={styles.resultTime}>
                    Time: {item.timeSpent}s | Points: {item.points.toFixed(1)}
                  </Text>
                </View>
              )}
              keyExtractor={(item, index) => `result_${index}`}
              style={styles.resultsList}
              showsVerticalScrollIndicator={false}
            />
            
            <View style={styles.resultsActions}>
              <TouchableOpacity
                style={styles.playAgainBtn}
                onPress={() => {
                  setShowResults(false);
                  setIsQuizCompleted(false);
                  setCurrentQuestionIndex(0);
                  setAnswers(quiz!.questions.map(q => ({
                    questionId: q.id,
                    timeSpent: 0
                  })));
                  initializeQuestion();
                }}
              >
                <Ionicons name="refresh" size={20} color="#ffffff" />
                <Text style={styles.playAgainText}>Play Again</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.homeBtn}
                onPress={() => router.back()}
              >
                <Text style={styles.homeBtnText}>Back to Quiz</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </Modal>
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
            <Text style={styles.errorText}>Quiz not found</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
      <SafeAreaView style={styles.container}>
        {/* Header with progress */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Exit Quiz',
                'Are you sure you want to exit? Your progress will be lost.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Exit', style: 'destructive', onPress: () => router.back() }
                ]
              );
            }}
            style={styles.exitBtn}
          >
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              {currentQuestionIndex + 1} / {quiz.questions.length}
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }
                ]} 
              />
            </View>
          </View>
          
          <TouchableOpacity
            onPress={() => setIsPaused(!isPaused)}
            style={styles.pauseBtn}
          >
            <Ionicons name={isPaused ? "play" : "pause"} size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Timer */}
        <View style={styles.timerContainer}>
          <Animated.View 
            style={[
              styles.timerBar,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                })
              }
            ]} 
          />
          <Text style={styles.timerText}>{timeLeft}s</Text>
        </View>

        {/* Question */}
        {!isPaused && renderQuestion()}

        {isPaused && (
          <View style={styles.pausedContainer}>
            <Ionicons name="pause" size={64} color="#64748b" />
            <Text style={styles.pausedText}>Quiz Paused</Text>
            <TouchableOpacity
              onPress={() => setIsPaused(false)}
              style={styles.resumeBtn}
            >
              <Text style={styles.resumeBtnText}>Resume</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Submit button */}
        {!isPaused && (
          <View style={styles.bottomContainer}>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={submitCurrentAnswer}
            >
              <Text style={styles.submitBtnText}>
                {currentQuestionIndex + 1 === quiz.questions.length ? 'Finish' : 'Next'}
              </Text>
              <Ionicons 
                name={currentQuestionIndex + 1 === quiz.questions.length ? 'checkmark' : 'arrow-forward'} 
                size={20} 
                color="#ffffff" 
              />
            </TouchableOpacity>
          </View>
        )}

        {renderResults()}
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  exitBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  progressText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 2,
  },
  pauseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    position: 'relative',
  },
  timerBar: {
    height: 6,
    backgroundColor: '#ef4444',
    borderRadius: 3,
  },
  timerText: {
    position: 'absolute',
    right: 0,
    top: -25,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  questionContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  questionText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 30,
  },
  questionImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
  },
  questionContent: {
    flex: 1,
  },
  // Multiple choice styles
  optionsGrid: {
    gap: 12,
  },
  optionButton: {
    borderRadius: 12,
    padding: 16,
    minHeight: 60,
  },
  option0: { backgroundColor: '#ef4444' },
  option1: { backgroundColor: '#3b82f6' },
  option2: { backgroundColor: '#f59e0b' },
  option3: { backgroundColor: '#10b981' },
  selectedOption: {
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  // Fill blank styles
  fillBlankContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  fillBlankLabel: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  fillBlankInput: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontSize: 18,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#334155',
  },
  // Matching styles
  matchingInstructions: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  matchingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flex: 1,
  },
  matchingColumn: {
    flex: 1,
  },
  columnHeader: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  matchingArrow: {
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  matchingItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#334155',
    position: 'relative',
  },
  leftMatchingItem: {
    backgroundColor: '#1e293b',
  },
  rightMatchingItem: {
    backgroundColor: '#1e293b',
  },
  selectedMatchingItem: {
    borderColor: '#8b5cf6',
    backgroundColor: '#312e81',
  },
  matchedItem: {
    backgroundColor: '#065f46',
    borderColor: '#10b981',
  },
  matchingItemText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  matchedItemText: {
    color: '#d1fae5',
  },
  matchIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  bottomContainer: {
    padding: 20,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  pausedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pausedText: {
    color: '#64748b',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 32,
  },
  resumeBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  resumeBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 18,
  },
  // Results modal styles
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  resultsTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeResultsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  scorePercentage: {
    color: '#ffffff',
    fontSize: 48,
    fontWeight: 'bold',
  },
  scoreDetails: {
    color: '#94a3b8',
    fontSize: 16,
    marginTop: 8,
  },
  timeDetails: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 4,
  },
  resultsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  resultItem: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultQuestionNumber: {
    color: '#8b5cf6',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resultStatus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  correctStatus: {
    backgroundColor: '#10b981',
  },
  incorrectStatus: {
    backgroundColor: '#ef4444',
  },
  resultQuestion: {
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 4,
  },
  resultTime: {
    color: '#64748b',
    fontSize: 12,
  },
  resultsActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  playAgainBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  playAgainText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  homeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
  },
  homeBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default QuizPlay;