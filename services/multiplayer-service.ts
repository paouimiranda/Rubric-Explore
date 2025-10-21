// services/multiplayer-service.ts - COMPLETE UPDATED VERSION
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { Question, Quiz } from './quiz-service';

// Types
export interface MultiplayerSession {
  id?: string;
  sessionCode: string;
  quizId: string;
  quizTitle: string;
  creatorId: string;
  creatorName: string;
  status: 'waiting' | 'starting' | 'in_progress' | 'completed' | 'abandoned';
  powerUpsEnabled: boolean;
  currentQuestionIndex: number;
  totalQuestions: number;
  questions: Question[];
  createdAt: Timestamp;
  lastActivity: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
}

export interface SessionPlayer {
  uid: string;
  displayName: string;
  avatarId?: number;
  status: 'connected' | 'disconnected' | 'ready' | 'answered';
  score: number;
  streak: number;
  lastActive: Timestamp;
  currentQuestionIndex: number;
  answers: PlayerAnswer[];
  joinedAt: Timestamp;
}

export interface PlayerAnswer {
  questionId: string;
  questionIndex: number;
  selectedAnswers?: number[];
  fillBlankAnswer?: string;
  matchingPairs?: { left: string; right: string }[];
  isCorrect: boolean;
  pointsEarned: number;
  streakBonus: number;
  answeredAt: Timestamp;
  timeSpent: number;
}

export interface PowerUp {
  id: string;
  userId: string;
  type: 'eliminate_wrong' | 'hint' | 'extra_time';
  quantity: number;
  createdAt: Timestamp;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  avatarId?: number;
  score: number;
  streak: number;
  correctAnswers: number;
  rank: number;
}

// Constants
const POINTS_PER_QUESTION = 100;
const STREAK_BONUS_PERCENT = 10; // 10% bonus per streak level
const SESSION_CODE_LENGTH = 6;
const SESSION_EXPIRY_HOURS = 1;

/**
 * Generate a unique session code
 */
const generateSessionCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < SESSION_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Check if session code already exists
 */
const isSessionCodeUnique = async (code: string): Promise<boolean> => {
  const q = query(
    collection(db, 'multiplayerSessions'),
    where('sessionCode', '==', code),
    where('status', 'in', ['waiting', 'starting', 'in_progress'])
  );
  const snapshot = await getDocs(q);
  return snapshot.empty;
};

/**
 * Create a new multiplayer session
 */
export const createMultiplayerSession = async (
  quiz: Quiz,
  creatorId: string,
  creatorName: string
): Promise<{ sessionId: string; sessionCode: string }> => {
  try {
    // Generate unique session code
    let sessionCode = generateSessionCode();
    while (!(await isSessionCodeUnique(sessionCode))) {
      sessionCode = generateSessionCode();
    }

    const sessionData: Omit<MultiplayerSession, 'id'> = {
      sessionCode,
      quizId: quiz.id!,
      quizTitle: quiz.title,
      creatorId,
      creatorName,
      status: 'waiting',
      powerUpsEnabled: false,
      currentQuestionIndex: 0,
      totalQuestions: quiz.questions.length,
      questions: quiz.questions,
      createdAt: serverTimestamp() as Timestamp,
      lastActivity: serverTimestamp() as Timestamp,
    };

    const sessionRef = await addDoc(collection(db, 'multiplayerSessions'), sessionData);

    // Add creator as first player
    const playerData: SessionPlayer = {
      uid: creatorId,
      displayName: creatorName,
      status: 'connected',
      score: 0,
      streak: 0,
      lastActive: serverTimestamp() as Timestamp,
      currentQuestionIndex: 0,
      answers: [],
      joinedAt: serverTimestamp() as Timestamp,
    };

    await addDoc(collection(db, 'multiplayerSessions', sessionRef.id, 'players'), playerData);

    return { sessionId: sessionRef.id, sessionCode };
  } catch (error) {
    console.error('Error creating multiplayer session:', error);
    throw new Error('Failed to create multiplayer session');
  }
};

