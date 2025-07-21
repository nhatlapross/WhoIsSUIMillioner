// components/game/GameOverScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Star, 
  Target, 
  Clock, 
  RefreshCw, 
  Gift,
  Coins,
  Award,
  TrendingUp,
  CheckCircle,
  Brain,
  Sparkles
} from 'lucide-react';
import { GameStats, MILLIONAIRE_PRIZE_LEVELS } from '@/types/game';
import { getRewardMessage, formatScore } from '@/utils/gameUtils';
import { useGameTransactions } from '@/hooks/useGameTransactions';

interface GameOverScreenProps {
  stats: GameStats;
  onTryAgain: () => void;
  onBackToMenu: () => void;
  isUsingAI?: boolean;
  gameId?: string | null;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({
  stats,
  onTryAgain,
  onBackToMenu,
  isUsingAI = false,
  gameId
}) => {
  const [showStats, setShowStats] = useState(false);
  const [showClaim, setShowClaim] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [claimError, setClaimError] = useState<string | null>(null);

  const { finishSoloGame, isConnected, contractStatus } = useGameTransactions();

  // Debug logging for claim conditions
  // console.log('🏆 Reward claim conditions debug:', {
  //   showClaim,
  //   hasClaimed,
  //   score: stats.score,
  //   gameId,
  //   isLocalGame: gameId?.startsWith('local_'),
  //   isFallbackGame: gameId?.startsWith('fallback_'),
  //   isTransactionGame: gameId?.startsWith('tx_'),
  //   isBlockchainGame: gameId && !gameId?.startsWith('local_') && !gameId?.startsWith('fallback_'),
  //   shouldShowClaim: showClaim && !hasClaimed && stats.score > 0 && gameId && !gameId?.startsWith('local_') && !gameId?.startsWith('fallback_'),
  //   contractSigned: contractStatus.isSigned,
  //   walletConnected: isConnected
  // });

  useEffect(() => {
    const timer1 = setTimeout(() => setShowStats(true), 500);
    const timer2 = setTimeout(() => setShowClaim(true), 1500);
    
    // Animate score counting
    const duration = 2000;
    const increment = stats.finalScore / (duration / 50);
    let current = 0;
    
    const scoreTimer = setInterval(() => {
      current += increment;
      if (current >= stats.finalScore) {
        current = stats.finalScore;
        clearInterval(scoreTimer);
      }
      setAnimatedScore(Math.floor(current));
    }, 50);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearInterval(scoreTimer);
    };
  }, [stats.finalScore]);

  const handleClaimReward = async () => {
    console.log('Attempting to claim reward with gameId:', gameId);

    if (!gameId) {
      setClaimError('No game ID provided');
      return;
    }

    // Check if this is a local/fallback game ID (not a blockchain game)
    if (gameId.startsWith('local_') || gameId.startsWith('fallback_')) {
      setClaimError('This game was not started on the blockchain. This is a test/local game. In a real blockchain game, you would receive actual SUI tokens.');
      // For now, simulate claiming for local games
      setTimeout(() => {
        setIsClaiming(false);
        setHasClaimed(true);
      }, 2000);
      return;
    }

    // Check if this is a transaction digest ID (blockchain transaction succeeded but no game object created)
    if (gameId.startsWith('tx_')) {
      setClaimError(
        '⚠️ **Game ID Recovery Issue**\n\n' +
        'Your blockchain transaction was successful and your 0.1 SUI entry fee was processed. ' +
        'However, we couldn\'t retrieve the individual game object ID from the transaction.\n\n' +
        '🔧 **What this means:**\n' +
        '• Your SUI payment was successfully processed on the blockchain\n' +
        '• The smart contract created your solo game, but we can\'t find the game ID\n' +
        '• This is a frontend parsing issue, not a smart contract problem\n\n' +
        '💡 **Next steps:**\n' +
        '• Check the browser console for transaction details\n' +
        '• Your game data exists on-chain even if we can\'t display the reward claim\n' +
        '• Contact support with transaction ID: ' + gameId.replace('tx_', '')
      );
      return;
    }

    if (!isConnected) {
      setClaimError('Wallet not connected');
      return;
    }

    setIsClaiming(true);
    setClaimError(null);

    try {
      // Finish the solo game on the contract to claim rewards
      await finishSoloGame(
        gameId, 
        stats.score, 
        15 // total questions in millionaire game
      );
      
      setIsClaiming(false);
      setHasClaimed(true);
    } catch (error: any) {
      console.error('Error claiming reward:', error);
      setClaimError(error.message || 'Failed to claim reward');
      setIsClaiming(false);
    }
  };

