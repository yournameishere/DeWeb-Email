import mongoose, { Document, Schema } from 'mongoose';

export interface IEmail extends Document {
  mailId: number;
  from: string;
  to: string;
  fromEmail?: string;
  toEmail?: string;
  fromUsername?: string;
  toUsername?: string;
  ipfsCid: string;
  subjectHash: string;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
  isEncrypted: boolean;
  isRead: boolean;
  isDeleted: boolean;
  priority: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const EmailSchema: Schema = new Schema({
  mailId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  from: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  to: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  fromEmail: {
    type: String,
    index: true
  },
  toEmail: {
    type: String,
    index: true
  },
  fromUsername: {
    type: String,
    index: true
  },
  toUsername: {
    type: String,
    index: true
  },
  ipfsCid: {
    type: String,
    required: true,
    index: true
  },
  subjectHash: {
    type: String,
    required: true
  },
  timestamp: {
    type: Number,
    required: true,
    index: true
  },
  blockNumber: {
    type: Number,
    required: true,
    index: true
  },
  transactionHash: {
    type: String,
    required: true,
    unique: true
  },
  isEncrypted: {
    type: Boolean,
    default: true
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 2,
    index: true
  },
  tags: [{
    type: String,
    lowercase: true
  }]
}, {
  timestamps: true
});

// Compound indexes for efficient queries
EmailSchema.index({ to: 1, timestamp: -1 });
EmailSchema.index({ from: 1, timestamp: -1 });
EmailSchema.index({ to: 1, isRead: 1, timestamp: -1 });
EmailSchema.index({ to: 1, isDeleted: 1, timestamp: -1 });
EmailSchema.index({ to: 1, priority: 1, timestamp: -1 });

// Text index for search functionality
EmailSchema.index({
  fromEmail: 'text',
  toEmail: 'text',
  fromUsername: 'text',
  toUsername: 'text',
  tags: 'text'
});

export const Email = mongoose.model<IEmail>('Email', EmailSchema);
