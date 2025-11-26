import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { WagmiProvider } from '@/components/providers/WagmiProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DeMailX - Decentralized Email System',
  description: 'A fully decentralized email system built on Polygon blockchain with end-to-end encryption and IPFS storage.',
  keywords: ['decentralized', 'email', 'blockchain', 'polygon', 'web3', 'encryption', 'ipfs'],
  authors: [{ name: 'DeMailX Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#0ea5e9',
  openGraph: {
    title: 'DeMailX - Decentralized Email System',
    description: 'A fully decentralized email system built on Polygon blockchain with end-to-end encryption and IPFS storage.',
    type: 'website',
    url: 'https://demailx.com',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'DeMailX - Decentralized Email System',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DeMailX - Decentralized Email System',
    description: 'A fully decentralized email system built on Polygon blockchain with end-to-end encryption and IPFS storage.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <WagmiProvider>
          <ToastProvider>
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
              <div className="cyber-grid min-h-screen">
                {children}
              </div>
            </div>
          </ToastProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
