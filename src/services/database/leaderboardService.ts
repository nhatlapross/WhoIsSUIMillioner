import connectDB from '@/lib/mongodb';
import { Leaderboard, ILeaderboardEntry, User } from '@/models';

export class LeaderboardService {
  static async updateLeaderboard(
    period: 'daily' | 'weekly' | 'monthly' | 'allTime',
    periodStart: Date,
    periodEnd: Date
  ): Promise<ILeaderboardEntry[]> {
    await connectDB();

    // Clear existing leaderboard for this period
    await Leaderboard.deleteMany({ period, periodStart, periodEnd });

    // Aggregate user stats for the period
    const userStats = await User.aggregate([
      {
        $match: {
          lastActive: { $gte: periodStart, $lte: periodEnd }
        }
      },
      {
        $lookup: {
          from: 'games',
          localField: 'walletAddress',
          foreignField: 'players.walletAddress',
          as: 'games',
          pipeline: [
            {
              $match: {
                finishedAt: { $gte: periodStart, $lte: periodEnd },
                status: 'finished'
              }
            }
          ]
        }
      },
      {
        $addFields: {
          periodWinnings: {
            $sum: {
              $map: {
                input: '$games',
                as: 'game',
                in: {
                  $let: {
                    vars: {
                      player: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: '$$game.players',
                              cond: { $eq: ['$$this.walletAddress', '$walletAddress'] }
                            }
                          },
                          0
                        ]
                      }
                    },
                    in: '$$player.prizeWon'
                  }
                }
              }
            }
          },
          periodGames: { $size: '$games' }
        }
      },
      {
        $sort: { periodWinnings: -1, highestScore: -1 }
      }
    ]);

    // Create leaderboard entries
    const leaderboardEntries = userStats.map((user, index) => ({
      walletAddress: user.walletAddress,
      username: user.username,
      avatar: user.avatar,
      totalWinnings: user.periodWinnings || 0,
      totalGamesPlayed: user.periodGames || 0,
      winRate: user.statistics?.winRate || 0,
      highestScore: user.highestScore || 0,
      averageScore: user.periodGames > 0 ? (user.periodWinnings / user.periodGames) : 0,
      rank: index + 1,
      rankChange: 0, // Will be calculated when comparing to previous period
      lastGameAt: user.lastActive,
      achievements: user.achievements || [],
      period,
      periodStart,
      periodEnd
    }));

    // Insert new leaderboard entries
    if (leaderboardEntries.length > 0) {
      const savedEntries = await Leaderboard.insertMany(leaderboardEntries);
      return savedEntries;
    }

    return [];
  }

  static async getLeaderboard(
    period: 'daily' | 'weekly' | 'monthly' | 'allTime',
    limit: number = 100,
    offset: number = 0
  ): Promise<ILeaderboardEntry[]> {
    await connectDB();

    // Get the most recent leaderboard for the specified period
    const latestPeriod = await Leaderboard.findOne({ period })
      .sort({ periodEnd: -1 })
      .select('periodStart periodEnd');

    if (!latestPeriod) {
      return [];
    }

    return Leaderboard.find({
      period,
      periodStart: latestPeriod.periodStart,
      periodEnd: latestPeriod.periodEnd
    })
      .sort({ rank: 1 })
      .skip(offset)
      .limit(limit)
      .exec();
  }

  static async getUserRank(
    walletAddress: string,
    period: 'daily' | 'weekly' | 'monthly' | 'allTime'
  ): Promise<ILeaderboardEntry | null> {
    await connectDB();

    // Get the most recent leaderboard for the specified period
    const latestPeriod = await Leaderboard.findOne({ period })
      .sort({ periodEnd: -1 })
      .select('periodStart periodEnd');

    if (!latestPeriod) {
      return null;
    }

    return Leaderboard.findOne({
      walletAddress,
      period,
      periodStart: latestPeriod.periodStart,
      periodEnd: latestPeriod.periodEnd
    }).exec();
  }

  static async getTopPlayers(
    period: 'daily' | 'weekly' | 'monthly' | 'allTime',
    limit: number = 10
  ): Promise<ILeaderboardEntry[]> {
    return this.getLeaderboard(period, limit, 0);
  }

  static async calculateRankChanges(
    currentPeriod: 'daily' | 'weekly' | 'monthly',
    currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date
  ): Promise<void> {
    await connectDB();

    const currentLeaderboard = await Leaderboard.find({
      period: currentPeriod,
      periodStart: currentStart,
      periodEnd: currentEnd
    });

    const previousLeaderboard = await Leaderboard.find({
      period: currentPeriod,
      periodStart: previousStart,
      periodEnd: previousEnd
    });

    // Create a map of previous ranks
    const previousRanks = new Map<string, number>();
    previousLeaderboard.forEach(entry => {
      previousRanks.set(entry.walletAddress, entry.rank);
    });

    // Update rank changes
    const updatePromises = currentLeaderboard.map(currentEntry => {
      const previousRank = previousRanks.get(currentEntry.walletAddress);
      const rankChange = previousRank ? previousRank - currentEntry.rank : 0;

      return Leaderboard.updateOne(
        {
          walletAddress: currentEntry.walletAddress,
          period: currentPeriod,
          periodStart: currentStart,
          periodEnd: currentEnd
        },
        { $set: { rankChange } }
      );
    });

    await Promise.all(updatePromises);
  }

  static async getLeaderboardStats(
    period: 'daily' | 'weekly' | 'monthly' | 'allTime'
  ): Promise<{
    totalPlayers: number;
    totalWinnings: number;
    averageWinnings: number;
    topWinner: ILeaderboardEntry | null;
  }> {
    await connectDB();

    // Get the most recent leaderboard for the specified period
    const latestPeriod = await Leaderboard.findOne({ period })
      .sort({ periodEnd: -1 })
      .select('periodStart periodEnd');

    if (!latestPeriod) {
      return {
        totalPlayers: 0,
        totalWinnings: 0,
        averageWinnings: 0,
        topWinner: null
      };
    }

    const [stats, topWinner] = await Promise.all([
      Leaderboard.aggregate([
        {
          $match: {
            period,
            periodStart: latestPeriod.periodStart,
            periodEnd: latestPeriod.periodEnd
          }
        },
        {
          $group: {
            _id: null,
            totalPlayers: { $sum: 1 },
            totalWinnings: { $sum: '$totalWinnings' },
            averageWinnings: { $avg: '$totalWinnings' }
          }
        }
      ]),
      Leaderboard.findOne({
        period,
        periodStart: latestPeriod.periodStart,
        periodEnd: latestPeriod.periodEnd,
        rank: 1
      })
    ]);

    const result = stats[0] || {
      totalPlayers: 0,
      totalWinnings: 0,
      averageWinnings: 0
    };

    return {
      ...result,
      topWinner
    };
  }

  static async getUserHistory(
    walletAddress: string,
    limit: number = 10
  ): Promise<ILeaderboardEntry[]> {
    await connectDB();
    return Leaderboard.find({ walletAddress })
      .sort({ periodEnd: -1 })
      .limit(limit)
      .exec();
  }

  static async generatePeriodicLeaderboards(): Promise<void> {
    const now = new Date();
    
    // Daily leaderboard
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);
    
    await this.updateLeaderboard('daily', dayStart, dayEnd);

    // Weekly leaderboard (Monday to Sunday)
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    await this.updateLeaderboard('weekly', weekStart, weekEnd);

    // Monthly leaderboard
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);
    
    await this.updateLeaderboard('monthly', monthStart, monthEnd);

    // All-time leaderboard
    const allTimeStart = new Date('2000-01-01');
    const allTimeEnd = new Date();
    
    await this.updateLeaderboard('allTime', allTimeStart, allTimeEnd);
  }
}