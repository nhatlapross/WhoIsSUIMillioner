// components/game/GameTimer.tsx
import React from 'react';
import { Clock } from 'lucide-react';

interface GameTimerProps {
  timeLeft: number;
  totalTime: number;
  isActive: boolean;
  lastHoveredChoice: string | null;
}

const GameTimer: React.FC<GameTimerProps> = ({ 
  timeLeft, 
  totalTime, 
  isActive,
  lastHoveredChoice 
}) => {
  const timerProgress = ((totalTime - timeLeft) / totalTime) * 100;
  
  const getTimerColor = () => {
    if (timeLeft <= 3) return 'text-red-500';
    if (timeLeft <= 7) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (!isActive && timeLeft === totalTime) return null;

  return (
    <div className="absolute top-24 right-6 z-10">
      <div 
        className={`bg-black/80 rounded-xl p-4 text-white backdrop-blur-sm ${
          timeLeft <= 5 ? 'timer-pulse' : ''
        } ${
          timeLeft <= 3 ? 'timer-urgent' : ''
        }`}
      >
        <div className="flex items-center gap-3 mb-2">
          <Clock className={`w-6 h-6 ${getTimerColor()}`} />
          <span className={`text-2xl font-bold font-mono ${getTimerColor()}`}>
            {timeLeft}s
          </span>
        </div>
        
        <div className="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 rounded-full progress-fill ${
              timeLeft <= 3 ? 'bg-red-500' :
              timeLeft <= 7 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${timerProgress}%` }}
          />
        </div>
        
        {lastHoveredChoice && timeLeft <= 5 && (
          <div className="mt-2 text-xs text-orange-300 animate-fade-in">
            Auto-select: {lastHoveredChoice.toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameTimer;