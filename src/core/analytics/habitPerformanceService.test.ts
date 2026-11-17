import { describe, it, expect } from 'vitest';
import { HabitPerformanceService } from './habitPerformanceService';
import type { Habit, HabitLog, AuditRecord } from '../domain/types';

describe('HabitPerformanceService', () => {
  const dummyHabit1: Habit = {
    id: 'h-1',
    title: 'Daily Meditation',
    category: 'mind',
    type: 'completion',
    schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
    startDate: '2026-11-01',
    status: 'active',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    sortOrder: 0
  };

  const dummyHabit2: Habit = {
    id: 'h-2',
    title: 'MWF Strength Training',
    category: 'body',
    type: 'completion',
    schedule: { frequency: 'selected_days', selectedDays: [1, 3, 5] },
    startDate: '2026-11-01',
    status: 'active',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    sortOrder: 1
  };

  const dummyHabit3: Habit = {
    id: 'h-3',
    title: 'Digital Purity',
    category: 'abstinence',
    type: 'abstinence',
    schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
    startDate: '2026-11-01',
    status: 'active',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    sortOrder: 2
  };

  it('calculates habit adherence respecting schedule differences without inflating denominators', () => {
    // 7 days window: 2026-11-09 (Mon) to 2026-11-15 (Sun)
    // h-1 (daily) has 7 scheduled days
    // h-2 (MWF) has 3 scheduled days (Mon 9, Wed 11, Fri 13)
    const logs: HabitLog[] = [
      // h-1 completed all 7 days
      { id: '1', habitId: 'h-1', date: '2026-11-09', status: 'completed', createdAt: '', updatedAt: '' },
      { id: '2', habitId: 'h-1', date: '2026-11-10', status: 'completed', createdAt: '', updatedAt: '' },
      { id: '3', habitId: 'h-1', date: '2026-11-11', status: 'completed', createdAt: '', updatedAt: '' },
      { id: '4', habitId: 'h-1', date: '2026-11-12', status: 'completed', createdAt: '', updatedAt: '' },
      { id: '5', habitId: 'h-1', date: '2026-11-13', status: 'completed', createdAt: '', updatedAt: '' },
      { id: '6', habitId: 'h-1', date: '2026-11-14', status: 'completed', createdAt: '', updatedAt: '' },
      { id: '7', habitId: 'h-1', date: '2026-11-15', status: 'completed', createdAt: '', updatedAt: '' },

      // h-2 completed Mon and Wed, missed Fri
      { id: '8', habitId: 'h-2', date: '2026-11-09', status: 'completed', createdAt: '', updatedAt: '' },
      { id: '9', habitId: 'h-2', date: '2026-11-11', status: 'completed', createdAt: '', updatedAt: '' },
      { id: '10', habitId: 'h-2', date: '2026-11-13', status: 'failed', createdAt: '', updatedAt: '' }
    ];

    const results = HabitPerformanceService.calculateHabitPerformance(
      [dummyHabit1, dummyHabit2],
      logs,
      [],
      {
        startDate: '2026-11-09',
        endDate: '2026-11-15',
        evaluationDate: '2026-11-15'
      }
    );

    const h1Metric = results.find((r) => r.habitId === 'h-1')!;
    expect(h1Metric.scheduledCount).toBe(7);
    expect(h1Metric.completedCount).toBe(7);
    expect(h1Metric.evaluatedCount).toBe(7);
    expect(h1Metric.completionPercentage).toBe(100);

    const h2Metric = results.find((r) => r.habitId === 'h-2')!;
    expect(h2Metric.scheduledCount).toBe(3);
    expect(h2Metric.completedCount).toBe(2);
    expect(h2Metric.failedCount).toBe(1);
    expect(h2Metric.evaluatedCount).toBe(3);
    // 2 / 3 = 66.7% -> 67%
    expect(h2Metric.completionPercentage).toBe(67);
  });

  it('aggregates category level performance metrics accurately', () => {
    const habitMetrics = [
      {
        habitId: 'h-1',
        habitTitle: 'Daily Meditation',
        habitCategory: 'mind',
        habitType: 'completion' as const,
        currentStreak: 10,
        longestStreak: 10,
        scheduledCount: 10,
        completedCount: 9,
        failedCount: 1,
        missedCount: 0,
        evaluatedCount: 10,
        completionPercentage: 90,
        previousCompletionPercentage: 80,
        percentageDelta: 10,
        recentTrend: 'improving' as const
      },
      {
        habitId: 'h-2',
        habitTitle: 'Workout',
        habitCategory: 'body',
        habitType: 'completion' as const,
        currentStreak: 4,
        longestStreak: 14,
        scheduledCount: 10,
        completedCount: 8,
        failedCount: 2,
        missedCount: 0,
        evaluatedCount: 10,
        completionPercentage: 80,
        previousCompletionPercentage: 80,
        percentageDelta: 0,
        recentTrend: 'stable' as const
      }
    ];

    const categories = HabitPerformanceService.calculateCategoryPerformance(habitMetrics);
    expect(categories).toHaveLength(2);

    const mindCat = categories.find((c) => c.category === 'mind')!;
    expect(mindCat.totalHabits).toBe(1);
    expect(mindCat.totalEvaluated).toBe(10);
    expect(mindCat.totalCompleted).toBe(9);
    expect(mindCat.completionPercentage).toBe(90);
    expect(mindCat.percentageDelta).toBe(10);

    const bodyCat = categories.find((c) => c.category === 'body')!;
    expect(bodyCat.totalHabits).toBe(1);
    expect(bodyCat.totalEvaluated).toBe(10);
    expect(bodyCat.totalCompleted).toBe(8);
    expect(bodyCat.completionPercentage).toBe(80);
    expect(bodyCat.percentageDelta).toBe(0);
  });

  it('handles empty habit history cleanly without NaN or zero division errors', () => {
    const results = HabitPerformanceService.calculateHabitPerformance(
      [dummyHabit3],
      [],
      [],
      {
        startDate: '2026-11-09',
        endDate: '2026-11-15',
        evaluationDate: '2026-11-15'
      }
    );

    expect(results).toHaveLength(1);
    const m = results[0];
    expect(m.scheduledCount).toBe(7);
    expect(m.completedCount).toBe(0);
    expect(m.evaluatedCount).toBe(6); // 6 past days evaluated as missed, evaluationDate pending
    expect(m.completionPercentage).toBe(0);
  });
});
