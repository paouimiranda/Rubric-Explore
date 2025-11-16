// app/Quiz/multiplayer-lobby.tsx with Avatars & Themes & Animations
import ThemeAnimations from '@/components/Interface/theme-animations';
import { getAvatarUrl } from '@/constants/avatars';
import { getTheme } from '@/constants/friend-card-themes';
import { db } from '@/firebase';
import { useBacklogLogger } from '@/hooks/useBackLogLogger';
import { getCurrentUserData } from '@/services/auth-service';
import { BACKLOG_EVENTS } from '@/services/backlogEvents';
import {
  createMultiplayerSession,
  leaveSession,
  listenToPlayers,
  listenToSession,
  MultiplayerSession,
  SessionPlayer,
  setPlayerReady,
  startQuiz,
  togglePowerUps
} from '@/services/multiplayer-service';
import { QuizService, type Quiz } from '@/services/quiz-service';
import { getUserThemesBatch } from '@/services/theme-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Clipboard,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Extended player type with avatar and theme
interface EnhancedSessionPlayer extends SessionPlayer {
  avatarIndex?: number;
  themeId?: string;
}

// PlayerCard component - defined outside to ensure proper hook initialization
const PlayerCard = React.memo(({ 
  item, 
  currentUserId 
}: { 
  item: EnhancedSessionPlayer; 
  currentUserId: string;
}) => {
  const isCurrentUser = item.uid === currentUserId;
  const statusColor =
    item.status === 'ready' ? '#10b981' : 
    item.status === 'disconnected' ? '#ef4444' : 
    '#94a3b8';

  const avatarUrl = getAvatarUrl(item.avatarIndex ?? 0);
  const theme = getTheme(item.themeId || 'default');
  const [isMounted, setIsMounted] = useState(false);

  console.log(`🎨 Rendering player ${item.displayName}: themeId=${item.themeId}, theme=${theme.id}, animated=${theme.animated}`);

  // Animation refs for glow/pulse effects
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Mount effect - similar to FriendCard
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Start animations - similar to FriendCard
  useEffect(() => {
    if (theme.animated && isMounted) {
      if (theme.animationType === 'glow' || theme.borderGlow) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }

      if (theme.animationType === 'pulse') {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.03,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    }
  }, [theme.animated, theme.animationType, theme.borderGlow, isMounted]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  // Apply theme styling to card - make background transparent if gradient exists
  const cardStyle = [
    styles.playerCard,
    {
      backgroundColor: theme.gradientColors ? 'transparent' : (theme.backgroundColor || '#1e293b'),
      borderColor: theme.borderColor || '#334155',
      borderWidth: theme.borderWidth || 1,
    },
    theme.shadowColor && {
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
  ];

  return (
    <Animated.View style={[styles.playerCardWrapper, { transform: [{ scale: pulseAnim }] }]}>
      {/* Theme gradient background - must be behind content */}
      {theme.gradientColors && theme.gradientColors.length > 0 && (
        <LinearGradient
          colors={theme.gradientColors as any}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 12 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}

      {/* Theme animations (particles, shimmer, wave, matrix, etc.) */}
      {theme.animated && (
        <ThemeAnimations 
          theme={theme}
          containerStyle={{ borderRadius: 12 }}
        />
      )}

      {/* Theme glow effect with animation */}
      {theme.borderGlow && theme.glowColor && (
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius: 12,
              borderWidth: 2,
              borderColor: theme.glowColor,
              opacity: glowOpacity,
            },
          ]}
        />
      )}

      <View style={cardStyle}>
        <View style={styles.playerInfo}>
          {/* Avatar with theme-colored border */}
          <View style={styles.avatarWrapper}>
            <LinearGradient
              colors={theme.gradientColors && theme.gradientColors.length > 0 
                ? theme.gradientColors as any 
                : [statusColor, statusColor]}
              style={styles.avatarBorder}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.avatarImageContainer}>
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              </View>
            </LinearGradient>
            
            {/* Status indicator */}
            <View style={[styles.statusIndicator, { backgroundColor: statusColor }]}>
              <View style={styles.statusPulse} />
            </View>
          </View>

          <View style={styles.playerDetails}>
            <Text style={styles.playerName}>
              {item.displayName} {isCurrentUser && '(You)'}
            </Text>
            <Text style={styles.playerStatus}>
              {item.status === 'ready' ? '✓ Ready' : 
               item.status === 'disconnected' ? '✗ Disconnected' : 
               '○ Waiting'}
            </Text>
          </View>
        </View>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      </View>
    </Animated.View>
  );
});

