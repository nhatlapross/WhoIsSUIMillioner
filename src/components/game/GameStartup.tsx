'use client';
import React, { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { 
  Play, 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  Loader2,
  Coins,
  FileText,
  Users,
  Trophy,
  Clock
} from 'lucide-react';

import { WalletConnection } from '@/components/wallet/WalletConnection';
import ContractSigningModal from '@/components/wallet/ContractSigningModal';
import RewardClaimingModal from '@/components/game/RewardClaimingModal';
import { useGameTransactions } from '@/hooks/useGameTransactions';

interface GameStartupProps {
  gameMode: 'solo' | 'multiplayer' | 'ai';
  onGameStart: (config: GameStartConfig, gameId?: string) => void;
  onRewardsCheck?: () => void;
}

interface GameStartConfig {
  entryFee: number;
  gameType: string;
  maxPlayers?: number;
}

const GameStartup: React.FC<GameStartupProps> = ({
  gameMode,
  onGameStart,
  onRewardsCheck
}) => {
  const currentAccount = useCurrentAccount();
  const {
    contractStatus,
    gameTransaction,
    signContract,
    startSoloGame,
    resetTransaction
  } = useGameTransactions();

  const [showContractModal, setShowContractModal] = useState(false);
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [entryFee, setEntryFee] = useState(0.1);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isStarting, setIsStarting] = useState(false);

  // Check if contract needs to be signed
  useEffect(() => {
    if (currentAccount && !contractStatus.isLoading && !contractStatus.isSigned) {
      setShowContractModal(true);
    }
  }, [currentAccount, contractStatus.isLoading, contractStatus.isSigned]);

  const handleContractSigned = () => {
    setShowContractModal(false);
    resetTransaction();
  };

  const handleStartGame = async () => {
    if (!currentAccount || !contractStatus.isSigned) {
      setShowContractModal(true);
      return;
    }

    setIsStarting(true);

    try {
      const config: GameStartConfig = {
        entryFee,
        gameType: gameMode === 'ai' ? 'ai' : 'normal',
        ...(gameMode === 'multiplayer' && { maxPlayers })
      };

      let gameId: string | undefined;
      if (gameMode === 'solo' || gameMode === 'ai') {
        console.log('Starting blockchain transaction for solo game:', {
          entryFee,
          gameType: config.gameType,
          contractSigned: contractStatus.isSigned,
          userAddress: currentAccount?.address
        });
        
        // Start blockchain transaction for solo game - this will throw if it fails
        gameId = await startSoloGame(entryFee, config.gameType);
        console.log('✅ Blockchain game created successfully with ID:', gameId);
        
        // Validate that we got a proper blockchain game ID
        if (!gameId || gameId === 'unknown') {
          console.error('❌ Invalid game ID received from blockchain:', gameId);
          throw new Error('Failed to create blockchain game - invalid game ID received');
        }
      }

      // Only proceed to game screen if blockchain transaction succeeded
      onGameStart(config, gameId);
    } catch (error: any) {
      console.error('Error starting blockchain game:', error);
      // Keep the error state so user can see what went wrong
      // Don't proceed to game screen if blockchain transaction failed
    } finally {
      setIsStarting(false);
    }
  };

  const getGameModeInfo = () => {
    switch (gameMode) {
      case 'solo':
        return {
          title: 'Solo Challenge',
          description: 'Answer questions on your own and earn SUI tokens for each correct answer',
          icon: Trophy,
          color: 'blue'
        };
      case 'ai':
        return {
          title: 'AI Challenge',
          description: 'Face AI-generated questions tailored to your skill level',
          icon: Shield,
          color: 'purple'
        };
      case 'multiplayer':
        return {
          title: 'Multiplayer Battle',
          description: 'Compete against other players for the prize pool',
          icon: Users,
          color: 'green'
        };
      default:
        return {
          title: 'Game Mode',
          description: 'Select your challenge',
          icon: Play,
          color: 'gray'
        };
    }
  };

  const modeInfo = getGameModeInfo();
  const IconComponent = modeInfo.icon;

  // If wallet not connected, show wallet connection
  if (!currentAccount) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconComponent className="w-8 h-8 text-yellow-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{modeInfo.title}</h1>
            <p className="text-white/70 mb-6">{modeInfo.description}</p>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-400">
                <Shield className="w-5 h-5" />
                <span className="font-medium">Wallet Required</span>
              </div>
              <p className="text-yellow-200 text-sm mt-1">
                Connect your Sui wallet to participate in blockchain-based gameplay
              </p>
            </div>
          </div>
          <WalletConnection />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className={`w-16 h-16 bg-${modeInfo.color}-500/20 rounded-full flex items-center justify-center mx-auto mb-4`}>
              <IconComponent className={`w-8 h-8 text-${modeInfo.color}-400`} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{modeInfo.title}</h1>
            <p className="text-white/70 mb-6">{modeInfo.description}</p>
          </div>

          {/* Contract Status */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-bold text-white">Player Contract Status</h3>
            </div>
            
            {contractStatus.isLoading ? (
              <div className="flex items-center gap-3 text-blue-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Checking contract status...</span>
              </div>
            ) : contractStatus.isSigned ? (
              <div className="flex items-center gap-3 text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span>Contract signed - Ready to play!</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-yellow-400">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Contract signature required</span>
                </div>
                <button
                  onClick={() => setShowContractModal(true)}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Sign Player Contract
                </button>
              </div>
            )}

            {contractStatus.error && (
              <div className="mt-3 text-red-400 text-sm">
                Error: {contractStatus.error}
              </div>
            )}
          </div>

          {/* Game Configuration */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-400" />
              Game Settings
            </h3>

            <div className="space-y-4">
              {/* Entry Fee */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Entry Fee (SUI)
                </label>
                <select
                  value={entryFee}
                  onChange={(e) => setEntryFee(parseFloat(e.target.value))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                >
                  <option value={0.1}>0.1 SUI</option>
                  <option value={0.5}>0.5 SUI</option>
                  <option value={1.0}>1.0 SUI</option>
                  <option value={2.0}>2.0 SUI</option>
                  <option value={5.0}>5.0 SUI</option>
                </select>
              </div>

              {/* Max Players (Multiplayer only) */}
              {gameMode === 'multiplayer' && (
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Maximum Players
                  </label>
                  <select
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                  >
                    <option value={2}>2 Players</option>
                    <option value={4}>4 Players</option>
                    <option value={8}>8 Players</option>
                    <option value={16}>16 Players</option>
                  </select>
                </div>
              )}

              {/* Reward Information */}
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <h4 className="text-green-400 font-medium mb-2 flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Potential Rewards
                </h4>
                <ul className="text-green-200 text-sm space-y-1">
                  {gameMode === 'multiplayer' ? (
                    <>
                      <li>• Winner takes {(entryFee * maxPlayers * 0.9).toFixed(2)} SUI (90% of pool)</li>
                      <li>• Platform fee: {(entryFee * maxPlayers * 0.1).toFixed(2)} SUI (10%)</li>
                      <li>• Entry fee per player: {entryFee} SUI</li>
                    </>
                  ) : (
                    <>
                      <li>• 0.1 SUI per correct answer</li>
                      <li>• Entry fee: {entryFee} SUI</li>
                      <li>• Break even at {entryFee * 10} correct answers</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4">
            <button
              onClick={handleStartGame}
              disabled={!contractStatus.isSigned || isStarting || gameTransaction.status === 'pending'}
              className={`w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-400 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-600 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 ${
                contractStatus.isSigned && !isStarting ? 'hover:scale-105 hover:shadow-2xl' : ''
              }`}
            >
              {isStarting || gameTransaction.status === 'pending' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {gameTransaction.status === 'pending' ? 'Starting Game...' : 'Preparing...'}
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Start {modeInfo.title}
                </>
              )}
            </button>

            <div className="flex gap-4">
              <button
                onClick={() => setShowRewardsModal(true)}
                className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Trophy className="w-4 h-4" />
                Claim Rewards
              </button>
              
              <button
                onClick={() => setShowContractModal(true)}
                disabled={contractStatus.isLoading}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                View Contract
              </button>
            </div>
          </div>

          {/* Transaction Error */}
          {gameTransaction.status === 'error' && (
            <div className="mt-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-sm">
                  Error: {gameTransaction.error}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ContractSigningModal
        isOpen={showContractModal}
        onClose={() => setShowContractModal(false)}
        onContractSigned={handleContractSigned}
      />

      <RewardClaimingModal
        isOpen={showRewardsModal}
        onClose={() => setShowRewardsModal(false)}
      />
    </>
  );
};

export default GameStartup;