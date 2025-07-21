'use client';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  useCurrentAccount, 
  useSignAndExecuteTransaction,
  useSuiClient 
} from '@mysten/dapp-kit';
import { createGameContract } from '@/services/gameContract';

interface ContractStatus {
  isSigned: boolean;
  isLoading: boolean;
  error: string | null;
}

interface GameTransaction {
  type: 'sign_contract' | 'start_solo' | 'finish_solo' | 'create_room' | 'join_room' | 'submit_answer';
  status: 'idle' | 'pending' | 'success' | 'error';
  error?: string;
  result?: any;
}

export const useGameTransactions = () => {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  
  const [contractStatus, setContractStatus] = useState<ContractStatus>({
    isSigned: false,
    isLoading: false,
    error: null
  });
  
  const [gameTransaction, setGameTransaction] = useState<GameTransaction>({
    type: 'sign_contract',
    status: 'idle'
  });

  // Memoize the game contract to prevent recreation on every render
  const gameContract = useMemo(() => createGameContract(suiClient), [suiClient]);

  // Validate contract on load
  useEffect(() => {
    const validateContract = async () => {
      if (!gameContract) return;
      
      console.log('🔧 Validating smart contract deployment...');
      const validation = await gameContract.validateContract();
      
      if (!validation.isValid) {
        console.error('❌ Smart contract validation failed:', validation.errors);
        validation.errors.forEach(error => console.error('  -', error));
      } else {
        console.log('✅ Smart contract validation successful');
      }
    };
    
    validateContract();
  }, [gameContract]);

  // Check contract status when account changes
  useEffect(() => {
    const checkContractStatus = async () => {
      if (!currentAccount?.address) {
        setContractStatus({ isSigned: false, isLoading: false, error: null });
        return;
      }

      setContractStatus(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const isSigned = await gameContract.hasSignedContract(currentAccount.address);
        setContractStatus({ isSigned, isLoading: false, error: null });
      } catch (error: any) {
        console.error('Error checking contract status:', error);
        setContractStatus({ 
          isSigned: false, 
          isLoading: false, 
          error: error.message || 'Failed to check contract status' 
        });
      }
    };

    checkContractStatus();
  }, [currentAccount?.address, gameContract]);

  // Sign player contract
  const signContract = useCallback(async (termsVersion: string = 'v1.0.0'): Promise<boolean> => {
    if (!currentAccount) {
      throw new Error('No wallet connected');
    }

    console.log('🖊️ Starting contract signing transaction:', {
      playerAddress: currentAccount.address,
      termsVersion,
      ...gameContract.getConfig()
    });

    setGameTransaction({ type: 'sign_contract', status: 'pending' });

    return new Promise((resolve, reject) => {
      try {
        const transaction = gameContract.createSignContractTx(termsVersion);
        console.log('📋 Contract signing transaction created:', transaction);

        signAndExecuteTransaction({
          transaction
        }, {
          onSuccess: (result) => {
            console.log('✅ Contract signing transaction successful:', result);
            console.log('📝 Contract signing effects:', JSON.stringify(result.effects, null, 2));
            
            // Check what was actually created or modified
            const effects = result.effects as any;
            if (effects?.created && effects.created.length > 0) {
              console.log('✅ Contract signing created objects:', effects.created);
            } else if (effects?.mutated && effects.mutated.length > 0) {
              console.log('✅ Contract signing mutated objects:', effects.mutated);
            } else {
              console.log('⚠️ No objects created or mutated in contract signing');
            }
            
            setGameTransaction({ type: 'sign_contract', status: 'success', result });
            setContractStatus(prev => ({ ...prev, isSigned: true }));
            resolve(true);
          },
          onError: (error) => {
            console.error('Error signing contract:', error);
            setGameTransaction({ 
              type: 'sign_contract', 
              status: 'error', 
              error: error.message || 'Failed to sign contract' 
            });
            reject(error);
          }
        });
      } catch (error: any) {
        console.error('Error creating sign contract transaction:', error);
        setGameTransaction({ 
          type: 'sign_contract', 
          status: 'error', 
          error: error.message || 'Failed to create transaction' 
        });
        reject(error);
      }
    });
  }, [currentAccount, gameContract, signAndExecuteTransaction]);

  // Start solo game
  const startSoloGame = useCallback(async (entryFee: number, gameType: string = 'normal'): Promise<string> => {
    if (!currentAccount) {
      throw new Error('No wallet connected');
    }

    if (!contractStatus.isSigned) {
      throw new Error('Player contract must be signed first');
    }

    setGameTransaction({ type: 'start_solo', status: 'pending' });

    return new Promise((resolve, reject) => {
      try {
        const transaction = gameContract.createStartSoloGameTx(entryFee, gameType);

        signAndExecuteTransaction({
          transaction
        }, {
          onSuccess: (result:any) => {
            console.log('✅ Solo game blockchain transaction successful:', result);
            setGameTransaction({ type: 'start_solo', status: 'success', result });
            
            // Extract game ID from result
            let gameId = 'unknown';
            try {
              const effects = result.effects as any;
              console.log('📝 Full transaction result:', JSON.stringify(result, null, 2));
              console.log('📝 Transaction effects:', JSON.stringify(effects, null, 2));
              
              // Priority 1: Check for SoloGameStarted event first (most reliable)
              if (result.events && Array.isArray(result.events) && result.events.length > 0) {
                console.log('📅 Checking transaction events:', result.events);
                console.log('📅 Event details:', result.events.map((e: any) => ({
                  type: e.type,
                  sender: e.sender,
                  parsedJson: e.parsedJson
                })));
                
                // Try multiple approaches to find the SoloGameStarted event
                let gameStartEvent = null;
                
                // Approach 1: Look for event type containing SoloGameStarted
                gameStartEvent = result.events.find((event: any) => 
                  event.type?.includes('SoloGameStarted')
                );
                
                // Approach 2: Look for any event with game_id in parsedJson
                if (!gameStartEvent) {
                  gameStartEvent = result.events.find((event: any) => 
                    event.parsedJson?.game_id
                  );
                }
                
                // Approach 3: Look for events from our contract package
                if (!gameStartEvent) {
                  const packageId = gameContract.getConfig().packageId;
                  gameStartEvent = result.events.find((event: any) => 
                    event.type?.startsWith(packageId) && 
                    (event.type?.includes('game') || event.type?.includes('Game'))
                  );
                }
                
                if (gameStartEvent) {
                  console.log('🎮 Found game event:', gameStartEvent);
                  console.log('🎮 Event parsedJson:', gameStartEvent.parsedJson);
                  
                  // Try different possible field names for the game ID
                  const possibleGameIds = [
                    gameStartEvent.parsedJson?.game_id,
                    gameStartEvent.parsedJson?.gameId,
                    gameStartEvent.parsedJson?.id,
                    gameStartEvent.id,
                    // Sometimes the ID is nested deeper
                    gameStartEvent.parsedJson?.game_id?.inner,
                    gameStartEvent.parsedJson?.game_id?.id,
                  ].filter(Boolean);
                  
                  if (possibleGameIds.length > 0) {
                    gameId = possibleGameIds[0];
                    console.log('✅ Successfully extracted game ID from event:', gameId);
                    console.log('✅ Game ID source field:', Object.keys(gameStartEvent.parsedJson || {}).find(key => 
                      gameStartEvent.parsedJson[key] === gameId
                    ));
                  } else {
                    console.log('⚠️ Event found but no recognizable game ID field:', gameStartEvent.parsedJson);
                  }
                } else {
                  console.log('❌ No game-related event found. Available event types:', 
                    result.events.map((e: any) => e.type)
                  );
                }
              } else {
                console.log('❌ No events found in transaction result');
              }
              
              // Priority 2: Check created objects (if event parsing failed)
              if (gameId === 'unknown' && effects?.created && Array.isArray(effects.created) && effects.created.length > 0) {
                console.log('🏗️ Checking created objects:', effects.created);
                
                // Look for SoloGame object specifically by type name
                const soloGameObject = effects.created.find((obj: any) => 
                  obj.reference?.objectId && 
                  (obj.objectType?.includes('SoloGame') || 
                   obj.objectType?.includes('solo_game') ||
                   obj.objectType?.includes('game'))
                );
                
                if (soloGameObject) {
                  gameId = soloGameObject.reference.objectId;
                  console.log('🆔 Extracted game ID from SoloGame created object:', gameId);
                  console.log('🆔 Object type was:', soloGameObject.objectType);
                } else {
                  // Look for any object that's not a coin or system object
                  const nonSystemObject = effects.created.find((obj: any) => 
                    obj.reference?.objectId && 
                    obj.objectType &&
                    !obj.objectType.includes('Coin') &&
                    !obj.objectType.includes('coin') &&
                    !obj.objectType.includes('0x2::') && // System objects
                    obj.reference.objectId !== '0x6' // Clock object
                  );
                  
                  if (nonSystemObject) {
                    gameId = nonSystemObject.reference.objectId;
                    console.log('🆔 Extracted game ID from non-system created object:', gameId);
                    console.log('🆔 Object type was:', nonSystemObject.objectType);
                  } else {
                    console.log('⚠️ No suitable created objects found. Available object types:',
                      effects.created.map((obj: any) => obj.objectType)
                    );
                  }
                }
              }
              
              // Priority 3: Check mutated objects (table updates)
              if (gameId === 'unknown' && effects?.mutated && Array.isArray(effects.mutated) && effects.mutated.length > 0) {
                console.log('📋 Checking mutated objects:', effects.mutated);
                // Look for the GamePlatform object which would be mutated when adding to active_solo_games table
                const platformObject = effects.mutated.find((obj: any) => 
                  obj.reference?.objectId && 
                  obj.objectType?.includes('GamePlatform')
                );
                if (platformObject) {
                  console.log('🏛️ Found mutated GamePlatform, checking for game ID in events again');
                  // The actual game ID should be in events, not mutated objects
                }
              }
            } catch (error) {
              console.error('❌ Error extracting game ID from result:', error);
            }
            
            // Final fallback: try to query the platform table for recent games
            if (gameId === 'unknown' && currentAccount?.address) {
              console.log('🔍 Final attempt: querying GamePlatform table for recent game...');
              
              // Use Promise-based approach since we're in onSuccess callback
              gameContract.getLatestPlayerSoloGame(currentAccount.address)
                .then(latestGameId => {
                  if (latestGameId) {
                    console.log('✅ Successfully recovered game ID from platform table:', latestGameId);
                    resolve(latestGameId);
                  } else {
                    console.log('⚠️ Could not find game in platform table either');
                    const fallbackId = result.digest ? `tx_${result.digest}` : 'unknown';
                    console.log('🔄 Using transaction digest as final fallback:', fallbackId);
                    resolve(fallbackId);
                  }
                })
                .catch(error => {
                  console.error('❌ Error querying platform table:', error);
                  const fallbackId = result.digest ? `tx_${result.digest}` : 'unknown';
                  console.log('🔄 Using transaction digest as final fallback after error:', fallbackId);
                  resolve(fallbackId);
                });
              return; // Exit early since we're handling the resolve in the Promise chain
            }
            
            resolve(gameId);
          },
          onError: (error) => {
            console.error('Error starting solo game:', error);
            setGameTransaction({ 
              type: 'start_solo', 
              status: 'error', 
              error: error.message || 'Failed to start solo game' 
            });
            reject(error);
          }
        });
      } catch (error: any) {
        console.error('Error creating start solo game transaction:', error);
        setGameTransaction({ 
          type: 'start_solo', 
          status: 'error', 
          error: error.message || 'Failed to create transaction' 
        });
        reject(error);
      }
    });
  }, [currentAccount, contractStatus.isSigned, gameContract, signAndExecuteTransaction]);

  // Finish solo game
  const finishSoloGame = useCallback(async (
    gameId: string, 
    score: number, 
    totalQuestions: number
  ): Promise<boolean> => {
    if (!currentAccount) {
      throw new Error('No wallet connected');
    }

    setGameTransaction({ type: 'finish_solo', status: 'pending' });

    return new Promise((resolve, reject) => {
      try {
        const transaction = gameContract.createFinishSoloGameTx(gameId, score, totalQuestions);

        signAndExecuteTransaction({
          transaction,
        }, {
          onSuccess: (result) => {
            console.log('Solo game finished successfully:', result);
            setGameTransaction({ type: 'finish_solo', status: 'success', result });
            resolve(true);
          },
          onError: (error) => {
            console.error('Error finishing solo game:', error);
            setGameTransaction({ 
              type: 'finish_solo', 
              status: 'error', 
              error: error.message || 'Failed to finish solo game' 
            });
            reject(error);
          }
        });
      } catch (error: any) {
        console.error('Error creating finish solo game transaction:', error);
        setGameTransaction({ 
          type: 'finish_solo', 
          status: 'error', 
          error: error.message || 'Failed to create transaction' 
        });
        reject(error);
      }
    });
  }, [currentAccount, gameContract, signAndExecuteTransaction]);

  return {
    // State
    contractStatus,
    gameTransaction,
    isConnected: !!currentAccount,
    userAddress: currentAccount?.address,
    
    // Actions
    signContract,
    startSoloGame,
    finishSoloGame,
    
    // Utilities
    resetTransaction: () => setGameTransaction(prev => ({ ...prev, status: 'idle', error: undefined })),
    refreshContractStatus: () => {
      if (currentAccount?.address) {
        gameContract.hasSignedContract(currentAccount.address)
          .then(isSigned => setContractStatus(prev => ({ ...prev, isSigned })))
          .catch(console.error);
      }
    }
  };
};