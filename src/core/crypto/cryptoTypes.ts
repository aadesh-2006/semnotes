/**
 * SEMNÓTĒS — Client-Side Cryptographic Domain Types & Schemas
 * Sovereign personal discipline operating system.
 *
 * Defines the envelope format, validation schemas, and cryptographic parameters
 * for zero-knowledge, end-to-end encrypted backup payloads.
 */

import { z } from 'zod';

export const ENCRYPTION_ALGORITHM = 'AES-GCM';
export const KEY_LENGTH = 256;

// PBKDF2 Iteration Bounds & Defaults (OWASP 2023/2024 recommendation: 600,000)
export const DEFAULT_PBKDF2_ITERATIONS = 600000;
export const LEGACY_PBKDF2_ITERATIONS = 100000;
export const PBKDF2_ITERATIONS = DEFAULT_PBKDF2_ITERATIONS; // Backward compatibility alias
export const MIN_PBKDF2_ITERATIONS = 50000;
export const MAX_PBKDF2_ITERATIONS = 2000000;

export const PBKDF2_HASH = 'SHA-256';
export const SALT_BYTE_LENGTH = 16;
export const IV_BYTE_LENGTH = 12;
export const TAG_BYTE_LENGTH = 16;

export const ENCRYPTION_FORMAT_VERSION = '2.0';
export const LEGACY_FORMAT_VERSION = '1.0';
export const APPLICATION_ID = 'semnotes';

export type SupportedEnvelopeVersion = '1.0' | '2.0';
export type SupportedAlgorithm = 'AES-256-GCM';
export type SupportedKdf = 'PBKDF2';
export type SupportedHash = 'SHA-256' | 'SHA-512';

export interface KdfParams {
  hash: string;       // e.g. 'SHA-256'
  iterations: number; // e.g. 600000 (v2.0) or 100000 (v1.0)
  salt: string;       // Base64 encoded 16 bytes
}

export interface EncryptedBackupEnvelope {
  app: 'semnotes';
  formatVersion: SupportedEnvelopeVersion;
  algorithm: SupportedAlgorithm;
  kdf: SupportedKdf;
  kdfParams: KdfParams;
  iv: string;         // Base64 encoded 12 bytes initialization vector
  ciphertext: string; // Base64 encoded encrypted payload including auth tag
  createdAt: string;  // ISO8601 timestamp
}

export interface EncryptionOptions {
  iterations?: number;
  formatVersion?: SupportedEnvelopeVersion;
}

export class CryptoDecryptionError extends Error {
  constructor(message: string = 'Decryption failed: Incorrect password or corrupted data.') {
    super(message);
    this.name = 'CryptoDecryptionError';
  }
}

/**
 * Zod validation schema for EncryptedBackupEnvelope
 */
export const KdfParamsSchema = z.object({
  hash: z.enum(['SHA-256', 'SHA-512'], {
    message: "Unsupported KDF hash algorithm. Only 'SHA-256' and 'SHA-512' are supported.",
  }),
  iterations: z
    .number()
    .int('Iteration count must be an integer.')
    .min(MIN_PBKDF2_ITERATIONS, `Iteration count must be at least ${MIN_PBKDF2_ITERATIONS} for cryptographic safety.`)
    .max(MAX_PBKDF2_ITERATIONS, `Iteration count exceeds maximum safety threshold of ${MAX_PBKDF2_ITERATIONS} (DoS protection).`),
  salt: z.string().min(1, 'Salt cannot be empty.'),
});

export const EncryptedBackupEnvelopeSchema = z.object({
  app: z.string().refine((val) => val.toLowerCase() === APPLICATION_ID, {
    message: `Incompatible application identifier: Expected '${APPLICATION_ID}'`,
  }),
  formatVersion: z.enum(['1.0', '2.0'], {
    message: "Unsupported envelope version. Expected '1.0' or '2.0'.",
  }),
  algorithm: z.literal('AES-256-GCM', {
    message: "Unsupported encryption algorithm. Expected 'AES-256-GCM'.",
  }),
  kdf: z.literal('PBKDF2', {
    message: "Unsupported key derivation function. Expected 'PBKDF2'.",
  }),
  kdfParams: KdfParamsSchema,
  iv: z.string().min(1, 'IV cannot be empty.'),
  ciphertext: z.string().min(1, 'Ciphertext cannot be empty.'),
  createdAt: z.string().min(1, 'createdAt must be an ISO8601 timestamp.'),
});
