import { ethers } from 'ethers';
import { User, MailHeader, ContractAddresses } from '@/types';

// Contract ABIs (simplified for key functions)
const IDENTITY_REGISTRY_ABI = [
  "function registerUser(string memory _username, string memory _email, bytes memory _publicKeyEncrypt) external",
  "function updateUser(string memory _username, string memory _email, bytes memory _publicKeyEncrypt) external",
  "function getUser(address _userAddress) external view returns (tuple(string username, string email, bytes publicKeyEncrypt, address walletAddress, uint256 registrationTime, bool isActive, bool isVerified))",
  "function getUserByUsername(string memory _username) external view returns (tuple(string username, string email, bytes publicKeyEncrypt, address walletAddress, uint256 registrationTime, bool isActive, bool isVerified))",
  "function getUserByEmail(string memory _email) external view returns (tuple(string username, string email, bytes publicKeyEncrypt, address walletAddress, uint256 registrationTime, bool isActive, bool isVerified))",
  "function getAddressByUsername(string memory _username) external view returns (address)",
  "function getAddressByEmail(string memory _email) external view returns (address)",
  "function isUserRegistered(address _userAddress) external view returns (bool)",
  "function isUsernameAvailable(string memory _username) external view returns (bool)",
  "function isEmailAvailable(string memory _email) external view returns (bool)",
  "function getTotalUsers() external view returns (uint256)",
  "function verifyUser(address _userAddress, bool _verified) external",
  "event UserRegistered(address indexed userAddress, string username, string email, uint256 timestamp)",
  "event UserUpdated(address indexed userAddress, string username, string email)",
  "event UserVerified(address indexed userAddress, bool verified)"
];

const MAIL_REGISTRY_ABI = [
  "function sendMail(address _to, string memory _ipfsCid, bytes32 _subjectHash, uint256 _priority) external payable",
  "function markAsRead(uint256 _mailId) external",
  "function deleteMail(uint256 _mailId) external",
  "function getMail(uint256 _mailId) external view returns (tuple(uint256 id, address from, address to, string ipfsCid, bytes32 subjectHash, uint256 timestamp, bool isEncrypted, bool isRead, bool isDeleted, uint256 priority))",
  "function getSentMails(address _user) external view returns (uint256[] memory)",
  "function getReceivedMails(address _user) external view returns (uint256[] memory)",
  "function getUnreadMails(address _user) external view returns (uint256[] memory)",
  "function getMailsByPriority(address _user, uint256 _priority) external view returns (uint256[] memory)",
  "function getUserStats(address _user) external view returns (tuple(uint256 totalSent, uint256 totalReceived, uint256 totalUnread))",
  "function getMailsInRange(address _user, uint256 _startTime, uint256 _endTime, bool _sent) external view returns (uint256[] memory)",
  "function getTotalMails() external view returns (uint256)",
  "function getMailFee() external view returns (uint256)",
  "event MailSent(uint256 indexed mailId, address indexed from, address indexed to, string ipfsCid, uint256 timestamp, uint256 priority)",
  "event MailRead(uint256 indexed mailId, address indexed reader)",
  "event MailDeleted(uint256 indexed mailId, address indexed deleter)"
];

export class ContractService {
  private static instance: ContractService;
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private identityContract: ethers.Contract | null = null;
  private mailContract: ethers.Contract | null = null;
  private contractAddresses: ContractAddresses;

  private constructor() {
    // Default to Polygon Mumbai testnet addresses (will be updated after deployment)
    this.contractAddresses = {
      identityRegistry: process.env.NEXT_PUBLIC_IDENTITY_CONTRACT || '',
      mailRegistry: process.env.NEXT_PUBLIC_MAIL_CONTRACT || '',
    };
  }

  public static getInstance(): ContractService {
    if (!ContractService.instance) {
      ContractService.instance = new ContractService();
    }
    return ContractService.instance;
  }

  /**
   * Initialize contract service with wallet provider
   */
  async initialize(provider: any): Promise<void> {
    try {
      this.provider = new ethers.BrowserProvider(provider);
      this.signer = await this.provider.getSigner();
      
      // Initialize contracts
      this.identityContract = new ethers.Contract(
        this.contractAddresses.identityRegistry,
        IDENTITY_REGISTRY_ABI,
        this.signer
      );

      this.mailContract = new ethers.Contract(
        this.contractAddresses.mailRegistry,
        MAIL_REGISTRY_ABI,
        this.signer
      );

      console.log('Contract service initialized successfully');
    } catch (error) {
      console.error('Contract initialization error:', error);
      throw new Error('Failed to initialize contract service');
    }
  }

  /**
   * Update contract addresses (useful for different networks)
   */
  updateContractAddresses(addresses: ContractAddresses): void {
    this.contractAddresses = addresses;
    
    if (this.signer) {
      this.identityContract = new ethers.Contract(
        addresses.identityRegistry,
        IDENTITY_REGISTRY_ABI,
        this.signer
      );

      this.mailContract = new ethers.Contract(
        addresses.mailRegistry,
        MAIL_REGISTRY_ABI,
        this.signer
      );
    }
  }

  /**
   * Register a new user
   */
  async registerUser(username: string, email: string, publicKey: string): Promise<string> {
    if (!this.identityContract) throw new Error('Contract not initialized');

    try {
      const publicKeyBytes = ethers.toUtf8Bytes(publicKey);
      const tx = await this.identityContract.registerUser(username, email, publicKeyBytes);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('User registration error:', error);
      throw new Error('Failed to register user');
    }
  }

  /**
   * Update user information
   */
  async updateUser(username: string, email: string, publicKey: string): Promise<string> {
    if (!this.identityContract) throw new Error('Contract not initialized');

    try {
      const publicKeyBytes = ethers.toUtf8Bytes(publicKey);
      const tx = await this.identityContract.updateUser(username, email, publicKeyBytes);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('User update error:', error);
      throw new Error('Failed to update user');
    }
  }

