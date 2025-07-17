// types/multiplayer.ts
import { WebSocket } from 'ws';
import { QuizQuestion } from './game';

// Message Types
export enum MessageType {
  // Room management
  CREATE_ROOM = 'create_room',
  JOIN_ROOM = 'join_room', 
  LEAVE_ROOM = 'leave_room',
  ROOM_UPDATE = 'room_update',

  // Game flow
  START_GAME = 'start_game',
  GAME_STARTED = 'game_started',
  NEXT_QUESTION = 'next_question',

  // Player actions
  PLAYER_ANSWER = 'player_answer',
  PLAYER_ELIMINATED = 'player_eliminated',

  // Game events
  GAME_OVER = 'game_over',
  WINNER_ANNOUNCED = 'winner_announced',

  // System
  ERROR = 'error',
  PING = 'ping',
  PONG = 'pong'
}

// Game States
export enum GameState {
  WAITING = 'waiting',
  STARTING = 'starting', 
  PLAYING = 'playing',
  FINISHED = 'finished'
}

// Player Interface
export interface Player {
  id: string;
  name: string;
  connection: WebSocket;
  eliminated: boolean;
  currentAnswer?: string;
  answerTime?: number;
  eliminationRound?: number;
}

// Room Interface
export interface Room {
  id: string;
  creator: string;
  entryFee: number;
  players: Player[];
  state: GameState;
  currentQuestion: number;
  questions: QuizQuestion[];
  prizePool: number;
  maxPlayers: number;
  startTime: number | null;
  questionStartTime: number | null;
  eliminatedPlayers: string[];
}

// WebSocket Message Interface
export interface WSMessage {
  type: MessageType;
  data?: any;
}

// Client-side Room Info (without WebSocket connections)
export interface RoomInfo {
  id: string;
  creator: string;
  entryFee: number;
  playerCount: number;
  maxPlayers: number;
  prizePool: number;
  state: GameState;
  players: Array<{
    id: string;
    name: string;
    isCreator: boolean;
    eliminated: boolean;
  }>;
  totalQuestions:number;
}

// Create Room Request
export interface CreateRoomRequest {
  playerName: string;
  entryFee: number;
}

// Join Room Request
export interface JoinRoomRequest {
  roomId: string;
  playerName: string;
}

// Start Game Request
export interface StartGameRequest {
  questions?: QuizQuestion[];
}

// Player Answer Request
export interface PlayerAnswerRequest {
  answer: string;
}

// Game Question Data
export interface QuestionData {
  questionNumber: number;
  question: string;
  choices: string[];
  timeLimit: number;
  alivePlayers: number;
}

// Elimination Data
export interface EliminationData {
  correctAnswer: string;
  eliminated: Array<{
    id: string;
    name: string;
    answer: string;
  }>;
  remaining: number;
}

// Game Over Data
export interface GameOverData {
  winner: {
    id: string;
    name: string;
    prize: number;
  } | null;
  prizePool: number;
  totalQuestions: number;
  finalStats: {
    totalPlayers: number;
    questionsAnswered: number;
    eliminationByRound: Record<number, number>;
  };
}