import connectDB from '@/lib/mongodb';
import { GameSession, IGameSession } from '@/models';
import { FilterQuery, UpdateQuery } from 'mongoose';

export class GameSessionService {
  static async createSession(sessionData: Partial<IGameSession>): Promise<IGameSession> {
    await connectDB();
    const session = new GameSession(sessionData);
    return session.save();
  }

  static async findSessionById(sessionId: string): Promise<IGameSession | null> {
    await connectDB();
    return GameSession.findOne({ sessionId }).exec();
  }

  static async findActiveSession(
    walletAddress: string,
    gameId: string
  ): Promise<IGameSession | null> {
    await connectDB();
    return GameSession.findOne({
      walletAddress,
      gameId,
      status: 'active'
    }).exec();
  }

  static async updateSession(
    sessionId: string,
    updateData: UpdateQuery<IGameSession>
  ): Promise<IGameSession | null> {
    await connectDB();
    return GameSession.findOneAndUpdate(
      { sessionId },
      updateData,
      { new: true }
    ).exec();
  }

  static async recordAnswer(
    sessionId: string,
    answer: {
      questionId: string;
      selectedAnswer: number;
      correctAnswer: number;
      isCorrect: boolean;
      timeToAnswer: number;
    }
  ): Promise<IGameSession | null> {
    await connectDB();
    
    const answerRecord = {
      ...answer,
      timestamp: new Date()
    };

    return GameSession.findOneAndUpdate(
      { sessionId },
      {
        $push: { answers: answerRecord },
        $inc: {
          totalAnswers: 1,
          correctAnswers: answer.isCorrect ? 1 : 0,
          currentQuestion: 1,
          timeSpent: answer.timeToAnswer
        }
      },
      { new: true }
    ).exec();
  }

  static async completeSession(
    sessionId: string,
    finalScore: number,
    prizeWon: number = 0
  ): Promise<IGameSession | null> {
    await connectDB();
    return GameSession.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          status: 'completed',
          completedAt: new Date(),
          score: finalScore,
          prizeWon
        }
      },
      { new: true }
    ).exec();
  }

  static async abandonSession(sessionId: string): Promise<IGameSession | null> {
    await connectDB();
    return GameSession.findOneAndUpdate(
      { sessionId },
      { $set: { status: 'abandoned' } },
      { new: true }
    ).exec();
  }

  static async getUserSessions(
    walletAddress: string,
    limit: number = 20,
    skip: number = 0,
    status?: 'active' | 'completed' | 'abandoned'
  ): Promise<IGameSession[]> {
    await connectDB();
    
    const filter: FilterQuery<IGameSession> = { walletAddress };
    if (status) {
      filter.status = status;
    }

    return GameSession.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  static async getSessionStats(walletAddress: string): Promise<{
    totalSessions: number;
    completedSessions: number;
    averageScore: number;
    averageCorrectRate: number;
    totalTimeSpent: number;
    averageTimePerQuestion: number;
  }> {
    await connectDB();

    const stats = await GameSession.aggregate([
      { $match: { walletAddress } },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          completedSessions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          totalScore: { $sum: '$score' },
          totalCorrectAnswers: { $sum: '$correctAnswers' },
          totalAnswers: { $sum: '$totalAnswers' },
          totalTimeSpent: { $sum: '$timeSpent' }
        }
      }
    ]);

    if (!stats.length) {
      return {
        totalSessions: 0,
        completedSessions: 0,
        averageScore: 0,
        averageCorrectRate: 0,
        totalTimeSpent: 0,
        averageTimePerQuestion: 0
      };
    }

    const result = stats[0];
    const averageScore = result.completedSessions > 0 ? result.totalScore / result.completedSessions : 0;
    const averageCorrectRate = result.totalAnswers > 0 ? result.totalCorrectAnswers / result.totalAnswers : 0;
    const averageTimePerQuestion = result.totalAnswers > 0 ? result.totalTimeSpent / result.totalAnswers : 0;

    return {
      totalSessions: result.totalSessions,
      completedSessions: result.completedSessions,
      averageScore,
      averageCorrectRate,
      totalTimeSpent: result.totalTimeSpent,
      averageTimePerQuestion
    };
  }

  static async getGameSessionAnalytics(gameId: string): Promise<{
    totalSessions: number;
    completedSessions: number;
    abandonedSessions: number;
    averageCompletionRate: number;
    averageScore: number;
    averageTimeSpent: number;
    questionAnalytics: {
      questionId: string;
      correctRate: number;
      averageTimeToAnswer: number;
      totalAttempts: number;
    }[];
  }> {
    await connectDB();

    const [sessionStats, questionStats] = await Promise.all([
      GameSession.aggregate([
        { $match: { gameId } },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            completedSessions: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            abandonedSessions: {
              $sum: { $cond: [{ $eq: ['$status', 'abandoned'] }, 1, 0] }
            },
            totalScore: { $sum: '$score' },
            totalTimeSpent: { $sum: '$timeSpent' }
          }
        }
      ]),
      GameSession.aggregate([
        { $match: { gameId } },
        { $unwind: '$answers' },
        {
          $group: {
            _id: '$answers.questionId',
            correctAnswers: {
              $sum: { $cond: ['$answers.isCorrect', 1, 0] }
            },
            totalAttempts: { $sum: 1 },
            totalTimeToAnswer: { $sum: '$answers.timeToAnswer' }
          }
        },
        {
          $project: {
            questionId: '$_id',
            correctRate: { $divide: ['$correctAnswers', '$totalAttempts'] },
            averageTimeToAnswer: { $divide: ['$totalTimeToAnswer', '$totalAttempts'] },
            totalAttempts: 1,
            _id: 0
          }
        }
      ])
    ]);

    const sessionResult = sessionStats[0] || {
      totalSessions: 0,
      completedSessions: 0,
      abandonedSessions: 0,
      totalScore: 0,
      totalTimeSpent: 0
    };

    const completionRate = sessionResult.totalSessions > 0 
      ? sessionResult.completedSessions / sessionResult.totalSessions 
      : 0;

    const averageScore = sessionResult.completedSessions > 0 
      ? sessionResult.totalScore / sessionResult.completedSessions 
      : 0;

    const averageTimeSpent = sessionResult.totalSessions > 0 
      ? sessionResult.totalTimeSpent / sessionResult.totalSessions 
      : 0;

    return {
      totalSessions: sessionResult.totalSessions,
      completedSessions: sessionResult.completedSessions,
      abandonedSessions: sessionResult.abandonedSessions,
      averageCompletionRate: completionRate,
      averageScore,
      averageTimeSpent,
      questionAnalytics: questionStats
    };
  }

  static async deleteSession(sessionId: string): Promise<boolean> {
    await connectDB();
    const result = await GameSession.deleteOne({ sessionId });
    return result.deletedCount > 0;
  }

  static async getActiveSessions(): Promise<IGameSession[]> {
    await connectDB();
    return GameSession.find({ status: 'active' })
      .sort({ startedAt: 1 })
      .exec();
  }

  static async cleanupAbandonedSessions(olderThanHours: number = 2): Promise<number> {
    await connectDB();
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - olderThanHours);

    const result = await GameSession.updateMany(
      {
        status: 'active',
        startedAt: { $lt: cutoffTime }
      },
      { $set: { status: 'abandoned' } }
    );

    return result.modifiedCount;
  }
}