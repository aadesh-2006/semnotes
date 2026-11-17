/**
 * SEMNÓTĒS — Focus Mode & Custom Pomodoro Domain Types
 * Sovereign personal discipline operating system.
 */

export type SessionMode = 'custom' | 'pomodoro';

export type FocusPhase = 'focus' | 'short_break' | 'long_break';

export type SessionStatus = 'completed' | 'interrupted' | 'cancelled' | 'abandoned';

export interface PomodoroConfig {
  focusDurationMinutes: number;   // e.g., 25, 50
  shortBreakMinutes: number;      // e.g., 5, 10
  longBreakMinutes: number;       // e.g., 15, 25
  cyclesBeforeLongBreak: number;  // e.g., 3, 4
  autoStartBreaks: boolean;       // whether breaks start without manual click
  autoStartFocus: boolean;        // whether focus starts without manual click
}

export interface FocusSessionRecord {
  id: string;                         // UUID
  title: string;                      // e.g., "DSA Practice", "React Development"
  sessionMode: SessionMode;           // 'custom' | 'pomodoro'
  linkedHabitId?: string;             // Optional UUID of associated habit
  plannedDurationMinutes: number;     // Configured planned duration in minutes (1 to 720)
  actualDurationSeconds: number;      // Actual focused work seconds (strictly excludes breaks)
  breakDurationSeconds: number;       // Accumulated break seconds (for pomodoro mode)
  startedAt: string;                  // ISO8601 string
  endedAt?: string;                   // ISO8601 string
  status: SessionStatus;              // 'completed' | 'interrupted' | 'cancelled' | 'abandoned'
  notes?: string;                     // Optional intention or debrief note
  date: string;                       // YYYY-MM-DD local calendar date
  createdAt: string;                  // ISO8601 string
  updatedAt: string;                  // ISO8601 string
  // Pomodoro cycle metrics
  completedCycles?: number;           // Number of completed focus phases in this session
  totalPlannedCycles?: number;        // Total cycles configured for this session
}

export interface CreateFocusSessionInput {
  title: string;
  sessionMode: SessionMode;
  linkedHabitId?: string;
  plannedDurationMinutes: number;
  notes?: string;
  startedAt?: string;                 // Defaults to current ISO timestamp
  totalPlannedCycles?: number;
}

export interface LiveTimerState {
  sessionId: string;
  title: string;
  sessionMode: SessionMode;
  phase: FocusPhase;
  status: 'idle' | 'running' | 'paused' | 'completed';
  linkedHabitId?: string;
  notes?: string;
  // Timing variables (Epoch milliseconds as source of truth)
  startTimestamp: number;             // Timestamp when the current phase started
  targetEndTimestamp: number;         // Timestamp when the current phase is scheduled to end
  plannedDurationSeconds: number;     // Target seconds for this phase
  accumulatedPausedMs: number;        // Total paused milliseconds accumulated in this phase
  lastPauseTimestamp: number | null;  // Timestamp when paused, or null if running
  // Accumulated focus and break work across previous phases in this session
  priorFocusedSeconds: number;        // Total completed focus seconds prior to current phase
  priorBreakSeconds: number;          // Total completed break seconds prior to current phase
  // Pomodoro cycle tracking
  currentCycle: number;               // 1-indexed current cycle
  completedCycles: number;            // Number of successfully completed focus phases
  pomodoroConfig: PomodoroConfig;
}

export interface FocusPreset {
  id: string;
  label: string;
  durationMinutes: number;
  isCustom?: boolean;
}

export interface FocusPreferences {
  defaultDurationMinutes: number;
  defaultMode: SessionMode;
  presets: FocusPreset[];
  pomodoroConfig: PomodoroConfig;
  soundEnabled: boolean;
  soundVolume: number;                // 0.0 to 1.0
  notificationsEnabled: boolean;
  preventScreenLock: boolean;
}

export const DEFAULT_POMODORO_CONFIG: PomodoroConfig = {
  focusDurationMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  cyclesBeforeLongBreak: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
};

export const DEFAULT_FOCUS_PRESETS: FocusPreset[] = [
  { id: 'short', label: 'Short Focus', durationMinutes: 15 },
  { id: 'pomodoro', label: 'Pomodoro', durationMinutes: 25 },
  { id: 'deep', label: 'Deep Focus', durationMinutes: 50 },
  { id: 'extended', label: 'Extended Focus', durationMinutes: 90 },
  { id: 'long', label: 'Long Session', durationMinutes: 120 },
  { id: 'marathon', label: 'Marathon Session', durationMinutes: 180 },
];

export const DEFAULT_FOCUS_PREFERENCES: FocusPreferences = {
  defaultDurationMinutes: 50,
  defaultMode: 'custom',
  presets: DEFAULT_FOCUS_PRESETS,
  pomodoroConfig: DEFAULT_POMODORO_CONFIG,
  soundEnabled: true,
  soundVolume: 0.7,
  notificationsEnabled: false,
  preventScreenLock: false,
};
