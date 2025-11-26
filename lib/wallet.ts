import { createConfig, configureChains, mainnet } from 'wagmi';
import { polygon, polygonMumbai } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask';
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect';
import { InjectedConnector } from 'wagmi/connectors/injected';

// Custom Polygon configuration
const polygonChain = {
  ...polygon,
  rpcUrls: {
    default: {
      http: ['https://polygon-rpc.com/'],
    },
    public: {
      http: ['https://polygon-rpc.com/'],
    },
  },
};

const mumbaiChain = {
  ...polygonMumbai,
  rpcUrls: {
    default: {
      http: ['https://rpc-mumbai.maticvigil.com/'],
    },
    public: {
      http: ['https://rpc-mumbai.maticvigil.com/'],
    },
  },
};

// Configure chains and providers
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [polygonChain, mumbaiChain],
  [
    jsonRpcProvider({
      rpc: (chain) => ({
        http: chain.rpcUrls.default.http[0],
      }),
    }),
    publicProvider(),
  ]
);

// Create wagmi config
export const wagmiConfig = createConfig({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({
      chains,
      options: {
        shimDisconnect: true,
      },
    }),
    new InjectedConnector({
      chains,
      options: {
        name: 'OKX Wallet',
        shimDisconnect: true,
      },
    }),
    new WalletConnectConnector({
      chains,
      options: {
        projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
        metadata: {
          name: 'DeMailX',
          description: 'Decentralized Email System',
          url: 'https://demailx.com',
          icons: ['https://demailx.com/icon.png'],
        },
      },
    }),
  ],
  publicClient,
  webSocketPublicClient,
});

export { chains };

// Wallet connection utilities
export class WalletService {
  private static instance: WalletService;

  public static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  /**
   * Check if MetaMask is installed
   */
  isMetaMaskInstalled(): boolean {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  }

  /**
   * Check if OKX Wallet is installed
   */
  isOKXInstalled(): boolean {
    return typeof window !== 'undefined' && typeof window.okxwallet !== 'undefined';
  }

  /**
   * Get available wallets
   */
  getAvailableWallets(): Array<{
    name: string;
    id: string;
    icon: string;
    installed: boolean;
    downloadUrl?: string;
  }> {
    return [
      {
        name: 'MetaMask',
        id: 'metamask',
        icon: '/icons/metamask.svg',
        installed: this.isMetaMaskInstalled(),
        downloadUrl: 'https://metamask.io/download/',
      },
      {
        name: 'OKX Wallet',
        id: 'okx',
        icon: '/icons/okx.svg',
        installed: this.isOKXInstalled(),
        downloadUrl: 'https://www.okx.com/web3',
      },
      {
        name: 'WalletConnect',
        id: 'walletconnect',
        icon: '/icons/walletconnect.svg',
        installed: true, // Always available
      },
    ];
  }

  /**
   * Switch to Polygon network
   */
  async switchToPolygon(): Promise<boolean> {
    if (!window.ethereum) return false;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x89' }], // Polygon Mainnet
      });
      return true;
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x89',
                chainName: 'Polygon Mainnet',
                nativeCurrency: {
                  name: 'MATIC',
                  symbol: 'MATIC',
                  decimals: 18,
                },
                rpcUrls: ['https://polygon-rpc.com/'],
                blockExplorerUrls: ['https://polygonscan.com/'],
              },
            ],
          });
          return true;
        } catch (addError) {
          console.error('Failed to add Polygon network:', addError);
          return false;
        }
      }
      console.error('Failed to switch to Polygon network:', switchError);
      return false;
    }
  }

  /**
   * Switch to Polygon Mumbai testnet
   */
  async switchToMumbai(): Promise<boolean> {
    if (!window.ethereum) return false;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x13881' }], // Mumbai Testnet
      });
      return true;
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x13881',
                chainName: 'Polygon Mumbai',
                nativeCurrency: {
                  name: 'MATIC',
                  symbol: 'MATIC',
                  decimals: 18,
                },
                rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
                blockExplorerUrls: ['https://mumbai.polygonscan.com/'],
              },
            ],
          });
          return true;
        } catch (addError) {
          console.error('Failed to add Mumbai network:', addError);
          return false;
        }
      }
      console.error('Failed to switch to Mumbai network:', switchError);
      return false;
    }
  }

  /**
   * Get network name from chain ID
   */
  getNetworkName(chainId: number): string {
    const networks: { [key: number]: string } = {
      1: 'Ethereum Mainnet',
      137: 'Polygon Mainnet',
      80001: 'Polygon Mumbai',
      1337: 'Localhost',
    };
    return networks[chainId] || 'Unknown Network';
  }

  /**
   * Check if current network is supported
   */
  isSupportedNetwork(chainId: number): boolean {
    return [137, 80001, 1337].includes(chainId);
  }

  /**
   * Format wallet address for display
   */
  formatAddress(address: string, length: number = 4): string {
    if (!address) return '';
    return `${address.slice(0, 2 + length)}...${address.slice(-length)}`;
  }

  /**
   * Get wallet balance in MATIC
   */
  async getBalance(address: string, provider: any): Promise<string> {
    try {
      const balance = await provider.getBalance(address);
      return (parseFloat(balance.toString()) / 1e18).toFixed(4);
    } catch (error) {
      console.error('Failed to get balance:', error);
      return '0.0000';
    }
  }

  /**
   * Sign message with wallet
   */
  async signMessage(message: string, signer: any): Promise<string> {
    try {
      return await signer.signMessage(message);
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw new Error('Failed to sign message');
    }
  }

  /**
   * Verify signed message
   */
  async verifyMessage(message: string, signature: string, address: string): Promise<boolean> {
    try {
      const { ethers } = await import('ethers');
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      console.error('Failed to verify message:', error);
      return false;
    }
  }

  /**
   * Request account access (legacy method)
   */
  async requestAccounts(): Promise<string[]> {
    if (!window.ethereum) throw new Error('No wallet found');

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      return accounts;
    } catch (error) {
      console.error('Failed to request accounts:', error);
      throw new Error('Failed to connect wallet');
    }
  }

  /**
   * Get current accounts
   */
  async getAccounts(): Promise<string[]> {
    if (!window.ethereum) return [];

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_accounts',
      });
      return accounts;
    } catch (error) {
      console.error('Failed to get accounts:', error);
      return [];
    }
  }

  /**
   * Listen for account changes
   */
  onAccountsChanged(callback: (accounts: string[]) => void): void {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', callback);
    }
  }

  /**
   * Listen for chain changes
   */
  onChainChanged(callback: (chainId: string) => void): void {
    if (window.ethereum) {
      window.ethereum.on('chainChanged', callback);
    }
  }

  /**
   * Remove wallet event listeners
   */
  removeListeners(): void {
    if (window.ethereum) {
      window.ethereum.removeAllListeners('accountsChanged');
      window.ethereum.removeAllListeners('chainChanged');
    }
  }

  /**
   * Check if wallet is connected
   */
  async isConnected(): Promise<boolean> {
    const accounts = await this.getAccounts();
    return accounts.length > 0;
  }

  /**
   * Disconnect wallet (clear local state)
   */
  disconnect(): void {
    // Clear any local storage or state
    if (typeof window !== 'undefined') {
      localStorage.removeItem('wagmi.connected');
      localStorage.removeItem('wagmi.wallet');
    }
  }
}

// Global wallet interface extensions
declare global {
  interface Window {
    ethereum?: any;
    okxwallet?: any;
  }
}
