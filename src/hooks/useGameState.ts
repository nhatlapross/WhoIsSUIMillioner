// hooks/useGameState.ts
import { useState, useEffect, useRef } from 'react';
import { GameState, QUIZ_QUESTIONS, QUESTION_TIME_LIMIT } from '../types/game';

const initialGameState: GameState = {
  currentQuestion: 0,
  selectedChoice: null,
  hoveredChoice: null,
  showResult: false,
  isCorrect: null,
  timeLeft: QUESTION_TIME_LIMIT,
  isTimerActive: false,
  lastHoveredChoice: null,
  score: 0,
  gamePhase: 'playing'
};

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer logic
  useEffect(() => {
    if (
      gameState.isTimerActive && 
      gameState.timeLeft > 0 && 
      !gameState.selectedChoice && 
      !gameState.showResult &&
      gameState.gamePhase === 'playing'
    ) {
      timerRef.current = setTimeout(() => {
        setGameState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
      }, 1000);
    } else if (
      gameState.timeLeft === 0 && 
      !gameState.selectedChoice && 
      !gameState.showResult &&
      gameState.gamePhase === 'playing'
    ) {
      // Auto-select when time is up
      const choiceToSelect = gameState.lastHoveredChoice || 'a';
      selectChoice(choiceToSelect, true);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [
    gameState.isTimerActive, 
    gameState.timeLeft, 
    gameState.selectedChoice, 
    gameState.showResult,
    gameState.gamePhase,
    gameState.lastHoveredChoice
  ]);

  // Start timer when question changes
  useEffect(() => {
    if (
      !gameState.showResult && 
      gameState.selectedChoice === null && 
      gameState.gamePhase === 'playing'
    ) {
      setGameState(prev => ({
        ...prev,
        timeLeft: QUESTION_TIME_LIMIT,
        isTimerActive: true,
        lastHoveredChoice: null
      }));
    }
  }, [gameState.currentQuestion, gameState.showResult, gameState.selectedChoice, gameState.gamePhase]);

  // Update last hovered choice
  useEffect(() => {
    if (gameState.hoveredChoice && !gameState.selectedChoice) {
      setGameState(prev => ({ ...prev, lastHoveredChoice: prev.hoveredChoice }));
    }
  }, [gameState.hoveredChoice, gameState.selectedChoice]);

  // Select choice function
  const selectChoice = (choiceId: string, isAutoSelected: boolean = false) => {
    if (gameState.selectedChoice || gameState.showResult) return;

    const correct = choiceId === QUIZ_QUESTIONS[gameState.currentQuestion].correctAnswer;
    
    setGameState(prev => ({
      ...prev,
      isTimerActive: false,
      selectedChoice: choiceId,
      isCorrect: correct,
      showResult: true,
      score: correct ? prev.score + 1 : prev.score
    }));
    
    const resultDelay = isAutoSelected ? 3000 : 2500;
    
    setTimeout(() => {
      if (gameState.currentQuestion < QUIZ_QUESTIONS.length - 1) {
        setGameState(prev => ({
          ...prev,
          currentQuestion: prev.currentQuestion + 1,
          selectedChoice: null,
          showResult: false,
          isCorrect: null,
          hoveredChoice: null
        }));
      } else {
        // Game finished
        setGameState(prev => ({ ...prev, gamePhase: 'gameOver' }));
      }
    }, resultDelay);
  };

  // Set hovered choice
  const setHoveredChoice = (choiceId: string | null) => {
    setGameState(prev => ({ ...prev, hoveredChoice: choiceId }));
  };

  // Reset game
  const resetGame = () => {
    setGameState(initialGameState);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  // Reset timer
  const resetTimer = () => {
    setGameState(prev => ({
      ...prev,
      timeLeft: QUESTION_TIME_LIMIT,
      isTimerActive: false,
      lastHoveredChoice: null
    }));
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    gameState,
    selectChoice,
    setHoveredChoice,
    resetGame,
    resetTimer
  };
};