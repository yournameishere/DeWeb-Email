import { ethers } from 'ethers';
import { Email } from '../models/Email';
import { User } from '../models/User';
import { logger } from '../utils/logger';

// Contract ABIs (simplified)
const IDENTITY_REGISTRY_ABI = [
  "event UserRegistered(address indexed userAddress, string username, string email, uint256 timestamp)",
  "event UserUpdated(address indexed userAddress, string username, string email)",
  "event UserVerified(address indexed userAddress, bool verified)",
  "function getUser(address _userAddress) external view returns (tuple(string username, string email, bytes publicKeyEncrypt, address walletAddress, uint256 registrationTime, bool isActive, bool isVerified))"
];

const MAIL_REGISTRY_ABI = [
  "event MailSent(uint256 indexed mailId, address indexed from, address indexed to, string ipfsCid, uint256 timestamp, uint256 priority)",
  "event MailRead(uint256 indexed mailId, address indexed reader)",
  "event MailDeleted(uint256 indexed mailId, address indexed deleter)",
  "function getMail(uint256 _mailId) external view returns (tuple(uint256 id, address from, address to, string ipfsCid, bytes32 subjectHash, uint256 timestamp, bool isEncrypted, bool isRead, bool isDeleted, uint256 priority))"
];

class BlockchainListener {
  private provider: ethers.JsonRpcProvider;
  private identityContract: ethers.Contract;
  private mailContract: ethers.Contract;
  private isListening: boolean = false;

  constructor() {
    const rpcUrl = process.env.RPC_URL || 'https://rpc-mumbai.maticvigil.com/';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    const identityAddress = process.env.IDENTITY_CONTRACT_ADDRESS;
    const mailAddress = process.env.MAIL_CONTRACT_ADDRESS;

    if (!identityAddress || !mailAddress) {
      throw new Error('Contract addresses not configured');
    }

    this.identityContract = new ethers.Contract(identityAddress, IDENTITY_REGISTRY_ABI, this.provider);
    this.mailContract = new ethers.Contract(mailAddress, MAIL_REGISTRY_ABI, this.provider);
  }

  async start(): Promise<void> {
    if (this.isListening) {
      logger.warn('Blockchain listener is already running');
      return;
    }

    try {
      // Set up event listeners
      this.setupIdentityEventListeners();
      this.setupMailEventListeners();

      // Sync historical events
      await this.syncHistoricalEvents();

      this.isListening = true;
      logger.info('Blockchain listener started successfully');
    } catch (error) {
      logger.error('Failed to start blockchain listener:', error);
      throw error;
    }
  }

  private setupIdentityEventListeners(): void {
    // User Registration Events
    this.identityContract.on('UserRegistered', async (userAddress, username, email, timestamp, event) => {
      try {
        logger.info(`New user registered: ${username} (${userAddress})`);

        // Get full user data from contract
        const userData = await this.identityContract.getUser(userAddress);

        const user = new User({
          walletAddress: userAddress.toLowerCase(),
          username: username.toLowerCase(),
          email: email.toLowerCase(),
          publicKeyEncrypt: ethers.toUtf8String(userData.publicKeyEncrypt),
          registrationTime: Number(timestamp),
          registrationBlockNumber: event.blockNumber,
          registrationTransactionHash: event.transactionHash,
          isActive: userData.isActive,
          isVerified: userData.isVerified,
        });

        await user.save();

        // Emit real-time notification
        if (global.io) {
          global.io.emit('user-registered', {
            address: userAddress,
            username,
            email,
            timestamp: Number(timestamp)
          });
        }

      } catch (error) {
        logger.error('Error processing UserRegistered event:', error);
      }
    });

    // User Update Events
    this.identityContract.on('UserUpdated', async (userAddress, username, email, event) => {
      try {
        await User.findOneAndUpdate(
          { walletAddress: userAddress.toLowerCase() },
          {
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            updatedAt: new Date()
          }
        );

        logger.info(`User updated: ${username} (${userAddress})`);
      } catch (error) {
        logger.error('Error processing UserUpdated event:', error);
      }
    });

    // User Verification Events
    this.identityContract.on('UserVerified', async (userAddress, verified, event) => {
      try {
        await User.findOneAndUpdate(
          { walletAddress: userAddress.toLowerCase() },
          {
            isVerified: verified,
            updatedAt: new Date()
          }
        );

        logger.info(`User verification updated: ${userAddress} - ${verified}`);
      } catch (error) {
        logger.error('Error processing UserVerified event:', error);
      }
    });
  }

