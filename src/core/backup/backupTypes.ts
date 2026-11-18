/**
 * SEMNÓTĒS — Backup & Data Management Domain Types
 * Sovereign personal discipline operating system.
 */

import type {
  Habit,
  HabitLog,
  AuditRecord,
  Milestone,
  Achievement,
  JournalEntry,
  UrgeLogRecord,
  MorningIntention,
  EveningDebrief,
  FocusSessionRecord,
  UserSettings
} from '../domain/types';
import type { FocusPreferences } from '../focus/focusTypes';

export const BACKUP_FORMAT_VERSION = '1.0';
export const APPLICATION_ID = 'semnotes';
export const CURRENT_DB_VERSION = 5;

export interface SemnotesBackupManifest {
  app: string;                      // 'semnotes'
  backupVersion: string;            // '1.0'
  appVersion: string;               // '1.0.0'
  exportedAt: string;               // ISO8601 string
  dbVersion: number;                // 5
  recordCounts: Record<string, number>;
  checksum: string;                 // SHA-256 hex string of the JSON data payload
}

export interface SemnotesBackupData {
  habits: Habit[];
  habitLogs: HabitLog[];
  auditRecords: AuditRecord[];
  milestones: Milestone[];
  achievements: Achievement[];
  journalEntries: JournalEntry[];
  urgeLogs: UrgeLogRecord[];
  morningIntentions: MorningIntention[];
  eveningDebriefs: EveningDebrief[];
  focusSessions: FocusSessionRecord[];
  userSettings?: (UserSettings & { id: string })[];
  focusPreferences?: FocusPreferences;
}

export interface SemnotesBackupPayload {
  manifest: SemnotesBackupManifest;
  data: SemnotesBackupData;
}

export interface TableIssueDetail {
  table: string;
  invalidCount: number;
  sampleErrors: string[];
}

export interface ReferenceIssueDetail {
  type: string;
  message: string;
  sourceTable: string;
  targetTable: string;
  missingId: string;
}

export interface BackupValidationReport {
  isValid: boolean;
  app: string;
  backupVersion: string;
  dbVersion: number;
  exportedAt: string;
  totalRecords: number;
  recordCounts: Record<string, number>;
  checksumValid: boolean;
  errors: string[];
  warnings: string[];
  tableIssues: TableIssueDetail[];
  referenceIssues: ReferenceIssueDetail[];
}

export type RestoreMode = 'replace' | 'merge';

export interface RestoreResult {
  mode: RestoreMode;
  success: boolean;
  totalRestored: number;
  recordCounts: Record<string, number>;
  restoredAt: string;
  safetyBackupId?: string;
}

export interface MergeRestoreResult extends RestoreResult {
  insertedCount: number;
  skippedCount: number;
  updatedCount: number;
}
