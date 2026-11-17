/**
 * SEMNÓTĒS — Milestone 8: Focus Mode & Custom Pomodoro Engine
 * End-to-End Workflow & Integration Test Suite.
 *
 * Verifies:
 * 1. Unrestricted continuous custom focus sessions (including 3-hour marathons).
 * 2. True timestamp-driven pause, resume, and background reconciliation.
 * 3. Configurable Pomodoro cycles with short/long break state machine.
 * 4. Strict isolation: Completing focus sessions NEVER creates habit logs or mutates streaks.
 * 5. Persistent session history and analytics ledger integration.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../storage/db';
import { FocusTimerEngine } from '../core/focus/focusTimerEngine';
import { PomodoroEngine } from '../core/focus/pomodoroEngine';
import { FocusPersistenceService } from '../core/focus/focusPersistenceService';
import { FocusSessionService } from '../core/focus/focusSessionService';
import { FocusAnalyticsService } from '../core/focus/focusAnalyticsService';
import { HabitService } from '../core/services/habitService';
import { HabitLogService } from '../core/services/habitLogService';
import { StreakCalculator } from '../core/streak/streakCalculator';
import type { PomodoroConfig } from '../core/focus/focusTypes';

describe('Milestone 8: Focus Mode & Custom Pomodoro End-to-End Integration', () => {
  const BASE_TIME = 1773000000000;

  beforeEach(async () => {
    await db.focusSessions.clear();
    await db.habits.clear();
    await db.habitLogs.clear();
    await db.auditRecords.clear();
    FocusPersistenceService.clearActiveTimer();
  });

  it('Scenario 1: Executes an uninterrupted 3-hour (180-minute) continuous custom focus session', async () => {
    // 1. Create a habit (e.g. System Architecture Practice)
    const habit = await HabitService.createHabit({
      title: 'System Architecture & DSA',
      description: 'Deep engineering problem solving',
      category: 'craft',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01',
    });

    // 2. Configure 180-minute continuous marathon focus session
    const timerState = FocusTimerEngine.createInitialState({
      title: 'System Design Marathon',
      sessionMode: 'custom',
      durationMinutes: 180,
      linkedHabitId: habit.id,
      notes: 'Design distributed cache and message broker',
      nowMs: BASE_TIME,
    });

    expect(timerState.plannedDurationSeconds).toBe(180 * 60); // 10,800 seconds
    expect(timerState.sessionMode).toBe('custom');
    expect(timerState.phase).toBe('focus');

    // 3. Start timer
    let running = FocusTimerEngine.start(timerState, BASE_TIME);
    expect(running.status).toBe('running');

    // 4. Register session in Dexie DB
    const dbSession = await FocusSessionService.createSession({
      title: running.title,
      sessionMode: running.sessionMode,
      linkedHabitId: running.linkedHabitId,
      plannedDurationMinutes: 180,
      notes: running.notes,
      startedAt: new Date(BASE_TIME).toISOString(),
    });
    expect(dbSession.id).toBeDefined();

    // 5. Run for 60 minutes, then pause
    const at60m = BASE_TIME + 60 * 60 * 1000;
    expect(FocusTimerEngine.calculateElapsedSeconds(running, at60m)).toBe(3600);
    const paused = FocusTimerEngine.pause(running, at60m);

    // 6. Resume after 15 minutes of pause (at 75m mark)
    const at75m = BASE_TIME + 75 * 60 * 1000;
    running = FocusTimerEngine.resume(paused, at75m);
    expect(running.accumulatedPausedMs).toBe(15 * 60 * 1000);
    expect(running.targetEndTimestamp).toBe(BASE_TIME + 195 * 60 * 1000); // 180m + 15m pause

    // 7. Complete the full 180 minutes of actual focus (at 195m mark)
    const at195m = BASE_TIME + 195 * 60 * 1000;
    expect(FocusTimerEngine.calculateElapsedSeconds(running, at195m)).toBe(10800);
    expect(FocusTimerEngine.calculateRemainingSeconds(running, at195m)).toBe(0);
    expect(FocusTimerEngine.isExpired(running, at195m)).toBe(true);

    // 8. Persist completed session
    const completedSession = await FocusSessionService.completeSession(dbSession.id, 10800, {
      notes: 'Completed full cache design specifications',
    });

    expect(completedSession.status).toBe('completed');
    expect(completedSession.actualDurationSeconds).toBe(10800);
    expect(completedSession.breakDurationSeconds).toBe(0);

    // 9. CRITICAL INVARIANT VERIFICATION:
    // Focus sessions must NEVER automatically check in the habit or modify streaks!
    const habitLogs = await HabitLogService.getLogsForHabit(habit.id);
    expect(habitLogs.length).toBe(0); // Zero logs created!

    const streak = StreakCalculator.calculateStreak(habit, habitLogs, {
      evaluationDate: '2026-11-18',
    });
    expect(streak.currentStreak).toBe(0); // Unmutated!
  });

  it('Scenario 2: Executes configurable Pomodoro cycles with short and long break transitions', async () => {
    const pomodoroConfig: PomodoroConfig = {
      focusDurationMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      cyclesBeforeLongBreak: 2,
      autoStartBreaks: true,
      autoStartFocus: true,
    };

    let timer = FocusTimerEngine.createInitialState({
      title: 'Problem Solving',
      sessionMode: 'pomodoro',
      durationMinutes: 25,
      pomodoroConfig,
      nowMs: BASE_TIME,
      autoStart: true,
    });

    // 1. Register in Dexie DB
    const dbSession = await FocusSessionService.createSession({
      title: timer.title,
      sessionMode: 'pomodoro',
      plannedDurationMinutes: 50, // 2 cycles of 25m
      totalPlannedCycles: 2,
    });

    let currentTime = BASE_TIME;

    // Cycle 1 Focus (25m)
    currentTime += 25 * 60 * 1000;
    timer = PomodoroEngine.transitionToNextPhase(timer, currentTime);
    expect(timer.phase).toBe('short_break');
    expect(timer.completedCycles).toBe(1);
    expect(timer.priorFocusedSeconds).toBe(1500);

    // Cycle 1 Short Break (5m)
    currentTime += 5 * 60 * 1000;
    timer = PomodoroEngine.transitionToNextPhase(timer, currentTime);
    expect(timer.phase).toBe('focus');
    expect(timer.currentCycle).toBe(2);
    expect(timer.priorBreakSeconds).toBe(300);

    // Cycle 2 Focus (25m) -> Long break because 2 % 2 === 0
    currentTime += 25 * 60 * 1000;
    timer = PomodoroEngine.transitionToNextPhase(timer, currentTime);
    expect(timer.phase).toBe('long_break');
    expect(timer.completedCycles).toBe(2);
    expect(timer.priorFocusedSeconds).toBe(3000); // 50 minutes focused
    expect(timer.plannedDurationSeconds).toBe(15 * 60); // 15-minute long break

    // Finalize session in Dexie
    const finalSession = await FocusSessionService.completeSession(
      dbSession.id,
      timer.priorFocusedSeconds,
      {
        breakDurationSeconds: timer.priorBreakSeconds,
        completedCycles: timer.completedCycles,
      }
    );

    expect(finalSession.status).toBe('completed');
    expect(finalSession.actualDurationSeconds).toBe(3000); // 50m focus
    expect(finalSession.breakDurationSeconds).toBe(300);   // 5m break
  });

  it('Scenario 3: Interruption and persistence recovery via FocusPersistenceService', async () => {
    const timer = FocusTimerEngine.createInitialState({
      title: 'Quick Reading',
      sessionMode: 'custom',
      durationMinutes: 45,
      nowMs: BASE_TIME,
      autoStart: true,
    });

    // Persist to storage
    FocusPersistenceService.saveActiveTimer(timer);

    // Reload from storage (simulates tab refresh)
    const reloaded = FocusPersistenceService.loadActiveTimer(BASE_TIME + 10 * 60 * 1000);
    expect(reloaded).not.toBeNull();
    expect(reloaded?.title).toBe('Quick Reading');
    expect(FocusTimerEngine.calculateElapsedSeconds(reloaded!, BASE_TIME + 10 * 60 * 1000)).toBe(600);

    // User interrupts session early at 15 minutes
    const dbSession = await FocusSessionService.createSession({
      title: 'Quick Reading',
      sessionMode: 'custom',
      plannedDurationMinutes: 45,
    });

    const interrupted = await FocusSessionService.interruptSession(dbSession.id, 900, {
      notes: 'Interrupted by unexpected phone call',
    });

    expect(interrupted.status).toBe('interrupted');
    expect(interrupted.actualDurationSeconds).toBe(900);

    FocusPersistenceService.clearActiveTimer();
    expect(FocusPersistenceService.loadActiveTimer()).toBeNull();
  });

  it('Scenario 4: Computes accurate focus analytics across multiple historical sessions', async () => {
    // Populate 3 distinct sessions in Dexie
    const s1 = await FocusSessionService.createSession({
      title: 'DSA Practice',
      sessionMode: 'custom',
      plannedDurationMinutes: 50,
      startedAt: '2026-11-15T10:00:00.000Z',
    });
    await FocusSessionService.completeSession(s1.id, 3000);

    const s2 = await FocusSessionService.createSession({
      title: 'Marathon Coding',
      sessionMode: 'custom',
      plannedDurationMinutes: 120,
      startedAt: '2026-11-15T14:00:00.000Z',
    });
    await FocusSessionService.completeSession(s2.id, 7200);

    const s3 = await FocusSessionService.createSession({
      title: 'Cancelled Attempt',
      sessionMode: 'custom',
      plannedDurationMinutes: 25,
      startedAt: '2026-11-15T18:00:00.000Z',
    });
    await FocusSessionService.cancelSession(s3.id, 120);

    const allSessions = await FocusSessionService.getAllSessions();
    expect(allSessions.length).toBe(3);

    const summary = FocusAnalyticsService.calculateSummary(allSessions);
    expect(summary.completedSessionsCount).toBe(2);
    expect(summary.totalFocusedSeconds).toBe(10200); // 3000 + 7200 = 10,200s = 170 mins
    expect(summary.totalFocusedMinutes).toBe(170);
    expect(summary.longestSessionMinutes).toBe(120); // 2 hours
    expect(summary.averageSessionDurationMinutes).toBe(85); // 170 / 2 = 85 mins
  });
});
