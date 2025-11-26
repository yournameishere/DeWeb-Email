'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAccount, useNetwork } from 'wagmi';
import { useRouter } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { 
  User, 
  Mail, 
  Key, 
  Shield, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { useToast } from '@/components/providers/ToastProvider';
import { ContractService } from '@/lib/contracts';
import { EncryptionService } from '@/lib/encryption';

export default function RegisterPage() {
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const router = useRouter();
  const { showSuccess, showError, showInfo } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [keyPair, setKeyPair] = useState<{ publicKey: string; privateKey: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [availability, setAvailability] = useState({
    username: { checked: false, available: false },
    email: { checked: false, available: false },
  });

  const contractService = ContractService.getInstance();
  const encryptionService = EncryptionService.getInstance();

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  useEffect(() => {
    // Check if user is already registered
    const checkUserRegistration = async () => {
      if (address && isConnected) {
        try {
          const user = await contractService.getUser(address);
          if (user) {
            router.push('/inbox');
          }
        } catch (error) {
          console.log('User not registered yet');
        }
      }
    };

    checkUserRegistration();
  }, [address, isConnected, router]);

  const checkAvailability = async (field: 'username' | 'email', value: string) => {
    if (!value.trim()) return;

    try {
      setLoading(true);
      let available = false;

      if (field === 'username') {
        available = await contractService.isUsernameAvailable(value);
      } else {
        available = await contractService.isEmailAvailable(value);
      }

      setAvailability(prev => ({
        ...prev,
        [field]: { checked: true, available }
      }));

      if (!available) {
        showError('Not Available', `This ${field} is already taken`);
      }
    } catch (error) {
      showError('Error', `Failed to check ${field} availability`);
    } finally {
      setLoading(false);
    }
  };

  const generateKeys = () => {
    try {
      setLoading(true);
      showInfo('Generating Keys', 'Creating your encryption key pair...');
      
      const keys = encryptionService.generateKeyPair();
      setKeyPair(keys);
      setStep(3);
      
      showSuccess('Keys Generated', 'Your encryption keys have been created successfully');
    } catch (error) {
      showError('Key Generation Failed', 'Failed to generate encryption keys');
    } finally {
      setLoading(false);
    }
  };

  const registerUser = async () => {
    if (!keyPair || !address) return;

    try {
      setLoading(true);
      showInfo('Registering', 'Creating your DeMailX account...');

      // Initialize contract service
      await contractService.initialize(window.ethereum);

      // Register user on blockchain
      const txHash = await contractService.registerUser(
        formData.username,
        formData.email,
        keyPair.publicKey
      );

      // Encrypt and store private key locally
      const encryptedPrivateKey = encryptionService.encryptPrivateKey(
        keyPair.privateKey,
        formData.password
      );

      // Store encrypted private key in localStorage
      localStorage.setItem(`demailx_key_${address}`, encryptedPrivateKey);
      localStorage.setItem(`demailx_user_${address}`, JSON.stringify({
        username: formData.username,
        email: formData.email,
        registrationTx: txHash,
      }));

      showSuccess('Registration Complete', 'Welcome to DeMailX!');
      setStep(4);

      // Redirect to inbox after a short delay
      setTimeout(() => {
        router.push('/inbox');
      }, 2000);

    } catch (error: any) {
      console.error('Registration error:', error);
      showError('Registration Failed', error.message || 'Failed to register user');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Reset availability check when input changes
    if (field === 'username' || field === 'email') {
      setAvailability(prev => ({
        ...prev,
        [field]: { checked: false, available: false }
      }));
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.username.length >= 3 && 
               formData.email.includes('@') &&
               availability.username.checked && availability.username.available &&
               availability.email.checked && availability.email.available;
      case 2:
        return formData.password.length >= 8 && 
               formData.password === formData.confirmPassword;
      case 3:
        return keyPair !== null;
      default:
        return false;
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Please Connect Your Wallet</h1>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Create Your Account</h1>
          <p className="text-gray-300">Set up your decentralized email identity</p>
        </motion.div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          {[1, 2, 3, 4].map((stepNum) => (
            <div key={stepNum} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                ${step >= stepNum 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-700 text-gray-400'
                }
              `}>
                {step > stepNum ? <CheckCircle className="w-4 h-4" /> : stepNum}
              </div>
              {stepNum < 4 && (
                <div className={`w-8 h-1 mx-2 ${
                  step > stepNum ? 'bg-blue-500' : 'bg-gray-700'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-xl p-6"
        >
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Mail className="w-5 h-5 mr-2" />
                Basic Information
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      onBlur={() => checkAvailability('username', formData.username)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="your-username"
                    />
                    {availability.username.checked && (
                      <div className="absolute right-3 top-3">
                        {availability.username.available ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    This will be your unique identifier: {formData.username}@dewebmail.xyz
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Handle
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      onBlur={() => checkAvailability('email', formData.email)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="your-email@dewebmail.xyz"
                    />
                    {availability.email.checked && (
                      <div className="absolute right-3 top-3">
                        {availability.email.available ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Security Setup
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                      placeholder="Enter a strong password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    This password will encrypt your private key locally
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-white"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-red-400 text-sm">Passwords do not match</p>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Key className="w-5 h-5 mr-2" />
                Encryption Keys
              </h2>
              
              {!keyPair ? (
                <div className="text-center py-8">
                  <Key className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Generate Encryption Keys</h3>
                  <p className="text-gray-300 mb-6">
                    We'll generate a unique key pair for encrypting your emails. 
                    Your private key will be encrypted and stored locally.
                  </p>
                  <button
                    onClick={generateKeys}
                    disabled={loading}
                    className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center space-x-2 mx-auto"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Key className="w-5 h-5" />}
                    <span>Generate Keys</span>
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Keys Generated Successfully</h3>
                  <p className="text-gray-300">
                    Your encryption keys have been generated and are ready to use.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Registration Complete!</h3>
              <p className="text-gray-300 mb-4">
                Welcome to DeMailX! Your account has been created successfully.
              </p>
              <div className="bg-gray-800 rounded-lg p-4 text-left">
                <p className="text-sm text-gray-300">
                  <strong>Username:</strong> {formData.username}<br />
                  <strong>Email:</strong> {formData.email}<br />
                  <strong>Wallet:</strong> {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            {step > 1 && step < 4 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Back
              </button>
            )}
            
            {step < 3 && (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!isStepValid() || loading}
                className="ml-auto bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 3 && keyPair && (
              <button
                onClick={registerUser}
                disabled={loading}
                className="ml-auto bg-green-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                <span>Complete Registration</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
