import { db } from '../../storage/db';
import { type Habit, type HabitLog } from '../domain/types';
import { type HabitStreakResult } from '../streak/streakTypes';
import { StreakEngine } from '../streak/streakEngine';
import { isScheduledDay } from './scheduleService';

export interface HabitDashboardItem {
  habit: Habit;
  isScheduledToday: boolean;
  log?: HabitLog;
  displayStatus: 'completed' | 'maintained' | 'setback' | 'missed' | 'pending' | 'rest_day';
  totalSuccessDays: number;
  streak: HabitStreakResult;
}

export interface DashboardMetrics {
  activeHabitsCount: number;
  activeStreaksCount: number;
  todayScheduledCount: number;
  completedTodayCount: number;
  pendingTodayCount: number;
  failedTodayCount: number;
  completionPercentage: number;
  allTimeLongestStreak: number;
  items: HabitDashboardItem[];
}

export class HabitDashboardService {
  /**
   * Computes actual dashboard statistics for a given local calendar date,
   * including true independent streak calculations for all habits.
   */
  static async getDashboardMetrics(dateStr: string): Promise<DashboardMetrics> {
    const activeHabits = await db.habits.where('status').equals('active').toArray();
    const todayLogs = await db.habitLogs.where('date').equals(dateStr).toArray();
    const logMap = new Map<string, HabitLog>(todayLogs.map((l) => [l.habitId, l]));

    // Batch calculate streaks for all active habits
    const streakMap = await StreakEngine.calculateStreaksForHabits(activeHabits, dateStr);

    let todayScheduledCount = 0;
    let completedTodayCount = 0;
    let failedTodayCount = 0;
    let pendingTodayCount = 0;
    let activeStreaksCount = 0;
    let allTimeLongestStreak = 0;

    const items: HabitDashboardItem[] = [];

    for (const habit of activeHabits) {
      const scheduled = isScheduledDay(habit.schedule, dateStr, habit.startDate, habit.endDate);
      const log = logMap.get(habit.id);
      const streak = streakMap.get(habit.id)!;

      if (streak.currentStreak > 0) {
        activeStreaksCount++;
      }
      if (streak.longestStreak > allTimeLongestStreak) {
        allTimeLongestStreak = streak.longestStreak;
      }

      let displayStatus: HabitDashboardItem['displayStatus'] = 'pending';

      if (!scheduled) {
        displayStatus = 'rest_day';
      } else {
        todayScheduledCount++;

        if (!log) {
          displayStatus = 'pending';
          pendingTodayCount++;
        } else if (log.status === 'completed') {
          displayStatus = habit.type === 'abstinence' ? 'maintained' : 'completed';
          completedTodayCount++;
        } else if (log.status === 'failed') {
          displayStatus = habit.type === 'abstinence' ? 'setback' : 'missed';
          failedTodayCount++;
        } else if (log.status === 'missed') {
          displayStatus = 'missed';
          failedTodayCount++;
        } else {
          displayStatus = 'rest_day';
        }
      }

      items.push({
        habit,
        isScheduledToday: scheduled,
        log,
        displayStatus,
        totalSuccessDays: streak.totalSuccessfulDays,
        streak
      });
    }

    const completionPercentage =
      todayScheduledCount > 0 ? Math.round((completedTodayCount / todayScheduledCount) * 100) : 0;

    return {
      activeHabitsCount: activeHabits.length,
      activeStreaksCount,
      todayScheduledCount,
      completedTodayCount,
      pendingTodayCount,
      failedTodayCount,
      completionPercentage,
      allTimeLongestStreak,
      items
    };
  }
}
