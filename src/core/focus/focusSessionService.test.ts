/**
 * SEMNÓTĒS — Focus Session Service Tests
 * Verifies Dexie CRUD, statuses, and strict habit/streak isolation invariants.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../storage/db';
import { FocusSessionService } from './focusSessionService';
import { HabitService } from '../services/habitService';
import { HabitLogService } from '../services/habitLogService';

describe('FocusSessionService', () => {
  beforeEach(async () => {
    await db.focusSessions.clear();
    await db.habits.clear();
    await db.habitLogs.clear();
    await db.auditRecords.clear();
  });

  it('creates and persists a new focus session in Dexie with valid schema', async () => {
    const session = await FocusSessionService.createSession({
      title: 'DSA Practice',
      sessionMode: 'custom',
      plannedDurationMinutes: 50,
      notes: 'Solve 3 graph questions',
    });

    expect(session.id).toBeDefined();
    expect(session.title).toBe('DSA Practice');
    expect(session.sessionMode).toBe('custom');
    expect(session.plannedDurationMinutes).toBe(50);
    expect(session.notes).toBe('Solve 3 graph questions');
    expect(session.status).toBe('interrupted'); // Default initial status until complete

    const fetched = await FocusSessionService.getSessionById(session.id);
    expect(fetched).toBeDefined();
    expect(fetched?.title).toBe('DSA Practice');
  });

  it('completes a session with actual focused duration and notes', async () => {
    const created = await FocusSessionService.createSession({
      title: 'React Development',
      sessionMode: 'custom',
      plannedDurationMinutes: 90,
    });

    const completed = await FocusSessionService.completeSession(created.id, 5400, {
      notes: 'Completed timer engine',
    });

    expect(completed.status).toBe('completed');
    expect(completed.actualDurationSeconds).toBe(5400);
    expect(completed.endedAt).toBeDefined();
    expect(completed.notes).toBe('Completed timer engine');

    const inDb = await FocusSessionService.getSessionById(created.id);
    expect(inDb?.status).toBe('completed');
    expect(inDb?.actualDurationSeconds).toBe(5400);
  });

  it('interrupts a session ended early by the user', async () => {
    const created = await FocusSessionService.createSession({
      title: 'Book Reading',
      sessionMode: 'custom',
      plannedDurationMinutes: 60,
    });

    const interrupted = await FocusSessionService.interruptSession(created.id, 1800, {
      notes: 'Had to step out for dinner',
    });

    expect(interrupted.status).toBe('interrupted');
    expect(interrupted.actualDurationSeconds).toBe(1800);

    const inDb = await FocusSessionService.getSessionById(created.id);
    expect(inDb?.status).toBe('interrupted');
    expect(inDb?.actualDurationSeconds).toBe(1800);
  });

  it('cancels a session and marks status cancelled', async () => {
    const created = await FocusSessionService.createSession({
      title: 'Mistake Session',
      sessionMode: 'custom',
      plannedDurationMinutes: 25,
    });

    const cancelled = await FocusSessionService.cancelSession(created.id, 60);
    expect(cancelled.status).toBe('cancelled');

    const inDb = await FocusSessionService.getSessionById(created.id);
    expect(inDb?.status).toBe('cancelled');
  });

  it('supports linking to an existing habit without mutating the habit or creating logs', async () => {
    // 1. Create a habit
    const habit = await HabitService.createHabit({
      title: 'Daily DSA Solving',
      description: 'Minimum 1 problem',
      category: 'craft',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01',
    });

    // 2. Create and complete a focus session linked to this habit
    const session = await FocusSessionService.createSession({
      title: 'DSA: Binary Search',
      sessionMode: 'custom',
      plannedDurationMinutes: 50,
      linkedHabitId: habit.id,
    });

    await FocusSessionService.completeSession(session.id, 3000);

    // 3. Query sessions by habit
    const habitSessions = await FocusSessionService.getSessionsByHabit(habit.id);
    expect(habitSessions.length).toBe(1);
    expect(habitSessions[0].linkedHabitId).toBe(habit.id);

    // 4. CRITICAL INVARIANT VERIFICATION:
    // Completing a focus session must NEVER create a habitLog or check in the habit!
    const allHabitLogs = await HabitLogService.getLogsForHabit(habit.id);
    expect(allHabitLogs.length).toBe(0); // Zero habit logs created!

    // Habit status remains active and unchanged
    const fetchedHabit = await HabitService.getHabitById(habit.id);
    expect(fetchedHabit?.status).toBe('active');
  });
});
