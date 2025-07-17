'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';

// Types
interface Player {
id: string;
name: string;
isCreator: boolean;
eliminated: boolean;
}

interface Room {
id: string;
creator: string;
entryFee: number;
playerCount: number;
maxPlayers: number;
prizePool: number;
state: string;
players: Player[];
}

interface Question {
questionNumber: number;
question: string;
choices: string[];
timeLimit: number;
alivePlayers: number;
}

interface LogEntry {
timestamp: string;
type: 'sent' | 'received' | 'error' | 'info';
message: string;
data?: any;
}

const WebSocketTester: React.FC = () => {
// Connection state
const [ws, setWs] = useState<WebSocket | null>(null);
const [isConnected, setIsConnected] = useState(false);
const [serverUrl, setServerUrl] = useState('ws://localhost:8080');

// Player state
const [playerId, setPlayerId] = useState<string>('');
const [playerName, setPlayerName] = useState('TestPlayer');

// Room state
const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
const [roomIdToJoin, setRoomIdToJoin] = useState('');
const [entryFee, setEntryFee] = useState(0.5);

// Game state
const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
const [selectedAnswer, setSelectedAnswer] = useState<string>('');
const [gameState, setGameState] = useState<string>('waiting');

// UI state
const [logs, setLogs] = useState<LogEntry[]>([]);
const [autoScroll, setAutoScroll] = useState(true);
const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());
const logsEndRef = useRef<HTMLDivElement>(null);

// Message types
const MessageType = {
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  ROOM_UPDATE: 'room_update',
  START_GAME: 'start_game',
  GAME_STARTED: 'game_started',
  NEXT_QUESTION: 'next_question',
  PLAYER_ANSWER: 'player_answer',
  PLAYER_ELIMINATED: 'player_eliminated',
  GAME_OVER: 'game_over',
  ERROR: 'error',
  PING: 'ping',
  PONG: 'pong'
};

// Logging function
const addLog = useCallback((type: LogEntry['type'], message: string, data?: any) => {
  const logEntry: LogEntry = {
    timestamp: new Date().toLocaleTimeString(),
    type,
    message,
    data
  };
  setLogs(prev => [...prev, logEntry]);
}, []);

// Auto scroll to bottom
useEffect(() => {
  if (autoScroll && logsEndRef.current) {
    logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }
}, [logs, autoScroll]);

// WebSocket connection
const connect = useCallback(() => {
  try {
    const websocket = new WebSocket(serverUrl);
    
    websocket.onopen = () => {
      setIsConnected(true);
      setWs(websocket);
      addLog('info', 'Connected to WebSocket server');
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        addLog('received', `Received: ${data.type}`, data);
        
        switch (data.type) {
          case MessageType.ROOM_UPDATE:
            setCurrentRoom(data.data);
            if (data.data.playerId) {
              setPlayerId(data.data.playerId);
            }
            break;
            
          case MessageType.GAME_STARTED:
            setGameState('starting');
            addLog('info', `Game starting! Countdown: ${data.data.countdown}s`);
            break;
            
          case MessageType.NEXT_QUESTION:
            setCurrentQuestion(data.data);
            setSelectedAnswer('');
            setGameState('playing');
            break;
            
          case MessageType.PLAYER_ELIMINATED:
            addLog('info', `Players eliminated: ${data.data.eliminated.length}, Remaining: ${data.data.remaining}`);
            break;
            
          case MessageType.GAME_OVER:
            setGameState('finished');
            setCurrentQuestion(null);
            if (data.data.winner) {
              addLog('info', `Winner: ${data.data.winner.name} - Prize: $${data.data.winner.prize}`);
            } else {
              addLog('info', 'Game ended with no winner');
            }
            break;
            
          case MessageType.ERROR:
            addLog('error', `Server error: ${data.data.message}`);
            break;
            
          case MessageType.PONG:
            addLog('info', 'Pong received');
            break;
        }
      } catch (error) {
        addLog('error', 'Failed to parse message', event.data);
      }
    };

    websocket.onclose = () => {
      setIsConnected(false);
      setWs(null);
      setCurrentRoom(null);
      setPlayerId('');
      addLog('info', 'Disconnected from WebSocket server');
    };

    websocket.onerror = (error) => {
      addLog('error', 'WebSocket error', error);
    };

  } catch (error) {
    addLog('error', 'Failed to connect', error);
  }
}, [serverUrl, addLog]);

const disconnect = useCallback(() => {
  if (ws) {
    ws.close();
  }
}, [ws]);

// Send message helper
const sendMessage = useCallback((type: string, data?: any) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const message = { type, data };
    ws.send(JSON.stringify(message));
    addLog('sent', `Sent: ${type}`, data);
  } else {
    addLog('error', 'WebSocket not connected');
  }
}, [ws, addLog]);

