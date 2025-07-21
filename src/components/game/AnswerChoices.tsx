// components/game/AnswerChoices.tsx - FIXED for multiplayer answer submission with mobile optimization and animations
import React, { useCallback, useRef, useEffect } from 'react';
import { CheckCircle, Clock, Target, AlertTriangle, Smartphone } from 'lucide-react';
import { QuizChoice } from '@/types/game';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useMobileGesture } from '@/hooks/useMobileGesture';
// Remove problematic animation hook import

interface AnswerChoicesProps {
  choices: QuizChoice[];
  selectedChoice: string | null;
  hoveredChoice: string | null;
  lastHoveredChoice: string | null;
  isCorrect: boolean | null;
  timeLeft: number;
  onChoiceSelect: (choiceId: string) => void;
  isMultiplayer?: boolean; // Add multiplayer prop
}

const AnswerChoices: React.FC<AnswerChoicesProps> = ({
  choices,
  selectedChoice,
  hoveredChoice,
  lastHoveredChoice,
  isCorrect,
  timeLeft,
  onChoiceSelect,
  isMultiplayer = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { deviceInfo, triggerHapticFeedback, optimizeTouchArea } = useMobileOptimization({
    enableHapticFeedback: true,
    enableTouchOptimization: true,
    gestureThreshold: 15,
    tapDelay: 300
  });
  
  // Remove problematic animation hook call

  // ENHANCED: Stable choice selection handler with mobile optimization
  const handleChoiceClick = useCallback((choiceId: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    console.log('🖱️ Choice clicked:', {
      choiceId,
      selectedChoice,
      isMultiplayer,
      timeLeft,
      isMobile: deviceInfo.isMobile,
      timestamp: new Date().toISOString()
    });

    // Prevent double selection
    if (selectedChoice) {
      console.log('⚠️ Answer already selected:', selectedChoice);
      triggerHapticFeedback([50, 50, 50]); // Error pattern
      return;
    }

    // Provide haptic feedback for selection
    triggerHapticFeedback(deviceInfo.isMobile ? 100 : 50);
    
    console.log('✅ Calling onChoiceSelect with:', choiceId);
    onChoiceSelect(choiceId);
  }, [selectedChoice, onChoiceSelect, isMultiplayer, timeLeft, deviceInfo.isMobile, triggerHapticFeedback]);

  // Handle mobile gestures
  const handleGesture = useCallback((event: any) => {
    if (selectedChoice) return;

    const { type, position } = event;
    
    if (type === 'tap' || type === 'hover') {
      // Find which choice was touched/hovered
      const choice = choices.find(choice => {
        const choiceRect = {
          left: choice.position.x,
          top: choice.position.y,
          right: choice.position.x + choice.position.width,
          bottom: choice.position.y + choice.position.height
        };
        
        return position.x >= choiceRect.left && 
               position.x <= choiceRect.right && 
               position.y >= choiceRect.top && 
               position.y <= choiceRect.bottom;
      });

      if (choice && type === 'tap') {
        handleChoiceClick(choice.id);
      }
    }
  }, [choices, selectedChoice, handleChoiceClick]);

  // Use mobile gesture hook
  useMobileGesture(containerRef as React.RefObject<HTMLElement | null>, handleGesture, {
    tapThreshold: 15,
    longPressThreshold: 600,
    swipeThreshold: 80
  });

  // Optimize touch areas for mobile - simplified without problematic animations
  useEffect(() => {
    if (deviceInfo.isMobile && containerRef.current) {
      const choiceElements = containerRef.current.querySelectorAll('[data-choice-id]');
      choiceElements.forEach(element => {
        optimizeTouchArea(element as HTMLElement);
      });
    }
  }, [deviceInfo.isMobile, optimizeTouchArea, choices]);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
      {/* Mobile mode indicator */}
      {deviceInfo.isMobile && (
        <div className="absolute top-4 right-4 z-30 bg-blue-500/20 backdrop-blur-sm rounded-lg p-2 border border-blue-400/30">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-blue-300 font-medium">
              {deviceInfo.screenSize.toUpperCase()} • {deviceInfo.orientation.toUpperCase()}
            </span>
          </div>
        </div>
      )}
      
      {choices.map((choice) => (
        <div
          key={choice.id}
          data-choice-id={choice.id}
          className={`
            absolute transition-all duration-300 z-10 answer-choice-enter
            ${hoveredChoice === choice.id ? 'scale-105 z-20 answer-choice-hover' : 'scale-100'}
            ${lastHoveredChoice === choice.id && timeLeft <= 5 ? 'animate-pulse' : ''}
            ${selectedChoice === choice.id && isCorrect ? 'answer-choice-correct' : ''}
            ${selectedChoice === choice.id && isCorrect === false ? 'answer-choice-incorrect' : ''}
            ${selectedChoice ? 'pointer-events-none' : 'pointer-events-auto cursor-pointer'}
            ${deviceInfo.isMobile ? 'touch-target-optimized' : ''}
          `}
          style={{
            left: `${choice.position.x}px`,
            top: `${choice.position.y}px`,
            width: `${choice.position.width}px`,
            height: `${choice.position.height}px`,
            minWidth: deviceInfo.isMobile ? '60px' : 'auto',
            minHeight: deviceInfo.isMobile ? '60px' : 'auto',
          }}
          onClick={(e) => handleChoiceClick(choice.id, e)}
          onMouseDown={(e) => e.preventDefault()} // Prevent any interference
          onTouchStart={(e) => {
            e.preventDefault();
            if (deviceInfo.isTouch) {
              triggerHapticFeedback(30); // Light feedback on touch
            }
            handleChoiceClick(choice.id);
          }}
        >
          <div className={`
            w-full h-full rounded-xl border-4 flex items-center gap-6 px-6 transition-all duration-300
            backdrop-blur-sm
            ${hoveredChoice === choice.id ? 
              'border-orange-400 bg-orange-500/30 shadow-2xl shadow-orange-500/30' : 
              'border-white/50 bg-black/60'
            }
            ${selectedChoice === choice.id ? 
              (isCorrect ? 
                'border-green-400 bg-green-500/50 shadow-2xl shadow-green-500/30' : 
                'border-red-400 bg-red-500/50 shadow-2xl shadow-red-500/30'
              ) : ''
            }
            ${lastHoveredChoice === choice.id && timeLeft <= 5 ? 
              'border-yellow-400 bg-yellow-500/20 shadow-lg shadow-yellow-500/20' : ''}
            ${selectedChoice ? '' : 'hover:shadow-2xl hover:border-blue-400'}
          `}>
            <div className={`
              w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl text-white
              transition-all duration-300
              ${selectedChoice === choice.id ? 
                (isCorrect ? 'bg-green-500' : 'bg-red-500') 
                : hoveredChoice === choice.id ?
                'bg-orange-500' : 'bg-blue-500'}
              ${hoveredChoice === choice.id ? 'scale-110' : 'scale-100'}
            `}>
              {choice.letter}
            </div>
            
            <span className="text-2xl font-medium text-white flex-1 text-left">
              {choice.text}
            </span>
            
            <div className="flex items-center gap-2">
              {/* Hover indicator */}
              {hoveredChoice === choice.id && !selectedChoice && (
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center animate-bounce">
                  <Target className="w-6 h-6 text-white" />
                </div>
              )}
              
              {/* Selected indicator */}
              {selectedChoice === choice.id && (
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isCorrect ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              )}
              
              {/* Auto-select warning for last hovered */}
              {lastHoveredChoice === choice.id && timeLeft <= 5 && timeLeft > 0 && !selectedChoice && (
                <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center animate-pulse">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              )}

              {/* Multiplayer mode indicator */}
              {isMultiplayer && selectedChoice === choice.id && (
                <div className="text-xs bg-blue-500/80 text-white px-2 py-1 rounded-full">
                  SENT
                </div>
              )}
            </div>
          </div>

          {/* Click area overlay for better touch/click detection */}
          <div 
            className="absolute inset-0 cursor-pointer"
            onClick={(e) => handleChoiceClick(choice.id, e)}
            style={{ zIndex: 1 }}
          />
        </div>
      ))}
      
      {/* Mobile touch instructions */}
      {deviceInfo.isMobile && !selectedChoice && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30">
          <div className="bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-white/20">
            <div className="flex items-center gap-2 text-white text-sm">
              <Smartphone className="w-4 h-4 text-blue-400" />
              <span>Tap to select your answer</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnswerChoices;