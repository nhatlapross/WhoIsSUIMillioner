'use client';
import React, { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { 
  Shield, 
  Plus, 
  Minus, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Settings,
  Wallet,
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';

import { WalletConnection } from '@/components/wallet/WalletConnection';
import { useGameTransactions } from '@/hooks/useGameTransactions';
import { createGameContract } from '@/services/gameContract';
import { useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';

interface PlatformStats {
  totalGamesPlayed: number;
  totalRewardsDistributed: number;
  platformBalance: number;
}

interface ManagerTransaction {
  type: 'add_funds' | 'set_fee' | 'withdraw';
  status: 'idle' | 'pending' | 'success' | 'error';
  error?: string;
  result?: any;
}


const ManagerPage: React.FC = () => {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const { isConnected, contractStatus } = useGameTransactions();
  
  const [platformStats, setPlatformStats] = useState<PlatformStats>({
    totalGamesPlayed: 0,
    totalRewardsDistributed: 0,
    platformBalance: 0
  });
  
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [addAmount, setAddAmount] = useState('1.0');
  const [feePercent, setFeePercent] = useState('10');
  const [withdrawAmount, setWithdrawAmount] = useState('0.1');
  
  const [transaction, setTransaction] = useState<ManagerTransaction>({
    type: 'add_funds',
    status: 'idle'
  });

  const [gameAdmin, setGameAdmin] = useState<string | null>(null);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(true);

  // Check if current user is admin
  const isAdmin = currentAccount?.address && gameAdmin && currentAccount.address === gameAdmin;
  const gameContract = createGameContract(suiClient);

  // Load admin from game object
  const loadGameAdmin = async () => {
    setIsLoadingAdmin(true);
    try {
      const admin = await gameContract.getGameAdmin();
      setGameAdmin(admin);
    } catch (error) {
      console.error('Error loading game admin:', error);
    } finally {
      setIsLoadingAdmin(false);
    }
  };

  // Load platform statistics
  const loadPlatformStats = async () => {
    setIsLoadingStats(true);
    try {
      const stats = await gameContract.getPlatformStats();
      setPlatformStats(stats);
    } catch (error) {
      console.error('Error loading platform stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    loadGameAdmin();
    loadPlatformStats();
  }, []);

  // Add funds to pool
  const handleAddFunds = async () => {
    if (!currentAccount || !isAdmin) return;
    
    const amount = parseFloat(addAmount);
    if (isNaN(amount) || amount <= 0) {
      setTransaction({
        type: 'add_funds',
        status: 'error',
        error: 'Please enter a valid amount'
      });
      return;
    }

    setTransaction({ type: 'add_funds', status: 'pending' });

    try {
      const tx = gameContract.createAddPoolFundsTx(amount);
      
      signAndExecuteTransaction({
        transaction: tx
      }, {
        onSuccess: (result) => {
          setTransaction({ type: 'add_funds', status: 'success', result });
          
          // Refresh stats after transaction
          setTimeout(() => {
            loadPlatformStats();
          }, 2000);
        },
        onError: (error) => {
          console.error('Failed to add pool funds:', error);
          setTransaction({
            type: 'add_funds',
            status: 'error',
            error: error.message || 'Failed to add funds to pool'
          });
        }
      });
      
    } catch (error: any) {
      console.error('Failed to create add funds transaction:', error);
      setTransaction({
        type: 'add_funds',
        status: 'error',
        error: error.message || 'Failed to create transaction'
      });
    }
  };

  // Set platform fee
  const handleSetFee = async () => {
    if (!currentAccount || !isAdmin) return;
    
    const fee = parseInt(feePercent);
    if (isNaN(fee) || fee < 0 || fee > 100) {
      setTransaction({
        type: 'set_fee',
        status: 'error',
        error: 'Please enter a valid fee percentage (0-100)'
      });
      return;
    }

    setTransaction({ type: 'set_fee', status: 'pending' });

    try {
      const tx = gameContract.createSetPlatformFeeTx(fee);
      
      signAndExecuteTransaction({
        transaction: tx
      }, {
        onSuccess: (result) => {
          setTransaction({ type: 'set_fee', status: 'success' });
        },
        onError: (error) => {
          console.error('Failed to set platform fee:', error);
          setTransaction({
            type: 'set_fee',
            status: 'error',
            error: error.message || 'Failed to set platform fee'
          });
        }
      });
      
    } catch (error: any) {
      console.error('Failed to create set fee transaction:', error);
      setTransaction({
        type: 'set_fee',
        status: 'error',
        error: error.message || 'Failed to create transaction'
      });
    }
  };

  // Withdraw earnings
  const handleWithdraw = async () => {
    if (!currentAccount || !isAdmin) return;
    
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setTransaction({
        type: 'withdraw',
        status: 'error',
        error: 'Please enter a valid withdrawal amount'
      });
      return;
    }

    if (amount > platformStats.platformBalance) {
      setTransaction({
        type: 'withdraw',
        status: 'error',
        error: 'Withdrawal amount exceeds available balance'
      });
      return;
    }

    setTransaction({ type: 'withdraw', status: 'pending' });

    try {
      const tx = gameContract.createWithdrawEarningsTx(amount);
      
      signAndExecuteTransaction({
        transaction: tx
      }, {
        onSuccess: (result) => {
          setTransaction({ type: 'withdraw', status: 'success' });
          loadPlatformStats(); // Refresh stats
        },
        onError: (error) => {
          console.error('Failed to withdraw earnings:', error);
          setTransaction({
            type: 'withdraw',
            status: 'error',
            error: error.message || 'Failed to withdraw earnings'
          });
        }
      });
      
    } catch (error: any) {
      console.error('Failed to create withdraw transaction:', error);
      setTransaction({
        type: 'withdraw',
        status: 'error',
        error: error.message || 'Failed to create transaction'
      });
    }
  };

  // If wallet not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
          <Wallet className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">Manager Access</h2>
          <p className="text-white/70 mb-6">
            Connect your admin wallet to access the platform management panel.
          </p>
          <WalletConnection />
        </div>
      </div>
    );
  }

  // If loading admin status
  if (isLoadingAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
          <Loader2 className="w-16 h-16 text-blue-400 mx-auto mb-6 animate-spin" />
          <h2 className="text-2xl font-bold text-white mb-4">Checking Access</h2>
          <p className="text-white/70">
            Verifying admin privileges...
          </p>
        </div>
      </div>
    );
  }

  // If not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-white/70 mb-4">
            This wallet is not authorized for platform management.
          </p>
          <p className="text-white/50 text-sm mb-2">
            Connected: {currentAccount?.address?.substring(0, 20)}...
          </p>
          {gameAdmin && (
            <p className="text-white/50 text-sm">
              Admin: {gameAdmin.substring(0, 20)}...
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-green-400" />
            <h1 className="text-4xl font-bold text-white">Platform Manager</h1>
            <Settings className="w-8 h-8 text-blue-400" />
          </div>
          <p className="text-white/70">
            Admin Panel for Sui Millionaire Platform
          </p>
          <div className="bg-green-500/20 border border-green-500/40 rounded-lg p-2 mt-4 inline-block">
            <p className="text-green-300 text-sm">
              ✅ Admin: {currentAccount?.address?.substring(0, 20)}...
            </p>
          </div>
        </div>

        {/* Platform Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-blue-400" />
              <h3 className="text-lg font-bold text-white">Games Played</h3>
            </div>
            <div className="text-3xl font-bold text-blue-400">
              {isLoadingStats ? '...' : platformStats.totalGamesPlayed.toLocaleString()}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-green-400" />
              <h3 className="text-lg font-bold text-white">Rewards Distributed</h3>
            </div>
            <div className="text-3xl font-bold text-green-400">
              {isLoadingStats ? '...' : `${platformStats.totalRewardsDistributed.toFixed(2)} SUI`}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="w-6 h-6 text-yellow-400" />
              <h3 className="text-lg font-bold text-white">Platform Balance</h3>
              <button 
                onClick={loadPlatformStats}
                className="ml-auto text-white/50 hover:text-white"
                disabled={isLoadingStats}
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="text-3xl font-bold text-yellow-400">
              {isLoadingStats ? '...' : `${platformStats.platformBalance.toFixed(4)} SUI`}
            </div>
          </div>
        </div>

        {/* Management Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Add Pool Funds */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-6">
              <Plus className="w-6 h-6 text-green-400" />
              <h3 className="text-xl font-bold text-white">Add Pool Funds</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Amount (SUI)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:border-green-400 focus:outline-none"
                  placeholder="1.0"
                />
              </div>
              
              <button
                onClick={handleAddFunds}
                disabled={transaction.type === 'add_funds' && transaction.status === 'pending'}
                className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {transaction.type === 'add_funds' && transaction.status === 'pending' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Adding Funds...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Add to Pool
                  </>
                )}
              </button>
              
              {transaction.type === 'add_funds' && transaction.status === 'error' && (
                <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{transaction.error}</p>
                </div>
              )}
              
              {transaction.type === 'add_funds' && transaction.status === 'success' && (
                <div className="bg-green-500/20 border border-green-500/40 rounded-lg p-3">
                  <p className="text-green-400 text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Funds added successfully!
                  </p>
                  {transaction.result?.digest && (
                    <p className="text-green-300 text-xs mt-1 break-all">
                      TX: {transaction.result.digest.substring(0, 20)}...
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Platform Settings */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-6">
              <Settings className="w-6 h-6 text-blue-400" />
              <h3 className="text-xl font-bold text-white">Platform Settings</h3>
            </div>
            
            <div className="space-y-6">
              {/* Set Fee */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Platform Fee (%)
                </label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={feePercent}
                    onChange={(e) => setFeePercent(e.target.value)}
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:border-blue-400 focus:outline-none"
                    placeholder="10"
                  />
                  <button
                    onClick={handleSetFee}
                    disabled={transaction.type === 'set_fee' && transaction.status === 'pending'}
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                  >
                    {transaction.type === 'set_fee' && transaction.status === 'pending' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Set'
                    )}
                  </button>
                </div>
              </div>

              {/* Withdraw */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Withdraw Earnings (SUI)
                </label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max={platformStats.platformBalance}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:border-yellow-400 focus:outline-none"
                    placeholder="0.1"
                  />
                  <button
                    onClick={handleWithdraw}
                    disabled={transaction.type === 'withdraw' && transaction.status === 'pending'}
                    className="bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {transaction.type === 'withdraw' && transaction.status === 'pending' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Minus className="w-5 h-5" />
                        Withdraw
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Settings Transaction Status */}
            {(transaction.type === 'set_fee' || transaction.type === 'withdraw') && transaction.status === 'error' && (
              <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-3 mt-4">
                <p className="text-red-400 text-sm">{transaction.error}</p>
              </div>
            )}
            
            {(transaction.type === 'set_fee' || transaction.type === 'withdraw') && transaction.status === 'success' && (
              <div className="bg-green-500/20 border border-green-500/40 rounded-lg p-3 mt-4">
                <p className="text-green-400 text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {transaction.type === 'set_fee' ? 'Fee updated successfully!' : 'Withdrawal completed!'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Warning */}
        <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-2xl p-6 mt-8">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-400" />
            <div>
              <h4 className="text-yellow-400 font-bold">Manager Access</h4>
              <p className="text-yellow-200 text-sm mt-1">
                These functions require admin privileges and will interact with the smart contract.
                Always verify transaction details before signing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerPage;