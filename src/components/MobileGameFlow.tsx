// components/MobileGameFlow.tsx - Special mobile game flow component
'use client';
import React, { useState, useEffect } from 'react';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import GameScreen from '@/components/GameScreen2';
import { QuizQuestion } from '@/types/game';
import { Camera, Smartphone, PlayCircle, AlertCircle } from 'lucide-react';

interface MobileGameFlowProps {
  customQuestions?: QuizQuestion[] | null;
  isUsingAI?: boolean;
  onBackToMenu: () => void;
}

const MobileGameFlow: React.FC<MobileGameFlowProps> = ({
  customQuestions,
  isUsingAI = false,
  onBackToMenu
}) => {
  const { status, stream, requestPermission, resetPermission } = useCameraPermission();
  const [showPermissionScreen, setShowPermissionScreen] = useState(false);
  const [permissionAttempted, setPermissionAttempted] = useState(false);

  // Auto-request permission when questions are ready
  useEffect(() => {
    if (customQuestions && !permissionAttempted) {
      console.log('Auto-requesting camera permission for mobile game');
      setPermissionAttempted(true);
      requestPermission();
    }
  }, [customQuestions, permissionAttempted, requestPermission]);

  // Show game screen if we have camera permission
  if (status === 'granted' && stream) {
    console.log('Mobile: Entering game screen with camera permission');
    return (
      <GameScreen
        handTrackingEnabled={true}
        cameraStream={stream}
        onBackToPermission={onBackToMenu}
        customQuestions={customQuestions}
        isUsingAI={isUsingAI}
      />
    );
  }

  // Show game screen without hand tracking if camera is denied but we have questions
  if (status === 'denied' && customQuestions) {
    console.log('Mobile: Entering game screen without hand tracking');
    return (
      <GameScreen
        handTrackingEnabled={false}
        cameraStream={undefined}
        onBackToPermission={onBackToMenu}
        customQuestions={customQuestions}
        isUsingAI={isUsingAI}
      />
    );
  }

  // Show game screen without hand tracking if we have questions but no camera attempted yet
  if (customQuestions && status === 'idle' && permissionAttempted) {
    console.log('Mobile: Entering game screen without camera (idle state)');
    return (
      <GameScreen
        handTrackingEnabled={false}
        cameraStream={undefined}
        onBackToPermission={onBackToMenu}
        customQuestions={customQuestions}
        isUsingAI={isUsingAI}
      />
    );
  }

  // Show permission screen if we need camera access
  if (customQuestions && (status === 'idle' || status === 'requesting' || status === 'denied')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-6 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 text-center max-w-md">
          <div className="mb-6">
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Camera Permission</h2>
            <p className="text-white/70">
              {status === 'requesting' ? 'Requesting camera access...' :
               status === 'denied' ? 'Camera access denied' :
               'Enable camera for hand tracking'}
            </p>
          </div>
          
          <div className="space-y-4">
            {status === 'denied' && (
              <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-red-200 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>Camera access denied. You can still play without hand tracking.</span>
                </div>
              </div>
            )}
            
            <button
              onClick={requestPermission}
              disabled={status === 'requesting'}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              {status === 'requesting' ? 'Requesting...' : 'Enable Camera'}
            </button>
            
            <button
              onClick={() => {
                // Proceed to game without camera
                console.log('Proceeding to game without camera');
                setPermissionAttempted(true);
                // Force render by updating state
                setShowPermissionScreen(true);
              }}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
            >
              <PlayCircle className="w-5 h-5" />
              Play Without Camera
            </button>
            
            <button
              onClick={onBackToMenu}
              className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
            >
              Back to Menu
            </button>
          </div>
          
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-blue-200 text-sm">
              <Smartphone className="w-4 h-4" />
              <span>Mobile optimized experience</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If we have questions but no permission attempted yet, show the permission screen
  if (customQuestions && !permissionAttempted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-6 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 text-center max-w-md">
          <div className="mb-6">
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Ready to Play</h2>
            <p className="text-white/70">
              Your questions are ready! Choose how you want to play.
            </p>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={() => {
                setPermissionAttempted(true);
                requestPermission();
              }}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Play with Hand Tracking
            </button>
            
            <button
              onClick={() => {
                setPermissionAttempted(true);
                // Skip camera permission and go straight to game
              }}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
            >
              <PlayCircle className="w-5 h-5" />
              Play with Touch
            </button>
            
            <button
              onClick={onBackToMenu}
              className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-6 flex items-center justify-center">
      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
        <p className="text-white">Preparing game...</p>
      </div>
    </div>
  );
};

export default MobileGameFlow;