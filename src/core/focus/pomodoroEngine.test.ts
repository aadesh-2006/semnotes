/**
 * SEMNÓTĒS — Pomodoro Engine State Machine Tests
 * Verifies configurable cycle counts, break transitions, break skipping,
 * and strict separation of focus time vs break time.
 */

import { describe, it, expect } from 'vitest';
import { FocusTimerEngine } from './focusTimerEngine';
import { PomodoroEngine } from './pomodoroEngine';
import type { PomodoroConfig } from './focusTypes';

describe('PomodoroEngine', () => {
  const BASE_TIME = 1773000000000;

  const customConfig: PomodoroConfig = {
    focusDurationMinutes: 50,
    shortBreakMinutes: 10,
    longBreakMinutes: 25,
    cyclesBeforeLongBreak: 3,
    autoStartBreaks: false,
    autoStartFocus: false,
  };

  it('initializes pomodoro mode with configured focus duration', () => {
    const state = FocusTimerEngine.createInitialState({
      title: 'DSA Problem Solving',
      sessionMode: 'pomodoro',
      durationMinutes: 25, // Ignored in favor of pomodoroConfig.focusDurationMinutes
      pomodoroConfig: customConfig,
      nowMs: BASE_TIME,
    });

    expect(state.sessionMode).toBe('pomodoro');
    expect(state.phase).toBe('focus');
    expect(state.currentCycle).toBe(1);
    expect(state.completedCycles).toBe(0);
    expect(state.plannedDurationSeconds).toBe(50 * 60);
  });

  it('transitions from focus to short break on cycle 1 and increments completedCycles', () => {
    const state = FocusTimerEngine.createInitialState({
      title: 'Module Development',
      sessionMode: 'pomodoro',
      durationMinutes: 50,
      pomodoroConfig: customConfig,
      nowMs: BASE_TIME,
      autoStart: true,
    });

    // Run full 50-minute focus phase
    const focusEnd = BASE_TIME + 50 * 60 * 1000;
    const breakState = PomodoroEngine.transitionToNextPhase(state, focusEnd);

    expect(breakState.phase).toBe('short_break');
    expect(breakState.completedCycles).toBe(1);
    expect(breakState.priorFocusedSeconds).toBe(50 * 60);
    expect(breakState.plannedDurationSeconds).toBe(10 * 60); // 10-minute short break
    expect(breakState.status).toBe('idle'); // autoStartBreaks is false
  });

  it('triggers long break exactly after configured number of cycles (cycle 3)', () => {
    let state = FocusTimerEngine.createInitialState({
      title: 'Sprint Cycles',
      sessionMode: 'pomodoro',
      durationMinutes: 50,
      pomodoroConfig: customConfig,
      nowMs: BASE_TIME,
      autoStart: true,
    });

    let currentTime = BASE_TIME;

    // Cycle 1: Focus (50m) -> Short Break (10m)
    currentTime += 50 * 60 * 1000;
    state = PomodoroEngine.transitionToNextPhase(state, currentTime);
    expect(state.phase).toBe('short_break');
    expect(state.completedCycles).toBe(1);

    currentTime += 10 * 60 * 1000;
    state = PomodoroEngine.transitionToNextPhase(state, currentTime);
    expect(state.phase).toBe('focus');
    expect(state.currentCycle).toBe(2);

    // Cycle 2: Focus (50m) -> Short Break (10m)
    currentTime += 50 * 60 * 1000;
    state = PomodoroEngine.transitionToNextPhase(state, currentTime);
    expect(state.phase).toBe('short_break');
    expect(state.completedCycles).toBe(2);

    currentTime += 10 * 60 * 1000;
    state = PomodoroEngine.transitionToNextPhase(state, currentTime);
    expect(state.phase).toBe('focus');
    expect(state.currentCycle).toBe(3);

    // Cycle 3: Focus (50m) -> Long Break (25m) because 3 % 3 === 0
    currentTime += 50 * 60 * 1000;
    state = PomodoroEngine.transitionToNextPhase(state, currentTime);
    expect(state.phase).toBe('long_break');
    expect(state.completedCycles).toBe(3);
    expect(state.plannedDurationSeconds).toBe(25 * 60); // 25-minute long break
  });

  it('supports skipping breaks and never credits break time to focused time', () => {
    const state = FocusTimerEngine.createInitialState({
      title: 'Writing',
      sessionMode: 'pomodoro',
      durationMinutes: 50,
      pomodoroConfig: customConfig,
      nowMs: BASE_TIME,
      autoStart: true,
    });

    const at50m = BASE_TIME + 50 * 60 * 1000;
    let breakState = PomodoroEngine.transitionToNextPhase(state, at50m);
    expect(breakState.phase).toBe('short_break');

    // Start the break
    breakState = FocusTimerEngine.start(breakState, at50m);

    // 2 minutes into the running break, user skips break
    const at52m = at50m + 2 * 60 * 1000;
    const skipped = PomodoroEngine.skipBreak(breakState, at52m);

    expect(skipped.phase).toBe('focus');
    expect(skipped.currentCycle).toBe(2);
    // Focused time is strictly 50 minutes (3,000s)
    expect(skipped.priorFocusedSeconds).toBe(3000);
    // Break time is 2 minutes (120s)
    expect(skipped.priorBreakSeconds).toBe(120);
    expect(PomodoroEngine.getTotalFocusedSeconds(skipped, at52m)).toBe(3000);
    expect(PomodoroEngine.getTotalBreakSeconds(skipped, at52m)).toBe(120);
  });

  it('auto-starts breaks and focus when configured', () => {
    const autoConfig: PomodoroConfig = {
      ...customConfig,
      autoStartBreaks: true,
      autoStartFocus: true,
    };

    const state = FocusTimerEngine.createInitialState({
      title: 'Auto Flow',
      sessionMode: 'pomodoro',
      durationMinutes: 50,
      pomodoroConfig: autoConfig,
      nowMs: BASE_TIME,
      autoStart: true,
    });

    const at50m = BASE_TIME + 50 * 60 * 1000;
    const breakState = PomodoroEngine.transitionToNextPhase(state, at50m);
    expect(breakState.status).toBe('running'); // Auto-started break

    const at60m = at50m + 10 * 60 * 1000;
    const nextFocusState = PomodoroEngine.transitionToNextPhase(breakState, at60m);
    expect(nextFocusState.status).toBe('running'); // Auto-started focus
  });
});
