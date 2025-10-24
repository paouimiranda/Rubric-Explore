// File: types/quiz.ts

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  timeLimit?: number; // in seconds
  points?: number; // Points awarded for correct answer
  
  // Analytics field
  topic: string; // Required: Main category for analytics (e.g., "Algebra", "Biology")
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  category?: string; // Overall quiz category
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

// New interface for topic-based analytics
export interface TopicPerformance {
  topic: string;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  averageTimeSpent: number;
  accuracy: number; // percentage
  lastAttempted?: Date;
}