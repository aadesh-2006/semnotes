/**
 * SEMNÓTĒS — Focus Mode & Custom Pomodoro Zod Schemas
 * Pure domain validation with strict boundaries.
 */

import { z } from 'zod';

export const SessionModeSchema = z.enum(['custom', 'pomodoro']);

export const FocusPhaseSchema = z.enum(['focus', 'short_break', 'long_break']);

export const SessionStatusSchema = z.enum(['completed', 'interrupted', 'cancelled', 'abandoned']);

export const PomodoroConfigSchema = z.object({
  focusDurationMinutes: z.number().int().min(1).max(240),
  shortBreakMinutes: z.number().int().min(1).max(60),
  longBreakMinutes: z.number().int().min(1).max(120),
  cyclesBeforeLongBreak: z.number().int().min(1).max(12),
  autoStartBreaks: z.boolean().default(false),
  autoStartFocus: z.boolean().default(false),
});

export const FocusSessionRecordSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'Session title cannot be empty').max(120),
  sessionMode: SessionModeSchema,
  linkedHabitId: z.string().uuid().optional(),
  plannedDurationMinutes: z.number().int().min(1).max(720, 'Maximum session duration is 12 hours (720 minutes)'),
  actualDurationSeconds: z.number().nonnegative(),
  breakDurationSeconds: z.number().nonnegative().default(0),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  status: SessionStatusSchema,
  notes: z.string().max(1000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted YYYY-MM-DD'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedCycles: z.number().int().nonnegative().optional(),
  totalPlannedCycles: z.number().int().positive().optional(),
});

export const CreateFocusSessionInputSchema = z.object({
  title: z.string().min(1, 'Session title cannot be empty').max(120),
  sessionMode: SessionModeSchema.default('custom'),
  linkedHabitId: z.string().uuid().optional(),
  plannedDurationMinutes: z.number().int().min(1, 'Duration must be at least 1 minute').max(720, 'Maximum duration is 720 minutes'),
  notes: z.string().max(1000).optional(),
  startedAt: z.string().datetime().optional(),
  totalPlannedCycles: z.number().int().positive().optional(),
});

export const FocusPresetSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  durationMinutes: z.number().int().min(1).max(720),
  isCustom: z.boolean().optional(),
});

export const FocusPreferencesSchema = z.object({
  defaultDurationMinutes: z.number().int().min(1).max(720),
  defaultMode: SessionModeSchema,
  presets: z.array(FocusPresetSchema),
  pomodoroConfig: PomodoroConfigSchema,
  soundEnabled: z.boolean(),
  soundVolume: z.number().min(0).max(1),
  notificationsEnabled: z.boolean(),
  preventScreenLock: z.boolean(),
});
