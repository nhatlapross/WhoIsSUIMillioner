// utils/gameLogic.ts
import { v4 as uuidv4 } from 'uuid';
import { QuizQuestion } from '@/types/game';

// Generate unique IDs
export const generateRoomId = (): string => {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
};

export const generatePlayerId = (): string => {
  return uuidv4();
};

// Default questions for multiplayer
export const getDefaultMultiplayerQuestions = (): QuizQuestion[] => [
  {
    question: "Thủ đô của Việt Nam là gì?",
    choices: ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng'],
    correctAnswer: 'a'
  },
  {
    question: "Sông nào dài nhất Việt Nam?",
    choices: ['Sông Hồng', 'Sông Mekong', 'Sông Đồng Nai', 'Sông Hương'],
    correctAnswer: 'b'
  },
  {
    question: "Đỉnh núi cao nhất Việt Nam là?",
    choices: ['Phan Xi Păng', 'Pu Ta Leng', 'Tà Chì Nhù', 'Pu Si Lung'],
    correctAnswer: 'a'
  },
  {
    question: "Tỉnh nào có diện tích lớn nhất Việt Nam?",
    choices: ['Nghệ An', 'Gia Lai', 'Lâm Đồng', 'Đắk Lắk'],
    correctAnswer: 'a'
  },
  {
    question: "Thành phố nào có biệt danh 'Thành phố Hoa phượng đỏ'?",
    choices: ['Hà Nội', 'Huế', 'Hải Phòng', 'Đà Nẵng'],
    correctAnswer: 'd'
  },
  {
    question: "Lễ hội nào nổi tiếng nhất ở Huế?",
    choices: ['Lễ hội Huế', 'Lễ hội Đền Hùng', 'Lễ hội Đầu năm', 'Lễ hội Trung thu'],
    correctAnswer: 'a'
  },
  {
    question: "Món ăn nào được coi là đặc sản của Việt Nam?",
    choices: ['Phở', 'Sushi', 'Hamburger', 'Pizza'],
    correctAnswer: 'a'
  },
  {
    question: "Ai là Chủ tịch nước Việt Nam đầu tiên?",
    choices: ['Hồ Chí Minh', 'Tôn Đức Thắng', 'Lê Duẩn', 'Võ Nguyên Giáp'],
    correctAnswer: 'a'
  },
  {
    question: "Khu di tích nào là Di sản Thế giới đầu tiên của Việt Nam?",
    choices: ['Vịnh Hạ Long', 'Phố cổ Hội An', 'Thánh địa Mỹ Sơn', 'Kinh thành Huế'],
    correctAnswer: 'a'
  },
  {
    question: "Loại tiền tệ chính thức của Việt Nam là gì?",
    choices: ['Đồng Việt Nam', 'Đô la', 'Euro', 'Yên'],
    correctAnswer: 'a'
  }
];

// Shuffle array utility
export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Calculate prize distribution (95% to winner, 5% platform fee)
export const calculatePrizeDistribution = (prizePool: number) => {
  const platformFee = prizePool * 0.05;
  const winnerPrize = prizePool * 0.95;
  
  return {
    winnerPrize,
    platformFee,
    total: prizePool
  };
};

// Validate room creation data
export const validateCreateRoomData = (data: any): { isValid: boolean; error?: string } => {
  if (!data.playerName || typeof data.playerName !== 'string') {
    return { isValid: false, error: 'Invalid player name' };
  }
  
  if (data.playerName.trim().length < 2 || data.playerName.trim().length > 20) {
    return { isValid: false, error: 'Player name must be 2-20 characters' };
  }
  
  if (!data.entryFee || typeof data.entryFee !== 'number' || data.entryFee < 0.1 || data.entryFee > 10) {
    return { isValid: false, error: 'Entry fee must be between 0.1 and 10 SUI' };
  }
  
  return { isValid: true };
};

// Validate join room data
export const validateJoinRoomData = (data: any): { isValid: boolean; error?: string } => {
  if (!data.playerName || typeof data.playerName !== 'string') {
    return { isValid: false, error: 'Invalid player name' };
  }
  
  if (data.playerName.trim().length < 2 || data.playerName.trim().length > 20) {
    return { isValid: false, error: 'Player name must be 2-20 characters' };
  }
  
  if (!data.roomId || typeof data.roomId !== 'string' || data.roomId.length !== 6) {
    return { isValid: false, error: 'Invalid room ID' };
  }
  
  return { isValid: true };
};

// Logging utility
export const logWithTimestamp = (message: string, data?: any): void => {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] ${message}`, data);
  } else {
    console.log(`[${timestamp}] ${message}`);
  }
};

// Format time remaining
export const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return '00:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Calculate game statistics
export const calculateGameStats = (room: any) => {
  const totalPlayers = room.players.length;
  const questionsAnswered = room.currentQuestion;
  const eliminationByRound = room.players
    .filter((p: any) => p.eliminated)
    .reduce((acc: any, p: any) => {
      acc[p.eliminationRound] = (acc[p.eliminationRound] || 0) + 1;
      return acc;
    }, {});

  return {
    totalPlayers,
    questionsAnswered,
    eliminationByRound
  };
};