// components/multiplayer/MultiplayerLobby.tsx - Using WebSocket context
'use client';
import React, { useState } from 'react';
import { Users, Trophy, Crown, Zap, Wifi, WifiOff, AlertCircle, Copy, Check, Clock } from 'lucide-react';
import { useWebSocket } from '@/contexts/WebSocketContext';

const MultiplayerLobby: React.FC = () => {
  const {
    isConnected,
    room,
    playerId,
    gamePhase,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    reconnect
  } = useWebSocket();

  const [playerName, setPlayerName] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [entryFee, setEntryFee] = useState(0.5);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);

  // DEBUG: Log component render
  console.log('🏠 MultiplayerLobby rendered with state:', {
    gamePhase,
    hasRoom: !!room,
    playerId,
    isConnected
  });

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    createRoom({
      playerName: playerName.trim(),
      entryFee: entryFee
    });
  };

  const handleJoinRoom = () => {
    if (!playerName.trim() || !roomIdInput.trim()) {
      alert('Please enter your name and room ID');
      return;
    }

    joinRoom({
      roomId: roomIdInput.trim().toUpperCase(),
      playerName: playerName.trim()
    });
  };

  const handleStartGame = () => {
    console.log('🎮 Start game button clicked');
    
    if (!room || playerId !== room.creator) {
      alert('Only room creator can start the game');
      return;
    }

    if (room.playerCount < 2) {
      alert('Need at least 2 players to start');
      return;
    }

    if (room.state !== 'waiting') {
      alert('Game is already starting or in progress');
      return;
    }

    console.log('🎮 Starting game from lobby - all validations passed');
    setIsStartingGame(true);
    
    try {
      startGame();
      console.log('✅ Start game message sent successfully');
    } catch (error) {
      console.error('❌ Failed to start game:', error);
      setIsStartingGame(false);
      alert('Failed to start game. Please try again.');
    }
  };

  const copyRoomId = async () => {
    if (!room) return;
    
    try {
      await navigator.clipboard.writeText(room.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy room ID:', error);
    }
  };

  // Lobby Screen (No Room)
  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-4">
              SUI MILLIONAIRE
            </h1>
            <h2 className="text-2xl font-bold text-blue-400 mb-4">Multiplayer Battle Royale</h2>
            
            {/* Connection Status */}
            <div className="flex items-center justify-center gap-2 text-white/80 mb-4">
              {isConnected ? (
                <>
                  <Wifi className="w-5 h-5 text-green-400" />
                  <span>Connected to server</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-red-400" />
                  <span>Connecting to server...</span>
                </>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 text-red-300 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Error</span>
                </div>
                <p className="text-red-200 text-sm">{error}</p>
                <button
                  onClick={reconnect}
                  className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors text-sm"
                >
                  Retry Connection
                </button>
              </div>
            )}
          </div>

          {/* Main Form */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
            <div className="space-y-6">
              {/* Player Name */}
              <div>
                <label className="block text-white font-medium mb-2">Your Name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name..."
                  className="w-full px-4 py-3 bg-black/40 border border-white/30 rounded-xl text-white placeholder-white/50 focus:border-blue-400 focus:outline-none"
                  maxLength={20}
                  disabled={!isConnected}
                />
              </div>

              {!showJoinForm ? (
                <>
                  {/* Entry Fee */}
                  <div>
                    <label className="block text-white font-medium mb-2">Entry Fee (SUI)</label>
                    <select
                      value={entryFee}
                      onChange={(e) => setEntryFee(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-black/40 border border-white/30 rounded-xl text-white focus:border-blue-400 focus:outline-none"
                      disabled={!isConnected}
                    >
                      <option value={0.1}>0.1 SUI (Low stakes)</option>
                      <option value={0.5}>0.5 SUI (Medium stakes)</option>
                      <option value={1}>1 SUI (High stakes)</option>
                      <option value={2}>2 SUI (Very high stakes)</option>
                      <option value={5}>5 SUI (Premium)</option>
                    </select>
                  </div>

                  {/* Create Room Button */}
                  <button
                    onClick={handleCreateRoom}
                    disabled={!isConnected || !playerName.trim()}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 flex items-center justify-center gap-3"
                  >
                    <Crown className="w-6 h-6" />
                    <span>Create Room</span>
                  </button>

                  <div className="text-center">
                    <span className="text-white/60">or</span>
                  </div>

                  <button
                    onClick={() => setShowJoinForm(true)}
                    disabled={!isConnected}
                    className="w-full bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    <Users className="w-6 h-6" />
                    <span>Join Room</span>
                  </button>
                </>
              ) : (
                <>
                  {/* Room ID Input */}
                  <div>
                    <label className="block text-white font-medium mb-2">Room ID</label>
                    <input
                      type="text"
                      value={roomIdInput}
                      onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                      placeholder="Enter 6-digit room ID..."
                      className="w-full px-4 py-3 bg-black/40 border border-white/30 rounded-xl text-white placeholder-white/50 focus:border-blue-400 focus:outline-none text-center text-xl font-mono tracking-wider"
                      maxLength={6}
                      disabled={!isConnected}
                    />
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={handleJoinRoom}
                      disabled={!isConnected || !playerName.trim() || !roomIdInput.trim()}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100"
                    >
                      Join Room
                    </button>
                    <button
                      onClick={() => setShowJoinForm(false)}
                      className="px-6 py-4 bg-white/10 hover:bg-white/20 border border-white/30 text-white rounded-xl transition-all duration-300"
                    >
                      Back
                    </button>
                  </div>
                </>
              )}

              {/* Info Box */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <h4 className="text-blue-300 font-bold mb-2">🎮 How Multiplayer Works</h4>
                <ul className="text-blue-200 text-sm space-y-1">
                  <li>• Battle royale quiz - last player standing wins</li>
                  <li>• Wrong answer = elimination</li>
                  <li>• 15 seconds per question</li>
                  <li>• Winner takes 95% of prize pool</li>
                  <li>• Up to 50 players per room</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Room Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Room Header */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/20">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-bold text-white">
                  Room: <span className="text-yellow-400">{room.id}</span>
                </h2>
                <button
                  onClick={copyRoomId}
                  className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-lg transition-colors"
                  title="Copy Room ID"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5 text-yellow-400" />
                  )}
                </button>
              </div>
              
              <div className="flex items-center gap-6 text-white/80 flex-wrap">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span>{room.playerCount}/{room.maxPlayers} Players</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <span>{room.prizePool.toFixed(1)} SUI Prize Pool</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    room.state === 'waiting' ? 'bg-blue-500' : 
                    room.state === 'starting' ? 'bg-yellow-500' : 
                    room.state === 'playing' ? 'bg-green-500' : 'bg-gray-500'
                  }`}></div>
                  <span className="capitalize">{room.state}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              {/* Start Game Button */}
              {playerId === room.creator && room.state === 'waiting' && (
                <button
                  onClick={handleStartGame}
                  disabled={room.playerCount < 2 || isStartingGame}
                  className={`
                    bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 
                    disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-6 rounded-xl 
                    transition-all duration-300 flex items-center gap-2
                    ${isStartingGame ? 'cursor-not-allowed opacity-75' : 'hover:scale-105'}
                  `}
                >
                  {isStartingGame ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Starting...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      <span>Start Game</span>
                    </>
                  )}
                </button>
              )}
              
              {/* Show status if game is starting */}
              {room.state === 'starting' && (
                <div className="flex items-center gap-2 px-4 py-3 bg-yellow-500/20 border border-yellow-500/30 rounded-xl text-yellow-300">
                  <Clock className="w-5 h-5" />
                  <span className="font-bold">Game Starting...</span>
                </div>
              )}
              
              <button
                onClick={leaveRoom}
                disabled={isStartingGame}
                className="bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300"
              >
                Leave Room
              </button>
            </div>
          </div>
        </div>

        {/* Players List */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-6 h-6" />
            Players ({room.playerCount}/{room.maxPlayers})
          </h3>
          
          <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
            {room.players.map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  player.eliminated 
                    ? 'bg-red-500/20 border border-red-500/30' 
                    : 'bg-white/10 border border-white/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    player.eliminated 
                      ? 'bg-red-500 text-white' 
                      : 'bg-blue-500 text-white'
                  }`}>
                    {index + 1}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${
                        player.eliminated ? 'text-red-300 line-through' : 'text-white'
                      }`}>
                        {player.name}
                      </span>
                      
                      {player.isCreator && (
                        <Crown className="w-4 h-4 text-yellow-400" />
                      )}
                      
                      {player.id === playerId && (
                        <span className="text-xs bg-blue-500/30 text-blue-300 px-2 py-1 rounded">
                          You
                        </span>
                      )}
                    </div>
                    
                    {player.eliminated && (
                      <span className="text-xs text-red-400">Eliminated</span>
                    )}
                  </div>
                </div>
                
                <div className={`w-3 h-3 rounded-full ${
                  player.eliminated ? 'bg-red-500' : 'bg-green-500'
                }`}></div>
              </div>
            ))}
          </div>
          
          {/* Validation messages */}
          {room.playerCount < 2 && room.state === 'waiting' && (
            <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-300 text-sm text-center">
                ⚠️ Need at least 2 players to start the game
              </p>
            </div>
          )}
          
          {isStartingGame && (
            <div className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
              <p className="text-green-300 text-sm text-center">
                🚀 Game is starting! Get ready...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiplayerLobby;