'use client';
import React, { useState, useEffect, useRef } from 'react';
import { 
  ConnectButton, 
  useCurrentAccount, 
  useWallets, 
  useConnectWallet,
  useDisconnectWallet,
  useCurrentWallet,
  useSuiClientQuery
} from '@mysten/dapp-kit';
// Remove problematic animation hook import
import { 
  Wallet, 
  Copy, 
  Check, 
  ExternalLink, 
  LogOut, 
  Coins,
  User,
  Settings,
  Shield,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export function WalletConnection() {
  const currentAccount = useCurrentAccount();
  const { currentWallet } = useCurrentWallet();
  const wallets = useWallets();
  const { mutate: connect } = useConnectWallet();
  const { mutate: disconnect } = useDisconnectWallet();
  const [copied, setCopied] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Fix hydration issues by ensuring client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Query user's SUI balance - only on client side
  const { data: balance, isLoading: balanceLoading } = useSuiClientQuery(
    'getBalance',
    { owner: currentAccount?.address || '', coinType: '0x2::sui::SUI' },
    { enabled: !!currentAccount && isClient }
  );

  // Query user's objects - only on client side
  const { data: objects } = useSuiClientQuery(
    'getOwnedObjects',
    { 
      owner: currentAccount?.address || '',
      options: { showType: true, showContent: true, showDisplay: true }
    },
    { enabled: !!currentAccount && isClient }
  );

  const copyAddress = async () => {
    if (currentAccount?.address) {
      await navigator.clipboard.writeText(currentAccount.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string) => {
    const sui = parseFloat(balance) / 1_000_000_000; // Convert from MIST to SUI
    return sui.toFixed(4);
  };

  const getExplorerUrl = (address: string) => {
    return `https://suiscan.xyz/mainnet/account/${address}`;
  };

  // Remove problematic animation effects

  // Prevent hydration mismatch by showing loading state until client-side
  if (!isClient) {
    return (
      <div className="wallet-connection">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 animate-scale-in">
          <div className="text-center mb-6">
            <Wallet className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h3>
            <p className="text-white/70">Loading wallet options...</p>
          </div>
          <div className="flex justify-center">
            <div className="loading-spinner rounded-full h-8 w-8 border-4 border-blue-300 border-t-transparent"></div>
          </div>
        </div>
      </div>
    );
  }

  // Not connected state
  if (!currentAccount) {
    return (
      <div className="wallet-connection">
        <div 
          ref={containerRef}
          className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 animate-scale-in"
        >
          <div className="text-center mb-6">
            <Wallet className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h3>
            <p className="text-white/70">Connect your Sui wallet to start playing and earning SUI tokens</p>
          </div>

          {/* Official Connect Button */}
          <div className="mb-6">
            <ConnectButton 
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 button-primary wallet-connect-pulse"
              connectText="Connect Wallet"
            />
          </div>

          {/* Manual wallet selection */}
          {wallets.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-white/60 text-center">Or choose a specific wallet:</p>
              <div className="grid grid-cols-1 gap-2">
                {wallets.filter(wallet => 
                  ['Sui Wallet', 'Suiet', 'Ethos Wallet', 'Martian Wallet'].includes(wallet.name)
                ).map((wallet) => (
                  <button
                    key={wallet.name}
                    onClick={() => connect({ wallet })}
                    className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg transition-all duration-200 hover:scale-[1.02] button-primary"
                  >
                    {wallet.icon && (
                      <img 
                        src={wallet.icon} 
                        alt={`${wallet.name} icon`}
                        className="w-6 h-6"
                      />
                    )}
                    <span className="text-white font-medium">{wallet.name}</span>
                    {wallet.name === 'Sui Wallet' && (
                      <span className="ml-auto text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">
                        Recommended
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Features info */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <h4 className="text-blue-300 font-medium mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              What you can do:
            </h4>
            <ul className="text-sm text-blue-200 space-y-1">
              <li>• Play quiz games and earn SUI tokens</li>
              <li>• Compete in multiplayer tournaments</li>
              <li>• Claim and withdraw your winnings</li>
              <li>• Track your game statistics</li>
            </ul>
          </div>

          {/* Security notice */}
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-yellow-200 text-xs">
                <strong>Security Notice:</strong> Only connect wallets you trust. We never ask for your private keys or seed phrases.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Connected state
  return (
    <div className="wallet-connected">
      <div 
        ref={containerRef}
        className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 wallet-connected animate-scale-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Wallet Connected</h3>
              <p className="text-sm text-white/60 flex items-center gap-2">
                {currentWallet?.icon && (
                  <img src={currentWallet.icon} alt="wallet" className="w-4 h-4" />
                )}
                {currentWallet?.name || 'Unknown Wallet'}
              </p>
            </div>
          </div>
          <button
            onClick={() => disconnect()}
            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Disconnect Wallet"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Account Info */}
        <div className="space-y-4">
          {/* Address */}
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/60">Address</p>
              <p className="text-white font-mono text-sm truncate" title={currentAccount.address}>
                {formatAddress(currentAccount.address)}
              </p>
            </div>
            <button
              onClick={copyAddress}
              className="p-2 text-gray-400 hover:text-white transition-colors ml-2"
              title="Copy Full Address"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Balance */}
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div className="flex-1">
              <p className="text-sm text-white/60">SUI Balance</p>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-yellow-400" />
                {balanceLoading ? (
                  <div className="animate-pulse bg-white/20 h-5 w-20 rounded"></div>
                ) : (
                  <p className="text-white font-bold">
                    {balance ? formatBalance(balance.totalBalance) : '0.0000'} SUI
                  </p>
                )}
              </div>
            </div>
            <a
              href={getExplorerUrl(currentAccount.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="View on Explorer"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Objects Count */}
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div className="flex-1">
              <p className="text-sm text-white/60">Objects Owned</p>
              <p className="text-white font-bold flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                {objects?.data?.length || 0} objects
              </p>
            </div>
            <Settings className="w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button 
            onClick={() => window.open(getExplorerUrl(currentAccount.address), '_blank')}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 button-primary"
          >
            <ExternalLink className="w-4 h-4" />
            Explorer
          </button>
          <button
            onClick={copyAddress}
            className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 button-primary"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Game Status */}
        <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg success-bounce">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-300 font-medium">Ready to Play!</span>
          </div>
          <p className="text-sm text-green-200">
            Your wallet is connected and ready for gameplay. Start earning SUI tokens!
          </p>
        </div>

        {/* Balance Warning */}
        {balance && parseFloat(balance.totalBalance) < 100000000 && ( // Less than 0.1 SUI
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-yellow-200 text-xs">
                <strong>Low Balance:</strong> Consider adding more SUI to your wallet for game entry fees and transactions.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}