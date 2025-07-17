// components/game/AnswerChoices.tsx - FIXED for multiplayer answer submission
import React, { useCallback } from 'react';
import { CheckCircle, Clock, Target, AlertTriangle } from 'lucide-react';
import { QuizChoice } from '@/types/game';

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
  // ENHANCED: Stable choice selection handler
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
      timestamp: new Date().toISOString()
    });

    // Prevent double selection
    if (selectedChoice) {
      console.log('⚠️ Answer already selected:', selectedChoice);
      return;
    }

    console.log('✅ Calling onChoiceSelect with:', choiceId);
    onChoiceSelect(choiceId);
  }, [selectedChoice, onChoiceSelect, isMultiplayer, timeLeft]);

  return (
    <>
      {choices.map((choice) => (
        <div
          key={choice.id}
          className={`
            absolute transition-all duration-300 z-10
            ${hoveredChoice === choice.id ? 'scale-105 z-20' : 'scale-100'}
            ${lastHoveredChoice === choice.id && timeLeft <= 5 ? 'animate-pulse' : ''}
            ${selectedChoice ? 'pointer-events-none' : 'pointer-events-auto cursor-pointer'}
          `}
          style={{
            left: `${choice.position.x}px`,
            top: `${choice.position.y}px`,
            width: `${choice.position.width}px`,
            height: `${choice.position.height}px`,
          }}
          onClick={(e) => handleChoiceClick(choice.id, e)}
          onMouseDown={(e) => e.preventDefault()} // Prevent any interference
          onTouchStart={(e) => {
            e.preventDefault();
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
    </>
  );
};

export default AnswerChoices;