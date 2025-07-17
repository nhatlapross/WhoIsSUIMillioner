// components/multiplayer/MultiplayerGameScreen.tsx - DEBUG loading issue
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import GameScreen from '@/components/GameScreen2';
import MultiplayerOverlay from '@/components/multiplayer/MultiplayerOverlay';
import { QuizQuestion } from '@/types/game';
import { Camera, Users, Trophy, Coins, CheckCircle } from 'lucide-react';

interface MultiplayerGameScreenProps {
  onBackToLobby: () => void;
}

const MultiplayerGameScreen: React.FC<MultiplayerGameScreenProps> = ({ onBackToLobby }) => {
  const {
    room,
    playerId,
    currentQuestion,
    gamePhase,
    timeLeft,
    selectedAnswer,
    submitAnswer,
    leaveRoom,
    isConnected
  } = useWebSocket();

  const { status, stream, requestPermission } = useCameraPermission();
  const [gameQuestions, setGameQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isClaimingReward, setIsClaimingReward] = useState(false);
  const [hasClaimedReward, setHasClaimedReward] = useState(false);

  // CRITICAL DEBUG: Log all state and conditions
  console.log('🎮 MultiplayerGameScreen RENDER - Debug State:', {
    gamePhase,
    hasRoom: !!room,
    roomState: room?.state,
    playerId,
    hasCurrentQuestion: !!currentQuestion,
    questionNumber: currentQuestion?.questionNumber,
    isConnected,
    cameraStatus: status,
    hasStream: !!stream,
    gameQuestionsLength: gameQuestions.length,
    currentQuestionIndex,
    timeLeft,
    selectedAnswer
  });

  // Convert multiplayer question to GameScreen format
  const convertMultiplayerQuestion = useCallback((mpQuestion: any): QuizQuestion => {
    console.log('🔄 Converting multiplayer question:', mpQuestion);
    return {
      question: mpQuestion.question,
      choices: mpQuestion.choices,
      correctAnswer: mpQuestion.correctAnswer || 'a'
    };
  }, []);

  // Update game questions when currentQuestion changes
  useEffect(() => {
    if (currentQuestion && gamePhase === 'playing') {
      console.log('📝 Processing new question:', currentQuestion);
      const convertedQuestion = convertMultiplayerQuestion(currentQuestion);
      
      // Update or add the current question to our questions array
      setGameQuestions(prev => {
        const newQuestions = [...prev];
        const questionIndex = currentQuestion.questionNumber - 1;
        
        // Ensure array is long enough
        while (newQuestions.length <= questionIndex) {
          newQuestions.push({
            question: 'Loading...',
            choices: ['Loading...', 'Loading...', 'Loading...', 'Loading...'],
            correctAnswer: 'a'
          });
        }
        
        newQuestions[questionIndex] = convertedQuestion;
        console.log('📝 Updated game questions array:', newQuestions);
        return newQuestions;
      });
      
      setCurrentQuestionIndex(currentQuestion.questionNumber - 1);
    }
  }, [currentQuestion, gamePhase, convertMultiplayerQuestion]);

  // Create custom game state for GameScreen
  const createGameScreenState = useCallback(() => {
    if (!room || !currentQuestion) {
      console.log('❌ Cannot create game state - missing room or question');
      return undefined;
    }

    const player = room.players.find(p => p.id === playerId);
    const isEliminated = player?.eliminated || false;
    
    const gameState = {
      currentQuestion: currentQuestionIndex,
      selectedChoice: selectedAnswer,
      hoveredChoice: null,
      showResult: false,
      isCorrect: null,
      timeLeft: timeLeft,
      isTimerActive: timeLeft > 0 && !selectedAnswer && !isEliminated,
      lastHoveredChoice: null,
      score: 0, // Will be calculated differently for multiplayer
      gamePhase: isEliminated ? ('gameOver' as const) : ('playing' as const)
    };

    console.log('🎮 Created game screen state:', gameState);
    return gameState;
  }, [room, currentQuestion, playerId, selectedAnswer, timeLeft, currentQuestionIndex]);

  // Handle answer selection from GameScreen
  const handleAnswerSelect = useCallback((choiceId: string) => {
    if (!selectedAnswer && gamePhase === 'playing') {
      console.log('✍️ Answer selected:', choiceId);
      submitAnswer(choiceId);
    }
  }, [selectedAnswer, gamePhase, submitAnswer]);

  // Handle back to lobby
  const handleBackToLobby = () => {
    leaveRoom();
    onBackToLobby();
  };

  // Request camera permission when component mounts
  useEffect(() => {
    if (status === 'idle') {
      console.log('📷 Requesting camera permission...');
      requestPermission();
    }
  }, [status, requestPermission]);

  // DEBUG: Show detailed loading states
  console.log('🔍 Render decision factors:', {
    isConnected,
    cameraStatus: status,
    hasStream: !!stream,
    gamePhase,
    hasRoom: !!room,
    hasCurrentQuestion: !!currentQuestion,
    gameQuestionsLength: gameQuestions.length,
    currentQuestionIndexValid: currentQuestionIndex < gameQuestions.length,
    shouldShowCameraScreen: status !== 'granted' || !stream,
    shouldShowFinishedScreen: gamePhase === 'finished',
    shouldShowLoadingScreen: gameQuestions.length === 0 || currentQuestionIndex >= gameQuestions.length
  });

  // Show connection error
  if (!isConnected) {
    console.log('🚫 Showing connection error screen');
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold mb-4">Connection Lost</h2>
          <p className="text-white/70 mb-6">Lost connection to multiplayer server</p>
          <button
            onClick={handleBackToLobby}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-colors"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  // Show game finished screen
  if (gamePhase === 'finished') {
    console.log('🏁 Showing finished screen');
    const winner = currentQuestion?.winner;
    const isWinner = winner && winner.id === playerId;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 text-center">
            
            {/* Winner Announcement */}
            {winner ? (
              <div className="space-y-6">
                <div className="text-6xl mb-4">🏆</div>
                
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-4">
                  {isWinner ? 'VICTORY!' : 'GAME OVER'}
                </h1>
                
                <div className="space-y-4">
                  <div className="text-2xl text-white">
                    Winner: <span className="text-yellow-400 font-bold">{winner.name}</span>
                  </div>
                  
                  <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl p-6 border border-yellow-500/30">
                    <div className="text-3xl font-bold text-yellow-400 mb-2">
                      {winner.prize?.toFixed(2)} SUI
                    </div>
                    <div className="text-yellow-300">Prize Pool</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-6xl mb-4">🤝</div>
                <h1 className="text-4xl font-bold text-white mb-4">No Winner</h1>
                <p className="text-xl text-white/80">All players were eliminated.</p>
              </div>
            )}
            
            <div className="mt-8 flex gap-4 justify-center">
              <button
                onClick={handleBackToLobby}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-all duration-300"
              >
                Back to Lobby
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show camera permission screen
  if (status !== 'granted' || !stream) {
    console.log('📷 Showing camera permission screen, status:', status);
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 text-center">
            
            {/* DEBUG INFO */}
            <div className="absolute top-4 left-4 bg-blue-800/80 rounded p-2 text-xs text-white">
              <div>Camera Status: {status}</div>
              <div>Has Stream: {stream ? 'Yes' : 'No'}</div>
              <div>Component: Camera Permission</div>
            </div>

            <Camera className="w-16 h-16 text-blue-400 mx-auto mb-6" />
            
            <h2 className="text-2xl font-bold text-white mb-4">Camera Access Required</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-white/80">
                <Users className="w-5 h-5" />
                <span>Multiplayer Game</span>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-yellow-400">
                <Trophy className="w-5 h-5" />
                <span>{room?.prizePool?.toFixed(2)} SUI Prize Pool</span>
              </div>
            </div>
            
            <p className="text-white/70 text-sm mt-6 mb-6">
              Enable camera access to use hand tracking during the multiplayer game.
            </p>
            
            {status === 'denied' && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
                <p className="text-red-300 text-sm">
                  Camera permission denied. Please enable it in your browser settings.
                </p>
              </div>
            )}
            
            <div className="flex gap-4">
              <button
                onClick={requestPermission}
                disabled={status === 'requesting'}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300"
              >
                {status === 'requesting' ? 'Requesting...' : 'Enable Camera'}
              </button>
              
              <button
                onClick={handleBackToLobby}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white rounded-xl transition-all duration-300"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while waiting for game data
  if (gameQuestions.length === 0 || currentQuestionIndex >= gameQuestions.length) {
    console.log('⏳ Showing loading screen - waiting for game data');
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          
          {/* DEBUG INFO */}
          <div className="absolute top-4 left-4 bg-yellow-800/80 rounded p-2 text-xs text-white max-w-xs">
            <div>Component: Loading Game Data</div>
            <div>Questions Length: {gameQuestions.length}</div>
            <div>Current Index: {currentQuestionIndex}</div>
            <div>Has Question: {currentQuestion ? 'Yes' : 'No'}</div>
            <div>Question Number: {currentQuestion?.questionNumber}</div>
            <div>Game Phase: {gamePhase}</div>
            <div>Room State: {room?.state}</div>
          </div>

          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Loading multiplayer game...</p>
          <div className="mt-4 text-sm text-white/70">
            <p>Room: {room?.id}</p>
            <p>Players: {room?.playerCount}</p>
            <p>Prize Pool: {room?.prizePool?.toFixed(2)} SUI</p>
            <p>Game Phase: {gamePhase}</p>
            <p>Questions Loaded: {gameQuestions.length}</p>
            <p>Current Question: {currentQuestion?.questionNumber || 'None'}</p>
          </div>
          
          <button
            onClick={handleBackToLobby}
            className="mt-6 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors text-sm"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  // Create custom GameScreen with multiplayer integration
  console.log('🎮 Rendering GameScreen with multiplayer integration');
  const CustomGameScreen = () => {
    const gameState = createGameScreenState();
    
    // Don't render if no game state
    if (!gameState) {
      console.log('❌ No game state available');
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-xl">Preparing game...</p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="relative">
        
        {/* DEBUG INFO */}
        <div className="absolute top-4 left-4 bg-green-800/80 rounded p-2 text-xs text-white z-50">
          <div>Component: GameScreen Active</div>
          <div>Question: {gameState.currentQuestion + 1}</div>
          <div>Time Left: {gameState.timeLeft}s</div>
          <div>Selected: {gameState.selectedChoice || 'None'}</div>
        </div>

        <GameScreen
          handTrackingEnabled={true}
          cameraStream={stream}
          onBackToPermission={handleBackToLobby}
          customQuestions={gameQuestions}
          isUsingAI={false}
          customGameState={gameState}
          onAnswerSelect={handleAnswerSelect}
          isMultiplayer={true}
        />
        
        {/* Multiplayer Overlay */}
        <MultiplayerOverlay
          room={room}
          playerId={playerId!}
          timeLeft={timeLeft}
          selectedAnswer={selectedAnswer}
          currentQuestion={currentQuestion}
        />
      </div>
    );
  };

  return <CustomGameScreen />;
};

export default MultiplayerGameScreen;