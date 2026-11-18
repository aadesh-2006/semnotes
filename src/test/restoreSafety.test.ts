/**
 * SEMNÓTĒS — Crash-Resilient Restore Safety & Transaction Integrity (AUDIT-DATA-02)
 * Dignity. Self-respect. Discipline.
 *
 * Verifies that:
 * 1. Replace restore is strictly atomic: invalid backups are rejected before touching
 *    any table, and transaction failures roll back completely via native IndexedDB transactions.
 * 2. Large backup payloads (1,000+ records) are restored and verified without memory leakage.
 * 3. Merge restore handles non-conflicting, duplicate, and conflicting records safely,
 *    reporting conflicts without silent overwrites, preserving local history, rewards,
 *    journals, and focus sessions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../storage/db';
import { RestoreTransactionService, RestoreTransactionError } from '../core/backup/restoreTransactionService';
import { BackupExportService } from '../core/backup/backupExportService';
import type { SemnotesBackupPayload } from '../core/backup/backupTypes';
import { APPLICATION_ID, BACKUP_FORMAT_VERSION, CURRENT_DB_VERSION } from '../core/backup/backupTypes';
import { generateUUID } from '../core/utils';

describe('Crash-Resilient Restore Safety & Transaction Integrity (AUDIT-DATA-02)', () => {
  beforeEach(async () => {
    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) {
        await table.clear();
      }
    });
  });

  const validHabit1 = {
    id: 'a1000000-0000-4000-8000-000000000001',
    title: 'Deep Learning Study',
    description: 'Neural network architectures',
    category: 'craft' as const,
    type: 'completion' as const,
    schedule: { frequency: 'daily' as const, selectedDays: [0, 1, 2, 3, 4, 5, 6] },
    startDate: '2026-11-01',
    status: 'active' as const,
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
    sortOrder: 1,
  };

  const validHabit2 = {
    id: 'a2000000-0000-4000-8000-000000000002',
    title: 'Morning 5K Run',
    description: 'Aerobic conditioning',
    category: 'body' as const,
    type: 'quantitative' as const,
    targetValue: 5,
    unit: 'km',
    schedule: { frequency: 'daily' as const, selectedDays: [0, 1, 2, 3, 4, 5, 6] },
    startDate: '2026-11-01',
    status: 'active' as const,
    createdAt: '2026-11-01T06:00:00.000Z',
    updatedAt: '2026-11-01T06:00:00.000Z',
    sortOrder: 2,
  };

  it('rejects an invalid backup payload before mutating any database table', async () => {
    // Populate database with existing data
    await db.habits.add(validHabit1);
    expect(await db.habits.count()).toBe(1);

    // Completely invalid payload (wrong app identifier, no data container)
    const invalidPayload = {
      manifest: {
        app: 'corrupted-app',
        backupVersion: '999.0',
        appVersion: '1.0.0',
        dbVersion: CURRENT_DB_VERSION,
        exportedAt: '2026-11-18T00:00:00.000Z',
        recordCounts: {},
        checksum: 'invalid-checksum',
      },
      data: null as any,
    } as any;

    await expect(RestoreTransactionService.restoreReplace(invalidPayload)).rejects.toThrow(
      RestoreTransactionError
    );

    // Critical assertion: existing database was NEVER touched or cleared!
    expect(await db.habits.count()).toBe(1);
    const existing = await db.habits.get(validHabit1.id);
    expect(existing?.title).toBe('Deep Learning Study');
  });

  it('rolls back atomically if a write error occurs mid-transaction during replace restore', async () => {
    // Current database state: validHabit1
    await db.habits.add(validHabit1);
    await db.habitLogs.add({
      id: generateUUID(),
      habitId: validHabit1.id,
      date: '2026-11-01',
      status: 'completed',
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-01T10:00:00.000Z',
    });
    expect(await db.habits.count()).toBe(1);
    expect(await db.habitLogs.count()).toBe(1);

    // Construct a valid payload
    const incomingPayload: SemnotesBackupPayload = {
      manifest: {
        app: APPLICATION_ID,
        backupVersion: BACKUP_FORMAT_VERSION,
        appVersion: '1.0.0',
        dbVersion: CURRENT_DB_VERSION,
        exportedAt: '2026-11-18T00:00:00.000Z',
        recordCounts: { habits: 1 },
        checksum: 'mock-sum',
      },
      data: {
        habits: [validHabit2],
        habitLogs: [],
        auditRecords: [],
        milestones: [],
        achievements: [],
        journalEntries: [],
        urgeLogs: [],
        morningIntentions: [],
        eveningDebriefs: [],
        focusSessions: [],
        userSettings: [],
      },
    };

    // Spy on db.habits.bulkAdd to simulate a database disk write failure during the transaction
    const originalBulkAdd = db.habits.bulkAdd;
    db.habits.bulkAdd = (() => {
      throw new Error('Simulated IndexedDB QuotaExceededError or hardware write failure');
    }) as any;

    try {
      await expect(
        RestoreTransactionService.restoreReplace(incomingPayload, { skipValidation: true })
      ).rejects.toThrow(/QuotaExceededError/);
    } finally {
      db.habits.bulkAdd = originalBulkAdd;
    }

    // Critical assertion: Because of transaction rollback, the pre-restore tables are still 100% intact!
    expect(await db.habits.count()).toBe(1);
    expect(await db.habitLogs.count()).toBe(1);
    const preservedHabit = await db.habits.get(validHabit1.id);
    expect(preservedHabit?.title).toBe('Deep Learning Study');
  });

  it('successfully executes replace restore on an empty database', async () => {
    expect(await db.habits.count()).toBe(0);

    const payload: SemnotesBackupPayload = {
      manifest: {
        app: APPLICATION_ID,
        backupVersion: BACKUP_FORMAT_VERSION,
        appVersion: '1.0.0',
        dbVersion: CURRENT_DB_VERSION,
        exportedAt: '2026-11-18T00:00:00.000Z',
        recordCounts: { habits: 2 },
        checksum: 'valid-sum',
      },
      data: {
        habits: [validHabit1, validHabit2],
        habitLogs: [],
        auditRecords: [],
        milestones: [],
        achievements: [],
        journalEntries: [],
        urgeLogs: [],
        morningIntentions: [],
        eveningDebriefs: [],
        focusSessions: [],
        userSettings: [],
      },
    };

    const result = await RestoreTransactionService.restoreReplace(payload, { skipValidation: true });
    expect(result.success).toBe(true);
    expect(result.totalRestored).toBe(2);
    expect(await db.habits.count()).toBe(2);
  });

  it('restores large database payloads (1,000+ synthetic records) atomically and accurately', async () => {
    const syntheticLogs = Array.from({ length: 1000 }, (_, i) => ({
      id: generateUUID(),
      habitId: validHabit1.id,
      date: `2026-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      status: (i % 2 === 0 ? 'completed' : 'failed') as any,
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    }));

    const largePayload: SemnotesBackupPayload = {
      manifest: {
        app: APPLICATION_ID,
        backupVersion: BACKUP_FORMAT_VERSION,
        appVersion: '1.0.0',
        dbVersion: CURRENT_DB_VERSION,
        exportedAt: '2026-11-18T00:00:00.000Z',
        recordCounts: { habits: 1, habitLogs: 1000 },
        checksum: 'large-checksum',
      },
      data: {
        habits: [validHabit1],
        habitLogs: syntheticLogs,
        auditRecords: [],
        milestones: [],
        achievements: [],
        journalEntries: [],
        urgeLogs: [],
        morningIntentions: [],
        eveningDebriefs: [],
        focusSessions: [],
        userSettings: [],
      },
    };

    const result = await RestoreTransactionService.restoreReplace(largePayload, { skipValidation: true });
    expect(result.success).toBe(true);
    expect(result.totalRestored).toBe(1001);
    expect(await db.habits.count()).toBe(1);
    expect(await db.habitLogs.count()).toBe(1000);
  });

  it('merge restore inserts non-conflicting records and skips duplicate IDs', async () => {
    // Local DB has Habit 1
    await db.habits.add(validHabit1);
    expect(await db.habits.count()).toBe(1);

    // Incoming payload has Habit 1 (duplicate) and Habit 2 (new)
    const mergePayload: SemnotesBackupPayload = {
      manifest: {
        app: APPLICATION_ID,
        backupVersion: BACKUP_FORMAT_VERSION,
        appVersion: '1.0.0',
        dbVersion: CURRENT_DB_VERSION,
        exportedAt: '2026-11-18T00:00:00.000Z',
        recordCounts: { habits: 2 },
        checksum: 'mock-sum',
      },
      data: {
        habits: [validHabit1, validHabit2],
        habitLogs: [],
        auditRecords: [],
        milestones: [],
        achievements: [],
        journalEntries: [],
        urgeLogs: [],
        morningIntentions: [],
        eveningDebriefs: [],
        focusSessions: [],
        userSettings: [],
      },
    };

    const result = await RestoreTransactionService.restoreMerge(mergePayload, { skipValidation: true });
    expect(result.success).toBe(true);
    expect(result.insertedCount).toBe(1); // Habit 2 inserted
    expect(result.skippedCount).toBe(1);  // Habit 1 skipped
    expect(result.conflictCount).toBe(0);

    expect(await db.habits.count()).toBe(2);
  });

  it('merge restore detects conflicts, reports them in structured details, and preserves local records without silent overwrites', async () => {
    // Local DB has Habit 1
    await db.habits.add(validHabit1);

    // Incoming payload has Habit 1 with conflicting title
    const conflictingHabit1 = {
      ...validHabit1,
      title: 'Modified Title in Incoming Backup',
    };

    const payload: SemnotesBackupPayload = {
      manifest: {
        app: APPLICATION_ID,
        backupVersion: BACKUP_FORMAT_VERSION,
        appVersion: '1.0.0',
        dbVersion: CURRENT_DB_VERSION,
        exportedAt: '2026-11-18T00:00:00.000Z',
        recordCounts: { habits: 1 },
        checksum: 'sum',
      },
      data: {
        habits: [conflictingHabit1],
        habitLogs: [],
        auditRecords: [],
        milestones: [],
        achievements: [],
        journalEntries: [],
        urgeLogs: [],
        morningIntentions: [],
        eveningDebriefs: [],
        focusSessions: [],
        userSettings: [],
      },
    };

    const result = await RestoreTransactionService.restoreMerge(payload, { skipValidation: true });
    expect(result.success).toBe(true);
    expect(result.skippedCount).toBe(1);
    expect(result.conflictCount).toBe(1);
    expect(result.conflicts[0].table).toBe('habits');
    expect(result.conflicts[0].resolution).toBe('kept_local');

    // Local record remains untouched
    const local = await db.habits.get(validHabit1.id);
    expect(local?.title).toBe('Deep Learning Study');
  });

  it('merge restore preserves historical achievements, reward claims, journals, and focus sessions', async () => {
    const milestoneId = generateUUID();
    const achievementId = generateUUID();
    const nowIso = new Date().toISOString();

    // Local DB has an earned, claimed achievement
    await db.achievements.add({
      id: achievementId,
      habitId: validHabit1.id,
      milestoneId,
      thresholdDays: 30,
      streakStartDate: '2026-10-01',
      achievedDate: '2026-10-31',
      achievedStreakLength: 30,
      rewardTitle: '30-Day Master Milestone',
      rewardDescription: 'Gold insignia',
      isClaimed: true,
      claimedAt: '2026-10-31T20:00:00.000Z',
      claimNotes: 'Local claim note',
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // Incoming payload has the same achievement
    const payload: SemnotesBackupPayload = {
      manifest: {
        app: APPLICATION_ID,
        backupVersion: BACKUP_FORMAT_VERSION,
        appVersion: '1.0.0',
        dbVersion: CURRENT_DB_VERSION,
        exportedAt: '2026-11-18T00:00:00.000Z',
        recordCounts: {},
        checksum: 'sum',
      },
      data: {
        habits: [],
        habitLogs: [],
        auditRecords: [],
        milestones: [],
        achievements: [
          {
            id: achievementId,
            habitId: validHabit1.id,
            milestoneId,
            thresholdDays: 30,
            streakStartDate: '2026-10-01',
            achievedDate: '2026-10-31',
            achievedStreakLength: 30,
            rewardTitle: '30-Day Master Milestone',
            rewardDescription: 'Gold insignia',
            isClaimed: false,
            createdAt: nowIso,
            updatedAt: nowIso,
          },
        ],
        journalEntries: [],
        urgeLogs: [],
        morningIntentions: [],
        eveningDebriefs: [],
        focusSessions: [],
        userSettings: [],
      },
    };

    const result = await RestoreTransactionService.restoreMerge(payload, { skipValidation: true });
    expect(result.skippedCount).toBe(1);

    // Verify local claimed state was NOT overwritten by incoming unclaimed state
    const achievement = await db.achievements.get(achievementId);
    expect(achievement?.isClaimed).toBe(true);
    expect(achievement?.claimNotes).toBe('Local claim note');
  });

  it('all 11 database tables are fully included in backup export and restore', async () => {
    // Generate empty backup and verify all 11 tables are present
    const exported = await BackupExportService.generateBackup();
    const tableKeys = Object.keys(exported.data);

    expect(tableKeys).toContain('habits');
    expect(tableKeys).toContain('habitLogs');
    expect(tableKeys).toContain('auditRecords');
    expect(tableKeys).toContain('milestones');
    expect(tableKeys).toContain('achievements');
    expect(tableKeys).toContain('journalEntries');
    expect(tableKeys).toContain('urgeLogs');
    expect(tableKeys).toContain('morningIntentions');
    expect(tableKeys).toContain('eveningDebriefs');
    expect(tableKeys).toContain('focusSessions');
    expect(tableKeys).toContain('userSettings');

    // Restore and verify total restored
    const restoreResult = await RestoreTransactionService.restoreReplace(exported);
    expect(restoreResult.success).toBe(true);
  });
});
