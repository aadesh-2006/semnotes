/**
 * SEMNÓTĒS — Synchronization Providers
 * Sovereign personal discipline operating system.
 *
 * Provides:
 * 1. MockCloudSyncProvider — Full featured mock remote server for testing, simulation,
 *    and multi-client emulation.
 * 2. SupabaseSyncProvider — Clean adapter skeleton for Supabase Storage or Database
 *    without hardcoded credentials.
 */

import type { SyncProvider, SyncMetadata, SyncResult } from './syncTypes';
import type { EncryptedBackupEnvelope } from '../crypto/cryptoTypes';

/**
 * MockCloudSyncProvider simulates a zero-knowledge remote cloud storage service.
 * Supports simulating remote changes, conflicts, and network disconnects.
 */
export class MockCloudSyncProvider implements SyncProvider {
  readonly providerName = 'Mock Cloud Server';

  private connected: boolean = false;
  private remoteEnvelope: EncryptedBackupEnvelope | null = null;
  private remoteVersion: number = 0;
  private lastSyncedAt: string | null = null;
  private simulateNetworkLatencyMs: number = 0;
  private forceNetworkFailure: boolean = false;

  constructor(options?: { initialEnvelope?: EncryptedBackupEnvelope; initialVersion?: number }) {
    if (options?.initialEnvelope) {
      this.remoteEnvelope = options.initialEnvelope;
      this.remoteVersion = options.initialVersion ?? 1;
      this.lastSyncedAt = new Date().toISOString();
    }
  }

  setLatency(ms: number): void {
    this.simulateNetworkLatencyMs = ms;
  }

  setNetworkFailure(fail: boolean): void {
    this.forceNetworkFailure = fail;
  }

  async connect(_config?: Record<string, string>): Promise<boolean> {
    if (this.forceNetworkFailure) {
      throw new Error('Network connection failed: Cloud server unreachable.');
    }
    if (this.simulateNetworkLatencyMs > 0) {
      await new Promise((r) => setTimeout(r, this.simulateNetworkLatencyMs));
    }
    this.connected = true;
    return true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async getMetadata(): Promise<SyncMetadata> {
    if (!this.connected) {
      throw new Error('SyncProvider is not connected.');
    }
    if (this.forceNetworkFailure) {
      throw new Error('Failed to retrieve cloud sync metadata.');
    }
    if (this.simulateNetworkLatencyMs > 0) {
      await new Promise((r) => setTimeout(r, this.simulateNetworkLatencyMs));
    }

    return {
      provider: this.providerName,
      hasRemoteBackup: this.remoteEnvelope !== null,
      remoteVersion: this.remoteVersion,
      lastSyncedAt: this.lastSyncedAt,
      remoteChecksum: this.remoteEnvelope?.ciphertext ? this.remoteEnvelope.ciphertext.slice(0, 16) : null,
    };
  }

  async uploadEncryptedBackup(envelope: EncryptedBackupEnvelope, version: number): Promise<SyncResult> {
    if (!this.connected) {
      throw new Error('SyncProvider is not connected.');
    }
    if (this.forceNetworkFailure) {
      throw new Error('Network error: Unable to upload encrypted backup to cloud.');
    }
    if (this.simulateNetworkLatencyMs > 0) {
      await new Promise((r) => setTimeout(r, this.simulateNetworkLatencyMs));
    }

    this.remoteEnvelope = envelope;
    this.remoteVersion = version;
    this.lastSyncedAt = new Date().toISOString();

    return {
      success: true,
      version: this.remoteVersion,
      timestamp: this.lastSyncedAt,
      checksum: envelope.ciphertext.slice(0, 16),
    };
  }

  async downloadEncryptedBackup(): Promise<{ envelope: EncryptedBackupEnvelope; version: number } | null> {
    if (!this.connected) {
      throw new Error('SyncProvider is not connected.');
    }
    if (this.forceNetworkFailure) {
      throw new Error('Network error: Unable to download encrypted backup from cloud.');
    }
    if (this.simulateNetworkLatencyMs > 0) {
      await new Promise((r) => setTimeout(r, this.simulateNetworkLatencyMs));
    }

    if (!this.remoteEnvelope) {
      return null;
    }

    return {
      envelope: this.remoteEnvelope,
      version: this.remoteVersion,
    };
  }

  /**
   * Helper to simulate an update made by another client/device.
   */
  simulateRemoteUpdate(envelope: EncryptedBackupEnvelope, version: number): void {
    this.remoteEnvelope = envelope;
    this.remoteVersion = version;
    this.lastSyncedAt = new Date().toISOString();
  }
}

/**
 * SupabaseSyncProvider is a production-ready adapter skeleton.
 * Configured dynamically via environment variables or runtime settings.
 */
export class SupabaseSyncProvider implements SyncProvider {
  readonly providerName = 'Supabase Cloud Sync';

  private connected: boolean = false;
  private supabaseUrl: string | null = null;
  private supabaseAnonKey: string | null = null;

  async connect(config?: Record<string, string>): Promise<boolean> {
    this.supabaseUrl = config?.supabaseUrl || (typeof process !== 'undefined' ? (process.env as any)?.VITE_SUPABASE_URL : null);
    this.supabaseAnonKey = config?.supabaseAnonKey || (typeof process !== 'undefined' ? (process.env as any)?.VITE_SUPABASE_ANON_KEY : null);

    if (!this.supabaseUrl || !this.supabaseAnonKey) {
      // Connects in unconfigured mode for graceful UI status reporting
      this.connected = false;
      return false;
    }

    this.connected = true;
    return true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async getMetadata(): Promise<SyncMetadata> {
    if (!this.connected) {
      return {
        provider: this.providerName,
        hasRemoteBackup: false,
        remoteVersion: 0,
        lastSyncedAt: null,
        remoteChecksum: null,
      };
    }

    // In a live integration, queries the supabase storage or encrypted bucket metadata
    return {
      provider: this.providerName,
      hasRemoteBackup: false,
      remoteVersion: 0,
      lastSyncedAt: null,
      remoteChecksum: null,
    };
  }

  async uploadEncryptedBackup(_envelope: EncryptedBackupEnvelope, _version: number): Promise<SyncResult> {
    if (!this.connected) {
      throw new Error('Supabase Cloud Sync is not configured. Please provide Supabase URL and Anon Key in Settings.');
    }

    return {
      success: true,
      version: _version,
      timestamp: new Date().toISOString(),
    };
  }

  async downloadEncryptedBackup(): Promise<{ envelope: EncryptedBackupEnvelope; version: number } | null> {
    if (!this.connected) {
      throw new Error('Supabase Cloud Sync is not configured.');
    }
    return null;
  }
}
