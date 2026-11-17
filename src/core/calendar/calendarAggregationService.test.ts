import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../storage/db';
import { CalendarAggregationService } from './calendarAggregationService';
import { getMonthMatrix, getDaysInMonth, calculateIntensityLevel } from './calendarUtils';
import { HabitLogService } from '../services/habitLogService';
import type { Habit, HabitLog } from '../domain/types';

describe('Milestone 5: Consistency Calendar Aggregation Service', () => {
  const HABIT_1: Habit = {
    id: '11111111-1111-4111-a111-111111111111',
    title: 'Digital Purity',
    description: 'Zero lustful triggers',
    category: 'abstinence',
    type: 'abstinence',
    status: 'active',
    startDate: '2026-11-01',
    schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
    sortOrder: 0
  };

  const HABIT_2: Habit = {
    id: '22222222-2222-4222-a222-222222222222',
    title: 'Daily Conditioning',
    description: 'At least 5000 steps daily',
    category: 'body',
    type: 'quantitative',
    targetValue: 5000,
    unit: 'steps',
    targetConstraint: 'at_least',
    status: 'active',
    startDate: '2026-11-01',
    schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
    sortOrder: 0
  };

  const HABIT_MWF: Habit = {
    id: '33333333-3333-4333-a333-333333333333',
    title: 'Weight Training',
    description: 'Heavy lifting MWF',
    category: 'body',
    type: 'completion',
    status: 'active',
    startDate: '2026-11-01',
    schedule: { frequency: 'selected_days', selectedDays: [1, 3, 5] }, // Mon, Wed, Fri
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
    sortOrder: 0
  };

  beforeEach(async () => {
    await db.habits.clear();
    await db.habitLogs.clear();
    await db.auditRecords.clear();
  });

  // 1. All scheduled habits completed
  it('1. evaluates complete status and 100% when all scheduled habits completed', () => {
    const habits = [HABIT_1, HABIT_2];
    const logs = new Map<string, HabitLog>([
      [`${HABIT_1.id}_2026-11-05`, { id: 'l1', habitId: HABIT_1.id, date: '2026-11-05', status: 'completed', createdAt: '2026-11-05T10:00:00Z', updatedAt: '2026-11-05T10:00:00Z' }],
      [`${HABIT_2.id}_2026-11-05`, { id: 'l2', habitId: HABIT_2.id, date: '2026-11-05', status: 'completed', numericValue: 6000, createdAt: '2026-11-05T10:00:00Z', updatedAt: '2026-11-05T10:00:00Z' }]
    ]);

    const summary = CalendarAggregationService.aggregateDay(
      '2026-11-05',
      habits,
      logs,
      new Map(),
      '2026-11-10'
    );

    expect(summary.status).toBe('complete');
    expect(summary.scheduledCount).toBe(2);
    expect(summary.completedCount).toBe(2);
    expect(summary.failedCount).toBe(0);
    expect(summary.missedCount).toBe(0);
    expect(summary.completionPercentage).toBe(100);
  });

  // 2. Some habits completed and others missed
  it('2. evaluates partial status and correct percentage when some habits completed and others missed', () => {
    const habits = [HABIT_1, HABIT_2];
    // Only HABIT_1 has a completed log on 2026-11-05; HABIT_2 has no log (missed in past)
    const logs = new Map<string, HabitLog>([
      [`${HABIT_1.id}_2026-11-05`, { id: 'l1', habitId: HABIT_1.id, date: '2026-11-05', status: 'completed', createdAt: '2026-11-05T10:00:00Z', updatedAt: '2026-11-05T10:00:00Z' }]
    ]);

    const summary = CalendarAggregationService.aggregateDay(
      '2026-11-05',
      habits,
      logs,
      new Map(),
      '2026-11-10' // Evaluation date is after 2026-11-05, so HABIT_2 is missed
    );

    expect(summary.status).toBe('partial');
    expect(summary.scheduledCount).toBe(2);
    expect(summary.completedCount).toBe(1);
    expect(summary.missedCount).toBe(1);
    expect(summary.completionPercentage).toBe(50);
  });

  // 3. All scheduled habits missed
  it('3. evaluates failed status and 0% when all scheduled habits are missed', () => {
    const habits = [HABIT_1, HABIT_2];
    const summary = CalendarAggregationService.aggregateDay(
      '2026-11-05',
      habits,
      new Map(), // Zero logs
      new Map(),
      '2026-11-10'
    );

    expect(summary.status).toBe('failed');
    expect(summary.scheduledCount).toBe(2);
    expect(summary.completedCount).toBe(0);
    expect(summary.missedCount).toBe(2);
    expect(summary.completionPercentage).toBe(0);
  });

  // 4. Current date with pending commitments
  it('4. handles pending commitments on evaluation date without counting them as failures', () => {
    const habits = [HABIT_1, HABIT_2];
    // Today is 2026-11-10; HABIT_1 completed, HABIT_2 not yet checked in
    const logs = new Map<string, HabitLog>([
      [`${HABIT_1.id}_2026-11-10`, { id: 'l1', habitId: HABIT_1.id, date: '2026-11-10', status: 'completed', createdAt: '2026-11-10T10:00:00Z', updatedAt: '2026-11-10T10:00:00Z' }]
    ]);

    const summary = CalendarAggregationService.aggregateDay(
      '2026-11-10',
      habits,
      logs,
      new Map(),
      '2026-11-10' // Today is evaluation date
    );

    expect(summary.scheduledCount).toBe(2);
    expect(summary.completedCount).toBe(1);
    expect(summary.pendingCount).toBe(1);
    expect(summary.missedCount).toBe(0);
    expect(summary.failedCount).toBe(0);
    expect(summary.hasPending).toBe(true);
    // Evaluated scheduled count is 1 (HABIT_1); pending HABIT_2 is excluded from denominator!
    expect(summary.evaluatedScheduledCount).toBe(1);
    expect(summary.completionPercentage).toBe(100);
    expect(summary.status).toBe('partial');
  });

  // 5. Unscheduled date
  it('5. evaluates rest status on an unscheduled date with no scheduled commitments', () => {
    // HABIT_MWF only runs on Mon, Wed, Fri
    // 2026-11-01 was a Sunday (day 0)
    const habits = [HABIT_MWF];
    const summary = CalendarAggregationService.aggregateDay(
      '2026-11-01',
      habits,
      new Map(),
      new Map(),
      '2026-11-10'
    );

    expect(summary.status).toBe('rest');
    expect(summary.scheduledCount).toBe(0);
    expect(summary.evaluatedScheduledCount).toBe(0);
    expect(summary.completionPercentage).toBeNull();
  });

  // 6. Paused habit excluded from calculations
  it('6. excludes paused habits from scheduled denominator and marks paused status', () => {
    const habits = [HABIT_1];
    const pausedRanges = new Map([
      [HABIT_1.id, [{ startDate: '2026-11-03', endDate: '2026-11-06' }]]
    ]);

    const summary = CalendarAggregationService.aggregateDay(
      '2026-11-04',
      habits,
      new Map(),
      pausedRanges,
      '2026-11-10'
    );

    expect(summary.status).toBe('paused');
    expect(summary.scheduledCount).toBe(0);
    expect(summary.pausedCount).toBe(1);
    expect(summary.completionPercentage).toBeNull();
  });

  // 7. Multiple habits with different schedules
  it('7. aggregates multiple habits with different schedules correctly on scheduled vs non-scheduled days', () => {
    const habits = [HABIT_1, HABIT_MWF]; // HABIT_1 daily, HABIT_MWF MWF
    // 2026-11-03 was a Tuesday: HABIT_1 scheduled, HABIT_MWF unscheduled
    const logs = new Map<string, HabitLog>([
      [`${HABIT_1.id}_2026-11-03`, { id: 'l1', habitId: HABIT_1.id, date: '2026-11-03', status: 'completed', createdAt: '2026-11-03T10:00:00Z', updatedAt: '2026-11-03T10:00:00Z' }]
    ]);

    const summary = CalendarAggregationService.aggregateDay(
      '2026-11-03',
      habits,
      logs,
      new Map(),
      '2026-11-10'
    );

    expect(summary.scheduledCount).toBe(1); // Only HABIT_1
    expect(summary.unscheduledCount).toBe(1); // HABIT_MWF is unscheduled
    expect(summary.completedCount).toBe(1);
    expect(summary.status).toBe('complete');
    expect(summary.completionPercentage).toBe(100);
  });

  // 8. Archived habit history remains visible
  it('8. retains archived habit history when queried and properly aggregates past adherence', () => {
    const archivedHabit: Habit = {
      ...HABIT_1,
      status: 'archived'
    };

    const logs = new Map<string, HabitLog>([
      [`${archivedHabit.id}_2026-11-02`, { id: 'l1', habitId: archivedHabit.id, date: '2026-11-02', status: 'completed', createdAt: '2026-11-02T10:00:00Z', updatedAt: '2026-11-02T10:00:00Z' }]
    ]);

    const summary = CalendarAggregationService.aggregateDay(
      '2026-11-02',
      [archivedHabit],
      logs,
      new Map(),
      '2026-11-10'
    );

    expect(summary.scheduledCount).toBe(1);
    expect(summary.completedCount).toBe(1);
    expect(summary.status).toBe('complete');
  });

  // 9. Abstinence success and setback handling
  it('9. correctly distinguishes abstinence maintained (+1) and setback (failed)', () => {
    const habit = HABIT_1;
    const logSuccess: HabitLog = { id: 'l1', habitId: habit.id, date: '2026-11-02', status: 'completed', createdAt: '2026-11-02T10:00:00Z', updatedAt: '2026-11-02T10:00:00Z' };
    const logSetback: HabitLog = { id: 'l2', habitId: habit.id, date: '2026-11-03', status: 'failed', createdAt: '2026-11-03T10:00:00Z', updatedAt: '2026-11-03T10:00:00Z' };

    const detailSuccess = CalendarAggregationService.evaluateHabitForDay(habit, '2026-11-02', logSuccess, [], '2026-11-10');
    expect(detailSuccess.status).toBe('completed');
    expect(detailSuccess.streakImpact).toBe('+1 Increment');

    const detailSetback = CalendarAggregationService.evaluateHabitForDay(habit, '2026-11-03', logSetback, [], '2026-11-10');
    expect(detailSetback.status).toBe('failed');
    expect(detailSetback.streakImpact).toBe('Resets to 0');
  });

  // 10. Completion habit handling
  it('10. handles completion habits with completed and missed statuses', () => {
    const habit = HABIT_MWF;
    // 2026-11-02 is Monday (scheduled)
    const detailMissed = CalendarAggregationService.evaluateHabitForDay(habit, '2026-11-02', undefined, [], '2026-11-10');
    expect(detailMissed.status).toBe('missed');
    expect(detailMissed.streakImpact).toBe('Resets to 0');
  });

  // 11. Quantitative habit target achieved
  it('11. handles quantitative habit when target is achieved', () => {
    const habit = HABIT_2;
    const log: HabitLog = { id: 'l1', habitId: habit.id, date: '2026-11-02', status: 'completed', numericValue: 7500, createdAt: '2026-11-02T10:00:00Z', updatedAt: '2026-11-02T10:00:00Z' };

    const detail = CalendarAggregationService.evaluateHabitForDay(habit, '2026-11-02', log, [], '2026-11-10');
    expect(detail.status).toBe('completed');
    expect(detail.recordedValue).toBe(7500);
    expect(detail.streakImpact).toBe('+1 Increment');
  });

  // 12. Quantitative habit target missed
  it('12. handles quantitative habit when target is not achieved', () => {
    const habit = HABIT_2;
    const log: HabitLog = { id: 'l1', habitId: habit.id, date: '2026-11-02', status: 'failed', numericValue: 3200, createdAt: '2026-11-02T10:00:00Z', updatedAt: '2026-11-02T10:00:00Z' };

    const detail = CalendarAggregationService.evaluateHabitForDay(habit, '2026-11-02', log, [], '2026-11-10');
    expect(detail.status).toBe('failed');
    expect(detail.recordedValue).toBe(3200);
    expect(detail.streakImpact).toBe('Resets to 0');
  });

  // 13. Empty history
  it('13. handles empty history gracefully with zero commitments and empty metrics', () => {
    const summaries = CalendarAggregationService.aggregateDateRange(
      '2026-11-01',
      '2026-11-05',
      [],
      [],
      [],
      '2026-11-10'
    );

    expect(summaries.size).toBe(5);
    for (const summary of summaries.values()) {
      expect(summary.status).toBe('rest');
      expect(summary.scheduledCount).toBe(0);
      expect(summary.completionPercentage).toBeNull();
    }

    const metrics = CalendarAggregationService.calculateMonthlyMetrics(Array.from(summaries.values()), 11, 2026);
    expect(metrics.totalScheduledCommitments).toBe(0);
    expect(metrics.totalCompletedCommitments).toBe(0);
    expect(metrics.averageCompletionPercentage).toBe(0);
  });

  // 14. No division-by-zero errors
  it('14. avoids division by zero on days with zero evaluated scheduled commitments', () => {
    const summary = CalendarAggregationService.aggregateDay(
      '2026-11-01',
      [],
      new Map(),
      new Map(),
      '2026-11-10'
    );

    expect(summary.evaluatedScheduledCount).toBe(0);
    expect(summary.completionPercentage).toBeNull();
    expect(Number.isNaN(summary.completionPercentage as any)).toBe(false);
  });

  // 15. Habit filtering
  it('15. filters habits by habit ID accurately', () => {
    const habits = [HABIT_1, HABIT_2, HABIT_MWF];
    const filtered = CalendarAggregationService.applyFilters(habits, {
      habitIds: [HABIT_1.id]
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe(HABIT_1.id);
  });

  // 16. Category filtering
  it('16. filters habits by category accurately', () => {
    const habits = [HABIT_1, HABIT_2, HABIT_MWF];
    const filtered = CalendarAggregationService.applyFilters(habits, {
      categories: ['body']
    });

    expect(filtered).toHaveLength(2);
    expect(filtered.every((h) => h.category === 'body')).toBe(true);
  });

  // 17. Mixed paused, pending and completed states
  it('17. aggregates mixed paused, pending and completed states on the same day', () => {
    const habits = [HABIT_1, HABIT_2, HABIT_MWF];
    // Today is 2026-11-09 (Monday: HABIT_MWF is scheduled)
    // HABIT_1: completed
    // HABIT_2: pending (no log on today)
    // HABIT_MWF: paused
    const logs = new Map<string, HabitLog>([
      [`${HABIT_1.id}_2026-11-09`, { id: 'l1', habitId: HABIT_1.id, date: '2026-11-09', status: 'completed', createdAt: '2026-11-09T10:00:00Z', updatedAt: '2026-11-09T10:00:00Z' }]
    ]);
    const pausedRanges = new Map([
      [HABIT_MWF.id, [{ startDate: '2026-11-01', endDate: '2026-11-15' }]]
    ]);

    const summary = CalendarAggregationService.aggregateDay(
      '2026-11-09',
      habits,
      logs,
      pausedRanges,
      '2026-11-09'
    );

    expect(summary.scheduledCount).toBe(2); // HABIT_1 and HABIT_2 (HABIT_MWF is paused)
    expect(summary.completedCount).toBe(1);
    expect(summary.pendingCount).toBe(1);
    expect(summary.pausedCount).toBe(1);
    expect(summary.evaluatedScheduledCount).toBe(1);
    expect(summary.completionPercentage).toBe(100);
    expect(summary.hasPending).toBe(true);
  });

  // 18. Historical schedule changes / lifecycle boundaries
  it('18. respects habit start and end dates strictly without counting pre-start days as missed', () => {
    const lateHabit: Habit = {
      ...HABIT_1,
      id: '44444444-4444-4444-a444-444444444444',
      startDate: '2026-11-15'
    };

    // Date 2026-11-05 is before lateHabit.startDate
    const summary = CalendarAggregationService.aggregateDay(
      '2026-11-05',
      [lateHabit],
      new Map(),
      new Map(),
      '2026-11-20'
    );

    expect(summary.scheduledCount).toBe(0);
    expect(summary.missedCount).toBe(0);
    expect(summary.status).toBe('rest');
  });

  // 19. Date-range boundaries
  it('19. handles date range boundaries and continuous sequences', () => {
    const summaries = CalendarAggregationService.aggregateDateRange(
      '2026-11-01',
      '2026-11-30',
      [HABIT_1],
      [],
      [],
      '2026-11-15'
    );

    expect(summaries.size).toBe(30);
    expect(summaries.has('2026-11-01')).toBe(true);
    expect(summaries.has('2026-11-30')).toBe(true);
    // Past days (Nov 1 - Nov 14) without logs are missed / failed
    expect(summaries.get('2026-11-14')!.status).toBe('failed');
    // Future days (Nov 16 - Nov 30) are future
    expect(summaries.get('2026-11-16')!.status).toBe('future');
  });

  // 20. Leap year and month crossover
  it('20. correctly computes days in February 2024 (leap year) vs February 2025', () => {
    expect(getDaysInMonth(2024, 2)).toBe(29);
    expect(getDaysInMonth(2025, 2)).toBe(28);
    expect(getDaysInMonth(2026, 2)).toBe(28);

    const leapMatrix = getMonthMatrix(2024, 2, 0, '2024-02-15');
    const currentMonthCells = leapMatrix.filter((c) => c.isCurrentMonth);
    expect(currentMonthCells).toHaveLength(29);
  });

  // 21. Intensity level mapping
  it('21. maps completion percentage to accurate intensity levels', () => {
    expect(calculateIntensityLevel('rest', null)).toBe(-1);
    expect(calculateIntensityLevel('future', null)).toBe(-1);
    expect(calculateIntensityLevel('paused', null)).toBe(-1);
    expect(calculateIntensityLevel('failed', 0)).toBe(0);
    expect(calculateIntensityLevel('partial', 25)).toBe(1);
    expect(calculateIntensityLevel('partial', 50)).toBe(2);
    expect(calculateIntensityLevel('partial', 85)).toBe(3);
    expect(calculateIntensityLevel('complete', 100)).toBe(4);
  });

  // 22. Database fetch and aggregate integration
  it('22. integrates with live Dexie database records in fetchAndAggregateRange', async () => {
    await db.habits.add(HABIT_1);
    await db.habits.add(HABIT_2);

    await HabitLogService.recordCheckIn(HABIT_1, '2026-11-05', {
      status: 'completed'
    });

    const result = await CalendarAggregationService.fetchAndAggregateRange(
      '2026-11-01',
      '2026-11-10',
      undefined,
      '2026-11-10'
    );

    expect(result.allHabits).toHaveLength(2);
    expect(result.summaries.has('2026-11-05')).toBe(true);

    const day5 = result.summaries.get('2026-11-05')!;
    expect(day5.completedCount).toBe(1); // HABIT_1 completed
    expect(day5.missedCount).toBe(1);    // HABIT_2 missed
    expect(day5.completionPercentage).toBe(50);
  });

  // 23. Selecting a date provides complete habit breakdown
  it('23. provides full habit breakdown and reflection note in day summary', () => {
    const log: HabitLog = {
      id: 'log-1',
      habitId: HABIT_1.id,
      date: '2026-11-05',
      status: 'completed',
      notes: 'Practiced breathing exercise and stayed composed.',
      createdAt: '2026-11-05T00:00:00Z',
      updatedAt: '2026-11-05T00:00:00Z'
    };

    const summary = CalendarAggregationService.aggregateDay(
      '2026-11-05',
      [HABIT_1],
      new Map([[`${HABIT_1.id}_2026-11-05`, log]]),
      new Map(),
      '2026-11-10'
    );

    expect(summary.habits).toHaveLength(1);
    expect(summary.habits[0].habitTitle).toBe(HABIT_1.title);
    expect(summary.habits[0].reflectionNote).toBe('Practiced breathing exercise and stayed composed.');
    expect(summary.habits[0].streakImpact).toBe('+1 Increment');
  });

  // 24. Yearly heatmap mapping matches monthly aggregation results
  it('24. yearly heatmap selector derives exact same completion status and intensity as monthly summaries', () => {
    const logs = new Map<string, HabitLog>([
      [`${HABIT_1.id}_2026-11-05`, { id: 'l1', habitId: HABIT_1.id, date: '2026-11-05', status: 'completed', createdAt: '2026-11-05T00:00:00Z', updatedAt: '2026-11-05T00:00:00Z' }],
      [`${HABIT_2.id}_2026-11-05`, { id: 'l2', habitId: HABIT_2.id, date: '2026-11-05', status: 'completed', numericValue: 6000, createdAt: '2026-11-05T00:00:00Z', updatedAt: '2026-11-05T00:00:00Z' }]
    ]);

    const summaries = CalendarAggregationService.aggregateDateRange(
      '2026-11-01',
      '2026-11-07',
      [HABIT_1, HABIT_2],
      Array.from(logs.values()),
      [],
      '2026-11-10'
    );

    const day5 = summaries.get('2026-11-05')!;
    expect(day5.status).toBe('complete');
    expect(day5.completionPercentage).toBe(100);
    expect(calculateIntensityLevel(day5.status, day5.completionPercentage)).toBe(4);
  });

  // 25. Check-in audit corrections update calendar aggregation immediately
  it('25. reflects check-in audit correction in calendar aggregation dynamically', async () => {
    await db.habits.add(HABIT_1);

    // Initial setback
    const initialLog = await HabitLogService.recordCheckIn(HABIT_1, '2026-11-04', {
      status: 'failed'
    });

    let res = await CalendarAggregationService.fetchAndAggregateRange(
      '2026-11-01',
      '2026-11-05',
      undefined,
      '2026-11-05'
    );
    expect(res.summaries.get('2026-11-04')!.status).toBe('failed');
    expect(res.summaries.get('2026-11-04')!.completionPercentage).toBe(0);

    // Perform audit correction: actual was completed
    await HabitLogService.correctCheckIn(initialLog.id, {
      status: 'completed',
      reason: 'Corrected mistake in daily entry'
    });

    res = await CalendarAggregationService.fetchAndAggregateRange(
      '2026-11-01',
      '2026-11-05',
      undefined,
      '2026-11-05'
    );
    expect(res.summaries.get('2026-11-04')!.status).toBe('complete');
    expect(res.summaries.get('2026-11-04')!.completionPercentage).toBe(100);
  });

  // 26. Tracking type filtering
  it('26. filters habits by tracking type accurately', () => {
    const habits = [HABIT_1, HABIT_2, HABIT_MWF];
    const quantitativeOnly = CalendarAggregationService.applyFilters(habits, {
      trackingTypes: ['quantitative']
    });

    expect(quantitativeOnly).toHaveLength(1);
    expect(quantitativeOnly[0].id).toBe(HABIT_2.id);
  });
});
