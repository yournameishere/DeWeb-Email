'use client';

import { WagmiConfig } from 'wagmi';
import { RainbowKitProvider, getDefaultWallets, connectorsForWallets } from '@rainbow-me/rainbowkit';
import { configureChains, createConfig } from 'wagmi';
import { polygon, polygonMumbai } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc';
import '@rainbow-me/rainbowkit/styles.css';

// Configure chains
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [polygon, polygonMumbai],
  [
    jsonRpcProvider({
      rpc: (chain) => {
        if (chain.id === polygon.id) {
          return { http: 'https://polygon-rpc.com/' };
        }
        if (chain.id === polygonMumbai.id) {
          return { http: 'https://rpc-mumbai.maticvigil.com/' };
        }
        return null;
      },
    }),
    publicProvider(),
  ]
);

// Get default wallets
const { wallets } = getDefaultWallets({
  appName: 'DeMailX',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo',
  chains,
});

// Configure connectors
const connectors = connectorsForWallets([
  ...wallets,
]);

// Create wagmi config
const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

interface WagmiProviderProps {
  children: React.ReactNode;
}

export function WagmiProvider({ children }: WagmiProviderProps) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider 
        chains={chains}
        theme={{
          blurs: {
            modalOverlay: 'blur(4px)',
          },
          colors: {
            accentColor: '#0ea5e9',
            accentColorForeground: 'white',
            actionButtonBorder: 'rgba(255, 255, 255, 0.04)',
            actionButtonBorderMobile: 'rgba(255, 255, 255, 0.06)',
            actionButtonSecondaryBackground: 'rgba(255, 255, 255, 0.08)',
            closeButton: 'rgba(224, 232, 255, 0.6)',
            closeButtonBackground: 'rgba(255, 255, 255, 0.08)',
            connectButtonBackground: '#0ea5e9',
            connectButtonBackgroundError: '#ff4444',
            connectButtonInnerBackground: 'linear-gradient(0deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.15))',
            connectButtonText: 'white',
            connectButtonTextError: 'white',
            connectionIndicator: '#30e000',
            downloadBottomCardBackground: 'linear-gradient(126deg, rgba(255, 255, 255, 0.09) 9.49%, rgba(171, 171, 171, 0.04) 71.04%), #1a1b1f',
            downloadTopCardBackground: 'linear-gradient(126deg, rgba(171, 171, 171, 0.2) 9.49%, rgba(255, 255, 255, 0.09) 71.04%), #1a1b1f',
            error: '#ff4444',
            generalBorder: 'rgba(255, 255, 255, 0.08)',
            generalBorderDim: 'rgba(255, 255, 255, 0.04)',
            menuItemBackground: 'rgba(224, 232, 255, 0.1)',
            modalBackdrop: 'rgba(0, 0, 0, 0.5)',
            modalBackground: '#1a1b1f',
            modalBorder: 'rgba(255, 255, 255, 0.08)',
            modalText: '#ffffff',
            modalTextDim: 'rgba(224, 232, 255, 0.3)',
            modalTextSecondary: 'rgba(255, 255, 255, 0.6)',
            profileAction: 'rgba(224, 232, 255, 0.1)',
            profileActionHover: 'rgba(224, 232, 255, 0.2)',
            profileForeground: '#1a1b1f',
            selectedOptionBorder: 'rgba(224, 232, 255, 0.1)',
            standby: '#ffd641',
          },
          fonts: {
            body: 'Inter, sans-serif',
          },
          radii: {
            actionButton: '12px',
            connectButton: '12px',
            menuButton: '12px',
            modal: '16px',
            modalMobile: '16px',
          },
          shadows: {
            connectButton: '0 4px 12px rgba(0, 0, 0, 0.1)',
            dialog: '0 8px 32px rgba(0, 0, 0, 0.32)',
            profileDetailsAction: '0 2px 6px rgba(37, 41, 46, 0.04)',
            selectedOption: '0 2px 6px rgba(0, 0, 0, 0.24)',
            selectedWallet: '0 2px 6px rgba(0, 0, 0, 0.12)',
            walletLogo: '0 2px 16px rgba(0, 0, 0, 0.16)',
          },
        }}
        modalSize="compact"
        initialChain={polygonMumbai}
      >
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  );
}
