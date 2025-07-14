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

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question: "Thủ đô của Việt Nam là gì?",
    correctAnswer: 'a'
  },
  {
    question: "Thành phố nào có biệt danh 'Thành phố Hoa phượng đỏ'?",
    choices: ['Hà Nội', 'Huế', 'Hải Phòng', 'Đà Nẵng'],
    correctAnswer: 'd'
  },
  {
    question: "Sông nào dài nhất Việt Nam?",
    choices: ['Sông Hồng', 'Sông Mekong', 'Sông Đồng Nai', 'Sông Hương'],
    correctAnswer: 'b'
  },
  {
    question: "Tỉnh nào có diện tích lớn nhất Việt Nam?",
    choices: ['Nghệ An', 'Gia Lai', 'Lâm Đồng', 'Đắk Lắk'],
    correctAnswer: 'a'
  },
  {
    question: "Đỉnh núi cao nhất Việt Nam là gì?",
    choices: ['Phan Xi Păng', 'Pu Ta Leng', 'Pu Si Lung', 'Tà Chì Nhù'],
    correctAnswer: 'a'
  }
];