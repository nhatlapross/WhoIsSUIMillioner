import mongoose, { Document, Schema } from 'mongoose';

export interface ILeaderboardEntry extends Document {
  walletAddress: string;
  username?: string;
  avatar?: string;
  totalWinnings: number;
  totalGamesPlayed: number;
  winRate: number;
  highestScore: number;
  averageScore: number;
  rank: number;
  rankChange: number;
  lastGameAt: Date;
  achievements: string[];
  period: 'daily' | 'weekly' | 'monthly' | 'allTime';
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

const leaderboardSchema = new Schema<ILeaderboardEntry>({
  walletAddress: {
    type: String,
    required: true,
    index: true
  },
  username: {
    type: String,
    trim: true
  },
  avatar: {
    type: String
  },
  totalWinnings: {
    type: Number,
    required: true,
    default: 0
  },
  totalGamesPlayed: {
    type: Number,
    required: true,
    default: 0
  },
  winRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  highestScore: {
    type: Number,
    default: 0
  },
  averageScore: {
    type: Number,
    default: 0
  },
  rank: {
    type: Number,
    required: true
  },
  rankChange: {
    type: Number,
    default: 0
  },
  lastGameAt: {
    type: Date,
    required: true
  },
  achievements: [{
    type: String
  }],
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'allTime'],
    required: true
  },
  periodStart: {
    type: Date,
    required: true
  },
  periodEnd: {
    type: Date,
    required: true
  }
}, {
  timestamps: true,
  collection: 'leaderboards'
});

leaderboardSchema.index({ period: 1, rank: 1 });
leaderboardSchema.index({ period: 1, totalWinnings: -1 });
leaderboardSchema.index({ walletAddress: 1, period: 1 });
leaderboardSchema.index({ periodStart: 1, periodEnd: 1 });

export default mongoose.models.Leaderboard || mongoose.model<ILeaderboardEntry>('Leaderboard', leaderboardSchema);