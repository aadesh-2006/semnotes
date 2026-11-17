import { db } from '../../storage/db';
import type { Habit, HabitLog, AuditRecord } from '../domain/types';
import type { PausedDateRange } from '../streak/streakTypes';
import { isScheduledDay } from '../services/scheduleService';
import { isDateInPausedRanges, getDateSequence } from '../streak/streakUtils';
import { StreakEngine } from '../streak/streakEngine';
import { formatCalendarDate } from '../utils';
import { getWeekNumber } from './calendarUtils';
import type {
  CalendarDayStatus,
  DayHabitDetail,
  DailyDisciplineSummary,
  CalendarFilters,
  MonthlySummaryMetrics
} from './calendarTypes';

export class CalendarAggregationService {
  /**
   * Evaluates a single habit on a given calendar date.
   */
  static evaluateHabitForDay(
    habit: Habit,
    date: string,
    log: HabitLog | undefined,
    pausedRanges: PausedDateRange[],
    evaluationDate: string
  ): DayHabitDetail {
    // 1. Check lifecycle (startDate to optional endDate)
    const isLifecycleActive =
      date >= habit.startDate && (!habit.endDate || date <= habit.endDate);

    // 2. Check paused status
    const isPaused = isLifecycleActive && isDateInPausedRanges(date, pausedRanges);

    // 3. Check schedule
    const isScheduled =
      isLifecycleActive && isScheduledDay(habit.schedule, date, habit.startDate, habit.endDate);

    // 4. Determine status and streak impact
    let status: DayHabitDetail['status'] = 'unscheduled';
    let streakImpact: DayHabitDetail['streakImpact'] = 'No Impact';

    if (!isLifecycleActive) {
      status = 'unscheduled';
      streakImpact = 'No Impact';
    } else if (date > evaluationDate) {
      status = 'future';
      streakImpact = 'No Impact';
    } else if (isPaused) {
      status = 'paused';
      streakImpact = 'No Impact';
    } else if (!isScheduled) {
      status = 'unscheduled';
      streakImpact = 'No Impact';
    } else {
      // Day is scheduled, not paused, and within lifecycle
      if (log) {
        if (log.status === 'completed') {
          status = 'completed';
          streakImpact = '+1 Increment';
        } else {
          status = 'failed';
          streakImpact = 'Resets to 0';
        }
      } else {
        // No log present
        if (date === evaluationDate) {
          status = 'pending';
          streakImpact = 'No Impact';
        } else {
          status = 'missed';
          streakImpact = 'Resets to 0';
        }
      }
    }

    return {
      habitId: habit.id,
      habitTitle: habit.title,
      habitName: habit.title,
      habitCategory: habit.category,
      habitType: habit.type,
      isScheduled,
      isPaused,
      isLifecycleActive,
      status,
      log,
      targetValue: habit.targetValue,
      targetUnit: habit.unit,
      targetCondition: habit.targetConstraint,
      recordedValue: log?.numericValue,
      streakImpact,
      reflectionNote: log?.notes
    };
  }

  /**
   * Aggregates discipline metrics for all applicable habits on a specific date.
   * Completely deterministic with zero database dependencies.
   */
  static aggregateDay(
    date: string,
    habits: Habit[],
    logsByHabitDate: Map<string, HabitLog>, // Key: `${habitId}_${date}`
    pausedRangesByHabit: Map<string, PausedDateRange[]>,
    evaluationDate = formatCalendarDate(new Date())
  ): DailyDisciplineSummary {
    const habitDetails: DayHabitDetail[] = [];

    let totalApplicableHabits = 0;
    let scheduledCount = 0;
    let completedCount = 0;
    let failedCount = 0;
    let missedCount = 0;
    let pendingCount = 0;
    let pausedCount = 0;
    let unscheduledCount = 0;

    for (const habit of habits) {
      const pausedRanges = pausedRangesByHabit.get(habit.id) || [];
      const log = logsByHabitDate.get(`${habit.id}_${date}`);
      const detail = this.evaluateHabitForDay(habit, date, log, pausedRanges, evaluationDate);

      habitDetails.push(detail);

      if (detail.isLifecycleActive) {
        totalApplicableHabits++;

        if (detail.isPaused) {
          pausedCount++;
        } else if (!detail.isScheduled) {
          unscheduledCount++;
        } else {
          // Scheduled & Active
          scheduledCount++;

          if (detail.status === 'completed') {
            completedCount++;
          } else if (detail.status === 'failed') {
            failedCount++;
          } else if (detail.status === 'missed') {
            missedCount++;
          } else if (detail.status === 'pending') {
            pendingCount++;
          }
        }
      } else {
        unscheduledCount++;
      }
    }

    // Evaluated scheduled count: Completed + Failed + Missed
    // EXCLUDES pending, paused, and unscheduled
    const evaluatedScheduledCount = completedCount + failedCount + missedCount;

    // Daily Completion Percentage Formula:
    // Completed Scheduled Habits / Evaluated Scheduled Habits * 100
    let completionPercentage: number | null = null;
    if (evaluatedScheduledCount > 0) {
      completionPercentage = Math.round((completedCount / evaluatedScheduledCount) * 1000) / 10;
    }

    const hasPending = pendingCount > 0;

    // Determine high-level semantic status
    let status: CalendarDayStatus = 'rest';

    if (date > evaluationDate) {
      status = 'future';
    } else if (scheduledCount === 0) {
      // No commitments were scheduled
      status = pausedCount > 0 ? 'paused' : 'rest';
    } else {
      // At least 1 commitment was scheduled
      if (evaluatedScheduledCount === 0) {
        // Only pending commitments exist today
        status = hasPending ? 'pending' : pausedCount > 0 ? 'paused' : 'rest';
      } else {
        // Some or all commitments have been evaluated
        if (completedCount === scheduledCount && !hasPending) {
          // Flawless completion of all scheduled commitments
          status = 'complete';
        } else if (completedCount === 0 && (failedCount + missedCount === evaluatedScheduledCount) && !hasPending) {
          // Every evaluated commitment failed or was missed
          status = 'failed';
        } else {
          // Partial adherence: either mixed complete/fail, or completed so far with pending remaining
          status = 'partial';
        }
      }
    }

    return {
      date,
      status,
      totalApplicableHabits,
      scheduledCount,
      evaluatedScheduledCount,
      completedCount,
      failedCount,
      missedCount,
      pendingCount,
      pausedCount,
      unscheduledCount,
      completionPercentage,
      hasPending,
      habits: habitDetails
    };
  }

