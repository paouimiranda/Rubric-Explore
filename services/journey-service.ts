// File: services/journey-service.ts
import {
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    Timestamp,
    updateDoc,
    where,
} from 'firebase/firestore';
import { auth, db } from '../firebase';

// ============================================
// INTERFACES
// ============================================

export interface JourneyQuestion {
  id: string;
  type: 'multiple_choice' | 'fill_blank' | 'matching';
  question: string;
  image?: string;
  options: string[];
  correctAnswers: number[];
  correctAnswer: string;
  matchPairs: { left: string; right: string }[];
  timeLimit: number;
  topic: string;
  points?: number;
}

export interface JourneyQuiz {
  id: string;
  title: string;
  description?: string;
  questions: JourneyQuestion[];
  totalPoints: number;
  estimatedTime: number; // in seconds
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Level {
  id: number;
  title: string;
  description: string;
  quizId: string; // Reference to journeyQuizzes collection
  unlocked: boolean;
  completed: boolean;
  stars: number; // 0-3
  gradient: [string, string];
  requiredLevel?: number; // Player level requirement (optional)
  shardsReward: number; // Shards earned per star
  xpReward: number; // XP earned on completion
  
}

export interface UserProgress {
  userId: string;
  currentLevel: number; // Highest unlocked level
  completedLevels: number[]; // Array of completed level IDs
  levelStars: { [levelId: number]: number }; // Stars earned per level
  totalStars: number;
  lastPlayedAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface UserStats {
  userId: string;
  shards: number;
  energy: {
    current: number;
    max: number;
    lastRefillTime: Timestamp;
  };
  experience: {
    current: number;
    currentLevel: number;
    totalXP: number;
  };
  lifetimeStats: {
    totalQuizzesTaken: number;
    totalStarsEarned: number;
    totalShardsEarned: number;
    perfectScores: number; // 100% scores
  };
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface LevelAttempt {
  id?: string;
  userId: string;
  levelId: number;
  quizId: string;
  score: number;
  percentage: number;
  stars: number;
  passed: boolean;
  energyCost: number;
  shardsEarned: number;
  xpEarned: number;
  timeSpent: number;
  attemptedAt: Timestamp;
}

export interface DailyReward {
  userId: string;
  lastClaimedDate: string; // Format: YYYY-MM-DD
  currentStreak: number;
  longestStreak: number;
  totalRewardsClaimed: number;
}

// ============================================
// CONSTANTS
// ============================================

const COLLECTIONS = {
  LEVELS: 'journeyLevels',
  JOURNEY_QUIZZES: 'journeyQuizzes', // NEW: Separate collection for journey quizzes
  USER_PROGRESS: 'userProgress',
  USER_STATS: 'userStats',
  LEVEL_ATTEMPTS: 'levelAttempts',
  DAILY_REWARDS: 'dailyRewards',
};

// XP formula: xpToNextLevel = currentLevel * 100 + 500
const calculateXPForLevel = (level: number): number => {
  return level * 100 + 500;
};

// Calculate total XP needed to reach a level
const calculateTotalXPForLevel = (level: number): number => {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += calculateXPForLevel(i);
  }
  return total;
};

// Star thresholds based on percentage
const getStarsFromPercentage = (percentage: number): number => {
  if (percentage >= 90) return 3;
  if (percentage >= 70) return 2;
  if (percentage >= 50) return 1;
  return 0;
};

// ============================================
// SERVICE CLASS
// ============================================

export class JourneyService {
  /**
   * Get current user ID
   */
  private static getCurrentUserId(): string {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated.');
    }
    return user.uid;
  }

  // ============================================
  // JOURNEY QUIZ MANAGEMENT (ADMIN FUNCTIONS)
  // ============================================

  /**
   * Initialize a journey quiz (Admin function)
   * Call this to create pre-made quizzes for journey levels
   */
  static async createJourneyQuiz(quiz: Omit<JourneyQuiz, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const quizDoc = doc(collection(db, COLLECTIONS.JOURNEY_QUIZZES));
      const quizId = quizDoc.id;
      
      await setDoc(quizDoc, {
        ...quiz,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      console.log('Journey quiz created:', quizId);
      return quizId;
    } catch (error) {
      console.error('Error creating journey quiz:', error);
      throw error;
    }
  }

  /**
   * Get a journey quiz by ID (Public - no auth required for reading)
   */
  static async getJourneyQuiz(quizId: string): Promise<JourneyQuiz | null> {
    try {
      const quizDoc = await getDoc(doc(db, COLLECTIONS.JOURNEY_QUIZZES, quizId));
      
      if (!quizDoc.exists()) {
        console.error('Journey quiz not found:', quizId);
        return null;
      }
      
      return {
        id: quizDoc.id,
        ...quizDoc.data(),
      } as JourneyQuiz;
    } catch (error) {
      console.error('Error fetching journey quiz:', error);
      throw error;
    }
  }

  /**
   * Update a journey quiz (Admin function)
   */
  static async updateJourneyQuiz(
    quizId: string, 
    updates: Partial<Omit<JourneyQuiz, 'id' | 'createdAt'>>
  ): Promise<void> {
    try {
      await updateDoc(doc(db, COLLECTIONS.JOURNEY_QUIZZES, quizId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      console.log('Journey quiz updated:', quizId);
    } catch (error) {
      console.error('Error updating journey quiz:', error);
      throw error;
    }
  }

  /**
   * Get all journey quizzes (Admin function)
   */
  static async getAllJourneyQuizzes(): Promise<JourneyQuiz[]> {
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.JOURNEY_QUIZZES));
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as JourneyQuiz[];
    } catch (error) {
      console.error('Error fetching all journey quizzes:', error);
      throw error;
    }
  }

  // ============================================
  // LEVEL MANAGEMENT
  // ============================================

  /**
   * Initialize default levels in Firestore (Admin function)
   * Call this once to populate the levels collection
   */
  static async initializeLevels(levels: Omit<Level, 'unlocked' | 'completed' | 'stars'>[]): Promise<void> {
    try {
      const batch = [];
      for (const level of levels) {
        const levelDoc = doc(db, COLLECTIONS.LEVELS, level.id.toString());
        batch.push(setDoc(levelDoc, {
          ...level,
          createdAt: serverTimestamp(),
        }));
      }
      await Promise.all(batch);
      console.log('Levels initialized successfully');
    } catch (error) {
      console.error('Error initializing levels:', error);
      throw error;
    }
  }

  /**
   * Get all levels with user progress overlay
   */
  static async getAllLevels(): Promise<Level[]> {
    try {
      const userId = this.getCurrentUserId();
      
      // Fetch all levels
      const levelsSnapshot = await getDocs(
        query(collection(db, COLLECTIONS.LEVELS), orderBy('id', 'asc'))
      );
      
      // Fetch user progress
      const userProgress = await this.getUserProgress();
      
      // Merge level data with user progress
      const levels: Level[] = levelsSnapshot.docs.map(doc => {
        const levelData = doc.data();
        const levelId = parseInt(doc.id);
        
        return {
          id: levelId,
          title: levelData.title,
          description: levelData.description,
          quizId: levelData.quizId,
          gradient: levelData.gradient,
          requiredLevel: levelData.requiredLevel,
          shardsReward: levelData.shardsReward,
          xpReward: levelData.xpReward,
          // User-specific data
          unlocked: levelId <= userProgress.currentLevel,
          completed: userProgress.completedLevels.includes(levelId),
          stars: userProgress.levelStars[levelId] || 0,
        };
      });
      
      return levels;
    } catch (error) {
      console.error('Error fetching levels:', error);
      throw error;
    }
  }

  /**
   * Get a specific level by ID
   */
  static async getLevelById(levelId: number): Promise<Level | null> {
    try {
      const userId = this.getCurrentUserId();
      const levelDoc = await getDoc(doc(db, COLLECTIONS.LEVELS, levelId.toString()));
      
      if (!levelDoc.exists()) {
        return null;
      }
      
      const levelData = levelDoc.data();
      const userProgress = await this.getUserProgress();
      
      return {
        id: levelId,
        title: levelData.title,
        description: levelData.description,
        quizId: levelData.quizId,
        gradient: levelData.gradient,
        requiredLevel: levelData.requiredLevel,
        shardsReward: levelData.shardsReward,
        xpReward: levelData.xpReward,
        unlocked: levelId <= userProgress.currentLevel,
        completed: userProgress.completedLevels.includes(levelId),
        stars: userProgress.levelStars[levelId] || 0,
      };
    } catch (error) {
      console.error('Error fetching level:', error);
      throw error;
    }
  }

  // ============================================
  // USER PROGRESS
  // ============================================

  /**
   * Initialize user progress (call on first app launch)
   */
  static async initializeUserProgress(): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      const progressDoc = doc(db, COLLECTIONS.USER_PROGRESS, userId);
      const progressSnap = await getDoc(progressDoc);
      
      if (!progressSnap.exists()) {
        const initialProgress: UserProgress = {
          userId,
          currentLevel: 1, // Start with level 1 unlocked
          completedLevels: [],
          levelStars: {},
          totalStars: 0,
          lastPlayedAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        
        await setDoc(progressDoc, initialProgress);
      }
    } catch (error) {
      console.error('Error initializing user progress:', error);
      throw error;
    }
  }

  /**
   * Get user progress
   */
  static async getUserProgress(): Promise<UserProgress> {
    try {
      const userId = this.getCurrentUserId();
      const progressDoc = await getDoc(doc(db, COLLECTIONS.USER_PROGRESS, userId));
      
      if (!progressDoc.exists()) {
        // Initialize if doesn't exist
        await this.initializeUserProgress();
        const newDoc = await getDoc(doc(db, COLLECTIONS.USER_PROGRESS, userId));
        return newDoc.data() as UserProgress;
      }
      
      return progressDoc.data() as UserProgress;
    } catch (error) {
      console.error('Error fetching user progress:', error);
      throw error;
    }
  }

  // ============================================
  // USER STATS
  // ============================================

  /**
   * Initialize user stats (call on first app launch)
   */
  static async initializeUserStats(): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      const statsDoc = doc(db, COLLECTIONS.USER_STATS, userId);
      const statsSnap = await getDoc(statsDoc);
      
