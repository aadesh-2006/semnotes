/**
 * SEMNÓTĒS — Pomodoro Cycle State Machine
 * Sovereign personal discipline operating system.
 *
 * Provides pure state machine transitions for configurable Pomodoro cycles:
 * - Focus phase -> Short Break (or Long Break after N cycles) -> Focus phase
 * - Manual or automatic phase transitions
 * - Skipping breaks
 * - Clean separation of focused time vs break time
 */

import type { LiveTimerState, FocusPhase } from './focusTypes';
import { FocusTimerEngine } from './focusTimerEngine';

export class PomodoroEngine {
  /**
   * Advances the timer to the next logical phase in the Pomodoro cycle.
   */
  static transitionToNextPhase(state: LiveTimerState, nowMs: number = Date.now()): LiveTimerState {
    const config = state.pomodoroConfig;
    const elapsedInPhase = FocusTimerEngine.calculateElapsedSeconds(state, nowMs);

    if (state.phase === 'focus') {
      // Focus phase completed
      const newCompletedCycles = state.completedCycles + 1;
      const newPriorFocused = state.priorFocusedSeconds + elapsedInPhase;

      // Determine whether this cycle triggers a long break
      const isLongBreak = newCompletedCycles % config.cyclesBeforeLongBreak === 0;
      const nextPhase: FocusPhase = isLongBreak ? 'long_break' : 'short_break';
      const durationMins = isLongBreak ? config.longBreakMinutes : config.shortBreakMinutes;
      const plannedSeconds = durationMins * 60;
      const autoStart = config.autoStartBreaks;

      return {
        ...state,
        phase: nextPhase,
        status: autoStart ? 'running' : 'idle',
        completedCycles: newCompletedCycles,
        priorFocusedSeconds: newPriorFocused,
        plannedDurationSeconds: plannedSeconds,
        startTimestamp: nowMs,
        targetEndTimestamp: nowMs + plannedSeconds * 1000,
        accumulatedPausedMs: 0,
        lastPauseTimestamp: null,
      };
    } else {
      // Break phase (short or long) completed
      const newPriorBreak = state.priorBreakSeconds + elapsedInPhase;
      const nextCycle = state.currentCycle + 1;
      const plannedSeconds = config.focusDurationMinutes * 60;
      const autoStart = config.autoStartFocus;

      return {
        ...state,
        phase: 'focus',
        status: autoStart ? 'running' : 'idle',
        currentCycle: nextCycle,
        priorBreakSeconds: newPriorBreak,
        plannedDurationSeconds: plannedSeconds,
        startTimestamp: nowMs,
        targetEndTimestamp: nowMs + plannedSeconds * 1000,
        accumulatedPausedMs: 0,
        lastPauseTimestamp: null,
      };
    }
  }

  /**
   * Immediately skips the current break phase and returns to focus.
   */
  static skipBreak(state: LiveTimerState, nowMs: number = Date.now()): LiveTimerState {
    if (state.phase === 'focus') {
      return state; // Cannot skip break while in focus phase
    }

    const elapsedBreak = FocusTimerEngine.calculateElapsedSeconds(state, nowMs);
    const newPriorBreak = state.priorBreakSeconds + elapsedBreak;
    const nextCycle = state.currentCycle + 1;
    const plannedSeconds = state.pomodoroConfig.focusDurationMinutes * 60;

    return {
      ...state,
      phase: 'focus',
      status: 'idle',
      currentCycle: nextCycle,
      priorBreakSeconds: newPriorBreak,
      plannedDurationSeconds: plannedSeconds,
      startTimestamp: nowMs,
      targetEndTimestamp: nowMs + plannedSeconds * 1000,
      accumulatedPausedMs: 0,
      lastPauseTimestamp: null,
    };
  }

  /**
   * Calculates total focused work seconds across all phases in the session.
   * BREAK TIME IS NEVER INCLUDED IN FOCUSED TIME.
   */
  static getTotalFocusedSeconds(state: LiveTimerState, nowMs: number = Date.now()): number {
    if (state.sessionMode === 'custom') {
      return FocusTimerEngine.calculateElapsedSeconds(state, nowMs);
    }

    if (state.phase === 'focus') {
      const currentPhaseElapsed = FocusTimerEngine.calculateElapsedSeconds(state, nowMs);
      return state.priorFocusedSeconds + currentPhaseElapsed;
    }

    // In break phase, focused time is purely the accumulated prior focus time
    return state.priorFocusedSeconds;
  }

  /**
   * Calculates total break seconds across all phases in the session.
   */
  static getTotalBreakSeconds(state: LiveTimerState, nowMs: number = Date.now()): number {
    if (state.sessionMode === 'custom') {
      return 0; // Custom focus mode has zero break time
    }

    if (state.phase !== 'focus') {
      const currentBreakElapsed = FocusTimerEngine.calculateElapsedSeconds(state, nowMs);
      return state.priorBreakSeconds + currentBreakElapsed;
    }

    return state.priorBreakSeconds;
  }
}
