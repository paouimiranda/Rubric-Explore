// File: services/quiz-service.ts
import { generateQuizFromAI } from '@/api/quizApi';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '../firebase';

export interface MatchPair {
  left: string;
  right: string;
}

export interface Question {
  id: string;
  type: 'multiple_choice' | 'fill_blank' | 'matching';
  question: string;
  image: string;
  options: string[];
  correctAnswers: number[];
  correctAnswer: string;
  matchPairs: MatchPair[];
  timeLimit: number;
  
  // Analytics field
  topic: string; // Required for analytics
  points?: number; // Optional: custom point value
}

export interface Quiz {
  id?: string;
  title: string;
  questions: Question[];
  uid: string;
  createdAt?: any;
  updatedAt?: any;
  category?: string; // Overall quiz category
  tags?: string[]; // Additional tags for organization
  topics?: string[]; // Per-quiz topics list for analytics
  isPublic: boolean;
}

export interface AIQuizQuestion {
  question: string;
  choices: {
    A?: string;
    B?: string;
    C?: string;
    D?: string;
  };
}

// ============================================
// NEW ANALYTICS INTERFACES
// ============================================

export interface QuestionResult {
  questionId: string;
  isCorrect: boolean;
  timeSpent: number;
  topic: string;
  points: number;
}

export interface QuizAttempt {
  id?: string;
  quizId: string;
  quizTitle: string;
  userId: string;
  score: number;
  totalPoints: number;
  percentage: number;
  timeSpent: number;
  startedAt: any;
  completedAt: any;
  questionResults: QuestionResult[];
}

export interface TopicPerformance {
  topic: string;
  correct: number;
  total: number;
  accuracy: number;
  avgTime: number;
}

export interface ScoreTrend {
  attemptNumber: number;
  score: number;
  percentage: number;
  date: Date;
  attemptId: string;
}

export interface TimingTrend {
  attemptNumber: number;
  avgTimePerQuestion: number;
  totalTime: number;
  date: Date;
}

export class QuizService {
  private static readonly COLLECTION_NAME = 'quizzes';
  private static readonly ATTEMPTS_SUBCOLLECTION = 'attempts';

