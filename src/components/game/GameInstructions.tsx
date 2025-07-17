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
          Cách chơi:
        </h3>
        <div className="text-sm space-y-2">
          {useSimpleMode ? (
            <div className="flex items-center justify-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <Mouse className="w-4 h-4" />
                <span>Nhấp vào đáp án</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{timeLimit}s mỗi câu</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-orange-400" />
                <span>Chỉ tay vào đáp án</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-400" />
                <span>{timeLimit}s mỗi câu hỏi</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-400 rounded-full"></div>
                <span>Màu cam = đang chỉ</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
                <span>Tự động chọn khi hết giờ</span>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <div className="w-4 h-4 bg-red-400 rounded-full"></div>
                <span>Game over nếu không phát hiện tay quá 3 giây</span>
              </div>
            </div>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-white/20">
          <p className="text-xs text-white/60">
            {useSimpleMode ? 
              'Trả lời đúng để kiếm điểm và nhận thưởng SUI! 🎉' :
              'Camera đã được flip để dễ điều khiển. Giữ tay trong khung hình! 📹'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default GameInstructions;