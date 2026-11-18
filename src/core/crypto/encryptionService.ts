/**
 * SEMNÓTĒS — Client-Side Encryption & Key Derivation Service
 * Sovereign personal discipline operating system.
 *
 * Implements hardened, zero-knowledge encryption using the standard Web Crypto API:
 * - PBKDF2 key derivation with 600,000 iterations (OWASP baseline, configurable, 50k min, 2M max)
 *   of SHA-256 with a 16-byte cryptographically secure random salt.
 * - AES-256-GCM authenticated encryption with a 12-byte cryptographically secure random IV
 *   and 128-bit authentication tag.
 * - Versioned envelope ('2.0' default) with full backward-compatibility for legacy '1.0' backups.
 * - Zero plaintext leakage: Passwords are used strictly in transient memory for non-extractable
 *   key derivation and are never persisted, stored in cache, or logged.
 */

import type { EncryptedBackupEnvelope, KdfParams, EncryptionOptions } from './cryptoTypes';
import {
  ENCRYPTION_ALGORITHM,
  KEY_LENGTH,
  DEFAULT_PBKDF2_ITERATIONS,
  PBKDF2_HASH,
  SALT_BYTE_LENGTH,
  IV_BYTE_LENGTH,
  TAG_BYTE_LENGTH,
  ENCRYPTION_FORMAT_VERSION,
  MIN_PBKDF2_ITERATIONS,
  MAX_PBKDF2_ITERATIONS,
  APPLICATION_ID,
  CryptoDecryptionError,
  EncryptedBackupEnvelopeSchema,
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
   * Key is marked non-extractable (`extractable: false`) so key material cannot be read by JS.
   */
  static async deriveKey(
    password: string,
    salt: Uint8Array,
    iterations: number = DEFAULT_PBKDF2_ITERATIONS,
    hash: string = PBKDF2_HASH
  ): Promise<CryptoKey> {
    if (iterations < MIN_PBKDF2_ITERATIONS) {
      throw new CryptoDecryptionError(
        `KDF iteration count (${iterations}) is below minimum safe threshold of ${MIN_PBKDF2_ITERATIONS}.`
      );
    }
    if (iterations > MAX_PBKDF2_ITERATIONS) {
      throw new CryptoDecryptionError(
        `KDF iteration count (${iterations}) exceeds maximum safety threshold of ${MAX_PBKDF2_ITERATIONS} (DoS protection).`
      );
    }

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
        iterations,
        hash,
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
   * Produces a versioned '2.0' EncryptedBackupEnvelope with hardened 600,000 PBKDF2 iterations by default.
   */
  static async encryptString(
    plaintext: string,
    password: string,
    options?: EncryptionOptions
  ): Promise<EncryptedBackupEnvelope> {
    if (!password || password.trim().length === 0) {
      throw new Error('Encryption password cannot be empty.');
    }

    const iterations = options?.iterations ?? DEFAULT_PBKDF2_ITERATIONS;
    const formatVersion = options?.formatVersion ?? ENCRYPTION_FORMAT_VERSION;

    if (iterations < MIN_PBKDF2_ITERATIONS || iterations > MAX_PBKDF2_ITERATIONS) {
      throw new Error(
        `Iterations must be between ${MIN_PBKDF2_ITERATIONS} and ${MAX_PBKDF2_ITERATIONS}. Got ${iterations}.`
      );
    }

    // 1. Generate 16-byte cryptographically secure random salt
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTE_LENGTH));

    // 2. Generate 12-byte cryptographically secure random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTE_LENGTH));

    // 3. Derive 256-bit AES-GCM key
    const key = await this.deriveKey(password, salt, iterations, PBKDF2_HASH);

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
      iterations,
      salt: this.bufferToBase64(salt),
    };

    return {
      app: 'semnotes',
      formatVersion,
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
   * Supports both v2.0 (hardened) and v1.0 (legacy 100k iterations) envelopes.
   * Throws CryptoDecryptionError if the password is incorrect, envelope is malformed, or ciphertext was altered.
   */
  static async decryptEnvelope(envelope: EncryptedBackupEnvelope, password: string): Promise<string> {
    if (!password || password.trim().length === 0) {
      throw new CryptoDecryptionError('Decryption password cannot be empty.');
    }

    if (!envelope || typeof envelope !== 'object') {
      throw new CryptoDecryptionError('Envelope payload is null or not a valid object.');
    }

    // 1. Explicit semantic validation of cryptographic envelope headers
    if (!envelope.app || envelope.app.toLowerCase() !== APPLICATION_ID) {
      throw new CryptoDecryptionError(
        `Incompatible application identifier: Expected '${APPLICATION_ID}', found '${envelope?.app || 'none'}'.`
      );
    }

    if (envelope.formatVersion !== '1.0' && envelope.formatVersion !== '2.0') {
      throw new CryptoDecryptionError(
        `Unsupported envelope version: '${envelope.formatVersion}'. Expected '1.0' or '2.0'.`
      );
    }

    if (envelope.algorithm !== 'AES-256-GCM') {
      throw new CryptoDecryptionError(
        `Unsupported encryption algorithm: '${envelope.algorithm}'. Expected 'AES-256-GCM'.`
      );
    }

    if (envelope.kdf !== 'PBKDF2') {
      throw new CryptoDecryptionError(
        `Unsupported key derivation function: '${envelope.kdf}'. Expected 'PBKDF2'.`
      );
    }

    if (!envelope.kdfParams || typeof envelope.kdfParams !== 'object') {
      throw new CryptoDecryptionError('Missing KDF parameters object.');
    }

    const { hash = PBKDF2_HASH, iterations, salt: saltBase64 } = envelope.kdfParams;

    if (typeof iterations !== 'number' || isNaN(iterations)) {
      throw new CryptoDecryptionError('Missing or invalid KDF iteration count.');
    }

    if (iterations < MIN_PBKDF2_ITERATIONS) {
      throw new CryptoDecryptionError(
        `KDF iteration count (${iterations}) is below minimum safe threshold of ${MIN_PBKDF2_ITERATIONS} for cryptographic safety.`
      );
    }

    if (iterations > MAX_PBKDF2_ITERATIONS) {
      throw new CryptoDecryptionError(
        `KDF iteration count (${iterations}) exceeds maximum safety threshold of ${MAX_PBKDF2_ITERATIONS} (DoS protection).`
      );
    }

    if (!saltBase64 || typeof saltBase64 !== 'string') {
      throw new CryptoDecryptionError('Missing KDF salt.');
    }

    if (!envelope.iv || typeof envelope.iv !== 'string') {
      throw new CryptoDecryptionError('Missing initialization vector (IV).');
    }

    if (!envelope.ciphertext || typeof envelope.ciphertext !== 'string') {
      throw new CryptoDecryptionError('Missing ciphertext.');
    }

    // Secondary Zod schema sanity check
    const schemaValidation = EncryptedBackupEnvelopeSchema.safeParse(envelope);
    if (!schemaValidation.success) {
      const firstIssue = schemaValidation.error.issues[0];
      throw new CryptoDecryptionError(`Invalid envelope structure: ${firstIssue.message}`);
    }

    // 2. Decode Base64 cryptographic primitives & enforce exact lengths
    const salt = this.base64ToUint8Array(saltBase64);
    if (salt.byteLength !== SALT_BYTE_LENGTH) {
      throw new CryptoDecryptionError(
        `Invalid salt length: Expected ${SALT_BYTE_LENGTH} bytes, got ${salt.byteLength} bytes.`
      );
    }

    const iv = this.base64ToUint8Array(envelope.iv);
    if (iv.byteLength !== IV_BYTE_LENGTH) {
      throw new CryptoDecryptionError(
        `Invalid IV length: Expected ${IV_BYTE_LENGTH} bytes, got ${iv.byteLength} bytes.`
      );
    }

    const ciphertext = this.base64ToUint8Array(envelope.ciphertext);
    if (ciphertext.byteLength < TAG_BYTE_LENGTH) {
      throw new CryptoDecryptionError(
        `Invalid ciphertext: Payload is smaller than authentication tag (${TAG_BYTE_LENGTH} bytes).`
      );
    }

    // 3. Derive key using parameters stored in the envelope
    let key: CryptoKey;
    try {
      key = await this.deriveKey(password, salt, iterations, hash);
    } catch (err) {
      if (err instanceof CryptoDecryptionError) {
        throw err;
      }
      throw new CryptoDecryptionError(`Failed to derive cryptographic key: ${(err as Error).message}`);
    }

    // 4. Decrypt and authenticate using AES-GCM
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
      // AES-GCM authentication failure throws an OperationError upon tag mismatch or wrong key
      throw new CryptoDecryptionError('Decryption failed: Incorrect password or corrupted/tampered data.');
    }
  }

  /**
   * Helper to encrypt a complete JavaScript payload object into an EncryptedBackupEnvelope.
   */
  static async encryptPayload(
    payload: unknown,
    password: string,
    options?: EncryptionOptions
  ): Promise<EncryptedBackupEnvelope> {
    const jsonString = JSON.stringify(payload);
    return this.encryptString(jsonString, password, options);
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
