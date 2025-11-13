// File: scripts/journey-expansion.ts
// Expansion script for levels 11-20
// Run this after initializing levels 1-10
// Higher difficulty, more rewards!

import { JourneyQuiz, JourneyService, Level } from '../services/journey-service';

/**
 * Educational Journey Quizzes - EXPANSION PACK (Levels 11-20)
 * Advanced topics with higher rewards
 */
const EXPANSION_QUIZZES: Omit<JourneyQuiz, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // ============================================
  // LEVEL 11 - Advanced Mathematics (Hard)
  // ============================================
  {
    title: 'Mathematical Mastery',
    description: 'Tackle complex algebra, geometry, and problem-solving',
    difficulty: 'hard',
    estimatedTime: 600,
    totalPoints: 15,
    questions: [
      {
        id: 'q1',
        type: 'multiple_choice',
        question: 'Solve for x: 2x + 5 = 3x - 7',
        options: ['x = 12', 'x = 10', 'x = -12', 'x = 2'],
        correctAnswers: [0],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 40,
        topic: 'Algebra',
        points: 1.5,
      },
      {
        id: 'q2',
        type: 'multiple_choice',
        question: 'What is the value of √144?',
        options: ['10', '11', '12', '13'],
        correctAnswers: [2],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 25,
        topic: 'Square Roots',
        points: 1.5,
      },
      {
        id: 'q3',
        type: 'multiple_choice',
        question: 'If a triangle has sides 3 cm, 4 cm, and 5 cm, what type of triangle is it?',
        options: ['Equilateral', 'Isosceles', 'Right triangle', 'Obtuse triangle'],
        correctAnswers: [2],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 35,
        topic: 'Geometry',
        points: 1.5,
      },
      {
        id: 'q4',
        type: 'multiple_choice',
        question: 'What is 3/4 × 2/3?',
        options: ['1/2', '5/7', '6/12', '5/12'],
        correctAnswers: [0],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 35,
        topic: 'Fractions',
        points: 1.5,
      },
      {
        id: 'q5',
        type: 'multiple_choice',
        question: 'What is 30% of 250?',
        options: ['65', '70', '75', '80'],
        correctAnswers: [2],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 35,
        topic: 'Percentages',
        points: 1.5,
      },
      {
        id: 'q6',
        type: 'multiple_choice',
        question: 'A store marks up items by 40%. If an item costs ₱200, what is the selling price?',
        options: ['₱240', '₱260', '₱280', '₱300'],
        correctAnswers: [2],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 45,
        topic: 'Word Problems',
        points: 1.5,
      },
      {
        id: 'q7',
        type: 'multiple_choice',
        question: 'What is the area of a circle with radius 7 cm? (Use π ≈ 3.14)',
        options: ['144 cm²', '154 cm²', '164 cm²', '174 cm²'],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 40,
        topic: 'Geometry',
        points: 1.5,
      },
      {
        id: 'q8',
        type: 'multiple_choice',
        question: 'If 5x - 3 = 22, what is x?',
        options: ['4', '5', '6', '7'],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 35,
        topic: 'Algebra',
        points: 1.5,
      },
      {
        id: 'q9',
        type: 'multiple_choice',
        question: 'What is the volume of a cube with side length 4 cm?',
        options: ['16 cm³', '32 cm³', '48 cm³', '64 cm³'],
        correctAnswers: [3],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 35,
        topic: 'Geometry',
        points: 1.5,
      },
      {
        id: 'q10',
        type: 'multiple_choice',
        question: 'What is the next number in the sequence: 2, 6, 12, 20, __?',
        options: ['28', '30', '32', '36'],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 40,
        topic: 'Patterns',
        points: 1.5,
      },
    ],
  },

  // ============================================
  // LEVEL 12 - Earth Science (Medium-Hard)
  // ============================================
  {
    title: 'Planet Earth',
    description: 'Explore geology, weather, and environmental science',
    difficulty: 'medium',
    estimatedTime: 540,
    totalPoints: 15,
    questions: [
      {
        id: 'q1',
        type: 'multiple_choice',
        question: 'What is the outermost layer of the Earth called?',
        options: ['Mantle', 'Core', 'Crust', 'Lithosphere'],
        correctAnswers: [2],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 25,
        topic: 'Geology',
        points: 1.5,
      },
      {
        id: 'q2',
        type: 'multiple_choice',
        question: 'What causes earthquakes?',
        options: ['Ocean waves', 'Tectonic plate movement', 'Wind erosion', 'Volcanic ash'],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Geology',
        points: 1.5,
      },
      {
        id: 'q3',
        type: 'multiple_choice',
        question: 'What is the process of water turning into vapor called?',
        options: ['Condensation', 'Precipitation', 'Evaporation', 'Sublimation'],
        correctAnswers: [2],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 25,
        topic: 'Water Cycle',
        points: 1.5,
      },
      {
        id: 'q4',
        type: 'multiple_choice',
        question: 'Which gas makes up about 78% of Earth\'s atmosphere?',
        options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Argon'],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Atmosphere',
        points: 1.5,
      },
      {
        id: 'q5',
        type: 'matching',
        question: 'Match the natural disaster with its primary cause.',
        options: [],
        correctAnswers: [],
        correctAnswer: '',
        matchPairs: [
          { left: 'Tsunami', right: 'Underwater earthquake' },
          { left: 'Hurricane', right: 'Warm ocean water' },
          { left: 'Tornado', right: 'Rotating thunderstorm' },
          { left: 'Drought', right: 'Lack of rainfall' }
        ],
        timeLimit: 50,
        topic: 'Natural Disasters',
        points: 1.5,
      },
      {
        id: 'q6',
        type: 'multiple_choice',
        question: 'What type of rock is formed from cooled lava?',
        options: ['Sedimentary', 'Igneous', 'Metamorphic', 'Limestone'],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Geology',
        points: 1.5,
      },
      {
        id: 'q7',
        type: 'multiple_choice',
        question: 'What is the greenhouse effect?',
        options: [
          'Plants growing in greenhouses',
          'Gases trapping heat in the atmosphere',
          'Green plants producing oxygen',
          'Solar panels generating energy'
        ],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 35,
        topic: 'Climate',
        points: 1.5,
      },
      {
        id: 'q8',
        type: 'multiple_choice',
        question: 'Which layer of the atmosphere protects us from UV radiation?',
        options: ['Troposphere', 'Stratosphere (Ozone layer)', 'Mesosphere', 'Thermosphere'],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 35,
        topic: 'Atmosphere',
        points: 1.5,
      },
      {
        id: 'q9',
        type: 'multiple_choice',
        question: 'What is the Ring of Fire?',
        options: [
          'A volcanic region around the Pacific Ocean',
          'A meteor crater',
          'A desert formation',
          'An ocean current'
        ],
        correctAnswers: [0],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 35,
        topic: 'Geology',
        points: 1.5,
      },
      {
        id: 'q10',
        type: 'multiple_choice',
        question: 'What renewable energy source uses flowing water?',
        options: ['Solar power', 'Wind power', 'Hydroelectric power', 'Geothermal power'],
        correctAnswers: [2],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 25,
        topic: 'Energy',
        points: 1.5,
      },
    ],
  },

  // ============================================
  // LEVEL 13 - World History (Hard)
  // ============================================
  {
    title: 'Historical Milestones',
    description: 'Journey through significant events that shaped our world',
    difficulty: 'hard',
    estimatedTime: 600,
    totalPoints: 15,
    questions: [
      {
        id: 'q1',
        type: 'multiple_choice',
        question: 'In which year did Christopher Columbus reach the Americas?',
        options: ['1492', '1488', '1500', '1510'],
        correctAnswers: [0],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Exploration',
        points: 1.5,
      },
      {
        id: 'q2',
        type: 'multiple_choice',
        question: 'Who was the first person to walk on the moon?',
        options: ['Buzz Aldrin', 'Neil Armstrong', 'Yuri Gagarin', 'John Glenn'],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 25,
        topic: 'Space Exploration',
        points: 1.5,
      },
      {
        id: 'q3',
        type: 'multiple_choice',
        question: 'The Great Wall of China was primarily built to protect against which invaders?',
        options: ['Mongols', 'Japanese', 'Russians', 'Europeans'],
        correctAnswers: [0],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Ancient History',
        points: 1.5,
      },
      {
        id: 'q4',
        type: 'matching',
        question: 'Match the historical figure with their achievement.',
        options: [],
        correctAnswers: [],
        correctAnswer: '',
        matchPairs: [
          { left: 'Albert Einstein', right: 'Theory of Relativity' },
          { left: 'Marie Curie', right: 'Radioactivity research' },
          { left: 'Nelson Mandela', right: 'Anti-apartheid leader' },
          { left: 'Martin Luther King Jr.', right: 'Civil Rights Movement' }
        ],
        timeLimit: 50,
        topic: 'Notable Figures',
        points: 1.5,
      },
      {
        id: 'q5',
        type: 'multiple_choice',
        question: 'Which empire was ruled by Julius Caesar?',
        options: ['Greek Empire', 'Roman Empire', 'Persian Empire', 'Ottoman Empire'],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 25,
        topic: 'Ancient Rome',
        points: 1.5,
      },
      {
        id: 'q6',
        type: 'multiple_choice',
        question: 'What year did World War I begin?',
        options: ['1912', '1914', '1916', '1918'],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Modern History',
        points: 1.5,
      },
      {
        id: 'q7',
        type: 'multiple_choice',
        question: 'Who wrote the Declaration of Independence?',
        options: ['George Washington', 'Benjamin Franklin', 'Thomas Jefferson', 'John Adams'],
        correctAnswers: [2],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'American History',
        points: 1.5,
      },
      {
        id: 'q8',
        type: 'multiple_choice',
        question: 'The Industrial Revolution began in which country?',
        options: ['France', 'Germany', 'United States', 'Great Britain'],
        correctAnswers: [3],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Industrial Revolution',
        points: 1.5,
      },
      {
        id: 'q9',
        type: 'fill_blank',
        question: 'The Berlin Wall fell in the year ___.',
        options: [],
        correctAnswers: [],
        correctAnswer: '1989',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Modern History',
        points: 1.5,
      },
      {
        id: 'q10',
        type: 'multiple_choice',
        question: 'Which ancient wonder is the only one still standing?',
        options: [
          'Hanging Gardens of Babylon',
          'Colossus of Rhodes',
          'Great Pyramid of Giza',
          'Lighthouse of Alexandria'
        ],
        correctAnswers: [2],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 35,
        topic: 'Ancient Wonders',
        points: 1.5,
      },
    ],
  },

  // ============================================
  // LEVEL 14 - Literature & Language (Medium-Hard)
  // ============================================
  {
    title: 'Literary World',
    description: 'Explore classic literature and advanced language skills',
    difficulty: 'medium',
    estimatedTime: 540,
    totalPoints: 15,
    questions: [
      {
        id: 'q1',
        type: 'multiple_choice',
        question: 'Who wrote "Romeo and Juliet"?',
        options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 25,
        topic: 'Literature',
        points: 1.5,
      },
      {
        id: 'q2',
        type: 'multiple_choice',
        question: 'What is a haiku?',
        options: [
          'A Japanese poem with 3 lines',
          'A type of novel',
          'A short story',
          'A play'
        ],
        correctAnswers: [0],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 25,
        topic: 'Poetry',
        points: 1.5,
      },
      {
        id: 'q3',
        type: 'multiple_choice',
        question: 'Which word is the antonym of "ancient"?',
        options: ['Old', 'Modern', 'Historic', 'Aged'],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 20,
        topic: 'Vocabulary',
        points: 1.5,
      },
      {
        id: 'q4',
        type: 'matching',
        question: 'Match the author with their famous work.',
        options: [],
        correctAnswers: [],
        correctAnswer: '',
        matchPairs: [
          { left: 'J.K. Rowling', right: 'Harry Potter' },
          { left: 'J.R.R. Tolkien', right: 'The Lord of the Rings' },
          { left: 'C.S. Lewis', right: 'The Chronicles of Narnia' },
          { left: 'Roald Dahl', right: 'Charlie and the Chocolate Factory' }
        ],
        timeLimit: 45,
        topic: 'Literature',
        points: 1.5,
      },
      {
        id: 'q5',
        type: 'multiple_choice',
        question: 'What is personification?',
        options: [
          'Comparing two things using "like" or "as"',
          'Giving human qualities to non-human things',
          'An exaggeration',
          'A word that sounds like what it means'
        ],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Literary Devices',
        points: 1.5,
      },
      {
        id: 'q6',
        type: 'multiple_choice',
        question: 'Which sentence uses correct punctuation?',
        options: [
          'Lets eat grandma!',
          'Let\'s eat, grandma!',
          'Lets eat, grandma.',
          'Let\'s eat grandma'
        ],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Grammar',
        points: 1.5,
      },
      {
        id: 'q7',
        type: 'multiple_choice',
        question: 'What is an autobiography?',
        options: [
          'A story about someone\'s life written by another person',
          'A story about someone\'s life written by themselves',
          'A fictional story',
          'A collection of poems'
        ],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 25,
        topic: 'Literary Forms',
        points: 1.5,
      },
      {
        id: 'q8',
        type: 'fill_blank',
        question: 'The past tense of "begin" is ___.',
        options: [],
        correctAnswers: [],
        correctAnswer: 'began',
        matchPairs: [],
        timeLimit: 20,
        topic: 'Verb Forms',
        points: 1.5,
      },
      {
        id: 'q9',
        type: 'multiple_choice',
        question: 'Which of these is a compound sentence?',
        options: [
          'I went to the store.',
          'I went to the store, and I bought milk.',
          'Because I was hungry.',
          'Running quickly down the street.'
        ],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 35,
        topic: 'Sentence Structure',
        points: 1.5,
      },
      {
        id: 'q10',
        type: 'multiple_choice',
        question: 'What is the theme of a story?',
        options: [
          'The time and place',
          'The main character',
          'The central message or lesson',
          'The ending'
        ],
        correctAnswers: [2],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Literary Elements',
        points: 1.5,
      },
    ],
  },

  // ============================================
  // LEVEL 15 - Human Body & Health (Medium-Hard)
  // ============================================
  {
    title: 'Human Anatomy',
    description: 'Discover how your body works and stays healthy',
    difficulty: 'medium',
    estimatedTime: 540,
    totalPoints: 15,
    questions: [
      {
        id: 'q1',
        type: 'multiple_choice',
        question: 'How many bones are in the adult human body?',
        options: ['186', '196', '206', '216'],
        correctAnswers: [2],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 25,
        topic: 'Skeletal System',
        points: 1.5,
      },
      {
        id: 'q2',
        type: 'multiple_choice',
        question: 'What is the largest organ inside the human body?',
        options: ['Heart', 'Liver', 'Brain', 'Lungs'],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 25,
        topic: 'Organs',
        points: 1.5,
      },
      {
        id: 'q3',
        type: 'matching',
        question: 'Match the body system with its primary function.',
        options: [],
        correctAnswers: [],
        correctAnswer: '',
        matchPairs: [
          { left: 'Circulatory System', right: 'Pumps blood' },
          { left: 'Respiratory System', right: 'Breathing' },
          { left: 'Digestive System', right: 'Processes food' },
          { left: 'Nervous System', right: 'Controls body functions' }
        ],
        timeLimit: 45,
        topic: 'Body Systems',
        points: 1.5,
      },
      {
        id: 'q4',
        type: 'multiple_choice',
        question: 'Which vitamin is produced when skin is exposed to sunlight?',
        options: ['Vitamin A', 'Vitamin C', 'Vitamin D', 'Vitamin E'],
        correctAnswers: [2],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Nutrition',
        points: 1.5,
      },
      {
        id: 'q5',
        type: 'multiple_choice',
        question: 'What is the normal human body temperature in Celsius?',
        options: ['35°C', '37°C', '39°C', '40°C'],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 25,
        topic: 'Health',
        points: 1.5,
      },
      {
        id: 'q6',
        type: 'multiple_choice',
        question: 'Which part of the brain controls balance and coordination?',
        options: ['Cerebrum', 'Cerebellum', 'Brain stem', 'Hippocampus'],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Brain',
        points: 1.5,
      },
      {
        id: 'q7',
        type: 'multiple_choice',
        question: 'How many chambers does the human heart have?',
        options: ['2', '3', '4', '5'],
        correctAnswers: [2],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 25,
        topic: 'Circulatory System',
        points: 1.5,
      },
      {
        id: 'q8',
        type: 'multiple_choice',
        question: 'What carries oxygen in the blood?',
        options: ['White blood cells', 'Red blood cells', 'Platelets', 'Plasma'],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 25,
        topic: 'Circulatory System',
        points: 1.5,
      },
      {
        id: 'q9',
        type: 'multiple_choice',
        question: 'Which muscle type is found in the heart?',
        options: ['Skeletal muscle', 'Smooth muscle', 'Cardiac muscle', 'Voluntary muscle'],
        correctAnswers: [2],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Muscular System',
        points: 1.5,
      },
      {
        id: 'q10',
        type: 'multiple_choice',
        question: 'What is the main function of white blood cells?',
        options: [
          'Carry oxygen',
          'Fight infections',
          'Clot blood',
          'Transport nutrients'
        ],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 25,
        topic: 'Immune System',
        points: 1.5,
      },
    ],
  },

  // ============================================
  // LEVEL 16 - Technology & Innovation (Medium-Hard)
  // ============================================
  {
    title: 'Digital Age',
    description: 'Explore computers, internet, and modern technology',
    difficulty: 'medium',
    estimatedTime: 540,
    totalPoints: 15,
    questions: [
      {
        id: 'q1',
        type: 'multiple_choice',
        question: 'What does "WWW" stand for in a website address?',
        options: [
          'World Wide Web',
          'World Web Wire',
          'Wide Web World',
          'Web World Wide'
        ],
        correctAnswers: [0],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 25,
        topic: 'Internet',
        points: 1.5,
      },
      {
        id: 'q2',
        type: 'multiple_choice',
        question: 'Who is credited with inventing the World Wide Web?',
        options: ['Bill Gates', 'Steve Jobs', 'Tim Berners-Lee', 'Mark Zuckerberg'],
        correctAnswers: [2],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Internet History',
        points: 1.5,
      },
      {
        id: 'q3',
        type: 'multiple_choice',
        question: 'What does "AI" stand for?',
        options: [
          'Automated Intelligence',
          'Artificial Intelligence',
          'Advanced Internet',
          'Applied Information'
        ],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 20,
        topic: 'Technology',
        points: 1.5,
      },
      {
        id: 'q4',
        type: 'matching',
        question: 'Match the technology company with its founder.',
        options: [],
        correctAnswers: [],
        correctAnswer: '',
        matchPairs: [
          { left: 'Apple', right: 'Steve Jobs' },
          { left: 'Microsoft', right: 'Bill Gates' },
          { left: 'Facebook', right: 'Mark Zuckerberg' },
          { left: 'Amazon', right: 'Jeff Bezos' }
        ],
        timeLimit: 45,
        topic: 'Tech Companies',
        points: 1.5,
      },
      {
        id: 'q5',
        type: 'multiple_choice',
        question: 'What is the brain of a computer called?',
        options: ['RAM', 'Hard Drive', 'CPU', 'Motherboard'],
        correctAnswers: [2],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 25,
        topic: 'Computer Hardware',
        points: 1.5,
      },
      {
        id: 'q6',
        type: 'multiple_choice',
        question: 'What does "USB" stand for?',
        options: [
          'Universal Serial Bus',
          'United System Base',
          'Universal System Block',
          'Unified Serial Base'
        ],
        correctAnswers: [0],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Computer Hardware',
        points: 1.5,
      },
      {
        id: 'q7',
        type: 'multiple_choice',
        question: 'What is virtual reality (VR)?',
        options: [
          'A type of computer virus',
          'An immersive computer-generated environment',
          'A programming language',
          'A type of social media'
        ],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Emerging Tech',
        points: 1.5,
      },
      {
        id: 'q8',
        type: 'multiple_choice',
        question: 'What is coding?',
        options: [
          'Playing video games',
          'Writing instructions for computers',
          'Using social media',
          'Watching videos online'
        ],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 25,
        topic: 'Programming',
        points: 1.5,
      },
      {
        id: 'q9',
        type: 'multiple_choice',
        question: 'What is "cloud storage"?',
        options: [
          'Storing data on physical hard drives',
          'Storing data on remote servers via internet',
          'Saving files on USB drives',
          'Keeping paper documents'
        ],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Cloud Computing',
        points: 1.5,
      },
      {
        id: 'q10',
        type: 'multiple_choice',
        question: 'What is a computer bug?',
        options: [
          'An insect inside a computer',
          'An error in computer code',
          'A computer virus',
          'A type of hardware'
        ],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 25,
        topic: 'Programming',
        points: 1.5,
      },
    ],
  },

  // ============================================
  // LEVEL 17 - Space & Astronomy (Hard)
  // ============================================
  {
    title: 'Cosmic Exploration',
    description: 'Journey through our solar system and beyond',
    difficulty: 'hard',
    estimatedTime: 600,
    totalPoints: 20,
    questions: [
      {
        id: 'q1',
        type: 'multiple_choice',
        question: 'How many planets are in our solar system?',
        options: ['7', '8', '9', '10'],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 20,
        topic: 'Solar System',
        points: 2,
      },
      {
        id: 'q2',
        type: 'multiple_choice',
        question: 'Which planet is known as the "Red Planet"?',
        options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 20,
        topic: 'Planets',
        points: 2,
      },
      {
        id: 'q3',
        type: 'multiple_choice',
        question: 'What is the name of Earth\'s natural satellite?',
        options: ['Luna', 'The Moon', 'Both A and B', 'Selene'],
        correctAnswers: [2],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 25,
        topic: 'Moon',
        points: 2,
      },
      {
        id: 'q4',
        type: 'matching',
        question: 'Match the planet with its distinctive feature.',
        options: [],
        correctAnswers: [],
        correctAnswer: '',
        matchPairs: [
          { left: 'Saturn', right: 'Rings' },
          { left: 'Jupiter', right: 'Great Red Spot' },
          { left: 'Venus', right: 'Hottest planet' },
          { left: 'Neptune', right: 'Farthest from Sun' }
        ],
        timeLimit: 50,
        topic: 'Planets',
        points: 2,
      },
      {
        id: 'q5',
        type: 'multiple_choice',
        question: 'What is a light-year?',
        options: [
          'A unit of time',
          'A unit of distance',
          'A type of star',
          'A space vehicle'
        ],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Astronomy Concepts',
        points: 2,
      },
      {
        id: 'q6',
        type: 'multiple_choice',
        question: 'What is the name of our galaxy?',
        options: ['Andromeda', 'Milky Way', 'Whirlpool', 'Sombrero'],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 25,
        topic: 'Galaxies',
        points: 2,
      },
      {
        id: 'q7',
        type: 'multiple_choice',
        question: 'What force keeps planets in orbit around the Sun?',
        options: ['Magnetism', 'Gravity', 'Friction', 'Momentum'],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 25,
        topic: 'Physics',
        points: 2,
      },
      {
        id: 'q8',
        type: 'multiple_choice',
        question: 'What is a supernova?',
        options: [
          'A new planet',
          'An exploding star',
          'A type of comet',
          'A space station'
        ],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Stars',
        points: 2,
      },
      {
        id: 'q9',
        type: 'fill_blank',
        question: 'The Sun is classified as a ___ star.',
        options: [],
        correctAnswers: [],
        correctAnswer: 'yellow dwarf',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Stars',
        points: 2,
      },
      {
        id: 'q10',
        type: 'multiple_choice',
        question: 'What is the International Space Station (ISS)?',
        options: [
          'A rocket',
          'A satellite',
          'A space laboratory orbiting Earth',
          'A telescope'
        ],
        correctAnswers: [2],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Space Exploration',
        points: 2,
      },
    ],
  },

  // ============================================
  // LEVEL 18 - Economics & Money (Medium-Hard)
  // ============================================
  {
    title: 'Financial Literacy',
    description: 'Learn about money, business, and economics',
    difficulty: 'medium',
    estimatedTime: 540,
    totalPoints: 20,
    questions: [
      {
        id: 'q1',
        type: 'multiple_choice',
        question: 'What is inflation?',
        options: [
          'When prices decrease over time',
          'When prices increase over time',
          'When banks close',
          'When stocks go down'
        ],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Economics',
        points: 2,
      },
      {
        id: 'q2',
        type: 'multiple_choice',
        question: 'What does GDP stand for?',
        options: [
          'General Domestic Product',
          'Gross Domestic Product',
          'Global Development Plan',
          'Government Debt Payment'
        ],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Economics',
        points: 2,
      },
      {
        id: 'q3',
        type: 'multiple_choice',
        question: 'What is a budget?',
        options: [
          'A type of bank account',
          'A plan for spending and saving money',
          'A loan from a bank',
          'A credit card'
        ],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 25,
        topic: 'Personal Finance',
        points: 2,
      },
      {
        id: 'q4',
        type: 'matching',
        question: 'Match the financial term with its definition.',
        options: [],
        correctAnswers: [],
        correctAnswer: '',
        matchPairs: [
          { left: 'Interest', right: 'Money earned or paid on savings/loans' },
          { left: 'Investment', right: 'Putting money to grow wealth' },
          { left: 'Debt', right: 'Money owed to someone' },
          { left: 'Savings', right: 'Money set aside for future' }
        ],
        timeLimit: 50,
        topic: 'Financial Terms',
        points: 2,
      },
      {
        id: 'q5',
        type: 'multiple_choice',
        question: 'What is supply and demand?',
        options: [
          'Types of banks',
          'Economic forces that determine prices',
          'Government policies',
          'Types of currency'
        ],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 35,
        topic: 'Economics',
        points: 2,
      },
      {
        id: 'q6',
        type: 'multiple_choice',
        question: 'What is an entrepreneur?',
        options: [
          'A bank employee',
          'Someone who starts their own business',
          'A government worker',
          'A teacher'
        ],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 25,
        topic: 'Business',
        points: 2,
      },
      {
        id: 'q7',
        type: 'multiple_choice',
        question: 'What is the stock market?',
        options: [
          'A grocery store',
          'Where company shares are bought and sold',
          'A type of bank',
          'A shopping mall'
        ],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Investing',
        points: 2,
      },
      {
        id: 'q8',
        type: 'multiple_choice',
        question: 'What is a credit score?',
        options: [
          'Points earned while shopping',
          'A measure of creditworthiness',
          'A bank account balance',
          'A type of loan'
        ],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Personal Finance',
        points: 2,
      },
      {
        id: 'q9',
        type: 'multiple_choice',
        question: 'What is cryptocurrency?',
        options: [
          'Digital currency using encryption',
          'Paper money from other countries',
          'Gold and silver coins',
          'Credit cards'
        ],
        correctAnswers: [0],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Modern Finance',
        points: 2,
      },
      {
        id: 'q10',
        type: 'multiple_choice',
        question: 'What is compound interest?',
        options: [
          'Interest paid only once',
          'Interest earned on interest',
          'A type of loan',
          'A bank fee'
        ],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Personal Finance',
        points: 2,
      },
    ],
  },

  // ============================================
  // LEVEL 19 - Arts & Music (Medium-Hard)
  // ============================================
  {
    title: 'Creative Expression',
    description: 'Explore the world of art, music, and creativity',
    difficulty: 'medium',
    estimatedTime: 540,
    totalPoints: 20,
    questions: [
      {
        id: 'q1',
        type: 'multiple_choice',
        question: 'Which artist is famous for cutting off his own ear?',
        options: ['Pablo Picasso', 'Vincent van Gogh', 'Claude Monet', 'Salvador Dalí'],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 25,
        topic: 'Art History',
        points: 2,
      },
      {
        id: 'q2',
        type: 'multiple_choice',
        question: 'What are the three primary colors?',
        options: [
          'Red, Green, Blue',
          'Red, Yellow, Blue',
          'Orange, Purple, Green',
          'Black, White, Gray'
        ],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 25,
        topic: 'Color Theory',
        points: 2,
      },
      {
        id: 'q3',
        type: 'matching',
        question: 'Match the famous composer with their era.',
        options: [],
        correctAnswers: [],
        correctAnswer: '',
        matchPairs: [
          { left: 'Mozart', right: 'Classical' },
          { left: 'Bach', right: 'Baroque' },
          { left: 'Beethoven', right: 'Classical/Romantic' },
          { left: 'Chopin', right: 'Romantic' }
        ],
        timeLimit: 50,
        topic: 'Music History',
        points: 2,
      },
      {
        id: 'q4',
        type: 'multiple_choice',
        question: 'How many lines are on a musical staff?',
        options: ['4', '5', '6', '7'],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 20,
        topic: 'Music Theory',
        points: 2,
      },
      {
        id: 'q5',
        type: 'multiple_choice',
        question: 'What is the Louvre famous for?',
        options: [
          'Being the world\'s largest art museum',
          'Being the tallest building',
          'Being a theme park',
          'Being a library'
        ],
        correctAnswers: [0],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 25,
        topic: 'Museums',
        points: 2,
      },
      {
        id: 'q6',
        type: 'multiple_choice',
        question: 'What technique did Michelangelo use to paint the Sistine Chapel ceiling?',
        options: ['Oil painting', 'Watercolor', 'Fresco', 'Acrylic'],
        correctAnswers: [2],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Art Techniques',
        points: 2,
      },
      {
        id: 'q7',
        type: 'multiple_choice',
        question: 'What is an orchestra?',
        options: [
          'A solo musician',
          'A large group of musicians playing together',
          'A type of instrument',
          'A music school'
        ],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 25,
        topic: 'Music',
        points: 2,
      },
      {
        id: 'q8',
        type: 'multiple_choice',
        question: 'Which art movement is Pablo Picasso most associated with?',
        options: ['Impressionism', 'Cubism', 'Surrealism', 'Renaissance'],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Art Movements',
        points: 2,
      },
      {
        id: 'q9',
        type: 'fill_blank',
        question: 'The four main families of instruments in an orchestra are strings, woodwinds, brass, and ___.',
        options: [],
        correctAnswers: [],
        correctAnswer: 'percussion',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Musical Instruments',
        points: 2,
      },
      {
        id: 'q10',
        type: 'multiple_choice',
        question: 'What is perspective in art?',
        options: [
          'Using only one color',
          'Creating depth and distance on flat surface',
          'Painting only portraits',
          'Using watercolors'
        ],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 30,
        topic: 'Art Techniques',
        points: 2,
      },
    ],
  },

  // ============================================
  // LEVEL 20 - Critical Thinking & Logic (Hard)
  // ============================================
  {
    title: 'Master Mind',
    description: 'Challenge yourself with puzzles, logic, and reasoning',
    difficulty: 'hard',
    estimatedTime: 720,
    totalPoints: 25,
    questions: [
      {
        id: 'q1',
        type: 'multiple_choice',
        question: 'If all roses are flowers, and some flowers fade quickly, can we conclude that some roses fade quickly?',
        options: [
          'Yes, definitely',
          'No, we cannot conclude that',
          'Only if they are red roses',
          'Only in summer'
        ],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 45,
        topic: 'Logic',
        points: 2.5,
      },
      {
        id: 'q2',
        type: 'multiple_choice',
        question: 'What comes next in the sequence: 1, 4, 9, 16, 25, __?',
        options: ['30', '32', '36', '40'],
        correctAnswers: [2],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 35,
        topic: 'Patterns',
        points: 2.5,
      },
      {
        id: 'q3',
        type: 'multiple_choice',
        question: 'If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?',
        options: ['5 minutes', '20 minutes', '100 minutes', '500 minutes'],
        correctAnswers: [0],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 50,
        topic: 'Problem Solving',
        points: 2.5,
      },
      {
        id: 'q4',
        type: 'multiple_choice',
        question: 'A bat and a ball cost ₱110 in total. The bat costs ₱100 more than the ball. How much does the ball cost?',
        options: ['₱10', '₱5', '₱15', '₱20'],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 50,
        topic: 'Problem Solving',
        points: 2.5,
      },
      {
        id: 'q5',
        type: 'multiple_choice',
        question: 'Which word does NOT belong: Triangle, Circle, Square, Hexagon, Cube',
        options: ['Triangle', 'Circle', 'Square', 'Cube'],
        correctAnswers: [3],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 40,
        topic: 'Classification',
        points: 2.5,
      },
      {
        id: 'q6',
        type: 'multiple_choice',
        question: 'If you rearrange the letters "CIFAIPC" you would have the name of a(n):',
        options: ['City', 'Animal', 'Ocean', 'Country'],
        correctAnswers: [2],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 45,
        topic: 'Word Puzzles',
        points: 2.5,
      },
      {
        id: 'q7',
        type: 'multiple_choice',
        question: 'What is the missing number: 2, 6, 12, 20, 30, __?',
        options: ['38', '40', '42', '44'],
        correctAnswers: [2],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 45,
        topic: 'Patterns',
        points: 2.5,
      },
      {
        id: 'q8',
        type: 'multiple_choice',
        question: 'A farmer has 17 sheep. All but 9 die. How many are left?',
        options: ['8', '9', '0', '17'],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 40,
        topic: 'Logic',
        points: 2.5,
      },
      {
        id: 'q9',
        type: 'multiple_choice',
        question: 'You are in a room with 3 switches. Each switch controls one of three light bulbs in another room. You can only enter the other room once. How can you determine which switch controls which bulb?',
        options: [
          'Turn on switch 1, wait, turn it off, turn on switch 2, then check',
          'Turn on all switches',
          'It\'s impossible',
          'Turn on one switch only'
        ],
        correctAnswers: [0],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 60,
        topic: 'Problem Solving',
        points: 2.5,
      },
      {
        id: 'q10',
        type: 'multiple_choice',
        question: 'What is the value of X? X + X = 4, X × X = 4',
        options: ['1', '2', '3', '4'],
        correctAnswers: [1],
        correctAnswer: '',
        matchPairs: [],
        timeLimit: 45,
        topic: 'Logic',
        points: 2.5,
      },
    ],
  },
];

