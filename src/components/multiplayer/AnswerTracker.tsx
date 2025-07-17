// components/multiplayer/AnswerTracker.tsx - CLEANED VERSION
'use client';
import React, { useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';

interface AnswerTrackerProps {
  hoveredChoice: string | null;
  selectedAnswer: string | null;
  gamePhase: string;
  timeLeft: number;
  onAnswerUpdate?: (answer: string) => void;
}

const AnswerTracker: React.FC<AnswerTrackerProps> = ({
  hoveredChoice,
  selectedAnswer,
  gamePhase,
  timeLeft,
  onAnswerUpdate
}) => {
  const { submitAnswer } = useWebSocket();
  
  // Tracking refs
  const lastHoveredChoice = useRef<string | null>(null);
  const lastSentAnswer = useRef<string | null>(null);
  const hoverStartTime = useRef<number>(0);
  const answerLockTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Constants for answer logic
  const HOVER_STABILITY_THRESHOLD = 3; // 3 seconds stable hover
  const AUTO_SUBMIT_TIME = 5; // Auto submit when 5 seconds left

  // Reset tracking when question changes
  useEffect(() => {
    lastHoveredChoice.current = null;
    lastSentAnswer.current = null;
    hoverStartTime.current = 0;
    
    if (answerLockTimer.current) {
      clearTimeout(answerLockTimer.current);
      answerLockTimer.current = null;
    }
  }, [gamePhase]);

  // Track hover stability and auto-submit logic
  useEffect(() => {
    if (gamePhase !== 'playing' || selectedAnswer) return;

    // Track hover changes
    if (hoveredChoice !== lastHoveredChoice.current) {
      lastHoveredChoice.current = hoveredChoice;
      
      if (hoveredChoice) {
        hoverStartTime.current = Date.now();
      }
    }

    // Check for stable hover
    if (hoveredChoice && hoveredChoice === lastHoveredChoice.current) {
      const hoverDuration = (Date.now() - hoverStartTime.current) / 1000;
      
      if (hoverDuration >= HOVER_STABILITY_THRESHOLD && !lastSentAnswer.current) {
        handleAnswerSubmission(hoveredChoice, 'stable_hover');
      }
    }

    // Auto-submit when time is running out
    if (timeLeft <= AUTO_SUBMIT_TIME && timeLeft > 0 && hoveredChoice && !lastSentAnswer.current) {
      handleAnswerSubmission(hoveredChoice, 'time_pressure');
    }

    // Final auto-submit when time runs out
    if (timeLeft === 1 && !lastSentAnswer.current) {
      const finalChoice = hoveredChoice || lastHoveredChoice.current || 'a';
      handleAnswerSubmission(finalChoice, 'time_up');
    }

  }, [hoveredChoice, timeLeft, gamePhase, selectedAnswer]);

  // Handle answer submission with deduplication
  const handleAnswerSubmission = useCallback((answer: string, reason: string) => {
    if (!answer || selectedAnswer || lastSentAnswer.current) {
      return;
    }

    // Mark as sent immediately to prevent duplicates
    lastSentAnswer.current = answer;
    
    // Submit through WebSocket
    submitAnswer(answer);
    
    // Notify parent component
    onAnswerUpdate?.(answer);
    
    // Clear any pending timers
    if (answerLockTimer.current) {
      clearTimeout(answerLockTimer.current);
      answerLockTimer.current = null;
    }
  }, [selectedAnswer, submitAnswer, onAnswerUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (answerLockTimer.current) {
        clearTimeout(answerLockTimer.current);
      }
    };
  }, []);

  // Only show debug info in development
  if (process.env.NODE_ENV === 'development') {
    return (
      <div className="fixed bottom-4 left-4 bg-black/80 text-white p-2 text-xs rounded z-50 max-w-xs">
        <div className="text-yellow-400 font-bold mb-1">Answer Tracker</div>
        <div>Hovered: {hoveredChoice || 'None'}</div>
        <div>Selected: {selectedAnswer || 'None'}</div>
        <div>Last Sent: {lastSentAnswer.current || 'None'}</div>
        <div>Time Left: {timeLeft}s</div>
        <div>Hover Duration: {
          hoveredChoice && hoverStartTime.current 
            ? `${((Date.now() - hoverStartTime.current) / 1000).toFixed(1)}s`
            : '0s'
        }</div>
        <div className="text-gray-300 text-xs mt-1">
          Auto-submit: {HOVER_STABILITY_THRESHOLD}s hover or {AUTO_SUBMIT_TIME}s left
        </div>
      </div>
    );
  }

  return null;
};

export default AnswerTracker;