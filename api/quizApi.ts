// File: api/quizApi.ts
// Updated quiz API integration with topic field for analytics

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'fill_blank' | 'matching';
  question: string;
  image?: string;
  options: string[];
  correctAnswers: number[];  // For multiple choice - indices of correct options
  timeLimit: number;
  matchPairs: Array<{ left: string; right: string }>;  // For matching questions
  correctAnswer: string;  // For fill in the blank
  
  // Analytics field
  topic: string;  // Required: Main category for performance tracking
  points?: number;  // Optional: custom point value for the question
}

interface QuizResponse {
  quiz: QuizQuestion[];
  error?: string;
}

interface QuizGenerationRequest {
  topic: string;
  num_questions: number;
  content?: string;  // Optional note content
  question_types?: string[];  // Types to generate
}

export async function generateQuizFromAI(
  topic: string, 
  numQuestions: number, 
  content?: string,
  questionTypes?: string[]
): Promise<QuizQuestion[]> {
  // Debug logging
  console.log('=== generateQuizFromAI Debug ===');
  console.log('Topic:', topic);
  console.log('Num Questions:', numQuestions);
  console.log('Content provided:', !!content);
  console.log('Content length:', content?.length || 0);
  console.log('Content preview:', content?.slice(0, 200));
  console.log('Question Types:', questionTypes);
  
  const requestBody: QuizGenerationRequest = {
    topic,
    num_questions: numQuestions,
    content,
    question_types: questionTypes || ['multiple_choice', 'fill_blank', 'matching']
  };

  console.log('Request Body:', JSON.stringify(requestBody, null, 2).slice(0, 500));

  const response = await fetch("http://192.168.254.117:8000/generate-quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" }, 
    body: JSON.stringify(requestBody)
  });

  console.log('Response status:', response.status);
  console.log('Response OK:', response.ok);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error response:', errorText);
    throw new Error(`Server error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as QuizResponse;
  console.log('Response data:', JSON.stringify(data, null, 2).slice(0, 500));
  console.log('Number of questions returned:', data.quiz?.length || 0);
  
  if (data.error) {
    console.error('API returned error:', data.error);
    throw new Error(`Error: ${data.error}`);
  }

  if (!data.quiz || data.quiz.length === 0) {
    console.warn('⚠️ API returned 0 questions!');
    console.warn('This usually means the backend couldn\'t generate questions from the content');
  }

  // Ensure each question has a topic field (fallback to main topic if not provided by API)
  const questionsWithTopic = data.quiz.map((q) => ({
    ...q,
    topic: q.topic || topic || 'General',  // Fallback to main topic if not provided
    points: q.points || 1  // Default points if not provided
  }));

  return questionsWithTopic;
}

// Utility function to convert API response to internal Question format
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
    
    // Analytics fields
    topic: apiQuestion.topic || 'Uncategorized',
    points: apiQuestion.points || 1
  };
}

// Utility function to validate API question has required analytics fields
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