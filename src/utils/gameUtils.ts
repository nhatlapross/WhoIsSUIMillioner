// utils/gameUtils.ts
import { QuizChoice, GameStats, HandLandmark, MILLIONAIRE_PRIZE_LEVELS, MILLIONAIRE_MILESTONES, SAFE_HAVEN_AMOUNTS } from '@/types/game';

// Create quiz choices with dynamic positioning optimized for mobile landscape
export const createQuizChoices = (screenWidth: number, screenHeight: number, isMobileLandscape: boolean = false): QuizChoice[] => {
  if (isMobileLandscape) {
    // Optimized for mobile landscape - positions choices for easy hand pointing
    const margin = 15;
    const choiceWidth = Math.min(180, (screenWidth - margin * 5) / 2);
    const choiceHeight = Math.min(50, (screenHeight - margin * 3) / 2);
    
    return [
      { 
        id: 'a', 
        letter: 'A', 
        text: 'Option A', 
        position: { 
          x: margin, 
          y: margin, 
          width: choiceWidth, 
          height: choiceHeight 
        } 
      },
      { 
        id: 'b', 
        letter: 'B', 
        text: 'Option B', 
        position: { 
          x: screenWidth - choiceWidth - margin, 
          y: margin, 
          width: choiceWidth, 
          height: choiceHeight 
        } 
      },
      { 
        id: 'c', 
        letter: 'C', 
        text: 'Option C', 
        position: { 
          x: margin, 
          y: screenHeight - choiceHeight - margin, 
          width: choiceWidth, 
          height: choiceHeight 
        } 
      },
      { 
        id: 'd', 
        letter: 'D', 
        text: 'Option D', 
        position: { 
          x: screenWidth - choiceWidth - margin, 
          y: screenHeight - choiceHeight - margin, 
          width: choiceWidth, 
          height: choiceHeight 
        } 
      }
    ];
  }
  
  // Default desktop/tablet layout
  return [
    { 
      id: 'a', 
      letter: 'A', 
      text: 'Option A', 
      position: { 
        x: screenWidth * 0.1, 
        y: screenHeight * 0.4, 
        width: screenWidth * 0.35, 
        height: screenHeight * 0.15 
      } 
    },
    { 
      id: 'b', 
      letter: 'B', 
      text: 'Option B', 
      position: { 
        x: screenWidth * 0.55, 
        y: screenHeight * 0.4, 
        width: screenWidth * 0.35, 
        height: screenHeight * 0.15 
      } 
    },
    { 
      id: 'c', 
      letter: 'C', 
      text: 'Option C', 
      position: { 
        x: screenWidth * 0.1, 
        y: screenHeight * 0.6, 
        width: screenWidth * 0.35, 
        height: screenHeight * 0.15 
      } 
    },
    { 
      id: 'd', 
      letter: 'D', 
      text: 'Option D', 
      position: { 
        x: screenWidth * 0.55, 
        y: screenHeight * 0.6, 
        width: screenWidth * 0.35, 
        height: screenHeight * 0.15 
      } 
    }
  ];
};

// Check if point is within choice bounds
export const isPointInChoice = (x: number, y: number, choice: QuizChoice): boolean => {
  return (
    x >= choice.position.x &&
    x <= choice.position.x + choice.position.width &&
    y >= choice.position.y &&
    y <= choice.position.y + choice.position.height
  );
};

// Calculate millionaire game statistics
export const calculateGameStats = (
  score: number, 
  totalQuestions: number = 15, 
  timeBonus: number = 0
): GameStats => {
  const accuracy = Math.round((score / totalQuestions) * 100);
  const questionReached = score + 1; // Questions are 1-indexed
  const isMillionaire = score === 15; // Answered all 15 questions correctly
  
  // Calculate prize won and safe haven based on millionaire rules
  let prizeWon = 0;
  let safeHavenAmount = 0;
  
  if (score > 0) {
    // Prize is cumulative based on questions answered
    prizeWon = MILLIONAIRE_PRIZE_LEVELS[score - 1] || 0;
    
    // Calculate safe haven amount (guaranteed minimum if player fails after milestone)
    // Safe havens: Question 5 (0.5 SUI), Question 10 (1.0 SUI)
    if (score >= 10) {
      safeHavenAmount = SAFE_HAVEN_AMOUNTS[1]; // 1.0 SUI
    } else if (score >= 5) {
      safeHavenAmount = SAFE_HAVEN_AMOUNTS[0]; // 0.5 SUI
    }
    
    // If player failed after reaching a safe haven, they get the safe haven amount
    // This logic would be handled in the smart contract, but we show it here for UI
    if (score < 15 && safeHavenAmount > 0) {
      // Player keeps the safe haven amount as minimum prize
      prizeWon = Math.max(prizeWon, safeHavenAmount);
    }
  }
  
  // Rank based on questions reached, not accuracy
  let rank = 'Contestant';
  if (isMillionaire) rank = 'SUI MASTER! 🏆';
  else if (score >= 10) rank = 'High Roller';
  else if (score >= 5) rank = 'Safe Player';
  else if (score >= 1) rank = 'Getting Started';
  
  const finalScore = prizeWon + timeBonus;

  return {
    score,
    totalQuestions,
    correctAnswers: score,
    timeBonus,
    accuracy,
    finalScore,
    rank,
    prizeWon,
    isMillionaire,
    questionReached,
    safeHavenAmount
  };
};

