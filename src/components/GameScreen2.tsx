// components/GameScreen.tsx
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
  QUESTION_TIME_LIMIT 
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
}

const GameScreen: React.FC<GameScreenProps> = ({ 
  handTrackingEnabled, 
  cameraStream, 
  onBackToPermission 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const handsInstanceRef = useRef<any>(null);
  const cameraInstanceRef = useRef<any>(null);
  
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
  
  // Game state
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
    gamePhase: 'playing'
  });

  // Handle screen resize
  useEffect(() => {
    const handleResize = () => {
      setScreenSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Timer logic
  useEffect(() => {
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
  }, [gameState.isTimerActive, gameState.timeLeft, gameState.selectedChoice, gameState.showResult]);

  // Start timer when question changes
  useEffect(() => {
    if (!gameState.showResult && gameState.selectedChoice === null && gameState.gamePhase === 'playing') {
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

  // Handle time up
  const handleTimeUp = () => {
    const choiceToSelect = gameState.lastHoveredChoice || 'a';
    handleChoiceSelect(choiceToSelect, true);
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
    const baseChoices = ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Cần Thơ'];
    const questionChoices = QUIZ_QUESTIONS[gameState.currentQuestion]?.choices || baseChoices;
    
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
      const screenX = indexTip.x * screenSize.width;
      const screenY = indexTip.y * screenSize.height;
      
      setHandPosition({ x: screenX, y: screenY });

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
    }
  }, [screenSize, gameState.currentQuestion]);

  // Handle choice selection
  const handleChoiceSelect = (choiceId: string, isAutoSelected: boolean = false) => {
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

  const currentQuiz = QUIZ_QUESTIONS[gameState.currentQuestion];
  const currentChoices = getCurrentChoices();

  // Game Over Screen
  if (gameState.gamePhase === 'gameOver') {
    const stats = calculateGameStats(gameState.score, QUIZ_QUESTIONS.length);
    return (
      <div 
        ref={containerRef}
        className="relative w-full h-screen bg-black overflow-hidden"
      >
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />
        <GameOverScreen
          stats={stats}
          onTryAgain={resetGame}
          onBackToMenu={onBackToPermission}
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
      {/* Video Background */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
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

      {/* Game UI */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Header */}
        <GameHeader
          score={gameState.score}
          totalQuestions={QUIZ_QUESTIONS.length}
          currentQuestion={gameState.currentQuestion}
          onToggleFullScreen={toggleFullScreen}
          onBackToMenu={onBackToPermission}
        />

        {/* Timer */}
        <GameTimer
          timeLeft={gameState.timeLeft}
          totalTime={QUESTION_TIME_LIMIT}
          isActive={gameState.isTimerActive}
          lastHoveredChoice={gameState.lastHoveredChoice}
        />

        {/* Question */}
        <QuestionDisplay
          question={currentQuiz}
          currentQuestion={gameState.currentQuestion}
          totalQuestions={QUIZ_QUESTIONS.length}
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

        {/* Notifications */}
        <GameNotifications
          showResult={gameState.showResult}
          isCorrect={gameState.isCorrect}
          timeLeft={gameState.timeLeft}
          selectedChoice={gameState.selectedChoice}
          lastHoveredChoice={gameState.lastHoveredChoice}
          correctAnswer={currentQuiz.correctAnswer}
        />

        {/* Instructions */}
        <GameInstructions
          useSimpleMode={useSimpleMode}
          timeLimit={QUESTION_TIME_LIMIT}
        />
      </div>
    </div>
  );
};

export default GameScreen;