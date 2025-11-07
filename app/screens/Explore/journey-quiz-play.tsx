// File: app/Quiz/journey-quiz-play.tsx
import { CustomAlertModal } from '@/components/Interface/custom-alert-modal';
import { JourneyQuestion, JourneyQuiz, JourneyService } from '@/services/journey-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const MATCHING_COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#a855f7',
];

// Simplified animated background component
const SpaceBackground = () => {
  const stars = useRef(
    Array(60).fill(0).map(() => ({
      x: Math.random() * screenWidth,
      size: Math.random() * 2.5 + 0.5,
      opacity: Math.random() * 0.6 + 0.2,
      duration: Math.random() * 15000 + 20000,
      initialY: Math.random() * screenHeight, // Add this line - scatter stars across the screen
    }))
  ).current;

  return (
    <View style={styles.spaceBackground}>
      <LinearGradient
        colors={['#0a0e27', '#1a1f3a', '#2d1b4e']}
        style={StyleSheet.absoluteFill}
      />
      {stars.map((star, index) => (
        <Star key={index} {...star} />
      ))}
    </View>
  );
};

const Star = ({ x, size, opacity, duration, initialY }: { x: number; size: number; opacity: number; duration: number; initialY: number }) => {
  const translateY = useRef(new Animated.Value(initialY)).current;

  useEffect(() => {
    const animate = () => {
      Animated.timing(translateY, {
        toValue: screenHeight + 20,
        duration: duration * ((screenHeight - initialY) / screenHeight), // Adjust duration based on starting position
        useNativeDriver: true,
        easing: (t) => t,
      }).start(() => {
        // Reset to top and loop
        translateY.setValue(-20);
        Animated.timing(translateY, {
          toValue: screenHeight + 20,
          duration: duration,
          useNativeDriver: true,
          easing: (t) => t,
        }).start(() => animate());
      });
    };
    animate();
  }, []);

  return (
    <Animated.View
      style={[
        styles.star,
        {
          left: x,
          width: size,
          height: size,
          opacity: opacity,
          transform: [{ translateY }],
        },
      ]}
    />
  );
};

