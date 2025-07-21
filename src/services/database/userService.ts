import connectDB from '@/lib/mongodb';
import { User, IUser } from '@/models';
import { FilterQuery, UpdateQuery } from 'mongoose';

export class UserService {
  static async findByWalletAddress(walletAddress: string): Promise<IUser | null> {
    await connectDB();
    return User.findOne({ walletAddress }).exec();
  }

  static async createUser(userData: Partial<IUser>): Promise<IUser> {
    await connectDB();
    const user = new User(userData);
    return user.save();
  }

  static async updateUser(
    walletAddress: string,
    updateData: UpdateQuery<IUser>
  ): Promise<IUser | null> {
    await connectDB();
    return User.findOneAndUpdate(
      { walletAddress },
      updateData,
      { new: true, upsert: false }
    ).exec();
  }

  static async updateUserStats(
    walletAddress: string,
    gameData: {
      gameType: 'solo' | 'multiplayer';
      score: number;
      winnings: number;
      questionsAnswered: number;
      correctAnswers: number;
      won: boolean;
    }
  ): Promise<IUser | null> {
    await connectDB();
    
    const user = await User.findOne({ walletAddress });
    if (!user) return null;

    // Update statistics
    user.totalGamesPlayed += 1;
    user.totalWinnings += gameData.winnings;
    user.highestScore = Math.max(user.highestScore, gameData.score);
    user.lastActive = new Date();

    // Update game-specific stats
    if (gameData.gameType === 'solo') {
      user.statistics.soloGames += 1;
    } else {
      user.statistics.multiplayerGames += 1;
    }

    user.statistics.questionsAnswered += gameData.questionsAnswered;
    user.statistics.correctAnswers += gameData.correctAnswers;

    // Calculate win rate
    const totalGames = user.statistics.soloGames + user.statistics.multiplayerGames;
    const wins = gameData.won ? 1 : 0;
    user.statistics.winRate = (user.statistics.winRate * (totalGames - 1) + wins) / totalGames;

    return user.save();
  }

  static async getTopUsers(limit: number = 10): Promise<IUser[]> {
    await connectDB();
    return User.find()
      .sort({ totalWinnings: -1, highestScore: -1 })
      .limit(limit)
      .exec();
  }

  static async searchUsers(query: string, limit: number = 20): Promise<IUser[]> {
    await connectDB();
    const searchRegex = new RegExp(query, 'i');
    
    return User.find({
      $or: [
        { username: { $regex: searchRegex } },
        { walletAddress: { $regex: searchRegex } }
      ]
    })
    .limit(limit)
    .exec();
  }

  static async getUserCount(): Promise<number> {
    await connectDB();
    return User.countDocuments();
  }

  static async getActiveUsers(days: number = 7): Promise<IUser[]> {
    await connectDB();
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    return User.find({
      lastActive: { $gte: dateThreshold }
    })
    .sort({ lastActive: -1 })
    .exec();
  }

  static async addAchievement(walletAddress: string, achievement: string): Promise<IUser | null> {
    await connectDB();
    return User.findOneAndUpdate(
      { walletAddress },
      { $addToSet: { achievements: achievement } },
      { new: true }
    ).exec();
  }

  static async deleteUser(walletAddress: string): Promise<boolean> {
    await connectDB();
    const result = await User.deleteOne({ walletAddress });
    return result.deletedCount > 0;
  }
}