      if (!statsSnap.exists()) {
        const initialStats: UserStats = {
          userId,
          shards: 0,
          energy: {
            current: 5,
            max: 5,
            lastRefillTime: Timestamp.now(),
          },
          experience: {
            current: 0,
            currentLevel: 1,
            totalXP: 0,
          },
          lifetimeStats: {
            totalQuizzesTaken: 0,
            totalStarsEarned: 0,
            totalShardsEarned: 0,
            perfectScores: 0,
          },
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        
        await setDoc(statsDoc, initialStats);
      }
    } catch (error) {
      console.error('Error initializing user stats:', error);
      throw error;
    }
  }

  /**
   * Get user stats with energy refill check
   */
  static async getUserStats(): Promise<UserStats> {
    try {
      const userId = this.getCurrentUserId();
      const statsDoc = doc(db, COLLECTIONS.USER_STATS, userId);
      const statsSnap = await getDoc(statsDoc);
      
      if (!statsSnap.exists()) {
        await this.initializeUserStats();
        const newDoc = await getDoc(statsDoc);
        return newDoc.data() as UserStats;
      }
      
      let stats = statsSnap.data() as UserStats;
      
      // Check if energy should refill (midnight reset)
      const now = new Date();
      const lastRefill = stats.energy.lastRefillTime.toDate();
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastRefillMidnight = new Date(lastRefill.getFullYear(), lastRefill.getMonth(), lastRefill.getDate());
      
      // If it's a new day, refill energy
      if (todayMidnight > lastRefillMidnight) {
        stats = await this.refillEnergy();
      }
      
      return stats;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw error;
    }
  }

  /**
   * Refill energy to max (called at midnight)
   */
  private static async refillEnergy(): Promise<UserStats> {
    try {
      const userId = this.getCurrentUserId();
      const statsDoc = doc(db, COLLECTIONS.USER_STATS, userId);
      
      await updateDoc(statsDoc, {
        'energy.current': 5,
        'energy.lastRefillTime': Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      
      const updatedDoc = await getDoc(statsDoc);
      return updatedDoc.data() as UserStats;
    } catch (error) {
      console.error('Error refilling energy:', error);
      throw error;
    }
  }

  /**
   * Consume energy (when player fails a level)
   */
  private static async consumeEnergy(amount: number = 1): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      const stats = await this.getUserStats();
      
      if (stats.energy.current < amount) {
        throw new Error('Not enough energy');
      }
      
      await updateDoc(doc(db, COLLECTIONS.USER_STATS, userId), {
        'energy.current': stats.energy.current - amount,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error consuming energy:', error);
      throw error;
    }
  }

  /**
   * Add shards to user account
   */
  private static async addShards(amount: number): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      const stats = await this.getUserStats();
      
      await updateDoc(doc(db, COLLECTIONS.USER_STATS, userId), {
        shards: stats.shards + amount,
        'lifetimeStats.totalShardsEarned': stats.lifetimeStats.totalShardsEarned + amount,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error adding shards:', error);
      throw error;
    }
  }

  /**
   * Add XP and handle level ups
   */
  private static async addXP(amount: number): Promise<{ leveledUp: boolean; newLevel?: number }> {
    try {
      const userId = this.getCurrentUserId();
      const stats = await this.getUserStats();
      
      const newTotalXP = stats.experience.totalXP + amount;
      let currentLevel = stats.experience.currentLevel;
      let leveledUp = false;
      
      // Check for level up
      while (newTotalXP >= calculateTotalXPForLevel(currentLevel + 1)) {
        currentLevel++;
        leveledUp = true;
      }
      
      const xpForCurrentLevel = calculateTotalXPForLevel(currentLevel);
      const currentXP = newTotalXP - xpForCurrentLevel;
      
      await updateDoc(doc(db, COLLECTIONS.USER_STATS, userId), {
        'experience.current': currentXP,
        'experience.currentLevel': currentLevel,
        'experience.totalXP': newTotalXP,
        updatedAt: Timestamp.now(),
      });
      
      return { leveledUp, newLevel: leveledUp ? currentLevel : undefined };
    } catch (error) {
      console.error('Error adding XP:', error);
      throw error;
    }
  }

  // ============================================
  // LEVEL COMPLETION
  // ============================================

  /**
   * Complete a level and update all related stats
   */
  static async completeLevel(
    levelId: number,
    quizScore: number,
    quizPercentage: number,
    timeSpent: number
  ): Promise<{
    passed: boolean;
    stars: number;
    shardsEarned: number;
    xpEarned: number;
    leveledUp: boolean;
    newPlayerLevel?: number;
    energyLost: number;
    isNewCompletion: boolean;
    improvedStars: boolean;
  }> {
    try {
      const userId = this.getCurrentUserId();
      
      // Get level data
      const level = await this.getLevelById(levelId);
      if (!level) {
        throw new Error('Level not found');
      }
      
      if (!level.unlocked) {
        throw new Error('Level is locked');
      }
      
      // Calculate stars
      const stars = getStarsFromPercentage(quizPercentage);
      const passed = stars > 0;
      
      // Get current progress
      const progress = await this.getUserProgress();
      const stats = await this.getUserStats();
      
      const previousStars = progress.levelStars[levelId] || 0;
      const isNewCompletion = !progress.completedLevels.includes(levelId);
      const improvedStars = stars > previousStars;
      
      let shardsEarned = 0;
      let xpEarned = 0;
      let energyLost = 0;
      
      // Handle failure
      if (!passed) {
        energyLost = 1;
        await this.consumeEnergy(1);
        
        // Save failed attempt
        await this.saveLevelAttempt({
          userId,
          levelId,
          quizId: level.quizId,
          score: quizScore,
          percentage: quizPercentage,
          stars: 0,
          passed: false,
          energyCost: 1,
          shardsEarned: 0,
          xpEarned: 0,
          timeSpent,
          attemptedAt: Timestamp.now(),
        });
        
        return {
          passed: false,
          stars: 0,
          shardsEarned: 0,
          xpEarned: 0,
          leveledUp: false,
          energyLost: 1,
          isNewCompletion: false,
          improvedStars: false,
        };
      }
      
      // Handle success
      if (isNewCompletion || improvedStars) {
        // Calculate rewards (only for new stars)
        const newStars = stars - previousStars;
        shardsEarned = newStars * level.shardsReward;
        
        // XP only on first completion
        if (isNewCompletion) {
          xpEarned = level.xpReward;
        }
        
        // Update progress
        const updatedCompletedLevels = isNewCompletion 
          ? [...progress.completedLevels, levelId]
          : progress.completedLevels;
        
        const updatedLevelStars = { ...progress.levelStars, [levelId]: stars };
        const totalStars = Object.values(updatedLevelStars).reduce((sum, s) => sum + s, 0);
        
        // Unlock next level if this was the current level
        const newCurrentLevel = levelId === progress.currentLevel 
          ? progress.currentLevel + 1 
          : progress.currentLevel;
        
        await updateDoc(doc(db, COLLECTIONS.USER_PROGRESS, userId), {
          currentLevel: newCurrentLevel,
          completedLevels: updatedCompletedLevels,
          levelStars: updatedLevelStars,
          totalStars,
          lastPlayedAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        
        // Add rewards
        if (shardsEarned > 0) {
          await this.addShards(shardsEarned);
        }
        
        // Add XP and check for level up
        let levelUpResult: { leveledUp: boolean; newLevel?: number } = { leveledUp: false };
        if (xpEarned > 0) {
          levelUpResult = await this.addXP(xpEarned);
        }
        
        // Update lifetime stats
        await updateDoc(doc(db, COLLECTIONS.USER_STATS, userId), {
          'lifetimeStats.totalQuizzesTaken': stats.lifetimeStats.totalQuizzesTaken + 1,
          'lifetimeStats.totalStarsEarned': stats.lifetimeStats.totalStarsEarned + newStars,
          'lifetimeStats.perfectScores': quizPercentage === 100 
            ? stats.lifetimeStats.perfectScores + 1 
            : stats.lifetimeStats.perfectScores,
          updatedAt: Timestamp.now(),
        });
        
        // Save successful attempt
        await this.saveLevelAttempt({
          userId,
          levelId,
          quizId: level.quizId,
          score: quizScore,
          percentage: quizPercentage,
          stars,
          passed: true,
          energyCost: 0,
          shardsEarned,
          xpEarned,
          timeSpent,
          attemptedAt: Timestamp.now(),
        });
        
        return {
          passed: true,
          stars,
          shardsEarned,
          xpEarned,
          leveledUp: levelUpResult.leveledUp,
          newPlayerLevel: levelUpResult.newLevel,
          energyLost: 0,
          isNewCompletion,
          improvedStars,
        };
      }
      
      // Replay with same or worse stars (no rewards)
      await this.saveLevelAttempt({
        userId,
        levelId,
        quizId: level.quizId,
        score: quizScore,
        percentage: quizPercentage,
        stars,
        passed: true,
        energyCost: 0,
        shardsEarned: 0,
        xpEarned: 0,
        timeSpent,
        attemptedAt: Timestamp.now(),
      });
      
      return {
        passed: true,
        stars,
        shardsEarned: 0,
        xpEarned: 0,
        leveledUp: false,
        energyLost: 0,
        isNewCompletion: false,
        improvedStars: false,
      };
    } catch (error) {
      console.error('Error completing level:', error);
      throw error;
    }
  }

  /**
   * Save level attempt to history
   */
  private static async saveLevelAttempt(attempt: LevelAttempt): Promise<void> {
    try {
      const attemptsRef = collection(db, COLLECTIONS.LEVEL_ATTEMPTS);
      await setDoc(doc(attemptsRef), attempt);
    } catch (error) {
      console.error('Error saving level attempt:', error);
      throw error;
    }
  }

  /**
   * Get level attempt history
   */
  static async getLevelAttempts(levelId?: number): Promise<LevelAttempt[]> {
    try {
      const userId = this.getCurrentUserId();
      
      let q;
      if (levelId) {
        q = query(
          collection(db, COLLECTIONS.LEVEL_ATTEMPTS),
          where('userId', '==', userId),
          where('levelId', '==', levelId),
          orderBy('attemptedAt', 'desc')
        );
      } else {
        q = query(
          collection(db, COLLECTIONS.LEVEL_ATTEMPTS),
          where('userId', '==', userId),
          orderBy('attemptedAt', 'desc'),
          limit(50)
        );
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LevelAttempt));
    } catch (error) {
      console.error('Error fetching level attempts:', error);
      return [];
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Check if user can attempt a level
   */
  static async canAttemptLevel(levelId: number): Promise<{ 
    canAttempt: boolean; 
    reason?: string;
  }> {
    try {
      const level = await this.getLevelById(levelId);
      const stats = await this.getUserStats();
      
      if (!level) {
        return { canAttempt: false, reason: 'Level not found' };
      }
      
      if (!level.unlocked) {
        return { canAttempt: false, reason: 'Level is locked' };
      }
      
      // Check if level is already completed with 3 stars
      if (level.stars === 3) {
        return { canAttempt: true }; // Can replay for practice
      }
      
      // Check energy only if attempting incomplete level
      if (stats.energy.current <= 0) {
        return { canAttempt: false, reason: 'Not enough energy' };
      }
      
      return { canAttempt: true };
    } catch (error) {
      console.error('Error checking level attempt:', error);
      return { canAttempt: false, reason: 'Error checking level' };
    }
  }

  /**
   * Get XP needed for next player level
   */
  static getXPForNextLevel(currentLevel: number): number {
    return calculateXPForLevel(currentLevel);
  }

  /**
   * Get XP progress percentage
   */
  static getXPProgress(currentXP: number, currentLevel: number): number {
    const xpNeeded = calculateXPForLevel(currentLevel);
    return (currentXP / xpNeeded) * 100;
  }
  /**
     * ADMIN METHODS - Use these for scripts/initialization
     * These bypass authentication checks
     */

    /**
     * Create journey quiz (Admin - no auth required)
     */
    static async createJourneyQuizAdmin(quiz: Omit<JourneyQuiz, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
        const quizDoc = doc(collection(db, COLLECTIONS.JOURNEY_QUIZZES));
        const quizId = quizDoc.id;
        
        await setDoc(quizDoc, {
        ...quiz,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        });
        
        console.log('✅ Journey quiz created:', quizId);
        return quizId;
    } catch (error) {
        console.error('❌ Error creating journey quiz:', error);
        throw error;
    }
    }

    /**
     * Initialize levels (Admin - no auth required)
     */
    static async initializeLevelsAdmin(levels: Omit<Level, 'unlocked' | 'completed' | 'stars'>[]): Promise<void> {
    try {
        console.log(`📝 Creating ${levels.length} levels...`);
        
        for (const level of levels) {
        const levelDoc = doc(db, COLLECTIONS.LEVELS, level.id.toString());
        await setDoc(levelDoc, {
            ...level,
            createdAt: serverTimestamp(),
        });
        console.log(`✅ Level ${level.id} created: ${level.title}`);
        }
        
        console.log('✅ All levels initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing levels:', error);
        throw error;
    }
    }

    /**
     * Get all journey quizzes (Admin - no auth required)
     */
    static async getAllJourneyQuizzesAdmin(): Promise<JourneyQuiz[]> {
    try {
        const snapshot = await getDocs(collection(db, COLLECTIONS.JOURNEY_QUIZZES));
        return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        })) as JourneyQuiz[];
    } catch (error) {
        console.error('❌ Error fetching all journey quizzes:', error);
        throw error;
    }
    }

    /**
     * Get all levels (Admin - no auth required)
     */
    static async getAllLevelsAdmin(): Promise<any[]> {
    try {
        const levelsSnapshot = await getDocs(
        query(collection(db, COLLECTIONS.LEVELS), orderBy('id', 'asc'))
        );
        
        return levelsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        }));
    } catch (error) {
        console.error('❌ Error fetching levels:', error);
        throw error;
    }
    }
}