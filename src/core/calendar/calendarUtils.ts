import { formatCalendarDate } from '../utils';
import type { CalendarDayStatus } from './calendarTypes';

/**
 * Returns total days in a specific calendar month (1-12) respecting leap years.
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Returns ISO date range for a given month (month is 1-12).
 */
export function getMonthDateRange(year: number, month: number): { startDate: string; endDate: string } {
  const paddedMonth = String(month).padStart(2, '0');
  const daysInMonth = getDaysInMonth(year, month);
  const paddedLastDay = String(daysInMonth).padStart(2, '0');

  return {
    startDate: `${year}-${paddedMonth}-01`,
    endDate: `${year}-${paddedMonth}-${paddedLastDay}`
  };
}

/**
 * Returns ISO date range for an entire calendar year.
 */
export function getYearDateRange(year: number): { startDate: string; endDate: string } {
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`
  };
}

/**
 * Single cell in a standard calendar grid.
 */
export interface CalendarGridCell {
  date: string; // YYYY-MM-DD
  dayOfMonth: number;
  month: number; // 1-12
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
}

/**
 * Generates the full 7-column calendar matrix for a month (including previous and next month buffer days).
 * @param year e.g. 2026
 * @param month 1-12
 * @param weekStartsOn 0 for Sunday, 1 for Monday (default: 0)
 * @param todayStr Optional ISO today string for deterministic testing
 */
export function getMonthMatrix(
  year: number,
  month: number,
  weekStartsOn: 0 | 1 = 0,
  todayStr = formatCalendarDate(new Date())
): CalendarGridCell[] {
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = getDaysInMonth(year, month);

  // Day of week for first day (0=Sun, 6=Sat)
  let firstDayOfWeek = firstDayOfMonth.getDay();
  if (weekStartsOn === 1) {
    // Shift Sunday (0) to 7 so Monday is 0
    firstDayOfWeek = (firstDayOfWeek + 6) % 7;
  }

  const cells: CalendarGridCell[] = [];

  // 1. Previous month padding days
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonthTotalDays = getDaysInMonth(prevYear, prevMonth);

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthTotalDays - i;
    const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(prevYear, prevMonth - 1, day);

    cells.push({
      date: dateStr,
      dayOfMonth: day,
      month: prevMonth,
      year: prevYear,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      dayOfWeek: dateObj.getDay()
    });
  }

  // 2. Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(year, month - 1, day);

    cells.push({
      date: dateStr,
      dayOfMonth: day,
      month,
      year,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      dayOfWeek: dateObj.getDay()
    });
  }

  // 3. Next month padding days to complete standard rows (multiples of 7, usually 35 or 42 cells)
  const remainingCells = (7 - (cells.length % 7)) % 7;
  const targetTotal = cells.length + remainingCells < 35 ? 35 : cells.length + remainingCells;
  const nextMonthPadding = targetTotal - cells.length;

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  for (let day = 1; day <= nextMonthPadding; day++) {
    const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(nextYear, nextMonth - 1, day);

    cells.push({
      date: dateStr,
      dayOfMonth: day,
      month: nextMonth,
      year: nextYear,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      dayOfWeek: dateObj.getDay()
    });
  }

  return cells;
}

/**
 * Calculates contribution heatmap intensity level (-1 to 4).
 * -1: Rest / unscheduled / future / paused
 *  0: Missed / failed (0% adherence with scheduled commitments)
 *  1: 1% to 39% adherence (or pending with no failures)
 *  2: 40% to 74% adherence
 *  3: 75% to 99% adherence
 *  4: 100% adherence (Flawless sovereign discipline)
 */
export function calculateIntensityLevel(
  status: CalendarDayStatus,
  completionPercentage: number | null
): -1 | 0 | 1 | 2 | 3 | 4 {
  if (status === 'rest' || status === 'future' || status === 'paused') {
    return -1;
  }

  if (status === 'failed') {
    return 0;
  }

  if (status === 'pending') {
    return 1;
  }

  if (completionPercentage === null) {
    return -1;
  }

  if (completionPercentage <= 0) {
    return 0;
  }
  if (completionPercentage < 40) {
    return 1;
  }
  if (completionPercentage < 75) {
    return 2;
  }
  if (completionPercentage < 100) {
    return 3;
  }
  return 4; // 100%
}

/**
 * Calculates the ISO week number for a calendar date.
 */
export function getWeekNumber(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year.
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

/**
 * Generates month names array.
 */
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const;

/**
 * Returns formatted month and year label (e.g. "November 2026").
 */
export function formatMonthYearLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}
