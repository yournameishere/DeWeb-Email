# DeMailX - Decentralized Email System

A fully decentralized email system built on Polygon blockchain with end-to-end encryption and IPFS storage.

## 🌟 Features

- **Fully Decentralized**: No central servers, your emails live on IPFS and metadata on Polygon blockchain
- **End-to-End Encryption**: RSA encryption ensures only you and the recipient can read emails
- **Web3 Native**: Your wallet is your identity - no passwords, no data collection
- **Lightning Fast**: Built on Polygon for fast, low-cost transactions
- **Censorship Resistant**: No one can block, delete, or censor your emails
- **Modern UI**: Beautiful, responsive interface with 3D animations

## 🏗️ Architecture

### Frontend (Next.js)
- React/Next.js with TypeScript
- TailwindCSS for styling
- Framer Motion for animations
- RainbowKit for wallet connections
- Wagmi for Ethereum interactions

### Smart Contracts (Solidity)
- **IdentityRegistry**: Maps usernames/emails to wallet addresses and public keys
- **MailRegistry**: Stores email metadata and routing information

### Storage Layer
- **IPFS**: Encrypted email content and attachments via Pinata
- **Polygon**: Email metadata, identity mapping, and permissions

### Backend Indexer (Optional)
- Node.js/Express API for fast email retrieval
- MongoDB for caching blockchain data
- Real-time notifications via Socket.IO

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MetaMask or OKX wallet
- Polygon Mumbai testnet MATIC tokens
- MongoDB (for backend indexer)

### 1. Clone and Install

```bash
git clone https://github.com/your-username/demailx.git
cd demailx
npm install
```

### 2. Environment Setup

Copy the environment file and configure:

```bash
cp env.example .env.local
```

Fill in your configuration:

```env
# Pinata IPFS Configuration
NEXT_PUBLIC_PINATA_API_KEY=your_pinata_api_key_here
NEXT_PUBLIC_PINATA_SECRET_KEY=your_pinata_secret_key_here
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt_token_here

# WalletConnect Configuration
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here

# Smart Contract Addresses (will be populated after deployment)
NEXT_PUBLIC_IDENTITY_CONTRACT=
NEXT_PUBLIC_MAIL_CONTRACT=

# Network Configuration
NEXT_PUBLIC_NETWORK=mumbai
NEXT_PUBLIC_CHAIN_ID=80001
```

### 3. Deploy Smart Contracts

Install Hardhat dependencies:

```bash
npm install hardhat @nomicfoundation/hardhat-toolbox dotenv --save-dev
```

Configure your deployment wallet:

```bash
# Add to .env.local
PRIVATE_KEY=your_wallet_private_key_for_deployment
POLYGONSCAN_API_KEY=your_polygonscan_api_key_for_verification
```

Deploy to Mumbai testnet:

```bash
npx hardhat run scripts/deploy.js --network mumbai
```

Update your `.env.local` with the deployed contract addresses.

### 4. Start the Application

```bash
npm run dev
```

Visit `http://localhost:3000` to use DeMailX!

## 📋 Detailed Setup Guide

### Getting API Keys

#### 1. Pinata IPFS Setup

1. Go to [Pinata.cloud](https://pinata.cloud)
2. Create a free account
3. Navigate to API Keys section
4. Create a new API key with admin permissions
5. Copy the API Key, Secret Key, and JWT token

#### 2. WalletConnect Setup

1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com)
2. Create a new project
3. Copy the Project ID

#### 3. PolygonScan API Key

