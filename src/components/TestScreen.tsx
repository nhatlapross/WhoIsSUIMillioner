'use client';
import React from 'react';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import GameScreen from '@/components/GameScreen';

const App: React.FC = () => {
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
        handTrackingEnabled={true} // Auto enable hand tracking
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
            WHO IS SUI
          </h1>
          <h2 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 mb-6">
            MILLIONAIRE
          </h2>
          <div className="w-32 h-1 bg-gradient-to-r from-yellow-400 to-orange-500 mx-auto rounded-full"></div>
        </div>

        {/* Game Description */}
        <p className="text-xl text-white/80 mb-12 leading-relaxed">
          Test your knowledge and win virtual millions! Use hand gestures to select your answers.
        </p>

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
                  <span>PLAY SINGLE MODE</span>
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
            <span>Hand tracking automatically enabled</span>
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
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <p className="text-white/40 text-sm">
            Move your hand to select answers • Point to choose • Have fun! 🎉
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
