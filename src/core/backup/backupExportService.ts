/**
 * SEMNÓTĒS — Backup Export Service
 * Sovereign personal discipline operating system.
 *
 * Extracts all persistent tables from Dexie IndexedDB v5 and user preferences,
 * calculates SHA-256 integrity checksums, validates the resulting schema,
 * and handles secure portable file downloads.
 */

import { db } from '../../storage/db';
import type { SemnotesBackupPayload, SemnotesBackupData } from './backupTypes';
import { BACKUP_FORMAT_VERSION, APPLICATION_ID, CURRENT_DB_VERSION } from './backupTypes';
import { SemnotesBackupPayloadSchema } from './backupSchemas';
import { BackupIntegrityService } from './backupIntegrityService';
import { FocusPersistenceService } from '../focus/focusPersistenceService';

export class BackupExportService {
  /**
   * Extracts all tables and preferences and generates a validated SemnotesBackupPayload.
   */
  static async generateBackup(): Promise<SemnotesBackupPayload> {
    // 1. Extract records from all 11 Dexie tables
    const [
      habits,
      habitLogs,
      auditRecords,
      milestones,
      achievements,
      journalEntries,
      urgeLogs,
      morningIntentions,
      eveningDebriefs,
      focusSessions,
      userSettings
    ] = await Promise.all([
      db.habits.toArray(),
      db.habitLogs.toArray(),
      db.auditRecords.toArray(),
      db.milestones.toArray(),
      db.achievements.toArray(),
      db.journalEntries.toArray(),
      db.urgeLogs.toArray(),
      db.morningIntentions.toArray(),
      db.eveningDebriefs.toArray(),
      db.focusSessions.toArray(),
      db.userSettings.toArray(),
    ]);

    // 2. Extract focus preferences
    const focusPreferences = FocusPersistenceService.loadPreferences();

    const data: SemnotesBackupData = {
      habits,
      habitLogs,
      auditRecords,
      milestones,
      achievements,
      journalEntries,
      urgeLogs,
      morningIntentions,
      eveningDebriefs,
      focusSessions,
      userSettings,
      focusPreferences,
    };

    // 3. Compute record counts
    const recordCounts: Record<string, number> = {
      habits: habits.length,
      habitLogs: habitLogs.length,
      auditRecords: auditRecords.length,
      milestones: milestones.length,
      achievements: achievements.length,
      journalEntries: journalEntries.length,
      urgeLogs: urgeLogs.length,
      morningIntentions: morningIntentions.length,
      eveningDebriefs: eveningDebriefs.length,
      focusSessions: focusSessions.length,
      userSettings: userSettings.length,
    };

    // 4. Compute SHA-256 data checksum
    const checksum = await BackupIntegrityService.computeChecksum(data);
    const nowIso = new Date().toISOString();

    const rawPayload: SemnotesBackupPayload = {
      manifest: {
        app: APPLICATION_ID,
        backupVersion: BACKUP_FORMAT_VERSION,
        appVersion: '1.0.0',
        exportedAt: nowIso,
        dbVersion: CURRENT_DB_VERSION,
        recordCounts,
        checksum,
      },
      data,
    };

    // 5. Strict schema validation of the full payload
    return SemnotesBackupPayloadSchema.parse(rawPayload);
  }

  /**
   * Downloads the backup payload as an indented JSON file.
   */
  static downloadBackupFile(payload: SemnotesBackupPayload, customFilename?: string): void {
    if (typeof window === 'undefined' || !window.document) {
      return;
    }

    const dateSlug = payload.manifest.exportedAt.replace(/[:.]/g, '-').substring(0, 19);
    const filename = customFilename || `semnotes-backup-${dateSlug}.json`;

    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }
}
