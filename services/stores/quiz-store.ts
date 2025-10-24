// File: stores/quiz-store.ts
import { Question } from '@/services/quiz-service';
import { create } from 'zustand';

interface QuizStore {
  // Quiz data
  quizTitle: string;
  quizImage: string;
  questions: Question[];
  currentQuestionIndex: number;
  topics: string[]; // Per-quiz topics list
  
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
  
  // Topic management actions
  setTopics: (topics: string[]) => void;
  addTopic: (topic: string) => boolean; // Returns false if duplicate
  updateTopic: (oldTopic: string, newTopic: string) => boolean;
  deleteTopic: (topic: string) => void;
  extractTopicsFromQuestions: () => void; // Auto-populate from existing questions
  
  // Loading actions
  setLoading: (loading: boolean, message?: string) => void;
  
  // Navigation actions
  setIsFromOverview: (fromOverview: boolean) => void;
  
  // Bulk actions
  loadQuizData: (data: {
    title: string;
    image: string;
    questions: Question[];
    topics?: string[];
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
  correctAnswer: '',
  topic: '', // Initialize with empty topic
  points: 1
};

export const useQuizStore = create<QuizStore>((set, get) => ({
  // Initial state
  quizTitle: '',
  quizImage: '',
  questions: [initialQuestion],
  currentQuestionIndex: 0,
  topics: [], // Empty topics array initially
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

  // Topic management actions
  setTopics: (topics) => set({ topics }),
  
  addTopic: (topic) => {
    const trimmedTopic = topic.trim();
    
    // Validate topic
    if (!trimmedTopic || trimmedTopic.length > 50) {
      return false;
    }
    
    const state = get();
    
    // Check for duplicates (case-insensitive)
    const isDuplicate = state.topics.some(
      t => t.toLowerCase() === trimmedTopic.toLowerCase()
    );
    
    if (isDuplicate) {
      return false;
    }
    
    set({ topics: [...state.topics, trimmedTopic] });
    return true;
  },
  
  updateTopic: (oldTopic, newTopic) => {
    const trimmedNewTopic = newTopic.trim();
    
    // Validate new topic
    if (!trimmedNewTopic || trimmedNewTopic.length > 50) {
      return false;
    }
    
    const state = get();
    
    // Check for duplicates (excluding the old topic)
    const isDuplicate = state.topics.some(
      t => t !== oldTopic && t.toLowerCase() === trimmedNewTopic.toLowerCase()
    );
    
    if (isDuplicate) {
      return false;
    }
    
    // Update topic in topics list
    const updatedTopics = state.topics.map(t => 
      t === oldTopic ? trimmedNewTopic : t
    );
    
    // Update topic in all questions that use it
    const updatedQuestions = state.questions.map(q => 
      q.topic === oldTopic ? { ...q, topic: trimmedNewTopic } : q
    );
    
    set({ 
      topics: updatedTopics,
      questions: updatedQuestions
    });
    
    return true;
  },
  
  deleteTopic: (topic) => set((state) => {
    // Remove topic from list
    const updatedTopics = state.topics.filter(t => t !== topic);
    
    // Clear topic from questions that use it
    const updatedQuestions = state.questions.map(q => 
      q.topic === topic ? { ...q, topic: '' } : q
    );
    
    return {
      topics: updatedTopics,
      questions: updatedQuestions
    };
  }),
  
  extractTopicsFromQuestions: () => set((state) => {
    // Extract unique topics from questions
    const topicsFromQuestions = new Set<string>();
    
    state.questions.forEach(q => {
      if (q.topic && q.topic.trim() && q.topic !== 'Uncategorized') {
        topicsFromQuestions.add(q.topic.trim());
      }
    });
    
    // Merge with existing topics (avoid duplicates)
    const existingTopicsLower = state.topics.map(t => t.toLowerCase());
    const newTopics = Array.from(topicsFromQuestions).filter(
      t => !existingTopicsLower.includes(t.toLowerCase())
    );
    
    return {
      topics: [...state.topics, ...newTopics]
    };
  }),

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
    topics: data.topics || [],
    currentQuestionIndex: data.currentQuestionIndex || 0,
    isFromOverview: true
  }),

  // Reset actions
  resetQuiz: () => set({
    quizTitle: '',
    quizImage: '',
    questions: [initialQuestion],
    topics: [],
    currentQuestionIndex: 0,
    isFromOverview: false
  }),

  resetToDefaults: () => set({
    quizTitle: '',
    quizImage: '',
    questions: [initialQuestion],
    topics: [],
    currentQuestionIndex: 0,
    isLoading: false,
    loadingMessage: '',
    isFromOverview: false
  })
}));