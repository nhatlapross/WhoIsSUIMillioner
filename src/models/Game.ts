import mongoose, { Document, Schema } from 'mongoose';

export interface IGamePlayer {
  walletAddress: string;
  username?: string;
  score: number;
  position: number;
  isEliminated: boolean;
  eliminatedAt?: Date;
  correctAnswers: number;
  totalAnswers: number;
  prizeWon: number;
}

export interface IGame extends Document {
  gameId: string;
  gameType: 'solo' | 'multiplayer';
  status: 'waiting' | 'starting' | 'playing' | 'finished' | 'cancelled';
  players: IGamePlayer[];
  totalPlayers: number;
  maxPlayers: number;
  entryFee: number;
  prizePool: number;
  currentQuestion: number;
  totalQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  questions: {
    questionId: string;
    questionText: string;
    options: string[];
    correctAnswer: number;
    difficulty: 'easy' | 'medium' | 'hard';
    category: string;
  }[];
  winner?: {
    walletAddress: string;
    username?: string;
    prize: number;
  };
  startedAt?: Date;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  blockchainTxHash?: string;
}

const gamePlayerSchema = new Schema<IGamePlayer>({
  walletAddress: { type: String, required: true },
  username: { type: String },
  score: { type: Number, default: 0 },
  position: { type: Number, default: 0 },
  isEliminated: { type: Boolean, default: false },
  eliminatedAt: { type: Date },
  correctAnswers: { type: Number, default: 0 },
  totalAnswers: { type: Number, default: 0 },
  prizeWon: { type: Number, default: 0 }
});

const gameSchema = new Schema<IGame>({
  gameId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  gameType: {
    type: String,
    enum: ['solo', 'multiplayer'],
    required: true
  },
  status: {
    type: String,
    enum: ['waiting', 'starting', 'playing', 'finished', 'cancelled'],
    default: 'waiting'
  },
  players: [gamePlayerSchema],
  totalPlayers: {
    type: Number,
    default: 0
  },
  maxPlayers: {
    type: Number,
    default: 10
  },
  entryFee: {
    type: Number,
    required: true
  },
  prizePool: {
    type: Number,
    default: 0
  },
  currentQuestion: {
    type: Number,
    default: 0
  },
  totalQuestions: {
    type: Number,
    default: 15
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  category: {
    type: String
  },
  questions: [{
    questionId: { type: String, required: true },
    questionText: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: Number, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    category: { type: String, required: true }
  }],
  winner: {
    walletAddress: { type: String },
    username: { type: String },
    prize: { type: Number }
  },
  startedAt: { type: Date },
  finishedAt: { type: Date },
  blockchainTxHash: { type: String }
}, {
  timestamps: true,
  collection: 'games'
});

gameSchema.index({ gameId: 1 });
gameSchema.index({ gameType: 1, status: 1 });
gameSchema.index({ createdAt: -1 });
gameSchema.index({ 'players.walletAddress': 1 });

export default mongoose.models.Game || mongoose.model<IGame>('Game', gameSchema);