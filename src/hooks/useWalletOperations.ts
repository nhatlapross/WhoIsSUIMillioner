import { useState, useCallback, useEffect } from 'react';
import { 
  useCurrentAccount, 
  useSignAndExecuteTransaction, 
  useSuiClientQuery,
  useCurrentWallet,
  useSuiClient
} from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

export interface WalletOperationsState {
  isProcessing: boolean;
  lastTransaction: any;
  error: string | null;
}

export function useWalletOperations() {
  const currentAccount = useCurrentAccount();
  const { currentWallet } = useCurrentWallet();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const client = useSuiClient();
  
  const [state, setState] = useState<WalletOperationsState>({
    isProcessing: false,
    lastTransaction: null,
    error: null
  });

  // Query balance with auto-refresh
  const { data: balance, refetch: refetchBalance } = useSuiClientQuery(
    'getBalance',
    { owner: currentAccount?.address || '', coinType: '0x2::sui::SUI' },
    { 
      enabled: !!currentAccount,
      refetchInterval: 30000 // Refresh every 30 seconds
    }
  );

  // Query gas objects
  const { data: gasObjects, refetch: refetchGasObjects } = useSuiClientQuery(
    'getCoins',
    { 
      owner: currentAccount?.address || '', 
      coinType: '0x2::sui::SUI' 
    },
    { enabled: !!currentAccount }
  );

  // Query owned objects
  const { data: ownedObjects } = useSuiClientQuery(
    'getOwnedObjects',
    { 
      owner: currentAccount?.address || '',
      options: { showType: true, showContent: true, showDisplay: true }
    },
    { enabled: !!currentAccount }
  );

  // Execute any transaction with proper error handling
  const executeTransaction = useCallback(async (
    transaction: Transaction, 
    options: {
      onSuccess?: (result: any) => void;
      onError?: (error: any) => void;
      onFinally?: () => void;
    } = {}
  ) => {
    if (!currentAccount) {
      throw new Error('No wallet connected');
    }

    setState(prev => ({ ...prev, isProcessing: true, error: null }));
    
    try {
      return new Promise((resolve, reject) => {
        signAndExecuteTransaction(
          { transaction },
          {
            onSuccess: (result) => {
              console.log('✅ Transaction successful:', result);
              setState(prev => ({ 
                ...prev, 
                isProcessing: false, 
                lastTransaction: result,
                error: null 
              }));
              
              // Refresh balance after successful transaction
              setTimeout(() => {
                refetchBalance();
                refetchGasObjects();
              }, 2000);
              
              options.onSuccess?.(result);
              resolve(result);
            },
            onError: (error) => {
              console.error('❌ Transaction failed:', error);
              const errorMessage = error?.message || 'Transaction failed';
              setState(prev => ({ 
                ...prev, 
                isProcessing: false, 
                error: errorMessage 
              }));
              
              options.onError?.(error);
              reject(error);
            }
          }
        );
      });
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: 'Failed to create transaction' 
      }));
      throw error;
    } finally {
      options.onFinally?.();
    }
  }, [currentAccount, signAndExecuteTransaction, refetchBalance, refetchGasObjects]);

  // Transfer SUI tokens
  const transferSui = useCallback(async (
    recipientAddress: string, 
    amount: number,
    options?: { onSuccess?: (result: any) => void; onError?: (error: any) => void; }
  ) => {
    if (!currentAccount) throw new Error('No wallet connected');
    
    const tx = new Transaction();
    const amountInMist = Math.floor(amount * 1_000_000_000); // Convert SUI to MIST
    
    // Split coins and transfer
    const [coin] = tx.splitCoins(tx.gas, [amountInMist]);
    tx.transferObjects([coin], recipientAddress);
    
    // Set gas budget (0.1 SUI should be enough for simple transfers)
    tx.setGasBudget(100_000_000);
    
    return executeTransaction(tx, options);
  }, [currentAccount, executeTransaction]);

  // Pay game entry fee
  const payEntryFee = useCallback(async (
    gameContractAddress: string,
    amount: number,
    options?: { onSuccess?: (result: any) => void; onError?: (error: any) => void; }
  ) => {
    if (!currentAccount) throw new Error('No wallet connected');
    
    const tx = new Transaction();
    const amountInMist = Math.floor(amount * 1_000_000_000);
    
    // Split coins for entry fee
    const [coin] = tx.splitCoins(tx.gas, [amountInMist]);
    
    // Example: Call game contract (you'll need to implement your actual contract call)
    // tx.moveCall({
    //   target: `${gameContractAddress}::game::pay_entry_fee`,
    //   arguments: [coin, tx.pure(amountInMist)]
    // });
    
    // For now, just transfer to game contract address
    tx.transferObjects([coin], gameContractAddress);
    tx.setGasBudget(200_000_000);
    
    return executeTransaction(tx, options);
  }, [currentAccount, executeTransaction]);

  // Claim game rewards (this would interact with your smart contract)
  const claimRewards = useCallback(async (
    gameContractAddress: string,
    sessionId: string,
    expectedAmount: number,
    options?: { onSuccess?: (result: any) => void; onError?: (error: any) => void; }
  ) => {
    if (!currentAccount) throw new Error('No wallet connected');
    
    const tx = new Transaction();
    
    // Example smart contract call for claiming rewards
    // tx.moveCall({
    //   target: `${gameContractAddress}::game::claim_rewards`,
    //   arguments: [
    //     tx.pure(sessionId),
    //     tx.pure(currentAccount.address),
    //     tx.pure(expectedAmount)
    //   ]
    // });
    
    // For demo purposes, we'll create a placeholder transaction
    // In production, this should call your actual reward claiming contract
    tx.setGasBudget(300_000_000);
    
    return executeTransaction(tx, options);
  }, [currentAccount, executeTransaction]);

  // Create multiplayer room with entry fee
  const createMultiplayerRoom = useCallback(async (
    gameContractAddress: string,
    entryFee: number,
    maxPlayers: number,
    options?: { onSuccess?: (result: any) => void; onError?: (error: any) => void; }
  ) => {
    if (!currentAccount) throw new Error('No wallet connected');
    
    const tx = new Transaction();
    const entryFeeInMist = Math.floor(entryFee * 1_000_000_000);
    
    // Pay entry fee for room creation
    const [coin] = tx.splitCoins(tx.gas, [entryFeeInMist]);
    
    // Example contract call
    // tx.moveCall({
    //   target: `${gameContractAddress}::multiplayer::create_room`,
    //   arguments: [
    //     coin,
    //     tx.pure(maxPlayers),
    //     tx.pure(entryFeeInMist)
    //   ]
    // });
    
    tx.transferObjects([coin], gameContractAddress);
    tx.setGasBudget(300_000_000);
    
    return executeTransaction(tx, options);
  }, [currentAccount, executeTransaction]);

  // Join multiplayer room
  const joinMultiplayerRoom = useCallback(async (
    gameContractAddress: string,
    roomId: string,
    entryFee: number,
    options?: { onSuccess?: (result: any) => void; onError?: (error: any) => void; }
  ) => {
    if (!currentAccount) throw new Error('No wallet connected');
    
    const tx = new Transaction();
    const entryFeeInMist = Math.floor(entryFee * 1_000_000_000);
    
    const [coin] = tx.splitCoins(tx.gas, [entryFeeInMist]);
    
    // Example contract call
    // tx.moveCall({
    //   target: `${gameContractAddress}::multiplayer::join_room`,
    //   arguments: [
    //     tx.pure(roomId),
    //     coin
    //   ]
    // });
    
    tx.transferObjects([coin], gameContractAddress);
    tx.setGasBudget(300_000_000);
    
    return executeTransaction(tx, options);
  }, [currentAccount, executeTransaction]);

  // Sign a personal message (for authentication/verification)
  const signMessage = useCallback(async (
    message: string,
    options?: { onSuccess?: (result: any) => void; onError?: (error: any) => void; }
  ) => {
    if (!currentAccount || !currentWallet) {
      throw new Error('No wallet connected');
    }

    try {
      // Check if wallet supports personal message signing
      if (currentWallet.features?.['sui:signPersonalMessage']) {
        const result = await currentWallet.features['sui:signPersonalMessage'].signPersonalMessage({
          message: new TextEncoder().encode(message),
          account: currentAccount
        });
        
        options?.onSuccess?.(result);
        return result;
      } else {
        throw new Error('Wallet does not support message signing');
      }
    } catch (error: any) {
      options?.onError?.(error);
      throw error;
    }
  }, [currentAccount, currentWallet]);

  // Get transaction history
  const getTransactionHistory = useCallback(async (limit: number = 10) => {
    if (!currentAccount) return [];
    
    try {
      const result = await client.queryTransactionBlocks({
        filter: {
          FromAddress: currentAccount.address
        },
        options: {
          showEffects: true,
          showInput: true,
          showEvents: true,
          showObjectChanges: true,
          showBalanceChanges: true
        },
        limit,
        order: 'descending'
      });
      
      return result.data;
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      return [];
    }
  }, [currentAccount, client]);

  // Check if address is valid Sui address
  const isValidSuiAddress = useCallback((address: string): boolean => {
    try {
      // Basic validation for Sui addresses (starts with 0x and is 64 chars long)
      return /^0x[a-fA-F0-9]{64}$/.test(address);
    } catch {
      return false;
    }
  }, []);

  // Helper functions
  const formatBalance = useCallback((balance: string) => {
    const sui = parseFloat(balance) / 1_000_000_000;
    return sui.toFixed(4);
  }, []);

  const getBalanceInSui = useCallback(() => {
    if (!balance) return 0;
    return parseFloat(balance.totalBalance) / 1_000_000_000;
  }, [balance]);

  const getBalanceInMist = useCallback(() => {
    if (!balance) return 0;
    return parseFloat(balance.totalBalance);
  }, [balance]);

  const hasEnoughBalance = useCallback((requiredAmount: number) => {
    const currentBalance = getBalanceInSui();
    return currentBalance >= requiredAmount + 0.01; // Add 0.01 SUI buffer for gas
  }, [getBalanceInSui]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const resetState = useCallback(() => {
    setState({
      isProcessing: false,
      lastTransaction: null,
      error: null
    });
  }, []);

  // Auto-clear errors after 10 seconds
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        clearError();
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [state.error, clearError]);

  return {
    // State
    currentAccount,
    currentWallet,
    balance: balance ? formatBalance(balance.totalBalance) : '0.0000',
    balanceInSui: getBalanceInSui(),
    balanceInMist: getBalanceInMist(),
    gasObjects: gasObjects?.data || [],
    ownedObjects: ownedObjects?.data || [],
    isProcessing: state.isProcessing,
    lastTransaction: state.lastTransaction,
    error: state.error,
    
    // Basic Operations
    transferSui,
    signMessage,
    getTransactionHistory,
    executeTransaction,
    
    // Game Operations
    payEntryFee,
    claimRewards,
    createMultiplayerRoom,
    joinMultiplayerRoom,
    
    // Data Refresh
    refetchBalance,
    refetchGasObjects,
    
    // Utils
    formatBalance,
    hasEnoughBalance,
    isValidSuiAddress,
    clearError,
    resetState,
    
    // Status
    isConnected: !!currentAccount,
    isWalletConnected: !!currentWallet,
    hasGasObjects: (gasObjects?.data?.length || 0) > 0,
    hasOwnedObjects: (ownedObjects?.data?.length || 0) > 0
  };
}