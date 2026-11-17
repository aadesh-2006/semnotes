import { CalendarAggregationService } from '../calendar/calendarAggregationService';
import type { Habit, HabitLog, AuditRecord } from '../domain/types';
import { formatCalendarDate, formatShortDate } from '../utils';
import { getDateSequence } from '../streak/streakUtils';
import { getMonthYearLabel, shiftCalendarDate } from './analyticsDateUtils';
import type {
  DailyAdherencePoint,
  WeeklyAdherencePoint,
  MonthlyAdherencePoint
} from './analyticsTypes';

export class TrendAnalysisService {
  /**
   * Builds daily adherence series for Recharts visualizations.
   * Calculates daily adherence % and rolling 30-day adherence at each date.
   */
  static buildDailyAdherenceSeries(
    startDate: string,
    endDate: string,
    habits: Habit[],
    logs: HabitLog[],
    audits: AuditRecord[],
    evaluationDate = formatCalendarDate(new Date())
  ): DailyAdherencePoint[] {
    // 1. Need 29 days prior to startDate to calculate rolling 30-day window on day 1
    const bufferStartDate = shiftCalendarDate(startDate, -29);
    const summaries = CalendarAggregationService.aggregateDateRange(
      bufferStartDate,
      endDate,
      habits,
      logs,
      audits,
      evaluationDate
    );

    // Initialize running sliding 30-day window over the prior 29 days
    const priorEndDate = shiftCalendarDate(startDate, -1);
    const initialPriorDates = getDateSequence(bufferStartDate, priorEndDate);
    let r30Completed = 0;
    let r30Evaluated = 0;
    for (const pd of initialPriorDates) {
      const ps = summaries.get(pd);
      if (ps) {
        r30Completed += ps.completedCount;
        r30Evaluated += ps.completedCount + ps.failedCount + ps.missedCount;
      }
    }

    const dates = getDateSequence(startDate, endDate);
    const points: DailyAdherencePoint[] = [];

    for (let i = 0; i < dates.length; i++) {
      const d = dates[i];
      const summary = summaries.get(d);
      const completed = summary ? summary.completedCount : 0;
      const failed = summary ? summary.failedCount : 0;
      const missed = summary ? summary.missedCount : 0;
      const evaluated = completed + failed + missed;
      const completionPercentage = evaluated > 0 ? Math.round((completed / evaluated) * 100) : null;

      // Add current day into rolling 30-day window
      r30Completed += completed;
      r30Evaluated += evaluated;

      const rolling30Score =
        r30Evaluated > 0 ? Math.round((r30Completed / r30Evaluated) * 100) : null;

      points.push({
        date: d,
        displayDate: formatShortDate(d),
        completionPercentage,
        completedCount: completed,
        failedCount: failed,
        missedCount: missed,
        evaluatedCount: evaluated,
        rolling30Score
      });

      // Remove the day that drops out of the 30-day window for the next step
      const droppingDate = shiftCalendarDate(d, -29);
      const dropSummary = summaries.get(droppingDate);
      if (dropSummary) {
        r30Completed -= dropSummary.completedCount;
        r30Evaluated -= dropSummary.completedCount + dropSummary.failedCount + dropSummary.missedCount;
      }
    }

    return points;
  }

  /**
   * Groups daily points into 7-day rolling or calendar weekly adherence points.
   */
  static buildWeeklyAdherenceSeries(dailyPoints: DailyAdherencePoint[]): WeeklyAdherencePoint[] {
    const weeklyPoints: WeeklyAdherencePoint[] = [];
    if (dailyPoints.length === 0) return weeklyPoints;

    const chunkSize = 7;
    for (let i = 0; i < dailyPoints.length; i += chunkSize) {
      const chunk = dailyPoints.slice(i, i + chunkSize);
      let completed = 0;
      let evaluated = 0;
      let failed = 0;
      let missed = 0;

      for (const p of chunk) {
        completed += p.completedCount;
        failed += p.failedCount;
        missed += p.missedCount;
        evaluated += p.evaluatedCount;
      }

      const completionPercentage =
        evaluated > 0 ? Math.round((completed / evaluated) * 100) : null;
      const startP = chunk[0];
      const endP = chunk[chunk.length - 1];

      weeklyPoints.push({
        weekLabel: `${startP.displayDate} - ${endP.displayDate}`,
        startDate: startP.date,
        endDate: endP.date,
        completionPercentage,
        completedCount: completed,
        failedCount: failed,
        missedCount: missed,
        evaluatedCount: evaluated
      });
    }

    return weeklyPoints;
  }

  /**
   * Groups daily points by calendar month.
   */
  static buildMonthlyAdherenceSeries(dailyPoints: DailyAdherencePoint[]): MonthlyAdherencePoint[] {
    const monthMap = new Map<
      string,
      { year: number; month: number; completed: number; evaluated: number }
    >();

    for (const p of dailyPoints) {
      const [year, month] = p.date.split('-').map(Number);
      const key = `${year}-${String(month).padStart(2, '0')}`;

      if (!monthMap.has(key)) {
        monthMap.set(key, { year, month, completed: 0, evaluated: 0 });
      }

      const entry = monthMap.get(key)!;
      entry.completed += p.completedCount;
      entry.evaluated += p.evaluatedCount;
    }

    const monthlyPoints: MonthlyAdherencePoint[] = [];
    for (const entry of monthMap.values()) {
      const completionPercentage =
        entry.evaluated > 0 ? Math.round((entry.completed / entry.evaluated) * 100) : null;

      monthlyPoints.push({
        monthLabel: getMonthYearLabel(entry.year, entry.month),
        year: entry.year,
        month: entry.month,
        completionPercentage,
        completedCount: entry.completed,
        evaluatedCount: entry.evaluated
      });
    }

    return monthlyPoints;
  }
}