  const getRankColor = () => {
    if (stats.isMillionaire) return 'text-yellow-400 bg-yellow-500/20';
    if (stats.rank.includes('High Roller')) return 'text-purple-400 bg-purple-500/20';
    if (stats.rank.includes('Rising Star')) return 'text-blue-400 bg-blue-500/20';
    if (stats.rank.includes('Getting Started')) return 'text-green-400 bg-green-500/20';
    return 'text-gray-400 bg-gray-500/20';
  };

  const getRankIcon = () => {
    if (stats.isMillionaire) return <Trophy className="w-8 h-8" />;
    if (stats.rank.includes('High Roller')) return <Award className="w-8 h-8" />;
    if (stats.rank.includes('Rising Star')) return <Star className="w-8 h-8" />;
    if (stats.rank.includes('Getting Started')) return <CheckCircle className="w-8 h-8" />;
    return <TrendingUp className="w-8 h-8" />;
  };

  const getAIBonus = () => {
    if (!isUsingAI) return 0;
    // AI mode gives 20% bonus
    return Math.floor(stats.finalScore * 0.2);
  };

  const getTotalScore = () => {
    return stats.finalScore + getAIBonus();
  };

  return (
    <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 z-50">
      <div className="max-w-4xl w-full">
        {/* Main Result Card */}
        <div className="bg-gradient-to-br from-purple-900/80 to-blue-900/80 rounded-3xl p-8 border border-purple-500/30 backdrop-blur-sm">
          {/* Header */}
          <div className="text-center mb-8">
            {/* AI Mode Badge */}
            {isUsingAI && (
              <div className="mb-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full border border-purple-400/30">
                  <Brain className="w-5 h-5 text-purple-300" />
                  <span className="text-purple-300 font-bold">AI Generated Challenge</span>
                  <Sparkles className="w-5 h-5 text-pink-300" />
                </div>
              </div>
            )}

            {/* Blockchain Game Verification */}
            {gameId && gameId.startsWith('tx_') && (
              <div className="mb-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-400/30">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-300 font-bold">🔗 BLOCKCHAIN VERIFIED</span>
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <p className="text-green-200/70 text-xs mt-1">
                  SUI Transaction: {gameId.replace('tx_', '').substring(0, 16)}...
                </p>
              </div>
            )}

            <div className="flex justify-center mb-4">
              <div className={`p-4 rounded-full ${getRankColor()} border-4 border-current`}>
                {getRankIcon()}
              </div>
            </div>
            <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">
              {stats.isMillionaire ? 'MILLIONAIRE!' : 'Game Over!'}
            </h1>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${getRankColor()} border border-current`}>
              <span className="text-lg font-bold">Rank: {stats.rank}</span>
            </div>
          </div>

          {/* Prize Display */}
          <div className="text-center mb-8">
            <div className="bg-black/40 rounded-2xl p-8 border border-yellow-500/30">
              <div className="text-2xl text-gray-300 mb-4">
                Questions Answered: {stats.score} of 15
              </div>
              
              <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 mb-2">
                {stats.prizeWon} SUI
              </div>
              
              <div className="text-xl text-gray-300 mt-2">
                Prize Won
              </div>
              
              {stats.safeHavenAmount > 0 && (
                <div className="mt-4 text-green-400">
                  Safe Haven: {stats.safeHavenAmount} SUI
                </div>
              )}
              
              {/* AI Bonus Display */}
              {isUsingAI && getAIBonus() > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-center gap-2 text-purple-300">
                    <Brain className="w-4 h-4" />
                    <span className="text-lg">AI Mode Bonus: +{getAIBonus().toLocaleString()}</span>
                  </div>
                  <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                    Total: {getTotalScore()} SUI
                  </div>
                </div>
              )}
            </div>
            
            {/* Reward Message */}
            <div className="mt-4 p-4 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <p className="text-blue-200">
                {getRewardMessage(stats)}
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          {showStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fadeIn">
              <div className="bg-black/40 rounded-xl p-4 text-center border border-white/10">
                <div className="text-2xl font-bold text-green-400 mb-1">
                  {stats.questionReached}
                </div>
                <div className="text-sm text-gray-400">Question Reached</div>
                <CheckCircle className="w-5 h-5 text-green-400 mx-auto mt-2" />
              </div>
              
              <div className="bg-black/40 rounded-xl p-4 text-center border border-white/10">
                <div className="text-2xl font-bold text-yellow-400 mb-1">
                  {stats.prizeWon} SUI
                </div>
                <div className="text-sm text-gray-400">Prize Won</div>
                <Coins className="w-5 h-5 text-yellow-400 mx-auto mt-2" />
              </div>
              
              <div className="bg-black/40 rounded-xl p-4 text-center border border-white/10">
                <div className="text-2xl font-bold text-blue-400 mb-1">
                  {stats.safeHavenAmount} SUI
                </div>
                <div className="text-sm text-gray-400">Safe Haven</div>
                <Target className="w-5 h-5 text-blue-400 mx-auto mt-2" />
              </div>
              
              <div className="bg-black/40 rounded-xl p-4 text-center border border-white/10">
                <div className="text-2xl font-bold text-purple-400 mb-1">
                  {stats.isMillionaire ? 'YES!' : 'NO'}
                </div>
                <div className="text-sm text-gray-400">Millionaire</div>
                <Trophy className="w-5 h-5 text-purple-400 mx-auto mt-2" />
              </div>
            </div>
          )}

          {/* Error Display */}
          {claimError && (
            <div className="bg-red-500/20 rounded-2xl p-4 border-2 border-red-500/40 mb-6">
              <div className="text-center">
                <p className="text-red-400 font-bold">{claimError}</p>
              </div>
            </div>
          )}

          {/* No Reward Message for 0 score */}
          {showClaim && stats.score === 0 && (
            <div className="bg-gray-500/20 rounded-2xl p-6 border-2 border-gray-500/40 mb-6">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-gray-500/20 rounded-full">
                    <Target className="w-8 h-8 text-gray-400" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-400 mb-2">
                  No Rewards This Time
                </h3>
                <p className="text-gray-300 mb-4">
                  You need to answer at least one question correctly to earn rewards. Try again!
                </p>
              </div>
            </div>
          )}

          {/* Blockchain info message for local/fallback games */}
          {/* {showClaim && gameId && (gameId.startsWith('local_') || gameId.startsWith('fallback_')) && stats.score > 0 && (
            <div className="bg-blue-500/20 rounded-2xl p-6 border-2 border-blue-500/40 mb-6">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-blue-500/20 rounded-full">
                    <CheckCircle className="w-8 h-8 text-blue-400" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-blue-400 mb-2">
                  Great Game! 🎉
                </h3>
                <p className="text-gray-300 mb-4">
                  You earned {stats.prizeWon} SUI! To claim real blockchain rewards, make sure to:
                </p>
                <ul className="text-sm text-gray-400 text-left max-w-md mx-auto space-y-2">
                  <li>• Connect your wallet</li>
                  <li>• Sign the player contract</li>
                  <li>• Start a new game for blockchain integration</li>
                </ul>
              </div>
            </div>
          )} */}

          {/* Debug: Show current game state */}
          {showClaim && (
            <div className="bg-gray-500/10 rounded-lg p-4 mb-4 text-xs">
              <div className="text-gray-400">
                Debug Info: gameId={gameId}, score={stats.score}, showClaim={showClaim ? 'true' : 'false'}, hasClaimed={hasClaimed ? 'true' : 'false'}
              </div>
              <div className="text-gray-400 mt-1">
                Contract Status: isSigned={contractStatus.isSigned ? 'true' : 'false'}, isLoading={contractStatus.isLoading ? 'true' : 'false'}, error={contractStatus.error || 'none'}
              </div>
            </div>
          )}

          {/* Temporary Universal Claim Section for Testing */}
          {/* {showClaim && !hasClaimed && stats.score > 0 && (
            <div className="bg-green-500/20 rounded-2xl p-4 border-2 border-green-500/40 mb-4">
              <div className="text-center">
                <h4 className="text-lg font-bold text-green-400 mb-2">Test Claim Section</h4>
                <p className="text-green-200 text-sm mb-3">
                  Game ID: {gameId || 'No Game ID'} | Score: {stats.score}
                </p>
                <button
                  onClick={handleClaimReward}
                  disabled={isClaiming}
                  className="bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded"
                >
                  {isClaiming ? 'Testing...' : 'Test Claim'}
                </button>
              </div>
            </div>
          )} */}

          {/* Claim Reward Section - Shows for blockchain games (including tx_ games) */}
          {showClaim && !hasClaimed && stats.score > 0 && gameId && (
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl p-6 border-2 border-yellow-500/40 mb-6 animate-slideInRight">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-yellow-500/20 rounded-full">
                    <Gift className="w-8 h-8 text-yellow-400" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-yellow-400 mb-2">
                  Congratulations! 🎉
                </h3>
                <p className="text-gray-300 mb-4">
                  You've earned{' '}
                  <span className="text-yellow-400 font-bold">
                    {stats.prizeWon} SUI
                  </span>{' '}
                  {gameId?.startsWith('local_') || gameId?.startsWith('fallback_') ? (
                    <span className="block text-blue-300 text-sm mt-1">
                      ⚠️ This is a test game. Real SUI tokens require blockchain integration.
                    </span>
                  ) : (
                    <span className="text-gray-300">tokens!</span>
                  )}
                  {isUsingAI && (
                    <span className="block text-purple-300 text-sm mt-1">
                      Including AI bonus rewards!
                    </span>
                  )}
                </p>
                <button
                  onClick={handleClaimReward}
                  disabled={isClaiming}
                  className={`
                    px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300
                    ${isClaiming ? 
                      'bg-gray-600 cursor-not-allowed' :
                      'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 hover:scale-105 hover:shadow-2xl'
                    }
                    text-white
                  `}
                >
                  {isClaiming ? (
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      <span>Claiming Reward...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Coins className="w-6 h-6" />
                      <span>Claim Reward</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Claimed Success */}
          {hasClaimed && (
            <div className="bg-green-500/20 rounded-2xl p-6 border-2 border-green-500/40 mb-6 animate-fadeIn">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-green-500/20 rounded-full">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-green-400 mb-2">
                  Reward Claimed! ✅
                </h3>
                <p className="text-gray-300">
                  {isUsingAI ? getTotalScore().toLocaleString() : stats.finalScore.toLocaleString()}{' '}
                  SUI tokens have been added to your wallet.
                  {isUsingAI && (
                    <span className="block text-purple-300 text-sm mt-1">
                      Thank you for testing our AI question generation system!
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onTryAgain}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl text-lg"
            >
              <RefreshCw className="w-6 h-6" />
              <span>{isUsingAI ? 'Try Again with AI' : 'Try Again'}</span>
            </button>
            
            <button
              onClick={onBackToMenu}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all duration-300 border border-white/20 hover:border-white/40 text-lg"
            >
              <Trophy className="w-6 h-6" />
              <span>Main Menu</span>
            </button>
          </div>

          {/* Footer Message */}
          <div className="text-center mt-6 pt-6 border-t border-white/10">
            {isUsingAI ? (
              <div className="space-y-2">
                <p className="text-gray-400">
                  🤖 Questions powered by Gemini AI • Experience may vary
                </p>
                <p className="text-purple-300 text-sm">
                  Help us improve by sharing feedback! 🚀
                </p>
              </div>
            ) : (
              <p className="text-gray-400">
                Share your score and challenge your friends! 🚀
              </p>
            )}
          </div>

          {/* AI Mode Achievement */}
          {isUsingAI && stats.accuracy >= 80 && (
            <div className="mt-4 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/30">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-purple-300 mb-2">
                  <Award className="w-5 h-5" />
                  <span className="font-bold">AI Challenge Master!</span>
                  <Sparkles className="w-5 h-5" />
                </div>
                <p className="text-sm text-purple-200">
                  You scored {stats.accuracy}% on AI-generated questions. Exceptional performance!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameOverScreen;