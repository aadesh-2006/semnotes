import { db } from '../../storage/db';
import {
  type Habit,
  type HabitLog,
  type HabitLogStatus,
  HabitLogSchema
} from '../domain/types';
import { generateUUID } from '../utils';
import { AchievementEngine } from '../milestones/achievementEngine';

export interface CheckInInput {
  status?: HabitLogStatus;
  numericValue?: number;
  notes?: string;
  reason?: string;
}

export interface CorrectionInput {
  status?: HabitLogStatus;
  numericValue?: number;
  notes?: string;
  reason: string;
}

export class HabitLogService {
  /**
   * Determine whether a quantitative value meets the configured target.
   */
  static isTargetFulfilled(habit: Habit, numericValue?: number): boolean {
    if (habit.type !== 'quantitative') {
      return true;
    }
    if (numericValue === undefined || habit.targetValue === undefined) {
      return false;
    }

    const constraint = habit.targetConstraint || 'at_least';
    if (constraint === 'at_least') {
      return numericValue >= habit.targetValue;
    }
    return numericValue <= habit.targetValue;
  }

  /**
   * Record a check-in for a given habit on a specific local calendar date (YYYY-MM-DD).
   * Safe against rapid clicks: uses Dexie transaction to ensure exactly one record per [habitId+date].
   */
  static async recordCheckIn(
    habit: Habit,
    date: string,
    input: CheckInInput
  ): Promise<HabitLog> {
    const now = new Date().toISOString();

    // Determine canonical status based on habit type
    let resolvedStatus: HabitLogStatus;
    if (habit.type === 'quantitative') {
      const fulfilled = this.isTargetFulfilled(habit, input.numericValue);
      resolvedStatus = fulfilled ? 'completed' : 'failed';
    } else {
      resolvedStatus = input.status || 'completed';
    }

    const result = await db.transaction('rw', db.habitLogs, db.auditRecords, async () => {
      // Check if a record already exists for this date
      const existing = await db.habitLogs
        .where('[habitId+date]')
        .equals([habit.id, date])
        .first();

      if (existing) {
        // If already exists, update and record audit
        const updatedLog: HabitLog = {
          ...existing,
          status: resolvedStatus,
          numericValue: input.numericValue !== undefined ? input.numericValue : existing.numericValue,
          notes: input.notes !== undefined ? input.notes : existing.notes,
          correctedAt: now,
          correctionReason: input.reason || 'Check-in updated',
          updatedAt: now,
        };

        const validated = HabitLogSchema.parse(updatedLog);
        await db.habitLogs.put(validated);

        await db.auditRecords.add({
          id: generateUUID(),
          habitId: habit.id,
          habitLogId: existing.id,
          date,
          action: 'correction',
          previousStatus: existing.status,
          newStatus: resolvedStatus,
          previousValue: existing.numericValue,
          newValue: input.numericValue,
          reason: input.reason || 'Check-in modified',
          timestamp: now
        });

        return validated;
      }

      // Create brand new log
      const newLog: HabitLog = {
        id: generateUUID(),
        habitId: habit.id,
        date,
        status: resolvedStatus,
        numericValue: input.numericValue,
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
      };

      const validated = HabitLogSchema.parse(newLog);
      await db.habitLogs.add(validated);

      await db.auditRecords.add({
        id: generateUUID(),
        habitId: habit.id,
        habitLogId: newLog.id,
        date,
        action: 'check_in',
        newStatus: resolvedStatus,
        newValue: input.numericValue,
        reason: 'Initial daily check-in',
        timestamp: now
      });

      return validated;
    });

    try {
      await AchievementEngine.evaluateAndRecordAchievements(habit.id);
    } catch {
      // Ignore evaluation failure in check-in flow
    }

    return result;
  }

  /**
   * Correct an existing check-in entry with required audit reason.
   */
  static async correctCheckIn(
    logId: string,
    correction: CorrectionInput
  ): Promise<HabitLog> {
    if (!correction.reason || correction.reason.trim().length === 0) {
      throw new Error('A reason is required to correct an audited check-in record.');
    }

    const now = new Date().toISOString();

    const result = await db.transaction('rw', db.habitLogs, db.auditRecords, async () => {
      const existing = await db.habitLogs.get(logId);
      if (!existing) {
        throw new Error(`Habit log with ID ${logId} not found`);
      }

      const updated: HabitLog = {
        ...existing,
        status: correction.status || existing.status,
        numericValue:
          correction.numericValue !== undefined ? correction.numericValue : existing.numericValue,
        notes: correction.notes !== undefined ? correction.notes : existing.notes,
        correctedAt: now,
        correctionReason: correction.reason,
        updatedAt: now
      };

      const validated = HabitLogSchema.parse(updated);
      await db.habitLogs.put(validated);

      await db.auditRecords.add({
        id: generateUUID(),
        habitId: existing.habitId,
        habitLogId: existing.id,
        date: existing.date,
        action: 'correction',
        previousStatus: existing.status,
        newStatus: updated.status,
        previousValue: existing.numericValue,
        newValue: updated.numericValue,
        reason: correction.reason,
        timestamp: now
      });

      return validated;
    });

    try {
      await AchievementEngine.evaluateAndRecordAchievements(result.habitId);
    } catch {
      // Ignore evaluation failure
    }

    return result;
  }

  /**
   * Fetch single log for a habit on a specific date.
   */
  static async getLogForDate(habitId: string, date: string): Promise<HabitLog | undefined> {
    return db.habitLogs.where('[habitId+date]').equals([habitId, date]).first();
  }

  /**
   * Fetch all logs for a given habit, sorted by date descending.
   */
  static async getLogsForHabit(
    habitId: string,
    startDate?: string,
    endDate?: string
  ): Promise<HabitLog[]> {
    let collection = db.habitLogs.where('habitId').equals(habitId);
    let logs = await collection.toArray();

    if (startDate) {
      logs = logs.filter((l) => l.date >= startDate);
    }
    if (endDate) {
      logs = logs.filter((l) => l.date <= endDate);
    }

    return logs.sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Fetch logs for multiple habits on a given date.
   */
  static async getLogsForHabitsOnDate(
    habitIds: string[],
    date: string
  ): Promise<Map<string, HabitLog>> {
    const logs = await db.habitLogs.where('date').equals(date).toArray();
    const map = new Map<string, HabitLog>();
    const idSet = new Set(habitIds);

    for (const log of logs) {
      if (idSet.has(log.habitId)) {
        map.set(log.habitId, log);
      }
    }
    return map;
  }

  /**
   * Count total successful days recorded for a habit.
   */
  static async getTotalSuccessfulDays(habitId: string): Promise<number> {
    return db.habitLogs
      .where('habitId')
      .equals(habitId)
      .filter((l) => l.status === 'completed')
      .count();
  }
}
