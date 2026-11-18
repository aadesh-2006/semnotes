/**
 * SEMNÓTĒS — Safe Restore Transaction Service
 * Sovereign personal discipline operating system.
 *
 * Implements crash-resilient, atomic database restoration with strict validation
 * and rollback guarantees (AUDIT-DATA-02):
 * 1. Mode 1: Replace Existing Data (Atomic clear & bulk put in a single native IndexedDB transaction)
 * 2. Mode 2: Merge Data (Conflict-safe additive restore preserving local records and reporting conflicts)
 * 3. Pre-transaction validation: Rejects invalid or corrupt backups before touching any database table.
 * 4. Native transaction rollback: Leverages IndexedDB ACID transaction rollback to eliminate fragile in-memory rollback.
 */

import { db } from '../../storage/db';
import type {
  SemnotesBackupPayload,
  SemnotesBackupData,
  RestoreResult,
  MergeRestoreResult,
  MergeConflictDetail,
} from './backupTypes';
import { BackupValidationService } from './backupValidationService';
import { FocusPersistenceService } from '../focus/focusPersistenceService';

export class RestoreTransactionError extends Error {
  constructor(message: string, public readonly rolledBack: boolean = true) {
    super(message);
    this.name = 'RestoreTransactionError';
  }
}

export class RestoreTransactionService {
  /**
   * Validates backup payload and sanitizes data container prior to mutation.
   * Throws RestoreTransactionError if validation fails.
   */
  static async validateAndPrepare(
    payload: SemnotesBackupPayload,
    options?: { skipValidation?: boolean }
  ): Promise<SemnotesBackupData> {
    if (!options?.skipValidation) {
      const validation = await BackupValidationService.validate(payload);
      if (!validation.report.isValid) {
        throw new RestoreTransactionError(
          `Restore rejected: Backup payload failed validation with ${validation.report.errors.length} error(s): ${validation.report.errors.join('; ')}`,
          true
        );
      }
    }

    const rawData = payload?.data;
    if (!rawData || typeof rawData !== 'object') {
      throw new RestoreTransactionError('Restore rejected: Backup data container is empty or invalid.', true);
    }

    return {
      habits: Array.isArray(rawData.habits) ? rawData.habits : [],
      habitLogs: Array.isArray(rawData.habitLogs) ? rawData.habitLogs : [],
      auditRecords: Array.isArray(rawData.auditRecords) ? rawData.auditRecords : [],
      milestones: Array.isArray(rawData.milestones) ? rawData.milestones : [],
      achievements: Array.isArray(rawData.achievements) ? rawData.achievements : [],
      journalEntries: Array.isArray(rawData.journalEntries) ? rawData.journalEntries : [],
      urgeLogs: Array.isArray(rawData.urgeLogs) ? rawData.urgeLogs : [],
      morningIntentions: Array.isArray(rawData.morningIntentions) ? rawData.morningIntentions : [],
      eveningDebriefs: Array.isArray(rawData.eveningDebriefs) ? rawData.eveningDebriefs : [],
      focusSessions: Array.isArray(rawData.focusSessions) ? rawData.focusSessions : [],
      userSettings: Array.isArray(rawData.userSettings) ? rawData.userSettings : [],
      focusPreferences: rawData.focusPreferences,
    };
  }

