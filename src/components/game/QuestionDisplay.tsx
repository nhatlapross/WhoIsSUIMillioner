// components/game/QuestionDisplay.tsx
import React from 'react';
import { QuizQuestion } from '@/types/game';

interface QuestionDisplayProps {
  question: QuizQuestion;
  currentQuestion: number;
  totalQuestions: number;
}

const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  question,
  currentQuestion,
  totalQuestions
}) => {
  return (
    <div className="absolute top-1/5 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl px-6 z-10">
      <div 
        key={currentQuestion}
        className="bg-black/80 backdrop-blur-md rounded-xl p-8 text-white text-center border border-white/20 question-slide-in"
      >
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center gap-4 w-full">
            <h2 className="text-2xl font-bold text-blue-400">
              Question {currentQuestion + 1}
            </h2>
            <div className="flex-1 bg-white/20 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300 progress-fill"
                style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
              />
            </div>
            <span className="text-lg text-gray-300">
              {currentQuestion + 1}/{totalQuestions}
            </span>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg p-6 border border-purple-500/30">
          <p className="text-2xl font-medium leading-relaxed">{question.question}</p>
        </div>
      </div>
    </div>
  );
};

export default QuestionDisplay;