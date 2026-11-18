/**
 * SEMNÓTĒS — Cloud Synchronization Domain Types
 * Sovereign personal discipline operating system.
 *
 * Defines the contract for zero-knowledge, encrypted remote synchronization providers.
 */

import type { EncryptedBackupEnvelope } from '../crypto/cryptoTypes';

export type SyncState = 'idle' | 'syncing' | 'conflict' | 'error' | 'disabled';

export interface SyncMetadata {
  provider: string;
  hasRemoteBackup: boolean;
  remoteVersion: number;
  lastSyncedAt: string | null;
  remoteChecksum: string | null;
}

export interface SyncResult {
  success: boolean;
  version: number;
  timestamp: string;
  checksum?: string;
  error?: string;
}

export interface SyncConflictInfo {
  detectedAt: string;
  localVersion: number;
  remoteVersion: number;
  remoteLastSyncedAt: string;
  remoteEnvelope: EncryptedBackupEnvelope;
}

export type ConflictResolutionMode = 'useRemote' | 'useLocal' | 'merge';

export interface SyncProvider {
  readonly providerName: string;
  connect(config?: Record<string, string>): Promise<boolean>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getMetadata(): Promise<SyncMetadata>;
  uploadEncryptedBackup(envelope: EncryptedBackupEnvelope, version: number): Promise<SyncResult>;
  downloadEncryptedBackup(): Promise<{ envelope: EncryptedBackupEnvelope; version: number } | null>;
}
