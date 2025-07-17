// components/multiplayer/MultiplayerMain.tsx - SIMPLIFIED routing with debug
'use client';
import React from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import MultiplayerLobby from './MultiplayerLobby';
import MultiplayerGame from './MultiplayerGame';

const MultiplayerMain: React.FC = () => {
  const { gamePhase, room, isConnected, playerId, currentQuestion, timeLeft, countdownValue } = useWebSocket();

  // ENHANCED DEBUG logging with routing decision
  console.log('🎯 MultiplayerMain - Routing Decision:', {
    gamePhase,
    hasRoom: !!room,
    isConnected,
    roomState: room?.state,
    playerId,
    hasCurrentQuestion: !!currentQuestion,
    timeLeft,
    countdownValue,
    timestamp: new Date().toISOString()
  });

  // CLEAR ROUTING LOGIC:
  // 1. If gamePhase is 'starting', 'playing', or 'finished' -> Show Game
  // 2. Otherwise -> Show Lobby

  const shouldShowGame = gamePhase === 'starting' || gamePhase === 'playing' || gamePhase === 'finished';
  
  console.log('🎯 Routing decision:', {
    shouldShowGame,
    reason: shouldShowGame ? `gamePhase is ${gamePhase}` : `gamePhase is ${gamePhase}, showing lobby`
  });

  if (shouldShowGame) {
    console.log('🎮 Rendering MultiplayerGame');
    return <MultiplayerGame />;
  }

  console.log('🏠 Rendering MultiplayerLobby');
  return <MultiplayerLobby />;
};

export default MultiplayerMain;