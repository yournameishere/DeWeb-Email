export interface User {
  username: string;
  email: string;
  publicKeyEncrypt: string;
  walletAddress: string;
  registrationTime: number;
  isActive: boolean;
  isVerified: boolean;
}

export interface MailHeader {
  id: number;
  from: string;
  to: string;
  ipfsCid: string;
  subjectHash: string;
  timestamp: number;
  isEncrypted: boolean;
  isRead: boolean;
  isDeleted: boolean;
  priority: number;
}

export interface DecryptedMail {
  id: number;
  from: string;
  to: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  body: string;
  attachments: Attachment[];
  timestamp: number;
  priority: number;
  isRead: boolean;
}

export interface Attachment {
  name: string;
  type: string;
  size: number;
  ipfsCid: string;
  encryptedData?: string;
}

export interface EncryptedEmailData {
  subject: string;
  body: string;
  attachments: Attachment[];
  timestamp: number;
  metadata?: {
    replyTo?: string;
    cc?: string[];
    bcc?: string[];
  };
}

export interface MailStats {
  totalSent: number;
  totalReceived: number;
  totalUnread: number;
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface WalletConnection {
  address: string;
  isConnected: boolean;
  chainId: number;
  balance: string;
}

export interface ContractAddresses {
  identityRegistry: string;
  mailRegistry: string;
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  contracts: ContractAddresses;
}

export interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

export interface IPFSUploadResult {
  cid: string;
  size: number;
  url: string;
}

export enum MailPriority {
  NORMAL = 0,
  HIGH = 1,
  URGENT = 2,
}

export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

export interface SearchFilters {
  sender?: string;
  recipient?: string;
  subject?: string;
  dateFrom?: Date;
  dateTo?: Date;
  priority?: MailPriority;
  unreadOnly?: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: 'timestamp' | 'priority' | 'sender';
  sortOrder?: 'asc' | 'desc';
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface BackendConfig {
  apiUrl: string;
  indexerUrl: string;
  websocketUrl: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    browser: boolean;
    sound: boolean;
  };
  privacy: {
    showOnlineStatus: boolean;
    allowReadReceipts: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
    sessionTimeout: number;
  };
}