  /**
   * Get user by wallet address
   */
  async getUser(address: string): Promise<User | null> {
    if (!this.identityContract) throw new Error('Contract not initialized');

    try {
      const userData = await this.identityContract.getUser(address);
      
      if (!userData.isActive) return null;

      return {
        username: userData.username,
        email: userData.email,
        publicKeyEncrypt: ethers.toUtf8String(userData.publicKeyEncrypt),
        walletAddress: userData.walletAddress,
        registrationTime: Number(userData.registrationTime),
        isActive: userData.isActive,
        isVerified: userData.isVerified,
      };
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<User | null> {
    if (!this.identityContract) throw new Error('Contract not initialized');

    try {
      const userData = await this.identityContract.getUserByUsername(username);
      
      return {
        username: userData.username,
        email: userData.email,
        publicKeyEncrypt: ethers.toUtf8String(userData.publicKeyEncrypt),
        walletAddress: userData.walletAddress,
        registrationTime: Number(userData.registrationTime),
        isActive: userData.isActive,
        isVerified: userData.isVerified,
      };
    } catch (error) {
      console.error('Get user by username error:', error);
      return null;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    if (!this.identityContract) throw new Error('Contract not initialized');

    try {
      const userData = await this.identityContract.getUserByEmail(email);
      
      return {
        username: userData.username,
        email: userData.email,
        publicKeyEncrypt: ethers.toUtf8String(userData.publicKeyEncrypt),
        walletAddress: userData.walletAddress,
        registrationTime: Number(userData.registrationTime),
        isActive: userData.isActive,
        isVerified: userData.isVerified,
      };
    } catch (error) {
      console.error('Get user by email error:', error);
      return null;
    }
  }

  /**
   * Check if username is available
   */
  async isUsernameAvailable(username: string): Promise<boolean> {
    if (!this.identityContract) throw new Error('Contract not initialized');

    try {
      return await this.identityContract.isUsernameAvailable(username);
    } catch (error) {
      console.error('Username availability check error:', error);
      return false;
    }
  }

  /**
   * Check if email is available
   */
  async isEmailAvailable(email: string): Promise<boolean> {
    if (!this.identityContract) throw new Error('Contract not initialized');

    try {
      return await this.identityContract.isEmailAvailable(email);
    } catch (error) {
      console.error('Email availability check error:', error);
      return false;
    }
  }

  /**
   * Send a mail
   */
  async sendMail(
    to: string,
    ipfsCid: string,
    subjectHash: string,
    priority: number = 0
  ): Promise<string> {
    if (!this.mailContract) throw new Error('Contract not initialized');

    try {
      const fee = await this.mailContract.getMailFee();
      const subjectHashBytes = ethers.id(subjectHash); // Convert to bytes32
      
      const tx = await this.mailContract.sendMail(
        to,
        ipfsCid,
        subjectHashBytes,
        priority,
        { value: fee }
      );
      
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Send mail error:', error);
      throw new Error('Failed to send mail');
    }
  }

  /**
   * Mark mail as read
   */
  async markAsRead(mailId: number): Promise<string> {
    if (!this.mailContract) throw new Error('Contract not initialized');

    try {
      const tx = await this.mailContract.markAsRead(mailId);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Mark as read error:', error);
      throw new Error('Failed to mark mail as read');
    }
  }

  /**
   * Delete mail
   */
  async deleteMail(mailId: number): Promise<string> {
    if (!this.mailContract) throw new Error('Contract not initialized');

    try {
      const tx = await this.mailContract.deleteMail(mailId);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Delete mail error:', error);
      throw new Error('Failed to delete mail');
    }
  }

  /**
   * Get mail by ID
   */
  async getMail(mailId: number): Promise<MailHeader | null> {
    if (!this.mailContract) throw new Error('Contract not initialized');

    try {
      const mailData = await this.mailContract.getMail(mailId);
      
      return {
        id: Number(mailData.id),
        from: mailData.from,
        to: mailData.to,
        ipfsCid: mailData.ipfsCid,
        subjectHash: mailData.subjectHash,
        timestamp: Number(mailData.timestamp),
        isEncrypted: mailData.isEncrypted,
        isRead: mailData.isRead,
        isDeleted: mailData.isDeleted,
        priority: Number(mailData.priority),
      };
    } catch (error) {
      console.error('Get mail error:', error);
      return null;
    }
  }

  /**
   * Get sent mails for user
   */
  async getSentMails(userAddress: string): Promise<number[]> {
    if (!this.mailContract) throw new Error('Contract not initialized');

    try {
      const mailIds = await this.mailContract.getSentMails(userAddress);
      return mailIds.map((id: any) => Number(id));
    } catch (error) {
      console.error('Get sent mails error:', error);
      return [];
    }
  }

  /**
   * Get received mails for user
   */
  async getReceivedMails(userAddress: string): Promise<number[]> {
    if (!this.mailContract) throw new Error('Contract not initialized');

    try {
      const mailIds = await this.mailContract.getReceivedMails(userAddress);
      return mailIds.map((id: any) => Number(id));
    } catch (error) {
      console.error('Get received mails error:', error);
      return [];
    }
  }

  /**
   * Get unread mails for user
   */
  async getUnreadMails(userAddress: string): Promise<number[]> {
    if (!this.mailContract) throw new Error('Contract not initialized');

    try {
      const mailIds = await this.mailContract.getUnreadMails(userAddress);
      return mailIds.map((id: any) => Number(id));
    } catch (error) {
      console.error('Get unread mails error:', error);
      return [];
    }
  }

  /**
   * Get current mail fee
   */
  async getMailFee(): Promise<string> {
    if (!this.mailContract) throw new Error('Contract not initialized');

    try {
      const fee = await this.mailContract.getMailFee();
      return ethers.formatEther(fee);
    } catch (error) {
      console.error('Get mail fee error:', error);
      return '0';
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(userAddress: string): Promise<{
    totalSent: number;
    totalReceived: number;
    totalUnread: number;
  }> {
    if (!this.mailContract) throw new Error('Contract not initialized');

    try {
      const stats = await this.mailContract.getUserStats(userAddress);
      return {
        totalSent: Number(stats.totalSent),
        totalReceived: Number(stats.totalReceived),
        totalUnread: Number(stats.totalUnread),
      };
    } catch (error) {
      console.error('Get user stats error:', error);
      return { totalSent: 0, totalReceived: 0, totalUnread: 0 };
    }
  }

  /**
   * Listen to contract events
   */
  setupEventListeners(callbacks: {
    onMailSent?: (event: any) => void;
    onMailRead?: (event: any) => void;
    onUserRegistered?: (event: any) => void;
  }): void {
    if (!this.mailContract || !this.identityContract) return;

    if (callbacks.onMailSent) {
      this.mailContract.on('MailSent', callbacks.onMailSent);
    }

    if (callbacks.onMailRead) {
      this.mailContract.on('MailRead', callbacks.onMailRead);
    }

    if (callbacks.onUserRegistered) {
      this.identityContract.on('UserRegistered', callbacks.onUserRegistered);
    }
  }

  /**
   * Remove event listeners
   */
  removeEventListeners(): void {
    if (this.mailContract) {
      this.mailContract.removeAllListeners();
    }
    if (this.identityContract) {
      this.identityContract.removeAllListeners();
    }
  }

  /**
   * Get contract addresses
   */
  getContractAddresses(): ContractAddresses {
    return this.contractAddresses;
  }

  /**
   * Check if contracts are initialized
   */
  isInitialized(): boolean {
    return !!(this.identityContract && this.mailContract && this.signer);
  }
}
