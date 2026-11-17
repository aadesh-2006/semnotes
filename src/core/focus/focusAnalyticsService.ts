/**
 * SEMNÓTĒS — Focus Time Analytics Engine
 * Sovereign personal discipline operating system.
 *
 * CRITICAL INVARIANTS:
 * 1. Break duration is NEVER included in focused time calculations.
 * 2. Cancelled and abandoned sessions are excluded from completed session counts.
 * 3. Empty history returns explicit empty states, never fabricated numbers.
 * 4. Pure deterministic math with zero React/UI dependencies.
 */

import type { FocusSessionRecord } from './focusTypes';
import { formatCalendarDate } from '../utils';

export interface FocusMetricsSummary {
  totalFocusedSeconds: number;
  totalFocusedMinutes: number;
  totalFocusedHours: number;
  completedSessionsCount: number;
  interruptedSessionsCount: number;
  totalSessionsEvaluated: number;
  averageSessionDurationMinutes: number | null;
  longestSessionMinutes: number | null;
  hasData: boolean;
}

export interface DayFocusMetric {
  date: string;                     // YYYY-MM-DD
  focusedMinutes: number;
  completedSessions: number;
}

export interface HabitFocusDistribution {
  habitId: string;
  habitTitle: string;
  focusedMinutes: number;
  percentage: number;
}

export interface ActivityFocusDistribution {
  title: string;
  focusedMinutes: number;
  percentage: number;
}

export class FocusAnalyticsService {
  /**
   * Computes high-level summary metrics across a set of focus sessions.
   */
  static calculateSummary(sessions: FocusSessionRecord[]): FocusMetricsSummary {
    if (!sessions || sessions.length === 0) {
      return {
        totalFocusedSeconds: 0,
        totalFocusedMinutes: 0,
        totalFocusedHours: 0,
        completedSessionsCount: 0,
        interruptedSessionsCount: 0,
        totalSessionsEvaluated: 0,
        averageSessionDurationMinutes: null,
        longestSessionMinutes: null,
        hasData: false,
      };
    }

    let totalSeconds = 0;
    let completedCount = 0;
    let interruptedCount = 0;
    let longestSeconds = 0;
    let completedSecondsSum = 0;

    for (const session of sessions) {
      // Cancelled and abandoned sessions are excluded from focus credit
      if (session.status === 'cancelled' || session.status === 'abandoned') {
        continue;
      }

      const focusSecs = Math.max(0, session.actualDurationSeconds);
      totalSeconds += focusSecs;

      if (session.status === 'completed') {
        completedCount++;
        completedSecondsSum += focusSecs;
        if (focusSecs > longestSeconds) {
          longestSeconds = focusSecs;
        }
      } else if (session.status === 'interrupted') {
        interruptedCount++;
      }
    }

    const totalEvaluated = completedCount + interruptedCount;
    const totalMinutes = Math.round(totalSeconds / 60);
    const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;

    const avgMinutes = completedCount > 0
      ? Math.round(completedSecondsSum / completedCount / 60)
      : totalEvaluated > 0
      ? Math.round(totalSeconds / totalEvaluated / 60)
      : null;

    const longestMins = longestSeconds > 0 ? Math.round(longestSeconds / 60) : null;

    return {
      totalFocusedSeconds: totalSeconds,
      totalFocusedMinutes: totalMinutes,
      totalFocusedHours: totalHours,
      completedSessionsCount: completedCount,
      interruptedSessionsCount: interruptedCount,
      totalSessionsEvaluated: totalEvaluated,
      averageSessionDurationMinutes: avgMinutes,
      longestSessionMinutes: longestMins,
      hasData: totalEvaluated > 0,
    };
  }

