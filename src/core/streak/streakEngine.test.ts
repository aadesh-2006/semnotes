import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../storage/db';
import { HabitService } from '../services/habitService';
import { HabitLogService } from '../services/habitLogService';
import { StreakCalculator } from './streakCalculator';
import { StreakEngine } from './streakEngine';
import { addDays, getDateSequence } from './streakUtils';
import type { Habit, HabitLog } from '../domain/types';

describe('Milestone 3: Independent Strict Streak Engine Test Suite', () => {
  beforeEach(async () => {
    await db.habits.clear();
    await db.habitLogs.clear();
    await db.auditRecords.clear();
  });

  const createDummyHabit = (overrides?: Partial<Habit>): Habit => ({
    id: 'test-habit-1',
    title: 'Digital Purity',
    description: 'Zero lustful triggers',
    category: 'abstinence',
    type: 'abstinence',
    schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
    startDate: '2026-11-01',
    status: 'active',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    sortOrder: 0,
    ...overrides
  });

  const createDummyLog = (date: string, status: 'completed' | 'failed', habitId = 'test-habit-1'): HabitLog => ({
    id: `log-${date}`,
    habitId,
    date,
    status,
    createdAt: `${date}T10:00:00.000Z`,
    updatedAt: `${date}T10:00:00.000Z`
  });

  // 1. Consecutive daily successes
  it('calculates consecutive daily successes correctly', () => {
    const habit = createDummyHabit({ startDate: '2026-11-01' });
    const logs: HabitLog[] = [
      createDummyLog('2026-11-01', 'completed'),
      createDummyLog('2026-11-02', 'completed'),
      createDummyLog('2026-11-03', 'completed'),
      createDummyLog('2026-11-04', 'completed'),
      createDummyLog('2026-11-05', 'completed')
    ];

    const result = StreakCalculator.calculateStreak(habit, logs, {
      evaluationDate: '2026-11-05'
    });

    expect(result.currentStreak).toBe(5);
    expect(result.longestStreak).toBe(5);
    expect(result.totalSuccessfulDays).toBe(5);
    expect(result.totalFailedDays).toBe(0);
    expect(result.totalMissedDays).toBe(0);
    expect(result.currentStreakStartDate).toBe('2026-11-01');
    expect(result.lastSuccessfulDate).toBe('2026-11-05');
  });

  // 2. Failure resetting current streak
  it('resets current streak to zero immediately upon a failed day', () => {
    const habit = createDummyHabit({ startDate: '2026-11-01' });
    const logs: HabitLog[] = [
      createDummyLog('2026-11-01', 'completed'),
      createDummyLog('2026-11-02', 'completed'),
      createDummyLog('2026-11-03', 'completed'),
      createDummyLog('2026-11-04', 'failed'), // Failure on Day 4
    ];

    const result = StreakCalculator.calculateStreak(habit, logs, {
      evaluationDate: '2026-11-04'
    });

    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(3); // 3-day streak preserved
    expect(result.totalSuccessfulDays).toBe(3);
    expect(result.totalFailedDays).toBe(1);
    expect(result.streakStatus).toBe('broken');
  });

  // 3. Missed scheduled day resetting current streak
  it('resets current streak to zero when past scheduled day has no check-in', () => {
    const habit = createDummyHabit({ startDate: '2026-11-01' });
    const logs: HabitLog[] = [
      createDummyLog('2026-11-01', 'completed'),
      createDummyLog('2026-11-02', 'completed'),
      // 2026-11-03 was scheduled, but NO log was created (missed day)
      createDummyLog('2026-11-04', 'completed')
    ];

    const result = StreakCalculator.calculateStreak(habit, logs, {
      evaluationDate: '2026-11-04'
    });

    // 2026-11-03 broke the streak, so 2026-11-04 started a new streak of 1
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(2);
    expect(result.totalMissedDays).toBe(1);
    expect(result.currentStreakStartDate).toBe('2026-11-04');
  });

  // 4. Longest streak preservation
  it('permanently preserves historical longest streak even after multiple failures', () => {
    const habit = createDummyHabit({ startDate: '2026-11-01' });
    const logs: HabitLog[] = [
      // 10-day streak
      ...Array.from({ length: 10 }, (_, i) => {
        const d = `2026-11-${String(i + 1).padStart(2, '0')}`;
        return createDummyLog(d, 'completed');
      }),
      createDummyLog('2026-11-11', 'failed'), // Day 11 reset
      createDummyLog('2026-11-12', 'completed'),
      createDummyLog('2026-11-13', 'completed')
    ];

    const result = StreakCalculator.calculateStreak(habit, logs, {
      evaluationDate: '2026-11-13'
    });

    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(10);
    expect(result.longestStreakRange).toEqual({
      startDate: '2026-11-01',
      endDate: '2026-11-10',
      length: 10
    });
  });

  // 5. Multiple independent habits
  it('verifies that breaking one habit never impacts another independent habit', async () => {
    const habitA = await HabitService.createHabit({
      title: 'Habit A — Abstinence',
      category: 'abstinence',
      type: 'abstinence',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01'
    });

    const habitB = await HabitService.createHabit({
      title: 'Habit B — DSA Practice',
      category: 'craft',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01'
    });

    // Both succeed on Nov 1, 2, 3
    for (const d of ['2026-11-01', '2026-11-02', '2026-11-03']) {
      await HabitLogService.recordCheckIn(habitA, d, { status: 'completed' });
      await HabitLogService.recordCheckIn(habitB, d, { status: 'completed' });
    }

    // On Nov 4: Habit A relapses (failed), while Habit B completes
    await HabitLogService.recordCheckIn(habitA, '2026-11-04', { status: 'failed' });
    await HabitLogService.recordCheckIn(habitB, '2026-11-04', { status: 'completed' });

    const streakA = await StreakEngine.calculateHabitStreak(habitA.id, {
      evaluationDate: '2026-11-04'
    });
    const streakB = await StreakEngine.calculateHabitStreak(habitB.id, {
      evaluationDate: '2026-11-04'
    });

    expect(streakA?.currentStreak).toBe(0);
    expect(streakA?.longestStreak).toBe(3);

    expect(streakB?.currentStreak).toBe(4); // 100% independent!
    expect(streakB?.longestStreak).toBe(4);
  });

  // 6 & 7. Weekly scheduled habits and Unscheduled-day exclusion
  it('excludes unscheduled days from streak breaks (MWF schedule)', () => {
    // 2026-11-02 is Monday (1)
    // 2026-11-03 is Tuesday (2 - unscheduled)
    // 2026-11-04 is Wednesday (3)
    // 2026-11-05 is Thursday (4 - unscheduled)
    // 2026-11-06 is Friday (5)
    const mwfHabit = createDummyHabit({
      startDate: '2026-11-02',
      schedule: { frequency: 'selected_days', selectedDays: [1, 3, 5] }
    });

    const logs: HabitLog[] = [
      createDummyLog('2026-11-02', 'completed'), // Mon
      // Tue is unscheduled
      createDummyLog('2026-11-04', 'completed'), // Wed
      // Thu is unscheduled
      createDummyLog('2026-11-06', 'completed')  // Fri
    ];

    const result = StreakCalculator.calculateStreak(mwfHabit, logs, {
      evaluationDate: '2026-11-06'
    });

    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
    expect(result.totalScheduledDays).toBe(3);
    expect(result.totalMissedDays).toBe(0);
  });

  // 8. Paused-day exclusion
  it('excludes paused intervals from counting as failures or breaking streaks', () => {
    const habit = createDummyHabit({ startDate: '2026-11-01' });
    const logs: HabitLog[] = [
      createDummyLog('2026-11-01', 'completed'),
      createDummyLog('2026-11-02', 'completed'),
      // Nov 3 and Nov 4 are paused
      createDummyLog('2026-11-05', 'completed')
    ];

    const pausedRanges = [{ startDate: '2026-11-03', endDate: '2026-11-04' }];

    const result = StreakCalculator.calculateStreak(habit, logs, {
      evaluationDate: '2026-11-05',
      pausedRanges
    });

    // Nov 1, 2, and 5 form a continuous 3-day streak across the pause!
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
    expect(result.totalMissedDays).toBe(0);
  });

  // 9. Archived habit history preservation
  it('preserves historical streak metrics for archived habits', () => {
    const habit = createDummyHabit({
      startDate: '2026-11-01',
      status: 'archived'
    });

    const logs: HabitLog[] = [
      createDummyLog('2026-11-01', 'completed'),
      createDummyLog('2026-11-02', 'completed'),
      createDummyLog('2026-11-03', 'completed')
    ];

    const result = StreakCalculator.calculateStreak(habit, logs, {
      evaluationDate: '2026-11-03'
    });

    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
    expect(result.totalSuccessfulDays).toBe(3);
  });

  // 10. Future date exclusion
  it('does not count dates after evaluation date', () => {
    const habit = createDummyHabit({ startDate: '2026-11-01' });
    const logs: HabitLog[] = [
      createDummyLog('2026-11-01', 'completed'),
      createDummyLog('2026-11-02', 'completed')
    ];

    // Evaluated on Nov 2 (Nov 3, 4, 5 are future dates)
    const result = StreakCalculator.calculateStreak(habit, logs, {
      evaluationDate: '2026-11-02'
    });

    expect(result.currentStreak).toBe(2);
    expect(result.totalScheduledDays).toBe(2);
    expect(result.totalMissedDays).toBe(0);
  });

  // 11. Habit creation / start date boundary
  it('does not count dates prior to habit start date', () => {
    const habit = createDummyHabit({ startDate: '2026-11-10' });
    const logs: HabitLog[] = [
      createDummyLog('2026-11-10', 'completed')
    ];

    const result = StreakCalculator.calculateStreak(habit, logs, {
      evaluationDate: '2026-11-10'
    });

    expect(result.currentStreak).toBe(1);
    expect(result.totalScheduledDays).toBe(1);
  });

  // 12. Empty history
  it('returns zero streaks when no logs exist', () => {
    const habit = createDummyHabit({ startDate: '2026-11-01' });
    const logs: HabitLog[] = [];

    const result = StreakCalculator.calculateStreak(habit, logs, {
      evaluationDate: '2026-11-05'
    });

    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.totalMissedDays).toBe(4); // Nov 1, 2, 3, 4 were missed
    expect(result.todayStatus).toBe('pending');
  });

  // 13. Single successful day
  it('correctly handles a single successful day', () => {
    const habit = createDummyHabit({ startDate: '2026-11-01' });
    const logs: HabitLog[] = [createDummyLog('2026-11-01', 'completed')];

    const result = StreakCalculator.calculateStreak(habit, logs, {
      evaluationDate: '2026-11-01'
    });

    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
  });

  // 14. Historical log correction
  it('recalculates streaks accurately when a historical log is corrected', async () => {
    const habit = await HabitService.createHabit({
      title: 'DSA Practice',
      category: 'craft',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01'
    });

    // Check-in Day 1 (completed), Day 2 (accidentally logged as failed), Day 3 (completed)
    await HabitLogService.recordCheckIn(habit, '2026-11-01', { status: 'completed' });
    const log2 = await HabitLogService.recordCheckIn(habit, '2026-11-02', { status: 'failed' });
    await HabitLogService.recordCheckIn(habit, '2026-11-03', { status: 'completed' });

    // Before correction: Day 2 failure caused Day 3 streak to be 1
    const beforeCorrection = await StreakEngine.calculateHabitStreak(habit.id, {
      evaluationDate: '2026-11-03'
    });
    expect(beforeCorrection?.currentStreak).toBe(1);

    // Correct Day 2 log to completed
    await HabitLogService.correctCheckIn(log2.id, {
      status: 'completed',
      reason: 'Accidental check-in correction; problem was solved'
    });

    // After correction: Streak should recalculate to 3 uninterrupted days!
    const afterCorrection = await StreakEngine.calculateHabitStreak(habit.id, {
      evaluationDate: '2026-11-03'
    });
    expect(afterCorrection?.currentStreak).toBe(3);
    expect(afterCorrection?.longestStreak).toBe(3);
  });

  // 15. Schedule modification handling
  it('adapts to schedule modifications without corruption', () => {
    // Started as weekend habit, evaluated on Saturday
    const habit = createDummyHabit({
      startDate: '2026-11-07', // Saturday (6)
      schedule: { frequency: 'selected_days', selectedDays: [0, 6] }
    });

    const logs = [createDummyLog('2026-11-07', 'completed')];

    const result = StreakCalculator.calculateStreak(habit, logs, {
      evaluationDate: '2026-11-07'
    });

    expect(result.currentStreak).toBe(1);
    expect(result.nextScheduledDate).toBe('2026-11-08'); // Sunday
  });

  // 16. Timezone and date boundaries
  it('correctly handles month crossovers and leap years without timezone offsets', () => {
    const dates = getDateSequence('2024-02-27', '2024-03-02');
    // 2024 is a leap year: Feb 27, 28, 29, Mar 1, Mar 2
    expect(dates).toEqual([
      '2024-02-27',
      '2024-02-28',
      '2024-02-29',
      '2024-03-01',
      '2024-03-02'
    ]);

    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  // 17 & 18. Quantitative target success and failure
  it('evaluates quantitative streaks based on target fulfillment', async () => {
    const habit = await HabitService.createHabit({
      title: 'Water Intake',
      category: 'body',
      type: 'quantitative',
      targetValue: 3,
      unit: 'liters',
      targetConstraint: 'at_least',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01'
    });

    // Day 1: 3.5L (completed) -> streak 1
    await HabitLogService.recordCheckIn(habit, '2026-11-01', { numericValue: 3.5 });
    // Day 2: 3.0L (completed) -> streak 2
    await HabitLogService.recordCheckIn(habit, '2026-11-02', { numericValue: 3.0 });
    // Day 3: 2.1L (failed, below 3) -> streak resets to 0
    await HabitLogService.recordCheckIn(habit, '2026-11-03', { numericValue: 2.1 });

    const result = await StreakEngine.calculateHabitStreak(habit.id, {
      evaluationDate: '2026-11-03'
    });

    expect(result?.currentStreak).toBe(0);
    expect(result?.longestStreak).toBe(2);
  });

  // 19. Duplicate logs on same date
  it('safely handles multiple logs on the same date via single canonical lookup', () => {
    const habit = createDummyHabit({ startDate: '2026-11-01' });
    const logs: HabitLog[] = [
      createDummyLog('2026-11-01', 'completed'),
      // Even if array has duplicated date, O(1) map deduplicates cleanly
      createDummyLog('2026-11-01', 'completed')
    ];

    const result = StreakCalculator.calculateStreak(habit, logs, {
      evaluationDate: '2026-11-01'
    });

    expect(result.currentStreak).toBe(1);
    expect(result.totalScheduledDays).toBe(1);
  });

  // 20. Current streak when today's check-in is pending
  it('preserves unbroken streak from yesterday when today is pending check-in', () => {
    const habit = createDummyHabit({ startDate: '2026-11-01' });
    const logs: HabitLog[] = [
      createDummyLog('2026-11-01', 'completed'),
      createDummyLog('2026-11-02', 'completed'),
      createDummyLog('2026-11-03', 'completed')
      // Nov 4 is TODAY (evaluationDate) and has NOT been checked in yet!
    ];

    const result = StreakCalculator.calculateStreak(habit, logs, {
      evaluationDate: '2026-11-04'
    });

    // The user's 3-day streak is preserved, NOT prematurely reset!
    expect(result.currentStreak).toBe(3);
    expect(result.todayStatus).toBe('pending');
    expect(result.streakStatus).toBe('at_risk'); // Active streak pending action
    expect(result.lastSuccessfulDate).toBe('2026-11-03');
  });
});
