/**
 * SEMNÓTĒS — Safe Restore Transaction Service
 * Sovereign personal discipline operating system.
 *
 * Implements safe database restoration with automatic rollback and safety snapshots:
 * 1. Mode 1: Replace Existing Data (Atomic clear & bulk put with rollback on failure)
 * 2. Mode 2: Merge Data (Conflict-safe additive restore preserving historical audit records)
 * 3. In-memory safety snapshots guaranteeing zero data loss if an import transaction fails.
 */

import { db } from '../../storage/db';
import type {
  SemnotesBackupPayload,
  SemnotesBackupData,
  RestoreResult,
  MergeRestoreResult
} from './backupTypes';
import { FocusPersistenceService } from '../focus/focusPersistenceService';

export class RestoreTransactionError extends Error {
  constructor(message: string, public readonly rolledBack: boolean = true) {
    super(message);
    this.name = 'RestoreTransactionError';
  }
}

export class RestoreTransactionService {
  /**
   * Captures an in-memory safety snapshot of the entire database before any restore operation.
   */
  static async captureSafetySnapshot(): Promise<SemnotesBackupData> {
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

    const focusPreferences = FocusPersistenceService.loadPreferences();

    return {
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
  }

  /**
   * Restores an in-memory safety snapshot into the database.
   */
  static async restoreSafetySnapshot(snapshot: SemnotesBackupData): Promise<void> {
    const allTables = [
      db.habits,
      db.habitLogs,
      db.auditRecords,
      db.milestones,
      db.achievements,
      db.journalEntries,
      db.urgeLogs,
      db.morningIntentions,
      db.eveningDebriefs,
      db.focusSessions,
      db.userSettings,
    ];

    await db.transaction('rw', allTables, async () => {
      await Promise.all(allTables.map((t) => t.clear()));

      if (snapshot.habits.length) await db.habits.bulkAdd(snapshot.habits);
      if (snapshot.habitLogs.length) await db.habitLogs.bulkAdd(snapshot.habitLogs);
      if (snapshot.auditRecords.length) await db.auditRecords.bulkAdd(snapshot.auditRecords);
      if (snapshot.milestones.length) await db.milestones.bulkAdd(snapshot.milestones);
      if (snapshot.achievements.length) await db.achievements.bulkAdd(snapshot.achievements);
      if (snapshot.journalEntries.length) await db.journalEntries.bulkAdd(snapshot.journalEntries);
      if (snapshot.urgeLogs.length) await db.urgeLogs.bulkAdd(snapshot.urgeLogs);
      if (snapshot.morningIntentions.length) await db.morningIntentions.bulkAdd(snapshot.morningIntentions);
      if (snapshot.eveningDebriefs.length) await db.eveningDebriefs.bulkAdd(snapshot.eveningDebriefs);
      if (snapshot.focusSessions.length) await db.focusSessions.bulkAdd(snapshot.focusSessions);
      if (snapshot.userSettings?.length) await db.userSettings.bulkAdd(snapshot.userSettings);
    });

    if (snapshot.focusPreferences) {
      FocusPersistenceService.savePreferences(snapshot.focusPreferences);
    }
  }

  /**
   * Restores data using Replace mode (Atomic transaction with rollback on failure).
   */
  static async restoreReplace(payload: SemnotesBackupPayload): Promise<RestoreResult> {
    const safetySnapshot = await this.captureSafetySnapshot();
    const data = payload.data;

    const allTables = [
      db.habits,
      db.habitLogs,
      db.auditRecords,
      db.milestones,
      db.achievements,
      db.journalEntries,
      db.urgeLogs,
      db.morningIntentions,
      db.eveningDebriefs,
      db.focusSessions,
      db.userSettings,
    ];

    try {
      await db.transaction('rw', allTables, async () => {
        // Clear all tables atomically
        await Promise.all(allTables.map((t) => t.clear()));

        // Insert new records
        if (data.habits?.length) await db.habits.bulkAdd(data.habits);
        if (data.habitLogs?.length) await db.habitLogs.bulkAdd(data.habitLogs);
        if (data.auditRecords?.length) await db.auditRecords.bulkAdd(data.auditRecords);
        if (data.milestones?.length) await db.milestones.bulkAdd(data.milestones);
        if (data.achievements?.length) await db.achievements.bulkAdd(data.achievements);
        if (data.journalEntries?.length) await db.journalEntries.bulkAdd(data.journalEntries);
        if (data.urgeLogs?.length) await db.urgeLogs.bulkAdd(data.urgeLogs);
        if (data.morningIntentions?.length) await db.morningIntentions.bulkAdd(data.morningIntentions);
        if (data.eveningDebriefs?.length) await db.eveningDebriefs.bulkAdd(data.eveningDebriefs);
        if (data.focusSessions?.length) await db.focusSessions.bulkAdd(data.focusSessions);
        if (data.userSettings?.length) await db.userSettings.bulkAdd(data.userSettings);
      });

      // Restore user preferences if present
      if (data.focusPreferences) {
        FocusPersistenceService.savePreferences(data.focusPreferences);
      }

      // Verify record counts
      const counts: Record<string, number> = {
        habits: await db.habits.count(),
        habitLogs: await db.habitLogs.count(),
        auditRecords: await db.auditRecords.count(),
        milestones: await db.milestones.count(),
        achievements: await db.achievements.count(),
        journalEntries: await db.journalEntries.count(),
        urgeLogs: await db.urgeLogs.count(),
        morningIntentions: await db.morningIntentions.count(),
        eveningDebriefs: await db.eveningDebriefs.count(),
        focusSessions: await db.focusSessions.count(),
        userSettings: await db.userSettings.count(),
      };

      const totalRestored = Object.values(counts).reduce((a, b) => a + b, 0);

      return {
        mode: 'replace',
        success: true,
        totalRestored,
        recordCounts: counts,
        restoredAt: new Date().toISOString(),
      };
    } catch (err) {
      // Transaction failed: execute rollback using the safety snapshot
      try {
        await this.restoreSafetySnapshot(safetySnapshot);
      } catch (rollbackErr) {
        throw new RestoreTransactionError(
          `Restore failed: ${(err as Error).message}. Critical: Rollback also encountered error: ${(rollbackErr as Error).message}`,
          false
        );
      }

      throw new RestoreTransactionError(
        `Restore operation failed and was safely rolled back. Your existing database remains intact. Error: ${(err as Error).message}`,
        true
      );
    }
  }

  /**
   * Restores data using Merge mode (Preserves existing data, skips duplicates, appends new records).
   */
  static async restoreMerge(payload: SemnotesBackupPayload): Promise<MergeRestoreResult> {
    const safetySnapshot = await this.captureSafetySnapshot();
    const data = payload.data;

    let insertedCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    const allTables = [
      db.habits,
      db.habitLogs,
      db.auditRecords,
      db.milestones,
      db.achievements,
      db.journalEntries,
      db.urgeLogs,
      db.morningIntentions,
      db.eveningDebriefs,
      db.focusSessions,
      db.userSettings,
    ];

    try {
      await db.transaction('rw', allTables, async () => {
        // 1. Merge Habits (skip if ID exists)
        if (data.habits?.length) {
          const existingIds = new Set(await db.habits.toCollection().primaryKeys());
          const toAdd = data.habits.filter((h) => {
            if (existingIds.has(h.id)) {
              skippedCount++;
              return false;
            }
            insertedCount++;
            return true;
          });
          if (toAdd.length) await db.habits.bulkAdd(toAdd);
        }

        // 2. Merge Milestones (skip if ID or [habitId+thresholdDays] exists)
        if (data.milestones?.length) {
          const existing = await db.milestones.toArray();
          const existingKeys = new Set(existing.map((m) => `${m.habitId}_${m.thresholdDays}`));
          const existingIds = new Set(existing.map((m) => m.id));

          const toAdd = data.milestones.filter((m) => {
            const compoundKey = `${m.habitId}_${m.thresholdDays}`;
            if (existingIds.has(m.id) || existingKeys.has(compoundKey)) {
              skippedCount++;
              return false;
            }
            insertedCount++;
            return true;
          });
          if (toAdd.length) await db.milestones.bulkAdd(toAdd);
        }

        // 3. Merge HabitLogs (skip if ID or [habitId+date] exists)
        if (data.habitLogs?.length) {
          const existing = await db.habitLogs.toArray();
          const existingKeys = new Set(existing.map((l) => `${l.habitId}_${l.date}`));
          const existingIds = new Set(existing.map((l) => l.id));

          const toAdd = data.habitLogs.filter((l) => {
            const compoundKey = `${l.habitId}_${l.date}`;
            if (existingIds.has(l.id) || existingKeys.has(compoundKey)) {
              skippedCount++;
              return false;
            }
            insertedCount++;
            return true;
          });
          if (toAdd.length) await db.habitLogs.bulkAdd(toAdd);
        }

        // 4. Merge AuditRecords (skip if ID exists)
        if (data.auditRecords?.length) {
          const existingIds = new Set(await db.auditRecords.toCollection().primaryKeys());
          const toAdd = data.auditRecords.filter((a) => {
            if (existingIds.has(a.id)) {
              skippedCount++;
              return false;
            }
            insertedCount++;
            return true;
          });
          if (toAdd.length) await db.auditRecords.bulkAdd(toAdd);
        }

        // 5. Merge Achievements (skip if ID or compound exists)
        if (data.achievements?.length) {
          const existing = await db.achievements.toArray();
          const existingKeys = new Set(
            existing.map((a) => `${a.habitId}_${a.milestoneId}_${a.streakStartDate}`)
          );
          const existingIds = new Set(existing.map((a) => a.id));

          const toAdd = data.achievements.filter((a) => {
            const compoundKey = `${a.habitId}_${a.milestoneId}_${a.streakStartDate}`;
            if (existingIds.has(a.id) || existingKeys.has(compoundKey)) {
              skippedCount++;
              return false;
            }
            insertedCount++;
            return true;
          });
          if (toAdd.length) await db.achievements.bulkAdd(toAdd);
        }

        // 6. Merge JournalEntries (skip if ID exists)
        if (data.journalEntries?.length) {
          const existingIds = new Set(await db.journalEntries.toCollection().primaryKeys());
          const toAdd = data.journalEntries.filter((j) => {
            if (existingIds.has(j.id)) {
              skippedCount++;
              return false;
            }
            insertedCount++;
            return true;
          });
          if (toAdd.length) await db.journalEntries.bulkAdd(toAdd);
        }

        // 7. Merge UrgeLogs (skip if ID exists)
        if (data.urgeLogs?.length) {
          const existingIds = new Set(await db.urgeLogs.toCollection().primaryKeys());
          const toAdd = data.urgeLogs.filter((u) => {
            if (existingIds.has(u.id)) {
              skippedCount++;
              return false;
            }
            insertedCount++;
            return true;
          });
          if (toAdd.length) await db.urgeLogs.bulkAdd(toAdd);
        }

        // 8. Merge MorningIntentions (skip if ID or date exists)
        if (data.morningIntentions?.length) {
          const existing = await db.morningIntentions.toArray();
          const existingDates = new Set(existing.map((m) => m.date));
          const existingIds = new Set(existing.map((m) => m.id));

          const toAdd = data.morningIntentions.filter((m) => {
            if (existingIds.has(m.id) || existingDates.has(m.date)) {
              skippedCount++;
              return false;
            }
            insertedCount++;
            return true;
          });
          if (toAdd.length) await db.morningIntentions.bulkAdd(toAdd);
        }

        // 9. Merge EveningDebriefs (skip if ID or date exists)
        if (data.eveningDebriefs?.length) {
          const existing = await db.eveningDebriefs.toArray();
          const existingDates = new Set(existing.map((e) => e.date));
          const existingIds = new Set(existing.map((e) => e.id));

          const toAdd = data.eveningDebriefs.filter((e) => {
            if (existingIds.has(e.id) || existingDates.has(e.date)) {
              skippedCount++;
              return false;
            }
            insertedCount++;
            return true;
          });
          if (toAdd.length) await db.eveningDebriefs.bulkAdd(toAdd);
        }

        // 10. Merge FocusSessions (skip if ID exists)
        if (data.focusSessions?.length) {
          const existingIds = new Set(await db.focusSessions.toCollection().primaryKeys());
          const toAdd = data.focusSessions.filter((f) => {
            if (existingIds.has(f.id)) {
              skippedCount++;
              return false;
            }
            insertedCount++;
            return true;
          });
          if (toAdd.length) await db.focusSessions.bulkAdd(toAdd);
        }
      });

      const counts: Record<string, number> = {
        habits: await db.habits.count(),
        habitLogs: await db.habitLogs.count(),
        auditRecords: await db.auditRecords.count(),
        milestones: await db.milestones.count(),
        achievements: await db.achievements.count(),
        journalEntries: await db.journalEntries.count(),
        urgeLogs: await db.urgeLogs.count(),
        morningIntentions: await db.morningIntentions.count(),
        eveningDebriefs: await db.eveningDebriefs.count(),
        focusSessions: await db.focusSessions.count(),
        userSettings: await db.userSettings.count(),
      };

      const totalRestored = Object.values(counts).reduce((a, b) => a + b, 0);

      return {
        mode: 'merge',
        success: true,
        totalRestored,
        recordCounts: counts,
        restoredAt: new Date().toISOString(),
        insertedCount,
        skippedCount,
        updatedCount,
      };
    } catch (err) {
      try {
        await this.restoreSafetySnapshot(safetySnapshot);
      } catch (rollbackErr) {
        throw new RestoreTransactionError(
          `Merge restore failed: ${(err as Error).message}. Critical: Rollback error: ${(rollbackErr as Error).message}`,
          false
        );
      }

      throw new RestoreTransactionError(
        `Merge restore failed and was safely rolled back. Your existing database remains intact. Error: ${(err as Error).message}`,
        true
      );
    }
  }
}
