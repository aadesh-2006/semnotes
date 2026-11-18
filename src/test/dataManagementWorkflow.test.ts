import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../storage/db';
import { HabitService } from '../core/services/habitService';
import { HabitLogService } from '../core/services/habitLogService';
import { FocusSessionService } from '../core/focus/focusSessionService';
import { ReflectionService } from '../core/reflection/reflectionService';
import { MilestoneService } from '../core/milestones/milestoneService';
import { BackupExportService } from '../core/backup/backupExportService';
import { BackupValidationService } from '../core/backup/backupValidationService';
import { RestoreTransactionService } from '../core/backup/restoreTransactionService';
import { CsvExportService } from '../core/backup/csvExportService';
import { EncryptionService } from '../core/crypto/encryptionService';
import { CryptoDecryptionError } from '../core/crypto/cryptoTypes';
import { MockCloudSyncProvider } from '../core/sync/syncProvider';
import { SyncService } from '../core/sync/syncService';
import type { SemnotesBackupPayload } from '../core/backup/backupTypes';

describe('Milestone 9: Data Management, Backup, Restore & Sync End-to-End Workflow', () => {
  const masterPassword = 'ExecutiveDisciplineKey!2026';

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
  });

  it('executes the complete sovereign data lifecycle: export -> validate -> encrypt -> restore -> csv -> sync merge', async () => {
    // -------------------------------------------------------------
    // PHASE 1: Populate Realistic Local Discipline Data
    // -------------------------------------------------------------
    const habit = await HabitService.createHabit({
      title: 'Deep Coding & System Architecture',
      description: 'Minimum 2 hours daily deliberate engineering',
      category: 'craft',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-01-01',
    });

    await HabitLogService.recordCheckIn(habit, '2026-01-01', {
      status: 'completed',
      notes: 'Completed M1 foundation architecture',
    });

    await HabitLogService.recordCheckIn(habit, '2026-01-02', {
      status: 'completed',
      notes: 'Completed M2 habit management engine',
    });

    const focusSession = await FocusSessionService.createSession({
      title: 'Milestone 9 Core Engine',
      sessionMode: 'pomodoro',
      plannedDurationMinutes: 50,
      linkedHabitId: habit.id,
    });

    const milestone = await MilestoneService.createMilestone({
      habitId: habit.id,
      thresholdDays: 30,
      rewardTitle: 'Weekend Retreat in the Mountains',
      rewardDescription: 'Disconnect completely and celebrate 30 days of clean discipline.',
    });

    await ReflectionService.saveMorningIntention({
      date: '2026-01-02',
      primaryIntention: 'Maintain flawless focus and data integrity',
      keyCommitment: 'Write comprehensive automated test suites',
    });

    await ReflectionService.saveEveningDebrief({
      date: '2026-01-02',
      wentWell: 'All milestones executed with precision',
      commitmentsFulfilled: ['Write comprehensive automated test suites'],
    });

    // -------------------------------------------------------------
    // PHASE 2: Export Full Database & Validate Backup Integrity
    // -------------------------------------------------------------
    const exportedBackup = await BackupExportService.generateBackup();
    expect(exportedBackup.manifest.app).toBe('semnotes');
    expect(exportedBackup.manifest.backupVersion).toBe('1.0');
    expect(exportedBackup.manifest.checksum).toBeDefined();
    expect(exportedBackup.manifest.recordCounts.habits).toBe(1);
    expect(exportedBackup.manifest.recordCounts.habitLogs).toBe(2);
    expect(exportedBackup.manifest.recordCounts.focusSessions).toBe(1);

    const jsonString = JSON.stringify(exportedBackup);
    const { report, parsedPayload } = await BackupValidationService.validate(jsonString);

    expect(report.isValid).toBe(true);
    expect(report.checksumValid).toBe(true);
    expect(report.errors).toHaveLength(0);
    expect(parsedPayload).not.toBeNull();

    // -------------------------------------------------------------
    // PHASE 3: Category CSV Exports
    // -------------------------------------------------------------
    const habitsCsv = await CsvExportService.exportHabitsCsv();
    expect(habitsCsv.startsWith('\uFEFF')).toBe(true);
    expect(habitsCsv).toContain('Deep Coding & System Architecture');

    const checkInsCsv = await CsvExportService.exportCheckInsCsv();
    expect(checkInsCsv).toContain('Deep Coding & System Architecture');
    expect(checkInsCsv).toContain('Completed M1 foundation architecture');

    const focusCsv = await CsvExportService.exportFocusSessionsCsv();
    expect(focusCsv).toContain('Milestone 9 Core Engine');
    expect(focusCsv).toContain('pomodoro');

    // -------------------------------------------------------------
    // PHASE 4: Client-Side AES-256-GCM Encryption & Tamper Defense
    // -------------------------------------------------------------
    const envelope = await EncryptionService.encryptPayload(exportedBackup, masterPassword);
    expect(envelope.algorithm).toBe('AES-256-GCM');
    expect(envelope.formatVersion).toBe('2.0');
    expect(envelope.kdfParams.iterations).toBe(600000);

    // Wrong password fails
    await expect(
      EncryptionService.decryptPayload(envelope, 'WrongPassphrase!')
    ).rejects.toThrow(CryptoDecryptionError);

    // Correct password succeeds
    const decryptedPayload = await EncryptionService.decryptPayload<SemnotesBackupPayload>(
      envelope,
      masterPassword
    );
    expect(decryptedPayload.manifest.checksum).toBe(exportedBackup.manifest.checksum);
    expect(decryptedPayload.data.habits[0].id).toBe(habit.id);

    // -------------------------------------------------------------
    // PHASE 5: Database Replacement & Reconstitution
    // -------------------------------------------------------------
    // Clear the database completely to simulate new device or fresh install
    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) {
        await table.clear();
      }
    });
    expect(await db.habits.count()).toBe(0);
    expect(await db.habitLogs.count()).toBe(0);

    // Restore from decrypted payload using Mode 1: Replace
    const restoreResult = await RestoreTransactionService.restoreReplace(decryptedPayload);
    expect(restoreResult.success).toBe(true);

    // Verify all records were restored accurately
    const restoredHabit = await db.habits.get(habit.id);
    expect(restoredHabit).toBeDefined();
    expect(restoredHabit?.title).toBe('Deep Coding & System Architecture');

    const restoredLogs = await db.habitLogs.toArray();
    expect(restoredLogs).toHaveLength(2);

    const restoredFocus = await db.focusSessions.get(focusSession.id);
    expect(restoredFocus?.title).toBe('Milestone 9 Core Engine');

    const restoredMilestone = await db.milestones.get(milestone.id);
    expect(restoredMilestone?.rewardTitle).toBe('Weekend Retreat in the Mountains');

    // -------------------------------------------------------------
    // PHASE 6: Cloud Synchronization & Conflict Merge
    // -------------------------------------------------------------
    const mockCloud = new MockCloudSyncProvider();
    const syncService = new SyncService(mockCloud);
    syncService.setLocalVersion(1);

    // Initial sync uploads current state at v2
    const initialSyncResult = await syncService.performSync(masterPassword);
    expect(initialSyncResult.success).toBe(true);
    expect(initialSyncResult.version).toBe(2);

    // Simulate remote server updating with a new habit at version 4 (from another device)
    const remoteHabit = {
      id: 'd0000000-0000-4000-8000-000000000099',
      title: 'Remote Physical Conditioning',
      description: 'Morning calisthenics',
      category: 'body' as const,
      type: 'completion' as const,
      schedule: { frequency: 'daily' as const, selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-01-01',
      status: 'active' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      sortOrder: 1,
    };
    const remoteBackup = await BackupExportService.generateBackup();
    remoteBackup.data.habits = [remoteHabit];
    const remoteEnvelope = await EncryptionService.encryptPayload(remoteBackup, masterPassword);
    mockCloud.simulateRemoteUpdate(remoteEnvelope, 4);

    // Next sync should flag conflict
    const conflictSync = await syncService.performSync(masterPassword);
    expect(conflictSync.success).toBe(false);
    expect(conflictSync.error).toBe('CONFLICT_DETECTED');
    expect(syncService.getState()).toBe('conflict');

    // Resolve conflict via 'merge' strategy
    const mergeResult = await syncService.resolveConflict('merge', masterPassword);
    expect(mergeResult.success).toBe(true);
    expect(mergeResult.version).toBe(5);
    expect(syncService.getLocalVersion()).toBe(5);
    expect(syncService.getState()).toBe('idle');

    // Verify local DB now contains BOTH local and remote habits
    const finalHabits = await db.habits.toArray();
    expect(finalHabits).toHaveLength(2);
    expect(finalHabits.some((h) => h.id === habit.id)).toBe(true);
    expect(finalHabits.some((h) => h.id === remoteHabit.id)).toBe(true);
  }, 60000);
});
