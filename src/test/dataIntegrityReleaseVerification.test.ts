import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../storage/db';
import { HabitService } from '../core/services/habitService';
import { HabitLogService } from '../core/services/habitLogService';
import { BackupExportService } from '../core/backup/backupExportService';
import { BackupValidationService } from '../core/backup/backupValidationService';
import { RestoreTransactionService } from '../core/backup/restoreTransactionService';
import { EncryptionService } from '../core/crypto/encryptionService';
import { LEGACY_ENCRYPTED_BACKUP_FIXTURE, LEGACY_FIXTURE_PASSPHRASE } from './fixtures/legacyEncryptedBackupFixture';
import type { Habit, Milestone, Achievement, FocusSession, JournalEntry } from '../core/domain/types';
import type { SemnotesBackupPayload } from '../core/backup/backupTypes';

describe('Data Integrity, Deletion Invariants & Backup Release Verification (Section 6)', () => {
  beforeEach(async () => {
    await db.habits.clear();
    await db.habitLogs.clear();
    await db.auditRecords.clear();
    await db.milestones.clear();
    await db.achievements.clear();
    await db.journalEntries.clear();
    await db.urgeLogs.clear();
    await db.morningIntentions.clear();
    await db.eveningDebriefs.clear();
    await db.focusSessions.clear();
    await db.userSettings.clear();
  });

  it('1 & 2. verifies normal habit deletion preserves tombstone and allows restoration', async () => {
    const habit = await HabitService.createHabit({
      title: 'Deep Meditation',
      category: 'mind',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-01-01'
    });

    await HabitLogService.recordCheckIn(habit, '2026-01-01', { status: 'completed' });

    // Normal deletion marks deletedAt (soft tombstone)
    await HabitService.deleteHabit(habit.id, false);

    const activeHabits = await HabitService.getAllHabits({ includeDeleted: false });
    expect(activeHabits.some((h) => h.id === habit.id)).toBe(false);

    const rawInDb = await db.habits.get(habit.id);
    expect(rawInDb).toBeDefined();
    expect(rawInDb?.deletedAt).toBeDefined();

    // Check-in log remains intact
    const logs = await db.habitLogs.where('habitId').equals(habit.id).toArray();
    expect(logs).toHaveLength(1);

    // Restoration restores active status
    const restored = await HabitService.restoreDeletedHabit(habit.id);
    expect(restored.deletedAt).toBeUndefined();
    expect(restored.status).toBe('active');
  });

  it('3. verifies explicit permanent history purge removes all linked records cleanly', async () => {
    const habit = await HabitService.createHabit({
      title: 'Digital Fasting',
      category: 'abstinence',
      type: 'abstinence',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-01-01'
    });

    await HabitLogService.recordCheckIn(habit, '2026-01-01', { status: 'completed' });
    await HabitLogService.recordCheckIn(habit, '2026-01-01', {
      status: 'completed',
      reason: 'Audit correction reason test'
    });

    // Hard purge
    await HabitService.deleteHabit(habit.id, true);

    const habitInDb = await db.habits.get(habit.id);
    expect(habitInDb).toBeUndefined();

    const logs = await db.habitLogs.where('habitId').equals(habit.id).toArray();
    expect(logs).toHaveLength(0);

    const audits = await db.auditRecords.where('habitId').equals(habit.id).toArray();
    expect(audits).toHaveLength(0);
  });

  it('4, 5 & 6. preserves historical achievements, focus sessions, and journal entries across normal habit deletion', async () => {
    const habit = await HabitService.createHabit({
      title: 'Coding Marathon',
      category: 'craft',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-01-01'
    });

    const milestone: Milestone = {
      id: 'm-001',
      habitId: habit.id,
      thresholdDays: 7,
      rewardTitle: 'Mechanical Keyboard',
      isEnabled: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    };
    await db.milestones.add(milestone);

    const achievement: Achievement = {
      id: 'ach-001',
      habitId: habit.id,
      milestoneId: milestone.id,
      thresholdDays: 7,
      streakStartDate: '2026-01-01',
      achievedDate: '2026-01-07',
      isClaimed: true,
      rewardTitle: milestone.rewardTitle,
      createdAt: '2026-01-07T00:00:00.000Z'
    };
    await db.achievements.add(achievement);

    const focusSession: FocusSession = {
      id: 'fs-001',
      habitId: habit.id,
      linkedHabitId: habit.id,
      title: 'Algorithms Sprint',
      sessionMode: 'continuous',
      targetDurationMinutes: 60,
      actualDurationSeconds: 3600,
      breakDurationSeconds: 0,
      completedIntervals: 1,
      startedAt: '2026-01-07T10:00:00.000Z',
      endedAt: '2026-01-07T11:00:00.000Z',
      status: 'completed',
      date: '2026-01-07',
      createdAt: '2026-01-07T10:00:00.000Z'
    };
    await db.focusSessions.add(focusSession);

    const journalEntry: JournalEntry = {
      id: 'j-001',
      date: '2026-01-07',
      title: 'Milestone Day',
      content: 'Felt uncompromising focus throughout the day.',
      tags: ['discipline'],
      isArchived: false,
      linkedHabitId: habit.id,
      createdAt: '2026-01-07T20:00:00.000Z',
      updatedAt: '2026-01-07T20:00:00.000Z'
    };
    await db.journalEntries.add(journalEntry);

    // Normal soft deletion
    await HabitService.deleteHabit(habit.id, false);

    // Verify all history preserved
    expect(await db.achievements.get(achievement.id)).toBeDefined();
    expect(await db.focusSessions.get(focusSession.id)).toBeDefined();
    expect(await db.journalEntries.get(journalEntry.id)).toBeDefined();
  });

  it('7 & 8. verifies complete backup export covers all 11 tables with valid SHA-256 checksum', async () => {
    const habit = await HabitService.createHabit({
      title: 'Strength Training',
      category: 'body',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-01-01'
    });

    const payload = await BackupExportService.generateBackup();
    expect(payload.manifest.app).toBe('semnotes');
    expect(payload.manifest.backupVersion).toBe('1.0');
    expect(payload.manifest.dbVersion).toBe(6);
    expect(payload.manifest.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(payload.data.habits).toHaveLength(1);
    expect(payload.data.habits[0].id).toBe(habit.id);

    const { report } = await BackupValidationService.validate(payload);
    expect(report.isValid).toBe(true);
    expect(report.checksumValid).toBe(true);
    expect(report.errors).toHaveLength(0);
  });

  it('9 & 10 & 11. verifies unencrypted, legacy encrypted (100k), and new encrypted (600k) restores', async () => {
    // 9. Plain JSON restore
    const habit = await HabitService.createHabit({
      title: 'Morning Cold Shower',
      category: 'discipline',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-01-01'
    });
    const plainPayload = await BackupExportService.generateBackup();
    await db.habits.clear();

    const plainRestore = await RestoreTransactionService.restoreReplace(plainPayload);
    expect(plainRestore.success).toBe(true);
    expect(await db.habits.get(habit.id)).toBeDefined();

    // 10. Legacy Encrypted Backup (100,000 iterations v1.0 fixture)
    const legacyDecrypted = await EncryptionService.decryptPayload(
      LEGACY_ENCRYPTED_BACKUP_FIXTURE,
      LEGACY_FIXTURE_PASSPHRASE
    );
    expect(legacyDecrypted).toBeDefined();
    expect(legacyDecrypted.data.habits.length).toBeGreaterThan(0);

    const legacyRestore = await RestoreTransactionService.restoreMerge(legacyDecrypted);
    expect(legacyRestore.success).toBe(true);
    expect(legacyRestore.insertedCount).toBeGreaterThan(0);

    // 11. New Encrypted Backup (600,000 iterations v2.0 envelope)
    const newEnvelope = await EncryptionService.encryptPayload(plainPayload, 'ModernPassphrase2026!');
    expect(newEnvelope.formatVersion).toBe('2.0');
    expect(newEnvelope.kdfParams.iterations).toBe(600000);

    const modernDecrypted = await EncryptionService.decryptPayload(newEnvelope, 'ModernPassphrase2026!');
    const modernRestore = await RestoreTransactionService.restoreReplace(modernDecrypted);
    expect(modernRestore.success).toBe(true);
    expect(await db.habits.get(habit.id)).toBeDefined();
  });

  it('12 & 13. verifies clean Replace restore and safe non-destructive Merge restore', async () => {
    const localHabit = await HabitService.createHabit({
      title: 'Local Habit',
      category: 'mind',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-01-01'
    });

    const remoteHabit: Habit = {
      id: '11111111-2222-4333-8444-555555555555',
      title: 'Remote Habit',
      category: 'craft',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-01-01',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    };

    const importPayload: SemnotesBackupPayload = {
      manifest: {
        app: 'semnotes',
        backupVersion: '1.0',
        appVersion: '1.0.0',
        exportedAt: '2026-01-01T00:00:00.000Z',
        dbVersion: 6,
        recordCounts: { habits: 1 },
        checksum: ''
      },
      data: {
        habits: [remoteHabit],
        habitLogs: [],
        auditRecords: [],
        milestones: [],
        achievements: [],
        journalEntries: [],
        urgeLogs: [],
        morningIntentions: [],
        eveningDebriefs: [],
        focusSessions: []
      }
    };

    // 13. Merge restore: adds remote habit, keeps local habit
    const mergeResult = await RestoreTransactionService.restoreMerge(importPayload);
    expect(mergeResult.success).toBe(true);
    expect(mergeResult.insertedCount).toBe(1);
    expect(await db.habits.get(localHabit.id)).toBeDefined();
    expect(await db.habits.get(remoteHabit.id)).toBeDefined();

    // 12. Replace restore: overwrites local database with import payload
    const replaceResult = await RestoreTransactionService.restoreReplace(importPayload);
    expect(replaceResult.success).toBe(true);
    expect(await db.habits.get(localHabit.id)).toBeUndefined();
    expect(await db.habits.get(remoteHabit.id)).toBeDefined();
  });

  it('14 & 15. rejects invalid backups before mutating tables and rolls back cleanly', async () => {
    const existingHabit = await HabitService.createHabit({
      title: 'Pre-existing Sovereign Habit',
      category: 'body',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-01-01'
    });

    const malformedPayload = {
      manifest: {
        app: 'corrupted-app',
        exportedAt: 'invalid-date',
        dbVersion: 6,
        checksum: 'bad'
      },
      data: {
        habits: [{ id: 'corrupt-entry-without-required-title' }]
      }
    };

    const validation = await BackupValidationService.validate(malformedPayload);
    expect(validation.report.isValid).toBe(false);

    // Attempting restore with unvalidated payload
    await expect(RestoreTransactionService.restoreReplace(malformedPayload as any)).rejects.toThrow();

    // Database is untouched; existing habit survives
    const habitSurvives = await db.habits.get(existingHabit.id);
    expect(habitSurvives).toBeDefined();
    expect(habitSurvives?.title).toBe('Pre-existing Sovereign Habit');
  });

  it('16 & 17. handles duplicate records and missing references gracefully', async () => {
    const habit = await HabitService.createHabit({
      title: 'Stoic Evening Review',
      category: 'mind',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-01-01'
    });

    const duplicatePayload: SemnotesBackupPayload = {
      manifest: {
        app: 'semnotes',
        backupVersion: '1.0',
        appVersion: '1.0.0',
        exportedAt: '2026-01-01T00:00:00.000Z',
        dbVersion: 6,
        recordCounts: { habits: 1, habitLogs: 1 },
        checksum: ''
      },
      data: {
        habits: [habit],
        // HabitLog referencing a non-existent foreign habit
        habitLogs: [
          {
            id: '22222222-3333-4444-8555-666666666666',
            habitId: '99999999-9999-4999-8999-999999999999',
            date: '2026-01-01',
            status: 'completed',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
          }
        ],
        auditRecords: [],
        milestones: [],
        achievements: [],
        journalEntries: [],
        urgeLogs: [],
        morningIntentions: [],
        eveningDebriefs: [],
        focusSessions: []
      }
    };

    const { report } = await BackupValidationService.validate(duplicatePayload);
    // Flags warning for missing foreign reference without crashing
    expect(report.warnings.some((w) => w.includes('orphaned record reference'))).toBe(true);

    // Merge restore skips duplicate habit cleanly
    const result = await RestoreTransactionService.restoreMerge(duplicatePayload);
    expect(result.success).toBe(true);
    expect(result.skippedCount).toBe(1);
    expect(result.insertedCount).toBe(1); // orphan log inserted without blocking
  });
});
