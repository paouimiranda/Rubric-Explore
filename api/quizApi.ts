// File: api/quizApi.ts
// Updated to use Firebase Functions with Gemini API

import { getFunctions, httpsCallable } from 'firebase/functions';

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'fill_blank' | 'matching';
  question: string;
  image?: string;
  options: string[];
  correctAnswers: number[];
  timeLimit: number;
  matchPairs: Array<{ left: string; right: string }>;
  correctAnswer: string;
  topic: string;
  points?: number;
}

interface QuizResponse {
  quiz: QuizQuestion[];
  success: boolean;
  error?: string;
}

interface QuizGenerationRequest {
  topic: string;
  num_questions: number;
  content?: string;
  question_types?: string[];
}

/**
 * Generate quiz using Firebase Functions + Gemini API
 */
export async function generateQuizFromAI(
  topic: string, 
  numQuestions: number, 
  content?: string,
  questionTypes?: string[]
): Promise<QuizQuestion[]> {
  console.log('=== generateQuizFromAI (Firebase Functions) ===');
  console.log('Topic:', topic);
  console.log('Num Questions:', numQuestions);
  console.log('Content provided:', !!content);
  console.log('Content length:', content?.length || 0);
  console.log('Content preview:', content?.slice(0, 200));
  console.log('Question Types:', questionTypes);

  try {
    // Get Firebase Functions instance
    const functions = getFunctions();
    
    // Optional: Use emulator for local development
    // Uncomment if you're testing locally with Firebase emulator
    // connectFunctionsEmulator(functions, 'localhost', 5001);

    // Get the callable function
    const generateQuiz = httpsCallable<QuizGenerationRequest, QuizResponse>(
      functions, 
      'generateQuiz'
    );

    // Call the function
    const result = await generateQuiz({
      topic,
      num_questions: numQuestions,
      content,
      question_types: questionTypes || ['multiple_choice', 'fill_blank', 'matching']
    });

    console.log('Function result:', result.data);

    if (!result.data.success) {
      throw new Error(result.data.error || 'Failed to generate quiz');
    }

    if (!result.data.quiz || result.data.quiz.length === 0) {
      console.warn('⚠️ Function returned 0 questions!');
      throw new Error('No questions were generated. Please try again with different content or topic.');
    }

    // Ensure each question has required fields
    const questionsWithDefaults = result.data.quiz.map((q) => ({
      ...q,
      topic: q.topic || topic || 'General',
      points: q.points || 1
    }));

    console.log(`✅ Successfully generated ${questionsWithDefaults.length} questions`);
    return questionsWithDefaults;

  } catch (error: any) {
    console.error('❌ Quiz generation error:', error);
    
    // Handle Firebase Functions errors
    if (error.code) {
      switch (error.code) {
        case 'unauthenticated':
          throw new Error('You must be signed in to generate quizzes');
        case 'permission-denied':
          throw new Error('You do not have permission to generate quizzes');
        case 'invalid-argument':
          throw new Error(error.message || 'Invalid quiz parameters');
        case 'failed-precondition':
          throw new Error('Quiz generation service is not configured properly');
        default:
          throw new Error(error.message || 'Failed to generate quiz');
      }
    }
    
    throw new Error(error.message || 'Failed to generate quiz. Please try again.');
  }
}

/**
 * Utility function to convert API response to internal Question format
 */
export function convertAPIQuestionToInternalFormat(apiQuestion: QuizQuestion): any {
  return {
    id: apiQuestion.id,
    type: apiQuestion.type,
    question: apiQuestion.question,
    image: apiQuestion.image || '',
    options: apiQuestion.options,
    correctAnswers: apiQuestion.correctAnswers,
    timeLimit: apiQuestion.timeLimit,
    matchPairs: apiQuestion.matchPairs,
    correctAnswer: apiQuestion.correctAnswer,
    topic: apiQuestion.topic || 'Uncategorized',
    points: apiQuestion.points || 1
  };
}

/**
 * Utility function to validate API question has required analytics fields
 */
export function validateAPIQuestion(apiQuestion: QuizQuestion): { isValid: boolean; error?: string } {
  if (!apiQuestion.topic || !apiQuestion.topic.trim()) {
    return { 
      isValid: false, 
      error: 'Question is missing required topic field for analytics' 
    };
  }
  
  if (apiQuestion.topic.length > 50) {
    return { 
      isValid: false, 
      error: 'Topic must be 50 characters or less' 
    };
  }
  
  return { isValid: true };
}