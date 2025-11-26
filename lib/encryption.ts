import NodeRSA from 'node-rsa';
import CryptoJS from 'crypto-js';
import { KeyPair, EncryptedEmailData } from '@/types';

export class EncryptionService {
  private static instance: EncryptionService;

  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Generate a new RSA key pair for encryption
   */
  generateKeyPair(): KeyPair {
    const key = new NodeRSA({ b: 2048 });
    
    return {
      publicKey: key.exportKey('public'),
      privateKey: key.exportKey('private'),
    };
  }

  /**
   * Encrypt data using RSA public key
   */
  encryptWithPublicKey(data: string, publicKey: string): string {
    try {
      const key = new NodeRSA(publicKey);
      return key.encrypt(data, 'base64');
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data using RSA private key
   */
  decryptWithPrivateKey(encryptedData: string, privateKey: string): string {
    try {
      const key = new NodeRSA(privateKey);
      return key.decrypt(encryptedData, 'utf8');
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt email data for storage
   */
  encryptEmailData(emailData: EncryptedEmailData, recipientPublicKey: string): string {
    try {
      // Convert email data to JSON string
      const jsonData = JSON.stringify(emailData);
      
      // For large data, use hybrid encryption (AES + RSA)
      if (jsonData.length > 200) {
        return this.hybridEncrypt(jsonData, recipientPublicKey);
      }
      
      // For small data, use direct RSA encryption
      return this.encryptWithPublicKey(jsonData, recipientPublicKey);
    } catch (error) {
      console.error('Email encryption error:', error);
      throw new Error('Failed to encrypt email data');
    }
  }

  /**
   * Decrypt email data from storage
   */
  decryptEmailData(encryptedData: string, privateKey: string): EncryptedEmailData {
    try {
      let decryptedJson: string;
      
      // Check if it's hybrid encrypted (contains AES marker)
      if (encryptedData.includes('::AES::')) {
        decryptedJson = this.hybridDecrypt(encryptedData, privateKey);
      } else {
        decryptedJson = this.decryptWithPrivateKey(encryptedData, privateKey);
      }
      
      return JSON.parse(decryptedJson);
    } catch (error) {
      console.error('Email decryption error:', error);
      throw new Error('Failed to decrypt email data');
    }
  }

  /**
   * Hybrid encryption: AES for data + RSA for AES key
   */
  private hybridEncrypt(data: string, publicKey: string): string {
    try {
      // Generate random AES key
      const aesKey = CryptoJS.lib.WordArray.random(256/8).toString();
      
      // Encrypt data with AES
      const encryptedData = CryptoJS.AES.encrypt(data, aesKey).toString();
      
      // Encrypt AES key with RSA
      const encryptedKey = this.encryptWithPublicKey(aesKey, publicKey);
      
      // Combine encrypted key and data
      return `${encryptedKey}::AES::${encryptedData}`;
    } catch (error) {
      console.error('Hybrid encryption error:', error);
      throw new Error('Failed to perform hybrid encryption');
    }
  }

  /**
   * Hybrid decryption: RSA for AES key + AES for data
   */
  private hybridDecrypt(encryptedData: string, privateKey: string): string {
    try {
      const [encryptedKey, encryptedContent] = encryptedData.split('::AES::');
      
      // Decrypt AES key with RSA
      const aesKey = this.decryptWithPrivateKey(encryptedKey, privateKey);
      
      // Decrypt data with AES
      const decryptedBytes = CryptoJS.AES.decrypt(encryptedContent, aesKey);
      return decryptedBytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Hybrid decryption error:', error);
      throw new Error('Failed to perform hybrid decryption');
    }
  }

  /**
   * Encrypt private key with password for secure storage
   */
  encryptPrivateKey(privateKey: string, password: string): string {
    try {
      return CryptoJS.AES.encrypt(privateKey, password).toString();
    } catch (error) {
      console.error('Private key encryption error:', error);
      throw new Error('Failed to encrypt private key');
    }
  }

  /**
   * Decrypt private key with password
   */
  decryptPrivateKey(encryptedPrivateKey: string, password: string): string {
    try {
      const decryptedBytes = CryptoJS.AES.decrypt(encryptedPrivateKey, password);
      return decryptedBytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Private key decryption error:', error);
      throw new Error('Failed to decrypt private key or invalid password');
    }
  }

  /**
   * Generate hash for subject (for privacy while maintaining searchability)
   */
  generateSubjectHash(subject: string): string {
    return CryptoJS.SHA256(subject.toLowerCase().trim()).toString();
  }

  /**
   * Validate RSA key format
   */
  validatePublicKey(publicKey: string): boolean {
    try {
      new NodeRSA(publicKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate private key format
   */
  validatePrivateKey(privateKey: string): boolean {
    try {
      const key = new NodeRSA(privateKey);
      return key.isPrivate();
    } catch {
      return false;
    }
  }

  /**
   * Get public key from private key
   */
  getPublicKeyFromPrivate(privateKey: string): string {
    try {
      const key = new NodeRSA(privateKey);
      return key.exportKey('public');
    } catch (error) {
      console.error('Public key extraction error:', error);
      throw new Error('Failed to extract public key from private key');
    }
  }

  /**
   * Encrypt file data for attachments
   */
  encryptFile(fileData: ArrayBuffer, recipientPublicKey: string): string {
    try {
      // Convert ArrayBuffer to base64
      const base64Data = this.arrayBufferToBase64(fileData);
      
      // Use hybrid encryption for files (they're typically large)
      return this.hybridEncrypt(base64Data, recipientPublicKey);
    } catch (error) {
      console.error('File encryption error:', error);
      throw new Error('Failed to encrypt file');
    }
  }

  /**
   * Decrypt file data for attachments
   */
  decryptFile(encryptedData: string, privateKey: string): ArrayBuffer {
    try {
      // Decrypt to base64
      const base64Data = this.hybridDecrypt(encryptedData, privateKey);
      
      // Convert base64 to ArrayBuffer
      return this.base64ToArrayBuffer(base64Data);
    } catch (error) {
      console.error('File decryption error:', error);
      throw new Error('Failed to decrypt file');
    }
  }

  /**
   * Utility: Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Utility: Convert base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