  /**
   * Aggregates discipline metrics across a date sequence.
   */
  static aggregateDateRange(
    startDate: string,
    endDate: string,
    habits: Habit[],
    logs: HabitLog[],
    audits: AuditRecord[],
    evaluationDate = formatCalendarDate(new Date())
  ): Map<string, DailyDisciplineSummary> {
    const summaries = new Map<string, DailyDisciplineSummary>();
    if (startDate > endDate) return summaries;

    // Index logs by `${habitId}_${date}`
    const logsByHabitDate = new Map<string, HabitLog>();
    for (const log of logs) {
      logsByHabitDate.set(`${log.habitId}_${log.date}`, log);
    }

    // Extract paused ranges per habit
    const pausedRangesByHabit = new Map<string, PausedDateRange[]>();
    const auditsByHabit = new Map<string, AuditRecord[]>();
    for (const audit of audits) {
      if (!auditsByHabit.has(audit.habitId)) {
        auditsByHabit.set(audit.habitId, []);
      }
      auditsByHabit.get(audit.habitId)!.push(audit);
    }

    for (const habit of habits) {
      const habitAudits = auditsByHabit.get(habit.id) || [];
      const ranges = StreakEngine.extractPausedRanges(habitAudits, habit);
      pausedRangesByHabit.set(habit.id, ranges);
    }

    const dateSequence = getDateSequence(startDate, endDate);
    for (const date of dateSequence) {
      const summary = this.aggregateDay(
        date,
        habits,
        logsByHabitDate,
        pausedRangesByHabit,
        evaluationDate
      );
      summaries.set(date, summary);
    }

    return summaries;
  }

