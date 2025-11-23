// services/user-stats-service.ts - Calculate user statistics on-the-fly

import { countPublicContent, getNotebooks, getNotes } from './notes-service';
import { QuizService } from './quiz-service';

export interface UserStats {
  totalQuizzesCreated: number;
  totalNotesCreated: number;
  totalNotebooksCreated: number;
  publicQuizzes: number;
  publicNotes: number;
  publicNotebooks: number;
  quizzesTaken: number;
  averageQuizScore: number;
  bestQuizScore: number;
  totalQuizAttempts: number;
}

/**
 * Calculate comprehensive user statistics for ANY user
 */
export async function getUserStats(uid: string): Promise<UserStats> {
  try {
    // Fetch all data in parallel using the new methods that accept uid
    const [
      allQuizzes,
      allNotes,
      allNotebooks,
      publicContent,
      quizAttempts,
    ] = await Promise.all([
      QuizService.getAllQuizzesForUser(uid), // NEW: Gets specified user's quizzes
      getNotes(uid),
      getNotebooks(uid),
      countPublicContent(uid),
      QuizService.getQuizAttemptsForUser(uid), // NEW: Gets specified user's attempts
    ]);

    // Calculate quiz statistics
    const publicQuizzes = allQuizzes.filter(q => q.isPublic).length;
    const totalAttempts = quizAttempts.length;
    
    let averageScore = 0;
    let bestScore = 0;
    
    if (totalAttempts > 0) {
      const scores = quizAttempts.map(a => a.percentage);
      averageScore = scores.reduce((sum, score) => sum + score, 0) / totalAttempts;
      bestScore = Math.max(...scores);
    }

    return {
      totalQuizzesCreated: allQuizzes.length,
      totalNotesCreated: allNotes.length,
      totalNotebooksCreated: allNotebooks.length,
      publicQuizzes,
      publicNotes: publicContent.publicNotes,
      publicNotebooks: publicContent.publicNotebooks || 0,
      quizzesTaken: totalAttempts,
      averageQuizScore: Math.round(averageScore),
      bestQuizScore: Math.round(bestScore),
      totalQuizAttempts: totalAttempts,
    };
  } catch (error) {
    console.error('Error calculating user stats:', error);
    // Return default stats on error
    return {
      totalQuizzesCreated: 0,
      totalNotesCreated: 0,
      totalNotebooksCreated: 0,
      publicQuizzes: 0,
      publicNotes: 0,
      publicNotebooks: 0,
      quizzesTaken: 0,
      averageQuizScore: 0,
      bestQuizScore: 0,
      totalQuizAttempts: 0,
    };
  }
}

/**
 * Get stats for another user's profile (public content only)
 * DEPRECATED: Use getUserStats() instead which now works for any user
 */
export async function getPublicUserStats(uid: string): Promise<{
  publicQuizzes: number;
  publicNotes: number;
  publicNotebooks: number;
  memberSince: Date | null;
}> {
  try {
    const [
      publicQuizCount,
      publicContent,
      userDoc
    ] = await Promise.all([
      QuizService.countPublicQuizzes(uid),
      countPublicContent(uid),
      getUserCreationDate(uid),
    ]);

    return {
      publicQuizzes: publicQuizCount,
      publicNotes: publicContent.publicNotes,
      publicNotebooks: publicContent.publicNotebooks || 0,
      memberSince: userDoc,
    };
  } catch (error) {
    console.error('Error fetching public user stats:', error);
    return {
      publicQuizzes: 0,
      publicNotes: 0,
      publicNotebooks: 0,
      memberSince: null,
    };
  }
}

/**
 * Helper to get user creation date
 */
async function getUserCreationDate(uid: string): Promise<Date | null> {
  try {
    const { db } = await import('../firebase');
    const { doc, getDoc } = await import('firebase/firestore');
    
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      return data.createdAt?.toDate ? data.createdAt.toDate() : null;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching user creation date:', error);
    return null;
  }
}