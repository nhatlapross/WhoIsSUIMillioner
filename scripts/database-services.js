// CommonJS wrapper for database services
const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://nhatlapross1:nhatlapross1@eliza.4vzjl.mongodb.net/?retryWrites=true&w=majority&appName=eliza';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('MongoDB connected successfully');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Define schemas
const userSchema = new mongoose.Schema({
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

const questionSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  questionText: {
    type: String,
    required: true,
    trim: true
  },
  options: [{
    type: String,
    required: true,
    trim: true
  }],
  correctAnswer: {
    type: Number,
    required: true,
    min: 0,
    max: 3
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  topic: {
    type: String,
    trim: true
  },
  language: {
    type: String,
    default: 'vi',
    enum: ['vi', 'en']
  },
  source: {
    type: String,
    enum: ['gemini', 'manual', 'imported'],
    default: 'gemini'
  },
  usageCount: {
    type: Number,
    default: 0
  },
  correctRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  tags: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String
  }
}, {
  timestamps: true,
  collection: 'questions'
});

// Game schema
const gamePlayerSchema = new mongoose.Schema({
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

const gameSchema = new mongoose.Schema({
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

// Game Session schema
const gameSessionSchema = new mongoose.Schema({
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
  answers: [{
    questionId: { type: String, required: true },
    selectedAnswer: { type: Number, required: true },
    correctAnswer: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true },
    timeToAnswer: { type: Number, required: true },
    timestamp: { type: Date, required: true }
  }],
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

// Models
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Question = mongoose.models.Question || mongoose.model('Question', questionSchema);
const Game = mongoose.models.Game || mongoose.model('Game', gameSchema);
const GameSession = mongoose.models.GameSession || mongoose.model('GameSession', gameSessionSchema);

// Services
// Services
class UserService {
  static async findByWalletAddress(walletAddress) {
    await connectDB();
    return User.findOne({ walletAddress }).exec();
  }

  static async createUser(userData) {
    await connectDB();
    const user = new User(userData);
    return user.save();
  }

  static async updateUser(walletAddress, updateData) {
    await connectDB();
    return User.findOneAndUpdate(
      { walletAddress },
      updateData,
      { new: true, upsert: false }
    ).exec();
  }

  static async updateUserStats(walletAddress, gameData) {
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

  static async getUserCount() {
    await connectDB();
    return User.countDocuments();
  }
}

class GameService {
  static async createGame(gameData) {
    await connectDB();
    const game = new Game(gameData);
    return game.save();
  }

  static async findGameById(gameId) {
    await connectDB();
    return Game.findOne({ gameId }).exec();
  }

  static async updateGame(gameId, updateData) {
    await connectDB();
    return Game.findOneAndUpdate(
      { gameId },
      updateData,
      { new: true }
    ).exec();
  }

  static async addPlayerToGame(gameId, player) {
    await connectDB();
    return Game.findOneAndUpdate(
      { gameId },
      {
        $push: { players: player },
        $inc: { totalPlayers: 1 }
      },
      { new: true }
    ).exec();
  }

  static async removePlayerFromGame(gameId, walletAddress) {
    await connectDB();
    return Game.findOneAndUpdate(
      { gameId },
      {
        $pull: { players: { walletAddress } },
        $inc: { totalPlayers: -1 }
      },
      { new: true }
    ).exec();
  }

  static async updatePlayerInGame(gameId, walletAddress, playerUpdate) {
    await connectDB();
    const updateFields = {};
    
    Object.keys(playerUpdate).forEach(key => {
      updateFields[`players.$.${key}`] = playerUpdate[key];
    });

    return Game.findOneAndUpdate(
      { gameId, 'players.walletAddress': walletAddress },
      { $set: updateFields },
      { new: true }
    ).exec();
  }

  static async finishGame(gameId, winner, blockchainTxHash) {
    await connectDB();
    const updateData = {
      status: 'finished',
      finishedAt: new Date()
    };

    if (winner) {
      updateData.winner = winner;
    }

    if (blockchainTxHash) {
      updateData.blockchainTxHash = blockchainTxHash;
    }

    return Game.findOneAndUpdate(
      { gameId },
      updateData,
      { new: true }
    ).exec();
  }

  static async getGameStats() {
    await connectDB();
    
    const [
      totalGames,
      activeGames,
      soloGames,
      multiplayerGames,
      prizePoolResult
    ] = await Promise.all([
      Game.countDocuments(),
      Game.countDocuments({ status: { $in: ['waiting', 'starting', 'playing'] } }),
      Game.countDocuments({ gameType: 'solo' }),
      Game.countDocuments({ gameType: 'multiplayer' }),
      Game.aggregate([
        { $group: { _id: null, totalPrizePool: { $sum: '$prizePool' } } }
      ])
    ]);

    return {
      totalGames,
      activeGames,
      soloGames,
      multiplayerGames,
      totalPrizePool: prizePoolResult[0]?.totalPrizePool || 0
    };
  }
}

class QuestionService {
  static async createMultipleQuestions(questionsData) {
    await connectDB();
    return Question.insertMany(questionsData);
  }

  static async getRandomQuestions(count, difficulty, category, excludeIds = []) {
    await connectDB();
    
    const filter = {
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

  static async incrementQuestionUsage(questionId) {
    await connectDB();
    return Question.findOneAndUpdate(
      { questionId },
      { $inc: { usageCount: 1 } },
      { new: true }
    ).exec();
  }

  static async updateQuestionCorrectRate(questionId, wasCorrect) {
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

  static async getQuestionStats() {
    await connectDB();

    const [
      total,
      difficultyStats,
      categoryStats
    ] = await Promise.all([
      Question.countDocuments({ isActive: true }),
      Question.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$difficulty', count: { $sum: 1 } } }
      ]),
      Question.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ])
    ]);

    const byDifficulty = { easy: 0, medium: 0, hard: 0 };
    difficultyStats.forEach((stat) => {
      byDifficulty[stat._id] = stat.count;
    });

    const byCategory = {};
    categoryStats.forEach((stat) => {
      byCategory[stat._id] = stat.count;
    });

    return {
      total,
      byDifficulty,
      byCategory,
      averageUsage: 0,
      averageCorrectRate: 0
    };
  }
}

class GameSessionService {
  static async createSession(sessionData) {
    await connectDB();
    const session = new GameSession(sessionData);
    return session.save();
  }

  static async recordAnswer(sessionId, answer) {
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

  static async completeSession(sessionId, finalScore, prizeWon = 0) {
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

  static async cleanupAbandonedSessions(olderThanHours = 2) {
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

class LeaderboardService {
  static async generatePeriodicLeaderboards() {
    // Simplified implementation for CommonJS version
    console.log('Leaderboard generation called (simplified version)');
  }
}

module.exports = {
  connectDB,
  UserService,
  GameService,
  QuestionService,
  GameSessionService,
  LeaderboardService
};