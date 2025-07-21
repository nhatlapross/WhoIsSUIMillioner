import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  walletAddress: string;
  username?: string;
  email?: string;
  avatar?: string;
  totalGamesPlayed: number;
  totalWinnings: number;
  highestScore: number;
  achievements: string[];
  statistics: {
    soloGames: number;
    multiplayerGames: number;
    questionsAnswered: number;
    correctAnswers: number;
    winRate: number;
  };
  createdAt: Date;
  updatedAt: Date;
  lastActive: Date;
}

const userSchema = new Schema<IUser>({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  totalGamesPlayed: {
    type: Number,
    default: 0
  },
  totalWinnings: {
    type: Number,
    default: 0
  },
  highestScore: {
    type: Number,
    default: 0
  },
  achievements: [{
    type: String
  }],
  statistics: {
    soloGames: { type: Number, default: 0 },
    multiplayerGames: { type: Number, default: 0 },
    questionsAnswered: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 }
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'users'
});

userSchema.index({ walletAddress: 1 });
userSchema.index({ totalWinnings: -1 });
userSchema.index({ highestScore: -1 });

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema);