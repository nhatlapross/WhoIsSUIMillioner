import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, Hand, Target, CheckCircle, AlertCircle, Play, Maximize, Clock } from 'lucide-react';

// Types
interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

interface HandResults {
  multiHandLandmarks: HandLandmark[][];
  multiHandedness: Array<{ label: string; score: number }>;
}

interface QuizChoice {
  id: string;
  letter: string;
  text: string;
  position: { x: number; y: number; width: number; height: number };
}

interface GameScreenProps {
  handTrackingEnabled: boolean;
  cameraStream: MediaStream | undefined;
  onBackToPermission: () => void;
}

// Quiz choices configuration (positioned for full screen overlay)
const createQuizChoices = (screenWidth: number, screenHeight: number): QuizChoice[] => [
  { 
    id: 'a', 
    letter: 'A', 
    text: 'Hà Nội', 
    position: { 
      x: screenWidth * 0.1, 
      y: screenHeight * 0.3, 
      width: screenWidth * 0.35, 
      height: screenHeight * 0.15 
    } 
  },
  { 
    id: 'b', 
    letter: 'B', 
    text: 'Hồ Chí Minh', 
    position: { 
      x: screenWidth * 0.55, 
      y: screenHeight * 0.3, 
      width: screenWidth * 0.35, 
      height: screenHeight * 0.15 
    } 
  },
  { 
    id: 'c', 
    letter: 'C', 
    text: 'Đà Nẵng', 
    position: { 
      x: screenWidth * 0.1, 
      y: screenHeight * 0.55, 
      width: screenWidth * 0.35, 
      height: screenHeight * 0.15 
    } 
  },
  { 
    id: 'd', 
    letter: 'D', 
    text: 'Cần Thơ', 
    position: { 
      x: screenWidth * 0.55, 
      y: screenHeight * 0.55, 
      width: screenWidth * 0.35, 
      height: screenHeight * 0.15 
    } 
  }
];

// Sample quiz questions
const QUIZ_QUESTIONS = [
  {
    question: "Thủ đô của Việt Nam là gì?",
    correctAnswer: 'a'
  },
  {
    question: "Thành phố nào có biệt danh 'Thành phố Hoa phượng đỏ'?",
    choices: ['Hà Nội', 'Huế', 'Hải Phòng', 'Đà Nẵng'],
    correctAnswer: 'd'
  },
  {
    question: "Sông nào dài nhất Việt Nam?",
    choices: ['Sông Hồng', 'Sông Mekong', 'Sông Đồng Nai', 'Sông Hương'],
    correctAnswer: 'b'
  }
];

// Timer configuration
const QUESTION_TIME_LIMIT = 15; // seconds