// Room actions
const createRoom = () => {
  sendMessage(MessageType.CREATE_ROOM, {
    playerName,
    entryFee
  });
};

const joinRoom = () => {
  if (!roomIdToJoin.trim()) {
    addLog('error', 'Please enter room ID');
    return;
  }
  sendMessage(MessageType.JOIN_ROOM, {
    roomId: roomIdToJoin.toUpperCase(),
    playerName
  });
};

const leaveRoom = () => {
  sendMessage(MessageType.LEAVE_ROOM);
  setCurrentRoom(null);
  setCurrentQuestion(null);
  setGameState('waiting');
};

const startGame = () => {
  const defaultQuestions = [
    {
      question: "Thủ đô của Việt Nam là gì?",
      choices: ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng'],
      correctAnswer: 'a'
    },
    {
      question: "Sông nào dài nhất Việt Nam?",
      choices: ['Sông Hồng', 'Sông Mekong', 'Sông Đồng Nai', 'Sông Hương'],
      correctAnswer: 'b'
    },
    {
      question: "Đỉnh núi cao nhất Việt Nam là?",
      choices: ['Phan Xi Păng', 'Pu Ta Leng', 'Tà Chì Nhù', 'Pu Si Lung'],
      correctAnswer: 'a'
    }
  ];

  sendMessage(MessageType.START_GAME, {
    questions: defaultQuestions
  });
};

const submitAnswer = (answer: string) => {
  setSelectedAnswer(answer);
  sendMessage(MessageType.PLAYER_ANSWER, { answer });
};

const sendPing = () => {
  sendMessage(MessageType.PING);
};

const clearLogs = () => {
  setLogs([]);
  setExpandedLogs(new Set());
};

const toggleLogExpansion = (index: number) => {
  const newExpanded = new Set(expandedLogs);
  if (newExpanded.has(index)) {
    newExpanded.delete(index);
  } else {
    newExpanded.add(index);
  }
  setExpandedLogs(newExpanded);
};

