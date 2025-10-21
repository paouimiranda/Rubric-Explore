// File: services/quiz-service.ts
import { generateQuizFromAI } from '@/api/quizApi';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '../firebase'; // Make sure to import auth

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
}

export interface Quiz {
  id?: string;
  title: string;
  questions: Question[];
  uid: string; // Changed from userId to uid for consistency
  createdAt?: any;
  updatedAt?: any;
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

export class QuizService {
  private static readonly COLLECTION_NAME = 'quizzes';

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
        uid, // Using uid instead of userId
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
   * Get a quiz by ID (only if user owns it)
   */
  static async getQuizById(quizId: string, skipOwnershipCheck: boolean = false): Promise<Quiz | null> {
    try {
      const uid = this.getCurrentUserId();
      const docRef = doc(db, this.COLLECTION_NAME, quizId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const quizData = docSnap.data() as Omit<Quiz, 'id'>;
        
        // Check if user owns this quiz (unless ownership check is skipped)
        if (!skipOwnershipCheck && quizData.uid !== uid) {
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
          timeLimit: question.timeLimit || 30
        }));

        return {
          id: docSnap.id,
          ...quizData,
          questions: questionsWithAllProperties
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
          timeLimit: question.timeLimit || 30
        }));

        return {
          id: doc.id,
          ...quizData,
          questions: questionsWithAllProperties
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
        timeLimit: apiQuestion.timeLimit || 30
      }));
    } catch (error) {
      console.error('AI quiz generation error:', error);
      throw new Error('Failed to generate quiz questions with AI.');
    }
  }

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

  static createBlankQuestion(type: Question['type'], id?: string): Question {
    const baseQuestion = {
      id: id || `question_${Date.now()}`,
      type,
      question: '',
      image: '',
      timeLimit: 30,
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
}