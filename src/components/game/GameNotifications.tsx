// components/game/GameNotifications.tsx
import React from 'react';
import { CheckCircle, AlertCircle, Clock, AlertTriangle } from 'lucide-react';
import { MILLIONAIRE_PRIZE_LEVELS } from '@/types/game';

interface GameNotificationsProps {
  showResult: boolean;
  isCorrect: boolean | null;
  timeLeft: number;
  selectedChoice: string | null;
  lastHoveredChoice: string | null;
  correctAnswer: string;
  currentQuestion: number;
}

const GameNotifications: React.FC<GameNotificationsProps> = ({
  showResult,
  isCorrect,
  timeLeft,
  selectedChoice,
  lastHoveredChoice,
  correctAnswer,
  currentQuestion
}) => {
  const currentPrize = MILLIONAIRE_PRIZE_LEVELS[currentQuestion] || 0.1;
  return (
    <>
      {/* Result Display */}
      {showResult && isCorrect !== null && (
        <div className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 translate-y-1/2 z-30">
          <div className={`
            p-8 rounded-2xl text-white text-center text-3xl font-bold backdrop-blur-sm
            ${isCorrect ? 'bg-green-600/90' : 'bg-red-600/90'}
            animate-fadeIn
          `}>
            {isCorrect ? (
              <div className="flex items-center gap-4">
                <CheckCircle className="w-12 h-12" />
                <div>
                  <div>Correct! 🎉</div>
                  <div className="text-lg font-normal mt-2">+{currentPrize} SUI</div>
                  {(currentQuestion + 1 === 5) && (
                    <div className="text-sm text-yellow-300 mt-1">🔒 Safe Point Reached!</div>
                  )}
                  {(currentQuestion + 1 === 10) && (
                    <div className="text-sm text-yellow-300 mt-1">🔒 Second Safe Point!</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-4">
                  <AlertCircle className="w-12 h-12" />
                  <span>Wrong! 😞</span>
                </div>
                <div className="text-lg font-normal">
                  Correct answer: <span className="text-yellow-300">{correctAnswer.toUpperCase()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Time Warning */}
      {timeLeft <= 3 && timeLeft > 0 && !selectedChoice && !showResult && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
          <div className="bg-red-600/90 rounded-xl p-6 text-white text-center animate-pulse backdrop-blur-sm">
            <Clock className="w-12 h-12 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Time is running out!</h3>
            <p className="text-lg">
              {lastHoveredChoice ? 
                `Will auto-select: ${lastHoveredChoice.toUpperCase()}` : 
                'Please point to an answer!'
              }
            </p>
            <div className="text-3xl font-bold mt-2">
              {timeLeft}
            </div>
          </div>
        </div>
      )}

      {/* Auto-select notification */}
      {timeLeft === 0 && !selectedChoice && !showResult && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
          <div className="bg-yellow-600/90 rounded-xl p-6 text-white text-center backdrop-blur-sm animate-fadeIn">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Time's up!</h3>
            <p className="text-lg">
              Auto-selected: <span className="font-bold">{(lastHoveredChoice || 'A').toUpperCase()}</span>
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default GameNotifications;