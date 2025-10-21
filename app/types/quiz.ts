//quiz.ts (types for quiz)
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  timeLimit?: number; // in seconds
  points?: number;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  category?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  isPublic: boolean;
  tags: string[];
  totalPoints: number;
  estimatedTime: number; // in minutes
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  answers: Record<string, number>; // questionId -> selectedOptionIndex
  score: number;
  totalPoints: number;
  startedAt: Date;
  completedAt?: Date;
  timeSpent: number; // in seconds
}

export interface QuizResult {
  attempt: QuizAttempt;
  quiz: Quiz;
  correctAnswers: number;
  incorrectAnswers: number;
  percentage: number;
  questionResults: QuestionResult[];
}

export interface QuestionResult {
  question: QuizQuestion;
  selectedAnswer: number;
  isCorrect: boolean;
  timeSpent: number;
  points: number;
}

export interface QuizStats {
  totalQuizzes: number;
  totalAttempts: number;
  averageScore: number;
  bestScore: number;
  favoriteCategory: string;
  totalTimeSpent: number;
}

export type QuizMode = 'practice' | 'timed' | 'multiplayer';
export type QuizDifficulty = 'easy' | 'medium' | 'hard';
export type QuizCategory = 'general' | 'science' | 'history' | 'technology' | 'sports' | 'entertainment' | 'custom';