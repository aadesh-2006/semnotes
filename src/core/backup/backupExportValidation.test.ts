import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../storage/db';
import { HabitService } from '../services/habitService';
import { HabitLogService } from '../services/habitLogService';
import { FocusSessionService } from '../focus/focusSessionService';
import { BackupExportService } from './backupExportService';
import { BackupValidationService } from './backupValidationService';
import { BackupIntegrityService } from './backupIntegrityService';
import { APPLICATION_ID, BACKUP_FORMAT_VERSION, CURRENT_DB_VERSION } from './backupTypes';

describe('Backup Export and Validation Engine', () => {
  beforeEach(async () => {
    // Clear all tables before each test
    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) {
        await table.clear();
      }
    });
  });

  describe('BackupExportService.generateBackup', () => {
    it('exports a valid empty database backup payload with accurate manifest', async () => {
      const payload = await BackupExportService.generateBackup();

      expect(payload.manifest.app).toBe(APPLICATION_ID);
      expect(payload.manifest.backupVersion).toBe(BACKUP_FORMAT_VERSION);
      expect(payload.manifest.dbVersion).toBe(CURRENT_DB_VERSION);
      expect(payload.manifest.appVersion).toBe('1.0.0');
      expect(new Date(payload.manifest.exportedAt).toISOString()).toBe(payload.manifest.exportedAt);
      expect(payload.manifest.checksum).toBeDefined();
      expect(typeof payload.manifest.checksum).toBe('string');
      expect(payload.manifest.checksum.length).toBe(64); // SHA-256 hex length

      // All tables should be empty arrays
      expect(payload.data.habits).toEqual([]);
      expect(payload.data.habitLogs).toEqual([]);
      expect(payload.data.focusSessions).toEqual([]);
      expect(payload.manifest.recordCounts.habits).toBe(0);
      expect(payload.manifest.recordCounts.focusSessions).toBe(0);

      // Checksum must be verifiable
      const isChecksumValid = await BackupIntegrityService.verifyChecksum(payload.data, payload.manifest.checksum);
      expect(isChecksumValid).toBe(true);
    });

    it('exports records across multiple tables and accurately reflects record counts', async () => {
      // Seed data using authentic domain services to guarantee schema conformance
      const habit = await HabitService.createHabit({
        title: 'Daily Meditation',
        description: 'Morning meditation session',
        category: 'mind',
        type: 'completion',
        schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
        startDate: '2026-01-01',
      });

      const log = await HabitLogService.recordCheckIn(habit, '2026-01-06', {
        status: 'completed',
        notes: 'Great calm session',
      });

      const focusSession = await FocusSessionService.createSession({
        title: 'Deep Coding',
        sessionMode: 'pomodoro',
        plannedDurationMinutes: 25,
        linkedHabitId: habit.id,
      });

      const payload = await BackupExportService.generateBackup();

      expect(payload.manifest.recordCounts.habits).toBe(1);
      expect(payload.manifest.recordCounts.habitLogs).toBe(1);
      expect(payload.manifest.recordCounts.focusSessions).toBe(1);
      expect(payload.data.habits).toHaveLength(1);
      expect(payload.data.habits[0].id).toBe(habit.id);
      expect(payload.data.habitLogs[0].notes).toBe('Great calm session');
      expect(payload.data.focusSessions[0].id).toBe(focusSession.id);

      // Verify checksum
      const isChecksumValid = await BackupIntegrityService.verifyChecksum(payload.data, payload.manifest.checksum);
      expect(isChecksumValid).toBe(true);
    });
  });

  describe('BackupValidationService.validate', () => {
    it('validates a properly exported backup payload with 0 errors and isValid = true', async () => {
      const payload = await BackupExportService.generateBackup();
      const { report, parsedPayload } = await BackupValidationService.validate(payload);

      expect(report.isValid).toBe(true);
      expect(report.errors).toHaveLength(0);
      expect(report.checksumValid).toBe(true);
      expect(report.recordCounts.habits).toBe(0);
      expect(parsedPayload).not.toBeNull();
    });

    it('validates a JSON string input successfully', async () => {
      const payload = await BackupExportService.generateBackup();
      const jsonString = JSON.stringify(payload);
      const { report, parsedPayload } = await BackupValidationService.validate(jsonString);

      expect(report.isValid).toBe(true);
      expect(report.errors).toHaveLength(0);
      expect(parsedPayload).not.toBeNull();
    });

    it('rejects invalid JSON string syntax', async () => {
      const malformedJson = '{"app": "semnotes", manifest: { bad json...';
      const { report, parsedPayload } = await BackupValidationService.validate(malformedJson);

      expect(report.isValid).toBe(false);
      expect(report.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Invalid JSON syntax'),
        ])
      );
      expect(parsedPayload).toBeNull();
    });

    it('rejects backup with wrong application identifier', async () => {
      const payload = await BackupExportService.generateBackup();
      (payload.manifest as any).app = 'other-app';

      const { report } = await BackupValidationService.validate(payload);
      expect(report.isValid).toBe(false);
      expect(report.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Incompatible application identifier'),
        ])
      );
    });

    it('rejects backup with unsupported major version', async () => {
      const payload = await BackupExportService.generateBackup();
      payload.manifest.backupVersion = '99.0';

      const { report } = await BackupValidationService.validate(payload);
      expect(report.isValid).toBe(false);
      expect(report.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Unsupported backup format version'),
        ])
      );
    });

    it('detects corrupted or tampered data checksum', async () => {
      const payload = await BackupExportService.generateBackup();
      payload.manifest.checksum = '0000000000000000000000000000000000000000000000000000000000000000';

      const { report } = await BackupValidationService.validate(payload);
      expect(report.checksumValid).toBe(false);
      expect(report.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Checksum verification failed'),
        ])
      );
    });

    it('detects duplicate primary keys within a table', async () => {
      // Seed a valid habit first to extract clean schema
      const habit = await HabitService.createHabit({
        title: 'Reading',
        category: 'mind',
        type: 'completion',
        schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
        startDate: '2026-01-01',
      });

      const payload = await BackupExportService.generateBackup();
      // Add a duplicate of the same habit into payload
      payload.data.habits = [habit, { ...habit, title: 'Duplicate Title' }];
      payload.manifest.checksum = await BackupIntegrityService.computeChecksum(payload.data);

      const { report } = await BackupValidationService.validate(payload);
      expect(report.isValid).toBe(false);
      expect(report.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('duplicate primary key ID(s)'),
        ])
      );
    });

    it('flags warnings for orphaned foreign key references', async () => {
      const validHabit = await HabitService.createHabit({
        title: 'Reading',
        category: 'mind',
        type: 'completion',
        schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
        startDate: '2026-01-01',
      });

      const validLog = await HabitLogService.recordCheckIn(validHabit, '2026-01-01', {
        status: 'completed',
      });

      const payload = await BackupExportService.generateBackup();
      // Clear habits in payload, leaving log orphaned
      payload.data.habits = [];
      payload.data.habitLogs = [validLog];
      payload.manifest.checksum = await BackupIntegrityService.computeChecksum(payload.data);

      const { report } = await BackupValidationService.validate(payload);
      expect(report.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining('orphaned record reference'),
        ])
      );
      expect(report.referenceIssues).toHaveLength(1);
      expect(report.referenceIssues[0].missingId).toBe(validHabit.id);
    });
  });
});
