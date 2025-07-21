// types/game.ts
export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandResults {
  multiHandLandmarks: HandLandmark[][];
  multiHandedness: Array<{ label: string; score: number }>;
}

export interface QuizChoice {
  id: string;
  letter: string;
  text: string;
  position: { x: number; y: number; width: number; height: number };
}

export interface QuizQuestion {
  question: string;
  choices?: string[];
  correctAnswer: string;
}

export interface GameStats {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeBonus: number;
  accuracy: number;
  finalScore: number;
  rank: string;
  prizeWon: number;
  isMillionaire: boolean;
  questionReached: number;
  safeHavenAmount: number;
}

export interface GameState {
  currentQuestion: number;
  selectedChoice: string | null;
  hoveredChoice: string | null;
  showResult: boolean;
  isCorrect: boolean | null;
  timeLeft: number;
  isTimerActive: boolean;
  lastHoveredChoice: string | null;
  score: number;
  gamePhase: 'playing' | 'result' | 'gameOver';
}

export const QUESTION_TIME_LIMIT = 15;

export const MILLIONAIRE_PRIZE_LEVELS = [
  0.1,    // Question 1
  0.2,    // Question 2
  0.3,    // Question 3
  0.4,    // Question 4
  0.5,    // Question 5 - First milestone (SAFE POINT)
  0.6,    // Question 6
  0.7,    // Question 7
  0.8,    // Question 8
  0.9,    // Question 9
  1.0,    // Question 10 - Second milestone (SAFE POINT)
  1.1,    // Question 11
  1.2,    // Question 12
  1.3,    // Question 13
  1.4,    // Question 14
  1.5     // Question 15 - MAXIMUM!
];

export const MILLIONAIRE_MILESTONES = [5, 10]; // Safe haven questions
export const SAFE_HAVEN_AMOUNTS = [0.5, 1.0]; // Guaranteed amounts at milestones

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // Questions 1-5: Easy
  {
    question: "What is the capital of France?",
    choices: ['London', 'Berlin', 'Paris', 'Madrid'],
    correctAnswer: 'c'
  },
  {
    question: "Which planet is known as the Red Planet?",
    choices: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
    correctAnswer: 'b'
  },
  {
    question: "What is 7 × 8?",
    choices: ['54', '56', '58', '60'],
    correctAnswer: 'b'
  },
  {
    question: "Which animal is the largest mammal?",
    choices: ['Elephant', 'Giraffe', 'Blue Whale', 'Hippopotamus'],
    correctAnswer: 'c'
  },
  {
    question: "What is the primary color that is NOT red or blue?",
    choices: ['Green', 'Yellow', 'Purple', 'Orange'],
    correctAnswer: 'b'
  },
  
  // Questions 6-10: Medium
  {
    question: "Which country invented pizza?",
    choices: ['France', 'Spain', 'Greece', 'Italy'],
    correctAnswer: 'd'
  },
  {
    question: "What is the smallest country in the world?",
    choices: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'],
    correctAnswer: 'b'
  },
  {
    question: "What does 'www' stand for in a website address?",
    choices: ['World Wide Web', 'World Web Wide', 'Web World Wide', 'Wide World Web'],
    correctAnswer: 'a'
  },
  {
    question: "Which ocean is the largest?",
    choices: ['Atlantic', 'Indian', 'Arctic', 'Pacific'],
    correctAnswer: 'd'
  },
  {
    question: "What is the hardest natural substance on Earth?",
    choices: ['Gold', 'Iron', 'Diamond', 'Platinum'],
    correctAnswer: 'c'
  },
  
  // Questions 11-15: Hard
  {
    question: "What year did World War II end?",
    choices: ['1944', '1945', '1946', '1947'],
    correctAnswer: 'b'
  },
  {
    question: "Which scientist developed the theory of relativity?",
    choices: ['Isaac Newton', 'Albert Einstein', 'Galileo Galilei', 'Stephen Hawking'],
    correctAnswer: 'b'
  },
  {
    question: "What is the chemical symbol for gold?",
    choices: ['Go', 'Gd', 'Au', 'Ag'],
    correctAnswer: 'c'
  },
  {
    question: "Which programming language is known for blockchain development?",
    choices: ['Python', 'Solidity', 'JavaScript', 'C++'],
    correctAnswer: 'b'
  },
  {
    question: "What does 'SUI' stand for in the Sui blockchain?",
    choices: ['Secure User Interface', 'Smart Universal Infrastructure', 'Sui Universal Intelligence', 'It is just a name'],
    correctAnswer: 'd'
  }
];