return (
  <div style={{ 
    maxWidth: '1200px', 
    margin: '0 auto', 
    padding: '20px',
    fontFamily: 'Arial, sans-serif'
  }}>
    {/* Connection Card */}
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px',
      backgroundColor: 'black',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{
        margin: '0 0 20px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <span style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: isConnected ? '#22c55e' : '#ef4444'
        }}></span>
        WebSocket Game Tester
      </h2>
      
      {/* Connection Controls */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <input
          type="text"
          placeholder="WebSocket URL"
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
          disabled={isConnected}
          style={{
            flex: 1,
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
        <button
          onClick={isConnected ? disconnect : connect}
          style={{
            padding: '10px 20px',
            backgroundColor: isConnected ? '#ef4444' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {isConnected ? 'Disconnect' : 'Connect'}
        </button>
      </div>

      {/* Player Setup */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          placeholder="Player Name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          disabled={isConnected}
          style={{
            flex: 1,
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
        <input
          type="number"
          placeholder="Entry Fee"
          value={entryFee}
          onChange={(e) => setEntryFee(parseFloat(e.target.value) || 0.5)}
          disabled={isConnected}
          step="0.1"
          min="0"
          style={{
            width: '120px',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
      {/* Room Controls */}
      <div style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px',
        backgroundColor: 'black',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 20px 0' }}>🏠 Room Controls</h3>
        
        {!currentRoom ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={createRoom}
              disabled={!isConnected}
              style={{
                padding: '12px',
                backgroundColor: isConnected ? '#22c55e' : '#9ca3af',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isConnected ? 'pointer' : 'not-allowed',
                fontSize: '14px'
              }}
            >
              Create Room
            </button>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Room ID to join"
                value={roomIdToJoin}
                onChange={(e) => setRoomIdToJoin(e.target.value)}
                disabled={!isConnected}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
              <button
                onClick={joinRoom}
                disabled={!isConnected}
                style={{
                  padding: '10px 20px',
                  backgroundColor: isConnected ? '#3b82f6' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isConnected ? 'pointer' : 'not-allowed'
                }}
              >
                Join
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{
              padding: '15px',
              backgroundColor: 'black',
              borderRadius: '6px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0 }}>Room: {currentRoom.id}</h4>
                <span style={{
                  padding: '4px 8px',
                  backgroundColor: currentRoom.state === 'waiting' ? '#fbbf24' : '#22c55e',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '12px',
                  textTransform: 'uppercase'
                }}>
                  {currentRoom.state}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
                <div>👥 {currentRoom.playerCount}/{currentRoom.maxPlayers}</div>
                <div>💰 ${currentRoom.prizePool}</div>
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 10px 0' }}>Players:</h4>
              {currentRoom.players.map((player) => (
                <div key={player.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '5px 0',
                  fontSize: '14px'
                }}>
                  {player.isCreator && <span style={{ color: '#fbbf24' }}>👑</span>}
                  <span style={{
                    textDecoration: player.eliminated ? 'line-through' : 'none',
                    color: player.eliminated ? '#9ca3af' : 'inherit'
                  }}>
                    {player.name}
                  </span>
                  {player.id === playerId && (
                    <span style={{
                      padding: '2px 6px',
                      backgroundColor: '#e0e7ff',
                      color: '#3730a3',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      You
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {currentRoom.creator === playerId && currentRoom.state === 'waiting' && (
                <button
                  onClick={startGame}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: '#22c55e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px'
                  }}
                >
                  ▶️ Start Game
                </button>
              )}
              <button
                onClick={leaveRoom}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Leave Room
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Game Area */}
      <div style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px',
        backgroundColor: 'black',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 20px 0' }}>🎮 Game Area</h3>
        
        {currentQuestion ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{
              padding: '20px',
              backgroundColor: '#dbeafe',
              borderRadius: '8px',
              border: '1px solid #93c5fd'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <span style={{
                  padding: '4px 8px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>
                  Question {currentQuestion.questionNumber}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px' }}>
                  ⏰ {currentQuestion.timeLimit}s
                </div>
              </div>
              <h4 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>{currentQuestion.question}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentQuestion.choices.map((choice, index) => {
                  const answerKey = String.fromCharCode(97 + index); // a, b, c, d
                  return (
                    <button
                      key={answerKey}
                      onClick={() => submitAnswer(answerKey)}
                      disabled={selectedAnswer !== ''}
                      style={{
                        padding: '12px',
                        textAlign: 'left',
                        backgroundColor: selectedAnswer === answerKey ? '#3b82f6' : 'black',
                        color: selectedAnswer === answerKey ? 'white' : '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        cursor: selectedAnswer === '' ? 'pointer' : 'not-allowed',
                        fontSize: '14px'
                      }}
                    >
                      {answerKey.toUpperCase()}. {choice}
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: '10px', fontSize: '14px', color: '#6b7280' }}>
                Alive players: {currentQuestion.alivePlayers}
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            color: '#6b7280',
            padding: '60px 20px',
            fontSize: '16px'
          }}>
            {gameState === 'waiting' && 'Waiting for game to start...'}
            {gameState === 'starting' && 'Game is starting...'}
            {gameState === 'finished' && 'Game finished!'}
            {!currentRoom && 'Join a room to play'}
          </div>
        )}
      </div>
    </div>

    {/* Debug Logs */}
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '20px',
      backgroundColor: 'black',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0 }}>🐛 Debug Logs</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={sendPing}
            disabled={!isConnected}
            style={{
              padding: '8px 16px',
              backgroundColor: isConnected ? '#3b82f6' : '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isConnected ? 'pointer' : 'not-allowed',
              fontSize: '14px'
            }}
          >
            📤 Ping
          </button>
          <button
            onClick={clearLogs}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🗑️ Clear
          </button>
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
        <input
          type="checkbox"
          id="autoscroll"
          checked={autoScroll}
          onChange={(e) => setAutoScroll(e.target.checked)}
        />
        <label htmlFor="autoscroll" style={{ fontSize: '14px' }}>Auto-scroll</label>
      </div>
      
      <div style={{
        height: '300px',
        border: '1px solid #d1d5db',
        borderRadius: '4px',
        padding: '10px',
        overflow: 'auto',
        backgroundColor: '#f9fafb',
        fontFamily: 'monospace',
        fontSize: '12px'
      }}>
        {logs.map((log, index) => (
          <div key={index} style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#6b7280' }}>[{log.timestamp}]</span>
              <span style={{
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '10px',
                textTransform: 'uppercase',
                backgroundColor: 
                  log.type === 'error' ? '#fecaca' : 
                  log.type === 'sent' ? '#bfdbfe' : 
                  log.type === 'received' ? '#d1fae5' : '#f3f4f6',
                color:
                  log.type === 'error' ? '#dc2626' : 
                  log.type === 'sent' ? '#1d4ed8' : 
                  log.type === 'received' ? '#059669' : '#374151'
              }}>
                {log.type}
              </span>
              <span>{log.message}</span>
            </div>
            {log.data && (
              <div style={{ marginLeft: '20px', marginTop: '5px' }}>
                <button
                  onClick={() => toggleLogExpansion(index)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#3b82f6',
                    cursor: 'pointer',
                    fontSize: '12px',
                    textDecoration: 'underline'
                  }}
                >
                  {expandedLogs.has(index) ? '▼ Hide data' : '▶ Show data'}
                </button>
                {expandedLogs.has(index) && (
                  <pre style={{
                    marginTop: '5px',
                    padding: '10px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '4px',
                    fontSize: '11px',
                    overflow: 'auto',
                    maxHeight: '200px'
                  }}>
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  </div>
);
};

export default WebSocketTester;