// components/TestScreen2.tsx - Updated với Multiplayer button
'use client';
import React, { useState } from 'react';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import GameScreen from '@/components/GameScreen2';
import QuestionGenerator from '@/components/QuestionGenerator';
import { QuizQuestion } from '@/types/game';
import { Sparkles, Brain, PlayCircle, Trophy, Users, Zap, Sword } from 'lucide-react';
import Link from 'next/link';

const TestScreen: React.FC = () => {
  const { status, stream, requestPermission, resetPermission } = useCameraPermission();
  const [showQuestionGenerator, setShowQuestionGenerator] = useState(false);
  const [customQuestions, setCustomQuestions] = useState<QuizQuestion[] | null>(null);
  const [isUsingAI, setIsUsingAI] = useState(false);

  const handleBackToPermission = () => {
    resetPermission();
    setCustomQuestions(null);
    setIsUsingAI(false);
  };

  const handlePlaySingleMode = () => {
    setIsUsingAI(false);
    requestPermission();
  };

  const handlePlayWithAI = () => {
    setShowQuestionGenerator(true);
  };

  const handleQuestionsGenerated = (questions: QuizQuestion[]) => {
    setCustomQuestions(questions);
    setIsUsingAI(true);
    requestPermission();
  };

  if (status === 'granted' && stream) {
    return (
      <GameScreen
        handTrackingEnabled={true}
        cameraStream={stream}
        onBackToPermission={handleBackToPermission}
        customQuestions={customQuestions}
        isUsingAI={isUsingAI}
      />
    );
  }

  // Main menu screen with left/right layout
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 min-h-[80vh]">
          
          {/* LEFT SIDE - Title & Stats */}
          <div className="flex flex-col justify-center space-y-8">
            {/* Game Title */}
            <div className="space-y-6">
              <h1 className="text-6xl lg:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 leading-tight">
                SUI MILLIONAIRE
              </h1>
              <h2 className="text-2xl lg:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                Hand Gesture Quiz Game
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"></div>
            </div>

            {/* Game Description */}
            <div className="space-y-6">
              <p className="text-xl text-white/80 leading-relaxed">
                Test your knowledge and win SUI tokens! Use hand gestures to select your answers in this revolutionary blockchain quiz game.
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="text-3xl mb-3">🎮</div>
                <div className="text-2xl font-bold text-white mb-1">Interactive</div>
                <div className="text-white/70">Hand Tracking</div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="text-3xl mb-3">💰</div>
                <div className="text-2xl font-bold text-white mb-1">Earn SUI</div>
                <div className="text-white/70">Real Rewards</div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="text-3xl mb-3">🤖</div>
                <div className="text-2xl font-bold text-white mb-1">AI Powered</div>
                <div className="text-white/70">Unlimited Questions</div>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-md rounded-2xl p-6 border border-purple-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Trophy className="w-8 h-8 text-yellow-400" />
                  <div>
                    <div className="text-2xl font-bold text-white">2,458</div>
                    <div className="text-white/70">Players Today</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Zap className="w-8 h-8 text-green-400" />
                  <div>
                    <div className="text-2xl font-bold text-white">15,320</div>
                    <div className="text-white/70">SUI Distributed</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Users className="w-8 h-8 text-blue-400" />
                  <div>
                    <div className="text-2xl font-bold text-white">98.2%</div>
                    <div className="text-white/70">Success Rate</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE - Play Buttons */}
          <div className="flex flex-col justify-center space-y-8">
            <div className="bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/20">
              <h3 className="text-3xl font-bold text-white mb-8 text-center">Choose Your Mode</h3>
              
              <div className="space-y-6">
                {/* Single Player Mode */}
                {/* <div className="space-y-4">
                  <button
                    onClick={handlePlaySingleMode}
                    disabled={status === 'requesting'}
                    className="group relative w-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-400 hover:via-orange-400 hover:to-red-400 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-8 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl disabled:hover:scale-100"
                  >
                    <div className="flex items-center justify-center gap-4">
                      {status === 'requesting' ? (
                        <>
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                          <span className="text-2xl">Starting Game...</span>
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-8 h-8" />
                          <span className="text-2xl">SOLO MODE</span>
                          <span className="text-2xl">🎯</span>
                        </>
                      )}
                    </div>
                    
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 blur-xl group-hover:blur-2xl transition-all duration-300 -z-10"></div>
                  </button>
                  
                  <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl p-4 border border-orange-500/20">
                    <h4 className="text-orange-300 font-bold mb-2">🎯 Solo Challenge</h4>
                    <p className="text-white/70 text-sm">
                      5 questions about Vietnam. Perfect for practicing hand tracking and earning solo rewards.
                    </p>
                  </div>
                </div> */}

                {/* AI Mode */}
                <div className="space-y-4">
                  <button
                    onClick={handlePlayWithAI}
                    disabled={status === 'requesting'}
                    className="group relative w-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 hover:from-purple-400 hover:via-pink-400 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-8 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl disabled:hover:scale-100"
                  >
                    <div className="flex items-center justify-center gap-4">
                      <Brain className="w-8 h-8" />
                      <span className="text-2xl">AI MODE</span>
                      <Sparkles className="w-8 h-8" />
                    </div>
                    
                    {/* Glow effect */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 blur-xl group-hover:blur-2xl transition-all duration-300 -z-10"></div>
                  </button>
                  
                  <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-xl p-4 border border-purple-500/20">
                    <h4 className="text-purple-300 font-bold mb-2">🤖 AI Generated</h4>
                    <p className="text-white/70 text-sm">
                      Custom questions by Gemini 2.0 Flash. Choose any topic and difficulty level!
                    </p>
                  </div>
                </div>

                {/* Multiplayer Mode */}
                <div className="space-y-4">
                  <Link href="/multiplayer">
                    <button className="group relative w-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-400 hover:via-emerald-400 hover:to-teal-400 text-white font-bold py-8 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl">
                      <div className="flex items-center justify-center gap-4">
                        <Sword className="w-8 h-8" />
                        <span className="text-2xl">MULTIPLAYER</span>
                        <Users className="w-8 h-8" />
                      </div>
                      
                      {/* Glow effect */}
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-teal-500/20 blur-xl group-hover:blur-2xl transition-all duration-300 -z-10"></div>
                    </button>
                  </Link>
                  
                  <div className="bg-gradient-to-br from-green-500/10 to-teal-500/10 rounded-xl p-4 border border-green-500/20">
                    <h4 className="text-green-300 font-bold mb-2">⚔️ Battle Royale</h4>
                    <p className="text-white/70 text-sm">
                      Compete against up to 50 players! Last one standing wins the entire prize pool.
                    </p>
                  </div>
                </div>

                {/* Hand tracking info */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-center gap-3 text-blue-200 text-sm">
                    <span className="text-lg">✋</span>
                    <span>Hand tracking automatically enabled • Point to select answers</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Error message */}
            {status === 'denied' && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-6">
                <p className="text-red-300 text-lg font-medium mb-2">
                  🚫 Camera Permission Denied
                </p>
                <p className="text-red-200 text-sm">
                  Please enable camera access in your browser settings to use hand tracking features. 
                  The game will fall back to click mode if hand tracking is unavailable.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM - How to Play */}
        <div className="mt-16 bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/20">
          <h3 className="text-3xl font-bold text-white mb-8 text-center">How to Play</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-2xl">👆</span>
              </div>
              <h4 className="text-xl font-bold text-white">Point Your Finger</h4>
              <p className="text-white/70">
                Use your index finger to point at the answer you want to select
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-2xl">⏱️</span>
              </div>
              <h4 className="text-xl font-bold text-white">15 Second Timer</h4>
              <p className="text-white/70">
                You have 15 seconds to answer each question before auto-select
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-2xl">🎯</span>
              </div>
              <h4 className="text-xl font-bold text-white">Multiple Modes</h4>
              <p className="text-white/70">
                Solo practice, AI challenges, or multiplayer battles
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-2xl">💎</span>
              </div>
              <h4 className="text-xl font-bold text-white">Earn SUI Tokens</h4>
              <p className="text-white/70">
                Get rewarded with real SUI tokens for correct answers
              </p>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-white/60 text-sm">
              Compatible with all modern browsers • Best experience with good lighting 🌟
            </p>
          </div>
        </div>
      </div>

      {/* Question Generator Modal */}
      {showQuestionGenerator && (
        <QuestionGenerator
          onQuestionsGenerated={handleQuestionsGenerated}
          onClose={() => setShowQuestionGenerator(false)}
        />
      )}
    </div>
  );
};

export default TestScreen;