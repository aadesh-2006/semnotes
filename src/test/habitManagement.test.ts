import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../storage/db';
import { HabitService } from '../core/services/habitService';
import { HabitLogService } from '../core/services/habitLogService';
import { HabitDashboardService } from '../core/services/habitDashboardService';
import { isScheduledDay, formatScheduleSummary } from '../core/services/scheduleService';

describe('Milestone 2: Habit Management Engine Test Suite', () => {
  beforeEach(async () => {
    // Clear all tables before each test
    await db.habits.clear();
    await db.habitLogs.clear();
    await db.auditRecords.clear();
  });

  // -------------------------------------------------------------
  // Test 1: Creating each habit type
  // -------------------------------------------------------------
  it('creates Abstinence, Completion, and Quantitative habits', async () => {
    // 1. Abstinence Habit
    const abstinenceHabit = await HabitService.createHabit({
      title: 'Digital Purity',
      description: 'Zero pornography or lustful triggers',
      category: 'abstinence',
      type: 'abstinence',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01',
    });
    expect(abstinenceHabit.id).toBeDefined();
    expect(abstinenceHabit.type).toBe('abstinence');
    expect(abstinenceHabit.status).toBe('active');

    // 2. Completion Habit
    const completionHabit = await HabitService.createHabit({
      title: 'DSA Practice',
      description: 'Solve 1 Medium LeetCode problem',
      category: 'craft',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01',
    });
    expect(completionHabit.type).toBe('completion');

    // 3. Quantitative Habit
    const quantitativeHabit = await HabitService.createHabit({
      title: 'Hydration Target',
      description: 'Drink at least 3 liters of water',
      category: 'body',
      type: 'quantitative',
      targetValue: 3,
      unit: 'liters',
      targetConstraint: 'at_least',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01',
    });
    expect(quantitativeHabit.type).toBe('quantitative');
    expect(quantitativeHabit.targetValue).toBe(3);
    expect(quantitativeHabit.unit).toBe('liters');

    // Verify stored in IndexedDB
    const all = await db.habits.toArray();
    expect(all).toHaveLength(3);
  });

  // -------------------------------------------------------------
  // Test 2: Editing existing habits
  // -------------------------------------------------------------
  it('edits an existing habit while preserving id and creation date', async () => {
    const habit = await HabitService.createHabit({
      title: 'Old Title',
      category: 'mind',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01',
    });

    const updated = await HabitService.updateHabit(habit.id, {
      title: 'New Stoic Reading Title',
      description: 'Updated standard of excellence'
    });

    expect(updated.id).toBe(habit.id);
    expect(updated.title).toBe('New Stoic Reading Title');
    expect(updated.description).toBe('Updated standard of excellence');
    expect(updated.createdAt).toBe(habit.createdAt);

    const fromDb = await db.habits.get(habit.id);
    expect(fromDb?.title).toBe('New Stoic Reading Title');
  });

  // -------------------------------------------------------------
  // Test 3: Pausing and resuming habits
  // -------------------------------------------------------------
  it('pauses and resumes habits cleanly', async () => {
    const habit = await HabitService.createHabit({
      title: 'Workout Session',
      category: 'body',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01',
    });

    const paused = await HabitService.pauseHabit(habit.id, 'Taking travel break');
    expect(paused.status).toBe('paused');

    const fromDb = await db.habits.get(habit.id);
    expect(fromDb?.status).toBe('paused');

    const resumed = await HabitService.resumeHabit(habit.id);
    expect(resumed.status).toBe('active');
  });

  // -------------------------------------------------------------
  // Test 4: Archiving and restoring habits
  // -------------------------------------------------------------
  it('archives and restores habits', async () => {
    const habit = await HabitService.createHabit({
      title: 'Old Project Sprint',
      category: 'craft',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01',
    });

    const archived = await HabitService.archiveHabit(habit.id);
    expect(archived.status).toBe('archived');

    const restored = await HabitService.resumeHabit(habit.id);
    expect(restored.status).toBe('active');
  });

  // -------------------------------------------------------------
  // Test 5 & 6: Schedule validation and Unscheduled-day handling
  // -------------------------------------------------------------
  it('correctly handles schedules and excludes unscheduled days', () => {
    // 1. Daily schedule
    const dailySchedule = { frequency: 'daily' as const, selectedDays: [0, 1, 2, 3, 4, 5, 6] };
    expect(isScheduledDay(dailySchedule, '2026-11-17', '2026-11-01')).toBe(true);

    // 2. Before start date
    expect(isScheduledDay(dailySchedule, '2026-10-31', '2026-11-01')).toBe(false);

    // 3. After end date
    expect(isScheduledDay(dailySchedule, '2026-12-01', '2026-11-01', '2026-11-30')).toBe(false);

    // 4. Selected days: Mon(1), Wed(3), Fri(5)
    // 2026-11-16 is Monday (day 1)
    // 2026-11-17 is Tuesday (day 2)
    const mwfSchedule = { frequency: 'selected_days' as const, selectedDays: [1, 3, 5] };
    expect(isScheduledDay(mwfSchedule, '2026-11-16', '2026-11-01')).toBe(true); // Monday
    expect(isScheduledDay(mwfSchedule, '2026-11-17', '2026-11-01')).toBe(false); // Tuesday is not scheduled

    expect(formatScheduleSummary(mwfSchedule)).toBe('Mon, Wed, Fri');
  });

  // -------------------------------------------------------------
  // Test 7: Abstinence check-ins (Maintained, Setback)
  // -------------------------------------------------------------
  it('records abstinence check-in as completed (Maintained) or failed (Setback)', async () => {
    const habit = await HabitService.createHabit({
      title: 'Digital Purity',
      category: 'abstinence',
      type: 'abstinence',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01',
    });

    // Day 1: Maintained (completed)
    const logClean = await HabitLogService.recordCheckIn(habit, '2026-11-17', {
      status: 'completed',
      notes: 'Stayed resolute throughout evening.'
    });
    expect(logClean.status).toBe('completed');
    expect(logClean.notes).toBe('Stayed resolute throughout evening.');

    // Day 2: Setback (failed)
    const logSetback = await HabitLogService.recordCheckIn(habit, '2026-11-18', {
      status: 'failed',
      notes: 'Late night boredom trigger.'
    });
    expect(logSetback.status).toBe('failed');
  });

  // -------------------------------------------------------------
  // Test 8: Completion check-ins (Completed, Missed)
  // -------------------------------------------------------------
  it('records completion check-ins', async () => {
    const habit = await HabitService.createHabit({
      title: 'DSA Practice',
      category: 'craft',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01',
    });

    const completedLog = await HabitLogService.recordCheckIn(habit, '2026-11-17', {
      status: 'completed'
    });
    expect(completedLog.status).toBe('completed');

    const missedLog = await HabitLogService.recordCheckIn(habit, '2026-11-18', {
      status: 'failed'
    });
    expect(missedLog.status).toBe('failed');
  });

  // -------------------------------------------------------------
  // Test 9: Quantitative target calculations
  // -------------------------------------------------------------
  it('evaluates quantitative targets accurately (at_least and at_most)', async () => {
    // at_least 5000 steps
    const stepHabit = await HabitService.createHabit({
      title: 'Daily Steps',
      category: 'body',
      type: 'quantitative',
      targetValue: 5000,
      unit: 'steps',
      targetConstraint: 'at_least',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01',
    });

    // 6000 steps >= 5000 -> completed
    const log1 = await HabitLogService.recordCheckIn(stepHabit, '2026-11-17', {
      numericValue: 6000
    });
    expect(log1.status).toBe('completed');
    expect(log1.numericValue).toBe(6000);

    // 4200 steps < 5000 -> failed
    const log2 = await HabitLogService.recordCheckIn(stepHabit, '2026-11-18', {
      numericValue: 4200
    });
    expect(log2.status).toBe('failed');

    // at_most 60 mins screen time
    const screenHabit = await HabitService.createHabit({
      title: 'Recreational Screen Time',
      category: 'discipline',
      type: 'quantitative',
      targetValue: 60,
      unit: 'mins',
      targetConstraint: 'at_most',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01',
    });

    const log3 = await HabitLogService.recordCheckIn(screenHabit, '2026-11-17', {
      numericValue: 45 // 45 <= 60 -> completed
    });
    expect(log3.status).toBe('completed');

    const log4 = await HabitLogService.recordCheckIn(screenHabit, '2026-11-18', {
      numericValue: 80 // 80 > 60 -> failed
    });
    expect(log4.status).toBe('failed');
  });

  // -------------------------------------------------------------
  // Test 10: Duplicate check-in prevention
  // -------------------------------------------------------------
  it('prevents duplicate check-in entries on the same local calendar date', async () => {
    const habit = await HabitService.createHabit({
      title: 'Reading',
      category: 'mind',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01',
    });

    const date = '2026-11-17';

    // First check-in
    await HabitLogService.recordCheckIn(habit, date, { status: 'completed' });

    // Second check-in on same date should update in-place without duplicating
    await HabitLogService.recordCheckIn(habit, date, {
      status: 'completed',
      notes: 'Added note later'
    });

    // Check count for this habit on this date
    const logs = await db.habitLogs
      .where('habitId')
      .equals(habit.id)
      .filter((l) => l.date === date)
      .toArray();

    expect(logs).toHaveLength(1);
    expect(logs[0].notes).toBe('Added note later');
  });

  // -------------------------------------------------------------
  // Test 11: Historical record preservation
  // -------------------------------------------------------------
  it('preserves all historical logs when editing, pausing, or archiving habits', async () => {
    const habit = await HabitService.createHabit({
      title: 'Calisthenics',
      category: 'body',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01',
    });

    // Create 3 historical logs
    await HabitLogService.recordCheckIn(habit, '2026-11-15', { status: 'completed' });
    await HabitLogService.recordCheckIn(habit, '2026-11-16', { status: 'completed' });
    await HabitLogService.recordCheckIn(habit, '2026-11-17', { status: 'failed' });

    // Edit habit title and description
    await HabitService.updateHabit(habit.id, { title: 'Advanced Calisthenics' });

    // Pause habit
    await HabitService.pauseHabit(habit.id);

    // Archive habit
    await HabitService.archiveHabit(habit.id);

    // Verify logs remain exactly intact
    const remainingLogs = await db.habitLogs.where('habitId').equals(habit.id).toArray();
    expect(remainingLogs).toHaveLength(3);
    expect(remainingLogs.filter((l) => l.status === 'completed')).toHaveLength(2);
  });

  // -------------------------------------------------------------
  // Test 12: Dashboard calculations
  // -------------------------------------------------------------
  it('calculates dashboard metrics purely from database state', async () => {
    const today = '2026-11-17';

    // Habit 1: Active & Scheduled today
    const h1 = await HabitService.createHabit({
      title: 'Habit 1',
      category: 'mind',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: today,
    });
    // Check in as completed today
    await HabitLogService.recordCheckIn(h1, today, { status: 'completed' });

    // Habit 2: Active & Scheduled today, but not checked in yet
    await HabitService.createHabit({
      title: 'Habit 2',
      category: 'craft',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: today,
    });

    // Habit 3: Active but NOT scheduled today (e.g. only on weekends)
    await HabitService.createHabit({
      title: 'Weekend Only',
      category: 'discipline',
      type: 'completion',
      schedule: { frequency: 'selected_days', selectedDays: [0, 6] }, // Sun, Sat
      startDate: today,
    });

    const metrics = await HabitDashboardService.getDashboardMetrics(today);

    expect(metrics.activeHabitsCount).toBe(3);
    expect(metrics.todayScheduledCount).toBe(2); // h1 and h2
    expect(metrics.completedTodayCount).toBe(1); // h1
    expect(metrics.pendingTodayCount).toBe(1); // h2
    expect(metrics.completionPercentage).toBe(50); // 1 of 2 completed
  });

  // -------------------------------------------------------------
  // Test 13: IndexedDB persistence after queries
  // -------------------------------------------------------------
  it('maintains persistence in IndexedDB across independent operations', async () => {
    const habit = await HabitService.createHabit({
      title: 'Cold Showers',
      category: 'discipline',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01',
    });

    const fetched = await HabitService.getHabitById(habit.id);
    expect(fetched?.title).toBe('Cold Showers');

    const all = await HabitService.getAllHabits();
    expect(all.some((h) => h.id === habit.id)).toBe(true);
  });

  // -------------------------------------------------------------
  // Test 14: Invalid input handling
  // -------------------------------------------------------------
  it('rejects invalid inputs with Zod validation errors', async () => {
    // Missing title
    await expect(
      HabitService.createHabit({
        title: '',
        category: 'mind',
        type: 'completion',
        schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
        startDate: '2026-11-01',
      })
    ).rejects.toThrow();

    // Invalid category
    await expect(
      HabitService.createHabit({
        title: 'Valid Title',
        category: 'invalid_cat' as any,
        type: 'completion',
        schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
        startDate: '2026-11-01',
      })
    ).rejects.toThrow();
  });

  // -------------------------------------------------------------
  // Test 15: Correction history & audit trail
  // -------------------------------------------------------------
  it('creates an audit record with previous/new status and required reason', async () => {
    const habit = await HabitService.createHabit({
      title: 'Water Intake',
      category: 'body',
      type: 'quantitative',
      targetValue: 3,
      unit: 'liters',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01',
    });

    // Day check-in
    const log = await HabitLogService.recordCheckIn(habit, '2026-11-17', {
      numericValue: 2 // below target 3 -> failed
    });
    expect(log.status).toBe('failed');

    // Correct entry: user forgot they had another bottle
    const corrected = await HabitLogService.correctCheckIn(log.id, {
      numericValue: 3.5,
      status: 'completed',
      reason: 'Logged morning intake only; added afternoon bottle'
    });

    expect(corrected.status).toBe('completed');
    expect(corrected.numericValue).toBe(3.5);
    expect(corrected.correctedAt).toBeDefined();
    expect(corrected.correctionReason).toBe('Logged morning intake only; added afternoon bottle');

    // Verify audit record exists
    const audits = await db.auditRecords.where('habitLogId').equals(log.id).toArray();
    expect(audits.length).toBeGreaterThanOrEqual(1);

    const correctionAudit = audits.find((a) => a.action === 'correction');
    expect(correctionAudit).toBeDefined();
    expect(correctionAudit?.previousStatus).toBe('failed');
    expect(correctionAudit?.newStatus).toBe('completed');
    expect(correctionAudit?.previousValue).toBe(2);
    expect(correctionAudit?.newValue).toBe(3.5);
    expect(correctionAudit?.reason).toBe('Logged morning intake only; added afternoon bottle');
  });
});
