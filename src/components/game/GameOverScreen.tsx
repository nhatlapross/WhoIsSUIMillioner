// components/GameOverScreen.tsx
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
  CheckCircle
} from 'lucide-react';
import { GameStats } from '@/types/game';

interface GameOverScreenProps {
  stats: GameStats;
  onTryAgain: () => void;
  onBackToMenu: () => void;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({
  stats,
  onTryAgain,
  onBackToMenu
}) => {
  const [showStats, setShowStats] = useState(false);
  const [showClaim, setShowClaim] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);

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
    setIsClaiming(true);
    // Simulate claiming process
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsClaiming(false);
    setHasClaimed(true);
  };

  const getRankColor = () => {
    switch (stats.rank) {
      case 'Master': return 'text-purple-400 bg-purple-500/20';
      case 'Expert': return 'text-blue-400 bg-blue-500/20';
      case 'Good': return 'text-green-400 bg-green-500/20';
      case 'Average': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getRankIcon = () => {
    switch (stats.rank) {
      case 'Master': return <Award className="w-8 h-8" />;
      case 'Expert': return <Trophy className="w-8 h-8" />;
      case 'Good': return <Star className="w-8 h-8" />;
      case 'Average': return <Target className="w-8 h-8" />;
      default: return <TrendingUp className="w-8 h-8" />;
    }
  };

  return (
    <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 z-50">
      <div className="max-w-4xl w-full">
        {/* Main Result Card */}
        <div className="bg-gradient-to-br from-purple-900/80 to-blue-900/80 rounded-3xl p-8 border border-purple-500/30 backdrop-blur-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className={`p-4 rounded-full ${getRankColor()} border-4 border-current`}>
                {getRankIcon()}
              </div>
            </div>
            <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">
              Game Over!
            </h1>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${getRankColor()} border border-current`}>
              <span className="text-lg font-bold">Rank: {stats.rank}</span>
            </div>
          </div>

          {/* Score Display */}
          <div className="text-center mb-8">
            <div className="bg-black/40 rounded-2xl p-8 border border-yellow-500/30">
              <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 mb-2">
                {animatedScore.toLocaleString()}
              </div>
              <div className="text-xl text-gray-300">Final Score</div>
            </div>
          </div>

          {/* Stats Grid */}
          {showStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fadeIn">
              <div className="bg-black/40 rounded-xl p-4 text-center border border-white/10">
                <div className="text-2xl font-bold text-green-400 mb-1">
                  {stats.correctAnswers}
                </div>
                <div className="text-sm text-gray-400">Correct</div>
                <CheckCircle className="w-5 h-5 text-green-400 mx-auto mt-2" />
              </div>
              
              <div className="bg-black/40 rounded-xl p-4 text-center border border-white/10">
                <div className="text-2xl font-bold text-blue-400 mb-1">
                  {stats.accuracy}%
                </div>
                <div className="text-sm text-gray-400">Accuracy</div>
                <Target className="w-5 h-5 text-blue-400 mx-auto mt-2" />
              </div>
              
              <div className="bg-black/40 rounded-xl p-4 text-center border border-white/10">
                <div className="text-2xl font-bold text-yellow-400 mb-1">
                  +{stats.timeBonus}
                </div>
                <div className="text-sm text-gray-400">Time Bonus</div>
                <Clock className="w-5 h-5 text-yellow-400 mx-auto mt-2" />
              </div>
              
              <div className="bg-black/40 rounded-xl p-4 text-center border border-white/10">
                <div className="text-2xl font-bold text-purple-400 mb-1">
                  {stats.score}/{stats.totalQuestions}
                </div>
                <div className="text-sm text-gray-400">Questions</div>
                <Star className="w-5 h-5 text-purple-400 mx-auto mt-2" />
              </div>
            </div>
          )}

          {/* Claim Reward Section */}
          {showClaim && !hasClaimed && (
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
                  You've earned <span className="text-yellow-400 font-bold">{stats.finalScore}</span> SUI tokens!
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
                  {stats.finalScore} SUI tokens have been added to your wallet.
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
              <span>Try Again</span>
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
            <p className="text-gray-400">
              Share your score and challenge your friends! 🚀
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameOverScreen;