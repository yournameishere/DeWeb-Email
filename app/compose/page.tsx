'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Send, 
  Paperclip, 
  X, 
  AlertCircle, 
  Loader2,
  User,
  Mail,
  Type,
  FileText,
  Image,
  Film
} from 'lucide-react';
import { useToast } from '@/components/providers/ToastProvider';
import { ContractService } from '@/lib/contracts';
import { IPFSService } from '@/lib/ipfs';
import { EncryptionService } from '@/lib/encryption';
import { MailPriority, Attachment, EncryptedEmailData } from '@/types';

export default function ComposePage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { showSuccess, showError, showInfo } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    to: '',
    subject: '',
    body: '',
    priority: MailPriority.NORMAL,
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [recipientInfo, setRecipientInfo] = useState<any>(null);
  const [recipientLoading, setRecipientLoading] = useState(false);

  const contractService = ContractService.getInstance();
  const ipfsService = IPFSService.getInstance();
  const encryptionService = EncryptionService.getInstance();

  const validateRecipient = async (email: string) => {
    if (!email.trim()) {
      setRecipientInfo(null);
      return;
    }

    try {
      setRecipientLoading(true);
      
      // Check if it's a DeMailX email
      if (email.includes('@dewebmail.xyz')) {
        const user = await contractService.getUserByEmail(email);
        if (user) {
          setRecipientInfo({
            email: user.email,
            username: user.username,
            address: user.walletAddress,
            publicKey: user.publicKeyEncrypt,
            verified: user.isVerified,
          });
        } else {
          setRecipientInfo(null);
          showError('Recipient Not Found', 'This email address is not registered on DeMailX');
        }
      } else {
        // For external emails (future feature)
        setRecipientInfo(null);
        showError('External Email', 'External email addresses are not supported yet');
      }
    } catch (error) {
      console.error('Recipient validation error:', error);
      setRecipientInfo(null);
    } finally {
      setRecipientLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Check file size (max 10MB per file)
    const maxSize = 10 * 1024 * 1024;
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        showError('File Too Large', `${file.name} is larger than 10MB`);
        return false;
      }
      return true;
    });

    setAttachments(prev => [...prev, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.startsWith('video/')) return Film;
    if (type.includes('text') || type.includes('document')) return FileText;
    return Paperclip;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const sendEmail = async () => {
    if (!recipientInfo || !address) {
      showError('Invalid Recipient', 'Please enter a valid recipient email');
      return;
    }

    if (!formData.subject.trim() && !formData.body.trim()) {
      showError('Empty Email', 'Please enter a subject or message');
      return;
    }

    try {
      setSending(true);
      showInfo('Sending Email', 'Encrypting and uploading your email...');

      // Initialize contract service
      await contractService.initialize(window.ethereum);

      // Process attachments
      const processedAttachments: Attachment[] = [];
      
      for (const file of attachments) {
        showInfo('Processing Attachment', `Encrypting ${file.name}...`);
        
        // Read file as ArrayBuffer
        const fileBuffer = await file.arrayBuffer();
        
        // Encrypt file data
        const encryptedFileData = encryptionService.encryptFile(fileBuffer, recipientInfo.publicKey);
        
        // Upload encrypted file to IPFS
        const fileUploadResult = await ipfsService.uploadFile(file, encryptedFileData);
        
        processedAttachments.push({
          name: file.name,
          type: file.type,
          size: file.size,
          ipfsCid: fileUploadResult.cid,
          encryptedData: encryptedFileData,
        });
      }

      // Prepare email data
      const emailData: EncryptedEmailData = {
        subject: formData.subject,
        body: formData.body,
        attachments: processedAttachments,
        timestamp: Date.now(),
        metadata: {
          replyTo: undefined,
          cc: [],
          bcc: [],
        },
      };

      // Encrypt email data
      const encryptedEmailData = encryptionService.encryptEmailData(emailData, recipientInfo.publicKey);

      // Upload to IPFS
      showInfo('Uploading', 'Storing encrypted email on IPFS...');
      const uploadResult = await ipfsService.uploadEmailData(encryptedEmailData, {
        from: address,
        to: recipientInfo.address,
        timestamp: Date.now(),
      });

      // Generate subject hash for privacy
      const subjectHash = encryptionService.generateSubjectHash(formData.subject);

      // Send transaction to blockchain
      showInfo('Broadcasting', 'Recording email on blockchain...');
      const txHash = await contractService.sendMail(
        recipientInfo.address,
        uploadResult.cid,
        subjectHash,
        formData.priority
      );

      showSuccess('Email Sent!', 'Your email has been sent successfully');
      
      // Clear form
      setFormData({
        to: '',
        subject: '',
        body: '',
        priority: MailPriority.NORMAL,
      });
      setAttachments([]);
      setRecipientInfo(null);

      // Redirect to sent folder after a delay
      setTimeout(() => {
        router.push('/sent');
      }, 2000);

    } catch (error: any) {
      console.error('Send email error:', error);
      showError('Send Failed', error.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Please connect your wallet</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="cyber-grid min-h-screen">
        {/* Header */}
        <header className="glass border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-white">Compose Email</h1>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={sendEmail}
                disabled={sending || !recipientInfo}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{sending ? 'Sending...' : 'Send'}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Compose Form */}
        <div className="max-w-4xl mx-auto p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl p-6"
          >
            {/* Recipient Field */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                To
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.to}
                  onChange={(e) => setFormData(prev => ({ ...prev, to: e.target.value }))}
                  onBlur={() => validateRecipient(formData.to)}
                  placeholder="recipient@dewebmail.xyz"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                />
                
                {recipientLoading && (
                  <div className="absolute right-3 top-3">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  </div>
                )}

                {recipientInfo && (
                  <div className="absolute right-3 top-3">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <User className="w-3 h-3 text-white" />
                    </div>
                  </div>
                )}
              </div>

              {/* Recipient Info */}
              {recipientInfo && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 p-3 bg-green-500/20 border border-green-500/30 rounded-lg"
                >
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 font-medium">{recipientInfo.username}</span>
                    {recipientInfo.verified && (
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-green-300 mt-1">{recipientInfo.email}</p>
                </motion.div>
              )}
            </div>

            {/* Subject and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Enter subject..."
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={MailPriority.NORMAL}>Normal</option>
                  <option value={MailPriority.HIGH}>High</option>
                  <option value={MailPriority.URGENT}>Urgent</option>
                </select>
              </div>
            </div>

            {/* Message Body */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Message
              </label>
              <textarea
                value={formData.body}
                onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Write your message..."
                rows={12}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Attachments */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-300">
                  Attachments
                </label>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Paperclip className="w-4 h-4" />
                  <span>Add Files</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((file, index) => {
                    const FileIcon = getFileIcon(file.type);
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg"
                      >
                        <FileIcon className="w-5 h-5 text-gray-400" />
                        <div className="flex-1">
                          <p className="text-white font-medium">{file.name}</p>
                          <p className="text-sm text-gray-400">
                            {file.type} • {formatFileSize(file.size)}
                          </p>
                        </div>
                        <button
                          onClick={() => removeAttachment(index)}
                          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Security Notice */}
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <h3 className="text-blue-400 font-medium mb-1">End-to-End Encryption</h3>
                  <p className="text-blue-300 text-sm">
                    Your email will be encrypted with the recipient's public key before being stored on IPFS. 
                    Only the recipient can decrypt and read this message.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
