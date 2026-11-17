/**
 * SEMNÓTĒS — Deterministic Timestamp-Based Focus Timer Engine
 * Sovereign personal discipline operating system.
 *
 * CRITICAL ENGINEERING REQUIREMENT:
 * Timestamps are the absolute source of truth. The engine never relies on
 * setInterval tick counts. It calculates elapsed and remaining seconds
 * deterministically using (now - startTimestamp - accumulatedPausedMs).
 *
 * This guarantees 100% accuracy across inactive tabs, background throttling,
 * device sleep, and page refreshes.
 */

import type { LiveTimerState, SessionMode, FocusPhase, PomodoroConfig } from './focusTypes';
import { DEFAULT_POMODORO_CONFIG } from './focusTypes';

export interface CreateTimerOptions {
  sessionId?: string;
  title: string;
  sessionMode: SessionMode;
  durationMinutes: number;           // For custom mode (1 to 720)
  linkedHabitId?: string;
  notes?: string;
  pomodoroConfig?: PomodoroConfig;
  autoStart?: boolean;
  nowMs?: number;
}

export class FocusTimerEngine {
  /**
   * Initializes a new LiveTimerState.
   */
  static createInitialState(options: CreateTimerOptions): LiveTimerState {
    const now = options.nowMs ?? Date.now();
    const config = options.pomodoroConfig ?? DEFAULT_POMODORO_CONFIG;

    let plannedSeconds: number;
    let phase: FocusPhase = 'focus';

    if (options.sessionMode === 'pomodoro') {
      plannedSeconds = config.focusDurationMinutes * 60;
    } else {
      // Custom focus mode: duration can be any value from 1 to 720 minutes (12 hours)
      const validMinutes = Math.min(720, Math.max(1, options.durationMinutes));
      plannedSeconds = validMinutes * 60;
    }

    const autoStart = options.autoStart ?? false;

    return {
      sessionId: options.sessionId ?? crypto.randomUUID(),
      title: options.title.trim() || 'Focus Session',
      sessionMode: options.sessionMode,
      phase,
      status: autoStart ? 'running' : 'idle',
      linkedHabitId: options.linkedHabitId,
      notes: options.notes,
      startTimestamp: now,
      targetEndTimestamp: now + plannedSeconds * 1000,
      plannedDurationSeconds: plannedSeconds,
      accumulatedPausedMs: 0,
      lastPauseTimestamp: null,
      priorFocusedSeconds: 0,
      priorBreakSeconds: 0,
      currentCycle: 1,
      completedCycles: 0,
      pomodoroConfig: config,
    };
  }

  /**
   * Calculates actual elapsed seconds in the current phase.
   * Deterministic function of timestamps.
   */
  static calculateElapsedSeconds(state: LiveTimerState, nowMs: number = Date.now()): number {
    if (state.status === 'idle') {
      return 0;
    }

    if (state.status === 'completed') {
      return state.plannedDurationSeconds;
    }

    if (state.status === 'paused') {
      if (state.lastPauseTimestamp === null) {
        return 0;
      }
      // When paused, freeze time at lastPauseTimestamp
      const effectivePauseMs = Math.max(state.startTimestamp, state.lastPauseTimestamp);
      const elapsedMs = effectivePauseMs - state.startTimestamp - state.accumulatedPausedMs;
      const elapsedSec = Math.floor(Math.max(0, elapsedMs) / 1000);
      return Math.min(state.plannedDurationSeconds, elapsedSec);
    }

    // When running:
    // Protect against backward clock drift
    const effectiveNow = Math.max(state.startTimestamp, nowMs);
    const elapsedMs = effectiveNow - state.startTimestamp - state.accumulatedPausedMs;
    const elapsedSec = Math.floor(Math.max(0, elapsedMs) / 1000);

    return Math.min(state.plannedDurationSeconds, Math.max(0, elapsedSec));
  }

  /**
   * Calculates remaining seconds in the current phase.
   */
  static calculateRemainingSeconds(state: LiveTimerState, nowMs: number = Date.now()): number {
    const elapsed = this.calculateElapsedSeconds(state, nowMs);
    return Math.max(0, state.plannedDurationSeconds - elapsed);
  }

