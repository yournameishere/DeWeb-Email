import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  walletAddress: string;
  username: string;
  email: string;
  publicKeyEncrypt: string;
  registrationTime: number;
  registrationBlockNumber: number;
  registrationTransactionHash: string;
  isActive: boolean;
  isVerified: boolean;
  lastSeen: Date;
  emailCount: {
    sent: number;
    received: number;
    unread: number;
  };
  settings: {
    notifications: boolean;
    publicProfile: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },
  publicKeyEncrypt: {
    type: String,
    required: true
  },
  registrationTime: {
    type: Number,
    required: true
  },
  registrationBlockNumber: {
    type: Number,
    required: true
  },
  registrationTransactionHash: {
    type: String,
    required: true,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  emailCount: {
    sent: {
      type: Number,
      default: 0
    },
    received: {
      type: Number,
      default: 0
    },
    unread: {
      type: Number,
      default: 0
    }
  },
  settings: {
    notifications: {
      type: Boolean,
      default: true
    },
    publicProfile: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Text index for search functionality
UserSchema.index({
  username: 'text',
  email: 'text'
});

export const User = mongoose.model<IUser>('User', UserSchema);
