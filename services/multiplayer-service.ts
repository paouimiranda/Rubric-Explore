// services/multiplayer-service.ts - FIXED DISCONNECT HANDLING
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
  status: 'connected' | 'disconnected' | 'ready' | 'answered' | 'kicked';
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
const STREAK_BONUS_PERCENT = 10;
const SESSION_CODE_LENGTH = 6;
const SESSION_EXPIRY_HOURS = 1;
const INACTIVITY_THRESHOLD_SECONDS = 20; // Kick after 20 seconds of no heartbeat

const generateSessionCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < SESSION_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const isSessionCodeUnique = async (code: string): Promise<boolean> => {
  const q = query(
    collection(db, 'multiplayerSessions'),
    where('sessionCode', '==', code),
    where('status', 'in', ['waiting', 'starting', 'in_progress'])
  );
  const snapshot = await getDocs(q);
  return snapshot.empty;
};

export const createMultiplayerSession = async (
  quiz: Quiz,
  creatorId: string,
  creatorName: string
): Promise<{ sessionId: string; sessionCode: string }> => {
  try {
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

export const joinSessionByCode = async (
  sessionCode: string,
  userId: string,
  displayName: string,
  avatarId?: number
): Promise<string> => {
  try {
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

    const playersSnapshot = await getDocs(
      collection(db, 'multiplayerSessions', sessionId, 'players')
    );
    const existingPlayer = playersSnapshot.docs.find(
      (doc) => doc.data().uid === userId
    );

    if (existingPlayer) {
      await updateDoc(existingPlayer.ref, {
        status: 'connected',
        lastActive: serverTimestamp(),
      });
      return sessionId;
    }

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

    await updateDoc(doc(db, 'multiplayerSessions', sessionId), {
      lastActivity: serverTimestamp(),
    });

    return sessionId;
  } catch (error) {
    console.error('Error joining session:', error);
    throw error;
  }
};

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

    // Update player document using transaction
    await runTransaction(db, async (transaction) => {
      const playersRef = collection(db, 'multiplayerSessions', sessionId, 'players');
      const q = query(playersRef, where('uid', '==', playerId));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const playerDoc = snapshot.docs[0];
        const playerData = playerDoc.data() as SessionPlayer;

        // Verify not kicked
        if (playerData.status === 'kicked') {
          throw new Error('Player has been kicked for inactivity');
        }

        // Verify this answer is for the current question
        const alreadyAnswered = playerData.answers.some(
          a => a.questionIndex === answer.questionIndex
        );

        if (!alreadyAnswered) {
          transaction.update(playerDoc.ref, {
            status: 'answered',
            score: playerData.score + pointsEarned,
            streak: newStreak,
            answers: [...playerData.answers, completeAnswer],
            currentQuestionIndex: answer.questionIndex,
            lastActive: serverTimestamp(),
          });
        }
      }

      // Update session last activity
      const sessionRef = doc(db, 'multiplayerSessions', sessionId);
      transaction.update(sessionRef, {
        lastActivity: serverTimestamp(),
      });
    });

    return { isCorrect, pointsEarned, newStreak };
  } catch (error) {
    console.error('Error submitting answer:', error);
    throw error;
  }
};

/**
 * Check if all ACTIVE (non-kicked) players have answered
 */
export const checkIfAllAnswered = async (sessionId: string): Promise<boolean> => {
  try {
    const sessionDoc = await getDoc(doc(db, 'multiplayerSessions', sessionId));
    
    if (!sessionDoc.exists()) {
      return false;
    }
    
    const sessionData = sessionDoc.data() as MultiplayerSession;
    
    if (sessionData.status !== 'in_progress') {
      return false;
    }
    
    const playersSnapshot = await getDocs(
      collection(db, 'multiplayerSessions', sessionId, 'players')
    );
    
    // Only count players who are NOT kicked or disconnected
    const activePlayers = playersSnapshot.docs.filter(doc => {
      const status = (doc.data() as SessionPlayer).status;
      return status !== 'disconnected' && status !== 'kicked';
    });

    if (activePlayers.length === 0) {
      return true; // No active players = can progress
    }
    
    const allAnswered = activePlayers.every(playerDoc => {
      const player = playerDoc.data() as SessionPlayer;
      return player.answers.some(
        answer => answer.questionIndex === sessionData.currentQuestionIndex
      );
    });
    
    console.log(`Question ${sessionData.currentQuestionIndex}: ${allAnswered ? 'All' : 'Not all'} active players answered (${activePlayers.length} active)`);
    
    return allAnswered;
  } catch (error) {
    console.error('Error checking if all answered:', error);
    return false;
  }
};

