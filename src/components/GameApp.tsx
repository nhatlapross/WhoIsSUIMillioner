'use client';
import React, { useState } from 'react';
import GameStartup from '@/components/game/GameStartup';
import GameScreen from '@/components/GameScreen2';
import { useCameraPermission } from '@/hooks/useCameraPermission';

interface GameStartConfig {
  entryFee: number;
  gameType: string;
  maxPlayers?: number;
}

type GameMode = 'solo' | 'multiplayer' | 'ai';
type AppState = 'startup' | 'game' | 'results';

const GameApp: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('startup');
  const [gameMode, setGameMode] = useState<GameMode>('solo');
  const [gameConfig, setGameConfig] = useState<GameStartConfig | null>(null);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  
  const {
    stream: cameraStream,
    status,
    requestPermission: requestCameraPermission,
    error: cameraError
  } = useCameraPermission();
  
  const hasCameraPermission = status === 'granted';
  const isCameraLoading = status === 'requesting';

  const handleGameStart = (config: GameStartConfig, gameId?: string) => {
    console.log('Starting game with config:', config, 'gameId:', gameId);
    setGameConfig(config);
    setCurrentGameId(gameId || null);
    setAppState('game');
  };

  const handleBackToStartup = () => {
    setAppState('startup');
    setGameConfig(null);
    setCurrentGameId(null);
  };

  const handleGameComplete = (gameId: string, score: number) => {
    console.log('Game completed:', { gameId, score });
    setCurrentGameId(gameId);
    // Could show results screen or return to startup
    setAppState('startup');
  };

  // Render based on current app state
  switch (appState) {
    case 'startup':
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
          {/* Game Mode Selection */}
          <div className="container mx-auto px-4 py-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">Sui Millionaire</h1>
              <p className="text-white/70 mb-8">Choose your game mode</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <button
                  onClick={() => setGameMode('solo')}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    gameMode === 'solo' 
                      ? 'border-blue-400 bg-blue-500/20' 
                      : 'border-white/20 bg-white/10 hover:border-blue-400/50'
                  }`}
                >
                  <h3 className="text-xl font-bold text-white mb-2">Solo Challenge</h3>
                  <p className="text-white/70 text-sm">Play alone and earn rewards for correct answers</p>
                </button>
                
                <button
                  onClick={() => setGameMode('ai')}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    gameMode === 'ai' 
                      ? 'border-purple-400 bg-purple-500/20' 
                      : 'border-white/20 bg-white/10 hover:border-purple-400/50'
                  }`}
                >
                  <h3 className="text-xl font-bold text-white mb-2">AI Challenge</h3>
                  <p className="text-white/70 text-sm">Face adaptive AI-generated questions</p>
                </button>
                
                <button
                  onClick={() => setGameMode('multiplayer')}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    gameMode === 'multiplayer' 
                      ? 'border-green-400 bg-green-500/20' 
                      : 'border-white/20 bg-white/10 hover:border-green-400/50'
                  }`}
                >
                  <h3 className="text-xl font-bold text-white mb-2">Multiplayer Battle</h3>
                  <p className="text-white/70 text-sm">Compete with other players for the prize pool</p>
                </button>
              </div>
            </div>
          </div>
          
          {/* Game Startup Component */}
          <GameStartup
            gameMode={gameMode}
            onGameStart={handleGameStart}
          />
        </div>
      );

    case 'game':
      if (!gameConfig) {
        return <div>Loading game...</div>;
      }

      return (
        <GameScreen
          handTrackingEnabled={hasCameraPermission && !!cameraStream}
          cameraStream={cameraStream}
          onBackToPermission={handleBackToStartup}
          isMultiplayer={gameMode === 'multiplayer'}
          isUsingAI={gameMode === 'ai'}
          blockchainGameId={currentGameId}
          customGameState={{
            // Only include valid GameState properties
            score: 0,
            currentQuestion: 0
          }}
        />
      );

    case 'results':
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Game Complete!</h2>
            <p className="text-white/70 mb-8">Your results have been recorded on the blockchain.</p>
            <button
              onClick={handleBackToStartup}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Play Again
            </button>
          </div>
        </div>
      );

    default:
      return <div>Unknown state</div>;
  }
};

export default GameApp;