/**
 * Level definitions for expansion (Levels 11-20)
 */
const EXPANSION_LEVELS: Omit<Level, 'id' | 'unlocked' | 'completed' | 'stars'>[] = [
  {
    title: 'Mathematical Mastery',
    description: 'Tackle complex algebra and geometry problems',
    quizId: '',
    gradient: ['#667eea', '#764ba2'],
    requiredLevel: 7,
    shardsReward: 20,
    xpReward: 200,
  },
  {
    title: 'Planet Earth',
    description: 'Explore geology, weather, and environmental science',
    quizId: '',
    gradient: ['#38ef7d', '#11998e'],
    requiredLevel: 8,
    shardsReward: 20,
    xpReward: 200,
  },
  {
    title: 'Historical Milestones',
    description: 'Journey through significant world events',
    quizId: '',
    gradient: ['#fa709a', '#fee140'],
    requiredLevel: 9,
    shardsReward: 20,
    xpReward: 200,
  },
  {
    title: 'Literary World',
    description: 'Explore classic literature and advanced language',
    quizId: '',
    gradient: ['#a8edea', '#fed6e3'],
    requiredLevel: 10,
    shardsReward: 20,
    xpReward: 200,
  },
  {
    title: 'Human Anatomy',
    description: 'Discover how your body works and stays healthy',
    quizId: '',
    gradient: ['#fbc2eb', '#a6c1ee'],
    requiredLevel: 11,
    shardsReward: 20,
    xpReward: 200,
  },
  {
    title: 'Digital Age',
    description: 'Explore computers, internet, and technology',
    quizId: '',
    gradient: ['#84fab0', '#8fd3f4'],
    requiredLevel: 12,
    shardsReward: 20,
    xpReward: 200,
  },
  {
    title: 'Cosmic Exploration',
    description: 'Journey through our solar system and beyond',
    quizId: '',
    gradient: ['#4facfe', '#00f2fe'],
    requiredLevel: 13,
    shardsReward: 25,
    xpReward: 250,
  },
  {
    title: 'Financial Literacy',
    description: 'Learn about money, business, and economics',
    quizId: '',
    gradient: ['#43e97b', '#38f9d7'],
    requiredLevel: 14,
    shardsReward: 25,
    xpReward: 250,
  },
  {
    title: 'Creative Expression',
    description: 'Explore the world of art, music, and creativity',
    quizId: '',
    gradient: ['#fa709a', '#fee140'],
    requiredLevel: 15,
    shardsReward: 25,
    xpReward: 250,
  },
  {
    title: 'Master Mind',
    description: 'Challenge yourself with puzzles and logic',
    quizId: '',
    gradient: ['#30cfd0', '#330867'],
    requiredLevel: 16,
    shardsReward: 30,
    xpReward: 300,
  },
];

