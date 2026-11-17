import type { DailyDisciplineSummary, CalendarDayStatus, HeatmapDayData } from './calendarTypes';
import { calculateIntensityLevel } from './calendarUtils';

/**
 * Transforms a Map or Array of DailyDisciplineSummary items into HeatmapDayData format.
 */
export function selectHeatmapData(
  summaries: Map<string, DailyDisciplineSummary> | DailyDisciplineSummary[]
): HeatmapDayData[] {
  const list = Array.isArray(summaries) ? summaries : Array.from(summaries.values());

  return list.map((item, index) => {
    const [year, month, day] = item.date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay();

    return {
      date: item.date,
      dayOfWeek,
      weekIndex: Math.floor(index / 7),
      status: item.status,
      intensity: calculateIntensityLevel(item.status, item.completionPercentage),
      completionPercentage: item.completionPercentage,
      completedCount: item.completedCount,
      scheduledCount: item.scheduledCount,
      hasPending: item.hasPending
    };
  });
}

/**
 * Filter daily summaries by status.
 */
export function selectDaysByStatus(
  summaries: Map<string, DailyDisciplineSummary> | DailyDisciplineSummary[],
  status: CalendarDayStatus
): DailyDisciplineSummary[] {
  const list = Array.isArray(summaries) ? summaries : Array.from(summaries.values());
  return list.filter((s) => s.status === status);
}