1. Go to [PolygonScan](https://polygonscan.com)
2. Create an account and get a free API key
3. This is used for contract verification

### Smart Contract Deployment

#### Deploy to Mumbai Testnet

```bash
# Make sure you have Mumbai MATIC tokens
npx hardhat run scripts/deploy.js --network mumbai
```

#### Deploy to Polygon Mainnet

```bash
# Update hardhat.config.js network settings
npx hardhat run scripts/deploy.js --network polygon
```

The deployment script will:
- Deploy IdentityRegistry contract
- Deploy MailRegistry contract
- Verify contracts on PolygonScan
- Save deployment info to `deployments/` folder

### Backend Indexer Setup (Optional)

The backend indexer provides faster email retrieval and real-time notifications.

#### 1. Install Dependencies

```bash
cd backend
npm install
```

#### 2. Configure Environment

```bash
cp .env.example .env
```

Configure the backend:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/demailx

# Contract Configuration
IDENTITY_CONTRACT_ADDRESS=your_deployed_identity_contract
MAIL_CONTRACT_ADDRESS=your_deployed_mail_contract
RPC_URL=https://rpc-mumbai.maticvigil.com/

# Server Configuration
PORT=3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

#### 3. Start MongoDB

```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or install MongoDB locally
```

#### 4. Start the Backend

```bash
npm run dev
```

The backend will:
- Connect to MongoDB
- Listen to blockchain events
- Sync historical data
- Provide REST API endpoints
- Enable real-time notifications

## 🔧 Configuration Options

### Network Configuration

Update `lib/wallet.ts` to add support for different networks:

```typescript
const polygonChain = {
  ...polygon,
  rpcUrls: {
    default: {
      http: ['https://polygon-rpc.com/'],
    },
  },
};
```

### IPFS Configuration

DeMailX uses Pinata by default, but you can configure other IPFS providers in `lib/ipfs.ts`.

### Encryption Settings

The encryption service uses RSA-2048 by default. You can modify key sizes in `lib/encryption.ts`.

## 🧪 Testing

### Frontend Testing

```bash
npm run test
```

### Smart Contract Testing

```bash
npx hardhat test
```

### Backend Testing

```bash
cd backend
npm run test
```

## 📱 Usage Guide

### 1. Connect Wallet

- Click "Connect Wallet" on the homepage
- Choose MetaMask, OKX, or WalletConnect
- Ensure you're on Polygon Mumbai testnet

### 2. Register Account

- Choose a unique username
- Set your email handle (username@dewebmail.xyz)
- Create a secure password for key encryption
- Generate encryption keys
- Complete registration transaction

### 3. Send Emails

- Click "Compose" to create a new email
- Enter recipient's DeMailX email address
- Write your message and add attachments
- Set priority level
- Send (requires small MATIC fee)

### 4. Receive Emails

- Check your inbox for new messages
- Click on emails to decrypt and read
- Mark as read, reply, or delete

## 🔒 Security Features

### End-to-End Encryption

- RSA-2048 encryption for all email content
- Hybrid encryption (AES + RSA) for large files
- Private keys encrypted with user password
- Keys stored locally in browser

### Blockchain Security

- All transactions signed by user's wallet
- Immutable email metadata on Polygon
- Decentralized identity management
- No central point of failure

### Privacy Protection

- Subject lines hashed for privacy
- Email content never stored in plaintext
- IPFS content addressing prevents tampering
- Optional anonymous sending

## 🚀 Deployment to Production

### Frontend Deployment (Vercel)

1. Push your code to GitHub
2. Connect to Vercel
3. Set environment variables
4. Deploy

### Backend Deployment (Railway/Heroku)

1. Create a new app
2. Connect to your repository
3. Set environment variables
4. Deploy

### Smart Contract Deployment (Mainnet)

1. Get MATIC tokens for deployment
2. Update network configuration
3. Deploy contracts
4. Update frontend configuration

## 🛠️ Development

### Project Structure

```
demailx/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Landing page
│   ├── register/          # Registration flow
│   ├── inbox/             # Email inbox
│   ├── compose/           # Compose email
│   └── sent/              # Sent emails
├── components/            # React components
│   ├── providers/         # Context providers
│   └── ui/                # UI components
├── lib/                   # Core libraries
│   ├── contracts.ts       # Smart contract interactions
│   ├── encryption.ts      # Encryption service
│   ├── ipfs.ts           # IPFS service
│   └── wallet.ts         # Wallet utilities
├── contracts/             # Solidity contracts
│   ├── IdentityRegistry.sol
│   └── MailRegistry.sol
├── backend/               # Backend indexer
│   ├── src/
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   └── services/      # Business logic
│   └── package.json
└── scripts/               # Deployment scripts
```

### Adding New Features

1. **New Email Features**: Modify `MailRegistry.sol` and update frontend
2. **User Features**: Update `IdentityRegistry.sol` and user interfaces
3. **UI Improvements**: Add components in `components/` directory
4. **Backend Features**: Add routes and services in `backend/src/`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### Common Issues

#### "User not registered" error
- Ensure you've completed the registration process
- Check that your wallet is connected to the correct network

#### "Failed to encrypt email" error
- Verify recipient's email address is correct
- Ensure recipient is registered on DeMailX

#### "IPFS upload failed" error
- Check your Pinata API keys
- Verify internet connection
- Try uploading smaller files

#### Transaction failures
- Ensure you have enough MATIC for gas fees
- Check network congestion
- Try increasing gas limit

### Getting Help

- 📧 Email: support@demailx.com
- 💬 Discord: [Join our community](https://discord.gg/demailx)
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/demailx/issues)
- 📖 Docs: [Documentation](https://docs.demailx.com)

## 🗺️ Roadmap

### Phase 1 (Current)
- ✅ Basic email functionality
- ✅ End-to-end encryption
- ✅ IPFS storage
- ✅ Polygon integration

### Phase 2 (Q1 2024)
- 🔄 Mobile app (React Native)
- 🔄 Email templates
- 🔄 Group messaging
- 🔄 Advanced search

### Phase 3 (Q2 2024)
- 📅 Calendar integration
- 📅 File sharing improvements
- 📅 Multi-chain support
- 📅 Enterprise features

### Phase 4 (Q3 2024)
- 📅 Bridge to traditional email
- 📅 AI-powered features
- 📅 Advanced analytics
- 📅 Governance token

## 🌟 Acknowledgments

- Polygon team for the amazing blockchain infrastructure
- Pinata for reliable IPFS hosting
- RainbowKit for excellent wallet integration
- The entire Web3 community for inspiration and support

---

**Built with ❤️ for the decentralized future**
