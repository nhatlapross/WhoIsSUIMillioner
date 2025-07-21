'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  useCurrentAccount, 
  useSignAndExecuteTransaction,
  useSuiClient 
} from '@mysten/dapp-kit';
import { 
  FileText, 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  X,
  ExternalLink
} from 'lucide-react';
import { createGameContract } from '@/services/gameContract';

interface ContractSigningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContractSigned: () => void;
}

const ContractSigningModal: React.FC<ContractSigningModalProps> = ({
  isOpen,
  onClose,
  onContractSigned
}) => {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRead, setHasRead] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [alreadySigned, setAlreadySigned] = useState(false);

  const gameContract = useMemo(() => createGameContract(suiClient), [suiClient]);

  // Check if user has already signed the contract
  const checkContractStatus = useCallback(async () => {
    if (!currentAccount?.address || !isOpen) return;
    
    setIsCheckingStatus(true);
    try {
      const hasSigned = await gameContract.hasSignedContract(currentAccount.address);
      setAlreadySigned(hasSigned);
      if (hasSigned) {
        onContractSigned();
      }
    } catch (error) {
      console.error('Error checking contract status:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  }, [currentAccount?.address, isOpen, gameContract, onContractSigned]);

  useEffect(() => {
    checkContractStatus();
  }, [checkContractStatus]);

  const handleSignContract = async () => {
    if (!currentAccount || !hasRead) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const termsVersion = "v1.0.0";
      const transaction = gameContract.createSignContractTx(termsVersion);

      signAndExecuteTransaction({
        transaction
      }, {
        onSuccess: (result) => {
          console.log('Contract signed successfully:', result);
          setAlreadySigned(true);
          // Wait a moment for the blockchain to process the transaction
          setTimeout(() => {
            onContractSigned();
            onClose();
          }, 2000);
        },
        onError: (error) => {
          console.error('Error signing contract:', error);
          setError(error.message || 'Failed to sign contract. Please try again.');
          setIsLoading(false);
        }
      });
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      setError(error.message || 'Failed to create transaction. Please try again.');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Player Agreement</h2>
              <p className="text-sm text-white/60">Required to participate in games</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isCheckingStatus ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3 text-blue-400">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Checking contract status...</span>
              </div>
            </div>
          ) : alreadySigned ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Contract Already Signed</h3>
              <p className="text-white/70 mb-6">
                You have already signed the player agreement and can participate in games.
              </p>
              <button
                onClick={onClose}
                className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Continue to Game
              </button>
            </div>
          ) : (
            <>
              {/* Warning */}
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-yellow-200 text-sm">
                    <strong>Important:</strong> By signing this contract, you agree to the game terms and authorize 
                    the smart contract to handle your game transactions on the Sui blockchain.
                  </div>
                </div>
              </div>

              {/* Terms Content */}
              <div className="bg-white/5 rounded-lg p-6 mb-6 max-h-64 overflow-y-auto">
                <h3 className="text-lg font-bold text-white mb-4">Sui Millionaire Game Agreement v1.0.0</h3>
                
                <div className="space-y-4 text-white/80 text-sm">
                  <div>
                    <h4 className="font-semibold text-white mb-2">1. Game Rules & Entry</h4>
                    <ul className="space-y-1 ml-4">
                      <li>• Entry fees range from 0.1 to 10 SUI tokens</li>
                      <li>• Each game session requires a valid entry fee payment</li>
                      <li>• Questions are generated randomly or by AI</li>
                      <li>• Time limits apply to each question (default: 30 seconds)</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white mb-2">2. Rewards & Payouts</h4>
                    <ul className="space-y-1 ml-4">
                      <li>• Solo games: 0.1 SUI per correct answer</li>
                      <li>• Multiplayer games: Prize pool distributed among winners</li>
                      <li>• Platform fee: 10% of total prize pool</li>
                      <li>• Rewards must be manually claimed after game completion</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white mb-2">3. Smart Contract Terms</h4>
                    <ul className="space-y-1 ml-4">
                      <li>• All transactions are recorded on Sui blockchain</li>
                      <li>• Smart contract handles automatic fee collection</li>
                      <li>• Players retain full custody of their SUI tokens</li>
                      <li>• Contract is auditable and transparent</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white mb-2">4. Player Responsibilities</h4>
                    <ul className="space-y-1 ml-4">
                      <li>• Maintain sufficient SUI balance for entry fees and gas</li>
                      <li>• Play fairly and avoid cheating or exploitation</li>
                      <li>• Understand that blockchain transactions are irreversible</li>
                      <li>• Accept full responsibility for wallet security</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white mb-2">5. Risk Acknowledgment</h4>
                    <ul className="space-y-1 ml-4">
                      <li>• Cryptocurrency values can be volatile</li>
                      <li>• Smart contracts may contain bugs or vulnerabilities</li>
                      <li>• Network congestion may affect transaction timing</li>
                      <li>• Players participate at their own risk</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Terms Acceptance */}
              <div className="mb-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasRead}
                    onChange={(e) => setHasRead(e.target.checked)}
                    className="mt-1 w-4 h-4 text-blue-500 border-2 border-white/30 rounded focus:ring-blue-500 bg-transparent"
                  />
                  <span className="text-white/90 text-sm leading-relaxed">
                    I have read and agree to the game terms above. I understand that signing this contract 
                    will create an on-chain record of my agreement and authorize game transactions.
                  </span>
                </label>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 text-sm">{error}</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSignContract}
                  disabled={!hasRead || isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Signing Contract...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Sign Contract
                    </>
                  )}
                </button>
                
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-6 py-3 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>

              {/* Additional Info */}
              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-blue-200 text-xs">
                    <strong>Blockchain Transaction:</strong> This will create a transaction on the Sui blockchain 
                    that permanently records your agreement. Gas fees will be deducted from your wallet balance.
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractSigningModal;