// components/multiplayer/MultiplayerOverlay.tsx
'use client';
import React from 'react';
import { Users, Trophy, Clock, Target, Crown, AlertCircle } from 'lucide-react';

interface MultiplayerOverlayProps {
  room: any;
  playerId: string;
  timeLeft: number;
  selectedAnswer: string | null;
  currentQuestion: any;
}

const MultiplayerOverlay: React.FC<MultiplayerOverlayProps> = ({
  room,
  playerId,
  timeLeft,
  selectedAnswer,
  currentQuestion
}) => {
  const alivePlayers = room?.players?.filter((p: any) => !p.eliminated) || [];
  const currentPlayer = room?.players?.find((p: any) => p.id === playerId);
  const isEliminated = currentPlayer?.eliminated || false;

  return (
    <>
      {/* Top Right - Room Info */}
      <div className="absolute top-6 right-6 z-50">
        <div className="bg-black/80 backdrop-blur-md rounded-xl p-4 text-white border border-white/20">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Room: {room?.id}</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span>{room?.prizePool?.toFixed(2)} SUI</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>{alivePlayers.length} alive</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Left - Question Info */}
      <div className="absolute top-6 left-6 z-50">
        <div className="bg-black/80 backdrop-blur-md rounded-xl p-4 text-white border border-white/20">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-400" />
              <span>Question {currentQuestion?.questionNumber}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 ${
                timeLeft <= 3 ? 'text-red-400' : timeLeft <= 7 ? 'text-yellow-400' : 'text-green-400'
              }`} />
              <span className={`font-mono ${
                timeLeft <= 3 ? 'text-red-400' : timeLeft <= 7 ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {timeLeft}s
              </span>
            </div>
            {selectedAnswer && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span className="text-blue-300">Answer: {selectedAnswer.toUpperCase()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Right - Player List */}
      <div className="absolute bottom-6 right-6 z-50">
        <div className="bg-black/80 backdrop-blur-md rounded-xl p-4 text-white border border-white/20 max-w-xs">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4" />
            <span className="font-medium">Players ({alivePlayers.length})</span>
          </div>
          
          <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
            {room?.players?.map((player: any, index: number) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-2 rounded text-xs ${
                  player.eliminated 
                    ? 'bg-red-500/20 text-red-300' 
                    : 'bg-green-500/20 text-green-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    player.eliminated ? 'bg-red-500' : 'bg-green-500'
                  }`}></span>
                  <span className={player.eliminated ? 'line-through' : ''}>
                    {player.name}
                  </span>
                  {player.isCreator && (
                    <Crown className="w-3 h-3 text-yellow-400" />
                  )}
                  {player.id === playerId && (
                    <span className="text-blue-300">(You)</span>
                  )}
                </div>
                <span className="text-xs text-white/60">
                  {player.eliminated ? 'OUT' : 'ALIVE'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Elimination Warning */}
      {isEliminated && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <div className="bg-red-600/95 rounded-xl p-8 text-white text-center backdrop-blur-md border border-red-400/30">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-200" />
            <h3 className="text-3xl font-bold mb-4">You've been eliminated!</h3>
            <p className="text-xl text-red-100 mb-4">
              Better luck next time!
            </p>
            <div className="text-lg">
              <span className="text-red-200">🎮 You can still watch the game</span>
            </div>
          </div>
        </div>
      )}

      {/* Time Warning */}
      {timeLeft <= 5 && timeLeft > 0 && !selectedAnswer && !isEliminated && (
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <div className="bg-red-600/95 rounded-xl p-6 text-white text-center animate-pulse backdrop-blur-md border border-red-400/30">
            <Clock className="w-12 h-12 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Time's Running Out!</h3>
            <div className="text-4xl font-bold mb-2">{timeLeft}</div>
            <p className="text-lg">Select an answer now!</p>
          </div>
        </div>
      )}

      {/* Answer Submitted Feedback */}
      {selectedAnswer && !isEliminated && (
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <div className="bg-blue-600/95 rounded-xl p-6 text-white text-center backdrop-blur-md border border-blue-400/30">
            <Target className="w-12 h-12 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Answer Submitted!</h3>
            <div className="text-xl mb-2">
              Your answer: <span className="font-bold text-blue-200">{selectedAnswer.toUpperCase()}</span>
            </div>
            <p className="text-blue-200">Waiting for other players...</p>
          </div>
        </div>
      )}

      {/* Multiplayer Mode Indicator */}
      <div className="absolute top-1/2 left-6 transform -translate-y-1/2 z-40">
        <div className="bg-gradient-to-r from-green-500/90 to-blue-500/90 rounded-full px-4 py-2 text-white text-sm font-bold flex items-center gap-2 backdrop-blur-md border border-green-400/30">
          <span>⚔️</span>
          <span>Battle Royale</span>
          <span>🏆</span>
        </div>
      </div>
    </>
  );
};

export default MultiplayerOverlay;