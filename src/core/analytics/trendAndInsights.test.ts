import { describe, it, expect } from 'vitest';
import { TrendAnalysisService } from './trendAnalysisService';
import { ConsistencyInsightsService } from './consistencyInsightsService';
import type { DailyAdherencePoint, HabitPerformanceMetric } from './analyticsTypes';

describe('TrendAnalysisService & ConsistencyInsightsService', () => {
  describe('TrendAnalysisService', () => {
    it('groups daily points into 7-day weekly adherence periods', () => {
      const mockDaily: DailyAdherencePoint[] = [
        { date: '2026-11-01', displayDate: 'Nov 1', completedCount: 2, failedCount: 0, missedCount: 0, evaluatedCount: 2, completionPercentage: 100, rolling30Score: 100 },
        { date: '2026-11-02', displayDate: 'Nov 2', completedCount: 2, failedCount: 0, missedCount: 0, evaluatedCount: 2, completionPercentage: 100, rolling30Score: 100 },
        { date: '2026-11-03', displayDate: 'Nov 3', completedCount: 1, failedCount: 1, missedCount: 0, evaluatedCount: 2, completionPercentage: 50, rolling30Score: 83 },
        { date: '2026-11-04', displayDate: 'Nov 4', completedCount: 2, failedCount: 0, missedCount: 0, evaluatedCount: 2, completionPercentage: 100, rolling30Score: 88 },
        { date: '2026-11-05', displayDate: 'Nov 5', completedCount: 2, failedCount: 0, missedCount: 0, evaluatedCount: 2, completionPercentage: 100, rolling30Score: 90 },
        { date: '2026-11-06', displayDate: 'Nov 6', completedCount: 2, failedCount: 0, missedCount: 0, evaluatedCount: 2, completionPercentage: 100, rolling30Score: 92 },
        { date: '2026-11-07', displayDate: 'Nov 7', completedCount: 2, failedCount: 0, missedCount: 0, evaluatedCount: 2, completionPercentage: 100, rolling30Score: 93 }
      ];

      const weekly = TrendAnalysisService.buildWeeklyAdherenceSeries(mockDaily);
      expect(weekly).toHaveLength(1);
      // Completed: 13, Evaluated: 14 -> 13/14 = 92.8% -> 93%
      expect(weekly[0].completedCount).toBe(13);
      expect(weekly[0].evaluatedCount).toBe(14);
      expect(weekly[0].completionPercentage).toBe(93);
    });

    it('groups daily points across calendar months accurately', () => {
      const mockDaily: DailyAdherencePoint[] = [
        { date: '2026-10-31', displayDate: 'Oct 31', completedCount: 1, failedCount: 0, missedCount: 0, evaluatedCount: 1, completionPercentage: 100, rolling30Score: 100 },
        { date: '2026-11-01', displayDate: 'Nov 1', completedCount: 2, failedCount: 0, missedCount: 0, evaluatedCount: 2, completionPercentage: 100, rolling30Score: 100 }
      ];

      const monthly = TrendAnalysisService.buildMonthlyAdherenceSeries(mockDaily);
      expect(monthly).toHaveLength(2);
      expect(monthly[0].monthLabel).toBe('Oct 2026');
      expect(monthly[0].completedCount).toBe(1);
      expect(monthly[1].monthLabel).toBe('Nov 2026');
      expect(monthly[1].completedCount).toBe(2);
    });
  });

  describe('ConsistencyInsightsService', () => {
    it('identifies strongest and weakest days with sufficient sample size (>= 5)', () => {
      // 14 days of data: 2 Sundays, 2 Mondays, etc.
      const dailyPoints: DailyAdherencePoint[] = [];

      // 14 days starting on Sunday 2026-11-01
      for (let i = 0; i < 14; i++) {
        const dt = new Date(2026, 10, 1 + i);
        const dayIdx = dt.getDay(); // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
        const dStr = `2026-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

        // Wednesdays (3) have 3 completed out of 3 evaluated (100%)
        // Saturdays (6) have 0 completed out of 3 evaluated (0%)
        // Other days have 2 completed out of 3 evaluated (67%)
        let completed = 2;
        const evaluated = 3;
        if (dayIdx === 3) completed = 3; // 100% on Wed
        if (dayIdx === 6) completed = 0; // 0% on Sat

        dailyPoints.push({
          date: dStr,
          displayDate: dStr,
          completedCount: completed,
          failedCount: evaluated - completed,
          missedCount: 0,
          evaluatedCount: evaluated,
          completionPercentage: Math.round((completed / evaluated) * 100),
          rolling30Score: 80
        });
      }

      // Sample size for each weekday across 14 days is 2 * 3 = 6 commitments (>= 5 eligible)
      const insights = ConsistencyInsightsService.generateInsights(dailyPoints, []);

      expect(insights.length).toBeGreaterThanOrEqual(1);
      const strongest = insights.find((ins) => ins.type === 'strongest_day');
      expect(strongest).toBeDefined();
      expect(strongest?.title).toContain('Wednesday');

      const weakest = insights.find((ins) => ins.type === 'weakest_day');
      expect(weakest).toBeDefined();
      expect(weakest?.title).toContain('Saturday');
    });

    it('identifies top performing, improving, and declining habits with sample bounds', () => {
      const mockHabits: HabitPerformanceMetric[] = [
        {
          habitId: 'h-1',
          habitTitle: 'Deep Craft',
          habitCategory: 'craft',
          habitType: 'completion',
          currentStreak: 20,
          longestStreak: 25,
          scheduledCount: 15,
          completedCount: 14,
          failedCount: 1,
          missedCount: 0,
          evaluatedCount: 15,
          completionPercentage: 93,
          previousCompletionPercentage: 80,
          percentageDelta: 13,
          recentTrend: 'improving'
        },
        {
          habitId: 'h-2',
          habitTitle: 'Workout Routine',
          habitCategory: 'body',
          habitType: 'completion',
          currentStreak: 2,
          longestStreak: 12,
          scheduledCount: 12,
          completedCount: 7,
          failedCount: 5,
          missedCount: 0,
          evaluatedCount: 12,
          completionPercentage: 58,
          previousCompletionPercentage: 75,
          percentageDelta: -17,
          recentTrend: 'declining'
        }
      ];

      const insights = ConsistencyInsightsService.generateInsights([], mockHabits);

      const topHabit = insights.find((ins) => ins.type === 'top_habit');
      expect(topHabit).toBeDefined();
      expect(topHabit?.title).toContain('Deep Craft');

      const improving = insights.find((ins) => ins.type === 'improving_habit');
      expect(improving).toBeDefined();
      expect(improving?.metricValue).toBe('+13%');

      const declining = insights.find((ins) => ins.type === 'declining_habit');
      expect(declining).toBeDefined();
      expect(declining?.metricValue).toBe('-17%');
    });
  });
});