/**
 * Initialize expansion levels (11-20)
 */
export async function initializeExpansionLevels() {
  try {
    console.log('╔═══════════════════════════════════════╗');
    console.log('║   Journey Expansion (Levels 11-20)   ║');
    console.log('╚═══════════════════════════════════════╝\n');
    
    console.log('📝 Creating expansion quizzes...\n');
    const quizIds: string[] = [];
    
    // Create all expansion quizzes
    for (let i = 0; i < EXPANSION_QUIZZES.length; i++) {
      const quiz = EXPANSION_QUIZZES[i];
      const levelNum = i + 11; // Starting from level 11
      
      console.log(`[${levelNum}/20] Creating: ${quiz.title}`);
      console.log(`   Difficulty: ${quiz.difficulty}`);
      console.log(`   Questions: ${quiz.questions.length}`);
      console.log(`   Total Points: ${quiz.totalPoints}`);
      
      const quizId = await JourneyService.createJourneyQuizAdmin(quiz);
      quizIds.push(quizId);
      console.log(`   ✅ Created with ID: ${quizId}\n`);
    }
    
    console.log('✅ All expansion quizzes created!\n');
    
    // Prepare expansion levels with quiz IDs
    console.log('📋 Preparing expansion levels...\n');
    const levelsToCreate = EXPANSION_LEVELS.map((level, index) => ({
      ...level,
      id: index + 11, // Starting from level 11
      quizId: quizIds[index],
    }));
    
    // Create expansion levels
    console.log('🏗️  Creating expansion levels...\n');
    await JourneyService.initializeLevelsAdmin(levelsToCreate);
    
    // Display summary
    console.log('\n📊 Expansion Summary:');
    console.log('═══════════════════════════════════════');
    console.log(`✓ New quizzes created: ${quizIds.length}`);
    console.log(`✓ New levels created: ${levelsToCreate.length}`);
    console.log(`✓ Total questions: ${EXPANSION_QUIZZES.reduce((sum, q) => sum + q.questions.length, 0)}`);
    console.log(`✓ Level range: 11-20`);
    console.log(`✓ Total shards available: ${EXPANSION_LEVELS.reduce((sum, l) => sum + l.shardsReward * 3, 0)} (all 3-star)`);
    console.log(`✓ Total XP available: ${EXPANSION_LEVELS.reduce((sum, l) => sum + l.xpReward, 0)}`);
    console.log('═══════════════════════════════════════');
    
    console.log('\n🎉 Expansion levels initialized successfully!');
    console.log('Players can now progress through levels 11-20!');
    
    return {
      success: true,
      quizIds,
      levelCount: levelsToCreate.length,
    };
  } catch (error) {
    console.error('\n❌ Error initializing expansion:', error);
    throw error;
  }
}

