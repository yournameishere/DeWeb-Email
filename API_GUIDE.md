# DeMailX API Guide

This guide covers all the APIs and services you need to set up and integrate with DeMailX.

## 🔑 Required API Keys and Services

### 1. Pinata (IPFS Storage) - REQUIRED

Pinata provides reliable IPFS pinning services for storing encrypted emails and attachments.

**Pricing:**
- **Free Tier**: 1GB storage, 100GB bandwidth/month
- **Starter**: $20/month - 100GB storage, 1TB bandwidth
- **Professional**: $200/month - 1TB storage, 10TB bandwidth

**Setup Steps:**

1. **Create Account**
   - Visit [pinata.cloud](https://pinata.cloud)
   - Sign up with email or GitHub

2. **Generate API Keys**
   - Go to **Developers** → **API Keys**
   - Click **New Key**
   - Select permissions:
     - ✅ **pinFileToIPFS**
     - ✅ **pinJSONToIPFS**
     - ✅ **unpin**
     - ✅ **userPinnedDataTotal**
   - Name your key (e.g., "DeMailX Production")
   - Copy the generated keys

3. **Environment Variables**
   ```env
   NEXT_PUBLIC_PINATA_API_KEY=your_api_key_here
   NEXT_PUBLIC_PINATA_SECRET_KEY=your_secret_key_here
   NEXT_PUBLIC_PINATA_JWT=your_jwt_token_here
   ```

4. **Test Connection**
   ```bash
   curl -X GET "https://api.pinata.cloud/data/testAuthentication" \
        -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

**API Endpoints Used:**
- `POST /pinning/pinFileToIPFS` - Upload files
- `POST /pinning/pinJSONToIPFS` - Upload JSON data
- `DELETE /pinning/unpin/{hash}` - Remove pins
- `GET /data/pinList` - List pinned files

### 2. WalletConnect - REQUIRED

WalletConnect enables users to connect various wallets to your dApp.

**Pricing:**
- **Free Tier**: Unlimited connections
- **Pro**: $99/month - Advanced analytics, priority support

**Setup Steps:**

1. **Create Project**
   - Visit [cloud.walletconnect.com](https://cloud.walletconnect.com)
   - Sign up and create new project
   - Choose "App" as project type

2. **Configure Project**
   - **Name**: DeMailX
   - **Description**: Decentralized Email System
   - **URL**: Your domain (e.g., demailx.com)
   - **Icon**: Upload your logo

3. **Get Project ID**
   ```env
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
   ```

4. **Supported Wallets**
   - MetaMask
   - WalletConnect compatible wallets
   - Coinbase Wallet
   - Rainbow Wallet
   - Trust Wallet

### 3. PolygonScan API - REQUIRED

Used for smart contract verification and blockchain data.

**Pricing:**
- **Free Tier**: 5 calls/second, 100,000 calls/day
- **Standard**: $200/month - 50 calls/second
- **Advanced**: $1000/month - 200 calls/second

**Setup Steps:**

1. **Create Account**
   - Visit [polygonscan.com/apis](https://polygonscan.com/apis)
   - Register for free account

2. **Generate API Key**
   - Go to **API-KEYs** section
   - Create new API key
   - Copy the key

3. **Environment Variable**
   ```env
   POLYGONSCAN_API_KEY=your_api_key_here
   ```

**API Endpoints Used:**
- Contract verification
- Transaction status checking
- Gas price estimation

### 4. MongoDB - REQUIRED (for Backend)

Database for caching blockchain data and providing fast API responses.

**Options:**

#### MongoDB Atlas (Recommended)
**Pricing:**
- **Free Tier (M0)**: 512MB storage, shared CPU
- **Dedicated (M10)**: $57/month - 10GB storage, dedicated CPU
- **Production (M30)**: $340/month - 40GB storage, high performance

**Setup:**
1. Visit [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create free cluster
3. Configure network access (add 0.0.0.0/0 for development)
4. Create database user
5. Get connection string

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/demailx?retryWrites=true&w=majority
```

#### Railway MongoDB
**Pricing:**
- **Free Tier**: $5 credit/month
- **Pro**: $20/month base + usage

**Setup:**
1. Visit [railway.app](https://railway.app)
2. Create new project
3. Add MongoDB service
4. Get connection details

#### Self-Hosted
```bash
# Docker
docker run -d --name mongodb -p 27017:27017 -v mongodb_data:/data/db mongo:latest

# Connection string
MONGODB_URI=mongodb://localhost:27017/demailx
```

## 🌐 RPC Providers

### Polygon RPC Endpoints

**Free Options:**
- `https://polygon-rpc.com/` (Rate limited)
- `https://rpc-mainnet.matic.network` (Polygon official)
- `https://rpc-mainnet.maticvigil.com/` (Community)

**Paid Options:**

#### Alchemy
**Pricing:**
- **Free**: 300M compute units/month
- **Growth**: $49/month - 1.5B compute units

```env
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

#### Infura
**Pricing:**
- **Free**: 100,000 requests/day
- **Developer**: $50/month - 3M requests/month

```env
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/YOUR_PROJECT_ID
```

#### QuickNode
**Pricing:**
- **Discover**: Free - 500M credits/month
- **Build**: $9/month - 5B credits/month

```env
POLYGON_RPC_URL=https://your-endpoint.polygon-mainnet.quiknode.pro/YOUR_API_KEY/
```

### Mumbai Testnet RPC

**Free Options:**
- `https://rpc-mumbai.maticvigil.com/`
- `https://matic-mumbai.chainstacklabs.com`
- `https://rpc-mumbai.matic.today`

```env
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com/
```

## 📊 Optional Analytics and Monitoring

### 1. Vercel Analytics

**Pricing:**
- **Hobby**: Free - Basic analytics
- **Pro**: $20/month - Advanced analytics

**Setup:**
```bash
npm install @vercel/analytics
```

```javascript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 2. Sentry (Error Tracking)

**Pricing:**
- **Developer**: Free - 5,000 errors/month
- **Team**: $26/month - 50,000 errors/month

**Setup:**
```bash
npm install @sentry/nextjs
```

```javascript
// sentry.client.config.js
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  tracesSampleRate: 1.0,
});
```

### 3. PostHog (Product Analytics)

**Pricing:**
- **Free**: 1M events/month
- **Scale**: $0.00031/event after free tier

**Setup:**
```bash
npm install posthog-js
```

```javascript
// lib/posthog.js
import posthog from 'posthog-js'

