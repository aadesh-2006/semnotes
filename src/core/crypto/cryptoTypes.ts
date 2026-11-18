/**
 * SEMNÓTĒS — Client-Side Cryptographic Domain Types
 * Sovereign personal discipline operating system.
 *
 * Defines the envelope format and parameters for zero-knowledge,
 * end-to-end encrypted backup payloads.
 */

export const ENCRYPTION_ALGORITHM = 'AES-GCM';
export const KEY_LENGTH = 256;
export const PBKDF2_ITERATIONS = 100000;
export const PBKDF2_HASH = 'SHA-256';
export const SALT_BYTE_LENGTH = 16;
export const IV_BYTE_LENGTH = 12;

export interface KdfParams {
  hash: string;       // 'SHA-256'
  iterations: number; // 100000
  salt: string;       // Base64 encoded 16 bytes
}

export interface EncryptedBackupEnvelope {
  app: 'semnotes';
  formatVersion: '1.0';
  algorithm: 'AES-256-GCM';
  kdf: 'PBKDF2';
  kdfParams: KdfParams;
  iv: string;         // Base64 encoded 12 bytes initialization vector
  ciphertext: string; // Base64 encoded encrypted payload including auth tag
  createdAt: string;  // ISO8601 timestamp
}

export class CryptoDecryptionError extends Error {
  constructor(message: string = 'Decryption failed: Incorrect password or corrupted data.') {
    super(message);
    this.name = 'CryptoDecryptionError';
  }
}
