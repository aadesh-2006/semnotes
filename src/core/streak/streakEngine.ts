import { db } from '../../storage/db';
import type { Habit, HabitLog, AuditRecord } from '../domain/types';
import type {
  HabitStreakResult,
  StreakCalculationOptions,
  PausedDateRange
} from './streakTypes';
import { StreakCalculator } from './streakCalculator';
import { formatCalendarDate } from '../utils';

export class StreakEngine {
  /**
   * Derive paused date intervals from a habit's audit records.
   */
  static extractPausedRanges(auditRecords: AuditRecord[], habit: Habit): PausedDateRange[] {
    const sorted = [...auditRecords]
      .filter((a) => a.action === 'pause' || a.action === 'resume')
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    const ranges: PausedDateRange[] = [];
    let currentPauseStart: string | null = null;

    for (const record of sorted) {
      if (record.action === 'pause' && !currentPauseStart) {
        currentPauseStart = record.date;
      } else if (record.action === 'resume' && currentPauseStart) {
        ranges.push({ startDate: currentPauseStart, endDate: record.date });
        currentPauseStart = null;
      }
    }

    if (currentPauseStart) {
      ranges.push({ startDate: currentPauseStart });
    } else if (habit.status === 'paused') {
      ranges.push({ startDate: habit.updatedAt.split('T')[0] });
    }

    return ranges;
  }

  /**
   * Calculates the full streak result for a single habit by ID.
   */
  static async calculateHabitStreak(
    habitId: string,
    options?: StreakCalculationOptions
  ): Promise<HabitStreakResult | undefined> {
    const habit = await db.habits.get(habitId);
    if (!habit) return undefined;

    const [logs, audits] = await Promise.all([
      db.habitLogs.where('habitId').equals(habitId).toArray(),
      db.auditRecords.where('habitId').equals(habitId).toArray()
    ]);

    const pausedRanges = options?.pausedRanges || this.extractPausedRanges(audits, habit);

    return StreakCalculator.calculateStreak(habit, logs, {
      ...options,
      pausedRanges
    });
  }

  /**
   * Batch calculates streaks for multiple habits efficiently with grouped queries.
   */
  static async calculateStreaksForHabits(
    habits: Habit[],
    evaluationDate = formatCalendarDate(new Date())
  ): Promise<Map<string, HabitStreakResult>> {
    const resultMap = new Map<string, HabitStreakResult>();
    if (habits.length === 0) return resultMap;

    const habitIds = habits.map((h) => h.id);

    // Fetch all logs and audit records for these habits in parallel
    const [allLogs, allAudits] = await Promise.all([
      db.habitLogs.where('habitId').anyOf(habitIds).toArray(),
      db.auditRecords.where('habitId').anyOf(habitIds).toArray()
    ]);

    // Group logs by habitId
    const logsByHabit = new Map<string, HabitLog[]>();
    for (const log of allLogs) {
      if (!logsByHabit.has(log.habitId)) {
        logsByHabit.set(log.habitId, []);
      }
      logsByHabit.get(log.habitId)!.push(log);
    }

    // Group audits by habitId
    const auditsByHabit = new Map<string, AuditRecord[]>();
    for (const audit of allAudits) {
      if (!auditsByHabit.has(audit.habitId)) {
        auditsByHabit.set(audit.habitId, []);
      }
      auditsByHabit.get(audit.habitId)!.push(audit);
    }

    // Calculate each habit's streak deterministically
    for (const habit of habits) {
      const logs = logsByHabit.get(habit.id) || [];
      const audits = auditsByHabit.get(habit.id) || [];
      const pausedRanges = this.extractPausedRanges(audits, habit);

      const result = StreakCalculator.calculateStreak(habit, logs, {
        evaluationDate,
        pausedRanges
      });

      resultMap.set(habit.id, result);
    }

    return resultMap;
  }
}
