import connectDB from '@/lib/mongodb';
import { Question, IQuestion } from '@/models';
import { FilterQuery } from 'mongoose';

export class QuestionService {
  static async createQuestion(questionData: Partial<IQuestion>): Promise<IQuestion> {
    await connectDB();
    const question = new Question(questionData);
    return question.save();
  }

  static async createMultipleQuestions(questionsData: Partial<IQuestion>[]): Promise<IQuestion[]> {
    await connectDB();
    return Question.insertMany(questionsData);
  }

  static async findQuestionById(questionId: string): Promise<IQuestion | null> {
    await connectDB();
    return Question.findOne({ questionId }).exec();
  }

  static async getRandomQuestions(
    count: number,
    difficulty?: 'easy' | 'medium' | 'hard',
    category?: string,
    excludeIds: string[] = []
  ): Promise<IQuestion[]> {
    await connectDB();
    
    const filter: FilterQuery<IQuestion> = {
      isActive: true,
      questionId: { $nin: excludeIds }
    };
    
    if (difficulty) {
      filter.difficulty = difficulty;
    }
    
    if (category) {
      filter.category = category;
    }

    return Question.aggregate([
      { $match: filter },
      { $sample: { size: count } }
    ]);
  }

  static async getQuestionsByDifficulty(
    difficulty: 'easy' | 'medium' | 'hard',
    limit: number = 50
  ): Promise<IQuestion[]> {
    await connectDB();
    return Question.find({ difficulty, isActive: true })
      .sort({ usageCount: 1 }) // Prioritize less used questions
      .limit(limit)
      .exec();
  }

  static async getQuestionsByCategory(
    category: string,
    limit: number = 50
  ): Promise<IQuestion[]> {
    await connectDB();
    return Question.find({ category, isActive: true })
      .sort({ usageCount: 1 })
      .limit(limit)
      .exec();
  }

  static async incrementQuestionUsage(questionId: string): Promise<IQuestion | null> {
    await connectDB();
    return Question.findOneAndUpdate(
      { questionId },
      { $inc: { usageCount: 1 } },
      { new: true }
    ).exec();
  }

  static async updateQuestionCorrectRate(
    questionId: string,
    wasCorrect: boolean
  ): Promise<IQuestion | null> {
    await connectDB();
    const question = await Question.findOne({ questionId });
    
    if (!question) return null;

    const totalAttempts = question.usageCount;
    const currentCorrectAttempts = question.correctRate * totalAttempts;
    const newCorrectAttempts = wasCorrect ? currentCorrectAttempts + 1 : currentCorrectAttempts;
    const newCorrectRate = newCorrectAttempts / Math.max(totalAttempts, 1);

    return Question.findOneAndUpdate(
      { questionId },
      { correctRate: newCorrectRate },
      { new: true }
    ).exec();
  }

  static async searchQuestions(
    query: string,
    filters?: {
      difficulty?: 'easy' | 'medium' | 'hard';
      category?: string;
      language?: string;
    },
    limit: number = 20
  ): Promise<IQuestion[]> {
    await connectDB();
    
    const searchFilter: FilterQuery<IQuestion> = {
      isActive: true,
      $or: [
        { questionText: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ]
    };

    if (filters) {
      if (filters.difficulty) searchFilter.difficulty = filters.difficulty;
      if (filters.category) searchFilter.category = filters.category;
      if (filters.language) searchFilter.language = filters.language;
    }

    return Question.find(searchFilter)
      .sort({ correctRate: -1, usageCount: 1 })
      .limit(limit)
      .exec();
  }

  static async getCategories(): Promise<string[]> {
    await connectDB();
    return Question.distinct('category', { isActive: true });
  }

  static async getQuestionStats(): Promise<{
    total: number;
    byDifficulty: { easy: number; medium: number; hard: number };
    byCategory: { [key: string]: number };
    averageUsage: number;
    averageCorrectRate: number;
  }> {
    await connectDB();

    const [
      total,
      difficultyStats,
      categoryStats,
      usageStats
    ] = await Promise.all([
      Question.countDocuments({ isActive: true }),
      Question.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$difficulty', count: { $sum: 1 } } }
      ]),
      Question.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      Question.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            avgUsage: { $avg: '$usageCount' },
            avgCorrectRate: { $avg: '$correctRate' }
          }
        }
      ])
    ]);

    const byDifficulty = { easy: 0, medium: 0, hard: 0 };
    difficultyStats.forEach((stat: any) => {
      byDifficulty[stat._id as keyof typeof byDifficulty] = stat.count;
    });

    const byCategory: { [key: string]: number } = {};
    categoryStats.forEach((stat: any) => {
      byCategory[stat._id] = stat.count;
    });

    return {
      total,
      byDifficulty,
      byCategory,
      averageUsage: usageStats[0]?.avgUsage || 0,
      averageCorrectRate: usageStats[0]?.avgCorrectRate || 0
    };
  }

  static async deactivateQuestion(questionId: string): Promise<IQuestion | null> {
    await connectDB();
    return Question.findOneAndUpdate(
      { questionId },
      { isActive: false },
      { new: true }
    ).exec();
  }

  static async updateQuestion(
    questionId: string,
    updateData: Partial<IQuestion>
  ): Promise<IQuestion | null> {
    await connectDB();
    return Question.findOneAndUpdate(
      { questionId },
      updateData,
      { new: true }
    ).exec();
  }

  static async deleteQuestion(questionId: string): Promise<boolean> {
    await connectDB();
    const result = await Question.deleteOne({ questionId });
    return result.deletedCount > 0;
  }

  static async getMostUsedQuestions(limit: number = 10): Promise<IQuestion[]> {
    await connectDB();
    return Question.find({ isActive: true })
      .sort({ usageCount: -1 })
      .limit(limit)
      .exec();
  }

  static async getHardestQuestions(limit: number = 10): Promise<IQuestion[]> {
    await connectDB();
    return Question.find({ isActive: true, usageCount: { $gt: 5 } })
      .sort({ correctRate: 1 })
      .limit(limit)
      .exec();
  }

  static async getEasiestQuestions(limit: number = 10): Promise<IQuestion[]> {
    await connectDB();
    return Question.find({ isActive: true, usageCount: { $gt: 5 } })
      .sort({ correctRate: -1 })
      .limit(limit)
      .exec();
  }
}