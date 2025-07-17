// hooks/useWebSocket.ts - ENHANCED debugging and state management
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageType, 
  WSMessage, 
  RoomInfo,
  CreateRoomRequest,
  JoinRoomRequest,
  StartGameRequest,
  PlayerAnswerRequest
} from '@/types/multiplayer';

interface WebSocketState {
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
}

interface UseWebSocketReturn extends WebSocketState {
  createRoom: (data: CreateRoomRequest) => void;
  joinRoom: (data: JoinRoomRequest) => void;
  leaveRoom: () => void;
  startGame: (questions?: any[]) => void;
  submitAnswer: (answer: string) => void;
  reconnect: () => void;
  clearError: () => void;
}

export const useWebSocket = (): UseWebSocketReturn => {
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    room: null,
    playerId: null,
    currentQuestion: null,
    gamePhase: 'lobby',
    timeLeft: 0,
    selectedAnswer: null,
    error: null,
    eliminationData: null,
    gameStartData: null,
    countdownValue: 0
  });

  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = useRef(1000);

  // ENHANCED DEBUG: Track ALL state changes with detailed logging
  const prevState = useRef<WebSocketState>(state);
  useEffect(() => {
    const changedFields = Object.keys(state).filter(key => 
      (state as any)[key] !== (prevState.current as any)[key]
    );
    
    if (changedFields.length > 0) {
      console.log('🔄 WebSocket State Changed:', {
        changedFields,
        before: {
          gamePhase: prevState.current.gamePhase,
          roomState: prevState.current.room?.state,
          timeLeft: prevState.current.timeLeft,
          countdownValue: prevState.current.countdownValue
        },
        after: {
          gamePhase: state.gamePhase,
          roomState: state.room?.state,
          timeLeft: state.timeLeft,
          countdownValue: state.countdownValue
        },
        fullState: state
      });
    }
    
    prevState.current = state;
  }, [state]);

  const getWebSocketUrl = (): string => {
    if (typeof window === 'undefined') return '';
    return 'ws://localhost:8080';
  };

  const sendMessage = useCallback((type: MessageType, data?: any) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.error('❌ WebSocket not connected, cannot send:', type);
      setState(prev => ({ ...prev, error: 'Not connected to server' }));
      return;
    }

    const message: WSMessage = { type, data };
    
    try {
      ws.current.send(JSON.stringify(message));
      console.log('📤 Sent message:', type, data);
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      setState(prev => ({ ...prev, error: 'Failed to send message' }));
    }
  }, []);

  // ENHANCED: Handle incoming WebSocket messages with detailed logging
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WSMessage = JSON.parse(event.data);
      console.log('📨 Received message:', message.type, message.data);

      switch (message.type) {
        case MessageType.ROOM_UPDATE:
          console.log('🏠 ROOM_UPDATE received:', message.data);
          setState(prev => {
            // CRITICAL: Only reset to lobby if explicitly leaving or no room
            const shouldResetToLobby = !prev.room || prev.gamePhase === 'lobby';
            const newGamePhase = shouldResetToLobby ? 'lobby' : prev.gamePhase;
            
            console.log('🎮 ROOM_UPDATE phase decision:', {
              currentPhase: prev.gamePhase,
              hasRoom: !!prev.room,
              shouldResetToLobby,
              newGamePhase
            });
            
            return {
              ...prev,
              room: message.data,
              playerId: message.data.playerId || prev.playerId,
              gamePhase: newGamePhase,
              error: null
            };
          });
          break;

        case MessageType.GAME_STARTED:
          console.log('🎮 GAME_STARTED received:', message.data);
          const countdownValue = message.data.countdown || 0;
          
          if (countdownValue > 0) {
            console.log('⏰ COUNTDOWN ACTIVE - Setting gamePhase to starting:', countdownValue);
            setState(prev => ({
              ...prev,
              gamePhase: 'starting',
              timeLeft: countdownValue,
              countdownValue: countdownValue,
              gameStartData: message.data,
              error: null
            }));
          } else {
            console.log('🚀 COUNTDOWN FINISHED - Setting gamePhase to playing');
            setState(prev => ({
              ...prev,
              gamePhase: 'playing',
              timeLeft: 0,
              countdownValue: 0,
              gameStartData: message.data,
              error: null
            }));
          }
          break;

        case MessageType.NEXT_QUESTION:
          console.log('❓ NEXT_QUESTION received - ensuring playing state:', message.data);
          setState(prev => ({
            ...prev,
            gamePhase: 'playing', // FORCE playing state
            currentQuestion: message.data,
            timeLeft: message.data.timeLimit || 15,
            selectedAnswer: null,
            eliminationData: null,
            countdownValue: 0,
            error: null
          }));
          break;

        case MessageType.PLAYER_ELIMINATED:
          console.log('❌ PLAYER_ELIMINATED received:', message.data);
          setState(prev => ({
            ...prev,
            eliminationData: message.data
            // DON'T change gamePhase
          }));
          break;

        case MessageType.GAME_OVER:
          console.log('🏁 GAME_OVER received:', message.data);
          setState(prev => ({
            ...prev,
            gamePhase: 'finished',
            currentQuestion: { 
              ...prev.currentQuestion,
              ...message.data,
              winner: message.data.winner,
              finalStats: message.data.finalStats,
              prizePool: message.data.prizePool
            },
            timeLeft: 0,
            countdownValue: 0,
            error: null
          }));
          break;

        case MessageType.ERROR:
          console.error('❌ Server error:', message.data);
          setState(prev => ({ ...prev, error: message.data.message }));
          break;

        case MessageType.PONG:
          // Heartbeat response
          break;

        default:
          console.log('❓ Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Error parsing message:', error);
      setState(prev => ({ ...prev, error: 'Invalid message received' }));
    }
  }, []);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log('✅ WebSocket already connected');
      return;
    }

    const wsUrl = getWebSocketUrl();
    if (!wsUrl) {
      console.error('❌ No WebSocket URL available');
      return;
    }

    console.log('🔌 Connecting to WebSocket:', wsUrl);

    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        setState(prev => ({ ...prev, isConnected: true, error: null }));
        reconnectAttempts.current = 0;
        reconnectDelay.current = 1000;
      };

      ws.current.onmessage = handleMessage;

      ws.current.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setState(prev => ({ 
          ...prev, 
          isConnected: false
        }));
        
        // Auto-reconnect logic
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          reconnectDelay.current = Math.min(reconnectDelay.current * 2, 10000);
          
          console.log(`🔄 Reconnecting in ${reconnectDelay.current}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
          
          setTimeout(() => {
            connect();
          }, reconnectDelay.current);
        } else {
          setState(prev => ({ ...prev, error: 'Connection lost. Please refresh the page.' }));
        }
      };

      ws.current.onerror = (error) => {
        console.log('❌ WebSocket error:', error);
        setState(prev => ({ ...prev, error: 'Connection error' }));
      };
    } catch (error) {
      console.log('❌ Failed to create WebSocket:', error);
      setState(prev => ({ ...prev, error: 'Failed to connect' }));
    }
  }, [handleMessage]);

  // Initialize connection
  useEffect(() => {
    connect();

    return () => {
      if (ws.current) {
        console.log('🧹 Closing WebSocket connection');
        ws.current.close();
      }
    };
  }, [connect]);

  // Heartbeat ping
  useEffect(() => {
    if (!state.isConnected) return;

    const pingInterval = setInterval(() => {
      sendMessage(MessageType.PING);
    }, 30000);

    return () => clearInterval(pingInterval);
  }, [state.isConnected, sendMessage]);

  // ENHANCED: Timer countdown for starting phase with detailed logging
  useEffect(() => {
    if (state.gamePhase === 'starting' && state.timeLeft > 0) {
      console.log('⏰ Starting countdown timer, current timeLeft:', state.timeLeft);
      const timer = setTimeout(() => {
        setState(prev => {
          const newTimeLeft = prev.timeLeft - 1;
          console.log('⏰ Countdown tick:', newTimeLeft);
          
          if (newTimeLeft <= 0) {
            console.log('⏱️ Starting countdown finished, should transition to playing');
            return {
              ...prev,
              timeLeft: 0,
              gamePhase: 'playing',
              countdownValue: 0
            };
          }
          
          return {
            ...prev,
            timeLeft: newTimeLeft,
            countdownValue: newTimeLeft
          };
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [state.gamePhase, state.timeLeft]);

  // Timer countdown for playing phase
  useEffect(() => {
    if (state.gamePhase === 'playing' && state.timeLeft > 0 && !state.selectedAnswer) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state.gamePhase, state.timeLeft, state.selectedAnswer]);

  // API methods
  const createRoom = useCallback((data: CreateRoomRequest) => {
    console.log('🏠 Creating room:', data);
    sendMessage(MessageType.CREATE_ROOM, data);
  }, [sendMessage]);

  const joinRoom = useCallback((data: JoinRoomRequest) => {
    console.log('🚪 Joining room:', data);
    sendMessage(MessageType.JOIN_ROOM, data);
  }, [sendMessage]);

  const leaveRoom = useCallback(() => {
    console.log('👋 Leaving room - explicit reset to lobby');
    sendMessage(MessageType.LEAVE_ROOM);
    setState(prev => ({
      ...prev,
      room: null,
      playerId: null,
      currentQuestion: null,
      gamePhase: 'lobby', // EXPLICIT reset to lobby only when leaving
      selectedAnswer: null,
      eliminationData: null,
      gameStartData: null,
      timeLeft: 0,
      countdownValue: 0,
      error: null
    }));
  }, [sendMessage]);

  const startGame = useCallback((questions?: any[]) => {
    console.log('🎮 Starting game with questions:', questions?.length || 'default');
    const data: StartGameRequest = questions ? { questions } : {};
    sendMessage(MessageType.START_GAME, data);
  }, [sendMessage]);

  const submitAnswer = useCallback((answer: string) => {
    if (state.selectedAnswer) {
      console.log('⚠️ Answer already submitted:', state.selectedAnswer);
      return;
    }

    console.log('✍️ Submitting answer:', answer);
    setState(prev => ({ ...prev, selectedAnswer: answer }));
    
    const data: PlayerAnswerRequest = { answer };
    sendMessage(MessageType.PLAYER_ANSWER, data);
  }, [state.selectedAnswer, sendMessage]);

  const reconnect = useCallback(() => {
    console.log('🔄 Manual reconnect requested');
    reconnectAttempts.current = 0;
    setState(prev => ({ ...prev, error: null }));
    connect();
  }, [connect]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    submitAnswer,
    reconnect,
    clearError
  };
};