// Improved MediaPipe script loading utility
const loadMediaPipeScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.Hands && window.Camera) {
      resolve();
      return;
    }

    // Clear any existing scripts first
    const existingScripts = document.querySelectorAll('script[src*="mediapipe"]');
    existingScripts.forEach(script => script.remove());

    // Multiple CDN options
    const cdnOptions = [
      // Option 1: JSDelivr with specific version
      {
        hands: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1635986972/hands.js',
        camera: 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1620248257/camera_utils.js'
      },
      // Option 2: JSDelivr latest
      {
        hands: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js',
        camera: 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'
      },
      // Option 3: UNPKG
      {
        hands: 'https://unpkg.com/@mediapipe/hands@0.4.1635986972/hands.js',
        camera: 'https://unpkg.com/@mediapipe/camera_utils@0.3.1620248257/camera_utils.js'
      }
    ];

    let currentCdnIndex = 0;

    const tryLoadCdn = () => {
      if (currentCdnIndex >= cdnOptions.length) {
        // All CDNs failed, fall back to simple mode
        console.warn('All MediaPipe CDNs failed, falling back to simple mode');
        reject(new Error('All MediaPipe CDN sources failed'));
        return;
      }

      const currentCdn = cdnOptions[currentCdnIndex];
      console.log(`Trying CDN option ${currentCdnIndex + 1}:`, currentCdn);

      // Load Hands first
      const handsScript = document.createElement('script');
      handsScript.src = currentCdn.hands;
      handsScript.crossOrigin = 'anonymous';
      
      handsScript.onload = () => {
        console.log('Hands script loaded successfully');
        
        // Then load Camera Utils
        const cameraScript = document.createElement('script');
        cameraScript.src = currentCdn.camera;
        cameraScript.crossOrigin = 'anonymous';
        
        cameraScript.onload = () => {
          console.log('Camera script loaded successfully');
          
          // Wait for scripts to fully initialize
          setTimeout(() => {
            if (window.Hands && window.Camera) {
              console.log('MediaPipe modules available');
              resolve();
            } else {
              console.warn('MediaPipe modules not available after loading');
              // Try next CDN
              currentCdnIndex++;
              tryLoadCdn();
            }
          }, 1000);
        };
        
        cameraScript.onerror = (error) => {
          console.log(`Failed to load camera utils from CDN ${currentCdnIndex + 1}:`, error);
          cameraScript.remove();
          handsScript.remove();
          // Try next CDN
          currentCdnIndex++;
          tryLoadCdn();
        };
        
        document.head.appendChild(cameraScript);
      };
      
      handsScript.onerror = (error) => {
        console.log(`Failed to load hands from CDN ${currentCdnIndex + 1}:`, error);
        handsScript.remove();
        // Try next CDN
        currentCdnIndex++;
        tryLoadCdn();
      };
      
      document.head.appendChild(handsScript);
    };

    // Start trying CDNs
    tryLoadCdn();
  });
};

