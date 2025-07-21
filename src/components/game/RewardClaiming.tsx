'use client';
import React, { useState, useEffect } from 'react';
import { useWalletOperations } from '@/hooks/useWalletOperations';
import { 
  Coins, 
  CheckCircle, 
  AlertCircle, 
  Loader, 
  Trophy,
  ExternalLink,
  Sparkles,
  Gift
} from 'lucide-react';

interface RewardClaimingProps {
  rewardAmount: number;
  gameType: 'solo' | 'multiplayer' | 'ai';
  sessionId?: string;
  gameContractAddress?: string;
  onClaimed: (transactionHash?: string) => void;
  onError?: (error: string) => void;
}

export function RewardClaiming({ 
  rewardAmount, 
  gameType, 
  sessionId,
  gameContractAddress = '0x123...', // Default contract address
  onClaimed, 
  onError 
}: RewardClaimingProps) {
  const { 
    claimRewards, 
    transferSui,
    isProcessing, 
    isConnected, 
    hasEnoughBalance,
    error: walletError,
    clearError,
    currentAccount
  } = useWalletOperations();
  
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  // Clear errors when component mounts
  useEffect(() => {
    clearError();
    setError(null);
  }, [clearError]);

  // Update error state from wallet operations
  useEffect(() => {
    if (walletError) {
      setError(walletError);
      onError?.(walletError);
    }
  }, [walletError, onError]);

  const handleClaim = async () => {
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    if (!hasEnoughBalance(0.01)) {
      setError('Insufficient SUI balance for transaction fees');
      return;
    }

    try {
      setError(null);
      clearError();

      let result;
      
      if (sessionId && gameContractAddress) {
        // Claim through smart contract
        result = await claimRewards(
          gameContractAddress,
          sessionId,
          rewardAmount,
          {
            onSuccess: (txResult:any) => {
              console.log('Rewards claimed successfully:', txResult);
              setTransactionHash(txResult.digest);
              setClaimed(true);
              onClaimed(txResult.digest);
            },
            onError: (err:any) => {
              console.error('Failed to claim rewards:', err);
              setError(err.message || 'Failed to claim rewards');
            }
          }
        );
      } else {
        // Direct transfer (for demo purposes)
        result = await transferSui(
          currentAccount?.address || '',
          0, // Demo: just create a transaction
          {
            onSuccess: (txResult:any) => {
              console.log('Demo reward claim successful:', txResult);
              setTransactionHash(txResult.digest);
              setClaimed(true);
              onClaimed(txResult.digest);
            },
            onError: (err:any) => {
              console.error('Demo reward claim failed:', err);
              setError(err.message || 'Failed to process reward claim');
            }
          }
        );
      }

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to claim rewards';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const getGameTypeIcon = () => {
    switch (gameType) {
      case 'ai':
        return <Sparkles className="w-8 h-8" />;
      case 'multiplayer':
        return <Trophy className="w-8 h-8" />;
      default:
        return <Gift className="w-8 h-8" />;
    }
  };

  const getGameTypeLabel = () => {
    switch (gameType) {
      case 'ai':
        return 'AI Challenge Reward';
      case 'multiplayer':
        return 'Multiplayer Victory';
      default:
        return 'Game Completion';
    }
  };

  const getExplorerUrl = (hash: string) => {
    return `https://suiscan.xyz/mainnet/tx/${hash}`;
  };

  // Success state
  if (claimed) {
    return (
      <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-6 text-center animate-fadeIn">
        <div className="mb-4">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-2xl font-bold text-green-300 mb-2">Rewards Claimed! 🎉</h3>
          <p className="text-green-200 mb-4">
            <span className="font-bold text-xl">{rewardAmount} SUI</span> tokens have been processed
          </p>
          
          {transactionHash && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4">
              <p className="text-green-200 text-sm mb-2">Transaction Hash:</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-green-300 text-xs bg-green-500/10 px-2 py-1 rounded">
                  {transactionHash.slice(0, 8)}...{transactionHash.slice(-8)}
                </code>
                <a
                  href={getExplorerUrl(transactionHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:text-green-300 transition-colors"
                  title="View on Explorer"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}
        </div>
        
        <div className="text-sm text-green-200">
          {getGameTypeLabel()} • {new Date().toLocaleString()}
        </div>
      </div>
    );
  }

  // Claiming state or initial state
  return (
    <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl p-6 border-2 border-yellow-500/40">
      <div className="text-center">
        <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          {getGameTypeIcon()}
        </div>
        
        <h3 className="text-2xl font-bold text-yellow-400 mb-2">
          Congratulations! 🎉
        </h3>
        
        <div className="mb-4">
          <p className="text-white/80 mb-2">You've earned</p>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Coins className="w-6 h-6 text-yellow-400" />
            <span className="text-yellow-400 font-bold text-3xl">
              {rewardAmount}
            </span>
            <span className="text-yellow-400 font-bold text-xl">SUI</span>
          </div>
          <p className="text-sm text-yellow-200">{getGameTypeLabel()}</p>
        </div>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-red-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}
        
        {!isConnected && (
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-blue-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">Please connect your wallet to claim rewards</span>
            </div>
          </div>
        )}
        
        <button
          onClick={handleClaim}
          disabled={isProcessing || !isConnected}
          className={`
            px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 mx-auto
            ${isProcessing || !isConnected 
              ? 'bg-gray-600 cursor-not-allowed opacity-50' 
              : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 hover:scale-105 hover:shadow-2xl'
            }
            text-white min-w-[200px]
          `}
        >
          {isProcessing ? (
            <>
              <Loader className="w-6 h-6 animate-spin" />
              <span>Processing...</span>
            </>
          ) : !isConnected ? (
            <>
              <AlertCircle className="w-6 h-6" />
              <span>Connect Wallet</span>
            </>
          ) : (
            <>
              <Coins className="w-6 h-6" />
              <span>Claim Rewards</span>
            </>
          )}
        </button>
        
        {isConnected && !isProcessing && (
          <div className="mt-4 text-xs text-yellow-200/80">
            {!hasEnoughBalance(0.01) ? (
              <div className="flex items-center justify-center gap-1 text-red-300">
                <AlertCircle className="w-3 h-3" />
                <span>Insufficient SUI for transaction fees</span>
              </div>
            ) : (
              <span>✨ Transaction fees will be deducted from your wallet</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}