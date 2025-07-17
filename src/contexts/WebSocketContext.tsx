// contexts/WebSocketContext.tsx - CLEANED VERSION without debug logs
'use client';
import React, { createContext, useContext, ReactNode, useMemo } from 'react';
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
  const websocketHookData = useWebSocketHook();
  
  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => {
    return websocketHookData;
  }, [
    // Only re-create context when these specific values change
    websocketHookData.isConnected,
    websocketHookData.room?.id,
    websocketHookData.room?.state,
    websocketHookData.room?.playerCount,
    websocketHookData.playerId,
    websocketHookData.currentQuestion?.questionNumber,
    websocketHookData.gamePhase,
    websocketHookData.timeLeft,
    websocketHookData.selectedAnswer,
    websocketHookData.error,
    websocketHookData.countdownValue,
    // Stable function references
    websocketHookData.createRoom,
    websocketHookData.joinRoom,
    websocketHookData.leaveRoom,
    websocketHookData.startGame,
    websocketHookData.submitAnswer,
    websocketHookData.reconnect,
    websocketHookData.clearError
  ]);

  return (
    <WebSocketContext.Provider value={contextValue}>
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