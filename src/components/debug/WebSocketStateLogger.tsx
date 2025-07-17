// components/debug/WebSocketStateLogger.tsx - Using WebSocket context
'use client';
import React, { useEffect, useRef } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';

const WebSocketStateLogger: React.FC = () => {
  const state = useWebSocket();
  const renderCountRef = useRef(0);
  const prevStateRef = useRef(state);

  // Increment render count
  renderCountRef.current += 1;

  // Log every render
  console.log(`🔥 WebSocketStateLogger Render #${renderCountRef.current}`);
  console.log('🔥 Current state:', state);

  // Track state changes
  useEffect(() => {
    const changedFields = Object.keys(state).filter(key => 
      (state as any)[key] !== (prevStateRef.current as any)[key]
    );
    
    if (changedFields.length > 0) {
      console.log('🔥 State changed in logger:', {
        changedFields,
        before: prevStateRef.current,
        after: state,
        renderCount: renderCountRef.current
      });
    }
    
    prevStateRef.current = state;
  });

  // Monitor gamePhase specifically
  useEffect(() => {
    console.log('🔥 GamePhase effect triggered:', state.gamePhase);
  }, [state.gamePhase]);

  // Real-time display
  return (
    <div className="fixed top-20 left-2 bg-black/90 text-white p-3 text-xs z-50 rounded max-w-xs">
      <div className="font-bold text-yellow-400 mb-2">State Monitor #{renderCountRef.current}</div>
      <div className="space-y-1">
        <div>Phase: <span className="text-green-400">{state.gamePhase}</span></div>
        <div>Connected: <span className="text-blue-400">{state.isConnected ? 'Yes' : 'No'}</span></div>
        <div>Room: <span className="text-purple-400">{state.room ? state.room.id : 'None'}</span></div>
        <div>RoomState: <span className="text-orange-400">{state.room?.state || 'None'}</span></div>
        <div>PlayerID: <span className="text-cyan-400">{state.playerId ? state.playerId.slice(0, 8) : 'None'}</span></div>
        <div>Question: <span className="text-pink-400">{state.currentQuestion ? 'Yes' : 'No'}</span></div>
        <div>TimeLeft: <span className="text-red-400">{state.timeLeft}s</span></div>
        <div>Countdown: <span className="text-yellow-400">{state.countdownValue}</span></div>
        <div>Error: <span className="text-red-400">{state.error || 'None'}</span></div>
      </div>
      
      {/* Context status */}
      <div className="mt-2 pt-2 border-t border-gray-600">
        <div className="text-green-400 text-xs">✅ Using Context</div>
      </div>
    </div>
  );
};

export default WebSocketStateLogger;