// Hand gesture detection utilities
const calculateDistance = (point1: HandLandmark, point2: HandLandmark): number => {
  const dx = point1.x - point2.x;
  const dy = point1.y - point2.y;
  const dz = point1.z - point2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

const detectPinchGesture = (landmarks: HandLandmark[]): boolean => {
  if (!landmarks || landmarks.length < 21) return false;

  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const distance = calculateDistance(indexTip, middleTip);
  
  return distance < 0.02;
};

const isPointInChoice = (x: number, y: number, choice: QuizChoice): boolean => {
  return (
    x >= choice.position.x &&
    x <= choice.position.x + choice.position.width &&
    y >= choice.position.y &&
    y <= choice.position.y + choice.position.height
  );
};

// Main GameScreen Component
const GameScreen: React.FC<GameScreenProps> = ({ 
  handTrackingEnabled, 
  cameraStream, 
  onBackToPermission 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const handsInstanceRef = useRef<any>(null);
  const cameraInstanceRef = useRef<any>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [hoveredChoice, setHoveredChoice] = useState<string | null>(null);
  const [isPinching, setIsPinching] = useState(false);
  const [lastPinchState, setLastPinchState] = useState(false);
  const [handPosition, setHandPosition] = useState<{ x: number; y: number } | null>(null);
  const [useSimpleMode, setUseSimpleMode] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [screenSize, setScreenSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // Timer states
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [lastHoveredChoice, setLastHoveredChoice] = useState<string | null>(null);

  // Handle screen resize
  useEffect(() => {
    const handleResize = () => {
      setScreenSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Timer effect
  useEffect(() => {
    if (isTimerActive && timeLeft > 0 && !selectedChoice && !showResult) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !selectedChoice && !showResult) {
      // Time's up - auto select based on last hovered choice or random
      handleTimeUp();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isTimerActive, timeLeft, selectedChoice, showResult]);

  // Start timer when question changes
  useEffect(() => {
    if (!showResult && selectedChoice === null) {
      setTimeLeft(QUESTION_TIME_LIMIT);
      setIsTimerActive(true);
      setLastHoveredChoice(null);
    }
  }, [currentQuestion, showResult, selectedChoice]);

  // Update last hovered choice when hand hovers over options
  useEffect(() => {
    if (hoveredChoice && !selectedChoice) {
      setLastHoveredChoice(hoveredChoice);
    }
  }, [hoveredChoice, selectedChoice]);

  // Handle time up
  const handleTimeUp = () => {
    setIsTimerActive(false);
    
    // Auto-select based on last hovered choice or default to 'a'
    const choiceToSelect = lastHoveredChoice || 'a';
    handleChoiceSelect(choiceToSelect, true); // true indicates auto-selection
  };

  // Reset timer
  const resetTimer = () => {
    setTimeLeft(QUESTION_TIME_LIMIT);
    setIsTimerActive(false);
    setLastHoveredChoice(null);
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
    const questionChoices = QUIZ_QUESTIONS[currentQuestion]?.choices || baseChoices;
    
    return createQuizChoices(screenSize.width, screenSize.height).map((choice, index) => ({
      ...choice,
      text: questionChoices[index] || choice.text
    }));
  };

  // Cleanup function
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

  // Initialize MediaPipe Hands with better error handling
  useEffect(() => {
    if (!handTrackingEnabled || !cameraStream) return;

    let isMounted = true;

    const initializeHandTracking = async () => {
      try {
        setIsLoading(true);
        setLoadingError(null);

        // Cleanup any existing instances
        cleanupMediaPipe();

        // Load MediaPipe scripts
        await loadMediaPipeScript();
        
        if (!isMounted) return;

        // Wait for scripts to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (!window.Hands || !window.Camera) {
          throw new Error('MediaPipe modules not available');
        }

        // Initialize Hands
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

        // Initialize Camera
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
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      
      // Convert normalized coordinates to screen coordinates
      const indexTip = landmarks[8];
      const screenX = indexTip.x * screenSize.width;
      const screenY = indexTip.y * screenSize.height;
      
      setHandPosition({ x: screenX, y: screenY });

      // Detect pinch gesture
      const pinchDetected = detectPinchGesture(landmarks);
      setIsPinching(pinchDetected);

      // Check for pinch click (transition from not pinching to pinching)
      if (pinchDetected && !lastPinchState) {
        handlePinchClick(screenX, screenY);
      }
      setLastPinchState(pinchDetected);

      // Check if hand is hovering over a choice
      let hovering = null;
      const currentChoices = getCurrentChoices();
      for (const choice of currentChoices) {
        if (isPointInChoice(screenX, screenY, choice)) {
          hovering = choice.id;
          break;
        }
      }
      setHoveredChoice(hovering);

      // Draw hand landmarks on canvas
      const canvasX = indexTip.x * canvas.width;
      const canvasY = indexTip.y * canvas.height;

      // Draw all landmarks
      ctx.fillStyle = isPinching ? '#FF0000' : '#00FF00';
      landmarks.forEach((landmark, index) => {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, index === 8 || index === 12 ? 8 : 4, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Highlight index and middle finger tips
      ctx.fillStyle = '#FF00FF';
      const indexTipCanvas = { x: landmarks[8].x * canvas.width, y: landmarks[8].y * canvas.height };
      const middleTipCanvas = { x: landmarks[12].x * canvas.width, y: landmarks[12].y * canvas.height };
      
      ctx.beginPath();
      ctx.arc(indexTipCanvas.x, indexTipCanvas.y, 10, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(middleTipCanvas.x, middleTipCanvas.y, 10, 0, 2 * Math.PI);
      ctx.fill();

      // Draw line between fingers when pinching
      if (pinchDetected) {
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(indexTipCanvas.x, indexTipCanvas.y);
        ctx.lineTo(middleTipCanvas.x, middleTipCanvas.y);
        ctx.stroke();
      }

      // Draw hand connections
      ctx.strokeStyle = isPinching ? '#FF0000' : '#00FF00';
      ctx.lineWidth = 3;
      drawHandConnections(ctx, landmarks, canvas.width, canvas.height);

      // Draw cursor at finger tip
      ctx.fillStyle = isPinching ? '#FF0000' : '#00FF00';
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 15, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.stroke();

    } else {
      setHandPosition(null);
      setIsPinching(false);
      setHoveredChoice(null);
    }
  }, [currentQuestion, lastPinchState, screenSize]);

  // Handle pinch click
  const handlePinchClick = (x: number, y: number) => {
    if (selectedChoice || showResult) return;

    const currentChoices = getCurrentChoices();
    for (const choice of currentChoices) {
      if (isPointInChoice(x, y, choice)) {
        handleChoiceSelect(choice.id);
        break;
      }
    }
  };

  // Draw hand connections
  const drawHandConnections = (
    ctx: CanvasRenderingContext2D, 
    landmarks: HandLandmark[], 
    width: number, 
    height: number
  ) => {
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [5, 9], [9, 10], [10, 11], [11, 12], // Middle
      [9, 13], [13, 14], [14, 15], [15, 16], // Ring
      [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [0, 17] // Palm
    ];

    connections.forEach(([start, end]) => {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];
      
      ctx.beginPath();
      ctx.moveTo(startPoint.x * width, startPoint.y * height);
      ctx.lineTo(endPoint.x * width, endPoint.y * height);
      ctx.stroke();
    });
  };

  // Handle choice selection
  const handleChoiceSelect = (choiceId: string, isAutoSelected: boolean = false) => {
    if (selectedChoice || showResult) return;

    setIsTimerActive(false);
    setSelectedChoice(choiceId);
    const correct = choiceId === QUIZ_QUESTIONS[currentQuestion].correctAnswer;
    setIsCorrect(correct);
    
    if (correct) {
      setScore(score + 1);
    }
    
    setShowResult(true);
    
    // Show result message
    const resultDelay = isAutoSelected ? 3000 : 2500; // Longer delay for auto-selected answers
    
    // Move to next question after delay
    setTimeout(() => {
      if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedChoice(null);
        setShowResult(false);
        setIsCorrect(null);
        resetTimer();
      } else {
        // Quiz finished
        setShowResult(true);
      }
    }, resultDelay);
  };

  // Reset quiz
  const resetQuiz = () => {
    setCurrentQuestion(0);
    setSelectedChoice(null);
    setShowResult(false);
    setIsCorrect(null);
    setScore(0);
    resetTimer();
  };

  // Setup video stream
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  // Cleanup timer on unmount
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

  const currentQuiz = QUIZ_QUESTIONS[currentQuestion];
  const isQuizFinished = currentQuestion >= QUIZ_QUESTIONS.length;
  const currentChoices = getCurrentChoices();

  // Calculate timer progress percentage
  const timerProgress = ((QUESTION_TIME_LIMIT - timeLeft) / QUESTION_TIME_LIMIT) * 100;
  
  // Determine timer color based on time left
  const getTimerColor = () => {
    if (timeLeft <= 3) return 'text-red-500';
    if (timeLeft <= 7) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-screen bg-black overflow-hidden"
    >
      {/* Full Screen Video Background */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        playsInline
        muted
      />

      {/* Hand Tracking Canvas Overlay */}
      {!useSimpleMode && (
        <canvas
          ref={canvasRef}
          width={screenSize.width}
          height={screenSize.height}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      )}

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center justify-between text-white">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Hand className="w-8 h-8" />
              Hand Gesture Quiz
            </h1>
            <div className="flex items-center gap-6">
              <div className="text-xl font-semibold">
                Score: {score}/{QUIZ_QUESTIONS.length}
              </div>
              <button
                onClick={toggleFullScreen}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 pointer-events-auto"
              >
                <Maximize className="w-6 h-6" />
              </button>
              <button
                onClick={onBackToPermission}
                className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 pointer-events-auto"
              >
                Back
              </button>
            </div>
          </div>
        </div>

        {/* Timer Display */}
        {!isQuizFinished && !showResult && (
          <div className="absolute top-24 right-6">
            <div className="bg-black/80 rounded-xl p-4 text-white">
              <div className="flex items-center gap-3 mb-2">
                <Clock className={`w-6 h-6 ${getTimerColor()}`} />
                <span className={`text-2xl font-bold font-mono ${getTimerColor()}`}>
                  {timeLeft}s
                </span>
              </div>
              
              {/* Timer Progress Bar */}
              <div className="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 rounded-full ${
                    timeLeft <= 3 ? 'bg-red-500' :
                    timeLeft <= 7 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${timerProgress}%` }}
                />
              </div>
              
              {/* Last hovered indicator */}
              {lastHoveredChoice && timeLeft <= 5 && (
                <div className="mt-2 text-xs text-orange-300">
                  Auto-select: {lastHoveredChoice.toUpperCase()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading/Error States */}
        {isLoading && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="p-6 bg-black/80 rounded-lg text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
              <span className="text-xl">Loading hand tracking...</span>
            </div>
          </div>
        )}

        {loadingError && (
          <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="p-6 bg-red-600/90 rounded-lg text-white text-center max-w-md">
              <AlertCircle className="w-8 h-8 mx-auto mb-4" />
              <p className="text-lg font-semibold mb-2">Error: {loadingError}</p>
              <p className="text-sm">Falling back to simple click mode.</p>
            </div>
          </div>
        )}

        {/* Status Display */}
        {!useSimpleMode && (
          <div className="absolute top-24 left-6 text-white">
            <div className="flex items-center gap-4 mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full ${isPinching ? 'bg-red-500' : 'bg-green-500'}`}></div>
                <span className="text-lg font-semibold">
                  {isPinching ? 'Pinching' : 'Open'}
                </span>
              </div>
              {hoveredChoice && (
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange-400" />
                  <span className="text-lg">
                    Hovering: {hoveredChoice.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quiz Finished */}
        {isQuizFinished ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center text-white">
              <h2 className="text-5xl font-bold mb-6">Quiz Completed! 🎉</h2>
              <p className="text-3xl mb-8">Final Score: {score}/{QUIZ_QUESTIONS.length}</p>
              <button
                onClick={resetQuiz}
                className="px-8 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 mx-auto text-xl pointer-events-auto"
              >
                <Play className="w-6 h-6" />
                Play Again
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Question Display */}
            <div className="absolute top-1/6 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl px-6">
              <div className="bg-black/80 rounded-xl p-6 text-white text-center">
                <div className="flex items-center justify-center mb-4">
                  <h2 className="text-2xl font-bold mr-4">
                    Question {currentQuestion + 1}/{QUIZ_QUESTIONS.length}
                  </h2>
                  <div className="flex-1 bg-white/20 rounded-full h-3">
                    <div 
                      className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${((currentQuestion + 1) / QUIZ_QUESTIONS.length) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <p className="text-xl">{currentQuiz.question}</p>
              </div>
            </div>

            {/* Answer Choices Overlay */}
            {currentChoices.map((choice) => (
              <div
                key={choice.id}
                className={`
                  absolute transition-all duration-200 pointer-events-auto cursor-pointer
                  ${hoveredChoice === choice.id ? 'scale-110' : 'scale-100'}
                  ${lastHoveredChoice === choice.id && timeLeft <= 5 ? 'animate-pulse' : ''}
                `}
                style={{
                  left: `${choice.position.x}px`,
                  top: `${choice.position.y}px`,
                  width: `${choice.position.width}px`,
                  height: `${choice.position.height}px`,
                }}
                onClick={() => handleChoiceSelect(choice.id)}
              >
                <div className={`
                  w-full h-full rounded-xl border-4 flex items-center gap-4 px-6 transition-all duration-200
                  ${hoveredChoice === choice.id ? 
                    'border-orange-400 bg-orange-500/30 shadow-2xl' : 
                    'border-white/50 bg-black/60'
                  }
                  ${selectedChoice === choice.id ? 
                    (isCorrect ? 'border-green-400 bg-green-500/50' : 'border-red-400 bg-red-500/50') 
                    : ''}
                  ${lastHoveredChoice === choice.id && timeLeft <= 5 ? 
                    'border-yellow-400 bg-yellow-500/20' : ''}
                `}>
                  <div className={`
                    w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl text-white
                    ${selectedChoice === choice.id ? 
                      (isCorrect ? 'bg-green-500' : 'bg-red-500') 
                      : 'bg-blue-500'}
                  `}>
                    {choice.letter}
                  </div>
                  <span className="text-2xl font-medium text-white flex-1">{choice.text}</span>
                  
                  {hoveredChoice === choice.id && !selectedChoice && (
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                      <Target className="w-5 h-5 text-white" />
                    </div>
                  )}
                  
                  {selectedChoice === choice.id && (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isCorrect ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                  )}
                  
                  {lastHoveredChoice === choice.id && timeLeft <= 5 && timeLeft > 0 && !selectedChoice && (
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center animate-pulse">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Result Display */}
            {showResult && isCorrect !== null && (
              <div className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 translate-y-1/2">
                <div className={`
                  p-6 rounded-xl text-white text-center text-3xl font-bold
                  ${isCorrect ? 'bg-green-600/90' : 'bg-red-600/90'}
                `}>
                  {isCorrect ? (
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-10 h-10" />
                      <span>Chính xác!</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-10 h-10" />
                        <span>Sai rồi!</span>
                      </div>
                      <div className="text-lg">
                        Đáp án đúng: {QUIZ_QUESTIONS[currentQuestion].correctAnswer.toUpperCase()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Time Up Warning */}
            {timeLeft <= 3 && timeLeft > 0 && !selectedChoice && !showResult && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="bg-red-600/90 rounded-xl p-6 text-white text-center animate-pulse">
                  <Clock className="w-12 h-12 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">Thời gian sắp hết!</h3>
                  <p className="text-lg">
                    {lastHoveredChoice ? 
                      `Sẽ tự động chọn: ${lastHoveredChoice.toUpperCase()}` : 
                      'Hãy chỉ vào một đáp án!'
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Auto-select notification */}
            {timeLeft === 0 && !selectedChoice && !showResult && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="bg-yellow-600/90 rounded-xl p-6 text-white text-center">
                  <Clock className="w-12 h-12 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">Hết giờ!</h3>
                  <p className="text-lg">
                    Tự động chọn: {(lastHoveredChoice || 'A').toUpperCase()}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Instructions */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-white text-center">
          <div className="bg-black/60 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">Cách chơi:</h3>
            <div className="text-sm space-y-1">
              {useSimpleMode ? (
                <p>• Nhấp vào đáp án của bạn</p>
              ) : (
                <>
                  <p>• Chỉ ngón tay trỏ vào đáp án</p>
                  <p>• Véo (chạm ngón trỏ với ngón giữa) để chọn ngay</p>
                  <p>• Màu cam hiển thị vị trí bạn đang chỉ</p>
                  <p>• Có {QUESTION_TIME_LIMIT} giây cho mỗi câu hỏi</p>
                  <p>• Tự động chọn đáp án cuối cùng bạn chỉ vào khi hết giờ</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* MediaPipe Status (for debugging) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute bottom-32 left-6 text-white text-xs">
            <div className="bg-black/60 rounded p-2">
              <div>MediaPipe Status:</div>
              <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
              <div>Error: {loadingError || 'None'}</div>
              <div>Simple Mode: {useSimpleMode ? 'Yes' : 'No'}</div>
              <div>Hand Position: {handPosition ? `${Math.round(handPosition.x)}, ${Math.round(handPosition.y)}` : 'None'}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Extend window interface for TypeScript
declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}

export default GameScreen;