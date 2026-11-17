import { parseCalendarDate } from '../utils';
import type {
  DailyAdherencePoint,
  HabitPerformanceMetric,
  ConsistencyInsight
} from './analyticsTypes';

export class ConsistencyInsightsService {
  /**
   * Derives transparent, sample-size bounded insights from verified adherence data.
   * Completely avoids psychological jargon or shame.
   */
  static generateInsights(
    dailyPoints: DailyAdherencePoint[],
    habitMetrics: HabitPerformanceMetric[]
  ): ConsistencyInsight[] {
    const insights: ConsistencyInsight[] = [];

    // 1. Weekday Consistency Analysis (Requires at least 5 evaluated commitments per day to report)
    const weekdayBuckets = new Map<number, { dayName: string; completed: number; evaluated: number }>();
    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const sampleDate = new Date(2026, 10, 15 + dayIdx); // 15 Nov 2026 was Sunday
      weekdayBuckets.set(dayIdx, {
        dayName: new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(sampleDate),
        completed: 0,
        evaluated: 0
      });
    }

    for (const point of dailyPoints) {
      if (point.evaluatedCount > 0) {
        const dt = parseCalendarDate(point.date);
        const dayIdx = dt.getDay();
        const bucket = weekdayBuckets.get(dayIdx);
        if (bucket) {
          bucket.completed += point.completedCount;
          bucket.evaluated += point.evaluatedCount;
        }
      }
    }

    const eligibleWeekdays = Array.from(weekdayBuckets.values())
      .filter((b) => b.evaluated >= 5)
      .map((b) => ({
        ...b,
        rate: Math.round((b.completed / b.evaluated) * 100)
      }))
      .sort((a, b) => b.rate - a.rate);

    if (eligibleWeekdays.length >= 2) {
      const strongest = eligibleWeekdays[0];
      const weakest = eligibleWeekdays[eligibleWeekdays.length - 1];

      insights.push({
        id: 'strongest-day',
        type: 'strongest_day',
        title: `Strongest Commitment Day: ${strongest.dayName}`,
        description: `Your ${strongest.dayName} commitments reached ${strongest.rate}% adherence across ${strongest.evaluated} evaluated commitments.`,
        metricValue: `${strongest.rate}%`,
        sampleSize: strongest.evaluated,
        isPositive: true
      });

      if (weakest.rate < strongest.rate) {
        insights.push({
          id: 'weakest-day',
          type: 'weakest_day',
          title: `Lowest Adherence Day: ${weakest.dayName}`,
          description: `Your ${weakest.dayName} commitments averaged ${weakest.rate}% adherence across ${weakest.evaluated} evaluated commitments. Identifies the weekday with the lowest historical fulfillment rate.`,
          metricValue: `${weakest.rate}%`,
          sampleSize: weakest.evaluated,
          isPositive: false
        });
      }
    }

    // 2. Top Performing Habit (Requires >= 5 evaluated commitments)
    const eligibleHabits = habitMetrics.filter(
      (h) => h.evaluatedCount >= 5 && h.completionPercentage !== null
    );

    if (eligibleHabits.length > 0) {
      const topHabit = eligibleHabits[0]; // Already sorted by completion %
      insights.push({
        id: 'top-habit',
        type: 'top_habit',
        title: `Most Consistent Habit: ${topHabit.habitTitle}`,
        description: `Leading all commitments with ${topHabit.completionPercentage}% consistency over ${topHabit.evaluatedCount} evaluated days (${topHabit.currentStreak}d current streak).`,
        metricValue: `${topHabit.completionPercentage}%`,
        sampleSize: topHabit.evaluatedCount,
        isPositive: true
      });

      // 3. Most Improved Habit
      const improvingHabits = habitMetrics.filter(
        (h) => h.percentageDelta !== null && h.percentageDelta >= 5 && h.evaluatedCount >= 5
      );
      if (improvingHabits.length > 0) {
        const mostImproved = improvingHabits.sort((a, b) => (b.percentageDelta || 0) - (a.percentageDelta || 0))[0];
        insights.push({
          id: 'improving-habit',
          type: 'improving_habit',
          title: `Strong Momentum: ${mostImproved.habitTitle}`,
          description: `Adherence climbed by +${mostImproved.percentageDelta}% compared to the previous period (${mostImproved.completionPercentage}% current).`,
          metricValue: `+${mostImproved.percentageDelta}%`,
          sampleSize: mostImproved.evaluatedCount,
          isPositive: true
        });
      }

      // 4. Declining Habit Alert
      const decliningHabits = habitMetrics.filter(
        (h) => h.percentageDelta !== null && h.percentageDelta <= -5 && h.evaluatedCount >= 5
      );
      if (decliningHabits.length > 0) {
        const mostDeclining = decliningHabits.sort((a, b) => (a.percentageDelta || 0) - (b.percentageDelta || 0))[0];
        insights.push({
          id: 'declining-habit',
          type: 'declining_habit',
          title: `Needs Attention: ${mostDeclining.habitTitle}`,
          description: `Adherence declined by ${mostDeclining.percentageDelta}% compared to the preceding period. Review schedule balance or routine consistency.`,
          metricValue: `${mostDeclining.percentageDelta}%`,
          sampleSize: mostDeclining.evaluatedCount,
          isPositive: false
        });
      }
    }

    return insights;
  }
}
