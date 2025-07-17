// components/GameScreen2.tsx - Final version with complete multiplayer support
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera } from 'lucide-react';

// Components
import GameHeader from '@/components/game/GameHeader';
import GameTimer from '@/components/game/GameTimer';
import QuestionDisplay from '@/components/game/QuestionDisplay';
import AnswerChoices from '@/components/game/AnswerChoices';
import GameOverScreen from '@/components/game/GameOverScreen';
import HandTrackingCanvas from '@/components/game/HandTrackingCanvas';
import GameNotifications from '@/components/game/GameNotifications';
import GameInstructions from '@/components/game/GameInstructions';

// Types and utilities
import { 
  HandResults, 
  HandLandmark, 
  GameState, 
  QUIZ_QUESTIONS, 
  QUESTION_TIME_LIMIT,
  QuizQuestion 
} from '../types/game';
import { 
  createQuizChoices, 
  isPointInChoice, 
  calculateGameStats, 
  loadMediaPipeScript 
} from '../utils/gameUtils';

interface GameScreenProps {
  handTrackingEnabled: boolean;
  cameraStream: MediaStream | undefined;
  onBackToPermission: () => void;
  customQuestions?: QuizQuestion[] | null;
  isUsingAI?: boolean;
  // New props for multiplayer support
  customGameState?: Partial<GameState>;
  onAnswerSelect?: (choiceId: string) => void;
  isMultiplayer?: boolean;
}

const GameScreen: React.FC<GameScreenProps> = ({ 
  handTrackingEnabled, 
  cameraStream, 
  onBackToPermission,
  customQuestions = null,
  isUsingAI = false,
  customGameState = {},
  onAnswerSelect,
  isMultiplayer = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const handDetectionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const handsInstanceRef = useRef<any>(null);
  const cameraInstanceRef = useRef<any>(null);
  
  // Use custom questions or default questions
  const activeQuestions = customQuestions || QUIZ_QUESTIONS;
  
  // Screen and UI state
  const [screenSize, setScreenSize] = useState({ 
    width: window.innerWidth, 
    height: window.innerHeight 
  });
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // MediaPipe state
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [useSimpleMode, setUseSimpleMode] = useState(false);
  const [handPosition, setHandPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Hand detection timeout state
  const [handDetectionWarning, setHandDetectionWarning] = useState(false);
  const [handDetectionCountdown, setHandDetectionCountdown] = useState(3);
  const [lastHandDetectionTime, setLastHandDetectionTime] = useState(Date.now());
  
  // Game state - merge with custom state for multiplayer
  const [gameState, setGameState] = useState<GameState>({
    currentQuestion: 0,
    selectedChoice: null,
    hoveredChoice: null,
    showResult: false,
    isCorrect: null,
    timeLeft: QUESTION_TIME_LIMIT,
    isTimerActive: false,
    lastHoveredChoice: null,
    score: 0,
    gamePhase: 'playing',
    ...customGameState // Override with custom state for multiplayer
  });

  // Update game state when customGameState changes (for multiplayer)
  useEffect(() => {
    if (isMultiplayer && customGameState) {
      setGameState(prev => ({
        ...prev,
        ...customGameState
      }));
    }
  }, [customGameState, isMultiplayer]);

  // Handle screen resize
  useEffect(() => {
    const handleResize = () => {
      setScreenSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Hand detection timeout logic (only for solo mode)
  useEffect(() => {
    if (!handTrackingEnabled || useSimpleMode || gameState.gamePhase !== 'playing' || isMultiplayer) {
      return;
    }

    const checkHandDetection = () => {
      const now = Date.now();
      const timeSinceLastDetection = now - lastHandDetectionTime;
      
      if (timeSinceLastDetection > 3000) { // 3 seconds
        // No hand detected for 3 seconds - game over
        setGameState(prev => ({ ...prev, gamePhase: 'gameOver' }));
        return;
      }
      
      if (timeSinceLastDetection > 1000) { // Start warning after 1 second
        setHandDetectionWarning(true);
        const countdown = Math.ceil((3000 - timeSinceLastDetection) / 1000);
        setHandDetectionCountdown(countdown);
      } else {
        setHandDetectionWarning(false);
      }
    };

    const interval = setInterval(checkHandDetection, 100);
    return () => clearInterval(interval);
  }, [handTrackingEnabled, useSimpleMode, gameState.gamePhase, lastHandDetectionTime, isMultiplayer]);

  // Timer logic (only for solo mode)
  useEffect(() => {
    if (isMultiplayer) return; // Multiplayer handles its own timing

    if (gameState.isTimerActive && gameState.timeLeft > 0 && !gameState.selectedChoice && !gameState.showResult) {
      timerRef.current = setTimeout(() => {
        setGameState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
      }, 1000);
    } else if (gameState.timeLeft === 0 && !gameState.selectedChoice && !gameState.showResult) {
      handleTimeUp();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [gameState.isTimerActive, gameState.timeLeft, gameState.selectedChoice, gameState.showResult, isMultiplayer]);

  // Start timer when question changes (only for solo mode)
  useEffect(() => {
    if (isMultiplayer) return;

    if (!gameState.showResult && gameState.selectedChoice === null && gameState.gamePhase === 'playing') {
      setGameState(prev => ({
        ...prev,
        timeLeft: QUESTION_TIME_LIMIT,
        isTimerActive: true,
        lastHoveredChoice: null
      }));
    }
  }, [gameState.currentQuestion, gameState.showResult, gameState.selectedChoice, gameState.gamePhase, isMultiplayer]);

  // Update last hovered choice
  useEffect(() => {
    if (gameState.hoveredChoice && !gameState.selectedChoice) {
      setGameState(prev => ({ ...prev, lastHoveredChoice: prev.hoveredChoice }));
    }
  }, [gameState.hoveredChoice, gameState.selectedChoice]);

  // Handle time up (only for solo mode)
  const handleTimeUp = () => {
    if (isMultiplayer) return;
    
    const choiceToSelect = gameState.lastHoveredChoice || 'a';
    handleChoiceSelect(choiceToSelect, true);
  };

  // Reset timer
  const resetTimer = () => {
    if (isMultiplayer) return;
    
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

  // Toggle fullscreen
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  // Get current quiz choices with dynamic positioning
  const getCurrentChoices = () => {
    const currentQuestion = activeQuestions[gameState.currentQuestion];
    const baseChoices = ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Cần Thơ'];
    const questionChoices = currentQuestion?.choices || baseChoices;
    
    return createQuizChoices(screenSize.width, screenSize.height).map((choice, index) => ({
      ...choice,
      text: questionChoices[index] || choice.text
    }));
  };

  // Cleanup MediaPipe
  const cleanupMediaPipe = useCallback(() => {
    try {
      if (cameraInstanceRef.current && cameraInstanceRef.current.stop) {
        cameraInstanceRef.current.stop();
        cameraInstanceRef.current = null;
      }
      if (handsInstanceRef.current && handsInstanceRef.current.close) {
        handsInstanceRef.current.close();
        handsInstanceRef.current = null;
      }
    } catch (error) {
      console.log('Error during MediaPipe cleanup:', error);
    }
  }, []);

  // Initialize MediaPipe
  useEffect(() => {
    if (!handTrackingEnabled || !cameraStream) return;

    let isMounted = true;

    const initializeHandTracking = async () => {
      try {
        setIsLoading(true);
        setLoadingError(null);

        cleanupMediaPipe();
        await loadMediaPipeScript();
        
        if (!isMounted) return;

        await new Promise(resolve => setTimeout(resolve, 1000));

        if (!window.Hands || !window.Camera) {
          throw new Error('MediaPipe modules not available');
        }

        const hands = new window.Hands({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1635986972/${file}`;
          }
        });

        handsInstanceRef.current = hands;

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5
        });

        hands.onResults(onResults);

        if (videoRef.current && isMounted) {
          const camera = new window.Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && handsInstanceRef.current && isMounted) {
                try {
                  await handsInstanceRef.current.send({ image: videoRef.current });
                } catch (error) {
                  console.log('Error sending frame to MediaPipe:', error);
                }
              }
            },
            width: 1280,
            height: 720
          });

          cameraInstanceRef.current = camera;
          await camera.start();
          
          if (isMounted) {
            setIsLoading(false);
            setLastHandDetectionTime(Date.now()); // Reset detection timer when camera starts
          }
        } else {
          throw new Error('Video element not available');
        }
      } catch (error: any) {
        console.log('Error initializing hand tracking:', error);
        if (isMounted) {
          setLoadingError(error.message || 'Failed to initialize hand tracking');
          setIsLoading(false);
          setUseSimpleMode(true);
        }
      }
    };

    initializeHandTracking();

    return () => {
      isMounted = false;
      cleanupMediaPipe();
    };
  }, [handTrackingEnabled, cameraStream, cleanupMediaPipe]);

  // Handle hand tracking results
  const onResults = useCallback((results: HandResults) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const indexTip = landmarks[8];
      
      // Flip the x coordinate for mirror effect
      const screenX = (1 - indexTip.x) * screenSize.width;
      const screenY = indexTip.y * screenSize.height;
      
      setHandPosition({ x: screenX, y: screenY });
      setLastHandDetectionTime(Date.now()); // Update last detection time
      setHandDetectionWarning(false); // Clear warning when hand is detected

      // Check if hand is hovering over a choice
      let hovering = null;
      const currentChoices = getCurrentChoices();
      for (const choice of currentChoices) {
        if (isPointInChoice(screenX, screenY, choice)) {
          hovering = choice.id;
          break;
        }
      }
      setGameState(prev => ({ ...prev, hoveredChoice: hovering }));
    } else {
      setHandPosition(null);
      setGameState(prev => ({ ...prev, hoveredChoice: null }));
      // Don't update lastHandDetectionTime when no hand is detected
    }
  }, [screenSize, gameState.currentQuestion]);

  // Handle choice selection
  const handleChoiceSelect = (choiceId: string, isAutoSelected: boolean = false) => {
    if (gameState.selectedChoice || gameState.showResult) return;

    // For multiplayer, use the callback
    if (isMultiplayer && onAnswerSelect) {
      onAnswerSelect(choiceId);
      // Also update local state to show selection
      setGameState(prev => ({
        ...prev,
        selectedChoice: choiceId,
        isTimerActive: false
      }));
      return;
    }

    // Solo mode logic
    const correct = choiceId === activeQuestions[gameState.currentQuestion].correctAnswer;
    
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
      if (gameState.currentQuestion < activeQuestions.length - 1) {
        setGameState(prev => ({
          ...prev,
          currentQuestion: prev.currentQuestion + 1,
          selectedChoice: null,
          showResult: false,
          isCorrect: null,
          hoveredChoice: null
        }));
        resetTimer();
      } else {
        // Game finished
        setGameState(prev => ({ ...prev, gamePhase: 'gameOver' }));
      }
    }, resultDelay);
  };

  // Reset game
  const resetGame = () => {
    setGameState({
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
    });
    setLastHandDetectionTime(Date.now()); // Reset detection timer
    setHandDetectionWarning(false);
    resetTimer();
  };

  // Setup video stream
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (handDetectionTimerRef.current) {
        clearTimeout(handDetectionTimerRef.current);
      }
    };
  }, []);

  if (!handTrackingEnabled || !cameraStream) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <Camera className="w-16 h-16 text-gray-400 mb-4" />
        <p className="text-gray-600 mb-4">Camera access required for hand tracking</p>
        <button
          onClick={onBackToPermission}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Enable Camera
        </button>
      </div>
    );
  }

  const currentQuiz = activeQuestions[gameState.currentQuestion];
  const currentChoices = getCurrentChoices();

  // Game Over Screen (only for solo mode)
  if (gameState.gamePhase === 'gameOver' && !isMultiplayer) {
    const stats = calculateGameStats(gameState.score, activeQuestions.length);
    return (
      <div 
        ref={containerRef}
        className="relative w-full h-screen bg-black overflow-hidden"
      >
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
          autoPlay
          playsInline
          muted
        />
        <GameOverScreen
          stats={stats}
          onTryAgain={resetGame}
          onBackToMenu={onBackToPermission}
          isUsingAI={isUsingAI}
        />
      </div>
    );
  }

  // Main Game Screen
  return (
    <div 
      ref={containerRef}
      className="relative w-full h-screen bg-black overflow-hidden"
    >
      {/* Video Background - Flipped horizontally */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
        autoPlay
        playsInline
        muted
      />

      {/* Hand Tracking Canvas */}
      <HandTrackingCanvas
        screenSize={screenSize}
        handPosition={handPosition}
        hoveredChoice={gameState.hoveredChoice}
        isLoading={isLoading}
        loadingError={loadingError}
        useSimpleMode={useSimpleMode}
        onHandResults={onResults}
      />

      {/* Hand Detection Warning (only for solo mode) */}
      {handDetectionWarning && !useSimpleMode && gameState.gamePhase === 'playing' && !isMultiplayer && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40">
          <div className="bg-red-600/95 rounded-xl p-8 text-white text-center backdrop-blur-md border border-red-400/30 animate-pulse">
            <div className="text-6xl mb-4">🚨</div>
            <h3 className="text-3xl font-bold mb-4">Không phát hiện tay!</h3>
            <div className="text-5xl font-bold mb-4 text-yellow-300">
              {handDetectionCountdown}
            </div>
            <p className="text-xl text-red-100">
              Hãy đưa tay vào khung hình hoặc game sẽ kết thúc!
            </p>
          </div>
        </div>
      )}

      {/* AI Mode Indicator (only for solo mode) */}
      {isUsingAI && !isMultiplayer && (
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-gradient-to-r from-purple-500/90 to-pink-500/90 rounded-full px-4 py-2 text-white text-sm font-bold flex items-center gap-2 backdrop-blur-md border border-purple-400/30">
            <span>🤖</span>
            <span>AI Generated Questions</span>
            <span>✨</span>
          </div>
        </div>
      )}

      {/* Game UI */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Header - Hide in multiplayer mode */}
        {!isMultiplayer && (
          <GameHeader
            score={gameState.score}
            totalQuestions={activeQuestions.length}
            currentQuestion={gameState.currentQuestion}
            onToggleFullScreen={toggleFullScreen}
            onBackToMenu={onBackToPermission}
          />
        )}

        {/* Timer - Hide in multiplayer mode */}
        {!isMultiplayer && (
          <GameTimer
            timeLeft={gameState.timeLeft}
            totalTime={QUESTION_TIME_LIMIT}
            isActive={gameState.isTimerActive}
            lastHoveredChoice={gameState.lastHoveredChoice}
          />
        )}

        {/* Question */}
        <QuestionDisplay
          question={currentQuiz}
          currentQuestion={gameState.currentQuestion}
          totalQuestions={activeQuestions.length}
        />

        {/* Answer Choices */}
        <AnswerChoices
          choices={currentChoices}
          selectedChoice={gameState.selectedChoice}
          hoveredChoice={gameState.hoveredChoice}
          lastHoveredChoice={gameState.lastHoveredChoice}
          isCorrect={gameState.isCorrect}
          timeLeft={gameState.timeLeft}
          onChoiceSelect={handleChoiceSelect}
        />

        {/* Notifications (only for solo mode) */}
        {!isMultiplayer && (
          <GameNotifications
            showResult={gameState.showResult}
            isCorrect={gameState.isCorrect}
            timeLeft={gameState.timeLeft}
            selectedChoice={gameState.selectedChoice}
            lastHoveredChoice={gameState.lastHoveredChoice}
            correctAnswer={currentQuiz.correctAnswer}
          />
        )}

        {/* Instructions - Hide in multiplayer mode */}
        {!isMultiplayer && (
          <GameInstructions
            useSimpleMode={useSimpleMode}
            timeLimit={QUESTION_TIME_LIMIT}
          />
        )}
      </div>
    </div>
  );
};

export default GameScreen;