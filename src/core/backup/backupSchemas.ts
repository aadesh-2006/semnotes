/**
 * SEMNÓTĒS — Backup & Data Management Zod Schemas
 * Sovereign personal discipline operating system.
 */

import { z } from 'zod';
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
import { FocusPreferencesSchema } from '../focus/focusSchemas';
import { BACKUP_FORMAT_VERSION, APPLICATION_ID } from './backupTypes';

export const SemnotesBackupManifestSchema = z.object({
  app: z.string().refine((val) => val.toLowerCase() === APPLICATION_ID, {
    message: `Application ID must be '${APPLICATION_ID}'`,
  }),
  backupVersion: z.literal(BACKUP_FORMAT_VERSION),
  appVersion: z.string().min(1),
  exportedAt: z.string().datetime(),
  dbVersion: z.number().int().positive(),
  recordCounts: z.record(z.string(), z.number().int().nonnegative()),
  checksum: z.string().min(32, 'Checksum must be a valid SHA-256 hash string'),
});

export const SemnotesBackupDataSchema = z.object({
  habits: z.array(HabitSchema).default([]),
  habitLogs: z.array(HabitLogSchema).default([]),
  auditRecords: z.array(AuditRecordSchema).default([]),
  milestones: z.array(MilestoneSchema).default([]),
  achievements: z.array(AchievementSchema).default([]),
  journalEntries: z.array(JournalEntrySchema).default([]),
  urgeLogs: z.array(UrgeLogRecordSchema).default([]),
  morningIntentions: z.array(MorningIntentionSchema).default([]),
  eveningDebriefs: z.array(EveningDebriefSchema).default([]),
  focusSessions: z.array(FocusSessionRecordSchema).default([]),
  userSettings: z.array(UserSettingsSchema.extend({ id: z.string() })).optional().default([]),
  focusPreferences: FocusPreferencesSchema.optional(),
});

export const SemnotesBackupPayloadSchema = z.object({
  manifest: SemnotesBackupManifestSchema,
  data: SemnotesBackupDataSchema,
});