const MultiplayerLobby = () => {
  const router = useRouter();
  const { quizId, sessionId: paramSessionId } = useLocalSearchParams();
  const { addBacklogEvent, logError } = useBacklogLogger();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [session, setSession] = useState<MultiplayerSession | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(
    typeof paramSessionId === 'string' ? paramSessionId : null
  );
  const [players, setPlayers] = useState<EnhancedSessionPlayer[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const isStartingRef = useRef(false);

  // Load quiz and create session if needed
  useEffect(() => {
    initializeLobby();
  }, [quizId]);

  // Listen to session updates
  useEffect(() => {
    if (!sessionId) return;

    const unsubscribeSession = listenToSession(sessionId, (sessionData) => {
      console.log('Session updated:', sessionData?.status);
      setSession(sessionData);

      // Auto-navigate to gameplay when quiz starts
      if (sessionData?.status === 'in_progress') {
        console.log('Navigating to multiplayer-quiz...');
        router.replace({
          pathname: './multiplayer-quiz',
          params: { sessionId },
        });
      }
    });

    const unsubscribePlayers = listenToPlayers(sessionId, async (playersData) => {
      // Enhance players with avatar and theme data
      const enhancedPlayers = await enhancePlayersWithUserData(playersData);
      setPlayers(enhancedPlayers);
      checkAutoStart(enhancedPlayers);
    });

    return () => {
      unsubscribeSession();
      unsubscribePlayers();
    };
  }, [sessionId]);

  // IMPROVED: Function to fetch avatar and theme data for players using theme service
  const enhancePlayersWithUserData = async (playersData: SessionPlayer[]): Promise<EnhancedSessionPlayer[]> => {
    try {
      const playerIds = playersData.map(p => p.uid);
      
      // Batch fetch themes using the theme service (with caching)
      const themeMap = await getUserThemesBatch(playerIds);
      console.log('✅ Themes fetched via theme service:', Object.fromEntries(themeMap));
      
      // Fetch avatars in parallel
      const enhancedPlayers = await Promise.all(
        playersData.map(async (player) => {
          try {
            // Get theme from the batch result
            const themeId = themeMap.get(player.uid) || 'default';
            
            // Fetch avatar index from user document
            const userDoc = await getDoc(doc(db, 'users', player.uid));
            const avatarIndex = userDoc.exists() ? (userDoc.data().avatarIndex ?? 0) : 0;
            
            console.log(`👤 ${player.displayName}: avatar=${avatarIndex}, theme=${themeId}`);
            
            return {
              ...player,
              avatarIndex,
              themeId,
            };
          } catch (error) {
            console.error(`Error fetching user data for ${player.uid}:`, error);
            return { ...player, avatarIndex: 0, themeId: 'default' };
          }
        })
      );
      
      return enhancedPlayers;
    } catch (error) {
      console.error('Error enhancing players:', error);
      return playersData.map(p => ({ ...p, avatarIndex: 0, themeId: 'default' }));
    }
  };

  const initializeLobby = async () => {
    try {
      setLoading(true);

      console.log('Initializing lobby with quizId:', quizId, 'sessionId:', paramSessionId);

      // Get current user
      const user = await getCurrentUserData();
      if (!user) {
        console.log('No user found');
        Alert.alert('Error', 'Please login to continue');
        router.back();
        return;
      }
      console.log('User loaded:', user.uid);
      setCurrentUser(user);

      // Normalize params
      const normalizedQuizId = Array.isArray(quizId) ? quizId[0] : quizId;
      const normalizedSessionId = Array.isArray(paramSessionId) ? paramSessionId[0] : paramSessionId;

      // If joining (sessionId provided but no quizId), fetch session first to get quizId
      if (normalizedSessionId && !normalizedQuizId) {
        console.log('Joining existing session, fetching session data...');
        
        const sessionDoc = await getDoc(doc(db, 'multiplayerSessions', normalizedSessionId));
        if (!sessionDoc.exists()) {
          Alert.alert('Error', 'Session not found');
          router.back();
          return;
        }
        
        const sessionData = sessionDoc.data() as MultiplayerSession;
        const sessionQuizId = sessionData.quizId;
        
        console.log('Loading quiz from session:', sessionQuizId);
        const quizData = await QuizService.getQuizById(sessionQuizId, true);
        if (!quizData) {
          Alert.alert('Error', 'Quiz not found');
          router.back();
          return;
        }
        
        console.log('Quiz loaded:', quizData.title);
        setQuiz(quizData);
        setSessionId(normalizedSessionId);
        setIsCreator(false);
        addBacklogEvent(BACKLOG_EVENTS.USER_JOINED_MULTIPLAYER_SESSION, {
          sessionId: normalizedSessionId,
          quizId: sessionQuizId,
          userId: user.uid,
        });
      } else if (normalizedQuizId && typeof normalizedQuizId === 'string') {
        console.log('Loading quiz:', normalizedQuizId);
        const quizData = await QuizService.getQuizById(normalizedQuizId, false);
        if (!quizData) {
          console.log('Quiz not found');
          Alert.alert('Error', 'Quiz not found');
          router.back();
          return;
        }
        console.log('Quiz loaded:', quizData.title);
        setQuiz(quizData);

        if (!normalizedSessionId) {
          console.log('Creating new multiplayer session...');
          const { sessionId: newSessionId, sessionCode } = await createMultiplayerSession(
            quizData,
            user.uid,
            user.displayName || 'Anonymous'
          );
          
          console.log('Session created:', newSessionId, sessionCode);
          setSessionId(newSessionId);
          setIsCreator(true);
          addBacklogEvent(BACKLOG_EVENTS.USER_CREATED_MULTIPLAYER_SESSION, {
            sessionId: newSessionId,
            quizId: normalizedQuizId,
            userId: user.uid,
            sessionCode,
          });
        } else {
          console.log('Using existing sessionId:', normalizedSessionId);
          setSessionId(normalizedSessionId);
        }
      } else {
        console.log('Invalid params - quizId:', normalizedQuizId, 'sessionId:', normalizedSessionId);
        Alert.alert('Error', 'Invalid session parameters');
        router.back();
      }
    } catch (error) {
      console.error('Error initializing lobby:', error);
      Alert.alert('Error', `Failed to initialize lobby: ${error}`);
      logError(error, 'initializeLobby', currentUser?.email);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const checkAutoStart = async (playersData: EnhancedSessionPlayer[]) => {
    if (playersData.length >= 2) {
      const allReady = playersData.every((p) => p.status === 'ready');
      
      if (allReady && sessionId) {
        console.log('All players ready, starting quiz...');
        isStartingRef.current = true;
        await handleStartQuiz();
      }
    }
  };

  const handleToggleReady = async () => {
    if (!sessionId || !currentUser) return;

    try {
      const newReadyState = !isReady;
      await setPlayerReady(sessionId, currentUser.uid, newReadyState);
      setIsReady(newReadyState);
      addBacklogEvent(BACKLOG_EVENTS.USER_TOGGLED_READY_IN_MULTIPLAYER, {
        sessionId,
        userId: currentUser.uid,
        isReady: newReadyState,
      });
    } catch (error) {
      console.error('Error toggling ready:', error);
      Alert.alert('Error', 'Failed to update ready status');
    }
  };

  const handleTogglePowerUps = async (enabled: boolean) => {
    if (!sessionId || !isCreator) return;

    try {
      await togglePowerUps(sessionId, enabled);
    } catch (error) {
      console.error('Error toggling power-ups:', error);
      Alert.alert('Error', 'Failed to toggle power-ups');
    }
  };

  const handleStartQuiz = async () => {
    if (!sessionId) return;

    try {
      console.log('Starting quiz for session:', sessionId);  
      await startQuiz(sessionId);
      addBacklogEvent(BACKLOG_EVENTS.USER_STARTED_MULTIPLAYER_QUIZ, {
        sessionId,
        quizId: quiz?.id,
        userId: currentUser?.uid,
      });
    } catch (error) {
      console.error('Error starting quiz:', error);
      Alert.alert('Error', 'Failed to start quiz');
      isStartingRef.current = false;
    }
  };

  const handleCopyCode = () => {
    if (session?.sessionCode) {
      Clipboard.setString(session.sessionCode);
      Alert.alert('Copied!', 'Session code copied to clipboard');
    }
  };

  const handleLeave = () => {
    Alert.alert(
      'Leave Lobby',
      'Are you sure you want to leave?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            if (sessionId && currentUser) {
              await leaveSession(sessionId, currentUser.uid);
              addBacklogEvent(BACKLOG_EVENTS.USER_LEFT_MULTIPLAYER_SESSION, {
                sessionId,
                userId: currentUser.uid,
              });
              router.back();
            }
          },
        },
      ]
    );
  };

  // Simplified render function - just returns the PlayerCard component
  const renderPlayer = ({ item }: { item: EnhancedSessionPlayer }) => {
    return <PlayerCard item={item} currentUserId={currentUser?.uid || ''} />;
  };

  if (loading) {
    return (
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Setting up lobby...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!quiz || !session) {
    return (
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load lobby</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const allPlayersReady = players.length >= 2 && players.every((p) => p.status === 'ready');

  return (
    <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleLeave} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Multiplayer Lobby</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Session Code Card */}
        <View style={styles.codeCard}>
          <View style={styles.codeContent}>
            <Text style={styles.codeLabel}>Session Code</Text>
            <Text style={styles.codeText}>{session.sessionCode}</Text>
          </View>
          <TouchableOpacity onPress={handleCopyCode} style={styles.copyBtn}>
            <Ionicons name="copy-outline" size={20} color="#ffffff" />
            <Text style={styles.copyBtnText}>Copy</Text>
          </TouchableOpacity>
        </View>

        {/* Quiz Info */}
        <View style={styles.quizInfoCard}>
          <Text style={styles.quizTitle}>{quiz.title}</Text>
          <View style={styles.quizStats}>
            <View style={styles.statItem}>
              <Ionicons name="help-circle-outline" size={16} color="#94a3b8" />
              <Text style={styles.statText}>{quiz.questions.length} Questions</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={16} color="#94a3b8" />
              <Text style={styles.statText}>{players.length} Players</Text>
            </View>
          </View>
        </View>

        {/* Power-ups Toggle (Creator Only) */}
        {isCreator && (
          <View style={styles.powerUpsCard}>
            <View style={styles.powerUpsHeader}>
              <Ionicons name="flash" size={20} color="#f59e0b" />
              <Text style={styles.powerUpsTitle}>Power-Ups</Text>
            </View>
            <View style={styles.powerUpsToggle}>
              <Text style={styles.powerUpsLabel}>
                {session.powerUpsEnabled ? 'Enabled' : 'Disabled'}
              </Text>
              <Switch
                value={session.powerUpsEnabled}
                onValueChange={handleTogglePowerUps}
                trackColor={{ false: '#334155', true: '#10b981' }}
                thumbColor={session.powerUpsEnabled ? '#ffffff' : '#f4f3f4'}
              />
            </View>
          </View>
        )}

        {/* Players List */}
        <View style={styles.playersSection}>
          <Text style={styles.sectionTitle}>Players</Text>
          <FlatList
            data={players}
            renderItem={renderPlayer}
            keyExtractor={(item) => item.uid}
            style={styles.playersList}
            contentContainerStyle={styles.playersListContent}
          />
        </View>

        {/* Ready Button */}
        <View style={styles.bottomContainer}>
          {players.length < 2 && (
            <Text style={styles.waitingText}>Waiting for more players...</Text>
          )}
          
          <TouchableOpacity
            style={[
              styles.readyBtn,
              isReady && styles.readyBtnActive,
            ]}
            onPress={handleToggleReady}
          >
            <Ionicons 
              name={isReady ? "checkmark-circle" : "checkmark-circle-outline"} 
              size={24} 
              color="#ffffff" 
            />
            <Text style={styles.readyBtnText}>
              {isReady ? "I'm Ready!" : "Mark as Ready"}
            </Text>
          </TouchableOpacity>

          {allPlayersReady && (
            <View style={styles.startingNotice}>
              <Text style={styles.startingText}>Starting quiz...</Text>
            </View>
          )}
        </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  codeCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8b5cf6',
  },
  codeContent: {
    flex: 1,
  },
  codeLabel: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 4,
  },
  codeText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  copyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  quizInfoCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  quizTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  quizStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  powerUpsCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  powerUpsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  powerUpsTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  powerUpsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  powerUpsLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  playersSection: {
    flex: 1,
    marginHorizontal: 20,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  playersList: {
    flex: 1,
  },
  playersListContent: {
    gap: 10,
  },
  playerCardWrapper: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 2,
  },
  playerCard: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarBorder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusPulse: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'inherit',
  },
  playerDetails: {
    gap: 3,
    flex: 1,
  },
  playerName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  playerStatus: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },

  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  bottomContainer: {
    padding: 20,
    gap: 12,
  },
  waitingText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },
  readyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  readyBtnActive: {
    backgroundColor: '#10b981',
  },
  readyBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  startingNotice: {
    backgroundColor: '#065f46',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  startingText: {
    color: '#d1fae5',
    fontSize: 16,
    fontWeight: '600',
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
});

export default MultiplayerLobby;