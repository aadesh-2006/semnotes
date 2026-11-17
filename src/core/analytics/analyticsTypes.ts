import { z } from 'zod';
import type { HabitCategory, HabitType, HabitStatus } from '../domain/types';

// ==========================================
// 1. Discipline Score Result
// ==========================================

export const AdherenceGradeSchema = z.enum([
  'sovereign',         // >= 90%
  'disciplined',       // 75% - 89%
  'stable',            // 60% - 74%
  'vulnerable',        // < 60%
  'insufficient_data'  // 0 evaluated commitments
]);
export type AdherenceGrade = z.infer<typeof AdherenceGradeSchema>;

export interface DisciplineScoreResult {
  score: number | null; // null if totalEvaluated === 0
  hasSufficientData: boolean;
  windowStartDate: string; // YYYY-MM-DD
  windowEndDate: string;   // YYYY-MM-DD
  windowDays: number;      // 30
  totalCompleted: number;
  totalFailed: number;
  totalMissed: number;
  totalPending: number;
  totalPaused: number;
  totalUnscheduled: number;
  totalEvaluated: number;  // completed + failed + missed
  precedingScore: number | null;
  scoreDelta: number | null; // score - precedingScore
  adherenceGrade: AdherenceGrade;
}

// ==========================================
// 2. Habit Performance Metric
// ==========================================

export const HabitTrendSchema = z.enum([
  'improving',         // delta >= +5%
  'declining',         // delta <= -5%
  'stable',            // -5% < delta < +5%
  'insufficient_data'
]);
export type HabitTrend = z.infer<typeof HabitTrendSchema>;

export interface HabitPerformanceMetric {
  habitId: string;
  habitTitle: string;
  habitCategory: HabitCategory | string;
  habitType: HabitType;
  currentStreak: number;
  longestStreak: number;
  scheduledCount: number;
  completedCount: number;
  failedCount: number;
  missedCount: number;
  evaluatedCount: number;
  completionPercentage: number | null;
  previousCompletionPercentage: number | null;
  percentageDelta: number | null;
  recentTrend: HabitTrend;
}

// ==========================================
// 3. Category Performance Metric
// ==========================================

export interface CategoryPerformanceMetric {
  category: HabitCategory | string;
  totalHabits: number;
  totalEvaluated: number;
  totalCompleted: number;
  totalFailedOrMissed: number;
  completionPercentage: number | null;
  percentageDelta: number | null;
}

// ==========================================
// 4. Trend Data Points
// ==========================================

export interface DailyAdherencePoint {
  date: string; // YYYY-MM-DD
  displayDate: string; // e.g. "Nov 17"
  completionPercentage: number | null;
  completedCount: number;
  failedCount: number;
  missedCount: number;
  evaluatedCount: number;
  rolling30Score: number | null;
}

export interface WeeklyAdherencePoint {
  weekLabel: string; // e.g. "W46"
  startDate: string;
  endDate: string;
  completionPercentage: number | null;
  completedCount: number;
  failedCount: number;
  missedCount: number;
  evaluatedCount: number;
}

export interface MonthlyAdherencePoint {
  monthLabel: string; // e.g. "Nov 2026"
  year: number;
  month: number;
  completionPercentage: number | null;
  completedCount: number;
  evaluatedCount: number;
}

// ==========================================
// 5. Consistency Insights
// ==========================================

export interface ConsistencyInsight {
  id: string;
  type:
    | 'strongest_day'
    | 'weakest_day'
    | 'top_habit'
    | 'improving_habit'
    | 'declining_habit'
    | 'setback_recovery'
    | 'general';
  title: string;
  description: string;
  metricValue: string | number;
  sampleSize: number;
  isPositive: boolean;
}

// ==========================================
// 6. Setback & Recovery Metrics
// ==========================================

export interface SetbackRecoveryMetric {
  totalSetbacks: number; // failed + missed
  recoveredNextDayCount: number;
  nextDayRecoveryRate: number | null; // percentage
  habitsWithRecurringMisses: {
    habitId: string;
    habitTitle: string;
    missCount: number;
  }[];
}

// ==========================================
// 7. Analytics Filter Configuration
// ==========================================

export type AnalyticsTimePreset = '7d' | '30d' | '90d' | '6m' | '12m' | 'custom';

export interface AnalyticsFilterCriteria {
  preset: AnalyticsTimePreset;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  selectedHabitId?: string;
  selectedCategory?: string;
  lifecycleStatus?: HabitStatus;
}
