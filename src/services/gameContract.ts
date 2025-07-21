import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';

export interface GameContractConfig {
  packageId: string;
  gameObjectId: string;
  adminCap?: string;
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
}

// Contract configuration - using the actual deployed values
const getContractConfig = (): GameContractConfig => {
  // Use the deployed contract values from your .env
  const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID || '0xa8f3ee6af69d8e3ea7a4169c7fc5eea14c861dbe146ceeafc872d22bed307e99';
  const gameObjectId = process.env.NEXT_PUBLIC_GAME_PLATFORM_ID || '0xeb34a939d6f0c03c1b064c6fa17c1f47e7477d64bbd629f13b06224985a22924';
  
  return {
    packageId,
    gameObjectId,
    network: 'testnet'
  };
};

// Default configuration for different networks
export const GAME_CONTRACT_CONFIGS: Record<string, GameContractConfig> = {
  mainnet: {
    packageId: '0x123...', // Your deployed package ID on mainnet
    gameObjectId: '0x456...', // Your game object ID on mainnet
    network: 'mainnet'
  },
  testnet: getContractConfig(),
  devnet: {
    packageId: '0xdef...', // Your deployed package ID on devnet
    gameObjectId: '0x012...', // Your game object ID on devnet
    network: 'devnet'
  }
};

export interface GameSession {
  id: string;
  player: string;
  startTime: number;
  endTime?: number;
  score: number;
  gameType: 'solo' | 'multiplayer' | 'ai';
  rewardAmount: number;
  claimed: boolean;
}

export interface MultiplayerRoom {
  id: string;
  creator: string;
  entryFee: number;
  maxPlayers: number;
  currentPlayers: string[];
  prizePool: number;
  status: 'waiting' | 'playing' | 'finished';
  winner?: string;
}

export class GameContract {
  private config: GameContractConfig;
  private client: SuiClient;

  constructor(config: GameContractConfig, client: SuiClient) {
    this.config = config;
    this.client = client;
  }

  /**
   * Get contract configuration
   */
  getConfig(): GameContractConfig {
    return this.config;
  }