if (typeof window !== 'undefined') {
  posthog.init('YOUR_POSTHOG_KEY', {
    api_host: 'https://app.posthog.com'
  })
}
```

## 🔧 Backend API Endpoints

Once deployed, your backend provides these endpoints:

### Health Check
```http
GET /health
```

### Email Endpoints
```http
# Get emails for user
GET /api/emails?wallet=0x123...&page=1&limit=20&type=received

# Get specific email
GET /api/emails/123?wallet=0x123...

# Mark email as read
POST /api/emails/mark-read
{
  "mailId": 123,
  "wallet": "0x123..."
}

# Get email statistics
GET /api/emails/stats/0x123...

# Search emails
GET /api/emails/search?wallet=0x123...&query=hello&page=1&limit=20
```

### User Endpoints
```http
# Get user by wallet
GET /api/users/0x123...

# Get user by email
GET /api/users/by-email/user@dewebmail.xyz

# Get user by username
GET /api/users/by-username/username

# Search users
GET /api/users/search?query=john&limit=10
```

### Statistics Endpoints
```http
# Global platform stats
GET /api/stats/global

# Network statistics
GET /api/stats/network
```

## 🔐 Environment Variables Reference

### Frontend (.env.local)
```env
# Required - Pinata IPFS
NEXT_PUBLIC_PINATA_API_KEY=your_pinata_api_key
NEXT_PUBLIC_PINATA_SECRET_KEY=your_pinata_secret_key
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt

# Required - WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Required - Smart Contracts
NEXT_PUBLIC_IDENTITY_CONTRACT=0x123...
NEXT_PUBLIC_MAIL_CONTRACT=0x456...