  /**
   * Calculates focused minutes and completed session counts for today's date.
   */
  static calculateTodayStats(sessions: FocusSessionRecord[], todayStr: string = formatCalendarDate(new Date())): {
    focusedMinutesToday: number;
    completedSessionsToday: number;
  } {
    if (!sessions || sessions.length === 0) {
      return { focusedMinutesToday: 0, completedSessionsToday: 0 };
    }

    let focusedSeconds = 0;
    let completedCount = 0;

    for (const session of sessions) {
      if (session.date === todayStr) {
        if (session.status === 'completed' || session.status === 'interrupted') {
          focusedSeconds += Math.max(0, session.actualDurationSeconds);
        }
        if (session.status === 'completed') {
          completedCount++;
        }
      }
    }

    return {
      focusedMinutesToday: Math.round(focusedSeconds / 60),
      completedSessionsToday: completedCount,
    };
  }

  /**
   * Aggregates focus time by calendar date (YYYY-MM-DD).
   */
  static aggregateDailyFocus(sessions: FocusSessionRecord[]): DayFocusMetric[] {
    const map = new Map<string, { focusedSeconds: number; completedSessions: number }>();

    for (const s of sessions) {
      if (s.status !== 'completed' && s.status !== 'interrupted') continue;

      const date = s.date;
      const current = map.get(date) ?? { focusedSeconds: 0, completedSessions: 0 };
      current.focusedSeconds += Math.max(0, s.actualDurationSeconds);
      if (s.status === 'completed') {
        current.completedSessions += 1;
      }
      map.set(date, current);
    }

    const result: DayFocusMetric[] = [];
    for (const [date, val] of map.entries()) {
      result.push({
        date,
        focusedMinutes: Math.round(val.focusedSeconds / 60),
        completedSessions: val.completedSessions,
      });
    }

    return result.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Groups focus time by habit, mapping linkedHabitId to habit titles.
   */
  static aggregateByHabit(
    sessions: FocusSessionRecord[],
    habitTitleMap: Map<string, string>
  ): HabitFocusDistribution[] {
    const map = new Map<string, { title: string; seconds: number }>();
    let grandTotalSeconds = 0;

    for (const s of sessions) {
      if (s.status !== 'completed' && s.status !== 'interrupted') continue;

      const habitId = s.linkedHabitId ?? 'unlinked';
      const habitTitle = s.linkedHabitId
        ? (habitTitleMap.get(s.linkedHabitId) ?? 'General Habit')
        : 'Unlinked Focus';

      const current = map.get(habitId) ?? { title: habitTitle, seconds: 0 };
      current.seconds += Math.max(0, s.actualDurationSeconds);
      grandTotalSeconds += Math.max(0, s.actualDurationSeconds);
      map.set(habitId, current);
    }

    const result: HabitFocusDistribution[] = [];
    for (const [habitId, val] of map.entries()) {
      const mins = Math.round(val.seconds / 60);
      const pct = grandTotalSeconds > 0
        ? Math.round((val.seconds / grandTotalSeconds) * 100)
        : 0;
      result.push({
        habitId,
        habitTitle: val.title,
        focusedMinutes: mins,
        percentage: pct,
      });
    }

    return result.sort((a, b) => b.focusedMinutes - a.focusedMinutes);
  }

  /**
   * Groups focus time by session activity title.
   */
  static aggregateByActivity(sessions: FocusSessionRecord[]): ActivityFocusDistribution[] {
    const map = new Map<string, number>();
    let grandTotalSeconds = 0;

    for (const s of sessions) {
      if (s.status !== 'completed' && s.status !== 'interrupted') continue;

      const title = s.title.trim() || 'General Focus';
      const currentSecs = map.get(title) ?? 0;
      const addSecs = Math.max(0, s.actualDurationSeconds);
      map.set(title, currentSecs + addSecs);
      grandTotalSeconds += addSecs;
    }

    const result: ActivityFocusDistribution[] = [];
    for (const [title, seconds] of map.entries()) {
      const mins = Math.round(seconds / 60);
      const pct = grandTotalSeconds > 0
        ? Math.round((seconds / grandTotalSeconds) * 100)
        : 0;
      result.push({
        title,
        focusedMinutes: mins,
        percentage: pct,
      });
    }

    return result.sort((a, b) => b.focusedMinutes - a.focusedMinutes);
  }
}