// MediaPipe script loading utility
export const loadMediaPipeScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof window !== 'undefined' && window.Hands && window.Camera) {
      resolve();
      return;
    }

    // Clear any existing scripts first
    const existingScripts = document.querySelectorAll('script[src*="mediapipe"]');
    existingScripts.forEach(script => script.remove());

    // Multiple CDN options for reliability
    const cdnOptions = [
      {
        hands: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1635986972/hands.js',
        camera: 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1620248257/camera_utils.js'
      },
      {
        hands: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js',
        camera: 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'
      },
      {
        hands: 'https://unpkg.com/@mediapipe/hands@0.4.1635986972/hands.js',
        camera: 'https://unpkg.com/@mediapipe/camera_utils@0.3.1620248257/camera_utils.js'
      }
    ];

    let currentCdnIndex = 0;

    const tryLoadCdn = () => {
      if (currentCdnIndex >= cdnOptions.length) {
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
            if (typeof window !== 'undefined' && window.Hands && window.Camera) {
              console.log('MediaPipe modules available');
              resolve();
            } else {
              console.warn('MediaPipe modules not available after loading');
              currentCdnIndex++;
              tryLoadCdn();
            }
          }, 1000);
        };
        
        cameraScript.onerror = (error) => {
          console.log(`Failed to load camera utils from CDN ${currentCdnIndex + 1}:`, error);
          cameraScript.remove();
          handsScript.remove();
          currentCdnIndex++;
          tryLoadCdn();
        };
        
        document.head.appendChild(cameraScript);
      };
      
      handsScript.onerror = (error) => {
        console.log(`Failed to load hands from CDN ${currentCdnIndex + 1}:`, error);
        handsScript.remove();
        currentCdnIndex++;
        tryLoadCdn();
      };
      
      document.head.appendChild(handsScript);
    };

    tryLoadCdn();
  });
};

// Hand gesture detection utilities
export const calculateDistance = (point1: HandLandmark, point2: HandLandmark): number => {
  const dx = point1.x - point2.x;
  const dy = point1.y - point2.y;
  const dz = point1.z - point2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

// Draw hand connections on canvas
export const drawHandConnections = (
  ctx: CanvasRenderingContext2D, 
  landmarks: HandLandmark[], 
  width: number, 
  height: number,
  color: string = '#00FF00'
) => {
  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8], // Index
    [5, 9], [9, 10], [10, 11], [11, 12], // Middle
    [9, 13], [13, 14], [14, 15], [15, 16], // Ring
    [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
    [0, 17] // Palm
  ];

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;

  connections.forEach(([start, end]) => {
    const startPoint = landmarks[start];
    const endPoint = landmarks[end];
    
    ctx.beginPath();
    ctx.moveTo(startPoint.x * width, startPoint.y * height);
    ctx.lineTo(endPoint.x * width, endPoint.y * height);
    ctx.stroke();
  });
};

// Format score with commas
export const formatScore = (score: number): string => {
  return score.toLocaleString();
};

// Generate reward message based on millionaire performance
export const getRewardMessage = (stats: GameStats): string => {
  if (stats.isMillionaire) {
    return "CONGRATULATIONS! YOU'RE A SUI MASTER! 🎉💰🏆";
  } else if (stats.score >= 10) {
    return `Amazing! You reached the second safe point and won ${stats.prizeWon} SUI! 🌟`;
  } else if (stats.score >= 5) {
    return `Great job! You reached the first safe point and won ${stats.prizeWon} SUI! 🎊`;
  } else if (stats.score >= 1) {
    return `Good start! You won ${stats.prizeWon} SUI! Keep practicing! 💪`;
  } else {
    return "Don't give up! Every SUI master started somewhere! 🚀";
  }
};

// Declare global types for TypeScript
declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}