import type { HabitLog } from '../domain/types';

export interface StreakRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  length: number;    // count of scheduled successes
}

export type TodayHabitStatus =
  | 'completed'
  | 'failed'
  | 'missed'
  | 'pending'
  | 'rest_day'
  | 'paused';

export type StreakStatus =
  | 'active'     // Streak maintained and healthy
  | 'at_risk'    // Scheduled today, streak > 0, but pending check-in
  | 'broken'     // Missed or failed latest scheduled commitment
  | 'paused'     // Habit is paused
  | 'unstarted'; // No successful check-ins yet

export interface DayStreakRecord {
  date: string; // YYYY-MM-DD
  isScheduled: boolean;
  isPaused: boolean;
  status: 'completed' | 'failed' | 'missed' | 'skipped' | 'pending';
  log?: HabitLog;
  contributesToStreak: boolean;
  breaksStreak: boolean;
}

export interface HabitStreakResult {
  habitId: string;
  currentStreak: number;
  longestStreak: number;
  totalSuccessfulDays: number;
  totalFailedDays: number;
  totalMissedDays: number;
  totalScheduledDays: number;
  currentStreakStartDate?: string;
  longestStreakRange?: StreakRange;
  lastSuccessfulDate?: string;
  nextScheduledDate?: string;
  successPercentage: number;
  todayStatus: TodayHabitStatus;
  streakStatus: StreakStatus;
  timeline: DayStreakRecord[];
}

export interface PausedDateRange {
  startDate: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD (undefined means still paused)
}

export interface StreakCalculationOptions {
  evaluationDate?: string; // YYYY-MM-DD (defaults to current local date)
  pausedRanges?: PausedDateRange[];
  cachedLongestStreak?: number; // Preserves historical all-time longest streak if provided
}
