// app/multiplayer/page.tsx - Using WebSocket context
'use client';
import React, { useEffect, useState } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import MultiplayerLobby from '@/components/multiplayer/MultiplayerLobby';
import MultiplayerGame from '@/components/multiplayer/MultiplayerGame';
import DebugPanel from '@/components/debug/DebugPanel';
import WebSocketStateLogger from '@/components/debug/WebSocketStateLogger';

const MultiplayerPage: React.FC = () => {
  const { gamePhase, room, currentQuestion, isConnected, error, playerId } = useWebSocket();
  
  // Force re-render counter
  const [renderCount, setRenderCount] = useState(0);
  
  // Force re-render whenever gamePhase changes
  useEffect(() => {
    console.log('🔄 FORCING RE-RENDER due to gamePhase change:', gamePhase);
    setRenderCount(prev => prev + 1);
  }, [gamePhase]);

  // CRITICAL DEBUG: Log EVERY render
  console.log(`🎮 ===== MULTIPLAYER PAGE RENDER #${renderCount} =====`);
  console.log('🎮 Current state:', {
    gamePhase,
    hasRoom: !!room,
    hasCurrentQuestion: !!currentQuestion,
    isConnected,
    roomState: room?.state,
    playerId,
    error,
    renderCount,
    timestamp: new Date().toISOString()
  });

  // Enhanced debug logging
  useEffect(() => {
    const shouldShowGame = gamePhase === 'starting' || gamePhase === 'playing' || gamePhase === 'finished';
    const shouldShowLobby = gamePhase === 'lobby' || (!room && isConnected);
    
    console.log('🎮 ===== ROUTING DECISION LOGIC =====');
    console.log('🎮 gamePhase:', gamePhase);
    console.log('🎮 shouldShowGame:', shouldShowGame);
    console.log('🎮 shouldShowLobby:', shouldShowLobby);
    console.log('🎮 Will render:', shouldShowGame ? 'GAME' : shouldShowLobby ? 'LOBBY' : 'ERROR/LOADING');
    console.log('🎮 renderCount:', renderCount);
  }, [gamePhase, room, currentQuestion, isConnected, error, playerId, renderCount]);

  // Show connection error
  if (error && !isConnected) {
    console.log('🚫 ===== RENDERING CONNECTION ERROR =====');
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 text-center">
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-2xl font-bold text-white mb-4">Connection Error</h2>
              <p className="text-white/70 mb-6">{error}</p>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
        <DebugPanel />
        <WebSocketStateLogger />
      </>
    );
  }

  // Show loading while connecting
  if (!isConnected) {
    console.log('🔌 ===== RENDERING CONNECTION LOADING =====');
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-xl">Connecting to multiplayer server...</p>
            <p className="text-white/70 text-sm mt-2">ws://localhost:8080</p>
          </div>
        </div>
        <DebugPanel />
        <WebSocketStateLogger />
      </>
    );
  }

  // MAIN ROUTING LOGIC
  console.log('🎮 ===== MAIN ROUTING LOGIC =====');
  console.log('🎮 gamePhase check:', {
    gamePhase,
    isStarting: gamePhase === 'starting',
    isPlaying: gamePhase === 'playing', 
    isFinished: gamePhase === 'finished',
    isLobby: gamePhase === 'lobby'
  });

  if (gamePhase === 'starting') {
    console.log('🚀 ===== RENDERING GAME (STARTING) =====');
    return (
      <>
        <div className="relative">
          <div className="fixed top-2 left-2 bg-red-800/90 text-white p-2 text-xs z-50 rounded">
            STARTING - Render #{renderCount} - Phase: {gamePhase}
          </div>
          <MultiplayerGame />
        </div>
        <DebugPanel />
        <WebSocketStateLogger />
      </>
    );
  }

  if (gamePhase === 'playing') {
    console.log('🎮 ===== RENDERING GAME (PLAYING) =====');
    return (
      <>
        <div className="relative">
          <div className="fixed top-2 left-2 bg-green-800/90 text-white p-2 text-xs z-50 rounded">
            PLAYING - Render #{renderCount} - Phase: {gamePhase}
          </div>
          <MultiplayerGame />
        </div>
        <DebugPanel />
        <WebSocketStateLogger />
      </>
    );
  }

  if (gamePhase === 'finished') {
    console.log('🏁 ===== RENDERING GAME (FINISHED) =====');
    return (
      <>
        <div className="relative">
          <div className="fixed top-2 left-2 bg-purple-800/90 text-white p-2 text-xs z-50 rounded">
            FINISHED - Render #{renderCount} - Phase: {gamePhase}
          </div>
          <MultiplayerGame />
        </div>
        <DebugPanel />
        <WebSocketStateLogger />
      </>
    );
  }

  // Default to lobby
  console.log('🏠 ===== RENDERING LOBBY =====');
  return (
    <>
      <div className="relative">
        <div className="fixed top-2 left-2 bg-blue-800/90 text-white p-2 text-xs z-50 rounded">
          LOBBY - Render #{renderCount} - Phase: {gamePhase}
        </div>
        <MultiplayerLobby />
      </div>
      <DebugPanel />
      <WebSocketStateLogger />
    </>
  );
};

export default MultiplayerPage;