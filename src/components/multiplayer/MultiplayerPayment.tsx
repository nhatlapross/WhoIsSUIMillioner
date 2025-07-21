'use client';
import React, { useState, useEffect } from 'react';
import { useGameTransactions } from '@/hooks/useGameTransactions';
import { useWalletOperations } from '@/hooks/useWalletOperations';
import { 
  Coins, 
  CheckCircle, 
  AlertCircle, 
  Loader, 
  Users,
  Crown,
  Shield,
  DollarSign,
  ArrowRight,
  Wallet
} from 'lucide-react';

interface MultiplayerPaymentProps {
  mode: 'create' | 'join';
  entryFee: number;
  maxPlayers?: number; // Only for create mode
  roomId?: string; // Only for join mode
  onSuccess: (result: { roomId?: string; transactionHash: string }) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

export function MultiplayerPayment({
  mode,
  entryFee,
  maxPlayers = 10,
  roomId,
  onSuccess,
  onError,
  onCancel
}: MultiplayerPaymentProps) {
  const { 
    createMultiplayerRoom, 
    joinMultiplayerRoom, 
    isProcessing, 
    error: gameError,
    clearError 
  } = useGameTransactions();
  
  const { 
    isConnected, 
    hasEnoughBalance, 
    balanceInSui,
    currentAccount 
  } = useWalletOperations();

  const [paymentStep, setPaymentStep] = useState<'confirm' | 'processing' | 'success' | 'error'>('confirm');
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Clear errors when component mounts
  useEffect(() => {
    clearError();
    setError(null);
  }, [clearError]);

  // Handle game transaction errors
  useEffect(() => {
    if (gameError) {
      setError(gameError);
      setPaymentStep('error');
      onError?.(gameError);
    }
  }, [gameError, onError]);

  const requiredBalance = entryFee + 0.02; // Entry fee + gas buffer

  const handlePayment = async () => {
    if (!isConnected) {
      setError('Please connect your wallet first');
      setPaymentStep('error');
      return;
    }

    if (!hasEnoughBalance(requiredBalance)) {
      setError(`Insufficient balance. Need ${requiredBalance.toFixed(4)} SUI (${entryFee} entry + 0.02 gas)`);
      setPaymentStep('error');
      return;
    }

    setPaymentStep('processing');
    setError(null);

    try {
      if (mode === 'create') {
        const result = await createMultiplayerRoom(entryFee, maxPlayers, {
          onSuccess: (txResult) => {
            setTransactionHash(txResult.digest);
            setPaymentStep('success');
            onSuccess({ 
              roomId: result.roomId, 
              transactionHash: txResult.digest 
            });
          },
          onError: (err) => {
            setError(err.message || 'Failed to create room');
            setPaymentStep('error');
          }
        });
      } else if (mode === 'join' && roomId) {
        const result = await joinMultiplayerRoom(roomId, entryFee, {
          onSuccess: (txResult) => {
            setTransactionHash(txResult.digest);
            setPaymentStep('success');
            onSuccess({ 
              roomId, 
              transactionHash: txResult.digest 
            });
          },
          onError: (err) => {
            setError(err.message || 'Failed to join room');
            setPaymentStep('error');
          }
        });
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      setPaymentStep('error');
    }
  };

  const getStepContent = () => {
    switch (paymentStep) {
      case 'confirm':
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                {mode === 'create' ? <Crown className="w-8 h-8 text-yellow-400" /> : <Users className="w-8 h-8 text-blue-400" />}
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {mode === 'create' ? 'Create Multiplayer Room' : 'Join Multiplayer Room'}
              </h3>
              <p className="text-white/70">
                {mode === 'create' 
                  ? 'Pay entry fee to create your multiplayer room'
                  : `Pay entry fee to join room ${roomId}`
                }
              </p>
            </div>

            {/* Payment Details */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/20">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Payment Details
              </h4>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Entry Fee</span>
                  <span className="text-white font-bold flex items-center gap-1">
                    <Coins className="w-4 h-4 text-yellow-400" />
                    {entryFee} SUI
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Estimated Gas</span>
                  <span className="text-white/60">~0.02 SUI</span>
                </div>
                
                <div className="border-t border-white/20 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">Total Required</span>
                    <span className="text-yellow-400 font-bold text-lg">
                      {requiredBalance.toFixed(4)} SUI
                    </span>
                  </div>
                </div>

                {mode === 'create' && (
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Max Players</span>
                    <span className="text-white font-bold">{maxPlayers}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Wallet Status */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-white font-medium">Your Balance</p>
                    <p className="text-white/60 text-sm">{balanceInSui.toFixed(4)} SUI</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasEnoughBalance(requiredBalance) ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="text-green-400 text-sm font-medium">Sufficient</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <span className="text-red-400 text-sm font-medium">Insufficient</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handlePayment}
                disabled={!isConnected || !hasEnoughBalance(requiredBalance)}
                className={`
                  flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3
                  ${!isConnected || !hasEnoughBalance(requiredBalance)
                    ? 'bg-gray-600 cursor-not-allowed opacity-50'
                    : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 hover:scale-105'
                  }
                  text-white
                `}
              >
                <Coins className="w-6 h-6" />
                <span>{mode === 'create' ? 'Create Room' : 'Join Room'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-6 py-4 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Warnings */}
            {!isConnected && (
              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-yellow-300">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">Please connect your wallet to continue</span>
                </div>
              </div>
            )}

            {isConnected && !hasEnoughBalance(requiredBalance) && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-300">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">
                    Insufficient SUI balance. Need {(requiredBalance - balanceInSui).toFixed(4)} more SUI
                  </span>
                </div>
              </div>
            )}
          </div>
        );

      case 'processing':
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
              <Loader className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Processing Payment</h3>
              <p className="text-white/70">
                {mode === 'create' 
                  ? 'Creating your multiplayer room...'
                  : 'Joining the multiplayer room...'
                }
              </p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-blue-200 text-sm">
                Please confirm the transaction in your wallet and wait for it to be processed on the blockchain.
              </p>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-green-300 mb-2">Payment Successful! 🎉</h3>
              <p className="text-green-200">
                {mode === 'create' 
                  ? 'Your multiplayer room has been created successfully'
                  : 'You have successfully joined the multiplayer room'
                }
              </p>
            </div>
            
            {transactionHash && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <p className="text-green-200 text-sm mb-2">Transaction Hash:</p>
                <code className="text-green-300 text-xs bg-green-500/10 px-2 py-1 rounded">
                  {transactionHash.slice(0, 12)}...{transactionHash.slice(-12)}
                </code>
              </div>
            )}
          </div>
        );

      case 'error':
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-red-300 mb-2">Payment Failed</h3>
              <p className="text-red-200 mb-4">
                {error || 'An error occurred while processing your payment'}
              </p>
            </div>
            
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  setPaymentStep('confirm');
                  setError(null);
                  clearError();
                }}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors"
              >
                Try Again
              </button>
              
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 max-w-md w-full">
      {getStepContent()}
    </div>
  );
}