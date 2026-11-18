import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../storage/db';
import { HabitService } from '../services/habitService';
import { BackupExportService } from '../backup/backupExportService';
import { EncryptionService } from '../crypto/encryptionService';
import { MockCloudSyncProvider } from './syncProvider';
import { SyncService } from './syncService';

describe('Cloud Synchronization Coordination Service', () => {
  const syncPassword = 'DisciplineMasterKey_2026';
  let provider: MockCloudSyncProvider;
  let syncService: SyncService;

  beforeEach(async () => {
    // Clear all tables before each test
    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) {
        await table.clear();
      }
    });

    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    provider = new MockCloudSyncProvider();
    syncService = new SyncService(provider);
    syncService.setLocalVersion(1);
  });

  it('performs clean encrypted initial sync when remote has no prior backup', async () => {
    await HabitService.createHabit({
      title: 'Deep Meditation',
      category: 'mind',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-01-01',
    });

    const result = await syncService.performSync(syncPassword);
    expect(result.success).toBe(true);
    expect(result.version).toBe(2);
    expect(syncService.getLocalVersion()).toBe(2);
    expect(syncService.getState()).toBe('idle');

    // Verify remote received encrypted envelope
    const remoteData = await provider.downloadEncryptedBackup();
    expect(remoteData).not.toBeNull();
    expect(remoteData?.version).toBe(2);
    expect(remoteData?.envelope.algorithm).toBe('AES-256-GCM');
  });

  it('detects conflict when remote has a newer version than local', async () => {
    // Simulate remote having version 5 with a remote habit
    const remoteHabit = {
      id: 'd0000000-0000-4000-8000-000000000001',
      title: 'Remote Habit Created Elsewhere',
      description: '',
      category: 'craft' as const,
      type: 'completion' as const,
      schedule: { frequency: 'daily' as const, selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-01-01',
      status: 'active' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      sortOrder: 0,
    };

    const remoteBackup = await BackupExportService.generateBackup();
    remoteBackup.data.habits = [remoteHabit];
    const remoteEnvelope = await EncryptionService.encryptPayload(remoteBackup, syncPassword);

    provider.simulateRemoteUpdate(remoteEnvelope, 5);
    syncService.setLocalVersion(2); // Local is at version 2, remote is at version 5

    // Perform sync - must detect conflict
    const result = await syncService.performSync(syncPassword);
    expect(result.success).toBe(false);
    expect(result.error).toBe('CONFLICT_DETECTED');
    expect(syncService.getState()).toBe('conflict');
    expect(syncService.getConflictInfo()).not.toBeNull();
    expect(syncService.getConflictInfo()?.remoteVersion).toBe(5);
  });

  it('resolves conflict with useRemote strategy', async () => {
    // Local has Habit A
    const localHabit = await HabitService.createHabit({
      title: 'Local Only Habit',
      category: 'discipline',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-01-01',
    });

    // Remote has Habit B at version 4
    const remoteHabit = {
      id: 'd0000000-0000-4000-8000-000000000002',
      title: 'Remote Habit Winner',
      description: '',
      category: 'craft' as const,
      type: 'completion' as const,
      schedule: { frequency: 'daily' as const, selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-01-01',
      status: 'active' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      sortOrder: 0,
    };
    const remoteBackup = await BackupExportService.generateBackup();
    remoteBackup.data.habits = [remoteHabit];
    const remoteEnvelope = await EncryptionService.encryptPayload(remoteBackup, syncPassword);

    provider.simulateRemoteUpdate(remoteEnvelope, 4);
    syncService.setLocalVersion(2);

    await syncService.performSync(syncPassword);
    expect(syncService.getState()).toBe('conflict');

    // Resolve with useRemote
    const resolveResult = await syncService.resolveConflict('useRemote', syncPassword);
    expect(resolveResult.success).toBe(true);
    expect(syncService.getState()).toBe('idle');
    expect(syncService.getLocalVersion()).toBe(4);

    // Verify DB replaced with remote habit
    const habits = await db.habits.toArray();
    expect(habits).toHaveLength(1);
    expect(habits[0].title).toBe('Remote Habit Winner');
    expect(await db.habits.get(localHabit.id)).toBeUndefined();
  });

  it('resolves conflict with useLocal strategy', async () => {
    const localHabit = await HabitService.createHabit({
      title: 'Local Master Habit',
      category: 'mind',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-01-01',
    });

    const remoteBackup = await BackupExportService.generateBackup();
    const remoteEnvelope = await EncryptionService.encryptPayload(remoteBackup, syncPassword);
    provider.simulateRemoteUpdate(remoteEnvelope, 10);
    syncService.setLocalVersion(3);

    await syncService.performSync(syncPassword);
    expect(syncService.getState()).toBe('conflict');

    // Resolve with useLocal -> forces upload at version 11
    const resolveResult = await syncService.resolveConflict('useLocal', syncPassword);
    expect(resolveResult.success).toBe(true);
    expect(resolveResult.version).toBe(11);
    expect(syncService.getLocalVersion()).toBe(11);
    expect(syncService.getState()).toBe('idle');

    // Verify local DB preserved
    expect(await db.habits.get(localHabit.id)).toBeDefined();
  });

  it('resolves conflict with merge strategy', async () => {
    // Local has Habit 1
    const localHabit = await HabitService.createHabit({
      title: 'Local Habit',
      category: 'mind',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-01-01',
    });

    // Remote has Habit 2
    const remoteHabit = {
      id: 'd0000000-0000-4000-8000-000000000003',
      title: 'Remote Habit to Merge',
      description: '',
      category: 'body' as const,
      type: 'completion' as const,
      schedule: { frequency: 'daily' as const, selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-01-01',
      status: 'active' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      sortOrder: 0,
    };
    const remoteBackup = await BackupExportService.generateBackup();
    remoteBackup.data.habits = [remoteHabit];
    const remoteEnvelope = await EncryptionService.encryptPayload(remoteBackup, syncPassword);

    provider.simulateRemoteUpdate(remoteEnvelope, 6);
    syncService.setLocalVersion(2);

    await syncService.performSync(syncPassword);
    expect(syncService.getState()).toBe('conflict');

    // Resolve with merge
    const resolveResult = await syncService.resolveConflict('merge', syncPassword);
    expect(resolveResult.success).toBe(true);
    expect(resolveResult.version).toBe(7);
    expect(syncService.getLocalVersion()).toBe(7);
    expect(syncService.getState()).toBe('idle');

    // Both habits must now exist in DB
    const allHabits = await db.habits.toArray();
    expect(allHabits).toHaveLength(2);
    expect(allHabits.some((h) => h.id === localHabit.id)).toBe(true);
    expect(allHabits.some((h) => h.id === remoteHabit.id)).toBe(true);
  });

  it('gracefully handles network failures without data loss or unhandled rejections', async () => {
    provider.setNetworkFailure(true);

    const result = await syncService.performSync(syncPassword);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Network');
    expect(syncService.getState()).toBe('error');
    expect(syncService.getLastErrorMessage()).toContain('Network');
  });
});
