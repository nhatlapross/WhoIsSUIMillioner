// components/AnswerChoices.tsx
import React from 'react';
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
}

const AnswerChoices: React.FC<AnswerChoicesProps> = ({
  choices,
  selectedChoice,
  hoveredChoice,
  lastHoveredChoice,
  isCorrect,
  timeLeft,
  onChoiceSelect
}) => {
  return (
    <>
      {choices.map((choice) => (
        <div
          key={choice.id}
          className={`
            absolute transition-all duration-300 pointer-events-auto cursor-pointer z-10
            ${hoveredChoice === choice.id ? 'scale-105 z-20' : 'scale-100'}
            ${lastHoveredChoice === choice.id && timeLeft <= 5 ? 'animate-pulse' : ''}
          `}
          style={{
            left: `${choice.position.x}px`,
            top: `${choice.position.y}px`,
            width: `${choice.position.width}px`,
            height: `${choice.position.height}px`,
          }}
          onClick={() => onChoiceSelect(choice.id)}
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
            hover:shadow-2xl hover:border-blue-400
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
              {hoveredChoice === choice.id && !selectedChoice && (
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center animate-bounce">
                  <Target className="w-6 h-6 text-white" />
                </div>
              )}
              
              {selectedChoice === choice.id && (
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isCorrect ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              )}
              
              {lastHoveredChoice === choice.id && timeLeft <= 5 && timeLeft > 0 && !selectedChoice && (
                <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center animate-pulse">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default AnswerChoices;