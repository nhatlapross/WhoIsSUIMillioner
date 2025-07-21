import mongoose, { Document, Schema } from 'mongoose';

export interface IGameSession extends Document {
  sessionId: string;
  gameId: string;
  walletAddress: string;
  gameType: 'solo' | 'multiplayer';
  status: 'active' | 'completed' | 'abandoned';
  currentQuestion: number;
  score: number;
  correctAnswers: number;
  totalAnswers: number;
  timeSpent: number;
  answers: {
    questionId: string;
    selectedAnswer: number;
    correctAnswer: number;
    isCorrect: boolean;
    timeToAnswer: number;
    timestamp: Date;
  }[];
  startedAt: Date;
  completedAt?: Date;
  prizeWon: number;
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    device?: string;
    browser?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const answerSchema = new Schema({
  questionId: { type: String, required: true },
  selectedAnswer: { type: Number, required: true },
  correctAnswer: { type: Number, required: true },
  isCorrect: { type: Boolean, required: true },
  timeToAnswer: { type: Number, required: true },
  timestamp: { type: Date, required: true }
});

const gameSessionSchema = new Schema<IGameSession>({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  gameId: {
    type: String,
    required: true,
    index: true
  },
  walletAddress: {
    type: String,
    required: true,
    index: true
  },
  gameType: {
    type: String,
    enum: ['solo', 'multiplayer'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active'
  },
  currentQuestion: {
    type: Number,
    default: 0
  },
  score: {
    type: Number,
    default: 0
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  totalAnswers: {
    type: Number,
    default: 0
  },
  timeSpent: {
    type: Number,
    default: 0
  },
  answers: [answerSchema],
  startedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  prizeWon: {
    type: Number,
    default: 0
  },
  metadata: {
    userAgent: { type: String },
    ipAddress: { type: String },
    device: { type: String },
    browser: { type: String }
  }
}, {
  timestamps: true,
  collection: 'gameSessions'
});

gameSessionSchema.index({ walletAddress: 1, createdAt: -1 });
gameSessionSchema.index({ gameId: 1 });
gameSessionSchema.index({ status: 1 });
gameSessionSchema.index({ gameType: 1, status: 1 });

export default mongoose.models.GameSession || mongoose.model<IGameSession>('GameSession', gameSessionSchema);