  /**
   * Validate contract deployment and object existence
   */
  async validateContract(): Promise<{isValid: boolean, errors: string[]}> {
    const errors: string[] = [];
    
    try {
      // Check if package exists
      console.log('🔍 Validating package:', this.config.packageId);
      const packageResult = await this.client.getObject({
        id: this.config.packageId,
        options: { showContent: true, showType: true }
      });
      
      if (!packageResult.data) {
        errors.push(`Package ${this.config.packageId} does not exist`);
      } else {
        console.log('✅ Package exists:', packageResult.data.type);
      }
      
      // Check if game object exists
      console.log('🔍 Validating game object:', this.config.gameObjectId);
      const gameObjectResult = await this.client.getObject({
        id: this.config.gameObjectId,
        options: { showContent: true, showType: true }
      });
      
      if (!gameObjectResult.data) {
        errors.push(`Game object ${this.config.gameObjectId} does not exist`);
      } else {
        console.log('✅ Game object exists:', gameObjectResult.data.type);
        console.log('📋 Game object content:', gameObjectResult.data.content);
      }
      
    } catch (error: any) {
      console.error('❌ Error validating contract:', error);
      errors.push(`Validation error: ${error.message}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ============ SOLO GAME TRANSACTIONS ============

  /**
   * Create transaction to sign player contract
   */
  createSignContractTx(termsVersion: string): Transaction {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${this.config.packageId}::game::sign_player_contract`,
      arguments: [
        tx.object(this.config.gameObjectId),
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(termsVersion))),
        tx.object('0x6') // Clock object
      ]
    });
    
    tx.setGasBudget(200_000_000);
    return tx;
  }

  /**
   * Create transaction to start solo game session
   */
  createStartSoloGameTx(entryFee: number, gameType: string): Transaction {
    const tx = new Transaction();
    const entryFeeInMist = Math.floor(entryFee * 1_000_000_000);
    
    // Split coins for entry fee
    const [coin] = tx.splitCoins(tx.gas, [entryFeeInMist]);
    
    tx.moveCall({
      target: `${this.config.packageId}::game::start_solo_game`,
      arguments: [
        tx.object(this.config.gameObjectId),
        coin,
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(gameType))),
        tx.object('0x6') // Clock object
      ]
    });
    
    tx.setGasBudget(300_000_000);
    return tx;
  }

  /**
   * Create transaction to finish solo game and calculate rewards
   */
  createFinishSoloGameTx(
    gameId: string, 
    score: number, 
    totalQuestions: number
  ): Transaction {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${this.config.packageId}::game::finish_solo_game`,
      arguments: [
        tx.object(this.config.gameObjectId),
        tx.pure.id(gameId),
        tx.pure.u64(score),
        tx.pure.u64(totalQuestions),
        tx.object('0x6') // Clock object
      ]
    });
    
    tx.setGasBudget(350_000_000);
    return tx;
  }


  // ============ MULTIPLAYER GAME TRANSACTIONS ============

  /**
   * Create transaction to create multiplayer room
   */
  createMultiplayerRoomTx(
    entryFee: number, 
    maxPlayers: number
  ): Transaction {
    const tx = new Transaction();
    const entryFeeInMist = Math.floor(entryFee * 1_000_000_000);
    
    // Split coins for entry fee
    const [coin] = tx.splitCoins(tx.gas, [entryFeeInMist]);
    
    tx.moveCall({
      target: `${this.config.packageId}::game::create_multiplayer_room`,
      arguments: [
        tx.object(this.config.gameObjectId),
        coin,
        tx.pure.u64(maxPlayers)
      ]
    });
    
    tx.setGasBudget(350_000_000);
    return tx;
  }

  /**
   * Create transaction to join multiplayer room
   */
  createJoinRoomTx(roomId: string, entryFee: number): Transaction {
    const tx = new Transaction();
    const entryFeeInMist = Math.floor(entryFee * 1_000_000_000);
    
    const [coin] = tx.splitCoins(tx.gas, [entryFeeInMist]);
    
    tx.moveCall({
      target: `${this.config.packageId}::game::join_multiplayer_room`,
      arguments: [
        tx.object(this.config.gameObjectId),
        tx.pure.id(roomId),
        coin
      ]
    });
    
    tx.setGasBudget(300_000_000);
    return tx;
  }

  /**
   * Create transaction to start multiplayer game
   */
  createStartMultiplayerGameTx(roomId: string, totalQuestions: number): Transaction {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${this.config.packageId}::game::start_multiplayer_game`,
      arguments: [
        tx.object(this.config.gameObjectId),
        tx.pure.id(roomId),
        tx.pure.u64(totalQuestions),
        tx.object('0x6') // Clock object
      ]
    });
    
    tx.setGasBudget(250_000_000);
    return tx;
  }

  /**
   * Create transaction to submit answer in multiplayer game
   */
  createSubmitAnswerTx(
    roomId: string, 
    answer: string
  ): Transaction {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${this.config.packageId}::game::submit_answer`,
      arguments: [
        tx.object(this.config.gameObjectId),
        tx.pure.id(roomId),
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(answer)))
      ]
    });
    
    tx.setGasBudget(250_000_000);
    return tx;
  }

  /**
   * Create transaction to process question results and eliminate wrong players
   */
  createProcessQuestionResultsTx(roomId: string, correctAnswer: string): Transaction {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${this.config.packageId}::game::process_question_results`,
      arguments: [
        tx.object(this.config.gameObjectId),
        tx.pure.id(roomId),
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(correctAnswer)))
      ]
    });
    
    tx.setGasBudget(400_000_000);
    return tx;
  }

  /**
   * Create transaction to distribute multiplayer rewards to winners
   */
  createDistributeMultiplayerRewardsTx(roomId: string): Transaction {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${this.config.packageId}::game::distribute_multiplayer_rewards`,
      arguments: [
        tx.object(this.config.gameObjectId),
        tx.pure.id(roomId)
      ]
    });
    
    tx.setGasBudget(450_000_000);
    return tx;
  }

  // ============ ADMIN/MANAGER FUNCTIONS ============

  /**
   * Create transaction to add funds to platform pool (admin only)
   */
  createAddPoolFundsTx(amount: number): Transaction {
    const tx = new Transaction();
    const amountInMist = Math.floor(amount * 1_000_000_000);
    
    // Split coins for pool funding
    const [coin] = tx.splitCoins(tx.gas, [amountInMist]);
    
    tx.moveCall({
      target: `${this.config.packageId}::game::add_pool_funds`,
      arguments: [
        tx.object(this.config.gameObjectId),
        coin
      ]
    });
    
    tx.setGasBudget(300_000_000);
    return tx;
  }

  /**
   * Create transaction to set platform fees (admin only)
   */
  createSetPlatformFeeTx(feePercent: number): Transaction {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${this.config.packageId}::game::set_platform_fee`,
      arguments: [
        tx.object(this.config.gameObjectId),
        tx.pure.u64(feePercent)
      ]
    });
    
    tx.setGasBudget(250_000_000);
    return tx;
  }

  /**
   * Create transaction to withdraw platform earnings (admin only)
   */
  createWithdrawEarningsTx(amount: number): Transaction {
    const tx = new Transaction();
    const amountInMist = Math.floor(amount * 1_000_000_000);
    
    tx.moveCall({
      target: `${this.config.packageId}::game::withdraw_platform_earnings`,
      arguments: [
        tx.object(this.config.gameObjectId),
        tx.pure.u64(amountInMist)
      ]
    });
    
    tx.setGasBudget(350_000_000);
    return tx;
  }

  // ============ QUERY FUNCTIONS ============

  /**
   * Check if player has signed contract
   */
  async hasSignedContract(playerAddress: string): Promise<boolean> {
    try {
      console.log('Checking contract status for player:', playerAddress);
      
      // Call the Move view function to check if player has signed contract
      const result = await this.client.devInspectTransactionBlock({
        transactionBlock: (() => {
          const tx = new Transaction();
          tx.moveCall({
            target: `${this.config.packageId}::game::has_signed_contract`,
            arguments: [
              tx.object(this.config.gameObjectId),
              tx.pure.address(playerAddress)
            ]
          });
          return tx;
        })(),
        sender: playerAddress
      });
      
      console.log('Contract status result:', result);
      
      // Parse the result - should return a boolean
      if (result.results?.[0]?.returnValues?.[0]?.[0]) {
        const hasSignedBytes = result.results[0].returnValues[0][0];
        const hasSigned = hasSignedBytes[0] === 1; // Boolean is encoded as u8
        console.log('Player has signed contract:', hasSigned);
        return hasSigned;
      }
      
      console.log('No valid result from contract check');
      return false;
    } catch (error) {
      console.error('Error checking contract status:', error);
      return false;
    }
  }

  /**
   * Get player's solo games
   */
  async getPlayerSoloGames(playerAddress: string): Promise<any[]> {
    try {
      const result = await this.client.getOwnedObjects({
        owner: playerAddress,
        filter: {
          StructType: `${this.config.packageId}::game::SoloGame`
        },
        options: {
          showContent: true,
          showType: true,
          showDisplay: true
        }
      });
      
      return result.data.map(obj => ({
        objectId: obj.data?.objectId,
        content: obj.data?.content,
        type: obj.data?.type
      }));
    } catch (error) {
      console.error('Error fetching player solo games:', error);
      return [];
    }
  }

  /**
   * Get active multiplayer rooms
   */
  async getActiveRooms(): Promise<MultiplayerRoom[]> {
    try {
      const result = await this.client.getDynamicFields({
        parentId: this.config.gameObjectId
      });
      
      const rooms: MultiplayerRoom[] = [];
      
      for (const field of result.data) {
        if (field.objectType?.includes('MultiplayerRoom')) {
          try {
            const roomObject = await this.client.getObject({
              id: field.objectId!,
              options: {
                showContent: true
              }
            });
            
            if (roomObject.data?.content && 'fields' in roomObject.data.content) {
              const fields = roomObject.data.content.fields as any;
              rooms.push({
                id: field.objectId!,
                creator: fields.creator,
                entryFee: parseFloat(fields.entry_fee || '0') / 1_000_000_000,
                maxPlayers: parseInt(fields.max_players || '0'),
                currentPlayers: fields.players || [],
                prizePool: parseFloat(fields.prize_pool?.fields?.value || '0') / 1_000_000_000,
                status: fields.status || 'waiting'
              });
            }
          } catch (error) {
            console.error('Error fetching room details:', error);
          }
        }
      }
      
      return rooms;
    } catch (error) {
      console.error('Error fetching active rooms:', error);
      return [];
    }
  }

  /**
   * Get solo game details
   */
  async getSoloGame(gameId: string): Promise<GameSession | null> {
    try {
      const result = await this.client.getObject({
        id: gameId,
        options: {
          showContent: true,
          showType: true
        }
      });
      
      if (result.data?.content && 'fields' in result.data.content) {
        const fields = result.data.content.fields as any;
        return {
          id: gameId,
          player: fields.player,
          startTime: parseInt(fields.start_time),
          endTime: fields.end_time?.vec?.[0] ? parseInt(fields.end_time.vec[0]) : undefined,
          score: parseInt(fields.score || '0'),
          gameType: fields.game_type,
          rewardAmount: parseFloat(fields.entry_fee || '0') / 1_000_000_000,
          claimed: fields.reward_claimed || false
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching solo game:', error);
      return null;
    }
  }

  /**
   * Get the most recent solo game for a player from the platform
   * This is a workaround for when event parsing fails
   */
  async getLatestPlayerSoloGame(playerAddress: string): Promise<string | null> {
    try {
      console.log('🔍 Querying latest solo game for player:', playerAddress);
      
      // Get the GamePlatform object to access the active_solo_games table
      const platformObject = await this.client.getObject({
        id: this.config.gameObjectId,
        options: {
          showContent: true,
          showType: true
        }
      });
      
      if (!platformObject.data?.content || !('fields' in platformObject.data.content)) {
        console.log('❌ Could not access GamePlatform object');
        return null;
      }
      
      const fields = platformObject.data.content.fields as any;
      console.log('🏛️ GamePlatform fields available:', Object.keys(fields));
      
      // Try to access the active_solo_games table
      if (fields.active_solo_games) {
        console.log('🎮 Found active_solo_games table:', fields.active_solo_games);
        
        // Check if the table has direct access to games via fields.id.id structure
        const tableId = fields.active_solo_games?.fields?.id?.id;
        if (tableId) {
          console.log('📋 Found table ID:', tableId);
          
          // Get dynamic fields (table entries) for the active_solo_games table
          const dynamicFields = await this.client.getDynamicFields({
            parentId: tableId
          });
          
          console.log('📋 Dynamic fields found:', dynamicFields.data?.length || 0);
          
          // Look for solo game entries in the table
          for (const field of dynamicFields.data || []) {
            if (field.objectId) {
              try {
                const fieldObject = await this.client.getObject({
                  id: field.objectId,
                  options: { showContent: true }
                });
                
                if (fieldObject.data?.content && 'fields' in fieldObject.data.content) {
                  const gameFields = fieldObject.data.content.fields as any;
                  console.log('🔍 Checking game entry:', gameFields);
                  
                  // The actual game ID might be in the key, or we need to get the value
                  if (gameFields.player === playerAddress) {
                    console.log('✅ Found matching solo game in table:', field.objectId);
                    console.log('🎮 Game data:', gameFields);
                    return field.objectId;
                  }
                  
                  // Sometimes the game object itself is referenced in the value
                  if (gameFields.value && gameFields.value.fields) {
                    const gameValue = gameFields.value.fields;
                    if (gameValue.player === playerAddress) {
                      // Return the actual game ID from the key or value
                      const actualGameId = gameFields.name || field.objectId;
                      console.log('✅ Found matching solo game via value:', actualGameId);
                      console.log('🎮 Game value data:', gameValue);
                      return actualGameId;
                    }
                  }
                }
              } catch (error) {
                console.log('⚠️ Could not read table entry:', field.objectId);
              }
            }
          }
        }
        
        // Fallback: try the old approach with GamePlatform as parent
        console.log('🔄 Falling back to GamePlatform dynamic fields...');
        const platformFields = await this.client.getDynamicFields({
          parentId: this.config.gameObjectId
        });
        
        console.log('📋 Platform dynamic fields found:', platformFields.data?.length || 0);
        
        // Look for solo game entries
        for (const field of platformFields.data || []) {
          if (field.objectId) {
            try {
              const fieldObject = await this.client.getObject({
                id: field.objectId,
                options: { showContent: true }
              });
              
              if (fieldObject.data?.content && 'fields' in fieldObject.data.content) {
                const gameFields = fieldObject.data.content.fields as any;
                if (gameFields.player === playerAddress) {
                  console.log('✅ Found matching solo game via fallback:', field.objectId);
                  console.log('🎮 Game data:', gameFields);
                  return field.objectId;
                }
              }
            } catch (error) {
              console.log('⚠️ Could not read dynamic field:', field.objectId);
            }
          }
        }
      }
      
      console.log('❌ No matching solo games found for player');
      return null;
    } catch (error) {
      console.error('Error querying latest player solo game:', error);
      return null;
    }
  }

  /**
   * Get admin address from game object
   */
  async getGameAdmin(): Promise<string | null> {
    try {
      const objectResult = await this.client.getObject({
        id: this.config.gameObjectId,
        options: {
          showContent: true,
          showType: true
        }
      });
      
      if (objectResult.data?.content && 'fields' in objectResult.data.content) {
        const fields = objectResult.data.content.fields as any;
        return fields.admin || null;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching game admin:', error);
      return null;
    }
  }

  /**
   * Get platform statistics
   */
  async getPlatformStats(): Promise<{
    totalGamesPlayed: number;
    totalRewardsDistributed: number;
    platformBalance: number;
  }> {
    try {
      // First try direct object parsing
      const objectResult = await this.client.getObject({
        id: this.config.gameObjectId,
        options: {
          showContent: true,
          showType: true
        }
      });
      
      if (objectResult.data?.content && 'fields' in objectResult.data.content) {
        const fields = objectResult.data.content.fields as any;
        
        // Parse balance from different possible field formats
        let balanceValue = 0;
        if (typeof fields.platform_balance === 'string') {
          balanceValue = parseFloat(fields.platform_balance);
        } else if (fields.platform_balance?.fields?.value) {
          balanceValue = parseFloat(fields.platform_balance.fields.value);
        } else if (typeof fields.platform_balance === 'number') {
          balanceValue = fields.platform_balance;
        } else if (fields.platform_balance) {
          balanceValue = parseFloat(fields.platform_balance);
        }
        
        const stats = {
          totalGamesPlayed: parseInt(fields.total_games_played || '0'),
          totalRewardsDistributed: parseFloat(fields.total_rewards_distributed || '0') / 1_000_000_000,
          platformBalance: balanceValue / 1_000_000_000
        };
        
        // Return object parsing result if balance found
        if (balanceValue > 0) {
          return stats;
        }
      }

      // Fallback to Move view function
      const result = await this.client.devInspectTransactionBlock({
        transactionBlock: (() => {
          const tx = new Transaction();
          tx.moveCall({
            target: `${this.config.packageId}::game::get_platform_stats`,
            arguments: [
              tx.object(this.config.gameObjectId)
            ]
          });
          return tx;
        })(),
        sender: '0x0000000000000000000000000000000000000000000000000000000000000000'
      });
      
      if (result.results?.[0]?.returnValues) {
        const returnValues = result.results[0].returnValues;
        return {
          totalGamesPlayed: parseInt(String(returnValues[0]?.[0] || '0')),
          totalRewardsDistributed: parseFloat(String(returnValues[1]?.[0] || '0')) / 1_000_000_000,
          platformBalance: parseFloat(String(returnValues[2]?.[0] || '0')) / 1_000_000_000
        };
      }
      
      return {
        totalGamesPlayed: 0,
        totalRewardsDistributed: 0,
        platformBalance: 0
      };
    } catch (error) {
      console.error('Error fetching platform stats:', error);
      return {
        totalGamesPlayed: 0,
        totalRewardsDistributed: 0,
        platformBalance: 0
      };
    }
  }

  /**
   * Get room information
   */
  async getRoomInfo(roomId: string): Promise<{
    players: string[];
    prizePool: number;
    status: string;
    currentQuestion: number;
  } | null> {
    try {
      const roomObject = await this.client.getObject({
        id: roomId,
        options: {
          showContent: true
        }
      });
      
      if (roomObject.data?.content && 'fields' in roomObject.data.content) {
        const fields = roomObject.data.content.fields as any;
        return {
          players: fields.players || [],
          prizePool: parseFloat(fields.prize_pool?.fields?.value || '0') / 1_000_000_000,
          status: fields.status || 'waiting',
          currentQuestion: parseInt(fields.current_question || '0')
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching room info:', error);
      return null;
    }
  }

  // ============ UTILITY FUNCTIONS ============

  /**
   * Convert SUI to MIST
   */
  static suiToMist(sui: number): number {
    return Math.floor(sui * 1_000_000_000);
  }

  /**
   * Convert MIST to SUI
   */
  static mistToSui(mist: number): number {
    return mist / 1_000_000_000;
  }


  /**
   * Generate unique session ID
   */
  static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique room ID
   */
  static generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }

  /**
   * Validate transaction result
   */
  static validateTransactionResult(result: any): boolean {
    return result && result.digest && result.effects?.status?.status === 'success';
  }

  /**
   * Extract error message from transaction result
   */
  static extractErrorMessage(result: any): string {
    if (result?.effects?.status?.error) {
      return result.effects.status.error;
    }
    if (result?.errors && result.errors.length > 0) {
      return result.errors[0].message || 'Transaction failed';
    }
    return 'Unknown transaction error';
  }
}

// Create default contract instance for testnet
export const createGameContract = (client: SuiClient): GameContract => {
  return new GameContract(GAME_CONTRACT_CONFIGS.testnet, client);
};

// Export the default configuration
export const getGameContractConfig = () => GAME_CONTRACT_CONFIGS.testnet;