  private setupMailEventListeners(): void {
    // Mail Sent Events
    this.mailContract.on('MailSent', async (mailId, from, to, ipfsCid, timestamp, priority, event) => {
      try {
        logger.info(`New email sent: ID ${mailId} from ${from} to ${to}`);

        // Get sender and recipient info
        const [senderData, recipientData] = await Promise.all([
          this.identityContract.getUser(from).catch(() => null),
          this.identityContract.getUser(to).catch(() => null)
        ]);

        // Get full mail data from contract
        const mailData = await this.mailContract.getMail(mailId);

        const email = new Email({
          mailId: Number(mailId),
          from: from.toLowerCase(),
          to: to.toLowerCase(),
          fromEmail: senderData ? senderData.email : undefined,
          toEmail: recipientData ? recipientData.email : undefined,
          fromUsername: senderData ? senderData.username : undefined,
          toUsername: recipientData ? recipientData.username : undefined,
          ipfsCid,
          subjectHash: mailData.subjectHash,
          timestamp: Number(timestamp),
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          isEncrypted: mailData.isEncrypted,
          isRead: mailData.isRead,
          isDeleted: mailData.isDeleted,
          priority: Number(priority),
        });

        await email.save();

        // Update user email counts
        await Promise.all([
          User.findOneAndUpdate(
            { walletAddress: from.toLowerCase() },
            { $inc: { 'emailCount.sent': 1 } }
          ),
          User.findOneAndUpdate(
            { walletAddress: to.toLowerCase() },
            { 
              $inc: { 
                'emailCount.received': 1,
                'emailCount.unread': 1
              }
            }
          )
        ]);

        // Emit real-time notification to recipient
        if (global.io) {
          global.io.to(`user:${to.toLowerCase()}`).emit('new-email', {
            mailId: Number(mailId),
            from: from.toLowerCase(),
            fromEmail: senderData?.email,
            fromUsername: senderData?.username,
            timestamp: Number(timestamp),
            priority: Number(priority)
          });
        }

      } catch (error) {
        logger.error('Error processing MailSent event:', error);
      }
    });

    // Mail Read Events
    this.mailContract.on('MailRead', async (mailId, reader, event) => {
      try {
        await Email.findOneAndUpdate(
          { mailId: Number(mailId) },
          { 
            isRead: true,
            updatedAt: new Date()
          }
        );

        // Update user unread count
        await User.findOneAndUpdate(
          { walletAddress: reader.toLowerCase() },
          { $inc: { 'emailCount.unread': -1 } }
        );

        logger.info(`Email marked as read: ID ${mailId} by ${reader}`);
      } catch (error) {
        logger.error('Error processing MailRead event:', error);
      }
    });

    // Mail Deleted Events
    this.mailContract.on('MailDeleted', async (mailId, deleter, event) => {
      try {
        await Email.findOneAndUpdate(
          { mailId: Number(mailId) },
          { 
            isDeleted: true,
            updatedAt: new Date()
          }
        );

        logger.info(`Email deleted: ID ${mailId} by ${deleter}`);
      } catch (error) {
        logger.error('Error processing MailDeleted event:', error);
      }
    });
  }

  private async syncHistoricalEvents(): Promise<void> {
    try {
      logger.info('Starting historical event sync...');

      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000); // Sync last 10k blocks

      // Sync user registration events
      const userEvents = await this.identityContract.queryFilter(
        this.identityContract.filters.UserRegistered(),
        fromBlock,
        currentBlock
      );

      for (const event of userEvents) {
        const existingUser = await User.findOne({ 
          registrationTransactionHash: event.transactionHash 
        });

        if (!existingUser) {
          // Process the event (similar to real-time processing)
          const [userAddress, username, email, timestamp] = event.args!;
          const userData = await this.identityContract.getUser(userAddress);

          const user = new User({
            walletAddress: userAddress.toLowerCase(),
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            publicKeyEncrypt: ethers.toUtf8String(userData.publicKeyEncrypt),
            registrationTime: Number(timestamp),
            registrationBlockNumber: event.blockNumber,
            registrationTransactionHash: event.transactionHash,
            isActive: userData.isActive,
            isVerified: userData.isVerified,
          });

          await user.save();
        }
      }

      // Sync mail events
      const mailEvents = await this.mailContract.queryFilter(
        this.mailContract.filters.MailSent(),
        fromBlock,
        currentBlock
      );

      for (const event of mailEvents) {
        const existingEmail = await Email.findOne({ 
          transactionHash: event.transactionHash 
        });

        if (!existingEmail) {
          const [mailId, from, to, ipfsCid, timestamp, priority] = event.args!;
          
          // Get user data and mail data
          const [senderData, recipientData, mailData] = await Promise.all([
            this.identityContract.getUser(from).catch(() => null),
            this.identityContract.getUser(to).catch(() => null),
            this.mailContract.getMail(mailId)
          ]);

          const email = new Email({
            mailId: Number(mailId),
            from: from.toLowerCase(),
            to: to.toLowerCase(),
            fromEmail: senderData ? senderData.email : undefined,
            toEmail: recipientData ? recipientData.email : undefined,
            fromUsername: senderData ? senderData.username : undefined,
            toUsername: recipientData ? recipientData.username : undefined,
            ipfsCid,
            subjectHash: mailData.subjectHash,
            timestamp: Number(timestamp),
            blockNumber: event.blockNumber!,
            transactionHash: event.transactionHash,
            isEncrypted: mailData.isEncrypted,
            isRead: mailData.isRead,
            isDeleted: mailData.isDeleted,
            priority: Number(priority),
          });

          await email.save();
        }
      }

      logger.info(`Historical sync completed. Synced ${userEvents.length} users and ${mailEvents.length} emails`);
    } catch (error) {
      logger.error('Error syncing historical events:', error);
    }
  }

  async stop(): Promise<void> {
    if (!this.isListening) return;

    try {
      this.identityContract.removeAllListeners();
      this.mailContract.removeAllListeners();
      this.isListening = false;
      logger.info('Blockchain listener stopped');
    } catch (error) {
      logger.error('Error stopping blockchain listener:', error);
    }
  }
}

let blockchainListener: BlockchainListener;

export const initializeBlockchainListener = async (): Promise<void> => {
  blockchainListener = new BlockchainListener();
  await blockchainListener.start();
};

export const getBlockchainListener = (): BlockchainListener => {
  return blockchainListener;
};