const JourneyQuizPlay = () => {
  const router = useRouter();
  const { quizId, levelId, levelTitle } = useLocalSearchParams();
  
  const [quiz, setQuiz] = useState<JourneyQuiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPreQuiz, setShowPreQuiz] = useState(true);
  const [canAttempt, setCanAttempt] = useState(false);
  const [attemptReason, setAttemptReason] = useState<string>('');
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  
  // Completion results
  const [completionData, setCompletionData] = useState<{
    passed: boolean;
    stars: number;
    shardsEarned: number;
    xpEarned: number;
    leveledUp: boolean;
    newPlayerLevel?: number;
    energyLost: number;
    isNewCompletion: boolean;
    improvedStars: boolean;
  } | null>(null);
  
  // Timer and animations
  const timerRef = useRef<number | null>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const questionStartTime = useRef(Date.now());
  const quizStartTime = useRef(Date.now());
  const scrollViewRef = useRef<ScrollView>(null);
  const cardScale = useRef(new Animated.Value(0)).current;
  
  // Question-specific state
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [fillBlankText, setFillBlankText] = useState('');
  const [matchingPairs, setMatchingPairs] = useState<{ left: string; right: string }[]>([]);
  const [shuffledRightItems, setShuffledRightItems] = useState<string[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);

  useEffect(() => {
    if (quizId && typeof quizId === 'string' && levelId) {
      loadQuizAndCheckAttempt();
    }
  }, [quizId, levelId]);

  useEffect(() => {
    if (quiz && quiz.questions.length > 0 && !showPreQuiz) {
      initializeQuestion();
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [quiz, currentQuestionIndex, showPreQuiz]);

  useEffect(() => {
    if (timeLeft > 0 && !isPaused && !isQuizCompleted && !showPreQuiz) {
      startTimer();
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timeLeft, isPaused, isQuizCompleted, showPreQuiz]);

  const loadQuizAndCheckAttempt = async () => {
    try {
      setLoading(true);
      
      const quizData = await JourneyService.getJourneyQuiz(quizId as string);
      if (!quizData) {
        router.back();
        return;
      }
      
      setQuiz(quizData);
      setAnswers(quizData.questions.map(q => ({
        questionId: q.id,
        timeSpent: 0
      })));
      
      const levelIdNum = parseInt(levelId as string);
      const attemptCheck = await JourneyService.canAttemptLevel(levelIdNum);
      setCanAttempt(attemptCheck.canAttempt);
      setAttemptReason(attemptCheck.reason || '');
      
    } catch (error) {
      console.error('Error loading quiz:', error);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = () => {
    if (!canAttempt) return;
    setShowPreQuiz(false);
    quizStartTime.current = Date.now();
    initializeQuestion();
  };

  const handleExitQuiz = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    router.back();
  };

  const initializeQuestion = () => {
  if (!quiz) return;
  
  const question = quiz.questions[currentQuestionIndex];
  setTimeLeft(question.timeLimit || 30);
  questionStartTime.current = Date.now();
  
  cardScale.setValue(0);
  Animated.spring(cardScale, {
    toValue: 1,
    tension: 50,
    friction: 7,
    useNativeDriver: true,
  }).start();
  
  // Reset to full width
  progressAnim.setValue(1);
  
  setSelectedAnswers([]);
  setFillBlankText('');
  setSelectedLeft(null);
  setSelectedRight(null);
  
  if (question.type === 'matching') {
    const pairs = question.matchPairs.map(pair => ({ left: pair.left, right: '' }));
    setMatchingPairs(pairs);
    
    const rightItems = question.matchPairs.map(pair => pair.right);
    const shuffled = [...rightItems].sort(() => Math.random() - 0.5);
    setShuffledRightItems(shuffled);
  }
};

  const startTimer = () => {
  if (timerRef.current) {
    clearInterval(timerRef.current);
  }
  
  const question = quiz?.questions[currentQuestionIndex];
  const totalTime = question?.timeLimit || 30;
  
  // Start continuous animation from current position to 0
  Animated.timing(progressAnim, {
    toValue: 0,
    duration: timeLeft * 1000, // Smooth animation for remaining time
    useNativeDriver: false,
    easing: (t) => t, // Linear easing
  }).start();
  
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
    
    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestionIndex] = newAnswer;
    setAnswers(updatedAnswers);
    
    if (currentQuestionIndex + 1 < quiz.questions.length) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      finishQuiz(updatedAnswers);
    }
  };

  const finishQuiz = async (finalAnswers: QuizAnswer[]) => {
    if (!quiz) return;
    
    setIsQuizCompleted(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
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
          points = isCorrect ? (question.points || 1) : 0;
          break;
          
        case 'fill_blank':
          const userText = (userAnswer.fillBlankAnswer || '').toLowerCase().trim();
          const correctText = (question.correctAnswer || '').toLowerCase().trim();
          isCorrect = userText === correctText;
          points = isCorrect ? (question.points || 1) : 0;
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
          points = (correctMatches / correctPairs.length) * (question.points || 1);
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
    await completeLevelWithService(results);
  };

  const completeLevelWithService = async (results: QuizResult[]) => {
    try {
      setCompleting(true);
      
      const totalPoints = results.reduce((sum, r) => sum + r.points, 0);
      const maxPoints = quiz!.questions.reduce((sum, q) => sum + (q.points || 1), 0);
      const totalTime = results.reduce((sum, r) => sum + r.timeSpent, 0);
      const percentage = Math.round((totalPoints / maxPoints) * 100);
      
      const levelIdNum = parseInt(levelId as string);
      const completion = await JourneyService.completeLevel(
        levelIdNum,
        totalPoints,
        percentage,
        totalTime
      );
      
      setCompletionData(completion);
      setShowResults(true);
    } catch (error) {
      console.error('Failed to complete level:', error);
      setShowResults(true);
    } finally {
      setCompleting(false);
    }
  };

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
      if (matchingPairs[index]?.right) {
        const newPairs = [...matchingPairs];
        newPairs[index] = { left: quiz!.questions[currentQuestionIndex].matchPairs[index].left, right: '' };
        setMatchingPairs(newPairs);
        setSelectedLeft(null);
        setSelectedRight(null);
      } else {
        setSelectedLeft(selectedLeft === index ? null : index);
        setSelectedRight(null);
      }
    } else {
      const leftIndex = findLeftIndexForRightItem(shuffledRightItems[index]);
      
      if (leftIndex !== -1) {
        const newPairs = [...matchingPairs];
        newPairs[leftIndex] = { left: quiz!.questions[currentQuestionIndex].matchPairs[leftIndex].left, right: '' };
        setMatchingPairs(newPairs);
        setSelectedLeft(null);
        setSelectedRight(null);
      } else if (selectedLeft !== null) {
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

  const renderMultipleChoice = (question: JourneyQuestion) => (
  <View style={styles.questionContent}>
    <View style={styles.optionsGrid}>
      {question.options.map((option, index) => {
        const isSelected = selectedAnswers.includes(index);
        const isLastInRow = (index + 1) % 2 === 0; // Every 2nd item
        const gradients = [
          ['#ef4444', '#dc2626'],
          ['#f59e0b', '#d97706'],
          ['#10b981', '#059669'],
          ['#3b82f6', '#2563eb'],
        ];

        return (
          <View
            key={index}
            style={[
              styles.optionButtonContainer,
              isLastInRow && { marginRight: 0 }
            ]}
          >
            <TouchableOpacity
              onPress={() => handleMultipleChoiceAnswer(index)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={gradients[index] as any}
                style={[styles.optionButton, isSelected && styles.selectedOption]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.radioRow}>
                  <View style={[styles.radioCircleOuter, isSelected && styles.radioSelected]}>
                    {isSelected && (
                      <LinearGradient
                        colors={['#fff', '#f0f0f0']}
                        style={styles.radioCircleInner}
                      />
                    )}
                  </View>
                  <Text style={styles.optionText} numberOfLines={3}>{option}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  </View>
);

  const renderFillBlank = (question: JourneyQuestion) => (
    <View style={styles.questionContent}>
      <View style={styles.fillBlankContainer}>
        <LinearGradient
          colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']}
          style={styles.fillBlankWrapper}
        >
          <Text style={styles.fillBlankLabel}>Your Answer:</Text>
          <View style={styles.inputWrapper}>
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
        </LinearGradient>
      </View>
    </View>
  );

  const renderMatching = (question: JourneyQuestion) => (
    <View style={styles.questionContent}>
      <LinearGradient
        colors={['rgba(102, 126, 234, 0.05)', 'rgba(118, 75, 162, 0.05)']}
        style={styles.matchingInstructionsCard}
      >
        <Ionicons name="link" size={20} color="#667eea" />
        <Text style={styles.matchingInstructions}>Tap items to match them together</Text>
      </LinearGradient>
      
      <View style={styles.matchingContainer}>
        <View style={styles.matchingColumn}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.columnHeaderGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.columnHeader}>Match These</Text>
          </LinearGradient>
          {question.matchPairs.map((pair, index) => {
            const isMatched = matchingPairs[index]?.right;
            const matchColor = isMatched ? getMatchColor(index) : undefined;
            
            return (
              <TouchableOpacity
                key={index}
                style={styles.matchingItemContainer}
                onPress={() => handleMatchingSelection('left', index)}
              >
                <LinearGradient
                  colors={isMatched 
                    ? [matchColor!, matchColor!] 
                    : selectedLeft === index 
                      ? ['rgba(139, 92, 246, 0.3)', 'rgba(139, 92, 246, 0.1)']
                      : ['rgba(30, 41, 59, 0.8)', 'rgba(30, 41, 59, 0.4)']}
                  style={styles.matchingItem}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={[styles.matchingItemText, isMatched && styles.matchedItemText]}>
                    {pair.left}
                  </Text>
                  {isMatched && (
                    <View style={styles.matchIndicator}>
                      <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.matchingArrow}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.arrowCircle}
          >
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </LinearGradient>
        </View>

        <View style={styles.matchingColumn}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.columnHeaderGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.columnHeader}>With These</Text>
          </LinearGradient>
          {shuffledRightItems.map((item, index) => {
            const leftIndex = findLeftIndexForRightItem(item);
            const isMatched = leftIndex !== -1;
            const matchColor = isMatched ? getMatchColor(leftIndex) : undefined;
            
            return (
              <TouchableOpacity
                key={index}
                style={styles.matchingItemContainer}
                onPress={() => handleMatchingSelection('right', index)}
                disabled={isMatched}
              >
                <LinearGradient
                  colors={isMatched 
                    ? [matchColor!, matchColor!] 
                    : selectedRight === index 
                      ? ['rgba(139, 92, 246, 0.3)', 'rgba(139, 92, 246, 0.1)']
                      : ['rgba(30, 41, 59, 0.8)', 'rgba(30, 41, 59, 0.4)']}
                  style={styles.matchingItem}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={[styles.matchingItemText, isMatched && styles.matchedItemText]}>
                    {item}
                  </Text>
                  {isMatched && (
                    <View style={styles.matchIndicator}>
                      <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                    </View>
                  )}
                </LinearGradient>
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
      <Animated.View style={{ flex: 1, transform: [{ scale: cardScale }] }}>
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
            style={styles.questionContainer}
          >
            <Text style={styles.questionText}>{question.question}</Text>
            
            {question.image && (
              <View style={styles.imageContainer}>
                <Image 
                  source={{ uri: question.image }} 
                  style={styles.questionImage}
                  resizeMode="contain"
                />
              </View>
            )}
            
            {question.type === 'multiple_choice' && renderMultipleChoice(question)}
            {question.type === 'fill_blank' && renderFillBlank(question)}
            {question.type === 'matching' && renderMatching(question)}
          </LinearGradient>
        </ScrollView>
      </Animated.View>
    );
  };

  const renderPreQuiz = () => {
    if (!quiz) return null;
    
    return (
      <Modal visible={showPreQuiz} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <SpaceBackground />
          <SafeAreaView style={styles.preQuizContainer}>
            <View style={styles.preQuizHeader}>
              <TouchableOpacity onPress={handleExitQuiz} style={styles.closeBtn}>
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
                  style={styles.closeBtnGradient}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              contentContainerStyle={styles.preQuizContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.levelBadge}>
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.levelBadgeGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="planet" size={56} color="#fff" />
                </LinearGradient>
              </View>
              
              <Text style={styles.preQuizTitle}>{levelTitle}</Text>
              <Text style={styles.preQuizSubtitle}>{quiz.title}</Text>
              
              {quiz.description && (
                <LinearGradient
                  colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']}
                  style={styles.descriptionCard}
                >
                  <Text style={styles.preQuizDescription}>{quiz.description}</Text>
                </LinearGradient>
              )}
              
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.03)']}
                style={styles.quizInfoCard}
              >
                <View style={styles.infoRow}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.infoIcon}
                  >
                    <Ionicons name="document-text" size={18} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.infoText}>{quiz.questions.length} Questions</Text>
                </View>
                <View style={styles.infoRow}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.infoIcon}
                  >
                    <Ionicons name="time" size={18} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.infoText}>~{Math.ceil(quiz.estimatedTime / 60)} minutes</Text>
                </View>
                <View style={styles.infoRow}>
                  <LinearGradient
                    colors={['#fbbf24', '#f59e0b']}
                    style={styles.infoIcon}
                  >
                    <Ionicons name="trophy" size={18} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.infoText}>{quiz.totalPoints} points</Text>
                </View>
              </LinearGradient>
              
              {!canAttempt && (
                <LinearGradient
                  colors={['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.05)']}
                  style={styles.warningCard}
                >
                  <Ionicons name="warning" size={28} color="#f59e0b" />
                  <Text style={styles.warningText}>{attemptReason}</Text>
                </LinearGradient>
              )}
            </ScrollView>
            
            <View style={styles.preQuizActions}>
              <TouchableOpacity
                style={styles.startBtn}
                onPress={handleStartQuiz}
                disabled={!canAttempt}
              >
                <LinearGradient
                  colors={canAttempt ? ['#667eea', '#764ba2'] : ['#555', '#333']}
                  style={styles.startBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.startBtnText}>Start Quiz</Text>
                  <Ionicons name="rocket" size={22} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    );
  };

  const renderResults = () => {
    if (!completionData) return null;
    
    const totalQuestions = quizResults.length;
    const correctAnswers = quizResults.filter(r => r.isCorrect).length;
    const totalPoints = quizResults.reduce((sum, r) => sum + r.points, 0);
    const maxPoints = quiz?.questions.reduce((sum, q) => sum + (q.points || 1), 0) || totalQuestions;
    const percentage = Math.round((totalPoints / maxPoints) * 100);
    
    return (
      <Modal visible={showResults} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <SpaceBackground />
          <SafeAreaView style={styles.resultsContainer}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                {completionData.passed ? '🎉 Level Complete!' : '💪 Try Again'}
              </Text>
              <TouchableOpacity onPress={() => router.back()} style={styles.closeResultsBtn}>
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
                  style={styles.closeBtnGradient}
                >
                  <Ionicons name="close" size={24} color="#ffffff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              contentContainerStyle={styles.resultsScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Score Card */}
              <LinearGradient
                colors={completionData.passed 
                  ? ['rgba(82, 199, 43, 0.2)', 'rgba(82, 199, 43, 0.05)']
                  : ['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.05)']}
                style={styles.scoreCard}
              >
                <LinearGradient
                  colors={completionData.passed 
                    ? ['#52C72B', '#45a824']
                    : ['#ef4444', '#dc2626']}
                  style={styles.scoreCircle}
                >
                  <Text style={styles.scorePercentage}>{percentage}%</Text>
                </LinearGradient>
                
                <Text style={styles.scoreDetails}>
                  {correctAnswers} of {totalQuestions} correct
                </Text>
                
                {/* Stars */}
                {completionData.passed && (
                  <View style={styles.starsRow}>
                    {[1, 2, 3].map(star => (
                      <View key={star} style={styles.starContainer}>
                        <LinearGradient
                          colors={star <= completionData.stars 
                            ? ['#fbbf24', '#f59e0b']
                            : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                          style={styles.starGradient}
                        >
                          <Ionicons
                            name={star <= completionData.stars ? 'star' : 'star-outline'}
                            size={28}
                            color={star <= completionData.stars ? '#fff' : '#555'}
                          />
                        </LinearGradient>
                      </View>
                    ))}
                  </View>
                )}
              </LinearGradient>
              
              {/* Rewards */}
              {completionData.passed && (
                <LinearGradient
                  colors={['rgba(102, 126, 234, 0.15)', 'rgba(118, 75, 162, 0.05)']}
                  style={styles.rewardsCard}
                >
                  <View style={styles.rewardsTitleContainer}>
                    <Ionicons name="gift" size={24} color="#667eea" />
                    <Text style={styles.rewardsTitle}>Rewards Earned</Text>
                  </View>
                  
                  <View style={styles.rewardsGrid}>
                    {completionData.shardsEarned > 0 && (
                      <View style={styles.rewardItem}>
                        <LinearGradient
                          colors={['#fbbf24', '#f59e0b']}
                          style={styles.rewardIcon}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Ionicons name="diamond" size={28} color="#fff" />
                        </LinearGradient>
                        <Text style={styles.rewardValue}>+{completionData.shardsEarned}</Text>
                        <Text style={styles.rewardLabel}>Shards</Text>
                      </View>
                    )}
                    
                    {completionData.xpEarned > 0 && (
                      <View style={styles.rewardItem}>
                        <LinearGradient
                          colors={['#667eea', '#764ba2']}
                          style={styles.rewardIcon}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Ionicons name="flash" size={28} color="#fff" />
                        </LinearGradient>
                        <Text style={styles.rewardValue}>+{completionData.xpEarned}</Text>
                        <Text style={styles.rewardLabel}>XP</Text>
                      </View>
                    )}
                  </View>
                  
                  {completionData.leveledUp && (
                    <LinearGradient
                      colors={['rgba(102, 126, 234, 0.3)', 'rgba(118, 75, 162, 0.2)']}
                      style={styles.levelUpBanner}
                    >
                      <Ionicons name="trending-up" size={28} color="#fff" />
                      <Text style={styles.levelUpText}>
                        Level Up! You're now level {completionData.newPlayerLevel}
                      </Text>
                    </LinearGradient>
                  )}
                  
                  {completionData.isNewCompletion && (
                    <View style={styles.badgeContainer}>
                      <LinearGradient
                        colors={['#52C72B', '#45a824']}
                        style={styles.badge}
                      >
                        <Text style={styles.badgeText}>🎉 First Completion!</Text>
                      </LinearGradient>
                    </View>
                  )}
                  
                  {completionData.improvedStars && !completionData.isNewCompletion && (
                    <View style={styles.badgeContainer}>
                      <LinearGradient
                        colors={['#fbbf24', '#f59e0b']}
                        style={styles.badge}
                      >
                        <Text style={styles.badgeText}>⭐ Improved Score!</Text>
                      </LinearGradient>
                    </View>
                  )}
                </LinearGradient>
              )}
              
              {/* Energy Lost */}
              {!completionData.passed && completionData.energyLost > 0 && (
                <LinearGradient
                  colors={['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.05)']}
                  style={styles.energyLostCard}
                >
                  <LinearGradient
                    colors={['#ef4444', '#dc2626']}
                    style={styles.energyIcon}
                  >
                    <Ionicons name="flash-off" size={32} color="#fff" />
                  </LinearGradient>
                  <View>
                    <Text style={styles.energyLostText}>
                      Lost {completionData.energyLost} energy
                    </Text>
                    <Text style={styles.energyLostSubtext}>
                      Try again when you have more energy
                    </Text>
                  </View>
                </LinearGradient>
              )}
              
              {/* Question Results */}
              <View style={styles.questionsHeader}>
                <Ionicons name="list" size={20} color="#667eea" />
                <Text style={styles.questionsTitle}>Question Results</Text>
              </View>
              
              {quizResults.map((item, index) => (
                <LinearGradient
                  key={index}
                  colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)']}
                  style={styles.resultItem}
                >
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultQuestionNumber}>Question {index + 1}</Text>
                    <LinearGradient
                      colors={item.isCorrect 
                        ? ['#52C72B', '#45a824']
                        : ['#ef4444', '#dc2626']}
                      style={styles.resultStatus}
                    >
                      <Ionicons 
                        name={item.isCorrect ? "checkmark" : "close"} 
                        size={16} 
                        color="#ffffff" 
                      />
                    </LinearGradient>
                  </View>
                  <Text style={styles.resultQuestion} numberOfLines={2}>
                    {quiz?.questions[index]?.question}
                  </Text>
                  <View style={styles.resultFooter}>
                    <View style={styles.resultTimeContainer}>
                      <Ionicons name="time-outline" size={14} color="#64748b" />
                      <Text style={styles.resultTime}>{item.timeSpent}s</Text>
                    </View>
                    <View style={styles.resultPointsContainer}>
                      <Ionicons name="trophy-outline" size={14} color="#64748b" />
                      <Text style={styles.resultTime}>{item.points.toFixed(1)} pts</Text>
                    </View>
                  </View>
                </LinearGradient>
              ))}
            </ScrollView>
            
            <View style={styles.resultsActions}>
              <TouchableOpacity
                style={styles.backToJourneyBtn}
                onPress={() => router.back()}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.backToJourneyGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="arrow-back" size={20} color="#fff" />
                  <Text style={styles.backToJourneyText}>Back to Journey</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.modalContainer}>
        <SpaceBackground />
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.loadingCircle}
            >
              <Ionicons name="rocket" size={40} color="#fff" />
            </LinearGradient>
            <Text style={styles.loadingText}>Preparing your journey...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!quiz) {
    return (
      <View style={styles.modalContainer}>
        <SpaceBackground />
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={64} color="#ef4444" />
            <Text style={styles.errorText}>Quiz not found</Text>
            <TouchableOpacity onPress={() => router.back()} style={styles.errorBtn}>
              <Text style={styles.errorBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (showPreQuiz) {
    return renderPreQuiz();
  }

  return (
    <View style={styles.modalContainer}>
      <SpaceBackground />
      <SafeAreaView style={styles.container}>
        {/* Header with progress */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowExitModal(true)} style={styles.exitBtn}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
              style={styles.closeBtnGradient}
            >
              <Ionicons name="close" size={24} color="#ffffff" />
            </LinearGradient>
          </TouchableOpacity>
          
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              {currentQuestionIndex + 1} / {quiz.questions.length}
            </Text>
            <View style={styles.progressBarContainer}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
                style={styles.progressBar}
              >
                <LinearGradient
                  colors={['#52C72B', '#45a824']}
                  style={[
                    styles.progressFill, 
                    { width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }
                  ]}
                />
              </LinearGradient>
            </View>
          </View>
          
          <TouchableOpacity onPress={() => setIsPaused(!isPaused)} style={styles.pauseBtn}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
              style={styles.closeBtnGradient}
            >
              <Ionicons name={isPaused ? "play" : "pause"} size={20} color="#ffffff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Timer */}
            <View style={styles.timerContainer}>
            <LinearGradient
                colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                style={styles.timerWrapper}
            >
                <View style={styles.timerBarContainer}>
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
                    >
                        <LinearGradient
                        colors={timeLeft > 5 ? ['#667eea', '#764ba2'] : ['#ef4444', '#dc2626']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                        />
                    </Animated.View>
                    </View>
                <View style={styles.timerTextContainer}>
                <Ionicons name="time" size={16} color={timeLeft > 10 ? '#667eea' : '#ef4444'} />
                <Text style={[styles.timerText, timeLeft <= 10 && styles.timerWarning]}>
                    {timeLeft}s
                </Text>
                </View>
            </LinearGradient>
            </View>

        {/* Question */}
        {!isPaused && renderQuestion()}

        {isPaused && (
          <View style={styles.pausedContainer}>
            <LinearGradient
              colors={['rgba(102, 126, 234, 0.2)', 'rgba(118, 75, 162, 0.1)']}
              style={styles.pausedCard}
            >
              <Ionicons name="pause-circle" size={80} color="#667eea" />
              <Text style={styles.pausedText}>Quiz Paused</Text>
              <TouchableOpacity onPress={() => setIsPaused(false)} style={styles.resumeBtn}>
                <LinearGradient
                  colors={['#52C72B', '#45a824']}
                  style={styles.resumeBtnGradient}
                >
                  <Ionicons name="play" size={20} color="#fff" />
                  <Text style={styles.resumeBtnText}>Resume</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        {/* Submit button */}
        {!isPaused && (
          <View style={styles.bottomContainer}>
            <TouchableOpacity style={styles.submitBtn} onPress={submitCurrentAnswer}>
              <LinearGradient
                colors={['#52C72B', '#45a824']}
                style={styles.submitBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.submitBtnText}>
                  {currentQuestionIndex + 1 === quiz.questions.length ? 'Finish Quiz' : 'Next Question'}
                </Text>
                <Ionicons 
                  name={currentQuestionIndex + 1 === quiz.questions.length ? 'checkmark-circle' : 'arrow-forward-circle'} 
                  size={24} 
                  color="#ffffff" 
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {renderResults()}

        {/* Exit Confirmation Modal */}
        <CustomAlertModal
          visible={showExitModal}
          type="warning"
          title="Exit Quiz?"
          message="Are you sure you want to exit? Your progress will be lost."
          buttons={[
            { text: 'Cancel', onPress: () => setShowExitModal(false), style: 'cancel' },
            { text: 'Exit', onPress: handleExitQuiz, style: 'primary' },
          ]}
          onClose={() => setShowExitModal(false)}
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  modalContainer: { flex: 1 },
  
  // Space Background
  spaceBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  
  // Loading & Error
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    gap: 24,
  },
  loadingCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  loadingText: { 
    color: '#ffffff', 
    fontSize: 18,
    fontFamily: 'Montserrat',
    fontWeight: '600',
  },
  errorContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 40,
  },
  errorText: { 
    color: '#ef4444', 
    fontSize: 20,
    fontFamily: 'Montserrat',
    fontWeight: '700',
  },
  errorBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    borderRadius: 12,
  },
  errorBtnText: {
    color: '#667eea',
    fontSize: 16,
    fontFamily: 'Montserrat',
    fontWeight: '600',
  },
  
  // Pre-Quiz Screen
  preQuizContainer: { flex: 1 },
  preQuizHeader: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    paddingHorizontal: 20, 
    paddingVertical: 16 
  },
  closeBtn: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  closeBtnGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  preQuizContent: { 
    paddingHorizontal: 24, 
    paddingBottom: 120,
    alignItems: 'center',
  },
  levelBadge: { 
    marginVertical: 32,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  levelBadgeGradient: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  preQuizTitle: {
    fontFamily: 'Montserrat',
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  preQuizSubtitle: {
    fontFamily: 'Montserrat',
    fontSize: 20,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  descriptionCard: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.2)',
  },
  preQuizDescription: {
    fontFamily: 'Montserrat',
    fontSize: 15,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 24,
  },
  quizInfoCard: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: 20,
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    fontFamily: 'Montserrat',
    fontSize: 17,
    color: '#fff',
    fontWeight: '700',
    flex: 1,
  },
  warningCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    gap: 16,
  },
  warningText: {
    flex: 1,
    fontFamily: 'Montserrat',
    fontSize: 15,
    color: '#fbbf24',
    fontWeight: '600',
    lineHeight: 22,
  },
  preQuizActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 40,
  },
  startBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  startBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  startBtnText: {
    fontFamily: 'Montserrat',
    fontSize: 19,
    fontWeight: '800',
    color: '#fff',
  },
  
  // Quiz Play Screen
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  exitBtn: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  progressContainer: { flex: 1 },
  progressText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'Montserrat',
  },
  progressBarContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: 8,
    borderRadius: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
  },
  pauseBtn: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  timerContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  timerWrapper: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  timerBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  timerBar: {
    height: '100%',
    borderRadius: 4,
  },
  timerTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  timerText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'Montserrat',
  },
  timerWarning: {
    color: '#ef4444',
  },
  scrollContainer: { flex: 1 },
  scrollContent: { 
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  questionContainer: { 
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  questionText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 32,
    fontFamily: 'Montserrat',
  },
  imageContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  questionImage: {
    width: '100%',
    height: 220,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  questionContent: { marginTop: 8 },
  
   // Multiple Choice
  optionsGrid: { 
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between', // Add this
  width: '100%', // Add this
},
optionButtonContainer: {
  width: '47.5%', // Change this - simpler approach
  marginBottom: 16,
  borderRadius: 16,
  overflow: 'hidden',
},
  optionButton: {
    minHeight: 110,
    padding: 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    justifyContent: 'center',
    position: 'relative',
  },
  selectedOption: {
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowOpacity: 0.5,
    transform: [{ scale: 1.02 }],
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioCircleOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  radioSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  radioCircleInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  optionText: {
    color: '#ffffff',
    fontSize: screenWidth < 375 ? 14 : 15, // Responsive font size
    fontWeight: '700',
    flex: 1,
    fontFamily: 'Montserrat',
    lineHeight: 20,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  
  // Fill Blank
  fillBlankContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  fillBlankWrapper: {
    width: '100%',
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.2)',
    alignItems: 'center',
    gap: 20,
  },
  fillBlankLabel: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '800',
    fontFamily: 'Montserrat',
  },
  inputWrapper: {
    width: '100%',
  },
  fillBlankInput: {
    width: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 16,
    padding: 20,
    color: '#ffffff',
    fontSize: 18,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: 'rgba(102, 126, 234, 0.3)',
    fontFamily: 'Montserrat',
    fontWeight: '600',
  },
  
  // Matching
  matchingInstructionsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.2)',
  },
  matchingInstructions: {
    fontFamily: 'Montserrat',
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '600',
  },
  matchingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  matchingColumn: {
    flex: 1,
    gap: 12,
  },
  columnHeaderGradient: {
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  columnHeader: {
    color: '#ffffff',
    fontFamily: 'Montserrat',
    fontSize: 16,
    fontWeight: '700',
  },
  matchingItemContainer: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  matchingItem: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
  },
  matchingItemText: {
    color: '#ffffff',
    fontFamily: 'Montserrat',
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  matchedItemText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  matchIndicator: {
    marginLeft: 8,
  },
  matchingArrow: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Paused State
  pausedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  pausedCard: {
    width: '100%',
    borderRadius: 24,
    padding: 36,
    alignItems: 'center',
    gap: 20,
  },
  pausedText: {
    color: '#ffffff',
    fontFamily: 'Montserrat',
    fontSize: 22,
    fontWeight: '800',
  },
  resumeBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  resumeBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
  },
  resumeBtnText: {
    color: '#ffffff',
    fontFamily: 'Montserrat',
    fontSize: 17,
    fontWeight: '700',
  },

  // Bottom Submit
  bottomContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  submitBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#52C72B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
    borderRadius: 20,
  },
  submitBtnText: {
    color: '#ffffff',
    fontFamily: 'Montserrat',
    fontSize: 18,
    fontWeight: '800',
  },

  // Results Screen
  resultsContainer: { flex: 1 },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  resultsTitle: {
    color: '#ffffff',
    fontFamily: 'Montserrat',
    fontSize: 26,
    fontWeight: '800',
  },
  closeResultsBtn: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  resultsScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 20,
  },
  scoreCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  scorePercentage: {
    color: '#ffffff',
    fontFamily: 'Montserrat',
    fontSize: 30,
    fontWeight: '900',
  },
  scoreDetails: {
    color: '#94a3b8',
    fontFamily: 'Montserrat',
    fontSize: 15,
    fontWeight: '600',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  starContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
  },
  starGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardsCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.2)',
    gap: 16,
  },
  rewardsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rewardsTitle: {
    color: '#ffffff',
    fontFamily: 'Montserrat',
    fontSize: 18,
    fontWeight: '800',
  },
  rewardsGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 10,
  },
  rewardItem: {
    alignItems: 'center',
    gap: 6,
  },
  rewardIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardValue: {
    color: '#ffffff',
    fontFamily: 'Montserrat',
    fontSize: 18,
    fontWeight: '700',
  },
  rewardLabel: {
    color: '#94a3b8',
    fontFamily: 'Montserrat',
    fontSize: 14,
  },
  levelUpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 16,
  },
  levelUpText: {
    color: '#ffffff',
    fontFamily: 'Montserrat',
    fontWeight: '700',
  },
  badgeContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  badge: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  badgeText: {
    color: '#ffffff',
    fontFamily: 'Montserrat',
    fontWeight: '700',
  },
  energyLostCard: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  energyIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
  energyLostText: {
    color: '#ffffff',
    fontFamily: 'Montserrat',
    fontSize: 16,
    fontWeight: '700',
  },
  energyLostSubtext: {
    color: '#94a3b8',
    fontFamily: 'Montserrat',
    fontSize: 13,
  },
  questionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  questionsTitle: {
    color: '#ffffff',
    fontFamily: 'Montserrat',
    fontWeight: '700',
    fontSize: 16,
  },
  resultItem: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultQuestionNumber: {
    color: '#ffffff',
    fontFamily: 'Montserrat',
    fontWeight: '700',
    fontSize: 14,
  },
  resultStatus: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultQuestion: {
    color: '#cbd5e1',
    fontFamily: 'Montserrat',
    fontSize: 14,
    lineHeight: 20,
  },
  resultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  resultTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resultPointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resultTime: {
    color: '#94a3b8',
    fontFamily: 'Montserrat',
    fontSize: 13,
  },
  resultsActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
  },
  backToJourneyBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  backToJourneyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 20,
  },
  backToJourneyText: {
    color: '#ffffff',
    fontFamily: 'Montserrat',
    fontSize: 17,
    fontWeight: '800',
  },
  star: {
  position: 'absolute',
  backgroundColor: '#ffffff',
  borderRadius: 100,
  shadowColor: '#ffffff',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.8,
  shadowRadius: 2,
},
});

export default JourneyQuizPlay;