  /**
   * Calculates progress percentage [0.0 - 100.0] for the current phase.
   */
  static calculateProgress(state: LiveTimerState, nowMs: number = Date.now()): number {
    if (state.plannedDurationSeconds <= 0) return 0;
    const elapsed = this.calculateElapsedSeconds(state, nowMs);
    const progress = (elapsed / state.plannedDurationSeconds) * 100;
    return Math.min(100, Math.max(0, Math.round(progress * 10) / 10));
  }

  /**
   * Starts an idle timer.
   */
  static start(state: LiveTimerState, nowMs: number = Date.now()): LiveTimerState {
    if (state.status === 'running') {
      return state;
    }
    if (state.status === 'paused') {
      return this.resume(state, nowMs);
    }

    return {
      ...state,
      status: 'running',
      startTimestamp: nowMs,
      targetEndTimestamp: nowMs + state.plannedDurationSeconds * 1000,
      accumulatedPausedMs: 0,
      lastPauseTimestamp: null,
    };
  }

  /**
   * Pauses a running timer.
   */
  static pause(state: LiveTimerState, nowMs: number = Date.now()): LiveTimerState {
    if (state.status !== 'running') {
      return state;
    }

    return {
      ...state,
      status: 'paused',
      lastPauseTimestamp: nowMs,
    };
  }

  /**
   * Resumes a paused timer, adjusting accumulatedPausedMs and targetEndTimestamp.
   */
  static resume(state: LiveTimerState, nowMs: number = Date.now()): LiveTimerState {
    if (state.status !== 'paused') {
      return state;
    }

    const pauseStart = state.lastPauseTimestamp ?? nowMs;
    // Calculate pause duration, guarding against backward clock movements
    const pauseDurationMs = Math.max(0, nowMs - pauseStart);

    return {
      ...state,
      status: 'running',
      accumulatedPausedMs: state.accumulatedPausedMs + pauseDurationMs,
      targetEndTimestamp: state.targetEndTimestamp + pauseDurationMs,
      lastPauseTimestamp: null,
    };
  }

  /**
   * Resets the current phase to idle.
   */
  static reset(state: LiveTimerState, nowMs: number = Date.now()): LiveTimerState {
    return {
      ...state,
      status: 'idle',
      startTimestamp: nowMs,
      targetEndTimestamp: nowMs + state.plannedDurationSeconds * 1000,
      accumulatedPausedMs: 0,
      lastPauseTimestamp: null,
    };
  }

  /**
   * Checks whether the current phase has expired.
   */
  static isExpired(state: LiveTimerState, nowMs: number = Date.now()): boolean {
    if (state.status === 'completed') return true;
    if (state.status !== 'running') return false;
    return this.calculateRemainingSeconds(state, nowMs) === 0;
  }

  /**
   * Reconciles timer state after background tab throttle, sleep, or reload.
   */
  static reconcile(state: LiveTimerState, nowMs: number = Date.now()): LiveTimerState {
    if (state.status !== 'running') {
      return state;
    }

    if (this.isExpired(state, nowMs)) {
      return {
        ...state,
        status: 'completed',
      };
    }

    return state;
  }

  /**
   * Formats seconds into digital clock display (e.g., "45:00", "01:30:00").
   */
  static formatDigitalClock(totalSeconds: number): string {
    const safeSecs = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(safeSecs / 3600);
    const minutes = Math.floor((safeSecs % 3600) / 60);
    const seconds = safeSecs % 60;

    const pad = (n: number) => String(n).padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  }

  /**
   * Formats seconds into friendly readable string (e.g. "1h 30m", "45m", "25s").
   */
  static formatDurationHuman(totalSeconds: number): string {
    const safeSecs = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(safeSecs / 3600);
    const minutes = Math.floor((safeSecs % 3600) / 60);
    const seconds = safeSecs % 60;

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return `${hours}h`;
    }
    if (minutes > 0) {
      return `${minutes}m`;
    }
    return `${seconds}s`;
  }
}