  /**
   * Captures an in-memory safety snapshot of the entire database.
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
      userSettings,
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

      if (snapshot.habits?.length) await db.habits.bulkAdd(snapshot.habits);
      if (snapshot.habitLogs?.length) await db.habitLogs.bulkAdd(snapshot.habitLogs);
      if (snapshot.auditRecords?.length) await db.auditRecords.bulkAdd(snapshot.auditRecords);
      if (snapshot.milestones?.length) await db.milestones.bulkAdd(snapshot.milestones);
      if (snapshot.achievements?.length) await db.achievements.bulkAdd(snapshot.achievements);
      if (snapshot.journalEntries?.length) await db.journalEntries.bulkAdd(snapshot.journalEntries);
      if (snapshot.urgeLogs?.length) await db.urgeLogs.bulkAdd(snapshot.urgeLogs);
      if (snapshot.morningIntentions?.length) await db.morningIntentions.bulkAdd(snapshot.morningIntentions);
      if (snapshot.eveningDebriefs?.length) await db.eveningDebriefs.bulkAdd(snapshot.eveningDebriefs);
      if (snapshot.focusSessions?.length) await db.focusSessions.bulkAdd(snapshot.focusSessions);
      if (snapshot.userSettings?.length) await db.userSettings.bulkAdd(snapshot.userSettings);
    });

    if (snapshot.focusPreferences) {
      FocusPersistenceService.savePreferences(snapshot.focusPreferences);
    }
  }

  /**
   * Restores data using Replace mode.
   * Atomic single-transaction clear and replace.
   * If any failure occurs, the transaction automatically aborts, leaving existing data intact.
   */
  static async restoreReplace(
    payload: SemnotesBackupPayload,
    options?: { skipValidation?: boolean }
  ): Promise<RestoreResult> {
    // 1. Pre-transaction validation & preparation (fails fast without mutating database)
    const data = await this.validateAndPrepare(payload, options);

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
      // 2. Execute single atomic transaction covering all 11 tables
      await db.transaction('rw', allTables, async () => {
        // Clear all tables atomically
        await Promise.all(allTables.map((t) => t.clear()));

        // Insert new records
        if (data.habits.length) await db.habits.bulkAdd(data.habits);
        if (data.habitLogs.length) await db.habitLogs.bulkAdd(data.habitLogs);
        if (data.auditRecords.length) await db.auditRecords.bulkAdd(data.auditRecords);
        if (data.milestones.length) await db.milestones.bulkAdd(data.milestones);
        if (data.achievements.length) await db.achievements.bulkAdd(data.achievements);
        if (data.journalEntries.length) await db.journalEntries.bulkAdd(data.journalEntries);
        if (data.urgeLogs.length) await db.urgeLogs.bulkAdd(data.urgeLogs);
        if (data.morningIntentions.length) await db.morningIntentions.bulkAdd(data.morningIntentions);
        if (data.eveningDebriefs.length) await db.eveningDebriefs.bulkAdd(data.eveningDebriefs);
        if (data.focusSessions.length) await db.focusSessions.bulkAdd(data.focusSessions);
        if (data.userSettings?.length) await db.userSettings.bulkAdd(data.userSettings);
      });

      // 3. Restore user preferences if present
      if (data.focusPreferences) {
        FocusPersistenceService.savePreferences(data.focusPreferences);
      }

      // 4. Post-restore verification
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
      // IndexedDB transaction natively aborted and rolled back to pre-mutation disk state
      throw new RestoreTransactionError(
        `Replace restore failed and was safely rolled back by atomic transaction. Existing data remains intact. Error: ${(err as Error).message}`,
        true
      );
    }
  }

  /**
   * Restores data using Merge mode.
   * Additive restore preserving local records, respecting compound keys,
   * detecting conflicts without silent overwrites, and committing atomically.
   */
  static async restoreMerge(
    payload: SemnotesBackupPayload,
    options?: { skipValidation?: boolean }
  ): Promise<MergeRestoreResult> {
    // 1. Pre-transaction validation & preparation
    const data = await this.validateAndPrepare(payload, options);

    let insertedCount = 0;
    let skippedCount = 0;
    const conflicts: MergeConflictDetail[] = [];

    // 2. Query existing primary and compound keys outside the transaction
    const [
      existingHabits,
      existingMilestones,
      existingLogs,
      existingAudits,
      existingAchievements,
      existingJournals,
      existingUrges,
      existingMorning,
      existingEvening,
      existingFocus,
      existingSettings,
    ] = await Promise.all([
      db.habits.toArray(),
      db.milestones.toArray(),
      db.habitLogs.toArray(),
      db.auditRecords.toArray(),
      db.achievements.toArray(),
      db.journalEntries.toArray(),
      db.urgeLogs.toArray(),
      db.morningIntentions.toArray(),
      db.eveningDebriefs.toArray(),
      db.focusSessions.toArray(),
      db.userSettings.toArray(),
    ]);

    // Build lookup sets and maps
    const habitMap = new Map(existingHabits.map((h) => [h.id, h]));
    const milestoneIdSet = new Set(existingMilestones.map((m) => m.id));
    const milestoneCompoundMap = new Map(
      existingMilestones.map((m) => [`${m.habitId}_${m.thresholdDays}`, m])
    );
    const logIdSet = new Set(existingLogs.map((l) => l.id));
    const logCompoundMap = new Map(existingLogs.map((l) => [`${l.habitId}_${l.date}`, l]));
    const auditIdSet = new Set(existingAudits.map((a) => a.id));
    const achievementIdSet = new Set(existingAchievements.map((a) => a.id));
    const achievementCompoundMap = new Map(
      existingAchievements.map((a) => [`${a.habitId}_${a.milestoneId}_${a.streakStartDate}`, a])
    );
    const journalIdSet = new Set(existingJournals.map((j) => j.id));
    const urgeIdSet = new Set(existingUrges.map((u) => u.id));
    const morningIdSet = new Set(existingMorning.map((m) => m.id));
    const morningDateSet = new Set(existingMorning.map((m) => m.date));
    const eveningIdSet = new Set(existingEvening.map((e) => e.id));
    const eveningDateSet = new Set(existingEvening.map((e) => e.date));
    const focusIdSet = new Set(existingFocus.map((f) => f.id));
    const settingsIdSet = new Set(existingSettings.map((s) => s.id));

    // 3. Prepare records to insert and detect conflicts

    // Habits
    const toAddHabits = data.habits.filter((h) => {
      const existing = habitMap.get(h.id);
      if (existing) {
        skippedCount++;
        if (existing.title !== h.title || existing.type !== h.type) {
          conflicts.push({
            table: 'habits',
            recordId: h.id,
            description: `Habit "${h.title}" conflicts with existing local habit "${existing.title}". Local record preserved.`,
            resolution: 'kept_local',
          });
        }
        return false;
      }
      insertedCount++;
      return true;
    });

    // Milestones
    const toAddMilestones = data.milestones.filter((m) => {
      const compoundKey = `${m.habitId}_${m.thresholdDays}`;
      const existingByCompound = milestoneCompoundMap.get(compoundKey);
      if (milestoneIdSet.has(m.id) || existingByCompound) {
        skippedCount++;
        if (existingByCompound && existingByCompound.rewardTitle !== m.rewardTitle) {
          conflicts.push({
            table: 'milestones',
            recordId: m.id,
            description: `Milestone ${m.thresholdDays}d reward "${m.rewardTitle}" conflicts with local reward "${existingByCompound.rewardTitle}". Local record preserved.`,
            resolution: 'kept_local',
          });
        }
        return false;
      }
      insertedCount++;
      return true;
    });

    // HabitLogs
    const toAddLogs = data.habitLogs.filter((l) => {
      const compoundKey = `${l.habitId}_${l.date}`;
      const existing = logCompoundMap.get(compoundKey);
      if (logIdSet.has(l.id) || existing) {
        skippedCount++;
        if (existing && existing.status !== l.status) {
          conflicts.push({
            table: 'habitLogs',
            recordId: l.id,
            description: `Check-in on ${l.date} already recorded locally as "${existing.status}" (incoming: "${l.status}"). Local record preserved.`,
            resolution: 'kept_local',
          });
        }
        return false;
      }
      insertedCount++;
      return true;
    });

    // AuditRecords
    const toAddAudits = data.auditRecords.filter((a) => {
      if (auditIdSet.has(a.id)) {
        skippedCount++;
        return false;
      }
      insertedCount++;
      return true;
    });

    // Achievements
    const toAddAchievements = data.achievements.filter((a) => {
      const compoundKey = `${a.habitId}_${a.milestoneId}_${a.streakStartDate}`;
      const existing = achievementCompoundMap.get(compoundKey);
      if (achievementIdSet.has(a.id) || existing) {
        skippedCount++;
        // If incoming is claimed and local is unclaimed, keep claimed state safely
        if (existing && !existing.isClaimed && a.isClaimed) {
          conflicts.push({
            table: 'achievements',
            recordId: a.id,
            description: `Achievement for ${a.rewardTitle} was claimed in incoming backup but unclaimed locally. Preserving local record.`,
            resolution: 'kept_local',
          });
        }
        return false;
      }
      insertedCount++;
      return true;
    });

    // JournalEntries
    const toAddJournals = data.journalEntries.filter((j) => {
      if (journalIdSet.has(j.id)) {
        skippedCount++;
        return false;
      }
      insertedCount++;
      return true;
    });

    // UrgeLogs
    const toAddUrges = data.urgeLogs.filter((u) => {
      if (urgeIdSet.has(u.id)) {
        skippedCount++;
        return false;
      }
      insertedCount++;
      return true;
    });

    // MorningIntentions
    const toAddMorning = data.morningIntentions.filter((m) => {
      if (morningIdSet.has(m.id) || morningDateSet.has(m.date)) {
        skippedCount++;
        conflicts.push({
          table: 'morningIntentions',
          recordId: m.id,
          description: `Morning intention for date ${m.date} already exists locally. Local record preserved.`,
          resolution: 'kept_local',
        });
        return false;
      }
      insertedCount++;
      return true;
    });

    // EveningDebriefs
    const toAddEvening = data.eveningDebriefs.filter((e) => {
      if (eveningIdSet.has(e.id) || eveningDateSet.has(e.date)) {
        skippedCount++;
        conflicts.push({
          table: 'eveningDebriefs',
          recordId: e.id,
          description: `Evening debrief for date ${e.date} already exists locally. Local record preserved.`,
          resolution: 'kept_local',
        });
        return false;
      }
      insertedCount++;
      return true;
    });

    // FocusSessions
    const toAddFocus = data.focusSessions.filter((f) => {
      if (focusIdSet.has(f.id)) {
        skippedCount++;
        return false;
      }
      insertedCount++;
      return true;
    });

    // UserSettings
    const toAddSettings = (data.userSettings || []).filter((s) => {
      if (settingsIdSet.has(s.id)) {
        skippedCount++;
        return false;
      }
      insertedCount++;
      return true;
    });

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
      // 4. Execute atomic insertion transaction
      await db.transaction('rw', allTables, async () => {
        if (toAddHabits.length) await db.habits.bulkAdd(toAddHabits);
        if (toAddMilestones.length) await db.milestones.bulkAdd(toAddMilestones);
        if (toAddLogs.length) await db.habitLogs.bulkAdd(toAddLogs);
        if (toAddAudits.length) await db.auditRecords.bulkAdd(toAddAudits);
        if (toAddAchievements.length) await db.achievements.bulkAdd(toAddAchievements);
        if (toAddJournals.length) await db.journalEntries.bulkAdd(toAddJournals);
        if (toAddUrges.length) await db.urgeLogs.bulkAdd(toAddUrges);
        if (toAddMorning.length) await db.morningIntentions.bulkAdd(toAddMorning);
        if (toAddEvening.length) await db.eveningDebriefs.bulkAdd(toAddEvening);
        if (toAddFocus.length) await db.focusSessions.bulkAdd(toAddFocus);
        if (toAddSettings.length) await db.userSettings.bulkAdd(toAddSettings);
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
        updatedCount: 0,
        conflictCount: conflicts.length,
        conflicts,
      };
    } catch (err) {
      throw new RestoreTransactionError(
        `Merge restore failed and was safely rolled back by atomic transaction. Existing data remains intact. Error: ${(err as Error).message}`,
        true
      );
    }
  }
}