# Required - Network
NEXT_PUBLIC_NETWORK=polygon
NEXT_PUBLIC_CHAIN_ID=137

# Optional - Backend API
NEXT_PUBLIC_API_URL=https://api.demailx.com
NEXT_PUBLIC_INDEXER_URL=https://indexer.demailx.com
NEXT_PUBLIC_WEBSOCKET_URL=wss://ws.demailx.com

# Optional - Analytics
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Backend (.env)
```env
# Required - Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/demailx

# Required - Blockchain
IDENTITY_CONTRACT_ADDRESS=0x123...
MAIL_CONTRACT_ADDRESS=0x456...
RPC_URL=https://polygon-rpc.com/

# Required - Server
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://demailx.com

# Optional - Monitoring
SENTRY_DSN=your_sentry_dsn
```

### Deployment (.env)
```env
# Required - Smart Contract Deployment
PRIVATE_KEY=your_deployment_wallet_private_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key

# Required - Network URLs
POLYGON_RPC_URL=https://polygon-rpc.com/
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com/
```

## 💰 Cost Estimation

### Monthly Costs (Production)

**Minimum Setup (Free Tier):**
- Pinata: $0 (1GB storage)
- WalletConnect: $0
- PolygonScan: $0
- MongoDB Atlas: $0 (512MB)
- Vercel: $0
- **Total: $0/month**

**Small Scale (1000 users, 10K emails/month):**
- Pinata: $20 (100GB storage)
- MongoDB Atlas: $57 (M10 cluster)
- Vercel Pro: $20
- **Total: ~$97/month**

**Medium Scale (10K users, 100K emails/month):**
- Pinata: $200 (1TB storage)
- MongoDB Atlas: $340 (M30 cluster)
- Alchemy RPC: $49
- Railway Backend: $50
- **Total: ~$639/month**

**Large Scale (100K+ users):**
- Custom pricing required
- Consider enterprise solutions
- Multiple regions/CDNs
- Dedicated infrastructure

### Transaction Costs

**Polygon Mainnet:**
- User Registration: ~$0.01-0.05
- Send Email: ~$0.001-0.01
- Mark as Read: ~$0.001
- Delete Email: ~$0.001

**Mumbai Testnet:**
- All transactions: Free (testnet MATIC)

## 🚀 Getting Started Checklist

### Phase 1: Development Setup
- [ ] Create Pinata account and get API keys
- [ ] Create WalletConnect project
- [ ] Get PolygonScan API key
- [ ] Set up MongoDB (Atlas free tier)
- [ ] Configure environment variables
- [ ] Deploy contracts to Mumbai testnet
- [ ] Test all functionality

### Phase 2: Production Deployment
- [ ] Purchase domain name
- [ ] Upgrade to paid tiers if needed
- [ ] Deploy contracts to Polygon mainnet
- [ ] Deploy frontend to Vercel/Netlify
- [ ] Deploy backend to Railway/Heroku
- [ ] Configure production environment variables
- [ ] Set up monitoring and analytics
- [ ] Test with real users

### Phase 3: Scaling
- [ ] Monitor usage and costs
- [ ] Upgrade services as needed
- [ ] Implement caching strategies
- [ ] Consider multiple regions
- [ ] Add advanced features

## 📞 Support and Resources

### API Documentation
- **Pinata**: [docs.pinata.cloud](https://docs.pinata.cloud)
- **WalletConnect**: [docs.walletconnect.com](https://docs.walletconnect.com)
- **Polygon**: [docs.polygon.technology](https://docs.polygon.technology)
- **MongoDB**: [docs.mongodb.com](https://docs.mongodb.com)

### Community Support
- **Discord**: Join our community for help
- **GitHub**: Report issues and contribute
- **Email**: support@demailx.com

### Professional Services
- **Custom deployment**: We can help deploy your instance
- **Enterprise support**: Dedicated support and SLAs
- **Custom development**: Additional features and integrations

---

**Need help with API setup?** Join our Discord community or contact our support team!
