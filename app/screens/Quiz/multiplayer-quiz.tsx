// app/Quiz/multiplayer-play.tsx
import { useBacklogLogger } from '@/hooks/useBackLogLogger';
import { getCurrentUserData } from '@/services/auth-service';
import { BACKLOG_EVENTS } from '@/services/backlogEvents';
import {
  getLeaderboard,
  LeaderboardEntry,
  leaveSession,
  listenToPlayers,
  listenToSession,
  moveToNextQuestion,
  MultiplayerSession,
  SessionPlayer,
  submitAnswer,
  updatePlayerActivity,
} from '@/services/multiplayer-service';
import { Question } from '@/services/quiz-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';


const { width: screenWidth } = Dimensions.get('window');
const MATCHING_COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#a855f7',
];

type Phase = 'question' | 'correct' | 'incorrect' | 'leaderboard' | 'waiting';

const MultiplayerPlay = () => {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams();
  const { addBacklogEvent, logError } = useBacklogLogger();

  const [session, setSession] = useState<MultiplayerSession | null>(null);
  const [players, setPlayers] = useState<SessionPlayer[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showQuestionPreview, setShowQuestionPreview] = useState(false);
  const [phase, setPhase] = useState<Phase>('question');
  
  // Question state
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Answer state
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [fillBlankText, setFillBlankText] = useState('');
  const [matchingPairs, setMatchingPairs] = useState<{ left: string; right: string }[]>([]);
  const [shuffledRightItems, setShuffledRightItems] = useState<string[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);
  
  // Results state
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showFinalResults, setShowFinalResults] = useState(false);
  
  // Refs
  const timerRef = useRef<number | null>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const activityInterval = useRef<number | null>(null);
  const questionStartTime = useRef(Date.now());
  const lastQuestionIndexRef = useRef<number>(-1);
  const questionPreviewScale = useRef(new Animated.Value(0)).current;
  const currentQuestionLocked = useRef(false);
  

  // Initialize
  useEffect(() => {
    initializeGame();
    return () => cleanup();
  }, []);

  useEffect(() => {
    currentQuestionLocked.current = false;
  }, [session?.currentQuestionIndex]);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleLeave();
      return true; // Prevent default back action
    });

    return () => backHandler.remove();
  }, [sessionId, currentUser]);

  // Listen to session
  useEffect(() => {
    if (!sessionId || typeof sessionId !== 'string') return;

    const unsubscribe = listenToSession(sessionId, (sessionData) => {
      if (!sessionData) {
        Alert.alert('Error', 'Session ended');
        router.back();
        return;
      }

      setSession(sessionData);

      // Handle session completion
      if (sessionData.status === 'completed' && !showFinalResults) {
        handleQuizComplete();
      }
    });

    return unsubscribe;
  }, [sessionId]);

  // Listen to players
  useEffect(() => {
    if (!sessionId || typeof sessionId !== 'string') return;

    const unsubscribe = listenToPlayers(sessionId, (playersData) => {
      setPlayers(playersData);
      checkAllAnswered(playersData);
    });

    return unsubscribe;
  }, [sessionId, hasAnswered]);

  // Update current question when session changes
  useEffect(() => {
    if (session && session.questions && !isTransitioning) {
      const question = session.questions[session.currentQuestionIndex];
      
      // Only initialize if question index actually changed
      if (question && session.currentQuestionIndex !== lastQuestionIndexRef.current) {
        lastQuestionIndexRef.current = session.currentQuestionIndex;
        initializeQuestion(question);
      }
    }
  }, [session?.currentQuestionIndex, isTransitioning]);

  // Timer
  useEffect(() => {
    if (timeLeft > 0 && !hasAnswered && !isTransitioning) {
      startTimer();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, hasAnswered, isTransitioning]);

  const initializeGame = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUserData();
      if (!user) {
        Alert.alert('Error', 'Please login to continue');
        router.back();
        return;
      }
      setCurrentUser(user);

      // Start activity heartbeat
      if (sessionId && typeof sessionId === 'string') {
        activityInterval.current = setInterval(() => {
          updatePlayerActivity(sessionId, user.uid);
        }, 15000) as unknown as number;
      }
    } catch (error) {
      console.error('Error initializing game:', error);
      Alert.alert('Error', 'Failed to initialize game');
      logError(error, 'initializeGame', currentUser?.email);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const initializeQuestion = (question: Question) => {
    console.log('Initializing question:', question.id);
    setCurrentQuestion(question);
    setHasAnswered(false);
    setShowCorrectAnswer(false);
    setShowLeaderboard(false);
    setIsTransitioning(false);
    
    // IMPORTANT: Reset lastAnswerCorrect to null at start of new question
    setLastAnswerCorrect(null);
    setPointsEarned(0);
    
    // Show question preview first
    setShowQuestionPreview(true);
    
    // Animate scale in
    questionPreviewScale.setValue(0);
    Animated.spring(questionPreviewScale, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
    
    // After 3 seconds, hide preview and start question
    setTimeout(() => {
      setShowQuestionPreview(false);
      startQuestion(question);
    }, 3000);
  };

  const startQuestion = (question: Question) => {
    setTimeLeft(question.timeLimit || 30);
    questionStartTime.current = Date.now();

    // Reset answer state
    setSelectedAnswers([]);
    setFillBlankText('');
    setSelectedLeft(null);
    setSelectedRight(null);

    // Initialize matching
    if (question.type === 'matching') {
      const pairs = question.matchPairs.map(pair => ({ left: pair.left, right: '' }));
      setMatchingPairs(pairs);
      const rightItems = question.matchPairs.map(pair => pair.right);
      setShuffledRightItems([...rightItems].sort(() => Math.random() - 0.5));
    }

    // Animate progress bar
    progressAnim.setValue(1);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: (question.timeLimit || 30) * 1000,
      useNativeDriver: false,
    }).start();
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);

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
    if (!hasAnswered) {
      handleSubmitAnswer();
    }
  };

  const checkAllAnswered = (playersData: SessionPlayer[]) => {
    if (!hasAnswered || isTransitioning || !session) return;

    // Only count ACTIVE players (not disconnected)
    const activePlayers = playersData.filter(p => p.status !== 'disconnected');
    const allAnswered = activePlayers.every(p => p.status === 'answered');
    
    if (allAnswered && activePlayers.length > 0 && !currentQuestionLocked.current ) {
      handleAllAnswered();
    }
  };

  const handleAllAnswered = async () => {
    if (isTransitioning || currentQuestionLocked.current) return;
    
    console.log('All players answered, starting transition...');
    setIsTransitioning(true);
    currentQuestionLocked.current = true;

    // Stop the timer and animation
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    progressAnim.stopAnimation();

    // IMPORTANT: Show correct answer immediately for ALL players
    // Give a small delay to ensure state is set
    await new Promise(resolve => setTimeout(resolve, 100));
    setShowCorrectAnswer(true);
    
    // Keep showing for 3 seconds (increased from 2)
    await new Promise(resolve => setTimeout(resolve, 3000));
    setShowCorrectAnswer(false);

    // Check if this was the last question
    const isLastQuestion = session && session.currentQuestionIndex + 1 >= session.totalQuestions;

    if (sessionId && typeof sessionId === 'string') {
      if (isLastQuestion) {
        console.log('Last question, moving to final results...');
        // Don't show temporary leaderboard, move straight to final results
        await new Promise(resolve => setTimeout(resolve, 1000));

        await moveToNextQuestion(sessionId);
        // The session listener will trigger handleQuizComplete
        setIsTransitioning(false);
      } else {
        console.log('Not last question, showing leaderboard...');
        // Show temporary leaderboard (3 seconds)
        const leaderboardData = await getLeaderboard(sessionId);
        setLeaderboard(leaderboardData);
        setShowLeaderboard(true);
        await new Promise(resolve => setTimeout(resolve, 3000));
        setShowLeaderboard(false);
        
        console.log('Moving to next question...');
        // Move to next question
        await moveToNextQuestion(sessionId);
        
        // Wait for the database to update and question to initialize
        await new Promise(resolve => setTimeout(resolve, 800));
        setIsTransitioning(false);
      }
    } else {
      setIsTransitioning(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (hasAnswered || !currentQuestion || !session || !sessionId || !currentUser) return;

    setHasAnswered(true);

    const timeSpent = Math.floor((Date.now() - questionStartTime.current) / 1000);
    const currentPlayer = players.find(p => p.uid === currentUser.uid);
    const currentStreak = currentPlayer?.streak || 0;

    const answer: any = {
      questionId: currentQuestion.id,
      questionIndex: session.currentQuestionIndex,
      timeSpent,
    };

    switch (currentQuestion.type) {
      case 'multiple_choice':
        answer.selectedAnswers = selectedAnswers;
        break;
      case 'fill_blank':
        answer.fillBlankAnswer = fillBlankText.trim();
        break;
      case 'matching':
        answer.matchingPairs = matchingPairs;
        break;
    }

    try {
      const result = await submitAnswer(
        sessionId as string,
        currentUser.uid,
        answer,
        currentQuestion,
        currentStreak
      );

      // Set the result immediately
      setLastAnswerCorrect(result.isCorrect);
      setPointsEarned(result.pointsEarned);
    } catch (error) {
      console.error('Error submitting answer:', error);
      Alert.alert('Error', 'Failed to submit answer');
    }
  };

  const handleQuizComplete = async () => {
    if (sessionId && typeof sessionId === 'string') {
      const finalLeaderboard = await getLeaderboard(sessionId);
      setLeaderboard(finalLeaderboard);
      setShowFinalResults(true);
    }
    addBacklogEvent(BACKLOG_EVENTS.USER_COMPLETED_MULTIPLAYER_QUIZ, {
      sessionId,
      quizId: session?.quizId,
      userId: currentUser?.uid,
      finalScore: leaderboard.find(p => p.uid === currentUser?.uid)?.score || 0,
    });
  };

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (activityInterval.current) clearInterval(activityInterval.current);
  };

  const handleLeave = () => {
    Alert.alert(
      'Leave Game',
      'Are you sure you want to leave?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            if (sessionId && typeof sessionId === 'string' && currentUser) {
              await leaveSession(sessionId, currentUser.uid);
              addBacklogEvent(BACKLOG_EVENTS.USER_LEFT_MULTIPLAYER_GAME, {
              sessionId,
              userId: currentUser?.uid,
            });
              router.back();
            }
          },
        },
      ]
    );
  };

  // Question type handlers
  const handleMultipleChoiceAnswer = (optionIndex: number) => {
    if (hasAnswered) return;
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
    if (hasAnswered || !currentQuestion) return;

    if (side === 'left') {
      if (matchingPairs[index]?.right) {
        const newPairs = [...matchingPairs];
        newPairs[index] = { left: currentQuestion.matchPairs[index].left, right: '' };
        setMatchingPairs(newPairs);
        setSelectedLeft(null);
        setSelectedRight(null);
      } else {
        setSelectedLeft(selectedLeft === index ? null : index);
        setSelectedRight(null);
      }
    } else {
      const leftIndex = matchingPairs.findIndex(pair => pair.right === shuffledRightItems[index]);
      
      if (leftIndex !== -1) {
        const newPairs = [...matchingPairs];
        newPairs[leftIndex] = { left: currentQuestion.matchPairs[leftIndex].left, right: '' };
        setMatchingPairs(newPairs);
        setSelectedLeft(null);
        setSelectedRight(null);
      } else if (selectedLeft !== null) {
        const newPairs = [...matchingPairs];
        newPairs[selectedLeft] = {
          left: currentQuestion.matchPairs[selectedLeft].left,
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

  // Render functions
  const renderMultipleChoice = (question: Question) => (
    <View style={styles.questionContent}>
      <View style={styles.optionsGrid}>
        {question.options.map((option, index) => {
          const isSelected = selectedAnswers.includes(index);
          const isCorrect = question.correctAnswers?.includes(index);
          const showResult = showCorrectAnswer;

          const optionStyles: any[] = [styles.optionButton];
          
          if (showResult) {
            if (isCorrect) {
              optionStyles.push(styles.correctOption);
            } else if (isSelected) {
              optionStyles.push(styles.incorrectOption);
            } else {
              optionStyles.push(styles.neutralOption);
            }
          } else {
            switch (index) {
              case 0: optionStyles.push(styles.option0); break;
              case 1: optionStyles.push(styles.option1); break;
              case 2: optionStyles.push(styles.option2); break;
              case 3: optionStyles.push(styles.option3); break;
            }
            if (isSelected) optionStyles.push(styles.selectedOption);
          }

          return (
            <TouchableOpacity
              key={index}
              style={optionStyles}
              onPress={() => handleMultipleChoiceAnswer(index)}
              activeOpacity={0.8}
              disabled={hasAnswered}
            >
              <View style={styles.optionContent}>
                <View style={styles.optionIndicator}>
                  {showResult && isCorrect && (
                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                  )}
                  {showResult && !isCorrect && isSelected && (
                    <Ionicons name="close" size={16} color="#ffffff" />
                  )}
                  {!showResult && isSelected && (
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
          editable={!hasAnswered}
        />
        {showCorrectAnswer && (
          <View style={styles.correctAnswerBox}>
            <Text style={styles.correctAnswerLabel}>Correct Answer:</Text>
            <Text style={styles.correctAnswerText}>{question.correctAnswer}</Text>
          </View>
        )}
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
                  isMatched && { backgroundColor: matchColor, borderColor: matchColor }
                ]}
                onPress={() => handleMatchingSelection('left', index)}
                disabled={hasAnswered}
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
            const leftIndex = matchingPairs.findIndex(pair => pair.right === item);
            const isMatched = leftIndex !== -1;
            const matchColor = isMatched ? getMatchColor(leftIndex) : undefined;
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.matchingItem,
                  styles.rightMatchingItem,
                  selectedRight === index && styles.selectedMatchingItem,
                  isMatched && { backgroundColor: matchColor, borderColor: matchColor }
                ]}
                onPress={() => handleMatchingSelection('right', index)}
                disabled={hasAnswered || isMatched}
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
    if (!currentQuestion) return null;

    return (
      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>
        
        {currentQuestion.image && (
          <Image source={{ uri: currentQuestion.image }} style={styles.questionImage} />
        )}
        
        {currentQuestion.type === 'multiple_choice' && renderMultipleChoice(currentQuestion)}
        {currentQuestion.type === 'fill_blank' && renderFillBlank(currentQuestion)}
        {currentQuestion.type === 'matching' && renderMatching(currentQuestion)}
      </View>
    );
  };

  const renderLeaderboardModal = () => (
    <Modal visible={showLeaderboard} animationType="slide" presentationStyle="fullScreen">
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.fullScreenLeaderboardContainer}>
            <Text style={styles.fullScreenLeaderboardTitle}>Current Standings</Text>
            
            {/* Mini Podium for Top 3 */}
            {leaderboard.length >= 3 && (
              <View style={styles.miniPodiumContainer}>
                {(() => {
                  const topThree = leaderboard.slice(0, 3);
                  const reordered = [topThree[1], topThree[0], topThree[2]];
                  const heights = [80, 120, 60];
                  const colors = ['#f59e0b', '#eab308', '#fb923c'];
                  const ranks = [2, 1, 3];

                  return reordered.map((player, displayIndex) => {
                    const isCurrentUser = player.uid === currentUser?.uid;
                    const actualRank = ranks[displayIndex];

                    return (
                      <View key={player.uid} style={styles.miniPodiumSlot}>
                        <View style={[
                          styles.miniPodiumBar,
                          { height: heights[displayIndex], backgroundColor: colors[displayIndex] }
                        ]}>
                          <Text style={styles.miniPodiumRank}>#{actualRank}</Text>
                        </View>
                        <Text style={[
                          styles.miniPodiumName,
                          isCurrentUser && styles.currentUserName
                        ]}>
                          {player.displayName}
                        </Text>
                        <Text style={styles.miniPodiumScore}>{player.score}</Text>
                      </View>
                    );
                  });
                })()}
              </View>
            )}

            {/* Full Rankings */}
            <View style={styles.leaderboardListContainer}>
              <FlatList
                data={leaderboard}
                keyExtractor={(item) => item.uid}
                renderItem={({ item }) => {
                  const isCurrentUser = item.uid === currentUser?.uid;
                  return (
                    <View style={[
                      styles.fullScreenLeaderboardItem,
                      isCurrentUser && styles.currentUserLeaderboard
                    ]}>
                      <Text style={styles.leaderboardRank}>#{item.rank}</Text>
                      <Text style={styles.leaderboardName}>{item.displayName}</Text>
                      <Text style={styles.leaderboardScore}>{item.score}</Text>
                    </View>
                  );
                }}
                showsVerticalScrollIndicator={false}
              />
            </View>

            <View style={styles.nextQuestionIndicator}>
              <Text style={styles.nextQuestionText}>Next question coming up...</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );

  const renderFinalResults = () => (
    <Modal visible={showFinalResults} animationType="slide" presentationStyle="fullScreen">
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>Quiz Complete!</Text>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.podiumContainer}>
            {(() => {
              const topThree = leaderboard.slice(0, 3);
              // Reorder for podium display: 2nd, 1st, 3rd
              const reordered = topThree.length >= 2 ? [topThree[1], topThree[0], topThree[2]] : topThree;
              const heights = [120, 160, 100]; // Heights for positions in display order (2nd, 1st, 3rd)
              const colors = ['#f59e0b', '#eab308', '#fb923c']; // Colors for positions in display order
              const ranks = topThree.length >= 2 ? [2, 1, 3] : [1, 2, 3]; // Actual ranks

              return reordered.filter(Boolean).map((player, displayIndex) => {
                const isCurrentUser = player.uid === currentUser?.uid;
                const actualRank = ranks[displayIndex];

                return (
                  <View key={player.uid} style={styles.podiumSlot}>
                    <View style={[
                      styles.podiumBar,
                      { height: heights[displayIndex], backgroundColor: colors[displayIndex] }
                    ]}>
                      <Text style={styles.podiumRank}>#{actualRank}</Text>
                    </View>
                    <Text style={[
                      styles.podiumName,
                      isCurrentUser && styles.currentUserName
                    ]}>
                      {player.displayName}
                    </Text>
                    <Text style={styles.podiumScore}>{player.score} pts</Text>
                  </View>
                );
              });
            })()}
          </View>

          <View style={styles.fullLeaderboard}>
            <Text style={styles.fullLeaderboardTitle}>Full Rankings</Text>
            <FlatList
              data={leaderboard}
              keyExtractor={(item) => item.uid}
              renderItem={({ item }) => {
                const isCurrentUser = item.uid === currentUser?.uid;
                return (
                  <View style={[
                    styles.finalLeaderboardItem,
                    isCurrentUser && styles.currentUserLeaderboard
                  ]}>
                    <Text style={styles.finalRank}>#{item.rank}</Text>
                    <Text style={styles.finalName}>{item.displayName}</Text>
                    <View style={styles.finalStats}>
                      <Text style={styles.finalScore}>{item.score}</Text>
                      <Text style={styles.finalCorrect}>
                        {item.correctAnswers}/{session?.totalQuestions}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
          </View>

          <TouchableOpacity
            style={styles.backToLobbyBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backToLobbyText}>Back to Home</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );

  if (loading) {
    return (
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading game...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!session || !currentQuestion) {
    return (
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Game not found</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const answeredCount = players.filter(p => p.status === 'answered').length;
  const currentPlayerData = players.find(p => p.uid === currentUser?.uid);

  return (
    <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleLeave} style={styles.exitBtn}>
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Question {session.currentQuestionIndex + 1} / {session.totalQuestions}
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${((session.currentQuestionIndex + 1) / session.totalQuestions) * 100}%` }
                ]} 
              />
            </View>
          </View>

          <View style={styles.streakContainer}>
            {currentPlayerData && currentPlayerData.streak > 0 && (
              <>
                <Ionicons name="flame" size={20} color="#f59e0b" />
                <Text style={styles.streakText}>{currentPlayerData.streak}</Text>
              </>
            )}
          </View>
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

        {showQuestionPreview && currentQuestion && (
          <View style={styles.questionPreviewContainer}>
            <Animated.View 
              style={[
                styles.questionPreviewContent,
                {
                  transform: [{ scale: questionPreviewScale }]
                }
              ]}
            >
              <Text style={styles.questionPreviewNumber}>
                Question {session.currentQuestionIndex + 1}
              </Text>
              <Text style={styles.questionPreviewText}>
                {currentQuestion.question}
              </Text>
            </Animated.View>
          </View>
        )}

        {/* Scrollable Question Content */}
        {!showCorrectAnswer && !showLeaderboard && !hasAnswered && !showQuestionPreview && (
          <ScrollView 
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {renderQuestion()}
          </ScrollView>
        )}

        {/* Waiting State - Full Screen */}
        {hasAnswered && !showCorrectAnswer && !showLeaderboard && (
          <View style={styles.fullScreenWaitingContainer}>
            <View style={styles.waitingContent}>
              <LottieView
                source={require('@/assets/animations/quiz-loading.json')}
                autoPlay
                loop
                style={styles.waitingAnimation}
              />
              <Text style={styles.waitingText}>Waiting for others...</Text>
              <Text style={styles.waitingSubtext}>
                {answeredCount} / {players.length} answered
              </Text>
            </View>
          </View>
        )}

        {/* Correct Answer Display - Full Screen */}
        {showCorrectAnswer && lastAnswerCorrect !== null && (
          <View style={styles.fullScreenResultContainer}>
            {lastAnswerCorrect && (
              <LottieView
                source={require('@/assets/animations/confetti.json')}
                loop={false}
                autoPlay={true}
                style={styles.confettiAnimation}
              />
            )}
            <View style={styles.resultContent}>
              <Ionicons 
                name={lastAnswerCorrect ? "checkmark-circle" : "close-circle"} 
                size={120} 
                color={lastAnswerCorrect ? "#10b981" : "#ef4444"} 
              />
              <Text style={[
                styles.resultText,
                lastAnswerCorrect ? styles.correctText : styles.incorrectText
              ]}>
                {lastAnswerCorrect ? 'Correct!' : 'Incorrect'}
              </Text>
              {pointsEarned > 0 && (
                <Text style={styles.pointsText}>+{pointsEarned} points</Text>
              )}
              
              {/* Show correct answer for the question */}
              {currentQuestion && (
                <View style={styles.correctAnswerDisplay}>
                  <Text style={styles.correctAnswerTitle}>Correct Answer:</Text>
                  {currentQuestion.type === 'multiple_choice' && (
                    <View style={styles.correctOptionsContainer}>
                      {currentQuestion.options.map((option, index) => {
                        if (currentQuestion.correctAnswers?.includes(index)) {
                          return (
                            <View key={index} style={styles.correctOptionDisplay}>
                              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                              <Text style={styles.correctOptionText}>{option}</Text>
                            </View>
                          );
                        }
                        return null;
                      })}
                    </View>
                  )}
                  {currentQuestion.type === 'fill_blank' && (
                    <Text style={styles.correctAnswerValue}>{currentQuestion.correctAnswer}</Text>
                  )}
                  {currentQuestion.type === 'matching' && (
                    <View style={styles.correctMatchesContainer}>
                      {currentQuestion.matchPairs.map((pair, index) => (
                        <View key={index} style={styles.correctMatchPair}>
                          <Text style={styles.correctMatchText}>{pair.left}</Text>
                          <Ionicons name="arrow-forward" size={16} color="#64748b" />
                          <Text style={styles.correctMatchText}>{pair.right}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Submit Button */}
        {!hasAnswered && !showCorrectAnswer && !showLeaderboard && !showQuestionPreview && (
          <View style={styles.bottomContainer}>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmitAnswer}
            >
              <Text style={styles.submitBtnText}>Submit Answer</Text>
              <Ionicons name="checkmark" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}

        {renderLeaderboardModal()}
        {renderFinalResults()}
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 40,
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
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    height: 250,
    borderRadius: 12,
    marginBottom: 20,
    resizeMode: 'contain',
  },
  questionContent: {
    // Removed flex: 1 to prevent overflow issues
  },
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
  correctOption: {
    backgroundColor: '#10b981',
  },
  incorrectOption: {
    backgroundColor: '#ef4444',
  },
  neutralOption: {
    backgroundColor: '#334155',
    opacity: 0.6,
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
  correctAnswerBox: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#065f46',
    borderRadius: 8,
    width: '100%',
  },
  correctAnswerLabel: {
    color: '#d1fae5',
    fontSize: 14,
    marginBottom: 4,
  },
  correctAnswerText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
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
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  waitingText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  waitingSubtext: {
    color: '#94a3b8',
    fontSize: 16,
    marginTop: 8,
  },
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  resultText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 16,
  },
  correctText: {
    color: '#10b981',
  },
  incorrectText: {
    color: '#ef4444',
  },
  pointsText: {
    color: '#f59e0b',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  leaderboardCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  leaderboardTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  currentUserLeaderboard: {
    borderWidth: 2,
    borderColor: '#10b981',
  },
  leaderboardRank: {
    color: '#8b5cf6',
    fontSize: 16,
    fontWeight: 'bold',
    width: 40,
  },
  leaderboardName: {
    color: '#ffffff',
    fontSize: 16,
    flex: 1,
  },
  leaderboardScore: {
    color: '#f59e0b',
    fontSize: 18,
    fontWeight: 'bold',
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
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 32,
    gap: 16,
  },
  podiumSlot: {
    alignItems: 'center',
    flex: 1,
  },
  podiumBar: {
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 12,
  },
  podiumRank: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  podiumName: {
    color: '#ffffff',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  currentUserName: {
    color: '#10b981',
  },
  podiumScore: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  fullLeaderboard: {
    flex: 1,
    paddingHorizontal: 20,
  },
  fullLeaderboardTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  finalLeaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  finalRank: {
    color: '#8b5cf6',
    fontSize: 16,
    fontWeight: 'bold',
    width: 40,
  },
  finalName: {
    color: '#ffffff',
    fontSize: 16,
    flex: 1,
  },
  finalStats: {
    alignItems: 'flex-end',
  },
  finalScore: {
    color: '#f59e0b',
    fontSize: 18,
    fontWeight: 'bold',
  },
  finalCorrect: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  backToLobbyBtn: {
    marginHorizontal: 20,
    marginVertical: 20,
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  backToLobbyText: {
    color: '#ffffff',
    fontSize: 18,
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for submit button
  },
  fullScreenWaitingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  waitingContent: {
    alignItems: 'center',
    width: '100%',
  },
  waitingAnimation: {
    width: 200,
    height: 200,
  },
  fullScreenResultContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  resultContent: {
    alignItems: 'center',
    width: '100%',
  },
  correctAnswerDisplay: {
    marginTop: 40,
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
  },
  correctAnswerTitle: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  correctOptionsContainer: {
    gap: 12,
  },
  correctOptionDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 8,
  },
  correctOptionText: {
    color: '#ffffff',
    fontSize: 16,
    flex: 1,
  },
  correctAnswerValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  correctMatchesContainer: {
    gap: 12,
  },
  correctMatchPair: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 8,
  },
  correctMatchText: {
    color: '#ffffff',
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
  },
  fullScreenLeaderboardContainer: {
    flex: 1,
    paddingTop: 40,
  },
  fullScreenLeaderboardTitle: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32,
  },
  miniPodiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 40,
    marginBottom: 32,
    gap: 16,
  },
  miniPodiumSlot: {
    alignItems: 'center',
    flex: 1,
  },
  miniPodiumBar: {
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 8,
  },
  miniPodiumRank: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  miniPodiumName: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  miniPodiumScore: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
    fontWeight: 'bold',
  },
  leaderboardListContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  fullScreenLeaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  nextQuestionIndicator: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  nextQuestionText: {
    color: '#8b5cf6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  questionPreviewContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  questionPreviewContent: {
    alignItems: 'center',
    width: '100%',
  },
  questionPreviewNumber: {
    color: '#8b5cf6',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  questionPreviewText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 42,
  },
  confettiAnimation: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 1000,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  streakText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default MultiplayerPlay;