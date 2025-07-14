// utils/gameUtils.ts
import { QuizChoice, GameStats, HandLandmark } from '@/types/game';

// Create quiz choices with dynamic positioning
export const createQuizChoices = (screenWidth: number, screenHeight: number): QuizChoice[] => [
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

// Check if point is within choice bounds
export const isPointInChoice = (x: number, y: number, choice: QuizChoice): boolean => {
  return (
    x >= choice.position.x &&
    x <= choice.position.x + choice.position.width &&
    y >= choice.position.y &&
    y <= choice.position.y + choice.position.height
  );
};

// Calculate game statistics
export const calculateGameStats = (
  score: number, 
  totalQuestions: number, 
  timeBonus: number = 0
): GameStats => {
  const accuracy = Math.round((score / totalQuestions) * 100);
  const baseScore = score * 100;
  const finalScore = baseScore + timeBonus;
  
  let rank = 'Beginner';
  if (accuracy >= 90) rank = 'Master';
  else if (accuracy >= 75) rank = 'Expert';
  else if (accuracy >= 60) rank = 'Good';
  else if (accuracy >= 40) rank = 'Average';

  return {
    score,
    totalQuestions,
    correctAnswers: score,
    timeBonus,
    accuracy,
    finalScore,
    rank
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

// Generate reward message based on score
export const getRewardMessage = (stats: GameStats): string => {
  if (stats.accuracy >= 90) {
    return "Perfect performance! You're a true quiz master! 🏆";
  } else if (stats.accuracy >= 75) {
    return "Excellent work! Keep up the great performance! 🌟";
  } else if (stats.accuracy >= 60) {
    return "Good job! You're getting better! 👏";
  } else if (stats.accuracy >= 40) {
    return "Not bad! Practice makes perfect! 💪";
  } else {
    return "Keep trying! Every expert was once a beginner! 🚀";
  }
};

// Declare global types for TypeScript
declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}