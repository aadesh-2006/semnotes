/**
 * SEMNÓTĒS — Backup Pre-Import Validation Service
 * Sovereign personal discipline operating system.
 *
 * Implements rigorous pre-import validation before any database modification:
 * 1. JSON syntax check
 * 2. Manifest and version compatibility check
 * 3. Cryptographic SHA-256 data checksum verification
 * 4. Record schema validation per table (using Zod)
 * 5. Primary key ID uniqueness check
 * 6. Foreign-key-like reference integrity check
 */

import type {
  BackupValidationReport,
  SemnotesBackupPayload,
  TableIssueDetail,
  ReferenceIssueDetail,
} from './backupTypes';
import { APPLICATION_ID, BACKUP_FORMAT_VERSION, CURRENT_DB_VERSION } from './backupTypes';
import {
  HabitSchema,
  HabitLogSchema,
  AuditRecordSchema,
  MilestoneSchema,
  AchievementSchema,
  JournalEntrySchema,
  UrgeLogRecordSchema,
  MorningIntentionSchema,
  EveningDebriefSchema,
  FocusSessionRecordSchema,
  UserSettingsSchema
} from '../domain/types';
import { BackupIntegrityService } from './backupIntegrityService';

export class BackupValidationService {
  /**
   * Validates a raw backup (JSON string or parsed object) and produces a comprehensive validation report.
   */
  static async validate(rawInput: string | unknown): Promise<{
    report: BackupValidationReport;
    parsedPayload: SemnotesBackupPayload | null;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const tableIssues: TableIssueDetail[] = [];
    const referenceIssues: ReferenceIssueDetail[] = [];

    // 1. JSON Syntax Check
    let parsed: any;
    if (typeof rawInput === 'string') {
      try {
        parsed = JSON.parse(rawInput);
      } catch (err) {
        return {
          report: {
            isValid: false,
            app: 'unknown',
            backupVersion: 'unknown',
            dbVersion: 0,
            exportedAt: '',
            totalRecords: 0,
            recordCounts: {},
            checksumValid: false,
            errors: [`Invalid JSON syntax: ${(err as Error).message}`],
            warnings: [],
            tableIssues: [],
            referenceIssues: [],
          },
          parsedPayload: null,
        };
      }
    } else {
      parsed = rawInput;
    }

    if (!parsed || typeof parsed !== 'object') {
      return {
        report: {
          isValid: false,
          app: 'unknown',
          backupVersion: 'unknown',
          dbVersion: 0,
          exportedAt: '',
          totalRecords: 0,
          recordCounts: {},
          checksumValid: false,
          errors: ['Backup payload is empty or not a valid JSON object.'],
          warnings: [],
          tableIssues: [],
          referenceIssues: [],
        },
        parsedPayload: null,
      };
    }

    // 2. Manifest Structure & Versioning Check
    const manifest = parsed.manifest;
    if (!manifest || typeof manifest !== 'object') {
      errors.push('Missing backup manifest metadata header.');
    }

    const appName = String(manifest?.app || '').toLowerCase();
    if (appName !== APPLICATION_ID) {
      errors.push(`Incompatible application identifier: Expected '${APPLICATION_ID}', found '${manifest?.app || 'none'}'.`);
    }

    const backupVersion = String(manifest?.backupVersion || '');
    if (backupVersion !== BACKUP_FORMAT_VERSION) {
      errors.push(`Unsupported backup format version: Expected '${BACKUP_FORMAT_VERSION}', found '${backupVersion}'.`);
    }

    const dbVersion = Number(manifest?.dbVersion || 0);
    if (dbVersion > CURRENT_DB_VERSION) {
      warnings.push(`Backup database schema version (${dbVersion}) is newer than current application version (${CURRENT_DB_VERSION}). Some records may contain unrecognized attributes.`);
    }

    const data = parsed.data;
    if (!data || typeof data !== 'object') {
      errors.push('Backup payload is missing the core "data" tables container.');
      return {
        report: {
          isValid: false,
          app: manifest?.app || 'unknown',
          backupVersion: manifest?.backupVersion || 'unknown',
          dbVersion: manifest?.dbVersion || 0,
          exportedAt: manifest?.exportedAt || '',
          totalRecords: 0,
          recordCounts: {},
          checksumValid: false,
          errors,
          warnings,
          tableIssues: [],
          referenceIssues: [],
        },
        parsedPayload: null,
      };
    }

    // 3. Checksum Verification
    let checksumValid = false;
    if (manifest?.checksum) {
      checksumValid = await BackupIntegrityService.verifyChecksum(data, manifest.checksum);
      if (!checksumValid) {
        warnings.push('Checksum verification failed: The backup data content does not match the manifest SHA-256 signature. The file may have been manually modified or corrupted.');
      }
    } else {
      warnings.push('Manifest does not include a SHA-256 checksum signature.');
    }

    // 4. Table-by-Table Schema & Uniqueness Validation
    const recordCounts: Record<string, number> = {};
    let totalRecords = 0;

    const validateTable = <T extends { id?: string }>(
      tableName: string,
      records: unknown,
      schema: { safeParse: (val: unknown) => { success: boolean; error?: any } }
    ): T[] => {
      if (!records) {
        recordCounts[tableName] = 0;
        return [];
      }

      if (!Array.isArray(records)) {
        errors.push(`Table '${tableName}' must be an array of records.`);
        recordCounts[tableName] = 0;
        return [];
      }

      const validList: T[] = [];
      const seenIds = new Set<string>();
      let invalidCount = 0;
      let duplicateIdCount = 0;
      const sampleErrors: string[] = [];

      for (const rec of records) {
        const result = schema.safeParse(rec);
        if (result.success) {
          validList.push(rec as T);
          if (rec && typeof rec === 'object' && 'id' in rec && typeof rec.id === 'string') {
            if (seenIds.has(rec.id)) {
              duplicateIdCount++;
            } else {
              seenIds.add(rec.id);
            }
          }
        } else {
          invalidCount++;
          if (sampleErrors.length < 3) {
            sampleErrors.push(result.error?.message || 'Invalid record format');
          }
        }
      }

      if (invalidCount > 0) {
        tableIssues.push({ tableName, invalidCount, sampleErrors } as any);
        errors.push(`Table '${tableName}' contains ${invalidCount} malformed record(s).`);
      }

      if (duplicateIdCount > 0) {
        errors.push(`Table '${tableName}' contains ${duplicateIdCount} duplicate primary key ID(s).`);
      }

      recordCounts[tableName] = validList.length;
      totalRecords += validList.length;
      return validList;
    };

    const habits = validateTable('habits', data.habits, HabitSchema);
    const habitLogs = validateTable('habitLogs', data.habitLogs, HabitLogSchema);
    validateTable('auditRecords', data.auditRecords, AuditRecordSchema);
    const milestones = validateTable('milestones', data.milestones, MilestoneSchema);
    const achievements = validateTable('achievements', data.achievements, AchievementSchema);
    const journalEntries = validateTable('journalEntries', data.journalEntries, JournalEntrySchema);
    validateTable('urgeLogs', data.urgeLogs, UrgeLogRecordSchema);
    validateTable('morningIntentions', data.morningIntentions, MorningIntentionSchema);
    validateTable('eveningDebriefs', data.eveningDebriefs, EveningDebriefSchema);
    const focusSessions = validateTable('focusSessions', data.focusSessions, FocusSessionRecordSchema);
    validateTable('userSettings', data.userSettings, UserSettingsSchema.extend({ id: UserSettingsSchema.shape ? UserSettingsSchema : (UserSettingsSchema as any) }));

    // 5. Reference Integrity Checks (Self-contained references within backup)
    const habitIdSet = new Set(habits.map((h: any) => h.id));
    const milestoneIdSet = new Set(milestones.map((m: any) => m.id));

    // HabitLogs -> Habit
    for (const log of habitLogs as any[]) {
      if (log.habitId && !habitIdSet.has(log.habitId)) {
        referenceIssues.push({
          type: 'missing_habit_reference',
          message: `HabitLog ${log.id} references non-existent habitId: ${log.habitId}`,
          sourceTable: 'habitLogs',
          targetTable: 'habits',
          missingId: log.habitId,
        });
      }
    }

    // FocusSessions -> Habit (Optional link)
    for (const fs of focusSessions as any[]) {
      if (fs.linkedHabitId && !habitIdSet.has(fs.linkedHabitId)) {
        referenceIssues.push({
          type: 'missing_habit_reference',
          message: `FocusSession ${fs.id} references non-existent linkedHabitId: ${fs.linkedHabitId}`,
          sourceTable: 'focusSessions',
          targetTable: 'habits',
          missingId: fs.linkedHabitId,
        });
      }
    }

    // JournalEntries -> Habit (Optional link)
    for (const je of journalEntries as any[]) {
      if (je.linkedHabitId && !habitIdSet.has(je.linkedHabitId)) {
        referenceIssues.push({
          type: 'missing_habit_reference',
          message: `JournalEntry ${je.id} references non-existent linkedHabitId: ${je.linkedHabitId}`,
          sourceTable: 'journalEntries',
          targetTable: 'habits',
          missingId: je.linkedHabitId,
        });
      }
    }

    // Milestones -> Habit
    for (const m of milestones as any[]) {
      if (m.habitId && !habitIdSet.has(m.habitId)) {
        referenceIssues.push({
          type: 'missing_habit_reference',
          message: `Milestone ${m.id} references non-existent habitId: ${m.habitId}`,
          sourceTable: 'milestones',
          targetTable: 'habits',
          missingId: m.habitId,
        });
      }
    }

    // Achievements -> Habit & Milestone
    for (const a of achievements as any[]) {
      if (a.habitId && !habitIdSet.has(a.habitId)) {
        referenceIssues.push({
          type: 'missing_habit_reference',
          message: `Achievement ${a.id} references non-existent habitId: ${a.habitId}`,
          sourceTable: 'achievements',
          targetTable: 'habits',
          missingId: a.habitId,
        });
      }
      if (a.milestoneId && !milestoneIdSet.has(a.milestoneId)) {
        referenceIssues.push({
          type: 'missing_milestone_reference',
          message: `Achievement ${a.id} references non-existent milestoneId: ${a.milestoneId}`,
          sourceTable: 'achievements',
          targetTable: 'milestones',
          missingId: a.milestoneId,
        });
      }
    }

    if (referenceIssues.length > 0) {
      warnings.push(`Found ${referenceIssues.length} orphaned record reference(s) within the backup.`);
    }

    const isValid = errors.length === 0;

    const report: BackupValidationReport = {
      isValid,
      app: manifest?.app || 'unknown',
      backupVersion: manifest?.backupVersion || 'unknown',
      dbVersion: manifest?.dbVersion || 0,
      exportedAt: manifest?.exportedAt || '',
      totalRecords,
      recordCounts,
      checksumValid,
      errors,
      warnings,
      tableIssues,
      referenceIssues,
    };

    return {
      report,
      parsedPayload: isValid ? (parsed as SemnotesBackupPayload) : null,
    };
  }
}
