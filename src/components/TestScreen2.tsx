// components/TestScreen.tsx
'use client';
import React from 'react';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import GameScreen from '@/components/GameScreen2';

const TestScreen: React.FC = () => {
  const { status, stream, requestPermission, resetPermission } = useCameraPermission();

  const handleBackToPermission = () => {
    resetPermission();
  };

  const handlePlaySingleMode = () => {
    requestPermission();
  };

  if (status === 'granted' && stream) {
    return (
      <GameScreen
        handTrackingEnabled={true}
        cameraStream={stream}
        onBackToPermission={handleBackToPermission}
      />
    );
  }

  // Main menu screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-12 text-center max-w-2xl w-full shadow-2xl border border-white/20">
        {/* Game Title */}
        <div className="mb-12">
          <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 mb-4 tracking-tight">
            SUI MILLIONAIRE
          </h1>
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-6">
            Hand Gesture Quiz Game
          </h2>
          <div className="w-32 h-1 bg-gradient-to-r from-yellow-400 to-orange-500 mx-auto rounded-full"></div>
        </div>

        {/* Game Description */}
        <div className="mb-12">
          <p className="text-xl text-white/80 mb-6 leading-relaxed">
            Test your knowledge and win SUI tokens! Use hand gestures to select your answers in this revolutionary blockchain quiz game.
          </p>
          
          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-white/70">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-2xl mb-2">🎮</div>
              <div className="font-semibold text-white/90">Interactive Gameplay</div>
              <div>Hand tracking technology</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-2xl mb-2">💰</div>
              <div className="font-semibold text-white/90">Earn SUI Tokens</div>
              <div>Real blockchain rewards</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-2xl mb-2">🏆</div>
              <div className="font-semibold text-white/90">Compete & Win</div>
              <div>Challenge your knowledge</div>
            </div>
          </div>
        </div>

        {/* Play Button */}
        <div className="space-y-6">
          <button
            onClick={handlePlaySingleMode}
            disabled={status === 'requesting'}
            className="group relative w-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-400 hover:via-orange-400 hover:to-red-400 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-6 px-12 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl disabled:hover:scale-100 text-2xl"
          >
            <div className="flex items-center justify-center gap-4">
              {status === 'requesting' ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  <span>Starting Game...</span>
                </>
              ) : (
                <>
                  <span>🎮</span>
                  <span>START PLAYING</span>
                  <span>✋</span>
                </>
              )}
            </div>
            
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 blur-xl group-hover:blur-2xl transition-all duration-300 -z-10"></div>
          </button>

          {/* Hand tracking info */}
          <div className="flex items-center justify-center gap-3 text-white/60 text-sm">
            <span>✋</span>
            <span>Hand tracking automatically enabled • Point to select answers</span>
          </div>
        </div>

        {/* Error message */}
        {status === 'denied' && (
          <div className="mt-8 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
            <p className="text-red-300 text-lg font-medium mb-2">
              🚫 Camera Permission Denied
            </p>
            <p className="text-red-200 text-sm">
              Please enable camera access in your browser settings to use hand tracking features. 
              The game will fall back to click mode if hand tracking is unavailable.
            </p>
          </div>
        )}

        {/* Instructions Preview */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <h3 className="text-lg font-semibold text-white/90 mb-4">How to Play:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-white/70">
            <div className="flex items-center gap-2">
              <span>👆</span>
              <span>Point your finger at answers</span>
            </div>
            <div className="flex items-center gap-2">
              <span>⏱️</span>
              <span>15 seconds per question</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🎯</span>
              <span>Auto-select when time runs out</span>
            </div>
            <div className="flex items-center gap-2">
              <span>💎</span>
              <span>Earn SUI tokens for correct answers</span>
            </div>
          </div>
          <p className="text-white/40 text-xs mt-4">
            Compatible with all modern browsers • Best experience with good lighting 🌟
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestScreen;