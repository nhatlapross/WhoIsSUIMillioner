// contexts/WebSocketContext.tsx - SINGLE INSTANCE context provider
'use client';
import React, { createContext, useContext, ReactNode } from 'react';
import { useWebSocket as useWebSocketHook } from '@/hooks/useWebSocket';
import { 
  MessageType, 
  RoomInfo,
  CreateRoomRequest,
  JoinRoomRequest,
  StartGameRequest,
  PlayerAnswerRequest
} from '@/types/multiplayer';

interface WebSocketContextType {
  isConnected: boolean;
  room: RoomInfo | null;
  playerId: string | null;
  currentQuestion: any | null;
  gamePhase: 'lobby' | 'starting' | 'playing' | 'finished';
  timeLeft: number;
  selectedAnswer: string | null;
  error: string | null;
  eliminationData: any | null;
  gameStartData: any | null;
  countdownValue: number;
  createRoom: (data: CreateRoomRequest) => void;
  joinRoom: (data: JoinRoomRequest) => void;
  leaveRoom: () => void;
  startGame: (questions?: any[]) => void;
  submitAnswer: (answer: string) => void;
  reconnect: () => void;
  clearError: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const websocketState = useWebSocketHook();
  
  console.log('🔌 WebSocketProvider render with state:', {
    gamePhase: websocketState.gamePhase,
    hasRoom: !!websocketState.room,
    playerId: websocketState.playerId,
    isConnected: websocketState.isConnected
  });

  return (
    <WebSocketContext.Provider value={websocketState}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};