/**
 * Verify expansion levels
 */
export async function verifyExpansion() {
  try {
    console.log('🔍 Verifying Expansion Levels...\n');
    
    const allQuizzes = await JourneyService.getAllJourneyQuizzesAdmin();
    const allLevels = await JourneyService.getAllLevelsAdmin();
    
    const expansionQuizzes = allQuizzes.filter((_, i) => i >= 10);
    const expansionLevels = allLevels.filter(l => parseInt(l.id) >= 11);
    
    console.log('📊 Expansion Status:');
    console.log('═══════════════════════════════════════');
    console.log(`Expansion Quizzes: ${expansionQuizzes.length}/10`);
    console.log(`Expansion Levels: ${expansionLevels.length}/10`);
    console.log('═══════════════════════════════════════\n');
    
    console.log('📚 Expansion Quiz List:');
    expansionQuizzes.forEach((quiz, index) => {
      console.log(`Level ${index + 11}: ${quiz.title}`);
      console.log(`   Difficulty: ${quiz.difficulty}`);
      console.log(`   Questions: ${quiz.questions.length}`);
      console.log(`   Points: ${quiz.totalPoints}`);
    });
    
    console.log('\n🎮 Expansion Level List:');
    expansionLevels.forEach((level) => {
      console.log(`Level ${level.id}: ${level.title}`);
      console.log(`   Quiz ID: ${level.quizId}`);
      console.log(`   Rewards: ${level.shardsReward} shards, ${level.xpReward} XP`);
      console.log(`   Required Level: ${level.requiredLevel || 'None'}`);
    });
    
    return { expansionQuizzes, expansionLevels };
  } catch (error) {
    console.error('❌ Error verifying expansion:', error);
    throw error;
  }
}

