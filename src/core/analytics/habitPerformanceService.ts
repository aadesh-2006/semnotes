import { db } from '../../storage/db';
import type { Habit, HabitLog, AuditRecord } from '../domain/types';
import { CalendarAggregationService } from '../calendar/calendarAggregationService';
import { StreakCalculator } from '../streak/streakCalculator';
import { StreakEngine } from '../streak/streakEngine';
import { formatCalendarDate } from '../utils';
import { getPrecedingWindow, getRollingWindow } from './analyticsDateUtils';
import type {
  HabitPerformanceMetric,
  CategoryPerformanceMetric,
  HabitTrend
} from './analyticsTypes';

export interface HabitPerformanceOptions {
  startDate?: string;       // YYYY-MM-DD
  endDate?: string;         // YYYY-MM-DD
  evaluationDate?: string;  // YYYY-MM-DD
  filterHabitIds?: string[];
  filterCategories?: string[];
}

export class HabitPerformanceService {
  /**
   * Pure deterministic calculation of individual habit adherence and streaks.
   * Respects schedule differences (MWF vs daily), pause ranges, and life cycles.
   */
  static calculateHabitPerformance(
    habits: Habit[],
    logs: HabitLog[],
    audits: AuditRecord[],
    options?: HabitPerformanceOptions
  ): HabitPerformanceMetric[] {
    const evaluationDate = options?.evaluationDate || formatCalendarDate(new Date());

    // Default to rolling 30 days if range is omitted
    let startDate = options?.startDate;
    let endDate = options?.endDate;
    if (!startDate || !endDate) {
      const rolling = getRollingWindow(evaluationDate, 30);
      startDate = rolling.startDate;
      endDate = rolling.endDate;
    }

    // Filter habits if specified
    let targetHabits = habits;
    if (options?.filterHabitIds && options.filterHabitIds.length > 0) {
      const allowedSet = new Set(options.filterHabitIds);
      targetHabits = targetHabits.filter((h) => allowedSet.has(h.id));
    }
    if (options?.filterCategories && options.filterCategories.length > 0) {
      const allowedCats = new Set(options.filterCategories);
      targetHabits = targetHabits.filter((h) => allowedCats.has(h.category));
    }

    // Pre-calculate paused ranges per habit
    const auditsByHabit = new Map<string, AuditRecord[]>();
    for (const audit of audits) {
      if (!auditsByHabit.has(audit.habitId)) {
        auditsByHabit.set(audit.habitId, []);
      }
      auditsByHabit.get(audit.habitId)!.push(audit);
    }

    // Pre-group logs by habit for fast streak engine input
    const logsByHabit = new Map<string, HabitLog[]>();
    for (const log of logs) {
      if (!logsByHabit.has(log.habitId)) {
        logsByHabit.set(log.habitId, []);
      }
      logsByHabit.get(log.habitId)!.push(log);
    }

    // 1. Current Period Aggregation
    const currentSummaries = CalendarAggregationService.aggregateDateRange(
      startDate,
      endDate,
      targetHabits,
      logs,
      audits,
      evaluationDate
    );

    // Accumulate metrics per habit in current period
    const habitStats = new Map<
      string,
      { scheduled: number; completed: number; failed: number; missed: number }
    >();

    for (const h of targetHabits) {
      habitStats.set(h.id, { scheduled: 0, completed: 0, failed: 0, missed: 0 });
    }

    for (const daySummary of currentSummaries.values()) {
      for (const hDetail of daySummary.habits) {
        const stats = habitStats.get(hDetail.habitId);
        if (!stats) continue;

        if (hDetail.isScheduled && !hDetail.isPaused) {
          stats.scheduled++;
          if (hDetail.status === 'completed') {
            stats.completed++;
          } else if (hDetail.status === 'failed') {
            stats.failed++;
          } else if (hDetail.status === 'missed') {
            stats.missed++;
          }
        }
      }
    }

    // 2. Previous Period Aggregation for Comparison
    // Compute duration in days between startDate and endDate
    const startDt = new Date(startDate);
    const endDt = new Date(endDate);
    const daySpan = Math.max(1, Math.round((endDt.getTime() - startDt.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const { startDate: prevStart, endDate: prevEnd } = getPrecedingWindow(startDate, daySpan);
    const prevSummaries = CalendarAggregationService.aggregateDateRange(
      prevStart,
      prevEnd,
      targetHabits,
      logs,
      audits,
      prevEnd
    );

    const prevHabitStats = new Map<string, { completed: number; evaluated: number }>();
    for (const h of targetHabits) {
      prevHabitStats.set(h.id, { completed: 0, evaluated: 0 });
    }

    for (const daySummary of prevSummaries.values()) {
      for (const hDetail of daySummary.habits) {
        const stats = prevHabitStats.get(hDetail.habitId);
        if (!stats) continue;

        if (hDetail.isScheduled && !hDetail.isPaused) {
          if (['completed', 'failed', 'missed'].includes(hDetail.status)) {
            stats.evaluated++;
            if (hDetail.status === 'completed') {
              stats.completed++;
            }
          }
        }
      }
    }

    // 3. Assemble Metrics
    const results: HabitPerformanceMetric[] = targetHabits.map((habit) => {
      const stats = habitStats.get(habit.id)!;
      const evaluatedCount = stats.completed + stats.failed + stats.missed;

      let completionPercentage: number | null = null;
      if (evaluatedCount > 0) {
        completionPercentage = Math.round((stats.completed / evaluatedCount) * 100);
      }

      // Previous period
      const prevStats = prevHabitStats.get(habit.id);
      let previousCompletionPercentage: number | null = null;
      let percentageDelta: number | null = null;

      if (prevStats && prevStats.evaluated > 0) {
        previousCompletionPercentage = Math.round(
          (prevStats.completed / prevStats.evaluated) * 100
        );
        if (completionPercentage !== null) {
          percentageDelta = completionPercentage - previousCompletionPercentage;
        }
      }

      let recentTrend: HabitTrend = 'insufficient_data';
      if (completionPercentage !== null) {
        if (percentageDelta === null) {
          recentTrend = 'stable';
        } else if (percentageDelta >= 5) {
          recentTrend = 'improving';
        } else if (percentageDelta <= -5) {
          recentTrend = 'declining';
        } else {
          recentTrend = 'stable';
        }
      }

      // Current & longest streak
      const hAudits = auditsByHabit.get(habit.id) || [];
      const pausedRanges = StreakEngine.extractPausedRanges(hAudits, habit);
      const hLogs = logsByHabit.get(habit.id) || [];
      const streakResult = StreakCalculator.calculateStreak(habit, hLogs, {
        evaluationDate,
        pausedRanges
      });

      return {
        habitId: habit.id,
        habitTitle: habit.title,
        habitCategory: habit.category,
        habitType: habit.type,
        currentStreak: streakResult.currentStreak,
        longestStreak: streakResult.longestStreak,
        scheduledCount: stats.scheduled,
        completedCount: stats.completed,
        failedCount: stats.failed,
        missedCount: stats.missed,
        evaluatedCount,
        completionPercentage,
        previousCompletionPercentage,
        percentageDelta,
        recentTrend
      };
    });

    // Sort by completion percentage descending (nulls last), then title
    return results.sort((a, b) => {
      if (a.completionPercentage === null && b.completionPercentage !== null) return 1;
      if (a.completionPercentage !== null && b.completionPercentage === null) return -1;
      if (a.completionPercentage !== null && b.completionPercentage !== null) {
        const diff = b.completionPercentage - a.completionPercentage;
        if (diff !== 0) return diff;
      }
      return a.habitTitle.localeCompare(b.habitTitle);
    });
  }

  /**
   * Aggregates performance metrics by habit category.
   */
  static calculateCategoryPerformance(
    habitMetrics: HabitPerformanceMetric[]
  ): CategoryPerformanceMetric[] {
    const categoryMap = new Map<
      string,
      {
        totalHabits: number;
        totalEvaluated: number;
        totalCompleted: number;
        totalFailedOrMissed: number;
        deltas: number[];
      }
    >();

    for (const metric of habitMetrics) {
      const cat = metric.habitCategory;
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, {
          totalHabits: 0,
          totalEvaluated: 0,
          totalCompleted: 0,
          totalFailedOrMissed: 0,
          deltas: []
        });
      }

      const entry = categoryMap.get(cat)!;
      entry.totalHabits++;
      entry.totalEvaluated += metric.evaluatedCount;
      entry.totalCompleted += metric.completedCount;
      entry.totalFailedOrMissed += metric.failedCount + metric.missedCount;
      if (metric.percentageDelta !== null) {
        entry.deltas.push(metric.percentageDelta);
      }
    }

    const categories: CategoryPerformanceMetric[] = [];
    for (const [category, data] of categoryMap.entries()) {
      let completionPercentage: number | null = null;
      if (data.totalEvaluated > 0) {
        completionPercentage = Math.round((data.totalCompleted / data.totalEvaluated) * 100);
      }

      let percentageDelta: number | null = null;
      if (data.deltas.length > 0) {
        const sumDelta = data.deltas.reduce((acc, d) => acc + d, 0);
        percentageDelta = Math.round(sumDelta / data.deltas.length);
      }

      categories.push({
        category,
        totalHabits: data.totalHabits,
        totalEvaluated: data.totalEvaluated,
        totalCompleted: data.totalCompleted,
        totalFailedOrMissed: data.totalFailedOrMissed,
        completionPercentage,
        percentageDelta
      });
    }

    return categories.sort((a, b) => {
      if (a.completionPercentage === null && b.completionPercentage !== null) return 1;
      if (a.completionPercentage !== null && b.completionPercentage === null) return -1;
      if (a.completionPercentage !== null && b.completionPercentage !== null) {
        return b.completionPercentage - a.completionPercentage;
      }
      return String(a.category).localeCompare(String(b.category));
    });
  }

  /**
   * IndexedDB query helper for habit performance.
   */
  static async fetchAndCalculateHabitPerformance(
    options?: HabitPerformanceOptions
  ): Promise<{
    habits: HabitPerformanceMetric[];
    categories: CategoryPerformanceMetric[];
  }> {
    const [allHabits, logs, audits] = await Promise.all([
      db.habits.toArray(),
      db.habitLogs.toArray(),
      db.auditRecords.toArray()
    ]);

    const habits = this.calculateHabitPerformance(allHabits, logs, audits, options);
    const categories = this.calculateCategoryPerformance(habits);

    return { habits, categories };
  }
}