/**
 * Move to next question
 */
export const moveToNextQuestion = async (sessionId: string): Promise<void> => {
  try {
    const sessionRef = doc(db, 'multiplayerSessions', sessionId);
    
    const sessionDoc = await getDoc(sessionRef);
    if (!sessionDoc.exists()) {
      throw new Error('Session not found');
    }
    
    const sessionData = sessionDoc.data() as MultiplayerSession;
    const currentIndex = sessionData.currentQuestionIndex;
    
    console.log(`[moveToNextQuestion] Current question index: ${currentIndex}`);
    
    // Get all active players
    const playersSnapshot = await getDocs(
      collection(db, 'multiplayerSessions', sessionId, 'players')
    );
    
    const activePlayers = playersSnapshot.docs.filter(doc => {
      const status = (doc.data() as SessionPlayer).status;
      return status !== 'disconnected' && status !== 'kicked';
    });
    
    console.log(`[moveToNextQuestion] Active players: ${activePlayers.length}`);
    
    if (activePlayers.length > 0) {
      const allAnswered = activePlayers.every(playerDoc => {
        const player = playerDoc.data() as SessionPlayer;
        return player.answers.some(
          answer => answer.questionIndex === currentIndex
        );
      });
      
      if (!allAnswered) {
        console.log('[moveToNextQuestion] Not all active players answered yet - ABORTING');
        return;
      }
    }
    
    // Use transaction to update question index
    await runTransaction(db, async (transaction) => {
      const freshSessionDoc = await transaction.get(sessionRef);
      
      if (!freshSessionDoc.exists()) {
        throw new Error('Session not found');
      }
      
      const freshSessionData = freshSessionDoc.data() as MultiplayerSession;
      
      // Race condition protection
      if (freshSessionData.currentQuestionIndex !== currentIndex) {
        console.log(`[moveToNextQuestion] Question index changed (${currentIndex} -> ${freshSessionData.currentQuestionIndex}). Aborting.`);
        return;
      }
      
      const nextIndex = currentIndex + 1;
      
      if (nextIndex >= sessionData.totalQuestions) {
        transaction.update(sessionRef, {
          status: 'completed',
          completedAt: serverTimestamp(),
          lastActivity: serverTimestamp(),
        });
        console.log('[moveToNextQuestion] Quiz completed');
      } else {
        transaction.update(sessionRef, {
          currentQuestionIndex: nextIndex,
          lastActivity: serverTimestamp(),
        });
        console.log(`[moveToNextQuestion] Successfully moved to question ${nextIndex}`);
      }
    });
    
    // Reset player statuses for next question
    const updatedSessionDoc = await getDoc(sessionRef);
    const updatedSessionData = updatedSessionDoc.data() as MultiplayerSession;
    
    if (updatedSessionData.status !== 'completed') {
      const playersSnapshot = await getDocs(
        collection(db, 'multiplayerSessions', sessionId, 'players')
      );
      
      const batch = writeBatch(db);
      playersSnapshot.docs.forEach((playerDoc) => {
        const player = playerDoc.data() as SessionPlayer;
        
        // Only reset status for ACTIVE players (not kicked or disconnected)
        if (player.status !== 'disconnected' && player.status !== 'kicked') {
          batch.update(playerDoc.ref, {
            status: 'connected',
            currentQuestionIndex: updatedSessionData.currentQuestionIndex,
          });
        }
      });
      await batch.commit();
      console.log('[moveToNextQuestion] Player statuses reset for new question');
    }
  } catch (error) {
    console.error('[moveToNextQuestion] Error:', error);
    throw error;
  }
};

