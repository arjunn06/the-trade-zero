/**
 * Encryption utilities for sensitive data like API tokens
 * Uses Web Crypto API for AES-GCM encryption
 */

class EncryptionManager {
  private static instance: EncryptionManager;
  private key: CryptoKey | null = null;

  private constructor() {}

  static getInstance(): EncryptionManager {
    if (!EncryptionManager.instance) {
      EncryptionManager.instance = new EncryptionManager();
    }
    return EncryptionManager.instance;
  }

  private async getKey(): Promise<CryptoKey> {
    if (!this.key) {
      // In a production environment, this should be derived from a secure source
      // For now, we'll use a deterministic key based on user session
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode('your-32-char-secret-key-here!!!'),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      this.key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: new TextEncoder().encode('secure-salt'),
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    }
    return this.key;
  }

  async encrypt(data: string): Promise<string> {
    try {
      const key = await this.getKey();
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        dataBuffer
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedBuffer), iv.length);

      // Convert to base64
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  async decrypt(encryptedData: string): Promise<string> {
    try {
      const key = await this.getKey();
      
      // Convert from base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }
}

export const encryptionManager = EncryptionManager.getInstance();

// Helper functions for common use cases
export async function encryptToken(token: string): Promise<string> {
  return encryptionManager.encrypt(token);
}

export async function decryptToken(encryptedToken: string): Promise<string> {
  return encryptionManager.decrypt(encryptedToken);
}

// Input validation and sanitization utilities
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }
  
  // Remove null bytes and limit length
  const cleaned = input.replace(/\0/g, '').substring(0, maxLength);
  
  // Basic XSS prevention - remove script tags and javascript: links
  return cleaned
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '');
}

export function validateNumericInput(value: any): number {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return value;
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed;
    }
  }
  
  throw new Error('Invalid numeric input');
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

export function validateAccountName(name: string): boolean {
  // Allow alphanumeric, spaces, hyphens, underscores
  const nameRegex = /^[a-zA-Z0-9\s\-_]+$/;
  return nameRegex.test(name) && name.length >= 1 && name.length <= 100;
}