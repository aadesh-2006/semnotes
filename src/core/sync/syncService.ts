/**
 * SEMNÓTĒS — Cloud Synchronization Coordination Service
 * Sovereign personal discipline operating system.
 *
 * Coordinates zero-knowledge client-side encrypted synchronization:
 * - Interacts exclusively with abstract SyncProvider implementations.
 * - Detects version conflicts between local and remote states.
 * - Supports three deterministic conflict resolution strategies: useRemote, useLocal, merge.
 * - Never transmits plaintext data or passwords.
 */

import type {
  SyncProvider,
  SyncState,
  SyncMetadata,
  SyncResult,
  SyncConflictInfo,
  ConflictResolutionMode,
} from './syncTypes';
import { BackupExportService } from '../backup/backupExportService';
import { RestoreTransactionService } from '../backup/restoreTransactionService';
import { EncryptionService } from '../crypto/encryptionService';
import type { SemnotesBackupPayload } from '../backup/backupTypes';

const LOCAL_STORAGE_VERSION_KEY = 'semnotes_sync_local_version';
const LOCAL_STORAGE_LAST_SYNCED_KEY = 'semnotes_sync_last_synced_at';

export class SyncService {
  private provider: SyncProvider | null = null;
  private state: SyncState = 'idle';
  private conflictInfo: SyncConflictInfo | null = null;
  private lastErrorMessage: string | null = null;

  constructor(provider?: SyncProvider) {
    if (provider) {
      this.provider = provider;
    }
  }

  setProvider(provider: SyncProvider): void {
    this.provider = provider;
    this.state = 'idle';
    this.conflictInfo = null;
    this.lastErrorMessage = null;
  }

  getProvider(): SyncProvider | null {
    return this.provider;
  }

  getState(): SyncState {
    return this.state;
  }

  getConflictInfo(): SyncConflictInfo | null {
    return this.conflictInfo;
  }

  getLastErrorMessage(): string | null {
    return this.lastErrorMessage;
  }

  getLocalVersion(): number {
    if (typeof localStorage === 'undefined') return 1;
    const val = localStorage.getItem(LOCAL_STORAGE_VERSION_KEY);
    return val ? parseInt(val, 10) : 1;
  }

