// components/game/GameInstructions.tsx
import React from 'react';
import { Hand, Mouse, Clock, Target } from 'lucide-react';

interface GameInstructionsProps {
  useSimpleMode: boolean;
  timeLimit: number;
}

const GameInstructions: React.FC<GameInstructionsProps> = ({
  useSimpleMode,
  timeLimit
}) => {
  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-white text-center z-10">
      <div className="bg-black/60 rounded-lg p-4 backdrop-blur-sm max-w-2xl">
        <h3 className="text-lg font-semibold mb-3 flex items-center justify-center gap-2">
          {useSimpleMode ? <Mouse className="w-5 h-5" /> : <Hand className="w-5 h-5" />}
          How to Play:
        </h3>
        <div className="text-sm space-y-2">
          {useSimpleMode ? (
            <div className="flex items-center justify-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <Mouse className="w-4 h-4" />
                <span>Click on answer</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{timeLimit}s per question</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-orange-400" />
                <span>Point finger at answer</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-400" />
                <span>{timeLimit}s per question</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-400 rounded-full"></div>
                <span>Orange = pointing</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
                <span>Auto-select when time's up</span>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <div className="w-4 h-4 bg-red-400 rounded-full"></div>
                <span>Game over if no hand detected for 3+ seconds</span>
              </div>
            </div>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-white/20">
          <p className="text-xs text-white/60">
            {useSimpleMode ? 
              'Answer correctly to earn points and win SUI rewards! 🎉' :
              'Camera is flipped for easier control. Keep hand in frame! 📹'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default GameInstructions;