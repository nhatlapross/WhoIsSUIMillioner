// components/multiplayer/MultiplayerGame.tsx - Using WebSocket context
'use client';
import React, { useEffect } from 'react';
import { Clock, Users, Trophy, Target, AlertCircle } from 'lucide-react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import MultiplayerGameScreen from './MultiplayerGameScreen';

const MultiplayerGame: React.FC = () => {
  const {
    room,
    playerId,
    currentQuestion,
    gamePhase,
    timeLeft,
    selectedAnswer,
    submitAnswer,
    leaveRoom,
    countdownValue
  } = useWebSocket();

  // DEBUG: Log component render
  console.log('🎮 MultiplayerGame COMPONENT RENDERED');
  console.log('🎮 Current state:', {
    gamePhase,
    hasRoom: !!room,
    hasCurrentQuestion: !!currentQuestion,
    playerId,
    timeLeft,
    selectedAnswer,
    countdownValue,
    roomState: room?.state,
    rendering: 'MultiplayerGame component'
  });

  const handleBackToLobby = () => {
    console.log('👋 Going back to lobby');
    leaveRoom();
  };

  // CRITICAL: Log which screen we're about to show
  console.log('🎮 MultiplayerGame - Deciding which screen to show:', {
    gamePhase,
    willShowStarting: gamePhase === 'starting',
    willShowGame: gamePhase === 'playing' || gamePhase === 'finished',
    willShowFallback: gamePhase !== 'starting' && gamePhase !== 'playing' && gamePhase !== 'finished'
  });

  // Show starting screen for 'starting' phase
  if (gamePhase === 'starting') {
    console.log('🚀 *** SHOWING STARTING COUNTDOWN SCREEN ***');
    const displayTime = countdownValue || timeLeft;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-12 border border-white/20 max-w-lg w-full">
            
            {/* DEBUG INFO */}
            <div className="absolute top-4 left-4 bg-red-800/80 rounded p-2 text-xs text-white">
              <div>Phase: {gamePhase}</div>
              <div>Time: {timeLeft}</div>
              <div>Countdown: {countdownValue}</div>
              <div>Component: MultiplayerGame Starting</div>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Game Starting...
            </h1>
            
            <div className="relative mb-8">
              <div className={`text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-4 ${
                displayTime <= 1 ? 'animate-pulse' : 'animate-bounce'
              }`}>
                {displayTime > 0 ? displayTime : 'GO!'}
              </div>
            </div>
            
            <div className="space-y-4 text-white/80">
              <div className="flex items-center justify-center gap-2">
                <Users className="w-5 h-5" />
                <span>{room?.playerCount || 0} players ready</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <span>{room?.prizePool?.toFixed(1) || '0'} SUI prize pool</span>
              </div>
            </div>
            
            <div className="mt-8 text-yellow-300 text-lg font-medium">
              Get ready to battle! 🚀
            </div>
            
            <button
              onClick={handleBackToLobby}
              className="mt-6 px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors text-sm"
            >
              Exit Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show game screen for 'playing' and 'finished' phases
  if (gamePhase === 'playing' || gamePhase === 'finished') {
    console.log('🎮 *** SHOWING MULTIPLAYER GAME SCREEN ***', gamePhase);
    
    if (!room || !playerId) {
      console.error('❌ Missing room or playerId for GameScreen');
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <div className="text-center text-white">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-2xl font-bold mb-4">Game Error</h2>
            <p className="text-white/70 mb-6">Missing game data. Please try again.</p>
            <button
              onClick={handleBackToLobby}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      );
    }
    
    return <MultiplayerGameScreen onBackToLobby={handleBackToLobby} />;
  }

  // Fallback for any other state
  console.log('🔄 *** SHOWING FALLBACK LOADING STATE ***', gamePhase);
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center text-white">
        
        {/* DEBUG INFO */}
        <div className="absolute top-4 left-4 bg-red-800/80 rounded p-2 text-xs text-white">
          <div>Phase: {gamePhase}</div>
          <div>Component: MultiplayerGame Fallback</div>
          <div>Should not see this during game!</div>
        </div>

        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-xl">Loading multiplayer game...</p>
        
        <div className="mt-4 text-sm text-white/70 space-y-1 bg-black/20 rounded-lg p-4 max-w-md">
          <p><strong>Unexpected State Debug:</strong></p>
          <p>Game Phase: <span className="text-yellow-300">{gamePhase}</span></p>
          <p>Has Room: <span className="text-yellow-300">{room ? 'Yes' : 'No'}</span></p>
          <p>Room State: <span className="text-yellow-300">{room?.state || 'None'}</span></p>
          <p>Has Question: <span className="text-yellow-300">{currentQuestion ? 'Yes' : 'No'}</span></p>
          <p>Player ID: <span className="text-yellow-300">{playerId || 'None'}</span></p>
          <p>Time Left: <span className="text-yellow-300">{timeLeft}s</span></p>
          <p>Countdown: <span className="text-yellow-300">{countdownValue}</span></p>
        </div>
        
        <button
          onClick={handleBackToLobby}
          className="mt-6 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors text-sm"
        >
          Back to Lobby
        </button>
      </div>
    </div>
  );
};

export default MultiplayerGame;