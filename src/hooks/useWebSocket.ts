// hooks/useWebSocket.ts - CLEANED VERSION without debug logs
'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  const maxReconnectAttempts = useRef(5);
  const reconnectDelay = useRef(1000);
  
  // Answer tracking refs
  const lastSentAnswer = useRef<string | null>(null);
  const pendingAnswer = useRef<string | null>(null);
  const answerUpdateTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Timer refs
  const countdownTimer = useRef<NodeJS.Timeout | null>(null);
  const playingTimer = useRef<NodeJS.Timeout | null>(null);
  
  const updateState = useCallback((updater: (prev: WebSocketState) => WebSocketState) => {
    setState(updater);
  }, []);

  const getWebSocketUrl = (): string => {
    if (typeof window === 'undefined') return '';

    if (process.env.NODE_ENV === 'production') {
      return process.env.NEXT_PUBLIC_WS_URL || 'wss://whoissuimillioner.onrender.com';
    }

    return 'ws://localhost:8080';
  };

  const sendMessage = useCallback((type: MessageType, data?: any): boolean => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const message: WSMessage = { type, data };
      ws.current.send(JSON.stringify(message));
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  // Answer submission with continuous tracking
  const trackAnswer = useCallback((answer: string) => {
    pendingAnswer.current = answer;
    
    updateState(prev => ({ 
      ...prev, 
      selectedAnswer: answer 
    }));

    if (lastSentAnswer.current !== answer && state.gamePhase === 'playing') {
      if (answerUpdateTimer.current) {
        clearTimeout(answerUpdateTimer.current);
      }
      
      const success = sendMessage(MessageType.PLAYER_ANSWER, { answer });
      
      if (success) {
        lastSentAnswer.current = answer;
      } else {
        answerUpdateTimer.current = setTimeout(() => {
          if (pendingAnswer.current === answer && lastSentAnswer.current !== answer) {
            const retrySuccess = sendMessage(MessageType.PLAYER_ANSWER, { answer });
            if (retrySuccess) {
              lastSentAnswer.current = answer;
            }
          }
        }, 500);
      }
    }
  }, [sendMessage, state.gamePhase, updateState]);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WSMessage = JSON.parse(event.data);

      switch (message.type) {
        case MessageType.ROOM_UPDATE:
          updateState(prev => {
            const shouldResetToLobby = !prev.room || prev.gamePhase === 'lobby';
            return {
              ...prev,
              room: message.data,
              playerId: message.data.playerId || prev.playerId,
              gamePhase: shouldResetToLobby ? 'lobby' : prev.gamePhase,
              error: null
            };
          });
          break;

        case MessageType.GAME_STARTED:
          const countdownValue = message.data.countdown || 0;

          lastSentAnswer.current = null;
          pendingAnswer.current = null;

          if (countdownValue > 0) {
            updateState(prev => ({
              ...prev,
              gamePhase: 'starting',
              timeLeft: countdownValue,
              countdownValue: countdownValue,
              selectedAnswer: null,
              gameStartData: message.data,
              error: null
            }));
          } else {
            updateState(prev => ({
              ...prev,
              gamePhase: 'playing',
              timeLeft: 0,
              countdownValue: 0,
              selectedAnswer: null,
              gameStartData: message.data,
              error: null
            }));
          }
          break;

        case MessageType.NEXT_QUESTION:
          lastSentAnswer.current = null;
          pendingAnswer.current = null;
          
          updateState(prev => ({
            ...prev,
            gamePhase: 'playing',
            currentQuestion: message.data,
            timeLeft: message.data.timeLimit || 15,
            selectedAnswer: null,
            eliminationData: null,
            countdownValue: 0,
            error: null
          }));
          break;

        case MessageType.PLAYER_ANSWER:
          // Server confirmed answer received
          break;

        case MessageType.PLAYER_ELIMINATED:
          updateState(prev => ({
            ...prev,
            eliminationData: message.data
          }));
          break;

        case MessageType.GAME_OVER:
          lastSentAnswer.current = null;
          pendingAnswer.current = null;
          
          updateState(prev => ({
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
            selectedAnswer: null,
            countdownValue: 0,
            error: null
          }));
          break;

        case MessageType.ERROR:
          updateState(prev => ({ ...prev, error: message.data.message }));
          break;

        case MessageType.PONG:
          // Heartbeat response
          break;
      }
    } catch (error) {
      updateState(prev => ({ ...prev, error: 'Invalid message received' }));
    }
  }, [updateState]);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = getWebSocketUrl();

    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        updateState(prev => ({ ...prev, isConnected: true, error: null }));
        reconnectAttempts.current = 0;
        reconnectDelay.current = 1000;
      };

      ws.current.onmessage = handleMessage;

      ws.current.onclose = (event) => {
        updateState(prev => ({ ...prev, isConnected: false }));

        if (reconnectAttempts.current < maxReconnectAttempts.current) {
          reconnectAttempts.current++;
          reconnectDelay.current = Math.min(reconnectDelay.current * 2, 10000);

          setTimeout(connect, reconnectDelay.current);
        } else {
          updateState(prev => ({ ...prev, error: 'Connection lost' }));
        }
      };

      ws.current.onerror = (error) => {
        updateState(prev => ({ ...prev, error: 'Connection error' }));
      };
    } catch (error) {
      updateState(prev => ({ ...prev, error: 'Failed to connect' }));
    }
  }, [handleMessage, updateState]);

  // Initialize connection
  useEffect(() => {
    connect();
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  // Heartbeat
  useEffect(() => {
    if (!state.isConnected) return;

    const pingInterval = setInterval(() => {
      sendMessage(MessageType.PING);
    }, 30000);

    return () => clearInterval(pingInterval);
  }, [state.isConnected, sendMessage]);

  // Timer for starting phase
  useEffect(() => {
    if (countdownTimer.current) {
      clearTimeout(countdownTimer.current);
      countdownTimer.current = null;
    }

    if (state.gamePhase === 'starting' && state.timeLeft > 0) {
      countdownTimer.current = setTimeout(() => {
        updateState(prev => {
          if (prev.gamePhase !== 'starting') return prev;
          
          const newTimeLeft = prev.timeLeft - 1;
          
          if (newTimeLeft <= 0) {
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
    }

    return () => {
      if (countdownTimer.current) {
        clearTimeout(countdownTimer.current);
        countdownTimer.current = null;
      }
    };
  }, [state.gamePhase, state.timeLeft, updateState]);

  // Timer for playing phase with answer tracking
  useEffect(() => {
    if (playingTimer.current) {
      clearTimeout(playingTimer.current);
      playingTimer.current = null;
    }

    if (state.gamePhase === 'playing' && state.timeLeft > 0) {
      playingTimer.current = setTimeout(() => {
        updateState(prev => {
          if (prev.gamePhase !== 'playing' || prev.timeLeft <= 0) return prev;
          
          const newTimeLeft = prev.timeLeft - 1;
          
          // Check if we have an unsent answer
          if (pendingAnswer.current && lastSentAnswer.current !== pendingAnswer.current) {
            const success = sendMessage(MessageType.PLAYER_ANSWER, { answer: pendingAnswer.current });
            if (success) {
              lastSentAnswer.current = pendingAnswer.current;
            }
          }
          
          return {
            ...prev,
            timeLeft: newTimeLeft
          };
        });
      }, 1000);
    }

    return () => {
      if (playingTimer.current) {
        clearTimeout(playingTimer.current);
        playingTimer.current = null;
      }
    };
  }, [state.gamePhase, state.timeLeft, sendMessage, updateState]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (countdownTimer.current) {
        clearTimeout(countdownTimer.current);
      }
      if (playingTimer.current) {
        clearTimeout(playingTimer.current);
      }
      if (answerUpdateTimer.current) {
        clearTimeout(answerUpdateTimer.current);
      }
    };
  }, []);

  // API methods
  const apiMethods = useMemo(() => ({
    createRoom: (data: CreateRoomRequest) => {
      sendMessage(MessageType.CREATE_ROOM, data);
    },

    joinRoom: (data: JoinRoomRequest) => {
      sendMessage(MessageType.JOIN_ROOM, data);
    },

    leaveRoom: () => {
      lastSentAnswer.current = null;
      pendingAnswer.current = null;
      
      if (countdownTimer.current) {
        clearTimeout(countdownTimer.current);
        countdownTimer.current = null;
      }
      if (playingTimer.current) {
        clearTimeout(playingTimer.current);
        playingTimer.current = null;
      }
      if (answerUpdateTimer.current) {
        clearTimeout(answerUpdateTimer.current);
        answerUpdateTimer.current = null;
      }
      
      sendMessage(MessageType.LEAVE_ROOM);
      updateState(prev => ({
        ...prev,
        room: null,
        playerId: null,
        currentQuestion: null,
        gamePhase: 'lobby',
        selectedAnswer: null,
        eliminationData: null,
        gameStartData: null,
        timeLeft: 0,
        countdownValue: 0,
        error: null
      }));
    },

    startGame: (questions?: any[]) => {
      const data: StartGameRequest = questions ? { questions } : {};
      sendMessage(MessageType.START_GAME, data);
    },

    submitAnswer: (answer: string) => {
      if (state.selectedAnswer || state.gamePhase !== 'playing') {
        return;
      }

      trackAnswer(answer);
    },

    reconnect: () => {
      reconnectAttempts.current = 0;
      updateState(prev => ({ ...prev, error: null }));
      connect();
    },

    clearError: () => {
      updateState(prev => ({ ...prev, error: null }));
    }
  }), [sendMessage, connect, updateState, trackAnswer, state.selectedAnswer, state.gamePhase]);

  return {
    ...state,
    ...apiMethods
  };
};