/**
 * Join an existing session by code
 */
export const joinSessionByCode = async (
  sessionCode: string,
  userId: string,
  displayName: string,
  avatarId?: number
): Promise<string> => {
  try {
    // Find session by code
    const q = query(
      collection(db, 'multiplayerSessions'),
      where('sessionCode', '==', sessionCode.toUpperCase()),
      where('status', '==', 'waiting')
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error('Session not found or already started');
    }

    const sessionDoc = snapshot.docs[0];
    const sessionId = sessionDoc.id;

    // Check if user already in session
    const playersSnapshot = await getDocs(
      collection(db, 'multiplayerSessions', sessionId, 'players')
    );
    const existingPlayer = playersSnapshot.docs.find(
      (doc) => doc.data().uid === userId
    );

    if (existingPlayer) {
      // Rejoin - update status to connected
      await updateDoc(existingPlayer.ref, {
        status: 'connected',
        lastActive: serverTimestamp(),
      });
      return sessionId;
    }

    // Add new player
    const playerData: Partial<SessionPlayer> = {
      uid: userId,
      displayName,
      status: 'connected',
      score: 0,
      streak: 0,
      lastActive: serverTimestamp() as Timestamp,
      currentQuestionIndex: 0,
      answers: [],
      joinedAt: serverTimestamp() as Timestamp,
    };

    if (avatarId !== undefined) {
      playerData.avatarId = avatarId;
    }

    await addDoc(
      collection(db, 'multiplayerSessions', sessionId, 'players'),
      playerData
    );

    // Update session last activity
    await updateDoc(doc(db, 'multiplayerSessions', sessionId), {
      lastActivity: serverTimestamp(),
    });

    return sessionId;
  } catch (error) {
    console.error('Error joining session:', error);
    throw error;
  }
};

/**
 * Mark player as ready
 */
