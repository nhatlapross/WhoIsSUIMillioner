// components/game/HandTrackingCanvas.tsx
import React, { useRef, useEffect, useCallback } from 'react';
import { Target, Hand, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { HandResults, HandLandmark } from '@/types/game';

interface HandTrackingCanvasProps {
  screenSize: { width: number; height: number };
  handPosition: { x: number; y: number } | null;
  hoveredChoice: string | null;
  isLoading: boolean;
  loadingError: string | null;
  useSimpleMode: boolean;
  handResults?: HandResults | null;
  onHandResults?: (results: HandResults) => void;
}

const HandTrackingCanvas: React.FC<HandTrackingCanvasProps> = ({
  screenSize,
  handPosition,
  hoveredChoice,
  isLoading,
  loadingError,
  useSimpleMode,
  handResults,
  onHandResults
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);

  // Draw hand landmarks and connections
  const drawHandLandmarks = useCallback((
    ctx: CanvasRenderingContext2D,
    landmarks: HandLandmark[],
    width: number,
    height: number
  ) => {
    if (!landmarks || landmarks.length === 0) return;

    // Hand connection pairs
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index finger
      [5, 9], [9, 10], [10, 11], [11, 12], // Middle finger
      [9, 13], [13, 14], [14, 15], [15, 16], // Ring finger
      [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [0, 17] // Palm connection
    ];

    // Draw connections first (behind landmarks)
    ctx.strokeStyle = hoveredChoice ? '#ff6600' : '#00ff88';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    connections.forEach(([start, end]) => {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];
      
      if (startPoint && endPoint) {
        ctx.beginPath();
        // Flip x coordinates to match the flipped video
        ctx.moveTo((1 - startPoint.x) * width, startPoint.y * height);
        ctx.lineTo((1 - endPoint.x) * width, endPoint.y * height);
        ctx.stroke();
      }
    });

    // Draw landmarks
    landmarks.forEach((landmark, index) => {
      // Flip x coordinate to match the flipped video
      const x = (1 - landmark.x) * width;
      const y = landmark.y * height;
      
      // Different colors for different parts
      let color = '#00ff88';
      let radius = 3;
      
      // Fingertips (larger and different color)
      if ([4, 8, 12, 16, 20].includes(index)) {
        color = hoveredChoice ? '#ff6600' : '#00ffff';
        radius = 5;
      }
      // Index finger tip (most important for pointing)
      if (index === 8) {
        color = hoveredChoice ? '#ff3300' : '#00ff00';
        radius = 8;
      }
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();
      
      // Add glow effect for index finger tip
      if (index === 8) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });
  }, [hoveredChoice]);

  // Draw hand cursor at finger position
  const drawHandCursor = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number
  ) => {
    const time = Date.now() / 1000;
    
    // Main cursor circle
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 30);
    gradient.addColorStop(0, hoveredChoice ? 'rgba(255, 102, 0, 0.8)' : 'rgba(0, 255, 136, 0.8)');
    gradient.addColorStop(0.7, hoveredChoice ? 'rgba(255, 102, 0, 0.4)' : 'rgba(0, 255, 136, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, 2 * Math.PI);
    ctx.fill();

    // Inner cursor
    ctx.fillStyle = hoveredChoice ? '#ff6600' : '#00ff88';
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, 2 * Math.PI);
    ctx.fill();
    
    // Cursor border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pulsing ring when hovering
    if (hoveredChoice) {
      const pulseRadius = 20 + Math.sin(time * 6) * 8;
      const pulseOpacity = 0.6 + Math.sin(time * 6) * 0.3;
      
      ctx.strokeStyle = `rgba(255, 102, 0, ${pulseOpacity})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, pulseRadius, 0, 2 * Math.PI);
      ctx.stroke();
      
      // Outer pulse ring
      const outerPulseRadius = 35 + Math.sin(time * 4) * 5;
      ctx.strokeStyle = `rgba(255, 102, 0, ${pulseOpacity * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, outerPulseRadius, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Crosshair for precision
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 8, y);
    ctx.lineTo(x + 8, y);
    ctx.moveTo(x, y - 8);
    ctx.lineTo(x, y + 8);
    ctx.stroke();
  }, [hoveredChoice]);

  // Main drawing function
  const draw = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw hand landmarks if available
    if (handResults?.multiHandLandmarks && handResults.multiHandLandmarks.length > 0) {
      const landmarks = handResults.multiHandLandmarks[0];
      drawHandLandmarks(ctx, landmarks, canvas.width, canvas.height);
    }

    // Draw cursor at hand position
    if (handPosition) {
      drawHandCursor(ctx, handPosition.x, handPosition.y);
    }

    // Continue animation
    animationFrameRef.current = requestAnimationFrame(draw);
  }, [handPosition, handResults, drawHandLandmarks, drawHandCursor]);

  // Start animation loop
  useEffect(() => {
    if (!useSimpleMode) {
      animationFrameRef.current = requestAnimationFrame(draw);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [draw, useSimpleMode]);

  // Don't render if in simple mode
  if (useSimpleMode) return null;

  return (
    <>
      {/* Hand Tracking Canvas */}
      <canvas
        ref={canvasRef}
        width={screenSize.width}
        height={screenSize.height}
        className="absolute inset-0 w-full h-full pointer-events-none z-20"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* Loading State */}
      {isLoading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
          <div className="p-6 bg-black/90 rounded-xl text-white text-center backdrop-blur-md border border-blue-500/30">
            <div className="relative mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
              <Hand className="w-6 h-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Khởi tạo Hand Tracking</h3>
            <p className="text-blue-300 text-sm">Đang tải MediaPipe models...</p>
            <div className="mt-4 flex justify-center">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {loadingError && (
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
          <div className="p-6 bg-red-600/95 rounded-xl text-white text-center max-w-md backdrop-blur-md border border-red-400/30">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-500/30 rounded-full">
                <AlertCircle className="w-8 h-8 text-red-200" />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2">Lỗi Hand Tracking</h3>
            <p className="text-red-100 text-sm mb-3">{loadingError}</p>
            <div className="bg-red-500/20 rounded-lg p-3 border border-red-400/30">
              <p className="text-red-100 text-xs">
                🖱️ Chuyển sang chế độ click - bạn vẫn có thể chơi bằng cách click vào đáp án!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hand Tracking Status Indicator */}
      <div className="absolute top-28 left-6 z-10">
        <div className="bg-black/80 rounded-lg p-3 backdrop-blur-md border border-white/10">
          <div className="flex items-center gap-3">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {handPosition ? (
                <>
                  <Wifi className="w-4 h-4 text-green-400" />
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-gray-400" />
                  <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                </>
              )}
              <span className="text-sm font-medium text-white">
                {handPosition ? 'Phát hiện tay' : 'Không có tay'}
              </span>
            </div>

            {/* Hover Status */}
            {hoveredChoice && (
              <div className="flex items-center gap-2 ml-3 px-2 py-1 bg-orange-500/20 rounded-md border border-orange-400/30">
                <Target className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-bold text-orange-300">
                  {hoveredChoice.toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Hand tracking quality indicator */}
          {handPosition && (
            <div className="mt-2 pt-2 border-t border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Chất lượng:</span>
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                </div>
                <span className="text-xs text-green-400">Tốt</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hover Choice Preview */}
      {hoveredChoice && handPosition && (
        <div 
          className="absolute z-25 pointer-events-none"
          style={{
            left: handPosition.x + 40,
            top: handPosition.y - 20,
            transform: 'translateY(-50%)'
          }}
        >
          <div className="bg-orange-500/90 text-white px-3 py-2 rounded-lg text-sm font-bold backdrop-blur-sm border border-orange-400/50 shadow-lg">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              <span>Đáp án {hoveredChoice.toUpperCase()}</span>
            </div>
            <div className="text-xs text-orange-100 mt-1">
              Giữ vị trí để tự động chọn
            </div>
          </div>
          {/* Arrow pointing to hand */}
          <div className="absolute left-0 top-1/2 transform -translate-x-2 -translate-y-1/2">
            <div className="w-0 h-0 border-t-4 border-b-4 border-r-8 border-t-transparent border-b-transparent border-r-orange-500/90"></div>
          </div>
        </div>
      )}

      {/* Instructions overlay for first-time users */}
      {!isLoading && !loadingError && !handPosition && (
        <div className="absolute bottom-1/3 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-blue-600/90 rounded-xl p-6 text-white text-center backdrop-blur-md border border-blue-400/30 max-w-md">
            <Hand className="w-12 h-12 mx-auto mb-4 text-blue-200" />
            <h3 className="text-lg font-bold mb-2">Đưa tay lên camera</h3>
            <p className="text-blue-100 text-sm">
              Giữ tay trước camera để bắt đầu tracking. Dùng ngón trỏ để chỉ vào đáp án muốn chọn.
            </p>
            <div className="mt-4 flex justify-center items-center gap-2 text-xs text-blue-200">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
              <span>Đảm bảo ánh sáng đủ tốt</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HandTrackingCanvas;