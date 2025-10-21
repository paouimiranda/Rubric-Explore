// Updated quiz API integration
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

  return data.quiz;
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
    correctAnswer: apiQuestion.correctAnswer
  };
}