  /**
   * Get current user ID
   */
  private static getCurrentUserId(): string {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to perform this action.');
    }
    return user.uid;
  }

  /**
   * Save a new quiz to Firestore with user ID
   */
  static async createQuiz(quiz: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt' | 'uid'>): Promise<string> {
    try {
      const uid = this.getCurrentUserId();
      
      const quizData = {
        title: quiz.title,
        questions: quiz.questions,
        category: quiz.category || '',
        tags: quiz.tags || [],
        topics: quiz.topics || [], // ADD THIS LINE
        isPublic: quiz.isPublic ?? false, // ADD THIS LINE (default to false)
        uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), quizData);
      return docRef.id;
    } catch (error) {
      console.error('Firestore save error:', error);
      throw new Error('Failed to save the quiz to Firestore.');
    }
  }

  /**
   * Get a quiz by ID
   * - If user owns it: full access
   * - If quiz is public: read-only access
   * - Otherwise: no access
   */
  static async getQuizById(quizId: string, skipOwnershipCheck: boolean = false): Promise<Quiz | null> {
    try {
      const uid = this.getCurrentUserId();
      const docRef = doc(db, this.COLLECTION_NAME, quizId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const quizData = docSnap.data() as Omit<Quiz, 'id'>;
        
        // Check access permissions
        const isOwner = quizData.uid === uid;
        const isPublic = quizData.isPublic ?? false;
        
        // Allow access if: user owns it, quiz is public, or ownership check is skipped
        if (!skipOwnershipCheck && !isOwner && !isPublic) {
          throw new Error('You do not have permission to access this quiz.');
        }
        
        const questionsWithAllProperties = quizData.questions.map((question: any, index) => ({
          id: question.id || `question_${index}_${Date.now()}`,
          type: question.type || 'multiple_choice',
          question: question.question || '',
          image: question.image || '',
          options: question.options || [],
          correctAnswers: question.correctAnswers || (question.answerIndex !== undefined ? [question.answerIndex] : [0]),
          correctAnswer: question.correctAnswer || '',
          matchPairs: question.matchPairs || [],
          timeLimit: question.timeLimit || 30,
          
          // Analytics field with default
          topic: question.topic || 'Uncategorized',
          points: question.points || 1
        }));

        return {
          id: docSnap.id,
          ...quizData,
          questions: questionsWithAllProperties,
          isPublic: isPublic,
        } as Quiz;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Firestore get error:', error);
      throw error;
    }
  }
  /**
   * Update an existing quiz (only if user owns it)
   */
  static async updateQuiz(quizId: string, updates: Partial<Omit<Quiz, 'id' | 'createdAt' | 'uid'>>): Promise<void> {
    try {
      const uid = this.getCurrentUserId();
      const docRef = doc(db, this.COLLECTION_NAME, quizId);
      
      // First check if user owns this quiz
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error('Quiz not found.');
      }
      
      const quizData = docSnap.data();
      if (quizData.uid !== uid) {
        throw new Error('You do not have permission to update this quiz.');
      }
      
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Firestore update error:', error);
      throw error;
    }
  }

  /**
   * Delete a quiz (only if user owns it)
   */
  static async deleteQuiz(quizId: string): Promise<void> {
    try {
      const uid = this.getCurrentUserId();
      const docRef = doc(db, this.COLLECTION_NAME, quizId);
      
      // First check if user owns this quiz
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error('Quiz not found.');
      }
      
      const quizData = docSnap.data();
      if (quizData.uid !== uid) {
        throw new Error('You do not have permission to delete this quiz.');
      }
      
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Firestore delete error:', error);
      throw error;
    }
  }

  /**
   * Get all quizzes for the current user only
   */
  static async getAllQuizzes(): Promise<Quiz[]> {
    try {
      const uid = this.getCurrentUserId();
      
      // Query only quizzes that belong to the current user
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('uid', '==', uid),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const quizData = doc.data() as Omit<Quiz, 'id'>;
        
        const questionsWithAllProperties = quizData.questions.map((question: any, index) => ({
          id: question.id || `question_${index}_${Date.now()}`,
          type: question.type || 'multiple_choice',
          question: question.question || '',
          image: question.image || '',
          options: question.options || [],
          correctAnswers: question.correctAnswers || (question.answerIndex !== undefined ? [question.answerIndex] : [0]),
          correctAnswer: question.correctAnswer || '',
          matchPairs: question.matchPairs || [],
          timeLimit: question.timeLimit || 30,
          
          // Analytics field with default
          topic: question.topic || 'Uncategorized',
          points: question.points || 1
        }));

        return {
          id: doc.id,
          ...quizData,
          questions: questionsWithAllProperties,
          isPublic: quizData.isPublic ?? false, // ADD THIS LINE
        } as Quiz;
      });
    } catch (error) {
      console.error('Firestore get all error:', error);
      throw error;
    }
  }

  /**
   * Generate quiz questions using AI
   */
  static async generateAIQuiz(
    topic: string, 
    numberOfQuestions: number = 5,
    content?: string,
    questionTypes?: string[]
  ): Promise<Question[]> {
    try {
      const aiQuestions = await generateQuizFromAI(topic, numberOfQuestions, content, questionTypes);
      
      return aiQuestions.map((apiQuestion, index) => ({
        id: `ai_question_${index}_${Date.now()}`,
        type: apiQuestion.type || 'multiple_choice',
        question: apiQuestion.question,
        image: apiQuestion.image || "",
        options: apiQuestion.options || [],
        correctAnswers: apiQuestion.correctAnswers || [0],
        correctAnswer: apiQuestion.correctAnswer || "",
        matchPairs: apiQuestion.matchPairs || [],
        timeLimit: apiQuestion.timeLimit || 30,
        
        // Analytics field - AI should provide this, fallback to main topic
        topic: apiQuestion.topic || topic || 'General',
        points: apiQuestion.points || 1
      }));
    } catch (error) {
      console.error('AI quiz generation error:', error);
      throw new Error('Failed to generate quiz questions with AI.');
    }
  }

  // ============================================
  // ANALYTICS METHODS
  // ============================================

  /**
   * Save a quiz attempt to /users/{uid}/attempts/{attemptId}
   */
  static async saveQuizAttempt(attemptData: Omit<QuizAttempt, 'id' | 'userId'>): Promise<string> {
    try {
      const uid = this.getCurrentUserId();
      
      const attemptDoc = {
        ...attemptData,
        userId: uid,
        completedAt: serverTimestamp(),
      };

      const attemptsRef = collection(db, 'users', uid, this.ATTEMPTS_SUBCOLLECTION);
      const docRef = await addDoc(attemptsRef, attemptDoc);
      
      console.log('Quiz attempt saved:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error saving quiz attempt:', error);
      throw new Error('Failed to save quiz attempt.');
    }
  }

  /**
   * Get all quiz attempts for the current user
   * Optionally filter by quizId
   */
  static async getUserQuizAttempts(quizId?: string): Promise<QuizAttempt[]> {
    try {
      const uid = this.getCurrentUserId();
      const attemptsRef = collection(db, 'users', uid, this.ATTEMPTS_SUBCOLLECTION);
      
      let q;
      if (quizId) {
        q = query(
          attemptsRef,
          where('quizId', '==', quizId),
          orderBy('completedAt', 'desc')
        );
      } else {
        q = query(
          attemptsRef,
          orderBy('completedAt', 'desc')
        );
      }
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startedAt: data.startedAt?.toDate() || new Date(),
          completedAt: data.completedAt?.toDate() || new Date(),
        } as QuizAttempt;
      });
    } catch (error) {
      console.error('Error fetching quiz attempts:', error);
      throw new Error('Failed to fetch quiz attempts.');
    }
  }

  /**
   * Get performance breakdown by topic
   */
  static getPerformanceByTopic(attempts: QuizAttempt[]): TopicPerformance[] {
    const topicMap = new Map<string, { correct: number; total: number; totalTime: number }>();
    
    attempts.forEach(attempt => {
      attempt.questionResults.forEach(result => {
        const topic = result.topic || 'Uncategorized';
        const existing = topicMap.get(topic) || { correct: 0, total: 0, totalTime: 0 };
        
        topicMap.set(topic, {
          correct: existing.correct + (result.isCorrect ? 1 : 0),
          total: existing.total + 1,
          totalTime: existing.totalTime + result.timeSpent,
        });
      });
    });
    
    const topicPerformance: TopicPerformance[] = [];
    topicMap.forEach((value, topic) => {
      topicPerformance.push({
        topic,
        correct: value.correct,
        total: value.total,
        accuracy: (value.correct / value.total) * 100,
        avgTime: value.totalTime / value.total,
      });
    });
    
    // Sort by accuracy (lowest first to highlight weak areas)
    return topicPerformance.sort((a, b) => a.accuracy - b.accuracy);
  }

  /**
   * Get score trends across attempts
   */
  static getScoreTrends(attempts: QuizAttempt[]): ScoreTrend[] {
    return attempts
      .map((attempt, index) => ({
        attemptNumber: attempts.length - index,
        score: attempt.score,
        percentage: attempt.percentage,
        date: attempt.completedAt instanceof Date ? attempt.completedAt : new Date(attempt.completedAt),
        attemptId: attempt.id || '',
      }))
      .reverse(); // Oldest to newest
  }

  /**
   * Get timing trends across attempts
   */
  static getTimingTrends(attempts: QuizAttempt[]): TimingTrend[] {
    return attempts
      .map((attempt, index) => {
        const totalQuestions = attempt.questionResults.length;
        return {
          attemptNumber: attempts.length - index,
          avgTimePerQuestion: attempt.timeSpent / totalQuestions,
          totalTime: attempt.timeSpent,
          date: attempt.completedAt instanceof Date ? attempt.completedAt : new Date(attempt.completedAt),
        };
      })
      .reverse(); // Oldest to newest
  }

  /**
   * Get summary statistics for a quiz
   */
  static getQuizSummaryStats(attempts: QuizAttempt[]) {
    if (attempts.length === 0) {
      return {
        totalAttempts: 0,
        averageScore: 0,
        bestScore: 0,
        worstScore: 0,
        averageTime: 0,
        lastAttemptDate: null,
      };
    }

    const scores = attempts.map(a => a.percentage);
    const times = attempts.map(a => a.timeSpent);
    
    return {
      totalAttempts: attempts.length,
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      bestScore: Math.max(...scores),
      worstScore: Math.min(...scores),
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      lastAttemptDate: attempts[0].completedAt,
    };
  }

  /**
   * Group attempts by quiz for overview
   */
  static async getAttemptsGroupedByQuiz(): Promise<Map<string, QuizAttempt[]>> {
    try {
      const allAttempts = await this.getUserQuizAttempts();
      const grouped = new Map<string, QuizAttempt[]>();
      
      allAttempts.forEach(attempt => {
        const existing = grouped.get(attempt.quizId) || [];
        existing.push(attempt);
        grouped.set(attempt.quizId, existing);
      });
      
      return grouped;
    } catch (error) {
      console.error('Error grouping attempts:', error);
      throw error;
    }
  }

  // ============================================
  // EXISTING VALIDATION METHODS
  // ============================================

  /**
   * Validate quiz data before saving
   */
  static validateQuiz(quiz: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt' | 'uid'>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!quiz.title || !quiz.title.trim()) {
      errors.push('Quiz title is required.');
    }

    if (!quiz.questions || quiz.questions.length === 0) {
      errors.push('At least one question is required.');
    }

    quiz.questions.forEach((question, index) => {
      if (!question.question || !question.question.trim()) {
        errors.push(`Question ${index + 1} text is required.`);
      }

      // Validate topic field
      if (!question.topic || !question.topic.trim()) {
        errors.push(`Question ${index + 1} must have a topic assigned for analytics.`);
      } else if (question.topic.length > 50) {
        errors.push(`Question ${index + 1} topic must be 50 characters or less.`);
      }

      // Validate points if provided
      if (question.points !== undefined && (typeof question.points !== 'number' || question.points < 0)) {
        errors.push(`Question ${index + 1} points must be a non-negative number.`);
      }

      switch (question.type) {
        case 'multiple_choice':
          const validOptions = question.options.filter(opt => opt && opt.trim());
          if (validOptions.length < 2) {
            errors.push(`Question ${index + 1} must have at least 2 options.`);
          }

          if (!question.correctAnswers || question.correctAnswers.length === 0) {
            errors.push(`Question ${index + 1} must have at least one correct answer selected.`);
          }

          question.correctAnswers.forEach(answerIndex => {
            if (answerIndex < 0 || answerIndex >= question.options.length) {
              errors.push(`Question ${index + 1} has an invalid correct answer index.`);
            }

            if (!question.options[answerIndex] || !question.options[answerIndex].trim()) {
              errors.push(`Question ${index + 1} correct answer cannot be empty.`);
            }
          });
          break;

        case 'fill_blank':
          if (!question.correctAnswer || !question.correctAnswer.trim()) {
            errors.push(`Question ${index + 1} must have a correct answer for fill-in-the-blank.`);
          }
          break;

        case 'matching':
          if (!question.matchPairs || question.matchPairs.length < 2) {
            errors.push(`Question ${index + 1} must have at least 2 matching pairs.`);
          }

          question.matchPairs.forEach((pair, pairIndex) => {
            if (!pair.left || !pair.left.trim()) {
              errors.push(`Question ${index + 1}, pair ${pairIndex + 1}: Left side cannot be empty.`);
            }
            if (!pair.right || !pair.right.trim()) {
              errors.push(`Question ${index + 1}, pair ${pairIndex + 1}: Right side cannot be empty.`);
            }
          });

          const leftItems = question.matchPairs.map(p => p.left.trim().toLowerCase());
          const rightItems = question.matchPairs.map(p => p.right.trim().toLowerCase());
          
          if (leftItems.length !== new Set(leftItems).size) {
            errors.push(`Question ${index + 1} has duplicate left-side items.`);
          }
          if (rightItems.length !== new Set(rightItems).size) {
            errors.push(`Question ${index + 1} has duplicate right-side items.`);
          }
          break;
      }

      if (typeof question.timeLimit !== 'number' || question.timeLimit <= 0) {
        errors.push(`Question ${index + 1} must have a valid time limit greater than 0 seconds.`);
      }

      if (question.timeLimit > 300) {
        errors.push(`Question ${index + 1} time limit cannot exceed 300 seconds (5 minutes).`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static formatTimeDisplay(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
  }

  static getRecommendedTimeLimits(): number[] {
    return [10, 15, 20, 30, 45, 60, 90, 120];
  }

  static validateTimeLimit(timeLimit: number): { isValid: boolean; error?: string } {
    if (typeof timeLimit !== 'number') {
      return { isValid: false, error: 'Time limit must be a number.' };
    }

    if (timeLimit <= 0) {
      return { isValid: false, error: 'Time limit must be greater than 0 seconds.' };
    }

    if (timeLimit > 300) {
      return { isValid: false, error: 'Time limit cannot exceed 300 seconds (5 minutes).' };
    }

    return { isValid: true };
  }

  /**
   * Get common topics from existing quizzes for autocomplete
   */
  static async getCommonTopics(): Promise<string[]> {
    try {
      const quizzes = await this.getAllQuizzes();
      const topicsSet = new Set<string>();
      
      quizzes.forEach(quiz => {
        quiz.questions.forEach(question => {
          if (question.topic && question.topic !== 'Uncategorized') {
            topicsSet.add(question.topic);
          }
        });
      });
      
      return Array.from(topicsSet).sort();
    } catch (error) {
      console.error('Error fetching common topics:', error);
      return [];
    }
  }

  /**
   * Get suggested topics based on quiz category
   */
  static getSuggestedTopics(category?: string): string[] {
    const topicSuggestions: Record<string, string[]> = {
      'Math': ['Algebra', 'Geometry', 'Calculus', 'Statistics', 'Trigonometry'],
      'Science': ['Biology', 'Chemistry', 'Physics', 'Earth Science', 'Astronomy'],
      'History': ['Ancient History', 'Modern History', 'World Wars', 'Civilizations', 'Revolution'],
      'Language': ['Grammar', 'Vocabulary', 'Literature', 'Writing', 'Reading Comprehension'],
      'Computer Science': ['Programming', 'Data Structures', 'Algorithms', 'Databases', 'Networking']
    };

    return category && topicSuggestions[category] ? topicSuggestions[category] : [];
  }

  static createBlankQuestion(type: Question['type'], id?: string): Question {
    const baseQuestion = {
      id: id || `question_${Date.now()}`,
      type,
      question: '',
      image: '',
      timeLimit: 30,
      topic: '', // Required field
      points: 1
    };

    switch (type) {
      case 'multiple_choice':
        return {
          ...baseQuestion,
          options: ['', '', '', ''],
          correctAnswers: [0],
          correctAnswer: '',
          matchPairs: [],
        };

      case 'fill_blank':
        return {
          ...baseQuestion,
          options: [],
          correctAnswers: [],
          correctAnswer: '',
          matchPairs: [],
        };

      case 'matching':
        return {
          ...baseQuestion,
          options: [],
          correctAnswers: [],
          correctAnswer: '',
          matchPairs: [
            { left: '', right: '' },
            { left: '', right: '' },
            { left: '', right: '' }
          ],
        };

      default:
        return {
          ...baseQuestion,
          type: 'multiple_choice',
          options: ['', '', '', ''],
          correctAnswers: [0],
          correctAnswer: '',
          matchPairs: [],
        };
    }
  }

  static isQuestionComplete(question: Question): boolean {
    if (!question.question.trim()) return false;
    if (!question.topic || !question.topic.trim()) return false; // Topic is now required

    switch (question.type) {
      case 'multiple_choice':
        const validOptions = question.options.filter(opt => opt && opt.trim());
        return validOptions.length >= 2 && question.correctAnswers.length > 0;

      case 'fill_blank':
        return !!question.correctAnswer.trim();

      case 'matching':
        return question.matchPairs.length >= 2 && 
               question.matchPairs.every(pair => pair.left.trim() && pair.right.trim());

      default:
        return false;
    }
  }
  
    /**
   * Get all public quizzes for a specific user
   */
  static async getPublicQuizzes(uid: string): Promise<Quiz[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('uid', '==', uid),
        where('isPublic', '==', true),
        orderBy('updatedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const quizData = doc.data() as Omit<Quiz, 'id'>;
        
        const questionsWithAllProperties = quizData.questions.map((question: any, index) => ({
          id: question.id || `question_${index}_${Date.now()}`,
          type: question.type || 'multiple_choice',
          question: question.question || '',
          image: question.image || '',
          options: question.options || [],
          correctAnswers: question.correctAnswers || (question.answerIndex !== undefined ? [question.answerIndex] : [0]),
          correctAnswer: question.correctAnswer || '',
          matchPairs: question.matchPairs || [],
          timeLimit: question.timeLimit || 30,
          topic: question.topic || 'Uncategorized',
          points: question.points || 1
        }));

        return {
          id: doc.id,
          ...quizData,
          questions: questionsWithAllProperties,
          isPublic: quizData.isPublic ?? false,
        } as Quiz;
      });
    } catch (error) {
      console.error('Error fetching public quizzes:', error);
      return [];
    }
  }

  /**
   * Get quiz by ID for public viewing (skips ownership check)
   */
  static async getPublicQuizById(quizId: string): Promise<Quiz | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, quizId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const quizData = docSnap.data() as Omit<Quiz, 'id'>;
        
        // Check if quiz is public
        if (!quizData.isPublic) {
          return null;
        }
        
        const questionsWithAllProperties = quizData.questions.map((question: any, index) => ({
          id: question.id || `question_${index}_${Date.now()}`,
          type: question.type || 'multiple_choice',
          question: question.question || '',
          image: question.image || '',
          options: question.options || [],
          correctAnswers: question.correctAnswers || (question.answerIndex !== undefined ? [question.answerIndex] : [0]),
          correctAnswer: question.correctAnswer || '',
          matchPairs: question.matchPairs || [],
          timeLimit: question.timeLimit || 30,
          topic: question.topic || 'Uncategorized',
          points: question.points || 1
        }));

        return {
          id: docSnap.id,
          ...quizData,
          questions: questionsWithAllProperties,
        } as Quiz;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Firestore get public quiz error:', error);
      return null;
    }
  }

  /**
   * Count public quizzes for a user (for stats)
   */
  static async countPublicQuizzes(uid: string): Promise<number> {
    try {
      const quizzes = await this.getPublicQuizzes(uid);
      return quizzes.length;
    } catch (error) {
      console.error('Error counting public quizzes:', error);
      return 0;
    }
  }
}

