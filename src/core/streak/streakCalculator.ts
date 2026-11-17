import type { Habit, HabitLog } from '../domain/types';
import type {
  HabitStreakResult,
  StreakCalculationOptions,
  DayStreakRecord,
  StreakRange,
  TodayHabitStatus,
  StreakStatus
} from './streakTypes';
import { isScheduledDay } from '../services/scheduleService';
import {
  getDateSequence,
  isDateInPausedRanges,
  getNextScheduledDate
} from './streakUtils';
import { formatCalendarDate } from '../utils';

export class StreakCalculator {
  /**
   * Pure calculation function for a habit's independent streak metrics.
   * Deterministic, zero database or React dependencies, accepts an explicit evaluation date.
   */
  static calculateStreak(
    habit: Habit,
    logs: HabitLog[],
    options?: StreakCalculationOptions
  ): HabitStreakResult {
    const evaluationDate = options?.evaluationDate || formatCalendarDate(new Date());
    const pausedRanges = options?.pausedRanges || [];
    const cachedLongest = options?.cachedLongestStreak || 0;

    // Build fast O(1) lookup map for logs by date
    const logMap = new Map<string, HabitLog>();
    for (const log of logs) {
      if (log.habitId === habit.id) {
        logMap.set(log.date, log);
      }
    }

    const startDate = habit.startDate;
    const endDate = habit.endDate;

    // Edge case: Habit starts in the future relative to evaluationDate
    if (evaluationDate < startDate) {
      const nextDate = getNextScheduledDate(
        habit.schedule,
        evaluationDate,
        startDate,
        endDate,
        pausedRanges
      );

      return {
        habitId: habit.id,
        currentStreak: 0,
        longestStreak: cachedLongest,
        totalSuccessfulDays: 0,
        totalFailedDays: 0,
        totalMissedDays: 0,
        totalScheduledDays: 0,
        nextScheduledDate: nextDate,
        successPercentage: 0,
        todayStatus: 'rest_day',
        streakStatus: 'unstarted',
        timeline: []
      };
    }

    // Determine today's scheduled and paused status
    const isTodayScheduled = isScheduledDay(habit.schedule, evaluationDate, startDate, endDate);
    const isTodayPaused =
      habit.status === 'paused' || isDateInPausedRanges(evaluationDate, pausedRanges);
    const todayLog = logMap.get(evaluationDate);

    let todayStatus: TodayHabitStatus = 'rest_day';
    if (isTodayPaused) {
      todayStatus = 'paused';
    } else if (!isTodayScheduled) {
      todayStatus = 'rest_day';
    } else if (todayLog) {
      todayStatus = todayLog.status === 'completed' ? 'completed' : 'failed';
    } else {
      todayStatus = 'pending';
    }

    // Generate continuous date timeline from startDate to evaluationDate
    const dateSequence = getDateSequence(startDate, evaluationDate);
    const timeline: DayStreakRecord[] = [];

    let totalScheduledDays = 0;
    let totalSuccessfulDays = 0;
    let totalFailedDays = 0;
    let totalMissedDays = 0;
    let lastSuccessfulDate: string | undefined = undefined;

    // Build timeline of every day from start to evaluationDate
    for (const date of dateSequence) {
      const scheduled = isScheduledDay(habit.schedule, date, startDate, endDate);
      const paused = isDateInPausedRanges(date, pausedRanges);
      const log = logMap.get(date);

      let status: DayStreakRecord['status'] = 'skipped';
      let contributesToStreak = false;
      let breaksStreak = false;

      if (paused) {
        status = 'skipped';
      } else if (!scheduled) {
        status = 'skipped';
      } else {
        // Day is scheduled and not paused
        totalScheduledDays++;

        if (log) {
          if (log.status === 'completed') {
            status = 'completed';
            contributesToStreak = true;
            totalSuccessfulDays++;
            lastSuccessfulDate = date;
          } else {
            status = 'failed';
            breaksStreak = true;
            totalFailedDays++;
          }
        } else {
          // No log present
          if (date === evaluationDate) {
            // Evaluation day (today) without a check-in is pending
            status = 'pending';
          } else {
            // Past scheduled day without log counts as missed under strict policy
            status = 'missed';
            breaksStreak = true;
            totalMissedDays++;
          }
        }
      }

      timeline.push({
        date,
        isScheduled: scheduled,
        isPaused: paused,
        status,
        log,
        contributesToStreak,
        breaksStreak
      });
    }

    // -------------------------------------------------------------
    // Calculate Longest Streak
    // -------------------------------------------------------------
    let longestStreak = cachedLongest;
    let longestStreakRange: StreakRange | undefined = undefined;

    let currentSegmentLength = 0;
    let segmentStartDate: string | undefined = undefined;

    for (const day of timeline) {
      if (day.status === 'completed') {
        currentSegmentLength++;
        if (currentSegmentLength === 1) {
          segmentStartDate = day.date;
        }

        if (currentSegmentLength > longestStreak) {
          longestStreak = currentSegmentLength;
          longestStreakRange = {
            startDate: segmentStartDate!,
            endDate: day.date,
            length: currentSegmentLength
          };
        }
      } else if (day.breaksStreak) {
        currentSegmentLength = 0;
        segmentStartDate = undefined;
      }
      // If status is 'skipped' (unscheduled/paused) or 'pending', do not break segment
    }

    // -------------------------------------------------------------
    // Calculate Current Streak
    // -------------------------------------------------------------
    let currentStreak = 0;
    let currentStreakStartDate: string | undefined = undefined;

    // Filter to scheduled non-paused days only
    const scheduledDays = timeline.filter((d) => d.isScheduled && !d.isPaused);

    if (scheduledDays.length > 0) {
      // Find starting point for current streak check:
      // If the latest day is today and it's pending, we don't count today as failed.
      // Instead, we start checking backwards from the previous scheduled day,
      // or from today if today has an actual completed/failed log.
      let checkIndex = scheduledDays.length - 1;
      const latestDay = scheduledDays[checkIndex];

      if (latestDay.date === evaluationDate && latestDay.status === 'pending') {
        // Today is pending check-in; evaluate streak up to previous scheduled day
        checkIndex--;
      }

      // Walk backward consecutively
      while (checkIndex >= 0) {
        const day = scheduledDays[checkIndex];

        if (day.status === 'completed') {
          currentStreak++;
          currentStreakStartDate = day.date; // Updates to earliest date in continuous run
          checkIndex--;
        } else if (day.breaksStreak) {
          // Encountered a missed or failed day: streak is broken!
          break;
        } else {
          // Skipped/paused day (already filtered, but for safety)
          checkIndex--;
        }
      }
    }

    // Next scheduled date
    const nextScheduledDate = getNextScheduledDate(
      habit.schedule,
      evaluationDate,
      startDate,
      endDate,
      pausedRanges
    );

    // Success percentage (successful / total evaluated scheduled days)
    const successPercentage =
      totalScheduledDays > 0 ? Math.round((totalSuccessfulDays / totalScheduledDays) * 100) : 0;

    // Streak Status
    let streakStatus: StreakStatus = 'unstarted';
    if (habit.status === 'paused' || isTodayPaused) {
      streakStatus = 'paused';
    } else if (currentStreak > 0) {
      if (todayStatus === 'pending') {
        streakStatus = 'at_risk';
      } else {
        streakStatus = 'active';
      }
    } else if (totalScheduledDays > 0 && (totalFailedDays > 0 || totalMissedDays > 0)) {
      streakStatus = 'broken';
    } else {
      streakStatus = 'unstarted';
    }

    return {
      habitId: habit.id,
      currentStreak,
      longestStreak,
      totalSuccessfulDays,
      totalFailedDays,
      totalMissedDays,
      totalScheduledDays,
      currentStreakStartDate: currentStreak > 0 ? currentStreakStartDate : undefined,
      longestStreakRange,
      lastSuccessfulDate,
      nextScheduledDate,
      successPercentage,
      todayStatus,
      streakStatus,
      timeline
    };
  }

  /**
   * Helper to quickly get just the current streak count.
   */
  static calculateCurrentStreak(
    habit: Habit,
    logs: HabitLog[],
    evaluationDate?: string
  ): number {
    return this.calculateStreak(habit, logs, { evaluationDate }).currentStreak;
  }

  /**
   * Helper to quickly get just the longest streak count.
   */
  static calculateLongestStreak(
    habit: Habit,
    logs: HabitLog[],
    evaluationDate?: string
  ): number {
    return this.calculateStreak(habit, logs, { evaluationDate }).longestStreak;
  }
}
