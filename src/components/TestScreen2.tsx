'use client';
import React, { useState, useEffect } from 'react';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import GameScreen from '@/components/GameScreen2';
import QuestionGenerator from '@/components/QuestionGenerator';
import MobileGameFlow from '@/components/MobileGameFlow';
import { WalletConnection } from '@/components/wallet/WalletConnection';
import ContractSigningModal from '@/components/wallet/ContractSigningModal';
import { useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';
import { useGameTransactions } from '@/hooks/useGameTransactions';
import { QuizQuestion } from '@/types/game';
import { Sparkles, Brain, PlayCircle, Trophy, Users, Zap, Sword, Wallet, Shield } from 'lucide-react';
import Link from 'next/link';
// Remove problematic animation hook import


const TestScreen: React.FC = () => {
  const { status, stream, requestPermission, resetPermission } = useCameraPermission();
  const [showQuestionGenerator, setShowQuestionGenerator] = useState(false);
  const [customQuestions, setCustomQuestions] = useState<QuizQuestion[] | null>(null);
  const [isUsingAI, setIsUsingAI] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [blockchainGameId, setBlockchainGameId] = useState<string | null>(null);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  
  // Remove problematic animation hook

  // Get wallet connection status
  const currentAccount = useCurrentAccount();
  const isWalletConnected = !!currentAccount;
  const { mutate: disconnect } = useDisconnectWallet();
  
  // Get contract status and game transactions
  const { contractStatus, signContract, startSoloGame, refreshContractStatus } = useGameTransactions();
  
  // Fix hydration issues by ensuring client-side detection
  useEffect(() => {
    setIsClient(true);
    
    // Only run on client side
    if (typeof window !== 'undefined') {
      const mobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobile);
      
      const pendingQuestions = localStorage.getItem('pendingQuestions');
      const pendingAI = localStorage.getItem('isUsingAI');
      
      if (pendingQuestions && pendingAI) {
        try {
          const questions = JSON.parse(pendingQuestions);
          console.log('Restored pending questions from localStorage:', questions);
          setCustomQuestions(questions);
          setIsUsingAI(pendingAI === 'true');
          
          // Clear the stored data
          localStorage.removeItem('pendingQuestions');
          localStorage.removeItem('isUsingAI');
        } catch (error) {
          console.error('Failed to restore pending questions:', error);
        }
      }
    }
  }, []);
  // Create blockchain game before starting
  const createBlockchainGame = async () => {
    if (!isWalletConnected || !contractStatus.isSigned) {
      console.error('❌ Cannot create blockchain game - wallet not connected or contract not signed');
      return;
    }

    setIsCreatingGame(true);
    try {
      const entryFee = 0.1; // 0.1 SUI entry fee
      const gameType = isUsingAI ? 'ai' : 'normal';
      
      console.log('🚀 Creating blockchain game with entry fee:', entryFee, 'SUI');
      const gameId = await startSoloGame(entryFee, gameType);
      
      if (!gameId || gameId === 'unknown') {
        throw new Error('Invalid game ID received from blockchain');
      }
      
      setBlockchainGameId(gameId);
      console.log('✅ Blockchain game created with ID:', gameId);
    } catch (error: any) {
      console.error('❌ Failed to create blockchain game:', error);
      // Could show error message to user here
    } finally {
      setIsCreatingGame(false);
    }
  };

  const handleContractSigned = () => {
    console.log('✅ Contract signed successfully');
    setShowContractModal(false);
    refreshContractStatus();
  };

  const handleBackToPermission = () => {
    console.log('Returning to permission screen');
    resetPermission();
    setCustomQuestions(null);
    setIsUsingAI(false);
    setBlockchainGameId(null);
    setIsCreatingGame(false);
    // Clear any stored data
    localStorage.removeItem('pendingQuestions');
    localStorage.removeItem('isUsingAI');
    localStorage.removeItem('bypassLandscapePrompt');
  };

  const handlePlaySingleMode = () => {
    // Check if contract is signed before starting game
    if (!contractStatus.isSigned) {
      setShowContractModal(true);
      return;
    }
    
    setIsUsingAI(false);
    requestPermission();
  };
  

  const handlePlayWithAI = () => {
    setShowQuestionGenerator(true);
  };

  const handleQuestionsGenerated = (questions: QuizQuestion[]) => {
    console.log('Questions generated:', questions);
    setCustomQuestions(questions);
    setIsUsingAI(true);
    
    // Store in localStorage to persist across navigation
    localStorage.setItem('pendingQuestions', JSON.stringify(questions));
    localStorage.setItem('isUsingAI', 'true');
    
    // For mobile, we'll handle camera permission in the MobileGameFlow component
    if (!isMobile) {
      // For desktop, proceed normally
      requestPermission();
    }
  };

  // Use MobileGameFlow for mobile devices with custom questions - only after client-side hydration
  if (isClient && isMobile && customQuestions && isUsingAI) {
    console.log('Using MobileGameFlow for mobile device');
    return (
      <MobileGameFlow
        customQuestions={customQuestions}
        isUsingAI={isUsingAI}
        onBackToMenu={handleBackToPermission}
      />
    );
  }

  // Show game screen for desktop if we have camera permission AND wallet/contract requirements are met
  if (status === 'granted' && stream) {
    // Check if wallet is connected and contract is signed for blockchain games
    if (!isWalletConnected) {
      console.log('⚠️ Wallet not connected - showing wallet connection requirement');
      // Show wallet connection requirement
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
            <Wallet className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4">Wallet Required</h2>
            <p className="text-white/70 mb-6">
              Connect your Sui wallet to play blockchain games and earn real SUI tokens.
            </p>
            <WalletConnection />
            <button
              onClick={handleBackToPermission}
              className="mt-4 text-white/50 hover:text-white transition-colors"
            >
              ← Back to Menu
            </button>
          </div>
        </div>
      );
    } else if (!contractStatus.isSigned && !contractStatus.isLoading) {
      console.log('⚠️ Contract not signed - showing contract modal');
      // Show contract signing modal
      if (!showContractModal) {
        setShowContractModal(true);
      }
    } else if (contractStatus.isSigned) {
      // If we don't have a blockchain game ID yet, create one
      if (!blockchainGameId && !isCreatingGame) {
        console.log('🎮 Contract signed, creating blockchain game...');
        createBlockchainGame();
        // Return loading state while creating game
        return (
          <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-xl">Creating blockchain game...</p>
              <p className="text-sm text-white/70 mt-2">This will deduct {isUsingAI ? '0.1' : '0.1'} SUI as entry fee</p>
            </div>
          </div>
        );
      }

      // If still creating game, show loading
      if (isCreatingGame) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-xl">Creating blockchain game...</p>
              <p className="text-sm text-white/70 mt-2">This will deduct {isUsingAI ? '0.1' : '0.1'} SUI as entry fee</p>
            </div>
          </div>
        );
      }

      // If we have a blockchain game ID, start the game
      if (blockchainGameId) {
        console.log('✅ Entering game screen with blockchain game:', {
          status,
          hasStream: !!stream,
          hasQuestions: !!customQuestions,
          isUsingAI,
          handTrackingEnabled: status === 'granted' && !!stream,
          walletConnected: isWalletConnected,
          contractSigned: contractStatus.isSigned,
          blockchainGameId
        });
        
        return (
          <GameScreen
            handTrackingEnabled={status === 'granted' && !!stream}
            cameraStream={stream}
            onBackToPermission={handleBackToPermission}
            customQuestions={customQuestions}
            isUsingAI={isUsingAI}
            blockchainGameId={blockchainGameId}
          />
        );
      }
    }
    // If contract is loading, fall through to show main screen with loading state
  }

  // Main menu screen with left/right layout
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Top Navigation */}
        <div className="flex justify-between items-center mb-8">
          <div className="text-2xl font-bold text-white">
            🎮 Sui Millionaire
          </div>
          
          {/* Manager Access (show for admin wallets only) */}
          {isWalletConnected && currentAccount?.address && [
            '0x319be95b803c7746dc696516f8d91f16443a6fd16e971700e1d76b47da9a8dd1'
          ].includes(currentAccount.address) && (
            <Link href="/manager">
              <button className="bg-green-600/20 hover:bg-green-600/40 text-green-400 font-bold py-2 px-4 rounded-lg border border-green-500/30 transition-colors flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Manager Panel
              </button>
            </Link>
          )}
        </div>

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
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 card-animated stagger-animation">
                <div className="text-3xl mb-3">🎮</div>
                <div className="text-2xl font-bold text-white mb-1">Interactive</div>
                <div className="text-white/70">Hand Tracking</div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 card-animated stagger-animation">
                <div className="text-3xl mb-3">💰</div>
                <div className="text-2xl font-bold text-white mb-1">Earn SUI</div>
                <div className="text-white/70">Real Rewards</div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 card-animated stagger-animation">
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

          {/* RIGHT SIDE - Wallet & Game Modes */}
          <div className="flex flex-col justify-center space-y-8">
            {!isWalletConnected && (
              <div className="bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/20">
                <WalletConnection />
              </div>
            )}


            {/* Game Modes - Only show when wallet is connected */}
            {isWalletConnected && (
              <>

                <div className="bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/20">
                  <div className="flex items-center justify-between mb-6">
                    {/* Left side - Wallet information */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                        <Wallet className="w-4 h-4 text-green-400" />
                      </div>
                      <div>
                        <p className="text-green-300 text-sm">Connected</p>
                        <p className="text-white font-mono text-xs">
                          {currentAccount?.address ? 
                            `${currentAccount.address.slice(0, 6)}...${currentAccount.address.slice(-4)}` : 
                            'Loading...'
                          }
                        </p>
                      </div>
                    </div>

                    {/* Right side - Disconnect button */}
                    <button onClick={() => disconnect()}>
                      Disconnect
                    </button>
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-6 text-center">Choose Your Mode</h3>

                  {/* Contract Status */}
                  <div className="mb-6">
                    {contractStatus.isLoading ? (
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-blue-400">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent"></div>
                          <span className="text-sm">Checking contract status...</span>
                        </div>
                      </div>
                    ) : contractStatus.isSigned ? (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-green-400">
                          <div className="w-4 h-4 bg-green-400 rounded-full"></div>
                          <span className="text-sm font-medium">Contract signed - Ready to play!</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-yellow-400">
                          <div className="w-4 h-4 bg-yellow-400 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium">Contract signature required to play</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    {/* SINGLE Mode */}
                    <div className="space-y-4">
                      <button
                        onClick={handlePlaySingleMode}
                        disabled={status === 'requesting'}
                        className="group relative w-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 hover:from-purple-400 hover:via-pink-400 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-8 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl disabled:hover:scale-100 button-primary"
                      >
                        <div className="flex items-center justify-center gap-4">
                          <Brain className="w-8 h-8" />
                          <span className="text-2xl">SINGLE MODE</span>
                          <Sparkles className="w-8 h-8" />
                        </div>

                        {/* Glow effect */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 blur-xl group-hover:blur-2xl transition-all duration-300 -z-10"></div>
                      </button>

                      <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-xl p-4 border border-purple-500/20">
                        <h4 className="text-purple-300 font-bold mb-2">🤖 AI Generated</h4>
                        <p className="text-white/70 text-sm">
                          Single player mode with new question everyday!
                        </p>
                      </div>
                    </div>

                    {/* Multiplayer Mode */}
                    <div className="space-y-4">
                      <Link href="/multiplayer">
                        <button className="group relative w-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-400 hover:via-emerald-400 hover:to-teal-400 text-white font-bold py-8 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl button-primary">
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
              </>
            )}

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
          <h3 className="text-3xl font-bold text-white mb-8 text-center">How to Play & Earn</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-2xl">🔗</span>
              </div>
              <h4 className="text-xl font-bold text-white">Connect Wallet</h4>
              <p className="text-white/70">
                Link your Sui wallet to start earning tokens and track your progress
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-2xl">👆</span>
              </div>
              <h4 className="text-xl font-bold text-white">Point Your Finger</h4>
              <p className="text-white/70">
                Use your index finger to point at the answer you want to select
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-2xl">⏱️</span>
              </div>
              <h4 className="text-xl font-bold text-white">15 Second Timer</h4>
              <p className="text-white/70">
                You have 15 seconds to answer each question before auto-select
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-2xl">💎</span>
              </div>
              <h4 className="text-xl font-bold text-white">Earn SUI Tokens</h4>
              <p className="text-white/70">
                Get rewarded with real SUI tokens for correct answers and victories
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-white/60 text-sm">
              Compatible with all modern browsers • Best experience with good lighting 🌟 • Wallet connection required for rewards 💰
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

      {/* Contract Signing Modal */}
      <ContractSigningModal
        isOpen={showContractModal}
        onClose={() => setShowContractModal(false)}
        onContractSigned={handleContractSigned}
      />
    </div>
  );
};

export default TestScreen;