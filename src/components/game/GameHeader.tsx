// components/game/GameHeader.tsx
import React from 'react';
import { Hand, Maximize, Home, DollarSign } from 'lucide-react';
import { MILLIONAIRE_PRIZE_LEVELS } from '@/types/game';
import { formatScore } from '@/utils/gameUtils';

interface GameHeaderProps {
  score: number;
  totalQuestions: number;
  currentQuestion: number;
  onToggleFullScreen: () => void;
  onBackToMenu: () => void;
}

const GameHeader: React.FC<GameHeaderProps> = ({
  score,
  totalQuestions,
  currentQuestion,
  onToggleFullScreen,
  onBackToMenu
}) => {
  return (
    <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/70 to-transparent z-10">
      <div className="flex items-center justify-between text-white">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Hand className="w-8 h-8 text-orange-400" />
            SUI Millionaire
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-xl font-semibold bg-black/40 px-4 py-2 rounded-lg backdrop-blur-sm">
              Question: <span className="text-yellow-400">{currentQuestion + 1}</span>/15
            </div>
            <div className="text-xl font-semibold bg-black/40 px-4 py-2 rounded-lg backdrop-blur-sm flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span className="text-green-400">{MILLIONAIRE_PRIZE_LEVELS[currentQuestion] || 0} SUI</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Progress Bar */}
          <div className="flex items-center gap-3">
            <span className="text-lg font-medium">
              {currentQuestion + 1}/{totalQuestions}
            </span>
            <div className="w-32 bg-white/20 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
              />
            </div>
          </div>
          
          <button
            onClick={onToggleFullScreen}
            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors pointer-events-auto"
            title="Toggle Fullscreen"
          >
            <Maximize className="w-6 h-6" />
          </button>
          
          <button
            onClick={onBackToMenu}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors pointer-events-auto"
          >
            <Home className="w-5 h-5" />
            Menu
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameHeader;