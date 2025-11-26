'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { 
  Mail, 
  Search, 
  Filter, 
  RefreshCw, 
  Star, 
  Archive,
  Trash2,
  MoreVertical,
  Clock,
  User,
  Paperclip,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/components/providers/ToastProvider';
import { ContractService } from '@/lib/contracts';
import { IPFSService } from '@/lib/ipfs';
import { EncryptionService } from '@/lib/encryption';
import { DecryptedMail, MailPriority } from '@/types';
import { formatDistanceToNow } from 'date-fns';

export default function InboxPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { showError, showSuccess } = useToast();

  const [emails, setEmails] = useState<DecryptedMail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<DecryptedMail | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'priority'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const contractService = ContractService.getInstance();
  const ipfsService = IPFSService.getInstance();
  const encryptionService = EncryptionService.getInstance();

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
      return;
    }

    loadEmails();
  }, [isConnected, address]);

  const loadEmails = async () => {
    if (!address) return;

    try {
      setLoading(true);

      // Initialize contract service
      await contractService.initialize(window.ethereum);

      // Get received mail IDs
      const mailIds = await contractService.getReceivedMails(address);
      
      if (mailIds.length === 0) {
        setEmails([]);
        return;
      }

      // Load email details
      const emailPromises = mailIds.map(async (mailId) => {
        try {
          const mailHeader = await contractService.getMail(mailId);
          if (!mailHeader || mailHeader.isDeleted) return null;

          // Get sender info
          const senderInfo = await contractService.getUser(mailHeader.from);
          
          // Decrypt email content
          const encryptedData = await ipfsService.retrieveEmailData(mailHeader.ipfsCid);
          
          // Get user's private key
          const encryptedPrivateKey = localStorage.getItem(`demailx_key_${address}`);
          if (!encryptedPrivateKey) {
            throw new Error('Private key not found');
          }

          // For demo purposes, we'll use a simple password prompt
          // In production, you'd want a more secure key management system
          const password = prompt('Enter your password to decrypt emails:');
          if (!password) throw new Error('Password required');

          const privateKey = encryptionService.decryptPrivateKey(encryptedPrivateKey, password);
          const decryptedContent = encryptionService.decryptEmailData(encryptedData, privateKey);

          return {
            id: mailHeader.id,
            from: mailHeader.from,
            to: mailHeader.to,
            fromEmail: senderInfo?.email || 'Unknown',
            toEmail: 'You',
            subject: decryptedContent.subject,
            body: decryptedContent.body,
            attachments: decryptedContent.attachments || [],
            timestamp: mailHeader.timestamp * 1000, // Convert to milliseconds
            priority: mailHeader.priority,
            isRead: mailHeader.isRead,
          } as DecryptedMail;
        } catch (error) {
          console.error(`Failed to load email ${mailId}:`, error);
          return null;
        }
      });

      const loadedEmails = (await Promise.all(emailPromises))
        .filter(email => email !== null) as DecryptedMail[];

      // Sort by timestamp (newest first)
      loadedEmails.sort((a, b) => b.timestamp - a.timestamp);
      
      setEmails(loadedEmails);
    } catch (error: any) {
      console.error('Failed to load emails:', error);
      showError('Load Failed', 'Failed to load your emails');
    } finally {
      setLoading(false);
    }
  };

  const refreshEmails = async () => {
    setRefreshing(true);
    await loadEmails();
    setRefreshing(false);
    showSuccess('Refreshed', 'Your inbox has been updated');
  };

  const markAsRead = async (email: DecryptedMail) => {
    if (email.isRead) return;

    try {
      await contractService.markAsRead(email.id);
      
      // Update local state
      setEmails(prev => prev.map(e => 
        e.id === email.id ? { ...e, isRead: true } : e
      ));

      if (selectedEmail?.id === email.id) {
        setSelectedEmail({ ...selectedEmail, isRead: true });
      }
    } catch (error) {
      showError('Error', 'Failed to mark email as read');
    }
  };

  const deleteEmail = async (email: DecryptedMail) => {
    try {
      await contractService.deleteMail(email.id);
      
      // Remove from local state
      setEmails(prev => prev.filter(e => e.id !== email.id));
      
      if (selectedEmail?.id === email.id) {
        setSelectedEmail(null);
      }

      showSuccess('Deleted', 'Email moved to trash');
    } catch (error) {
      showError('Error', 'Failed to delete email');
    }
  };

  const filteredEmails = emails.filter(email => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!email.subject.toLowerCase().includes(query) && 
          !email.fromEmail.toLowerCase().includes(query) &&
          !email.body.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Type filter
    switch (filterType) {
      case 'unread':
        return !email.isRead;
      case 'priority':
        return email.priority > MailPriority.NORMAL;
      default:
        return true;
    }
  });

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case MailPriority.HIGH:
        return 'text-yellow-400';
      case MailPriority.URGENT:
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getPriorityBorder = (priority: number) => {
    switch (priority) {
      case MailPriority.HIGH:
        return 'border-l-yellow-400';
      case MailPriority.URGENT:
        return 'border-l-red-400';
      default:
        return 'border-l-green-400';
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
        <header className="glass border-b border-white/10 px-6 py-4 sticky top-0 z-50">
          <div className="flex items-center justify-between">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-4"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center animate-pulse-glow">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">DeMailX</h1>
                <p className="text-xs text-gray-400">Decentralized Email</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-4"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/compose')}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg"
              >
                Compose
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={refreshEmails}
                disabled={refreshing}
                className="p-3 text-gray-300 hover:text-white transition-colors rounded-xl hover:bg-white/10"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </motion.button>
            </motion.div>
          </div>
        </header>

        <div className="flex h-[calc(100vh-80px)]">
          {/* Sidebar */}
          <div className="w-64 glass border-r border-white/10 p-4">
            <nav className="space-y-2">
              <button className="w-full flex items-center space-x-3 px-4 py-2 text-white bg-blue-500/20 rounded-lg">
                <Mail className="w-5 h-5" />
                <span>Inbox</span>
                <span className="ml-auto bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                  {emails.filter(e => !e.isRead).length}
                </span>
              </button>
              
              <button 
                onClick={() => router.push('/sent')}
                className="w-full flex items-center space-x-3 px-4 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <Mail className="w-5 h-5" />
                <span>Sent</span>
              </button>

              <button className="w-full flex items-center space-x-3 px-4 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <Star className="w-5 h-5" />
                <span>Starred</span>
              </button>

              <button className="w-full flex items-center space-x-3 px-4 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <Archive className="w-5 h-5" />
                <span>Archive</span>
              </button>

              <button className="w-full flex items-center space-x-3 px-4 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <Trash2 className="w-5 h-5" />
                <span>Trash</span>
              </button>
            </nav>
          </div>

          {/* Email List */}
          <div className="flex-1 flex">
            <div className="w-96 border-r border-white/10">
              {/* Search and Filters */}
              <div className="p-4 border-b border-white/10">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search emails..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      filterType === 'all' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterType('unread')}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      filterType === 'unread' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Unread
                  </button>
                  <button
                    onClick={() => setFilterType('priority')}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      filterType === 'priority' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Priority
                  </button>
                </div>
              </div>

              {/* Email List */}
              <div className="overflow-y-auto h-[calc(100vh-200px)]">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
                ) : filteredEmails.length === 0 ? (
                  <div className="text-center py-12">
                    <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">No emails found</p>
                  </div>
                ) : (
                  filteredEmails.map((email) => (
                    <motion.div
                      key={email.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`
                        p-4 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors
                        ${selectedEmail?.id === email.id ? 'bg-blue-500/20' : ''}
                        ${!email.isRead ? 'bg-white/5' : ''}
                        border-l-4 ${getPriorityBorder(email.priority)}
                      `}
                      onClick={() => {
                        setSelectedEmail(email);
                        markAsRead(email);
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className={`text-sm ${!email.isRead ? 'font-semibold text-white' : 'text-gray-300'}`}>
                              {email.fromEmail}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(email.timestamp), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          {email.attachments.length > 0 && (
                            <Paperclip className="w-4 h-4 text-gray-400" />
                          )}
                          {email.priority > MailPriority.NORMAL && (
                            <AlertCircle className={`w-4 h-4 ${getPriorityColor(email.priority)}`} />
                          )}
                          {!email.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          )}
                        </div>
                      </div>

                      <h3 className={`text-sm mb-1 ${!email.isRead ? 'font-semibold text-white' : 'text-gray-300'}`}>
                        {email.subject || 'No Subject'}
                      </h3>
                      
                      <p className="text-xs text-gray-400 line-clamp-2">
                        {email.body.substring(0, 100)}...
                      </p>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Email Content */}
            <div className="flex-1">
              {selectedEmail ? (
                <div className="h-full flex flex-col">
                  {/* Email Header */}
                  <div className="p-6 border-b border-white/10">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h1 className="text-2xl font-bold text-white mb-2">
                          {selectedEmail.subject || 'No Subject'}
                        </h1>
                        <div className="flex items-center space-x-4 text-sm text-gray-300">
                          <span>From: {selectedEmail.fromEmail}</span>
                          <span>•</span>
                          <span>{new Date(selectedEmail.timestamp).toLocaleString()}</span>
                          {selectedEmail.priority > MailPriority.NORMAL && (
                            <>
                              <span>•</span>
                              <span className={`${getPriorityColor(selectedEmail.priority)} font-semibold`}>
                                {selectedEmail.priority === MailPriority.HIGH ? 'High Priority' : 'Urgent'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => deleteEmail(selectedEmail)}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-white transition-colors">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {selectedEmail.attachments.length > 0 && (
                      <div className="flex items-center space-x-2 text-sm text-gray-300">
                        <Paperclip className="w-4 h-4" />
                        <span>{selectedEmail.attachments.length} attachment(s)</span>
                      </div>
                    )}
                  </div>

                  {/* Email Body */}
                  <div className="flex-1 p-6 overflow-y-auto">
                    <div className="prose prose-invert max-w-none">
                      <div className="whitespace-pre-wrap text-gray-300">
                        {selectedEmail.body}
                      </div>
                    </div>

                    {/* Attachments */}
                    {selectedEmail.attachments.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-white/10">
                        <h3 className="text-lg font-semibold text-white mb-4">Attachments</h3>
                        <div className="space-y-2">
                          {selectedEmail.attachments.map((attachment, index) => (
                            <div key={index} className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                              <Paperclip className="w-5 h-5 text-gray-400" />
                              <div className="flex-1">
                                <p className="text-white font-medium">{attachment.name}</p>
                                <p className="text-sm text-gray-400">
                                  {attachment.type} • {(attachment.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                              <button className="text-blue-400 hover:text-blue-300 transition-colors">
                                Download
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reply Actions */}
                  <div className="p-6 border-t border-white/10">
                    <div className="flex space-x-4">
                      <button className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors">
                        Reply
                      </button>
                      <button className="border border-gray-600 text-gray-300 px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-colors">
                        Forward
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Select an email</h3>
                    <p className="text-gray-400">Choose an email from the list to read its content</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
