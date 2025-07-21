import connectDB from '@/lib/mongodb';
import { Game, IGame, IGamePlayer } from '@/models';
import { FilterQuery, UpdateQuery } from 'mongoose';

export class GameService {
  static async createGame(gameData: Partial<IGame>): Promise<IGame> {
    await connectDB();
    const game = new Game(gameData);
    return game.save();
  }

  static async findGameById(gameId: string): Promise<IGame | null> {
    await connectDB();
    return Game.findOne({ gameId }).exec();
  }

  static async updateGame(
    gameId: string,
    updateData: UpdateQuery<IGame>
  ): Promise<IGame | null> {
    await connectDB();
    return Game.findOneAndUpdate(
      { gameId },
      updateData,
      { new: true }
    ).exec();
  }

  static async addPlayerToGame(gameId: string, player: IGamePlayer): Promise<IGame | null> {
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

  static async removePlayerFromGame(gameId: string, walletAddress: string): Promise<IGame | null> {
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

  static async updatePlayerInGame(
    gameId: string,
    walletAddress: string,
    playerUpdate: Partial<IGamePlayer>
  ): Promise<IGame | null> {
    await connectDB();
    const updateFields: any = {};
    
    Object.keys(playerUpdate).forEach(key => {
      updateFields[`players.$.${key}`] = (playerUpdate as any)[key];
    });

    return Game.findOneAndUpdate(
      { gameId, 'players.walletAddress': walletAddress },
      { $set: updateFields },
      { new: true }
    ).exec();
  }

  static async getActiveGames(gameType?: 'solo' | 'multiplayer'): Promise<IGame[]> {
    await connectDB();
    const filter: FilterQuery<IGame> = {
      status: { $in: ['waiting', 'starting', 'playing'] }
    };
    
    if (gameType) {
      filter.gameType = gameType;
    }

    return Game.find(filter)
      .sort({ createdAt: -1 })
      .exec();
  }

  static async getWaitingMultiplayerGames(): Promise<IGame[]> {
    await connectDB();
    return Game.find({
      gameType: 'multiplayer',
      status: 'waiting',
      $expr: { $lt: ['$totalPlayers', '$maxPlayers'] }
    })
    .sort({ createdAt: 1 })
    .exec();
  }

  static async getGameHistory(
    walletAddress?: string,
    limit: number = 20,
    skip: number = 0
  ): Promise<IGame[]> {
    await connectDB();
    let filter: FilterQuery<IGame> = { status: 'finished' };
    
    if (walletAddress) {
      filter['players.walletAddress'] = walletAddress;
    }

    return Game.find(filter)
      .sort({ finishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  static async getGameStats(): Promise<{
    totalGames: number;
    activeGames: number;
    soloGames: number;
    multiplayerGames: number;
    totalPrizePool: number;
  }> {
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

  static async finishGame(
    gameId: string,
    winner?: { walletAddress: string; username?: string; prize: number },
    blockchainTxHash?: string
  ): Promise<IGame | null> {
    await connectDB();
    const updateData: UpdateQuery<IGame> = {
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

  static async deleteGame(gameId: string): Promise<boolean> {
    await connectDB();
    const result = await Game.deleteOne({ gameId });
    return result.deletedCount > 0;
  }

  static async getRecentGames(limit: number = 10): Promise<IGame[]> {
    await connectDB();
    return Game.find({ status: 'finished' })
      .sort({ finishedAt: -1 })
      .limit(limit)
      .populate('players.walletAddress', 'username avatar')
      .exec();
  }

  static async getPlayerGameHistory(
    walletAddress: string,
    limit: number = 20
  ): Promise<IGame[]> {
    await connectDB();
    return Game.find({
      'players.walletAddress': walletAddress,
      status: 'finished'
    })
    .sort({ finishedAt: -1 })
    .limit(limit)
    .exec();
  }
}