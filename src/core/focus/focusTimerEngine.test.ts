/**
 * SEMNÓTĒS — Focus Timer Engine Tests
 * Comprehensive coverage of timestamp-based deterministic math,
 * custom durations, background reconciliation, and clock safety.
 */

import { describe, it, expect } from 'vitest';
import { FocusTimerEngine } from './focusTimerEngine';

describe('FocusTimerEngine', () => {
  const BASE_TIME = 1773000000000; // Fixed deterministic timestamp

  it('initializes idle state with correct planned duration in custom focus mode', () => {
    const state = FocusTimerEngine.createInitialState({
      title: 'DSA Practice',
      sessionMode: 'custom',
      durationMinutes: 45,
      nowMs: BASE_TIME,
    });

    expect(state.title).toBe('DSA Practice');
    expect(state.sessionMode).toBe('custom');
    expect(state.status).toBe('idle');
    expect(state.plannedDurationSeconds).toBe(45 * 60);
    expect(FocusTimerEngine.calculateElapsedSeconds(state, BASE_TIME)).toBe(0);
    expect(FocusTimerEngine.calculateRemainingSeconds(state, BASE_TIME)).toBe(45 * 60);
    expect(FocusTimerEngine.calculateProgress(state, BASE_TIME)).toBe(0);
  });

  it('starts an idle timer and counts elapsed seconds accurately by timestamp delta', () => {
    const initial = FocusTimerEngine.createInitialState({
      title: 'Coding Sprint',
      sessionMode: 'custom',
      durationMinutes: 25,
      nowMs: BASE_TIME,
    });

    const running = FocusTimerEngine.start(initial, BASE_TIME);
    expect(running.status).toBe('running');
    expect(running.startTimestamp).toBe(BASE_TIME);
    expect(running.targetEndTimestamp).toBe(BASE_TIME + 25 * 60 * 1000);

    // 10 minutes later (600,000 ms)
    const tenMinLater = BASE_TIME + 10 * 60 * 1000;
    expect(FocusTimerEngine.calculateElapsedSeconds(running, tenMinLater)).toBe(600);
    expect(FocusTimerEngine.calculateRemainingSeconds(running, tenMinLater)).toBe(900);
    expect(FocusTimerEngine.calculateProgress(running, tenMinLater)).toBe(40);
  });

  it('pauses and resumes timer accurately without losing elapsed time', () => {
    const initial = FocusTimerEngine.createInitialState({
      title: 'Deep Reading',
      sessionMode: 'custom',
      durationMinutes: 60,
      nowMs: BASE_TIME,
      autoStart: true,
    });

    // Run for 15 minutes
    const at15m = BASE_TIME + 15 * 60 * 1000;
    expect(FocusTimerEngine.calculateElapsedSeconds(initial, at15m)).toBe(900);

    // Pause at 15 minutes
    const paused = FocusTimerEngine.pause(initial, at15m);
    expect(paused.status).toBe('paused');
    expect(paused.lastPauseTimestamp).toBe(at15m);

    // During pause (10 minutes later while paused), elapsed time remains frozen at 15m
    const at25m = BASE_TIME + 25 * 60 * 1000;
    expect(FocusTimerEngine.calculateElapsedSeconds(paused, at25m)).toBe(900);
    expect(FocusTimerEngine.calculateRemainingSeconds(paused, at25m)).toBe(2700);

    // Resume after 10-minute pause (at 25m mark)
    const resumed = FocusTimerEngine.resume(paused, at25m);
    expect(resumed.status).toBe('running');
    expect(resumed.accumulatedPausedMs).toBe(10 * 60 * 1000);
    expect(resumed.targetEndTimestamp).toBe(BASE_TIME + 70 * 60 * 1000); // Shifted by 10m pause

    // Run for another 10 minutes (at 35m mark: 15m run + 10m pause + 10m run = 25m total run)
    const at35m = BASE_TIME + 35 * 60 * 1000;
    expect(FocusTimerEngine.calculateElapsedSeconds(resumed, at35m)).toBe(25 * 60);
    expect(FocusTimerEngine.calculateRemainingSeconds(resumed, at35m)).toBe(35 * 60);
  });

  it('resets timer back to initial duration and idle state', () => {
    const running = FocusTimerEngine.createInitialState({
      title: 'Research',
      sessionMode: 'custom',
      durationMinutes: 30,
      nowMs: BASE_TIME,
      autoStart: true,
    });

    const resetState = FocusTimerEngine.reset(running, BASE_TIME + 5000);
    expect(resetState.status).toBe('idle');
    expect(FocusTimerEngine.calculateElapsedSeconds(resetState, BASE_TIME + 5000)).toBe(0);
    expect(FocusTimerEngine.calculateRemainingSeconds(resetState, BASE_TIME + 5000)).toBe(1800);
  });

  it('detects exact expiration boundary and clamps remaining seconds to 0', () => {
    const running = FocusTimerEngine.createInitialState({
      title: 'Exam Review',
      sessionMode: 'custom',
      durationMinutes: 10,
      nowMs: BASE_TIME,
      autoStart: true,
    });

    const exactEnd = BASE_TIME + 10 * 60 * 1000;
    expect(FocusTimerEngine.calculateRemainingSeconds(running, exactEnd)).toBe(0);
    expect(FocusTimerEngine.isExpired(running, exactEnd)).toBe(true);

    // 5 minutes after expiration (e.g. background tab opened late)
    const pastEnd = BASE_TIME + 15 * 60 * 1000;
    expect(FocusTimerEngine.calculateRemainingSeconds(running, pastEnd)).toBe(0);
    expect(FocusTimerEngine.calculateElapsedSeconds(running, pastEnd)).toBe(600);
    expect(FocusTimerEngine.calculateProgress(running, pastEnd)).toBe(100);

    const reconciled = FocusTimerEngine.reconcile(running, pastEnd);
    expect(reconciled.status).toBe('completed');
  });

  it('safely handles backward device clock adjustments without crashing', () => {
    const running = FocusTimerEngine.createInitialState({
      title: 'Clock Test',
      sessionMode: 'custom',
      durationMinutes: 20,
      nowMs: BASE_TIME,
      autoStart: true,
    });

    // Clock set backwards by 1 hour
    const backwardTime = BASE_TIME - 3600 * 1000;
    expect(FocusTimerEngine.calculateElapsedSeconds(running, backwardTime)).toBe(0);
    expect(FocusTimerEngine.calculateRemainingSeconds(running, backwardTime)).toBe(1200);
  });

  it('supports single continuous 3-hour (180-minute) marathon session without forced breaks', () => {
    const marathon = FocusTimerEngine.createInitialState({
      title: 'System Design Marathon',
      sessionMode: 'custom',
      durationMinutes: 180,
      nowMs: BASE_TIME,
      autoStart: true,
    });

    expect(marathon.plannedDurationSeconds).toBe(180 * 60); // 10,800 seconds
    expect(marathon.sessionMode).toBe('custom');
    expect(marathon.phase).toBe('focus');

    // After 90 minutes (5,400s)
    const midPoint = BASE_TIME + 90 * 60 * 1000;
    expect(FocusTimerEngine.calculateElapsedSeconds(marathon, midPoint)).toBe(5400);
    expect(FocusTimerEngine.calculateRemainingSeconds(marathon, midPoint)).toBe(5400);
    expect(FocusTimerEngine.calculateProgress(marathon, midPoint)).toBe(50);

    // After 180 minutes (10,800s)
    const endPoint = BASE_TIME + 180 * 60 * 1000;
    expect(FocusTimerEngine.calculateElapsedSeconds(marathon, endPoint)).toBe(10800);
    expect(FocusTimerEngine.calculateRemainingSeconds(marathon, endPoint)).toBe(0);
  });

  it('supports all standard presets: 15m, 25m, 50m, 90m, 120m, 180m', () => {
    const presets = [15, 25, 50, 90, 120, 180];
    for (const mins of presets) {
      const state = FocusTimerEngine.createInitialState({
        title: `Preset ${mins}`,
        sessionMode: 'custom',
        durationMinutes: mins,
      });
      expect(state.plannedDurationSeconds).toBe(mins * 60);
    }
  });

  it('supports arbitrary custom durations like 47 minutes or 210 minutes', () => {
    const state47 = FocusTimerEngine.createInitialState({
      title: 'Custom 47m',
      sessionMode: 'custom',
      durationMinutes: 47,
    });
    expect(state47.plannedDurationSeconds).toBe(47 * 60);

    const state210 = FocusTimerEngine.createInitialState({
      title: 'Custom 210m (3.5h)',
      sessionMode: 'custom',
      durationMinutes: 210,
    });
    expect(state210.plannedDurationSeconds).toBe(210 * 60);
  });

  it('clamps duration boundaries between 1 minute minimum and 720 minutes maximum', () => {
    const minState = FocusTimerEngine.createInitialState({
      title: 'Min',
      sessionMode: 'custom',
      durationMinutes: 0,
    });
    expect(minState.plannedDurationSeconds).toBe(60); // 1 minute minimum

    const maxState = FocusTimerEngine.createInitialState({
      title: 'Max',
      sessionMode: 'custom',
      durationMinutes: 1000,
    });
    expect(maxState.plannedDurationSeconds).toBe(720 * 60); // 12 hours maximum
  });

  it('formats digital clock display and friendly duration string cleanly', () => {
    expect(FocusTimerEngine.formatDigitalClock(0)).toBe('00:00');
    expect(FocusTimerEngine.formatDigitalClock(59)).toBe('00:59');
    expect(FocusTimerEngine.formatDigitalClock(60)).toBe('01:00');
    expect(FocusTimerEngine.formatDigitalClock(1500)).toBe('25:00');
    expect(FocusTimerEngine.formatDigitalClock(5400)).toBe('01:30:00');
    expect(FocusTimerEngine.formatDigitalClock(10800)).toBe('03:00:00');

    expect(FocusTimerEngine.formatDurationHuman(45)).toBe('45s');
    expect(FocusTimerEngine.formatDurationHuman(1500)).toBe('25m');
    expect(FocusTimerEngine.formatDurationHuman(5400)).toBe('1h 30m');
    expect(FocusTimerEngine.formatDurationHuman(7200)).toBe('2h');
  });
});
