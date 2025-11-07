// File: hooks/useJourney.ts
import { JourneyService, Level, UserProgress, UserStats } from '@/services/journey-service';
import { useCallback, useEffect, useState } from 'react';

/**
 * Hook to manage journey levels and user progress
 */
export const useJourney = () => {
  const [levels, setLevels] = useState<Level[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadJourneyData = useCallback(async () => {
    try {
      console.log('loadJourneyData called, refreshTrigger:', refreshTrigger);
      setLoading(true);
      setError(null);

      // Load all data in parallel
      const [levelsData, statsData, progressData] = await Promise.all([
        JourneyService.getAllLevels(),
        JourneyService.getUserStats(),
        JourneyService.getUserProgress(),
      ]);

      console.log('Data loaded:', { 
        levelsCount: levelsData.length, 
        shards: statsData?.shards,
        energy: statsData?.energy,
        currentLevel: progressData?.currentLevel 
      });

      setLevels(levelsData);
      setUserStats(statsData);
      setUserProgress(progressData);
    } catch (err) {
      console.error('Error loading journey data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load journey data');
    } finally {
      setLoading(false);
    }
  }, [refreshTrigger]);

  // Load data on mount and when refreshTrigger changes
  useEffect(() => {
    loadJourneyData();
  }, [loadJourneyData]);

  // Reload function that triggers a fresh fetch - STABLE reference
  const reload = useCallback(() => {
    console.log('Reload called - incrementing refreshTrigger');
    setRefreshTrigger(prev => prev + 1);
  }, []); // No dependencies - stable reference

  const refreshStats = useCallback(async () => {
    try {
      const [statsData, progressData] = await Promise.all([
        JourneyService.getUserStats(),
        JourneyService.getUserProgress(),
      ]);
      setUserStats(statsData);
      setUserProgress(progressData);
    } catch (err) {
      console.error('Error refreshing stats:', err);
    }
  }, []);

  const refreshLevels = useCallback(async () => {
    try {
      const levelsData = await JourneyService.getAllLevels();
      setLevels(levelsData);
    } catch (err) {
      console.error('Error refreshing levels:', err);
    }
  }, []);

  return {
    levels,
    userStats,
    userProgress,
    loading,
    error,
    refreshStats,
    refreshLevels,
    reload,
  };
};

/**
 * Hook to handle level completion
 */
export const useLevelCompletion = () => {
  const [completing, setCompleting] = useState(false);
  const [completionResult, setCompletionResult] = useState<{
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

  const completeLevel = useCallback(
    async (
      levelId: number,
      quizScore: number,
      quizPercentage: number,
      timeSpent: number
    ) => {
      try {
        setCompleting(true);
        const result = await JourneyService.completeLevel(
          levelId,
          quizScore,
          quizPercentage,
          timeSpent
        );
        setCompletionResult(result);
        return result;
      } catch (err) {
        console.error('Error completing level:', err);
        throw err;
      } finally {
        setCompleting(false);
      }
    },
    []
  );

  const clearResult = useCallback(() => {
    setCompletionResult(null);
  }, []);

  return {
    completeLevel,
    completing,
    completionResult,
    clearResult,
  };
};

/**
 * Hook to check if user can attempt a level
 */
export const useCanAttemptLevel = (levelId: number | null) => {
  const [canAttempt, setCanAttempt] = useState(false);
  const [reason, setReason] = useState<string | undefined>(undefined);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (levelId === null) return;

    const checkAttempt = async () => {
      try {
        setChecking(true);
        const result = await JourneyService.canAttemptLevel(levelId);
        setCanAttempt(result.canAttempt);
        setReason(result.reason);
      } catch (err) {
        console.error('Error checking level attempt:', err);
        setCanAttempt(false);
        setReason('Error checking level');
      } finally {
        setChecking(false);
      }
    };

    checkAttempt();
  }, [levelId]);

  return { canAttempt, reason, checking };
};

/**
 * Hook for XP calculations
 */
export const useXPProgress = (userStats: UserStats | null) => {
  if (!userStats) {
    return {
      currentLevel: 1,
      currentXP: 0,
      xpToNextLevel: 600,
      xpProgress: 0,
    };
  }

  const { currentLevel, current: currentXP } = userStats.experience;
  const xpToNextLevel = JourneyService.getXPForNextLevel(currentLevel);
  const xpProgress = JourneyService.getXPProgress(currentXP, currentLevel);

  return {
    currentLevel,
    currentXP,
    xpToNextLevel,
    xpProgress,
  };
};

/**
 * Hook to get level attempt history
 */
export const useLevelHistory = (levelId?: number) => {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        const history = await JourneyService.getLevelAttempts(levelId);
        setAttempts(history);
      } catch (err) {
        console.error('Error loading level history:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [levelId]);

  return { attempts, loading };
};