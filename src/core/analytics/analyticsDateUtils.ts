import { formatCalendarDate, parseCalendarDate } from '../utils';
import type { AnalyticsTimePreset } from './analyticsTypes';

/**
 * Adds or subtracts days from a YYYY-MM-DD date string using local calendar math.
 * Strictly avoids UTC conversion distortions.
 */
export function shiftCalendarDate(dateStr: string, deltaDays: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const dt = new Date(year, month - 1, day + deltaDays);
  return formatCalendarDate(dt);
}

/**
 * Computes an inclusive rolling window of `days` calendar days ending on `endDate`.
 * e.g. for endDate="2026-11-17" and days=30:
 * startDate is 29 days prior: "2026-10-19" (30 days inclusive: Oct 19 to Nov 17).
 */
export function getRollingWindow(
  endDate: string,
  days = 30
): { startDate: string; endDate: string; days: number } {
  const startDate = shiftCalendarDate(endDate, -(days - 1));
  return { startDate, endDate, days };
}

/**
 * Computes the immediately preceding window of identical duration.
 * e.g. for window 2026-10-19..2026-11-17 (30 days),
 * preceding window ends 2026-10-18 and begins 2026-09-19 (30 days).
 */
export function getPrecedingWindow(
  currentStartDate: string,
  days = 30
): { startDate: string; endDate: string; days: number } {
  const precedingEndDate = shiftCalendarDate(currentStartDate, -1);
  const precedingStartDate = shiftCalendarDate(precedingEndDate, -(days - 1));
  return { startDate: precedingStartDate, endDate: precedingEndDate, days };
}

/**
 * Resolves date range bounds for standard analytical time presets.
 */
export function getPresetDateRange(
  preset: AnalyticsTimePreset,
  evaluationDate: string
): { startDate: string; endDate: string } {
  switch (preset) {
    case '7d':
      return { startDate: shiftCalendarDate(evaluationDate, -6), endDate: evaluationDate };
    case '30d':
      return { startDate: shiftCalendarDate(evaluationDate, -29), endDate: evaluationDate };
    case '90d':
      return { startDate: shiftCalendarDate(evaluationDate, -89), endDate: evaluationDate };
    case '6m':
      return { startDate: shiftCalendarDate(evaluationDate, -179), endDate: evaluationDate };
    case '12m':
      return { startDate: shiftCalendarDate(evaluationDate, -364), endDate: evaluationDate };
    case 'custom':
    default:
      return { startDate: shiftCalendarDate(evaluationDate, -29), endDate: evaluationDate };
  }
}

/**
 * Returns weekday name for a date string (e.g. "Monday", "Wednesday").
 */
export function getWeekdayName(dateStr: string): string {
  const dt = parseCalendarDate(dateStr);
  return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(dt);
}

/**
 * Returns formatted short month label (e.g. "Nov 2026").
 */
export function getMonthYearLabel(year: number, month: number): string {
  const dt = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(dt);
}