  /**
   * Calculates monthly summary analytics from daily summaries.
   */
  static calculateMonthlyMetrics(
    summaries: DailyDisciplineSummary[],
    month: number,
    year: number
  ): MonthlySummaryMetrics {
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const monthSummaries = summaries.filter((s) => s.date.startsWith(monthPrefix));

    let totalScheduledCommitments = 0;
    let totalCompletedCommitments = 0;
    let totalFailedCommitments = 0;
    let totalMissedCommitments = 0;
    let totalSuccessfulDays = 0;
    let totalEvaluatedDays = 0;
    let totalPercentageSum = 0;

    let bestConsistencyDay: MonthlySummaryMetrics['bestConsistencyDay'] = undefined;
    const weeklyMap = new Map<number, { completed: number; scheduled: number; dates: string[] }>();

    for (const day of monthSummaries) {
      totalScheduledCommitments += day.scheduledCount;
      totalCompletedCommitments += day.completedCount;
      totalFailedCommitments += day.failedCount;
      totalMissedCommitments += day.missedCount;

      if (day.status === 'complete') {
        totalSuccessfulDays++;
      }

      if (day.evaluatedScheduledCount > 0 && day.completionPercentage !== null) {
        totalEvaluatedDays++;
        totalPercentageSum += day.completionPercentage;

        // Check best day
        if (
          !bestConsistencyDay ||
          day.completionPercentage > bestConsistencyDay.percentage ||
          (day.completionPercentage === bestConsistencyDay.percentage &&
            day.completedCount > bestConsistencyDay.completedCount)
        ) {
          bestConsistencyDay = {
            date: day.date,
            percentage: day.completionPercentage,
            completedCount: day.completedCount,
            scheduledCount: day.scheduledCount
          };
        }

        // Group into week
        const weekNum = getWeekNumber(day.date);
        if (!weeklyMap.has(weekNum)) {
          weeklyMap.set(weekNum, { completed: 0, scheduled: 0, dates: [] });
        }
        const wk = weeklyMap.get(weekNum)!;
        wk.completed += day.completedCount;
        wk.scheduled += day.evaluatedScheduledCount;
        wk.dates.push(day.date);
      }
    }

    const averageCompletionPercentage =
      totalEvaluatedDays > 0
        ? Math.round((totalPercentageSum / totalEvaluatedDays) * 10) / 10
        : 0;

    // Find best week
    let bestConsistencyWeek: MonthlySummaryMetrics['bestConsistencyWeek'] = undefined;
    for (const [weekNum, data] of weeklyMap.entries()) {
      if (data.scheduled > 0) {
        const pct = Math.round((data.completed / data.scheduled) * 1000) / 10;
        data.dates.sort();
        if (!bestConsistencyWeek || pct > bestConsistencyWeek.percentage) {
          bestConsistencyWeek = {
            weekNumber: weekNum,
            startDate: data.dates[0],
            endDate: data.dates[data.dates.length - 1],
            percentage: pct
          };
        }
      }
    }

    const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
      new Date(year, month - 1, 1)
    );

    return {
      monthLabel,
      year,
      month,
      totalScheduledCommitments,
      totalCompletedCommitments,
      totalFailedCommitments,
      totalMissedCommitments,
      averageCompletionPercentage,
      totalSuccessfulDays,
      totalEvaluatedDays,
      bestConsistencyDay,
      bestConsistencyWeek
    };
  }

  /**
   * Filter habits in-memory based on user filter options.
   */
  static applyFilters(habits: Habit[], filters?: CalendarFilters): Habit[] {
    if (!filters) return habits;

    return habits.filter((habit) => {
      // 1. Specific Habit IDs
      if (filters.habitIds && filters.habitIds.length > 0) {
        if (!filters.habitIds.includes(habit.id)) {
          return false;
        }
      }

      // 2. Categories
      if (filters.categories && filters.categories.length > 0) {
        if (!filters.categories.includes(habit.category)) {
          return false;
        }
      }

      // 3. Tracking Types
      if (filters.trackingTypes && filters.trackingTypes.length > 0) {
        if (!filters.trackingTypes.includes(habit.type)) {
          return false;
        }
      }

      // 4. Lifecycle Statuses
      if (filters.lifecycleStatuses && filters.lifecycleStatuses.length > 0) {
        if (!filters.lifecycleStatuses.includes(habit.status)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Fetches data from Dexie and aggregates calendar discipline metrics for a date range.
   * Batched, indexed queries with zero repeated cell queries.
   */
  static async fetchAndAggregateRange(
    startDate: string,
    endDate: string,
    filters?: CalendarFilters,
    evaluationDate = formatCalendarDate(new Date())
  ): Promise<{
    summaries: Map<string, DailyDisciplineSummary>;
    allHabits: Habit[];
    filteredHabits: Habit[];
    metrics: MonthlySummaryMetrics;
  }> {
    // 1. Fetch all habits
    const allHabits = await db.habits.toArray();
    const filteredHabits = this.applyFilters(allHabits, filters);

    if (filteredHabits.length === 0) {
      const summaries = new Map<string, DailyDisciplineSummary>();
      const [year, month] = startDate.split('-').map(Number);
      const metrics = this.calculateMonthlyMetrics([], month, year);
      return { summaries, allHabits, filteredHabits, metrics };
    }

    const habitIds = filteredHabits.map((h) => h.id);

    // 2. Fetch logs and audit records for filtered habits in date range
    // Indexed range query for habitLogs by date
    const [allLogsInRange, allAudits] = await Promise.all([
      db.habitLogs
        .where('date')
        .between(startDate, endDate, true, true)
        .filter((log) => habitIds.includes(log.habitId))
        .toArray(),
      db.auditRecords.where('habitId').anyOf(habitIds).toArray()
    ]);

    // 3. Aggregate range
    const summaries = this.aggregateDateRange(
      startDate,
      endDate,
      filteredHabits,
      allLogsInRange,
      allAudits,
      evaluationDate
    );

    // 4. Calculate metrics for the primary month in startDate
    const [year, month] = startDate.split('-').map(Number);
    const summaryArray = Array.from(summaries.values());
    const metrics = this.calculateMonthlyMetrics(summaryArray, month, year);

    return {
      summaries,
      allHabits,
      filteredHabits,
      metrics
    };
  }
}
