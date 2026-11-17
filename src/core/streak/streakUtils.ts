import type { HabitSchedule } from '../domain/types';
import type { PausedDateRange } from './streakTypes';
import { isScheduledDay } from '../services/scheduleService';
import { formatCalendarDate } from '../utils';

/**
 * Add or subtract calendar days from an ISO date string (YYYY-MM-DD)
 * without timezone distortion.
 */
export function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day + days);
  return formatCalendarDate(date);
}

/**
 * Lexicographical calendar date comparison (returns -1 if a < b, 1 if a > b, 0 if equal).
 */
export function compareDates(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Checks if date falls within [startDate, endDate] inclusive.
 */
export function isDateInRange(dateStr: string, startDate: string, endDate?: string): boolean {
  if (dateStr < startDate) return false;
  if (endDate && dateStr > endDate) return false;
  return true;
}

/**
 * Check if a date falls inside any paused range.
 */
export function isDateInPausedRanges(dateStr: string, pausedRanges?: PausedDateRange[]): boolean {
  if (!pausedRanges || pausedRanges.length === 0) return false;

  for (const range of pausedRanges) {
    if (dateStr >= range.startDate) {
      if (!range.endDate || dateStr <= range.endDate) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Generates an array of all continuous YYYY-MM-DD dates between start and end (inclusive).
 */
export function getDateSequence(startDate: string, endDate: string): string[] {
  if (startDate > endDate) return [];

  const dates: string[] = [];
  let current = startDate;

  while (current <= endDate) {
    dates.push(current);
    current = addDays(current, 1);
  }

  return dates;
}

/**
 * Finds the next scheduled date strictly after `fromDate`.
 */
export function getNextScheduledDate(
  schedule: HabitSchedule,
  fromDate: string,
  startDate: string,
  endDate?: string,
  pausedRanges?: PausedDateRange[],
  maxDays = 365
): string | undefined {
  let probe = addDays(fromDate, 1);
  let count = 0;

  while (count < maxDays) {
    if (endDate && probe > endDate) {
      return undefined;
    }

    const scheduled = isScheduledDay(schedule, probe, startDate, endDate);
    const paused = isDateInPausedRanges(probe, pausedRanges);

    if (scheduled && !paused) {
      return probe;
    }

    probe = addDays(probe, 1);
    count++;
  }

  return undefined;
}
