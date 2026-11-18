/**
 * SEMNÓTĒS — Client-Side Encryption & Key Derivation Service
 * Sovereign personal discipline operating system.
 *
 * Implements military-grade zero-knowledge encryption using the standard Web Crypto API:
 * - PBKDF2 key derivation with 100,000 iterations of SHA-256 and a 16-byte cryptographically secure random salt.
 * - AES-256-GCM authenticated encryption with a 12-byte cryptographically secure random IV.
 * - Zero plaintext leakage: Passwords are used strictly in-memory for key derivation and never persisted or logged.
 */

import type { EncryptedBackupEnvelope, KdfParams } from './cryptoTypes';
import {
  ENCRYPTION_ALGORITHM,
  KEY_LENGTH,
  PBKDF2_ITERATIONS,
  PBKDF2_HASH,
  SALT_BYTE_LENGTH,
  IV_BYTE_LENGTH,
  CryptoDecryptionError,
} from './cryptoTypes';

export class EncryptionService {
  /**
   * Encodes an ArrayBuffer or Uint8Array into a standard Base64 string.
   */
  static bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    const len = uint8.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    return btoa(binary);
  }

  /**
   * Decodes a Base64 string into a Uint8Array.
   */
  static base64ToUint8Array(base64: string): Uint8Array {
    try {
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } catch {
      throw new CryptoDecryptionError('Malformed Base64 payload encoding.');
    }
  }

  /**
   * Derives a 256-bit AES-GCM CryptoKey from a user password and cryptographic salt using PBKDF2.
   */
  static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const baseKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: PBKDF2_ITERATIONS,
        hash: PBKDF2_HASH,
      },
      baseKey,
      {
        name: ENCRYPTION_ALGORITHM,
        length: KEY_LENGTH,
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts an arbitrary plaintext string using AES-256-GCM with a user-supplied password.
   */
  static async encryptString(plaintext: string, password: string): Promise<EncryptedBackupEnvelope> {
    if (!password || password.trim().length === 0) {
      throw new Error('Encryption password cannot be empty.');
    }

    // 1. Generate 16-byte cryptographically secure random salt
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTE_LENGTH));

    // 2. Generate 12-byte cryptographically secure random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTE_LENGTH));

    // 3. Derive 256-bit AES-GCM key
    const key = await this.deriveKey(password, salt);

    // 4. Encrypt UTF-8 encoded plaintext
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(plaintext);

    const ciphertextBuffer = await crypto.subtle.encrypt(
      {
        name: ENCRYPTION_ALGORITHM,
        iv,
      },
      key,
      dataBuffer
    );

    const kdfParams: KdfParams = {
      hash: PBKDF2_HASH,
      iterations: PBKDF2_ITERATIONS,
      salt: this.bufferToBase64(salt),
    };

    return {
      app: 'semnotes',
      formatVersion: '1.0',
      algorithm: 'AES-256-GCM',
      kdf: 'PBKDF2',
      kdfParams,
      iv: this.bufferToBase64(iv),
      ciphertext: this.bufferToBase64(ciphertextBuffer),
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Decrypts an EncryptedBackupEnvelope with the supplied password.
   * Throws CryptoDecryptionError if the password is incorrect or the ciphertext was altered.
   */
  static async decryptEnvelope(envelope: EncryptedBackupEnvelope, password: string): Promise<string> {
    if (!password || password.trim().length === 0) {
      throw new CryptoDecryptionError('Decryption password cannot be empty.');
    }

    if (envelope.app !== 'semnotes') {
      throw new CryptoDecryptionError(`Incompatible application envelope: Expected 'semnotes', got '${envelope.app}'.`);
    }

    if (envelope.algorithm !== 'AES-256-GCM') {
      throw new CryptoDecryptionError(`Unsupported algorithm: '${envelope.algorithm}'.`);
    }

    const salt = this.base64ToUint8Array(envelope.kdfParams.salt);
    const iv = this.base64ToUint8Array(envelope.iv);
    const ciphertext = this.base64ToUint8Array(envelope.ciphertext);

    let key: CryptoKey;
    try {
      key = await this.deriveKey(password, salt);
    } catch {
      throw new CryptoDecryptionError('Failed to derive cryptographic key.');
    }

    try {
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: ENCRYPTION_ALGORITHM,
          iv,
        },
        key,
        ciphertext
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch {
      // Subtly fails when auth tag mismatch or wrong key
      throw new CryptoDecryptionError('Decryption failed: Incorrect password or corrupted/tampered data.');
    }
  }

  /**
   * Helper to encrypt a complete JavaScript payload object into an EncryptedBackupEnvelope.
   */
  static async encryptPayload(payload: unknown, password: string): Promise<EncryptedBackupEnvelope> {
    const jsonString = JSON.stringify(payload);
    return this.encryptString(jsonString, password);
  }

  /**
   * Helper to decrypt an EncryptedBackupEnvelope and parse it back into the original object.
   */
  static async decryptPayload<T = unknown>(envelope: EncryptedBackupEnvelope, password: string): Promise<T> {
    const decryptedJson = await this.decryptEnvelope(envelope, password);
    try {
      return JSON.parse(decryptedJson) as T;
    } catch (err) {
      throw new CryptoDecryptionError(`Decrypted data is not valid JSON: ${(err as Error).message}`);
    }
  }
}
