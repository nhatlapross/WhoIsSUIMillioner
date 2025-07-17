// components/debug/DebugPanel.tsx - Debug panel for WebSocket state
'use client';
import React, { useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Bug, Eye, EyeOff } from 'lucide-react';

const DebugPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const websocketState = useWebSocket();

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-yellow-600 hover:bg-yellow-500 text-white p-3 rounded-full shadow-lg z-50"
        title="Show Debug Panel"
      >
        <Bug className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg shadow-lg z-50 max-w-md w-full max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-yellow-400 flex items-center gap-2">
          <Bug className="w-4 h-4" />
          WebSocket Debug
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          <EyeOff className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-gray-400">Connected:</span>
            <span className={`ml-2 ${websocketState.isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {websocketState.isConnected ? 'Yes' : 'No'}
            </span>
          </div>
          
          <div>
            <span className="text-gray-400">Game Phase:</span>
            <span className="ml-2 text-yellow-400 font-bold">
              {websocketState.gamePhase}
            </span>
          </div>

          <div>
            <span className="text-gray-400">Has Room:</span>
            <span className={`ml-2 ${websocketState.room ? 'text-green-400' : 'text-red-400'}`}>
              {websocketState.room ? 'Yes' : 'No'}
            </span>
          </div>

          <div>
            <span className="text-gray-400">Room State:</span>
            <span className="ml-2 text-blue-400">
              {websocketState.room?.state || 'None'}
            </span>
          </div>

          <div>
            <span className="text-gray-400">Player ID:</span>
            <span className="ml-2 text-green-400 font-mono text-xs">
              {websocketState.playerId ? websocketState.playerId.slice(0, 8) + '...' : 'None'}
            </span>
          </div>

          <div>
            <span className="text-gray-400">Has Question:</span>
            <span className={`ml-2 ${websocketState.currentQuestion ? 'text-green-400' : 'text-red-400'}`}>
              {websocketState.currentQuestion ? 'Yes' : 'No'}
            </span>
          </div>

          <div>
            <span className="text-gray-400">Time Left:</span>
            <span className="ml-2 text-orange-400">
              {websocketState.timeLeft}s
            </span>
          </div>

          <div>
            <span className="text-gray-400">Countdown:</span>
            <span className="ml-2 text-purple-400">
              {websocketState.countdownValue}
            </span>
          </div>

          <div>
            <span className="text-gray-400">Selected Answer:</span>
            <span className="ml-2 text-cyan-400">
              {websocketState.selectedAnswer || 'None'}
            </span>
          </div>

          <div>
            <span className="text-gray-400">Error:</span>
            <span className={`ml-2 ${websocketState.error ? 'text-red-400' : 'text-green-400'}`}>
              {websocketState.error || 'None'}
            </span>
          </div>
        </div>

        {websocketState.room && (
          <div className="mt-3 pt-3 border-t border-gray-600">
            <div className="text-gray-400 mb-1">Room Info:</div>
            <div className="pl-2 space-y-1">
              <div>ID: <span className="text-yellow-400 font-mono">{websocketState.room.id}</span></div>
              <div>Players: <span className="text-green-400">{websocketState.room.playerCount}/{websocketState.room.maxPlayers}</span></div>
              <div>Prize Pool: <span className="text-yellow-400">{websocketState.room.prizePool} SUI</span></div>
              <div>Creator: <span className="text-blue-400">{websocketState.room.creator === websocketState.playerId ? 'You' : 'Other'}</span></div>
            </div>
          </div>
        )}

        {websocketState.currentQuestion && (
          <div className="mt-3 pt-3 border-t border-gray-600">
            <div className="text-gray-400 mb-1">Current Question:</div>
            <div className="pl-2 space-y-1">
              <div>Number: <span className="text-yellow-400">{websocketState.currentQuestion.questionNumber}</span></div>
              <div>Alive Players: <span className="text-green-400">{websocketState.currentQuestion.alivePlayers}</span></div>
              <div>Time Limit: <span className="text-orange-400">{websocketState.currentQuestion.timeLimit}s</span></div>
            </div>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-gray-600">
          <div className="text-gray-400 mb-1">Routing Logic:</div>
          <div className="pl-2 text-xs">
            {websocketState.gamePhase === 'starting' && (
              <div className="text-yellow-400">→ Should show game (starting countdown)</div>
            )}
            {websocketState.gamePhase === 'playing' && (
              <div className="text-green-400">→ Should show game (playing)</div>
            )}
            {websocketState.gamePhase === 'finished' && (
              <div className="text-purple-400">→ Should show game (finished)</div>
            )}
            {websocketState.gamePhase === 'lobby' && (
              <div className="text-blue-400">→ Should show lobby</div>
            )}
          </div>
        </div>

        {websocketState.error && (
          <div className="mt-3 pt-3 border-t border-red-600">
            <div className="text-red-400 mb-1">Error:</div>
            <div className="pl-2 text-red-300 text-xs break-words">
              {websocketState.error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugPanel;