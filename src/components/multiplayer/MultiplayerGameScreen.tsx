// components/multiplayer/MultiplayerGameScreen.tsx - COMPLETE CLEANED VERSION
'use client';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import GameScreen from '@/components/GameScreen2';
import MultiplayerOverlay from '@/components/multiplayer/MultiplayerOverlay';
import AnswerTracker from '@/components/multiplayer/AnswerTracker';
import { QuizQuestion } from '@/types/game';
import { Camera, Users, Trophy, AlertCircle } from 'lucide-react';

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
  
  const gameQuestionsRef = useRef<QuizQuestion[]>([]);
  const currentQuestionIndexRef = useRef(0);
  const [renderKey, setRenderKey] = useState(0);
  const [hoveredChoice, setHoveredChoice] = useState<string | null>(null);
  const [localSelectedAnswer, setLocalSelectedAnswer] = useState<string | null>(null);

  const convertMultiplayerQuestion = useCallback((mpQuestion: any): QuizQuestion => {
    return {
      question: mpQuestion.question,
      choices: mpQuestion.choices,
      correctAnswer: mpQuestion.correctAnswer || 'a'
    };
  }, []);

  const handleAnswerSelect = useCallback((choiceId: string) => {
    if (selectedAnswer || localSelectedAnswer || gamePhase !== 'playing') {
      return;
    }

    setLocalSelectedAnswer(choiceId);
    submitAnswer(choiceId);
  }, [selectedAnswer, localSelectedAnswer, gamePhase, submitAnswer]);

  const handleHoverChange = useCallback((choiceId: string | null) => {
    setHoveredChoice(choiceId);
  }, []);

  const handleAnswerTrackerUpdate = useCallback((answer: string) => {
    setLocalSelectedAnswer(answer);
  }, []);

  const handleBackToLobby = useCallback(() => {
    leaveRoom();
    onBackToLobby();
  }, [leaveRoom, onBackToLobby]);

  const gameScreenState = useMemo(() => {
    if (!room || !currentQuestion) return undefined;

    const player = room.players.find(p => p.id === playerId);
    const isEliminated = player?.eliminated || false;
    const effectiveSelectedAnswer = selectedAnswer || localSelectedAnswer;
    
    return {
      currentQuestion: currentQuestionIndexRef.current,
      selectedChoice: effectiveSelectedAnswer,
      hoveredChoice: hoveredChoice,
      showResult: false,
      isCorrect: null,
      timeLeft: timeLeft,
      isTimerActive: false,
      lastHoveredChoice: hoveredChoice,
      score: 0,
      gamePhase: isEliminated ? ('gameOver' as const) : ('playing' as const)
    };
  }, [room?.id, currentQuestion?.questionNumber, playerId, selectedAnswer, localSelectedAnswer, hoveredChoice, timeLeft, renderKey]);

  const gameScreenProps = useMemo(() => ({
    handTrackingEnabled: true,
    cameraStream: stream,
    onBackToPermission: handleBackToLobby,
    customQuestions: gameQuestionsRef.current,
    isUsingAI: false,
    customGameState: gameScreenState,
    onAnswerSelect: handleAnswerSelect,
    onHoverChange: handleHoverChange,
    isMultiplayer: true
  }), [stream, handleBackToLobby, gameScreenState, handleAnswerSelect, handleHoverChange]);

  // Reset answer tracking when question changes
  useEffect(() => {
    setHoveredChoice(null);
    setLocalSelectedAnswer(null);
  }, [currentQuestion?.questionNumber]);

  // Sync with server selected answer
  useEffect(() => {
    if (selectedAnswer && selectedAnswer !== localSelectedAnswer) {
      setLocalSelectedAnswer(selectedAnswer);
    }
  }, [selectedAnswer, localSelectedAnswer]);

  useEffect(() => {
    if (currentQuestion && gamePhase === 'playing') {
      const convertedQuestion = convertMultiplayerQuestion(currentQuestion);
      const questionIndex = currentQuestion.questionNumber - 1;
      
      while (gameQuestionsRef.current.length <= questionIndex) {
        gameQuestionsRef.current.push({
          question: 'Loading...',
          choices: ['Loading...', 'Loading...', 'Loading...', 'Loading...'],
          correctAnswer: 'a'
        });
      }
      
      gameQuestionsRef.current[questionIndex] = convertedQuestion;
      currentQuestionIndexRef.current = questionIndex;
      setRenderKey(prev => prev + 1);
    }
  }, [currentQuestion?.questionNumber, gamePhase, convertMultiplayerQuestion]);

  useEffect(() => {
    if (status === 'idle') {
      requestPermission();
    }
  }, [status, requestPermission]);

  if (!isConnected) {
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

  if (gamePhase === 'finished') {
    const winner = currentQuestion?.winner;
    const isWinner = winner && winner.id === playerId;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 text-center">
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

  if (status !== 'granted' || !stream) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 text-center">
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

  if (gameQuestionsRef.current.length === 0 || currentQuestionIndexRef.current >= gameQuestionsRef.current.length || !gameScreenState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Loading multiplayer game...</p>
          <div className="mt-4 text-sm text-white/70">
            <p>Room: {room?.id}</p>
            <p>Players: {room?.playerCount}</p>
            <p>Prize Pool: {room?.prizePool?.toFixed(2)} SUI</p>
            <p>Game Phase: {gamePhase}</p>
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

  return (
    <div className="relative" key={renderKey}>
      <GameScreen {...gameScreenProps} />
      
      <AnswerTracker
        hoveredChoice={hoveredChoice}
        selectedAnswer={selectedAnswer || localSelectedAnswer}
        gamePhase={gamePhase}
        timeLeft={timeLeft}
        onAnswerUpdate={handleAnswerTrackerUpdate}
      />
      
      <MultiplayerOverlay
        room={room}
        playerId={playerId!}
        timeLeft={timeLeft}
        selectedAnswer={selectedAnswer || localSelectedAnswer}
        currentQuestion={currentQuestion}
      />
    </div>
  );
};

export default MultiplayerGameScreen;