export const getLeaderboard = async (sessionId: string): Promise<LeaderboardEntry[]> => {
  try {
    const playersSnapshot = await getDocs(
      collection(db, 'multiplayerSessions', sessionId, 'players')
    );

    const leaderboard: LeaderboardEntry[] = playersSnapshot.docs
      .filter(doc => (doc.data() as SessionPlayer).status !== 'kicked') // Exclude kicked players
      .map((doc) => {
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
 * IMPROVED: Activity heartbeat that updates lastActive timestamp
 * This is the ONLY way players should update their activity
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
      const playerDoc = snapshot.docs[0];
      const player = playerDoc.data() as SessionPlayer;
      
      // Don't update if player is already kicked
      if (player.status === 'kicked') {
        console.log(`[updatePlayerActivity] Player ${playerId} is kicked, not updating`);
        return;
      }
      
      await updateDoc(playerDoc.ref, {
        lastActive: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error updating player activity:', error);
  }
};

/**
 * IMPROVED: Kick inactive players (mark as 'kicked' instead of 'disconnected')
 * This runs periodically and kicks anyone who hasn't sent a heartbeat
 */
export const kickInactivePlayers = async (
  sessionId: string,
  thresholdSeconds: number = INACTIVITY_THRESHOLD_SECONDS
): Promise<string[]> => {
  try {
    const playersSnapshot = await getDocs(
      collection(db, 'multiplayerSessions', sessionId, 'players')
    );

    const now = Timestamp.now();
    const thresholdTime = new Timestamp(
      now.seconds - thresholdSeconds,
      now.nanoseconds
    );

    const batch = writeBatch(db);
    const kickedPlayerIds: string[] = [];

    playersSnapshot.docs.forEach((playerDoc) => {
      const player = playerDoc.data() as SessionPlayer;

      // Only check players who are currently active (not already kicked/disconnected)
      if (player.status !== 'kicked' && player.status !== 'disconnected') {
        if (player.lastActive.seconds < thresholdTime.seconds) {
          console.log(`[kickInactivePlayers] Kicking player ${player.displayName} (${player.uid}) for inactivity`);
          console.log(`  Last active: ${new Date(player.lastActive.seconds * 1000).toISOString()}`);
          console.log(`  Threshold: ${new Date(thresholdTime.seconds * 1000).toISOString()}`);
          
          batch.update(playerDoc.ref, {
            status: 'kicked',
          });
          kickedPlayerIds.push(player.uid);
        }
      }
    });

    if (kickedPlayerIds.length > 0) {
      await batch.commit();
      console.log(`[kickInactivePlayers] Kicked ${kickedPlayerIds.length} players`);
    }
    
    return kickedPlayerIds;
  } catch (error) {
    console.error('Error kicking inactive players:', error);
    return [];
  }
};

/**
 * Check if a specific player has been kicked
 */
export const isPlayerKicked = async (
  sessionId: string,
  playerId: string
): Promise<boolean> => {
  try {
    const playersRef = collection(db, 'multiplayerSessions', sessionId, 'players');
    const q = query(playersRef, where('uid', '==', playerId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const player = snapshot.docs[0].data() as SessionPlayer;
      return player.status === 'kicked';
    }
    
    return false;
  } catch (error) {
    console.error('Error checking if player is kicked:', error);
    return false;
  }
};

/**
 * Leave session voluntarily
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
      console.log(`Player ${playerId} marked as disconnected`);
    }

    // Check if all players left
    const allPlayersSnapshot = await getDocs(playersRef);
    const allGone = allPlayersSnapshot.docs.every(doc => {
      const status = (doc.data() as SessionPlayer).status;
      return status === 'disconnected' || status === 'kicked';
    });

    if (allGone) {
      await updateDoc(doc(db, 'multiplayerSessions', sessionId), {
        status: 'abandoned',
        lastActivity: serverTimestamp(),
      });
      console.log('All players gone, session marked as abandoned');
    }
  } catch (error) {
    console.error('Error leaving session:', error);
    throw error;
  }
};

export const findActiveSessionForUser = async (
  userId: string
): Promise<string | null> => {
  try {
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