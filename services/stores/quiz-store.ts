// File: stores/quiz-store.ts
import { Question } from '@/services/quiz-service';
import { create } from 'zustand';

interface QuizStore {
  // Quiz data
  quizTitle: string;
  quizImage: string;
  questions: Question[];
  currentQuestionIndex: number;
  
  // Loading states
  isLoading: boolean;
  loadingMessage: string;
  
  // Navigation state
  isFromOverview: boolean;
  
  // Actions
  setQuizTitle: (title: string) => void;
  setQuizImage: (image: string) => void;
  setQuestions: (questions: Question[]) => void;
  addQuestion: (question: Question) => void;
  updateQuestion: (index: number, question: Question) => void;
  deleteQuestion: (index: number) => void;
  setCurrentQuestionIndex: (index: number) => void;
  
  // Loading actions
  setLoading: (loading: boolean, message?: string) => void;
  
  // Navigation actions
  setIsFromOverview: (fromOverview: boolean) => void;
  
  // Bulk actions
  loadQuizData: (data: {
    title: string;
    image: string;
    questions: Question[];
    currentQuestionIndex?: number;
  }) => void;
  
  // Reset actions
  resetQuiz: () => void;
  resetToDefaults: () => void;
}

const initialQuestion: Question = {
  id: '1',
  type: 'multiple_choice',
  question: '',
  image: '',
  options: ['', '', '', ''],
  correctAnswers: [0],
  timeLimit: 30,
  matchPairs: [],
  correctAnswer: ''
};

export const useQuizStore = create<QuizStore>((set, get) => ({
  // Initial state
  quizTitle: '',
  quizImage: '',
  questions: [initialQuestion],
  currentQuestionIndex: 0,
  isLoading: false,
  loadingMessage: '',
  isFromOverview: false,

  // Quiz data actions
  setQuizTitle: (title) => set({ quizTitle: title }),
  
  setQuizImage: (image) => set({ quizImage: image }),
  
  setQuestions: (questions) => set({ questions }),
  
  addQuestion: (question) => set((state) => ({
    questions: [...state.questions, question]
  })),
  
  updateQuestion: (index, question) => set((state) => {
    const updatedQuestions = [...state.questions];
    updatedQuestions[index] = question;
    return { questions: updatedQuestions };
  }),
  
  deleteQuestion: (index) => set((state) => {
    const updatedQuestions = state.questions.filter((_, i) => i !== index);
    // Ensure at least one question remains
    if (updatedQuestions.length === 0) {
      updatedQuestions.push(initialQuestion);
    }
    
    // Adjust current index if needed
    let newCurrentIndex = state.currentQuestionIndex;
    if (newCurrentIndex >= updatedQuestions.length) {
      newCurrentIndex = updatedQuestions.length - 1;
    }
    
    return {
      questions: updatedQuestions,
      currentQuestionIndex: newCurrentIndex
    };
  }),
  
  setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),

  // Loading actions
  setLoading: (loading, message = '') => set({
    isLoading: loading,
    loadingMessage: message
  }),

  // Navigation actions
  setIsFromOverview: (fromOverview) => set({ isFromOverview: fromOverview }),

  // Bulk actions
  loadQuizData: (data) => set({
    quizTitle: data.title,
    quizImage: data.image,
    questions: data.questions.length > 0 ? data.questions : [initialQuestion],
    currentQuestionIndex: data.currentQuestionIndex || 0,
    isFromOverview: true
  }),

  // Reset actions
  resetQuiz: () => set({
    quizTitle: '',
    quizImage: '',
    questions: [initialQuestion],
    currentQuestionIndex: 0,
    isFromOverview: false
  }),

  resetToDefaults: () => set({
    quizTitle: '',
    quizImage: '',
    questions: [initialQuestion],
    currentQuestionIndex: 0,
    isLoading: false,
    loadingMessage: '',
    isFromOverview: false
  })
}));