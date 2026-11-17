import type { HabitCategory, HabitType, HabitStatus, HabitLog } from '../domain/types';

/**
 * High-level semantic state for a calendar day.
 */
export type CalendarDayStatus =
  | 'complete'            // 100% of applicable scheduled commitments completed
  | 'partial'             // Some scheduled completed, others failed/missed, or completed with pending
  | 'failed'              // Applicable commitments failed or were missed (0% adherence)
  | 'pending'             // Current day scheduled commitments awaiting evaluation / check-in
  | 'rest'                // No scheduled commitments for this day
  | 'paused'              // All scheduled commitments were excluded due to official pause
  | 'future';             // Date is strictly after the evaluation date

/**
 * Detailed adherence status for an individual habit on a specific date.
 */
export interface DayHabitDetail {
  habitId: string;
  habitTitle: string;
  habitName: string; // Alias for backward-compatibility
  habitCategory: HabitCategory | string;
  habitType: HabitType;
  isScheduled: boolean;
  isPaused: boolean;
  isLifecycleActive: boolean; // false if date is before habit.startDate or after habit.endDate
  status: 'completed' | 'failed' | 'missed' | 'pending' | 'paused' | 'unscheduled' | 'future';
  log?: HabitLog;
  targetValue?: number;
  targetUnit?: string;
  targetCondition?: 'at_least' | 'at_most';
  recordedValue?: number;
  streakImpact: '+1 Increment' | 'Resets to 0' | 'No Impact';
  reflectionNote?: string;
}

/**
 * Comprehensive daily discipline summary for a single calendar date.
 */
export interface DailyDisciplineSummary {
  date: string; // YYYY-MM-DD
  status: CalendarDayStatus;
  
  // Habit counts
  totalApplicableHabits: number;
  scheduledCount: number;
  evaluatedScheduledCount: number; // completed + failed + missed (excludes pending, paused, unscheduled)
  completedCount: number;
  failedCount: number;
  missedCount: number;
  pendingCount: number;
  pausedCount: number;
  unscheduledCount: number;

  // Percentage: Completed / EvaluatedScheduled * 100 (null if evaluatedScheduledCount === 0)
  completionPercentage: number | null;
  hasPending: boolean;

  // Granular habit details
  habits: DayHabitDetail[];
}

/**
 * Date range filter for queries.
 */
export interface CalendarDateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

/**
 * Filter configuration for calendar aggregation.
 */
export interface CalendarFilters {
  habitIds?: string[];                           // specific habit IDs (empty/undefined = all)
  categories?: (HabitCategory | string)[];       // filter by habit category
  trackingTypes?: HabitType[];                   // abstinence, completion, quantitative
  lifecycleStatuses?: HabitStatus[];             // active, paused, archived
}

/**
 * Analytics summary for a selected month or date range.
 */
export interface MonthlySummaryMetrics {
  monthLabel: string;
  year: number;
  month: number; // 1-12
  totalScheduledCommitments: number;
  totalCompletedCommitments: number;
  totalFailedCommitments: number;
  totalMissedCommitments: number;
  averageCompletionPercentage: number;
  totalSuccessfulDays: number; // Days where day status === 'complete'
  totalEvaluatedDays: number;  // Days where evaluatedScheduledCount > 0
  bestConsistencyDay?: {
    date: string;
    percentage: number;
    completedCount: number;
    scheduledCount: number;
  };
  bestConsistencyWeek?: {
    weekNumber: number;
    startDate: string;
    endDate: string;
    percentage: number;
  };
}

/**
 * Single cell data in the discipline contribution heatmap.
 */
export interface HeatmapDayData {
  date: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  weekIndex: number; // Column index (0 to ~52)
  status: CalendarDayStatus;
  intensity: -1 | 0 | 1 | 2 | 3 | 4; // -1: rest/unscheduled, 0: failed/missed, 1: 1-39%, 2: 40-74%, 3: 75-99%, 4: 100%
  completionPercentage: number | null;
  completedCount: number;
  scheduledCount: number;
  hasPending: boolean;
}

/**
 * Calendar view modes.
 */
export type CalendarViewMode = 'monthly' | 'heatmap' | 'habit_detail';
