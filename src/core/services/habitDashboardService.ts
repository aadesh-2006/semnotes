import { db } from '../../storage/db';
import { type Habit, type HabitLog } from '../domain/types';
import { isScheduledDay } from './scheduleService';

export interface HabitDashboardItem {
  habit: Habit;
  isScheduledToday: boolean;
  log?: HabitLog;
  displayStatus: 'completed' | 'maintained' | 'setback' | 'missed' | 'pending' | 'rest_day';
  totalSuccessDays: number;
}

export interface DashboardMetrics {
  activeHabitsCount: number;
  todayScheduledCount: number;
  completedTodayCount: number;
  pendingTodayCount: number;
  failedTodayCount: number;
  completionPercentage: number;
  items: HabitDashboardItem[];
}

export class HabitDashboardService {
  /**
   * Computes actual dashboard statistics for a given local calendar date.
   * Derived purely from Dexie database records without synthetic placeholders.
   */
  static async getDashboardMetrics(dateStr: string): Promise<DashboardMetrics> {
    const activeHabits = await db.habits.where('status').equals('active').toArray();
    const todayLogs = await db.habitLogs.where('date').equals(dateStr).toArray();
    const logMap = new Map<string, HabitLog>(todayLogs.map((l) => [l.habitId, l]));

    let todayScheduledCount = 0;
    let completedTodayCount = 0;
    let failedTodayCount = 0;
    let pendingTodayCount = 0;

    const items: HabitDashboardItem[] = [];

    for (const habit of activeHabits) {
      const scheduled = isScheduledDay(habit.schedule, dateStr, habit.startDate, habit.endDate);
      const log = logMap.get(habit.id);

      // Count total actual completed records for this habit
      const totalSuccessDays = await db.habitLogs
        .where('habitId')
        .equals(habit.id)
        .filter((l) => l.status === 'completed')
        .count();

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
        totalSuccessDays
      });
    }

    const completionPercentage =
      todayScheduledCount > 0 ? Math.round((completedTodayCount / todayScheduledCount) * 100) : 0;

    return {
      activeHabitsCount: activeHabits.length,
      todayScheduledCount,
      completedTodayCount,
      pendingTodayCount,
      failedTodayCount,
      completionPercentage,
      items
    };
  }
}