  setLocalVersion(version: number): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_VERSION_KEY, String(version));
    }
  }

  getLastSyncedAt(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(LOCAL_STORAGE_LAST_SYNCED_KEY);
  }

  setLastSyncedAt(timestamp: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_LAST_SYNCED_KEY, timestamp);
    }
  }

  /**
   * Performs an encrypted synchronization cycle:
   * 1. Check remote state for conflicts.
   * 2. If no conflict, export local database, encrypt with user password, and upload.
   */
  async performSync(password: string): Promise<SyncResult> {
    if (!this.provider) {
      this.state = 'error';
      this.lastErrorMessage = 'No sync provider configured.';
      return { success: false, version: this.getLocalVersion(), timestamp: new Date().toISOString(), error: this.lastErrorMessage };
    }

    if (!password || password.trim().length === 0) {
      this.state = 'error';
      this.lastErrorMessage = 'Password is required to encrypt synchronization data.';
      return { success: false, version: this.getLocalVersion(), timestamp: new Date().toISOString(), error: this.lastErrorMessage };
    }

    this.state = 'syncing';
    this.lastErrorMessage = null;

    try {
      if (!this.provider.isConnected()) {
        await this.provider.connect();
      }

      // 1. Inspect remote metadata
      const remoteMeta: SyncMetadata = await this.provider.getMetadata();
      const localVersion = this.getLocalVersion();

      // Conflict detection: If remote has a newer version than our local version
      if (remoteMeta.hasRemoteBackup && remoteMeta.remoteVersion > localVersion) {
        const remoteData = await this.provider.downloadEncryptedBackup();
        if (remoteData) {
          this.state = 'conflict';
          this.conflictInfo = {
            detectedAt: new Date().toISOString(),
            localVersion,
            remoteVersion: remoteMeta.remoteVersion,
            remoteLastSyncedAt: remoteMeta.lastSyncedAt || new Date().toISOString(),
            remoteEnvelope: remoteData.envelope,
          };

          return {
            success: false,
            version: localVersion,
            timestamp: new Date().toISOString(),
            error: 'CONFLICT_DETECTED',
          };
        }
      }

      // 2. Export local DB
      const localPayload = await BackupExportService.generateBackup();

      // 3. Encrypt payload
      const envelope = await EncryptionService.encryptPayload(localPayload, password);

      // 4. Upload to remote provider
      const nextVersion = Math.max(localVersion, remoteMeta.remoteVersion) + 1;
      const result = await this.provider.uploadEncryptedBackup(envelope, nextVersion);

      // 5. Update local tracking
      this.setLocalVersion(nextVersion);
      this.setLastSyncedAt(result.timestamp);
      this.state = 'idle';
      this.conflictInfo = null;

      return result;
    } catch (err) {
      this.state = 'error';
      this.lastErrorMessage = (err as Error).message;
      return {
        success: false,
        version: this.getLocalVersion(),
        timestamp: new Date().toISOString(),
        error: this.lastErrorMessage,
      };
    }
  }

  /**
   * Resolves an active sync conflict using one of three strategies:
   * - 'useRemote': Overwrites local database with decrypted remote state.
   * - 'useLocal': Forces local state onto the remote server with incremented version.
   * - 'merge': Merges remote records into local database, then uploads the unified state.
   */
  async resolveConflict(mode: ConflictResolutionMode, password: string): Promise<SyncResult> {
    if (!this.conflictInfo || !this.provider) {
      throw new Error('No active conflict to resolve.');
    }

    this.state = 'syncing';

    try {
      const { remoteEnvelope, remoteVersion } = this.conflictInfo;

      if (mode === 'useRemote') {
        // 1. Decrypt remote payload
        const remotePayload = await EncryptionService.decryptPayload<SemnotesBackupPayload>(
          remoteEnvelope,
          password
        );

        // 2. Replace local DB with remote payload
        await RestoreTransactionService.restoreReplace(remotePayload);

        // 3. Align local version to remote version
        this.setLocalVersion(remoteVersion);
        this.setLastSyncedAt(new Date().toISOString());
        this.state = 'idle';
        this.conflictInfo = null;

        return {
          success: true,
          version: remoteVersion,
          timestamp: new Date().toISOString(),
        };
      }

      if (mode === 'useLocal') {
        // 1. Generate local backup
        const localPayload = await BackupExportService.generateBackup();

        // 2. Encrypt with password
        const envelope = await EncryptionService.encryptPayload(localPayload, password);

        // 3. Force upload with higher version
        const nextVersion = remoteVersion + 1;
        const result = await this.provider.uploadEncryptedBackup(envelope, nextVersion);

        this.setLocalVersion(nextVersion);
        this.setLastSyncedAt(result.timestamp);
        this.state = 'idle';
        this.conflictInfo = null;

        return result;
      }

      if (mode === 'merge') {
        // 1. Decrypt remote payload
        const remotePayload = await EncryptionService.decryptPayload<SemnotesBackupPayload>(
          remoteEnvelope,
          password
        );

        // 2. Merge into local DB
        await RestoreTransactionService.restoreMerge(remotePayload);

        // 3. Export new merged local DB
        const mergedPayload = await BackupExportService.generateBackup();

        // 4. Encrypt merged payload
        const envelope = await EncryptionService.encryptPayload(mergedPayload, password);

        // 5. Upload merged payload with incremented version
        const nextVersion = remoteVersion + 1;
        const result = await this.provider.uploadEncryptedBackup(envelope, nextVersion);

        this.setLocalVersion(nextVersion);
        this.setLastSyncedAt(result.timestamp);
        this.state = 'idle';
        this.conflictInfo = null;

        return result;
      }

      throw new Error(`Unrecognized conflict resolution mode: ${mode}`);
    } catch (err) {
      this.state = 'error';
      this.lastErrorMessage = (err as Error).message;
      return {
        success: false,
        version: this.getLocalVersion(),
        timestamp: new Date().toISOString(),
        error: this.lastErrorMessage,
      };
    }
  }
}