// Run script if executed directly
if (require.main === module) {
  (async () => {
    try {
      await initializeExpansionLevels();
      
      console.log('\n⏳ Waiting 2 seconds before verification...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('\n' + '═'.repeat(40));
      await verifyExpansion();
      
      console.log('\n✨ Expansion setup completed!');
      process.exit(0);
    } catch (error) {
      console.error('\n💥 Expansion setup failed:', error);
      process.exit(1);
    }
  })();
}

/**
 * USAGE INSTRUCTIONS
 * ==================
 * 
 * PREREQUISITE:
 * - Make sure levels 1-10 are already initialized using journey-setup.ts
 * 
 * METHOD 1: Run directly from command line
 * ----------------------------------------
 * ts-node scripts/journey-expansion.ts
 * 
 * METHOD 2: Import and use in your code
 * --------------------------------------
 * import { initializeExpansionLevels, verifyExpansion } from './scripts/journey-expansion';
 * 
 * // Initialize expansion levels
 * await initializeExpansionLevels();
 * 
 * // Verify expansion
 * await verifyExpansion();
 * 
 * WHAT THIS SCRIPT DOES:
 * ----------------------
 * ✓ Creates 10 new journey quizzes (Levels 11-20)
 * ✓ Creates 10 new level definitions
 * ✓ Higher difficulty and better rewards than levels 1-10
 * ✓ Total of 100 new questions across various subjects
 * ✓ Unlocks progressively based on previous level completion
 * 
 * EXPANSION CONTENT:
 * ------------------
 * Level 11: Mathematical Mastery (Hard) - 15 points
 * Level 12: Planet Earth (Medium) - 15 points
 * Level 13: Historical Milestones (Hard) - 15 points
 * Level 14: Literary World (Medium) - 15 points
 * Level 15: Human Anatomy (Medium) - 15 points
 * Level 16: Digital Age (Medium) - 15 points
 * Level 17: Cosmic Exploration (Hard) - 20 points
 * Level 18: Financial Literacy (Medium) - 20 points
 * Level 19: Creative Expression (Medium) - 20 points
 * Level 20: Master Mind (Hard) - 25 points
 * 
 * TOTAL REWARDS:
 * --------------
 * - Shards: 220 (if all 3-star completion)
 * - XP: 2,200
 * - Questions: 100
 */

// Export constants for potential reuse
export { EXPANSION_LEVELS, EXPANSION_QUIZZES };
