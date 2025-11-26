'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { 
  Mail, 
  Search, 
  ArrowLeft, 
  RefreshCw, 
  User,
  Clock,
  Paperclip,
  AlertCircle,
  Loader2,
  CheckCircle,
  Send
} from 'lucide-react';
import { useToast } from '@/components/providers/ToastProvider';
import { ContractService } from '@/lib/contracts';
import { MailHeader, MailPriority } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface SentEmail extends MailHeader {
  recipientEmail: string;
  recipientUsername: string;
}

export default function SentPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { showError, showSuccess } = useToast();

  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<SentEmail | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const contractService = ContractService.getInstance();

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
      return;
    }

    loadSentEmails();
  }, [isConnected, address]);

  const loadSentEmails = async () => {
    if (!address) return;

    try {
      setLoading(true);

      // Initialize contract service
      await contractService.initialize(window.ethereum);

      // Get sent mail IDs
      const mailIds = await contractService.getSentMails(address);
      
      if (mailIds.length === 0) {
        setEmails([]);
        return;
      }

      // Load email details
      const emailPromises = mailIds.map(async (mailId) => {
        try {
          const mailHeader = await contractService.getMail(mailId);
          if (!mailHeader || mailHeader.isDeleted) return null;

          // Get recipient info
          const recipientInfo = await contractService.getUser(mailHeader.to);
          
          return {
            ...mailHeader,
            recipientEmail: recipientInfo?.email || 'Unknown',
            recipientUsername: recipientInfo?.username || 'Unknown',
          } as SentEmail;
        } catch (error) {
          console.error(`Failed to load sent email ${mailId}:`, error);
          return null;
        }
      });

      const loadedEmails = (await Promise.all(emailPromises))
        .filter(email => email !== null) as SentEmail[];

      // Sort by timestamp (newest first)
      loadedEmails.sort((a, b) => b.timestamp - a.timestamp);
      
      setEmails(loadedEmails);
    } catch (error: any) {
      console.error('Failed to load sent emails:', error);
      showError('Load Failed', 'Failed to load your sent emails');
    } finally {
      setLoading(false);
    }
  };

  const refreshEmails = async () => {
    setRefreshing(true);
    await loadSentEmails();
    setRefreshing(false);
    showSuccess('Refreshed', 'Your sent emails have been updated');
  };

  const filteredEmails = emails.filter(email => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return email.recipientEmail.toLowerCase().includes(query) ||
           email.recipientUsername.toLowerCase().includes(query);
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
        return 'border-l-blue-400';
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
                onClick={() => router.push('/inbox')}
                className="p-2 text-gray-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Send className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">Sent Emails</h1>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/compose')}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
              >
                Compose
              </button>
              <button
                onClick={refreshEmails}
                disabled={refreshing}
                className="p-2 text-gray-300 hover:text-white transition-colors"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </header>

        <div className="flex h-[calc(100vh-80px)]">
          {/* Sidebar */}
          <div className="w-64 glass border-r border-white/10 p-4">
            <nav className="space-y-2">
              <button 
                onClick={() => router.push('/inbox')}
                className="w-full flex items-center space-x-3 px-4 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <Mail className="w-5 h-5" />
                <span>Inbox</span>
              </button>
              
              <button className="w-full flex items-center space-x-3 px-4 py-2 text-white bg-blue-500/20 rounded-lg">
                <Send className="w-5 h-5" />
                <span>Sent</span>
                <span className="ml-auto bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                  {emails.length}
                </span>
              </button>
            </nav>
          </div>

          {/* Email List */}
          <div className="flex-1 flex">
            <div className="w-96 border-r border-white/10">
              {/* Search */}
              <div className="p-4 border-b border-white/10">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search sent emails..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Email List */}
              <div className="overflow-y-auto h-[calc(100vh-160px)]">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
                ) : filteredEmails.length === 0 ? (
                  <div className="text-center py-12">
                    <Send className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">No sent emails found</p>
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
                        border-l-4 ${getPriorityBorder(email.priority)}
                      `}
                      onClick={() => setSelectedEmail(email)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">
                              To: {email.recipientUsername}
                            </p>
                            <p className="text-xs text-gray-400">
                              {email.recipientEmail}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          {email.priority > MailPriority.NORMAL && (
                            <AlertCircle className={`w-4 h-4 ${getPriorityColor(email.priority)}`} />
                          )}
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                        <span>
                          {formatDistanceToNow(new Date(email.timestamp * 1000), { addSuffix: true })}
                        </span>
                        {email.priority > MailPriority.NORMAL && (
                          <span className={`${getPriorityColor(email.priority)} font-semibold`}>
                            {email.priority === MailPriority.HIGH ? 'High' : 'Urgent'}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-400">
                        Email ID: {email.id} • IPFS: {email.ipfsCid.substring(0, 12)}...
                      </p>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Email Details */}
            <div className="flex-1">
              {selectedEmail ? (
                <div className="h-full flex flex-col">
                  {/* Email Header */}
                  <div className="p-6 border-b border-white/10">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h1 className="text-2xl font-bold text-white mb-2">
                          Email Details
                        </h1>
                        <div className="space-y-2 text-sm text-gray-300">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">To:</span>
                            <span>{selectedEmail.recipientEmail}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">Sent:</span>
                            <span>{new Date(selectedEmail.timestamp * 1000).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">Status:</span>
                            <span className="text-green-400 flex items-center space-x-1">
                              <CheckCircle className="w-4 h-4" />
                              <span>Delivered</span>
                            </span>
                          </div>
                          {selectedEmail.priority > MailPriority.NORMAL && (
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">Priority:</span>
                              <span className={`${getPriorityColor(selectedEmail.priority)} font-semibold`}>
                                {selectedEmail.priority === MailPriority.HIGH ? 'High Priority' : 'Urgent'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-gray-400">
                          <p>Transaction Hash:</p>
                          <p className="font-mono text-xs break-all max-w-xs">
                            {selectedEmail.subjectHash}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Technical Details */}
                  <div className="flex-1 p-6 overflow-y-auto">
                    <div className="space-y-6">
                      {/* Blockchain Info */}
                      <div className="glass rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                          <Mail className="w-5 h-5 mr-2" />
                          Blockchain Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Email ID:</span>
                            <p className="text-white font-mono">{selectedEmail.id}</p>
                          </div>
                          <div>
                            <span className="text-gray-400">IPFS CID:</span>
                            <p className="text-white font-mono break-all">{selectedEmail.ipfsCid}</p>
                          </div>
                          <div>
                            <span className="text-gray-400">From Address:</span>
                            <p className="text-white font-mono break-all">{selectedEmail.from}</p>
                          </div>
                          <div>
                            <span className="text-gray-400">To Address:</span>
                            <p className="text-white font-mono break-all">{selectedEmail.to}</p>
                          </div>
                          <div>
                            <span className="text-gray-400">Subject Hash:</span>
                            <p className="text-white font-mono break-all">{selectedEmail.subjectHash}</p>
                          </div>
                          <div>
                            <span className="text-gray-400">Encrypted:</span>
                            <p className="text-green-400">
                              {selectedEmail.isEncrypted ? 'Yes' : 'No'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Encryption Info */}
                      <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                          <div>
                            <h3 className="text-blue-400 font-medium mb-1">End-to-End Encryption</h3>
                            <p className="text-blue-300 text-sm">
                              This email was encrypted with the recipient's public key before being stored on IPFS. 
                              The content is stored securely and can only be decrypted by the intended recipient.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* IPFS Info */}
                      <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <Paperclip className="w-5 h-5 text-purple-400 mt-0.5" />
                          <div>
                            <h3 className="text-purple-400 font-medium mb-1">Decentralized Storage</h3>
                            <p className="text-purple-300 text-sm">
                              The encrypted email content is stored on IPFS (InterPlanetary File System) 
                              and can be accessed from multiple gateways worldwide. The content is immutable 
                              and censorship-resistant.
                            </p>
                            <div className="mt-2">
                              <a
                                href={`https://gateway.pinata.cloud/ipfs/${selectedEmail.ipfsCid}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-400 hover:text-purple-300 underline text-sm"
                              >
                                View on IPFS Gateway
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Send className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Select a sent email</h3>
                    <p className="text-gray-400">Choose an email from the list to view its details</p>
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
