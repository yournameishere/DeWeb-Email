import axios from 'axios';
import { IPFSUploadResult, PinataResponse } from '@/types';

export class IPFSService {
  private static instance: IPFSService;
  private pinataApiKey: string;
  private pinataSecretKey: string;
  private pinataJWT: string;

  private constructor() {
    this.pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY || '';
    this.pinataSecretKey = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY || '';
    this.pinataJWT = process.env.NEXT_PUBLIC_PINATA_JWT || '';
  }

  public static getInstance(): IPFSService {
    if (!IPFSService.instance) {
      IPFSService.instance = new IPFSService();
    }
    return IPFSService.instance;
  }

  /**
   * Upload encrypted email data to IPFS via Pinata
   */
  async uploadEmailData(encryptedData: string, metadata?: any): Promise<IPFSUploadResult> {
    try {
      const data = JSON.stringify({
        encryptedEmail: encryptedData,
        timestamp: Date.now(),
        metadata: metadata || {},
      });

      const response = await this.pinJSONToIPFS(data, {
        name: `email-${Date.now()}`,
        keyvalues: {
          type: 'encrypted-email',
          timestamp: Date.now().toString(),
        },
      });

      return {
        cid: response.IpfsHash,
        size: response.PinSize,
        url: `https://gateway.pinata.cloud/ipfs/${response.IpfsHash}`,
      };
    } catch (error) {
      console.error('IPFS upload error:', error);
      throw new Error('Failed to upload email to IPFS');
    }
  }

  /**
   * Upload file attachment to IPFS
   */
  async uploadFile(file: File, encryptedData?: string): Promise<IPFSUploadResult> {
    try {
      const formData = new FormData();
      
      if (encryptedData) {
        // Upload encrypted file data as JSON
        const blob = new Blob([JSON.stringify({
          encryptedData,
          originalName: file.name,
          originalType: file.type,
          originalSize: file.size,
          timestamp: Date.now(),
        })], { type: 'application/json' });
        
        formData.append('file', blob, `encrypted-${file.name}.json`);
      } else {
        // Upload original file (for public attachments)
        formData.append('file', file);
      }

      const metadata = JSON.stringify({
        name: file.name,
        keyvalues: {
          type: 'attachment',
          originalName: file.name,
          originalType: file.type,
          encrypted: encryptedData ? 'true' : 'false',
        },
      });
      formData.append('pinataMetadata', metadata);

      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${this.pinataJWT}`,
          },
        }
      );

      return {
        cid: response.data.IpfsHash,
        size: response.data.PinSize,
        url: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`,
      };
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error('Failed to upload file to IPFS');
    }
  }

  /**
   * Retrieve data from IPFS
   */
  async retrieveData(cid: string): Promise<any> {
    try {
      const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`, {
        timeout: 30000, // 30 second timeout
      });
      return response.data;
    } catch (error) {
      console.error('IPFS retrieval error:', error);
      
      // Try alternative gateways
      const alternativeGateways = [
        'https://ipfs.io/ipfs/',
        'https://cloudflare-ipfs.com/ipfs/',
        'https://dweb.link/ipfs/',
      ];

      for (const gateway of alternativeGateways) {
        try {
          const response = await axios.get(`${gateway}${cid}`, {
            timeout: 15000,
          });
          return response.data;
        } catch (altError) {
          console.warn(`Failed to retrieve from ${gateway}:`, altError);
        }
      }

      throw new Error('Failed to retrieve data from IPFS');
    }
  }

  /**
   * Retrieve encrypted email data from IPFS
   */
  async retrieveEmailData(cid: string): Promise<string> {
    try {
      const data = await this.retrieveData(cid);
      
      if (typeof data === 'string') {
        return data;
      }
      
      if (data.encryptedEmail) {
        return data.encryptedEmail;
      }
      
      throw new Error('Invalid email data format');
    } catch (error) {
      console.error('Email retrieval error:', error);
      throw new Error('Failed to retrieve email from IPFS');
    }
  }

  /**
   * Retrieve file from IPFS
   */
  async retrieveFile(cid: string): Promise<Blob> {
    try {
      const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`, {
        responseType: 'blob',
        timeout: 60000, // 60 second timeout for files
      });
      return response.data;
    } catch (error) {
      console.error('File retrieval error:', error);
      throw new Error('Failed to retrieve file from IPFS');
    }
  }

  /**
   * Pin JSON data to IPFS via Pinata
   */
  private async pinJSONToIPFS(jsonData: string, metadata: any): Promise<PinataResponse> {
    try {
      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinJSONToIPFS',
        {
          pinataContent: JSON.parse(jsonData),
          pinataMetadata: metadata,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.pinataJWT}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Pinata JSON pinning error:', error);
      throw new Error('Failed to pin JSON to IPFS');
    }
  }

  /**
   * Get pinned files list from Pinata
   */
  async getPinnedFiles(limit: number = 10): Promise<any[]> {
    try {
      const response = await axios.get(
        `https://api.pinata.cloud/data/pinList?status=pinned&pageLimit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${this.pinataJWT}`,
          },
        }
      );

      return response.data.rows || [];
    } catch (error) {
      console.error('Pinata list error:', error);
      throw new Error('Failed to get pinned files list');
    }
  }

  /**
   * Unpin file from Pinata (cleanup)
   */
  async unpinFile(cid: string): Promise<boolean> {
    try {
      await axios.delete(`https://api.pinata.cloud/pinning/unpin/${cid}`, {
        headers: {
          'Authorization': `Bearer ${this.pinataJWT}`,
        },
      });
      return true;
    } catch (error) {
      console.error('Pinata unpin error:', error);
      return false;
    }
  }

  /**
   * Test Pinata connection and authentication
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(
        'https://api.pinata.cloud/data/testAuthentication',
        {
          headers: {
            'Authorization': `Bearer ${this.pinataJWT}`,
          },
        }
      );
      return response.data.message === 'Congratulations! You are communicating with the Pinata API!';
    } catch (error) {
      console.error('Pinata connection test failed:', error);
      return false;
    }
  }

  /**
   * Get IPFS gateway URL for a CID
   */
  getGatewayUrl(cid: string, gateway: string = 'pinata'): string {
    const gateways = {
      pinata: 'https://gateway.pinata.cloud/ipfs/',
      ipfs: 'https://ipfs.io/ipfs/',
      cloudflare: 'https://cloudflare-ipfs.com/ipfs/',
      dweb: 'https://dweb.link/ipfs/',
    };

    return `${gateways[gateway as keyof typeof gateways] || gateways.pinata}${cid}`;
  }

  /**
   * Validate CID format
   */
  isValidCID(cid: string): boolean {
    // Basic CID validation (v0 and v1)
    const cidV0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
    const cidV1Regex = /^b[a-z2-7]{58}$/;
    
    return cidV0Regex.test(cid) || cidV1Regex.test(cid);
  }

  /**
   * Get file size from IPFS without downloading
   */
  async getFileSize(cid: string): Promise<number> {
    try {
      const response = await axios.head(`https://gateway.pinata.cloud/ipfs/${cid}`);
      const contentLength = response.headers['content-length'];
      return contentLength ? parseInt(contentLength, 10) : 0;
    } catch (error) {
      console.error('File size check error:', error);
      return 0;
    }
  }
}
