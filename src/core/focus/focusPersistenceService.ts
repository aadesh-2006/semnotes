/**
 * SEMNÓTĒS — Persistent Focus Timer State & Recovery Service
 * Sovereign personal discipline operating system.
 *
 * Ensures timer resilience against:
 * - Browser tab close or refresh
 * - System sleep or browser minimize
 * - Background tab throttling
 * - Device restarts
 */

import type { LiveTimerState, FocusPreferences } from './focusTypes';
import { DEFAULT_FOCUS_PREFERENCES } from './focusTypes';
import { FocusTimerEngine } from './focusTimerEngine';

const ACTIVE_TIMER_STORAGE_KEY = 'semnotes_active_focus_timer';
const FOCUS_PREFERENCES_STORAGE_KEY = 'semnotes_focus_preferences';

// Thresholds for detecting abandoned timers (e.g. left unattended for > 24 hours)
const ABANDONED_EXPIRED_THRESHOLD_MS = 24 * 60 * 60 * 1000;
const ABANDONED_PAUSED_THRESHOLD_MS = 48 * 60 * 60 * 1000;

export class FocusPersistenceService {
  /**
   * Persists the live timer state to localStorage.
   */
  static saveActiveTimer(state: LiveTimerState | null): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      if (!state) {
        window.localStorage.removeItem(ACTIVE_TIMER_STORAGE_KEY);
      } else {
        window.localStorage.setItem(ACTIVE_TIMER_STORAGE_KEY, JSON.stringify(state));
      }
    } catch {
      // In case of quota errors or restricted iframe, silently handle
    }
  }

  /**
   * Loads and reconciles the active timer state from localStorage.
   */
  static loadActiveTimer(nowMs: number = Date.now()): LiveTimerState | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    try {
      const raw = window.localStorage.getItem(ACTIVE_TIMER_STORAGE_KEY);
      if (!raw) return null;

      const state = JSON.parse(raw) as LiveTimerState;
      if (!state || !state.sessionId || !state.startTimestamp) {
        this.clearActiveTimer();
        return null;
      }

      // Check if session is abandoned (e.g. left days ago)
      if (this.isAbandoned(state, nowMs)) {
        this.clearActiveTimer();
        return null;
      }

      // Reconcile timestamps against current wall-clock time
      return FocusTimerEngine.reconcile(state, nowMs);
    } catch {
      this.clearActiveTimer();
      return null;
    }
  }

  /**
   * Clears the active timer from storage.
   */
  static clearActiveTimer(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.removeItem(ACTIVE_TIMER_STORAGE_KEY);
    } catch {
      // Silently handle
    }
  }

  /**
   * Determines if a stored timer state is considered abandoned.
   */
  static isAbandoned(state: LiveTimerState, nowMs: number = Date.now()): boolean {
    if (state.status === 'completed') {
      return (nowMs - state.targetEndTimestamp) > ABANDONED_EXPIRED_THRESHOLD_MS;
    }

    if (state.status === 'paused' && state.lastPauseTimestamp) {
      return (nowMs - state.lastPauseTimestamp) > ABANDONED_PAUSED_THRESHOLD_MS;
    }

    if (state.status === 'running') {
      // If it ran and targetEnd is long past
      if (nowMs > state.targetEndTimestamp + ABANDONED_EXPIRED_THRESHOLD_MS) {
        return true;
      }
    }

    return false;
  }

  /**
   * Loads user focus preferences.
   */
  static loadPreferences(): FocusPreferences {
    if (typeof window === 'undefined' || !window.localStorage) {
      return DEFAULT_FOCUS_PREFERENCES;
    }

    try {
      const raw = window.localStorage.getItem(FOCUS_PREFERENCES_STORAGE_KEY);
      if (!raw) return DEFAULT_FOCUS_PREFERENCES;
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_FOCUS_PREFERENCES,
        ...parsed,
        pomodoroConfig: {
          ...DEFAULT_FOCUS_PREFERENCES.pomodoroConfig,
          ...(parsed.pomodoroConfig || {}),
        },
      };
    } catch {
      return DEFAULT_FOCUS_PREFERENCES;
    }
  }

  /**
   * Persists user focus preferences.
   */
  static savePreferences(preferences: FocusPreferences): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      window.localStorage.setItem(FOCUS_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Silently handle
    }
  }
}
