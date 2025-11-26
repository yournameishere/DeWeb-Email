# DeMailX Deployment Guide

This guide will walk you through deploying DeMailX to production environments.

## 📋 Prerequisites

Before deploying, ensure you have:

- Node.js 18+ installed
- A Polygon wallet with MATIC tokens
- Domain name (optional but recommended)
- MongoDB instance (for backend)
- Required API keys (Pinata, WalletConnect, PolygonScan)

## 🔑 Required API Keys and Services

### 1. Pinata (IPFS Storage)

**Free Tier**: 1GB storage, 100GB bandwidth/month

1. Visit [Pinata.cloud](https://pinata.cloud)
2. Sign up for a free account
3. Go to **API Keys** in the dashboard
4. Click **New Key**
5. Select **Admin** permissions
6. Copy the following values:
   - `API Key` → `NEXT_PUBLIC_PINATA_API_KEY`
   - `API Secret` → `NEXT_PUBLIC_PINATA_SECRET_KEY`
   - `JWT` → `NEXT_PUBLIC_PINATA_JWT`

### 2. WalletConnect

**Free Tier**: Unlimited connections

1. Visit [WalletConnect Cloud](https://cloud.walletconnect.com)
2. Create an account and new project
3. Copy the **Project ID** → `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

### 3. PolygonScan API

**Free Tier**: 5 calls/second

1. Visit [PolygonScan](https://polygonscan.com/apis)
2. Create account and generate API key
3. Copy the key → `POLYGONSCAN_API_KEY`

### 4. MongoDB

**Options:**
- **MongoDB Atlas** (Free 512MB): [mongodb.com/atlas](https://mongodb.com/atlas)
- **Railway** (Free tier): [railway.app](https://railway.app)
- **Self-hosted**: Docker or local installation

## 🏗️ Smart Contract Deployment

### Step 1: Prepare Deployment Wallet

1. Create a new wallet for deployment (recommended for security)
2. Fund it with MATIC tokens:
   - **Mumbai Testnet**: Get free MATIC from [faucet](https://faucet.polygon.technology)
   - **Polygon Mainnet**: Buy MATIC from exchanges

### Step 2: Configure Environment

Create `.env` file in project root:

```env
# Deployment Configuration
PRIVATE_KEY=your_deployment_wallet_private_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key

# Network URLs
POLYGON_RPC_URL=https://polygon-rpc.com/
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com/
```

### Step 3: Deploy Contracts

#### Deploy to Mumbai Testnet (Recommended First)

```bash
# Install dependencies
npm install

# Deploy to Mumbai
npx hardhat run scripts/deploy.js --network mumbai
```

#### Deploy to Polygon Mainnet

```bash
# Deploy to Polygon mainnet
npx hardhat run scripts/deploy.js --network polygon
```

### Step 4: Verify Deployment

After deployment, you'll see output like:

```
=== Deployment Summary ===
{
  "network": "mumbai",
  "chainId": "80001",
  "deployer": "0x...",
  "contracts": {
    "IdentityRegistry": {
      "address": "0x1234...",
      "deploymentHash": "0xabcd..."
    },
    "MailRegistry": {
      "address": "0x5678...",
      "deploymentHash": "0xefgh..."
    }
  }
}
```

**Save these contract addresses** - you'll need them for frontend configuration.

## 🌐 Frontend Deployment

### Option 1: Vercel (Recommended)

**Free Tier**: Unlimited personal projects

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**:
   - Visit [vercel.com](https://vercel.com)
   - Connect your GitHub account
   - Import your repository
   - Configure environment variables (see below)
   - Deploy

3. **Environment Variables in Vercel**:
   ```env
   NEXT_PUBLIC_PINATA_API_KEY=your_pinata_api_key
   NEXT_PUBLIC_PINATA_SECRET_KEY=your_pinata_secret_key
   NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
   NEXT_PUBLIC_IDENTITY_CONTRACT=deployed_identity_contract_address
   NEXT_PUBLIC_MAIL_CONTRACT=deployed_mail_contract_address
   NEXT_PUBLIC_NETWORK=polygon
   NEXT_PUBLIC_CHAIN_ID=137
   ```

### Option 2: Netlify

1. Build the project:
   ```bash
   npm run build
   npm run export
   ```

2. Deploy the `out` folder to Netlify
3. Configure environment variables in Netlify dashboard

### Option 3: Self-Hosted

1. **Build for production**:
   ```bash
   npm run build
   ```

2. **Start production server**:
   ```bash
   npm start
   ```

3. **Use PM2 for process management**:
   ```bash
   npm install -g pm2
   pm2 start npm --name "demailx" -- start
   pm2 save
   pm2 startup
   ```

## 🔧 Backend Indexer Deployment

### Option 1: Railway (Recommended)

**Free Tier**: $5 credit monthly

1. **Prepare the backend**:
   ```bash
   cd backend
   npm run build
   ```

2. **Deploy to Railway**:
   - Visit [railway.app](https://railway.app)
   - Connect GitHub repository
   - Select the `backend` folder
   - Configure environment variables
   - Deploy

3. **Environment Variables**:
   ```env
   NODE_ENV=production
   PORT=3001
   MONGODB_URI=your_mongodb_connection_string
   IDENTITY_CONTRACT_ADDRESS=deployed_identity_contract
   MAIL_CONTRACT_ADDRESS=deployed_mail_contract
   RPC_URL=https://polygon-rpc.com/
   FRONTEND_URL=https://your-frontend-domain.com
   ```

### Option 2: Heroku

1. **Create Heroku app**:
   ```bash
   heroku create demailx-backend
   ```

2. **Configure environment variables**:
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set MONGODB_URI=your_mongodb_uri
   # ... other variables
   ```

3. **Deploy**:
   ```bash
   git subtree push --prefix backend heroku main
   ```

### Option 3: VPS/Docker

1. **Create Dockerfile** (backend/Dockerfile):
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY dist ./dist
   EXPOSE 3001
   CMD ["node", "dist/index.js"]
   ```

2. **Build and run**:
   ```bash
   docker build -t demailx-backend .
   docker run -p 3001:3001 --env-file .env demailx-backend
   ```

## 🗄️ Database Setup

### MongoDB Atlas (Recommended)

1. **Create cluster**:
   - Visit [MongoDB Atlas](https://mongodb.com/atlas)
   - Create free M0 cluster
   - Choose region closest to your backend

2. **Configure access**:
   - Add IP addresses (0.0.0.0/0 for development)
   - Create database user
   - Get connection string

3. **Connection string format**:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/demailx?retryWrites=true&w=majority
   ```

### Self-Hosted MongoDB

1. **Using Docker**:
   ```bash
   docker run -d \
     --name mongodb \
     -p 27017:27017 \
     -v mongodb_data:/data/db \
     mongo:latest
   ```

2. **Connection string**:
   ```
   mongodb://localhost:27017/demailx
   ```

## 🔒 Security Considerations

### Smart Contract Security

1. **Audit contracts** before mainnet deployment
2. **Use multi-sig wallet** for contract ownership
3. **Implement upgrade patterns** if needed
4. **Monitor contract events** for unusual activity

### Frontend Security

1. **Environment variables**:
   - Never expose private keys in frontend
   - Use `NEXT_PUBLIC_` prefix only for public variables
   - Store sensitive data in backend

2. **Content Security Policy**:
   ```javascript
   // next.config.js
   const securityHeaders = [
     {
       key: 'Content-Security-Policy',
       value: "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
     }
   ];
   ```

### Backend Security

1. **Rate limiting**: Already implemented
2. **Input validation**: Using Joi schemas
3. **CORS configuration**: Restrict to frontend domain
4. **Environment variables**: Never commit sensitive data

## 📊 Monitoring and Analytics

### Application Monitoring

1. **Vercel Analytics**: Built-in for Vercel deployments
2. **Google Analytics**: Add tracking code
3. **Sentry**: Error tracking and performance monitoring

### Blockchain Monitoring

1. **Contract events**: Backend indexer tracks all events
2. **Transaction monitoring**: Monitor gas usage and costs
3. **User activity**: Track registration and email metrics

### IPFS Monitoring

1. **Pinata analytics**: Monitor storage usage
2. **Gateway performance**: Track retrieval times
3. **Backup strategies**: Consider multiple IPFS providers

## 🚀 Performance Optimization

### Frontend Optimization

1. **Image optimization**: Use Next.js Image component
2. **Code splitting**: Automatic with Next.js
3. **Caching**: Configure proper cache headers
4. **CDN**: Vercel provides global CDN

### Backend Optimization

1. **Database indexing**: Already configured in models
2. **Connection pooling**: MongoDB connection pooling
3. **Caching**: Consider Redis for frequently accessed data
4. **Load balancing**: Use multiple backend instances

### IPFS Optimization

1. **File compression**: Compress large files before upload
2. **Chunking**: Split large files into smaller chunks
3. **Caching**: Cache frequently accessed content
4. **Multiple gateways**: Use multiple IPFS gateways

## 🔄 CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: cd backend && npm ci
      - run: cd backend && npm run build
      # Deploy to your backend hosting service
```

## 📈 Scaling Considerations

### Horizontal Scaling

1. **Multiple backend instances**: Load balance across multiple servers
2. **Database sharding**: Partition data across multiple databases
3. **IPFS clustering**: Use IPFS cluster for redundancy

### Vertical Scaling

1. **Increase server resources**: More CPU, RAM, storage
2. **Database optimization**: Better queries, indexing
3. **Caching layers**: Redis, CDN caching

### Multi-Chain Support

1. **Contract deployment**: Deploy to multiple chains
2. **Chain detection**: Frontend detects user's chain
3. **Cross-chain messaging**: Consider bridge protocols

## 🆘 Troubleshooting

### Common Deployment Issues

1. **Contract deployment fails**:
   - Check wallet has enough MATIC
   - Verify network configuration
   - Check gas limit settings

2. **Frontend build fails**:
   - Verify all environment variables
   - Check TypeScript errors
   - Update dependencies

3. **Backend connection issues**:
   - Verify MongoDB connection string
   - Check firewall settings
   - Validate environment variables

4. **IPFS upload fails**:
   - Verify Pinata API keys
   - Check file size limits
   - Test API connectivity

### Monitoring Commands

```bash
# Check contract deployment
npx hardhat verify --network polygon CONTRACT_ADDRESS

# Test backend API
curl https://your-backend.com/health

# Check frontend build
npm run build

# Test IPFS connectivity
curl -X POST "https://api.pinata.cloud/data/testAuthentication" \
  -H "Authorization: Bearer YOUR_JWT"
```

## 📞 Support

If you encounter issues during deployment:

1. **Check the logs**: Most hosting services provide detailed logs
2. **Review environment variables**: Ensure all required variables are set
3. **Test locally first**: Verify everything works in development
4. **Community support**: Join our Discord for help
5. **Professional support**: Contact us for enterprise deployment assistance

---

**Deployment completed successfully? 🎉**

Your DeMailX instance should now be live and ready for users! Don't forget to:

- Test all functionality thoroughly
- Set up monitoring and alerts
- Create backups of important data
- Document your specific configuration
- Plan for regular updates and maintenance
