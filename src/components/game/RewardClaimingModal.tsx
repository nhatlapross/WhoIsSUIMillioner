'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  useCurrentAccount, 
  useSignAndExecuteTransaction,
  useSuiClient 
} from '@mysten/dapp-kit';
import { 
  Trophy, 
  Coins, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  X,
  ExternalLink,
  Gift
} from 'lucide-react';
import { createGameContract } from '@/services/gameContract';

interface GameReward {
  gameId: string;
  rewardAmount: number;
  gameType: 'solo' | 'multiplayer';
  score?: number;
  isClaimed: boolean;
  timestamp: number;
}

interface RewardClaimingModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId?: string;
  gameType?: 'solo' | 'multiplayer';
}

const RewardClaimingModal: React.FC<RewardClaimingModalProps> = ({
  isOpen,
  onClose,
  gameId,
  gameType = 'solo'
}) => {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rewards, setRewards] = useState<GameReward[]>([]);
  const [isLoadingRewards, setIsLoadingRewards] = useState(false);
  const [selectedRewards, setSelectedRewards] = useState<Set<string>>(new Set());

  const gameContract = useMemo(() => createGameContract(suiClient), [suiClient]);

  // Load available rewards when modal opens
  useEffect(() => {
    const loadRewards = async () => {
      if (!currentAccount?.address || !isOpen) return;
      
      setIsLoadingRewards(true);
      try {
        // Get player's solo games
        const soloGames = await gameContract.getPlayerSoloGames(currentAccount.address);
        
        const availableRewards: GameReward[] = [];
        
        for (const game of soloGames) {
          if (game.content && 'fields' in game.content) {
            const fields = game.content.fields as any;
            const rewardAmount = parseFloat(fields.entry_fee || '0') / 1_000_000_000;
            
            // Only show games that have ended and rewards not claimed
            if (fields.end_time && !fields.reward_claimed && fields.score > 0) {
              availableRewards.push({
                gameId: game.objectId!,
                rewardAmount: fields.score * 0.1, // 0.1 SUI per correct answer
                gameType: 'solo',
                score: parseInt(fields.score || '0'),
                isClaimed: false,
                timestamp: parseInt(fields.start_time || '0')
              });
            }
          }
        }

        setRewards(availableRewards);
        
        // If a specific game is provided, auto-select it
        if (gameId && availableRewards.find(r => r.gameId === gameId)) {
          setSelectedRewards(new Set([gameId]));
        }
      } catch (error) {
        console.error('Error loading rewards:', error);
        setError('Failed to load available rewards');
      } finally {
        setIsLoadingRewards(false);
      }
    };

    loadRewards();
  }, [currentAccount?.address, isOpen, gameId, gameContract]);

  const handleClaimRewards = async () => {
    if (!currentAccount || selectedRewards.size === 0) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // For now, claim one reward at a time (could be batch later)
      const firstRewardId = Array.from(selectedRewards)[0];
      const reward = rewards.find(r => r.gameId === firstRewardId);
      
      if (!reward) {
        setError('Selected reward not found');
        setIsLoading(false);
        return;
      }

      // For solo games, rewards are automatically distributed when finishing the game
      // This is mainly for UI feedback - the actual reward claiming happens in finish_solo_game
      const transaction = gameContract.createFinishSoloGameTx(
        reward.gameId,
        reward.score || 0,
        10 // Assuming 10 total questions
      );

      signAndExecuteTransaction({
        transaction
      }, {
        onSuccess: (result) => {
          console.log('Rewards claimed successfully:', result);
          
          // Update the rewards list to mark as claimed
          setRewards(prev => prev.map(r => 
            selectedRewards.has(r.gameId) 
              ? { ...r, isClaimed: true }
              : r
          ));
          
          setSelectedRewards(new Set());
          
          // Auto-close after a delay
          setTimeout(() => {
            onClose();
          }, 2000);
        },
        onError: (error) => {
          console.error('Error claiming rewards:', error);
          setError(error.message || 'Failed to claim rewards. Please try again.');
          setIsLoading(false);
        }
      });
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      setError(error.message || 'Failed to create transaction. Please try again.');
      setIsLoading(false);
    }
  };

  const toggleRewardSelection = (gameId: string) => {
    setSelectedRewards(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(gameId)) {
        newSelection.delete(gameId);
      } else {
        newSelection.add(gameId);
      }
      return newSelection;
    });
  };

  const getTotalSelectedRewards = () => {
    return rewards
      .filter(r => selectedRewards.has(r.gameId))
      .reduce((total, r) => total + r.rewardAmount, 0);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <Trophy className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Claim Rewards</h2>
              <p className="text-sm text-white/60">Collect your earned SUI tokens</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoadingRewards ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3 text-blue-400">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Loading available rewards...</span>
              </div>
            </div>
          ) : rewards.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Rewards Available</h3>
              <p className="text-white/70 mb-6">
                Complete games with correct answers to earn rewards that can be claimed.
              </p>
              <button
                onClick={onClose}
                className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Rewards List */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-4">Available Rewards</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {rewards.map((reward) => (
                    <div
                      key={reward.gameId}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedRewards.has(reward.gameId)
                          ? 'border-blue-400 bg-blue-500/10'
                          : 'border-white/20 bg-white/5 hover:bg-white/10'
                      }`}
                      onClick={() => toggleRewardSelection(reward.gameId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedRewards.has(reward.gameId)}
                            onChange={() => {}}
                            className="w-4 h-4 text-blue-500 border-2 border-white/30 rounded focus:ring-blue-500 bg-transparent"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">
                                {reward.gameType === 'solo' ? 'Solo Game' : 'Multiplayer Game'}
                              </span>
                              {reward.score && (
                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                                  {reward.score} correct
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-white/60">
                              {formatTimestamp(reward.timestamp)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4 text-yellow-400" />
                          <span className="text-yellow-400 font-bold">
                            {reward.rewardAmount.toFixed(4)} SUI
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selection Summary */}
              {selectedRewards.size > 0 && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 font-medium">
                      {selectedRewards.size} reward{selectedRewards.size > 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/80">Total to claim:</span>
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-yellow-400" />
                      <span className="text-yellow-400 font-bold text-lg">
                        {getTotalSelectedRewards().toFixed(4)} SUI
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 text-sm">{error}</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handleClaimRewards}
                  disabled={selectedRewards.size === 0 || isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Claiming Rewards...
                    </>
                  ) : (
                    <>
                      <Trophy className="w-4 h-4" />
                      Claim Selected Rewards
                    </>
                  )}
                </button>
                
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-6 py-3 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>

              {/* Transaction Info */}
              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <ExternalLink className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-blue-200 text-xs">
                    <strong>Blockchain Transaction:</strong> Claiming rewards will create a transaction 
                    on the Sui blockchain. Gas fees will be deducted from your wallet balance.
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RewardClaimingModal;