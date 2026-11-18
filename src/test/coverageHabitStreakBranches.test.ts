/**
 * SEMNÓTĒS — Critical Branch Coverage Suite: Core Habit, Log & Streak Engines
 * Sovereign personal discipline operating system.
 *
 * Verifies edge cases in streak calculations, weekly schedule frequencies,
 * retroactive audit logs, and habit lifecycle operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../storage/db';
import { HabitService } from '../core/services/habitService';
import { HabitLogService } from '../core/services/habitLogService';
import { StreakEngine } from '../core/streak/streakEngine';
import { StreakCalculator } from '../core/streak/streakCalculator';
import type { Habit, HabitLog } from '../core/domain/types';

describe('Critical Branch Coverage: Habit Service Operations', () => {
  beforeEach(async () => {
    await db.habits.clear();
    await db.habitLogs.clear();
    await db.auditRecords.clear();
  });

  it('updates an existing habit and creates audit record', async () => {
    const habit = await HabitService.createHabit({
      title: 'Original Title',
      description: 'Initial description',
      category: 'craft',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-01-01',
    });

    const updated = await HabitService.updateHabit(habit.id, {
      title: 'Updated Title',
      description: 'Refined description',
    });

    expect(updated.title).toBe('Updated Title');
    expect(updated.description).toBe('Refined description');

    const audits = await db.auditRecords.where('habitId').equals(habit.id).toArray();
    expect(audits.some((a) => a.action === 'status_change')).toBe(true);
  });

  it('archives, pauses, and resumes a habit with proper audit trails', async () => {
    const habit = await HabitService.createHabit({
      title: 'Temporary Focus',
      category: 'discipline',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-01-01',
    });

    const archived = await HabitService.archiveHabit(habit.id);
    expect(archived.status).toBe('archived');

    const resumed = await HabitService.resumeHabit(habit.id);
    expect(resumed.status).toBe('active');

    const paused = await HabitService.pauseHabit(habit.id, 'Taking a break');
    expect(paused.status).toBe('paused');

    const audits = await db.auditRecords.where('habitId').equals(habit.id).toArray();
    expect(audits.some((a) => a.action === 'archive')).toBe(true);
    expect(audits.some((a) => a.action === 'resume')).toBe(true);
    expect(audits.some((a) => a.action === 'pause')).toBe(true);
  });
});

describe('Critical Branch Coverage: Habit Log Service Operations', () => {
  beforeEach(async () => {
    await db.habits.clear();
    await db.habitLogs.clear();
    await db.auditRecords.clear();
  });

  it('records quantitative check-in and updates value', async () => {
    const habit = await HabitService.createHabit({
      title: 'Reading',
      category: 'mind',
      type: 'quantitative',
      targetValue: 30,
      targetConstraint: 'at_least',
      unit: 'pages',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-01-01',
    });

    // Check in with 35 pages (exceeds target -> completed)
    const log = await HabitLogService.recordCheckIn(habit, '2026-01-05', {
      status: 'completed',
      numericValue: 35,
      notes: 'Read chapter 3',
    });

    expect(log.status).toBe('completed');
    expect(log.numericValue).toBe(35);

    // Correct check-in via correctCheckIn
    const corrected = await HabitLogService.correctCheckIn(log.id, {
      status: 'completed',
      numericValue: 40,
      reason: 'Read extra 5 pages',
    });
    expect(corrected.numericValue).toBe(40);

    const audits = await db.auditRecords.where('habitId').equals(habit.id).toArray();
    expect(audits.some((a) => a.action === 'correction')).toBe(true);
  });

  it('handles retroactive check-in corrections seamlessly', async () => {
    const habit = await HabitService.createHabit({
      title: 'Workout',
      category: 'body',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-01-01',
    });

    // Initial check in as missed
    await HabitLogService.recordCheckIn(habit, '2026-01-03', {
      status: 'missed',
      notes: 'Felt tired',
    });

    // Correct to completed
    const corrected = await HabitLogService.recordCheckIn(habit, '2026-01-03', {
      status: 'completed',
      notes: 'Actually completed evening stretch',
    });

    expect(corrected.status).toBe('completed');
    expect(corrected.notes).toBe('Actually completed evening stretch');
  });
});

describe('Critical Branch Coverage: Streak Calculator & Engine Scenarios', () => {
  it('calculates streaks correctly for custom days_of_week schedules', () => {
    const habit: Habit = {
      id: '00000000-0000-4000-8000-000000000099',
      title: 'MWF Workout',
      description: 'Monday Wednesday Friday Gym',
      category: 'body',
      type: 'completion',
      // Scheduled only on Mon (1), Wed (3), Fri (5)
      schedule: { frequency: 'selected_days', selectedDays: [1, 3, 5] },
      startDate: '2026-01-05', // Monday
      status: 'active',
      createdAt: '2026-01-05T00:00:00.000Z',
      updatedAt: '2026-01-05T00:00:00.000Z',
      sortOrder: 0,
    };

    // 2026-01-05 is Mon, 2026-01-07 is Wed, 2026-01-09 is Fri
    const logs: HabitLog[] = [
      {
        id: '1',
        habitId: habit.id,
        date: '2026-01-05',
        status: 'completed',
        createdAt: '2026-01-05T00:00:00.000Z',
        updatedAt: '2026-01-05T00:00:00.000Z',
      },
      {
        id: '2',
        habitId: habit.id,
        date: '2026-01-07',
        status: 'completed',
        createdAt: '2026-01-07T00:00:00.000Z',
        updatedAt: '2026-01-07T00:00:00.000Z',
      },
      {
        id: '3',
        habitId: habit.id,
        date: '2026-01-09',
        status: 'completed',
        createdAt: '2026-01-09T00:00:00.000Z',
        updatedAt: '2026-01-09T00:00:00.000Z',
      },
    ];

    const streak = StreakCalculator.calculateStreak(habit, logs, { evaluationDate: '2026-01-09' });
    expect(streak.currentStreak).toBe(3);
    expect(streak.longestStreak).toBe(3);
  });

  it('breaks streak when a scheduled commitment is missed', () => {
    const habit: Habit = {
      id: '00000000-0000-4000-8000-000000000098',
      title: 'Daily Meditation',
      description: 'Daily practice',
      category: 'mind',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-01-01',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      sortOrder: 0,
    };

    const logs: HabitLog[] = [
      {
        id: '1',
        habitId: habit.id,
        date: '2026-01-01',
        status: 'completed',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: '2',
        habitId: habit.id,
        date: '2026-01-02',
        status: 'missed', // Break in streak!
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
      {
        id: '3',
        habitId: habit.id,
        date: '2026-01-03',
        status: 'completed',
        createdAt: '2026-01-03T00:00:00.000Z',
        updatedAt: '2026-01-03T00:00:00.000Z',
      },
    ];

    const streak = StreakCalculator.calculateStreak(habit, logs, { evaluationDate: '2026-01-03' });
    expect(streak.currentStreak).toBe(1);
    expect(streak.longestStreak).toBe(1);
  });

  it('StreakEngine.calculateHabitStreak computes streak directly with live database records', async () => {
    await db.habits.clear();
    await db.habitLogs.clear();

    const h = await HabitService.createHabit({
      title: 'Habit A',
      category: 'discipline',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-01-01',
    });

    await HabitLogService.recordCheckIn(h, '2026-01-01', { status: 'completed' });

    const streak = await StreakEngine.calculateHabitStreak(h.id, { evaluationDate: '2026-01-01' });
    expect(streak?.currentStreak).toBe(1);
  });
});
