import type { HabitSchedule } from '../domain/types';
import { parseCalendarDate } from '../utils';

/**
 * Checks if a specific local calendar date (YYYY-MM-DD) is scheduled for a habit.
 * 
 * Rules:
 * 1. Date must be on or after startDate (YYYY-MM-DD).
 * 2. If endDate (YYYY-MM-DD) is specified, date must be on or before endDate.
 * 3. If frequency is 'daily', every day is scheduled.
 * 4. If frequency is 'selected_days', date's local day-of-week (0=Sun, 6=Sat) must be in selectedDays.
 */
export function isScheduledDay(
  schedule: HabitSchedule,
  dateStr: string,
  startDate: string,
  endDate?: string
): boolean {
  // Check bounds
  if (dateStr < startDate) {
    return false;
  }
  if (endDate && dateStr > endDate) {
    return false;
  }

  if (schedule.frequency === 'daily') {
    return true;
  }

  if (schedule.frequency === 'selected_days') {
    const dateObj = parseCalendarDate(dateStr);
    const dayOfWeek = dateObj.getDay(); // 0 is Sunday, 6 is Saturday
    return schedule.selectedDays.includes(dayOfWeek);
  }

  return false;
}

/**
 * Returns user-friendly schedule summary (e.g. "Every Day", "Mon, Wed, Fri", "Weekdays", "Weekends")
 */
export function formatScheduleSummary(schedule: HabitSchedule): string {
  if (schedule.frequency === 'daily' || schedule.selectedDays.length === 7) {
    return 'Every day';
  }

  const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const sorted = [...schedule.selectedDays].sort((a, b) => a - b);

  // Check common patterns
  const isWeekdays = sorted.length === 5 && [1, 2, 3, 4, 5].every((d) => sorted.includes(d));
  if (isWeekdays) return 'Weekdays (Mon–Fri)';

  const isWeekends = sorted.length === 2 && [0, 6].every((d) => sorted.includes(d));
  if (isWeekends) return 'Weekends (Sat, Sun)';

  return sorted.map((d) => daysMap[d]).join(', ');
}
