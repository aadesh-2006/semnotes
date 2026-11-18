/**
 * SEMNÓTĒS — Critical Branch Coverage Suite: Backup, Restore & Cryptography
 * Sovereign personal discipline operating system.
 *
 * Expands test coverage across high-risk validation, transaction rollback,
 * schema boundaries, and error recovery paths.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../storage/db';
import { BackupValidationService } from '../core/backup/backupValidationService';
import {
  RestoreTransactionService,
  RestoreTransactionError,
} from '../core/backup/restoreTransactionService';
import { EncryptionService } from '../core/crypto/encryptionService';
import { CryptoDecryptionError } from '../core/crypto/cryptoTypes';
import type { SemnotesBackupPayload } from '../core/backup/backupTypes';
import { BackupIntegrityService } from '../core/backup/backupIntegrityService';

describe('Critical Branch Coverage: Backup & Validation Edge Cases', () => {
  beforeEach(async () => {
    await db.habits.clear();
    await db.habitLogs.clear();
    await db.auditRecords.clear();
    await db.milestones.clear();
    await db.achievements.clear();
    await db.journalEntries.clear();
  });

  it('rejects completely invalid JSON string syntax', async () => {
    const { report, parsedPayload } = await BackupValidationService.validate('{ bad json: true, ');
    expect(report.isValid).toBe(false);
    expect(report.errors[0]).toContain('Invalid JSON syntax');
    expect(parsedPayload).toBeNull();
  });

  it('rejects primitive non-object raw inputs (null, number, boolean)', async () => {
    const resNull = await BackupValidationService.validate(null);
    expect(resNull.report.isValid).toBe(false);
    expect(resNull.report.errors[0]).toContain('Backup payload is empty or not a valid JSON object');

    const resNum = await BackupValidationService.validate(42);
    expect(resNum.report.isValid).toBe(false);

    const resBool = await BackupValidationService.validate(false);
    expect(resBool.report.isValid).toBe(false);
  });

  it('flags error for incompatible application identifier in manifest', async () => {
    const raw = {
      manifest: {
        app: 'other-app',
        backupVersion: '1.0',
        appVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        dbVersion: 6,
        recordCounts: {},
      },
      data: {},
    };

    const { report } = await BackupValidationService.validate(raw);
    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.includes("Expected 'semnotes'"))).toBe(true);
  });

  it('flags error for unsupported backup format version in manifest', async () => {
    const raw = {
      manifest: {
        app: 'semnotes',
        backupVersion: '99.0',
        appVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        dbVersion: 6,
        recordCounts: {},
      },
      data: {},
    };

    const { report } = await BackupValidationService.validate(raw);
    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.includes('Unsupported backup format version'))).toBe(true);
  });

  it('records warning when backup database version is newer than application version', async () => {
    const raw = {
      manifest: {
        app: 'semnotes',
        backupVersion: '1.0',
        appVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        dbVersion: 999, // Future dbVersion
        recordCounts: {},
      },
      data: {
        habits: [],
      },
    };

    const { report } = await BackupValidationService.validate(raw);
    expect(report.warnings.some((w) => w.includes('newer than current application version'))).toBe(true);
  });

  it('rejects backup payload missing the core "data" container', async () => {
    const raw = {
      manifest: {
        app: 'semnotes',
        backupVersion: '1.0',
        appVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        dbVersion: 6,
        recordCounts: {},
      },
    };

    const { report } = await BackupValidationService.validate(raw);
    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.includes('missing the core "data" tables container'))).toBe(true);
  });

  it('flags warning when manifest omits SHA-256 checksum', async () => {
    const raw = {
      manifest: {
        app: 'semnotes',
        backupVersion: '1.0',
        appVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        dbVersion: 6,
        recordCounts: {},
      },
      data: {
        habits: [],
      },
    };

    const { report } = await BackupValidationService.validate(raw);
    expect(report.warnings.some((w) => w.includes('does not include a SHA-256 checksum'))).toBe(true);
  });

  it('rejects backup when a table property is not an array', async () => {
    const raw = {
      manifest: {
        app: 'semnotes',
        backupVersion: '1.0',
        appVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        dbVersion: 6,
        recordCounts: {},
      },
      data: {
        habits: 'not-an-array',
      },
    };

    const { report } = await BackupValidationService.validate(raw);
    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.includes("Table 'habits' must be an array"))).toBe(true);
  });

  it('identifies malformed records in tables and captures sample errors', async () => {
    const raw = {
      manifest: {
        app: 'semnotes',
        backupVersion: '1.0',
        appVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        dbVersion: 6,
        recordCounts: {},
      },
      data: {
        habits: [
          {
            id: 'not-a-uuid',
            title: '', // empty title invalid
          },
        ],
      },
    };

    const { report } = await BackupValidationService.validate(raw);
    expect(report.isValid).toBe(false);
    expect(report.tableIssues.length).toBeGreaterThan(0);
    expect(report.errors.some((e) => e.includes('malformed record'))).toBe(true);
  });

  it('identifies foreign key orphaned references across tables', async () => {
    const habitId = '00000000-0000-4000-8000-000000000001';
    const nonExistentHabitId = '00000000-0000-4000-8000-999999999999';
    const nonExistentMilestoneId = '00000000-0000-4000-8000-888888888888';

    const data = {
      habits: [
        {
          id: habitId,
          title: 'Daily Meditation',
          category: 'mind',
          type: 'completion',
          schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
          startDate: '2026-01-01',
          status: 'active',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          sortOrder: 0,
        },
      ],
      habitLogs: [
        {
          id: '00000000-0000-4000-8000-000000000002',
          habitId: nonExistentHabitId, // Orphaned habitLog
          date: '2026-01-01',
          status: 'completed',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      auditRecords: [],
      milestones: [
        {
          id: '00000000-0000-4000-8000-000000000003',
          habitId: nonExistentHabitId, // Orphaned milestone
          thresholdDays: 10,
          rewardTitle: '10 Days Reward',
          rewardDescription: 'Nice milestone',
          isEnabled: true,
          sortOrder: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      achievements: [
        {
          id: '00000000-0000-4000-8000-000000000004',
          habitId: nonExistentHabitId, // Orphaned achievement habitId
          milestoneId: nonExistentMilestoneId, // Orphaned achievement milestoneId
          thresholdDays: 10,
          streakStartDate: '2026-01-01',
          achievedDate: '2026-01-10',
          achievedStreakLength: 10,
          rewardTitle: '10 Days Reward',
          rewardDescription: 'Nice milestone',
          isClaimed: false,
          createdAt: '2026-01-10T00:00:00.000Z',
        },
      ],
      journalEntries: [
        {
          id: '00000000-0000-4000-8000-000000000005',
          date: '2026-01-01',
          content: 'Day 1 reflection',
          linkedHabitId: nonExistentHabitId, // Orphaned journal link
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      urgeLogs: [],
      morningIntentions: [],
      eveningDebriefs: [],
      focusSessions: [],
      userSettings: [],
    };

    const checksum = await BackupIntegrityService.computeChecksum(data);
    const payload = {
      manifest: {
        app: 'semnotes',
        backupVersion: '1.0',
        appVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        dbVersion: 6,
        recordCounts: {},
        checksum,
      },
      data,
    };

    const { report } = await BackupValidationService.validate(payload);
    expect(report.referenceIssues.length).toBeGreaterThanOrEqual(3);
    expect(report.warnings.some((w) => w.includes('orphaned record reference'))).toBe(true);
  });
});

describe('Critical Branch Coverage: Restore Transactions & Rollbacks', () => {
  beforeEach(async () => {
    await db.habits.clear();
    await db.habitLogs.clear();
  });

  it('rejects restore if backup payload fails pre-validation and does not touch DB', async () => {
    const invalidPayload: any = {
      manifest: { app: 'wrong-app' },
      data: null,
    };

    await expect(
      RestoreTransactionService.restoreReplace(invalidPayload)
    ).rejects.toThrow(RestoreTransactionError);
  });

  it('rejects restore if backup data container is null', async () => {
    const invalidPayload: any = {
      manifest: {
        app: 'semnotes',
        backupVersion: '1.0',
        appVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        dbVersion: 6,
        recordCounts: {},
        checksum: 'fake',
      },
      data: null,
    };

    await expect(
      RestoreTransactionService.validateAndPrepare(invalidPayload, { skipValidation: true })
    ).rejects.toThrow('Restore rejected: Backup data container is empty or invalid.');
  });

  it('merge restore skips duplicate IDs and reports detailed conflict resolution', async () => {
    const habitId = '00000000-0000-4000-8000-000000000010';
    // Seed existing local habit
    await db.habits.add({
      id: habitId,
      title: 'Local Meditation',
      description: 'Daily meditation',
      category: 'mind',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-01-01',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      sortOrder: 0,
    });

    const newHabitId = '00000000-0000-4000-8000-000000000020';
    const data = {
      habits: [
        // Duplicate habit ID
        {
          id: habitId,
          title: 'Remote Conflicting Meditation',
          description: 'Daily meditation remote',
          category: 'mind' as const,
          type: 'completion' as const,
          schedule: { frequency: 'daily' as const, selectedDays: [0, 1, 2, 3, 4, 5, 6] },
          startDate: '2026-01-01',
          status: 'active' as const,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          sortOrder: 0,
        },
        // Brand new habit ID
        {
          id: newHabitId,
          title: 'Remote DSA Habit',
          description: 'Daily practice',
          category: 'mind' as const,
          type: 'completion' as const,
          schedule: { frequency: 'daily' as const, selectedDays: [0, 1, 2, 3, 4, 5, 6] },
          startDate: '2026-01-01',
          status: 'active' as const,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          sortOrder: 1,
        },
      ],
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
    };

    const checksum = await BackupIntegrityService.computeChecksum(data);
    const payload: SemnotesBackupPayload = {
      manifest: {
        app: 'semnotes',
        backupVersion: '1.0',
        appVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        dbVersion: 6,
        recordCounts: { habits: 2 },
        checksum,
      },
      data,
    };

    const result = await RestoreTransactionService.restoreMerge(payload);
    expect(result.success).toBe(true);
    expect(result.insertedCount).toBe(1); // 1 new habit inserted
    expect(result.skippedCount).toBe(1);  // 1 duplicate habit skipped
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].recordId).toBe(habitId);
    expect(result.conflicts[0].resolution).toBe('kept_local');

    // Verify local habit title was preserved
    const habitInDb = await db.habits.get(habitId);
    expect(habitInDb?.title).toBe('Local Meditation');

    // Verify new habit was inserted
    const newHabitInDb = await db.habits.get(newHabitId);
    expect(newHabitInDb?.title).toBe('Remote DSA Habit');
  });
});

describe('Critical Branch Coverage: Encryption Service Edge Cases', () => {
  it('throws CryptoDecryptionError when decoding malformed Base64', () => {
    expect(() => {
      EncryptionService.base64ToUint8Array('not-valid-base-64-!!@@##');
    }).toThrow(CryptoDecryptionError);
  });

  it('throws CryptoDecryptionError when decrypted payload is not valid JSON', async () => {
    // Encrypt raw plain text that is not JSON
    const plainString = 'Plain text not in JSON format';
    const envelope = await EncryptionService.encryptString(plainString, 'SafePassword123!');

    await expect(
      EncryptionService.decryptPayload(envelope, 'SafePassword123!')
    ).rejects.toThrow(/Decrypted data is not valid JSON/);
  });

  it('throws CryptoDecryptionError when envelope is null or non-object', async () => {
    await expect(
      EncryptionService.decryptEnvelope(null as any, 'password')
    ).rejects.toThrow('Envelope payload is null or not a valid object.');
  });

  it('throws CryptoDecryptionError when envelope app is wrong', async () => {
    const envelope = await EncryptionService.encryptString('{}', 'password');
    const wrongApp = { ...envelope, app: 'wrong' as any };

    await expect(
      EncryptionService.decryptEnvelope(wrongApp, 'password')
    ).rejects.toThrow(/Incompatible application identifier/);
  });

  it('throws CryptoDecryptionError when envelope kdfParams is missing', async () => {
    const envelope = await EncryptionService.encryptString('{}', 'password');
    const missingParams = { ...envelope, kdfParams: null as any };

    await expect(
      EncryptionService.decryptEnvelope(missingParams, 'password')
    ).rejects.toThrow('Missing KDF parameters object.');
  });

  it('throws CryptoDecryptionError when envelope ciphertext is shorter than 16 bytes tag', async () => {
    const envelope = await EncryptionService.encryptString('{}', 'password');
    const shortCiphertext = {
      ...envelope,
      ciphertext: EncryptionService.bufferToBase64(new Uint8Array(8)), // only 8 bytes
    };

    await expect(
      EncryptionService.decryptEnvelope(shortCiphertext, 'password')
    ).rejects.toThrow(/Payload is smaller than authentication tag/);
  });
});
