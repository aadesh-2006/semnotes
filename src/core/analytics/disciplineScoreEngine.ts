import { db } from '../../storage/db';
import type { Habit, HabitLog, AuditRecord } from '../domain/types';
import { CalendarAggregationService } from '../calendar/calendarAggregationService';
import { formatCalendarDate } from '../utils';
import { getRollingWindow, getPrecedingWindow } from './analyticsDateUtils';
import type { DisciplineScoreResult, AdherenceGrade } from './analyticsTypes';

export interface ScoreCalculationOptions {
  evaluationDate?: string;  // YYYY-MM-DD (defaults to local today)
  windowDays?: number;      // Defaults to 30
  filterHabitIds?: string[]; // Optional habit ID filter
}

export class DisciplineScoreEngine {
  /**
   * Pure deterministic calculation of the Rolling Discipline Score from domain entities.
   * Zero React dependencies. Uses canonical CalendarAggregationService semantics.
   *
   * Formula:
   *   Discipline Score = (Completed Scheduled Commitments / Evaluated Scheduled Commitments) * 100
   *   where Evaluated = Completed + Failed + Missed
   *   (Pending, Paused, Unscheduled, and Future days are strictly excluded)
   */
  static calculateDisciplineScore(
    habits: Habit[],
    logs: HabitLog[],
    audits: AuditRecord[],
    options?: ScoreCalculationOptions
  ): DisciplineScoreResult {
    const evaluationDate = options?.evaluationDate || formatCalendarDate(new Date());
    const windowDays = options?.windowDays ?? 30;

    // Filter habits if specified
    let targetHabits = habits;
    if (options?.filterHabitIds && options.filterHabitIds.length > 0) {
      const allowedSet = new Set(options.filterHabitIds);
      targetHabits = habits.filter((h) => allowedSet.has(h.id));
    }

    // 1. Current Rolling Window
    const { startDate, endDate } = getRollingWindow(evaluationDate, windowDays);
    const currentSummaries = CalendarAggregationService.aggregateDateRange(
      startDate,
      endDate,
      targetHabits,
      logs,
      audits,
      evaluationDate
    );

    let totalCompleted = 0;
    let totalFailed = 0;
    let totalMissed = 0;
    let totalPending = 0;
    let totalPaused = 0;
    let totalUnscheduled = 0;

    for (const summary of currentSummaries.values()) {
      totalCompleted += summary.completedCount;
      totalFailed += summary.failedCount;
      totalMissed += summary.missedCount;
      totalPending += summary.pendingCount;
      totalPaused += summary.pausedCount;
      totalUnscheduled += summary.unscheduledCount;
    }

    const totalEvaluated = totalCompleted + totalFailed + totalMissed;

    let score: number | null = null;
    let hasSufficientData = false;
    let adherenceGrade: AdherenceGrade = 'insufficient_data';

    if (totalEvaluated > 0) {
      hasSufficientData = true;
      score = Math.round((totalCompleted / totalEvaluated) * 100);

      if (score >= 90) {
        adherenceGrade = 'sovereign';
      } else if (score >= 75) {
        adherenceGrade = 'disciplined';
      } else if (score >= 60) {
        adherenceGrade = 'stable';
      } else {
        adherenceGrade = 'vulnerable';
      }
    }

    // 2. Preceding Window Calculation for Delta
    const { startDate: prevStart, endDate: prevEnd } = getPrecedingWindow(startDate, windowDays);
    const precedingSummaries = CalendarAggregationService.aggregateDateRange(
      prevStart,
      prevEnd,
      targetHabits,
      logs,
      audits,
      prevEnd // Evaluation date was the end of that window
    );

    let prevCompleted = 0;
    let prevFailed = 0;
    let prevMissed = 0;

    for (const summary of precedingSummaries.values()) {
      prevCompleted += summary.completedCount;
      prevFailed += summary.failedCount;
      prevMissed += summary.missedCount;
    }

    const prevEvaluated = prevCompleted + prevFailed + prevMissed;
    let precedingScore: number | null = null;
    let scoreDelta: number | null = null;

    if (prevEvaluated > 0) {
      precedingScore = Math.round((prevCompleted / prevEvaluated) * 100);
      if (score !== null) {
        scoreDelta = score - precedingScore;
      }
    }

    return {
      score,
      hasSufficientData,
      windowStartDate: startDate,
      windowEndDate: endDate,
      windowDays,
      totalCompleted,
      totalFailed,
      totalMissed,
      totalPending,
      totalPaused,
      totalUnscheduled,
      totalEvaluated,
      precedingScore,
      scoreDelta,
      adherenceGrade
    };
  }

  /**
   * IndexedDB orchestration helper to fetch records and compute score.
   */
  static async fetchAndCalculateScore(
    options?: ScoreCalculationOptions
  ): Promise<DisciplineScoreResult> {
    const evaluationDate = options?.evaluationDate || formatCalendarDate(new Date());
    const windowDays = options?.windowDays ?? 30;

    // Both current and preceding windows span 2 * windowDays back from evaluationDate
    const totalBackDays = windowDays * 2;
    const { startDate: oldestDate } = getRollingWindow(evaluationDate, totalBackDays);

    const [allHabits, logs, audits] = await Promise.all([
      db.habits.toArray(),
      db.habitLogs.where('date').aboveOrEqual(oldestDate).toArray(),
      db.auditRecords.toArray()
    ]);

    return this.calculateDisciplineScore(allHabits, logs, audits, options);
  }
}