export const setPlayerReady = async (
  sessionId: string,
  playerId: string,
  ready: boolean
): Promise<void> => {
  try {
    const playersRef = collection(db, 'multiplayerSessions', sessionId, 'players');
    const q = query(playersRef, where('uid', '==', playerId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const playerDoc = snapshot.docs[0];
      await updateDoc(playerDoc.ref, {
        status: ready ? 'ready' : 'connected',
        lastActive: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error setting player ready:', error);
    throw error;
  }
};

/**
 * Toggle power-ups for session (creator only)
 */
export const togglePowerUps = async (
  sessionId: string,
  enabled: boolean
): Promise<void> => {
  try {
    await updateDoc(doc(db, 'multiplayerSessions', sessionId), {
      powerUpsEnabled: enabled,
      lastActivity: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error toggling power-ups:', error);
    throw error;
  }
};

/**
 * Start the quiz (automatic when all ready)
 */
export const startQuiz = async (sessionId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'multiplayerSessions', sessionId), {
      status: 'in_progress',
      startedAt: serverTimestamp(),
      lastActivity: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error starting quiz:', error);
    throw error;
  }
};

/**
 * Submit answer for current question
 */
export const submitAnswer = async (
  sessionId: string,
  playerId: string,
  answer: Omit<PlayerAnswer, 'isCorrect' | 'pointsEarned' | 'streakBonus' | 'answeredAt'>,
  question: Question,
  currentStreak: number
): Promise<{ isCorrect: boolean; pointsEarned: number; newStreak: number }> => {
  try {
    // Validate answer
    let isCorrect = false;

    switch (question.type) {
      case 'multiple_choice':
        const userSelected = answer.selectedAnswers || [];
        const correctAnswers = question.correctAnswers || [];
        isCorrect =
          userSelected.length === correctAnswers.length &&
          userSelected.every((ans) => correctAnswers.includes(ans));
        break;

      case 'fill_blank':
        const userText = (answer.fillBlankAnswer || '').toLowerCase().trim();
        const correctText = (question.correctAnswer || '').toLowerCase().trim();
        isCorrect = userText === correctText;
        break;

      case 'matching':
        const userPairs = answer.matchingPairs || [];
        const correctPairs = question.matchPairs || [];
        let correctMatches = 0;

        userPairs.forEach((userPair) => {
          const correctPair = correctPairs.find((cp) => cp.left === userPair.left);
          if (correctPair && correctPair.right === userPair.right) {
            correctMatches++;
          }
        });

        isCorrect = correctMatches === correctPairs.length;
        break;
    }

    // Calculate points and streak
    const newStreak = isCorrect ? currentStreak + 1 : 0;
    const streakBonus = isCorrect && newStreak > 1
      ? Math.floor(POINTS_PER_QUESTION * (STREAK_BONUS_PERCENT / 100) * (newStreak - 1))
      : 0;
    const pointsEarned = isCorrect ? POINTS_PER_QUESTION + streakBonus : 0;

    // Create complete answer
    const completeAnswer: PlayerAnswer = {
      ...answer,
      isCorrect,
      pointsEarned,
      streakBonus,
      answeredAt: Timestamp.fromDate(new Date())
    };

    // Update player document
    const playersRef = collection(db, 'multiplayerSessions', sessionId, 'players');
    const q = query(playersRef, where('uid', '==', playerId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const playerDoc = snapshot.docs[0];
      const playerData = playerDoc.data() as SessionPlayer;

      await updateDoc(playerDoc.ref, {
        status: 'answered',
        score: playerData.score + pointsEarned,
        streak: newStreak,
        answers: [...playerData.answers, completeAnswer],
        lastActive: serverTimestamp(),
      });
    }

    // Update session last activity
    await updateDoc(doc(db, 'multiplayerSessions', sessionId), {
      lastActivity: serverTimestamp(),
    });

    // Check if all players have answered and move to next question
    await checkAndMoveToNextQuestion(sessionId);

    return { isCorrect, pointsEarned, newStreak };
  } catch (error) {
    console.error('Error submitting answer:', error);
    throw error;
  }
};

/**
 * Check if all players have answered and move to next question
 * Call this after each player submits an answer
 */
export const checkAndMoveToNextQuestion = async (sessionId: string): Promise<void> => {
  try {
    const sessionDoc = await getDoc(doc(db, 'multiplayerSessions', sessionId));
    
    if (!sessionDoc.exists()) {
      return;
    }
    
    const sessionData = sessionDoc.data() as MultiplayerSession;
    
    // Don't proceed if quiz is completed or not in progress
    if (sessionData.status !== 'in_progress') {
      return;
    }
    
    const playersSnapshot = await getDocs(
      collection(db, 'multiplayerSessions', sessionId, 'players')
    );
    
    // Count how many ACTIVE players have answered the current question
    let answeredCount = 0;
    let totalActivePlayers = 0;
    
    playersSnapshot.docs.forEach((playerDoc) => {
      const player = playerDoc.data() as SessionPlayer;
      
      // Only count players who are NOT disconnected
      if (player.status !== 'disconnected') {
        totalActivePlayers++;
        
        const hasAnswered = player.answers.some(
          (answer) => answer.questionIndex === sessionData.currentQuestionIndex
        );
        
        if (hasAnswered || player.status === 'answered') {
          answeredCount++;
        }
      }
    });
    
    console.log(`Question ${sessionData.currentQuestionIndex}: ${answeredCount}/${totalActivePlayers} players answered`);
    
    // If all active players have answered OR no active players remain, move to next question
    if (totalActivePlayers === 0 || (totalActivePlayers > 0 && answeredCount >= totalActivePlayers)) {
      console.log('All players answered or no active players, moving to next question...');
      await moveToNextQuestion(sessionId);
    }
  } catch (error) {
    console.error('Error checking if ready to move:', error);
  }
};

/**
 * Move to next question (with race condition protection)
 */
export const moveToNextQuestion = async (sessionId: string): Promise<void> => {
  try {
    const sessionRef = doc(db, 'multiplayerSessions', sessionId);
    
    await runTransaction(db, async (transaction) => {
      const sessionDoc = await transaction.get(sessionRef);
      
      if (!sessionDoc.exists()) {
        throw new Error('Session not found');
      }
      
      const sessionData = sessionDoc.data() as MultiplayerSession;
      
      // Check if all ACTIVE players have answered the current question
      const playersSnapshot = await getDocs(
        collection(db, 'multiplayerSessions', sessionId, 'players')
      );
      
      const allAnswered = playersSnapshot.docs.every((playerDoc) => {
        const player = playerDoc.data() as SessionPlayer;
        // Ignore disconnected players completely
        if (player.status === 'disconnected') return true;
        
        return player.answers.some(
          (answer) => answer.questionIndex === sessionData.currentQuestionIndex
        );
      });
      
      if (!allAnswered) {
        // Not all active players answered yet, don't move
        console.log('Not all active players answered, waiting...');
        return;
      }
      
      const nextIndex = sessionData.currentQuestionIndex + 1;
      
      if (nextIndex >= sessionData.totalQuestions) {
        // Quiz completed
        transaction.update(sessionRef, {
          status: 'completed',
          completedAt: serverTimestamp(),
          lastActivity: serverTimestamp(),
        });
      } else {
        // Move to next question
        transaction.update(sessionRef, {
          currentQuestionIndex: nextIndex,
          lastActivity: serverTimestamp(),
        });
      }
    });
    
    // After successful transaction, reset ONLY ACTIVE player statuses
    // CRITICAL: Preserve disconnected status!
    const sessionDoc = await getDoc(sessionRef);
    const sessionData = sessionDoc.data() as MultiplayerSession;
    
    if (sessionData.status !== 'completed') {
      const playersSnapshot = await getDocs(
        collection(db, 'multiplayerSessions', sessionId, 'players')
      );
      
      const batch = writeBatch(db);
      playersSnapshot.docs.forEach((playerDoc) => {
        const player = playerDoc.data() as SessionPlayer;
        
        // Only reset status for players who are NOT disconnected
        if (player.status !== 'disconnected') {
          batch.update(playerDoc.ref, {
            status: 'connected',
            currentQuestionIndex: sessionData.currentQuestionIndex,
          });
        }
        // Disconnected players keep their 'disconnected' status
      });
      await batch.commit();
    }
  } catch (error) {
    console.error('Error moving to next question:', error);
    throw error;
  }
};

/**
 * Get current leaderboard
 */
export const getLeaderboard = async (sessionId: string): Promise<LeaderboardEntry[]> => {
  try {
    const playersSnapshot = await getDocs(
      collection(db, 'multiplayerSessions', sessionId, 'players')
    );

    const leaderboard: LeaderboardEntry[] = playersSnapshot.docs.map((doc) => {
      const player = doc.data() as SessionPlayer;
      const correctAnswers = player.answers.filter((a) => a.isCorrect).length;

      return {
        uid: player.uid,
        displayName: player.displayName,
        avatarId: player.avatarId,
        score: player.score,
        streak: player.streak,
        correctAnswers,
        rank: 0,
      };
    });

    // Sort by score (descending) and assign ranks
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return leaderboard;
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    throw error;
  }
};

/**
 * Listen to session updates
 */
export const listenToSession = (
  sessionId: string,
  callback: (session: MultiplayerSession | null) => void
): Unsubscribe => {
  return onSnapshot(doc(db, 'multiplayerSessions', sessionId), (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() } as MultiplayerSession);
    } else {
      callback(null);
    }
  });
};

/**
 * Listen to players in session
 */
export const listenToPlayers = (
  sessionId: string,
  callback: (players: SessionPlayer[]) => void
): Unsubscribe => {
  const q = query(collection(db, 'multiplayerSessions', sessionId, 'players'));

  return onSnapshot(q, (snapshot) => {
    const players = snapshot.docs.map((doc) => ({
      ...doc.data(),
    })) as SessionPlayer[];
    callback(players);
  });
};

/**
 * Update player last active timestamp (for disconnection detection)
 */
export const updatePlayerActivity = async (
  sessionId: string,
  playerId: string
): Promise<void> => {
  try {
    const playersRef = collection(db, 'multiplayerSessions', sessionId, 'players');
    const q = query(playersRef, where('uid', '==', playerId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      await updateDoc(snapshot.docs[0].ref, {
        lastActive: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error updating player activity:', error);
  }
};

/**
 * Leave session
 */
export const leaveSession = async (
  sessionId: string,
  playerId: string
): Promise<void> => {
  try {
    const playersRef = collection(db, 'multiplayerSessions', sessionId, 'players');
    const q = query(playersRef, where('uid', '==', playerId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const playerDoc = snapshot.docs[0];
      await updateDoc(playerDoc.ref, {
        status: 'disconnected',
        lastActive: serverTimestamp(),
      });
    }

    // Check if all remaining players have answered (important!)
    const sessionDoc = await getDoc(doc(db, 'multiplayerSessions', sessionId));
    if (sessionDoc.exists()) {
      const sessionData = sessionDoc.data() as MultiplayerSession;
      
      if (sessionData.status === 'in_progress') {
        // Trigger check to see if we can move to next question
        await checkAndMoveToNextQuestion(sessionId);
      }
    }

    // Check if all players disconnected
    const allPlayersSnapshot = await getDocs(playersRef);
    const allDisconnected = allPlayersSnapshot.docs.every(
      (doc) => doc.data().status === 'disconnected'
    );

    if (allDisconnected) {
      // Mark session as abandoned
      await updateDoc(doc(db, 'multiplayerSessions', sessionId), {
        status: 'abandoned',
        lastActivity: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error leaving session:', error);
    throw error;
  }
};

/**
 * Find active session for user (for reconnection)
 */
export const findActiveSessionForUser = async (
  userId: string
): Promise<string | null> => {
  try {
    // Search all active sessions
    const sessionsQuery = query(
      collection(db, 'multiplayerSessions'),
      where('status', 'in', ['waiting', 'starting', 'in_progress'])
    );
    const sessionsSnapshot = await getDocs(sessionsQuery);

    for (const sessionDoc of sessionsSnapshot.docs) {
      const playersSnapshot = await getDocs(
        collection(db, 'multiplayerSessions', sessionDoc.id, 'players')
      );

      const userPlayer = playersSnapshot.docs.find(
        (doc) => doc.data().uid === userId
      );

      if (userPlayer) {
        return sessionDoc.id;
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding active session:', error);
    return null;
  }
};

/**
 * Clean up expired sessions (call periodically or on app start)
 */
export const cleanupExpiredSessions = async (): Promise<void> => {
  try {
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() - SESSION_EXPIRY_HOURS);

    const q = query(
      collection(db, 'multiplayerSessions'),
      where('lastActivity', '<', Timestamp.fromDate(expiryTime))
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
  }
};

// Power-ups functions (optional)
export const getUserPowerUps = async (userId: string): Promise<PowerUp[]> => {
  try {
    const q = query(
      collection(db, 'powerUps'),
      where('userId', '==', userId),
      where('quantity', '>', 0)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PowerUp[];
  } catch (error) {
    console.error('Error getting power-ups:', error);
    return [];
  }
};

export const usePowerUp = async (
  powerUpId: string,
  userId: string
): Promise<boolean> => {
  try {
    const powerUpDoc = await getDoc(doc(db, 'powerUps', powerUpId));

    if (!powerUpDoc.exists()) {
      throw new Error('Power-up not found');
    }

    const powerUpData = powerUpDoc.data() as PowerUp;

    if (powerUpData.userId !== userId || powerUpData.quantity <= 0) {
      throw new Error('Invalid power-up usage');
    }

    await updateDoc(doc(db, 'powerUps', powerUpId), {
      quantity: powerUpData.quantity - 1,
    });

    return true;
  } catch (error) {
    console.error('Error using power-up:', error);
    return false;
  }
};