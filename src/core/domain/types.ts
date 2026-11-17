import { z } from 'zod';

// ==========================================
// Habit Types & Category
// ==========================================
export const HabitCategorySchema = z.enum([
  'abstinence',    // No PMO, no alcohol, no smoking, digital purity
  'discipline',    // Deep work, cold shower, morning routine
  'mind',          // Reading, meditation, journaling
  'body',          // Workouts, walking, clean nutrition
  'craft',         // DSA, coding, writing, deliberate practice
  'custom'
]);
export type HabitCategory = z.infer<typeof HabitCategorySchema>;

export const HabitTypeSchema = z.enum([
  'abstinence',    // Abstinence tracking (succeeds by avoiding trigger)
  'completion',    // Binary completion (done / not done)
  'quantitative'   // Measured target (e.g., 5000 steps, 45 mins reading)
]);
export type HabitType = z.infer<typeof HabitTypeSchema>;

export const HabitStatusSchema = z.enum(['active', 'paused', 'archived']);
export type HabitStatus = z.infer<typeof HabitStatusSchema>;

export const TargetConstraintSchema = z.enum(['at_least', 'at_most']).default('at_least');
export type TargetConstraint = z.infer<typeof TargetConstraintSchema>;

// ==========================================
// Habit Schedule
// ==========================================
export const HabitScheduleSchema = z.object({
  frequency: z.enum(['daily', 'selected_days']),
  // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  selectedDays: z.array(z.number().min(0).max(6)).default([0, 1, 2, 3, 4, 5, 6]),
});
export type HabitSchedule = z.infer<typeof HabitScheduleSchema>;

// ==========================================
// Habit Entity
// ==========================================
export const HabitSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'Habit title is required'),
  description: z.string().default(''),
  category: HabitCategorySchema,
  type: HabitTypeSchema,
  schedule: HabitScheduleSchema,
  targetValue: z.number().positive().optional(),
  targetConstraint: TargetConstraintSchema.optional(),
  unit: z.string().optional(),
  icon: z.string().optional(),
  notes: z.string().optional(),
  startDate: z.string(), // YYYY-MM-DD
  endDate: z.string().optional(), // Optional YYYY-MM-DD
  status: HabitStatusSchema.default('active'),
  createdAt: z.string(), // ISO8601
  updatedAt: z.string(), // ISO8601
  sortOrder: z.number().default(0),
});
export type Habit = z.infer<typeof HabitSchema>;

// Input schema for creation (omitting system-generated fields)
export const CreateHabitInputSchema = HabitSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  sortOrder: true,
}).extend({
  description: z.string().default('').optional(),
  status: HabitStatusSchema.default('active').optional(),
});
export type CreateHabitInput = z.infer<typeof CreateHabitInputSchema>;

// Input schema for updates
export const UpdateHabitInputSchema = CreateHabitInputSchema.partial();
export type UpdateHabitInput = z.infer<typeof UpdateHabitInputSchema>;

// ==========================================
// Habit Daily Log & Audit
// ==========================================
export const HabitLogStatusSchema = z.enum([
  'completed',   // Successfully fulfilled habit (or Abstinence: Maintained)
  'failed',      // Explicitly failed / Setback / did not reach target / Missed
  'missed',      // Day passed without check-in under strict policy
  'skipped'      // Scheduled rest day or excused
]);
export type HabitLogStatus = z.infer<typeof HabitLogStatusSchema>;

export const HabitLogSchema = z.object({
  id: z.string().uuid(),
  habitId: z.string().uuid(),
  date: z.string(), // YYYY-MM-DD
  status: HabitLogStatusSchema,
  numericValue: z.number().optional(),
  notes: z.string().optional(),
  correctedAt: z.string().optional(),
  correctionReason: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type HabitLog = z.infer<typeof HabitLogSchema>;

// Audit Record Schema
export const AuditRecordSchema = z.object({
  id: z.string().uuid(),
  habitId: z.string().uuid(),
  habitLogId: z.string().uuid().optional(),
  date: z.string(), // YYYY-MM-DD
  action: z.enum(['create', 'check_in', 'correction', 'status_change', 'archive', 'pause', 'resume']),
  previousStatus: z.string().optional(),
  newStatus: z.string().optional(),
  previousValue: z.number().optional(),
  newValue: z.number().optional(),
  reason: z.string().optional(),
  timestamp: z.string(), // ISO8601
});
export type AuditRecord = z.infer<typeof AuditRecordSchema>;

// ==========================================
// Streak Record (Computed & Cached for M3)
// ==========================================
export const StreakRecordSchema = z.object({
  habitId: z.string().uuid(),
  currentStreak: z.number().nonnegative(),
  longestStreak: z.number().nonnegative(),
  totalSuccessfulDays: z.number().nonnegative(),
  completionRate: z.number().min(0).max(100),
  lastCalculatedDate: z.string(), // YYYY-MM-DD
});
export type StreakRecord = z.infer<typeof StreakRecordSchema>;

// ==========================================
// Milestones & Rewards (M4)
// ==========================================
export const MilestoneSchema = z.object({
  id: z.string().uuid(),
  habitId: z.string().uuid(),
  thresholdDays: z.number().int().positive('Threshold must be a positive whole number of days'),
  rewardTitle: z.string().min(1, 'Reward title is required'),
  rewardDescription: z.string().default('').optional(),
  personalNote: z.string().optional(),
  rewardCategory: z.string().optional(),
  isEnabled: z.boolean().default(true),
  sortOrder: z.number().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Milestone = z.infer<typeof MilestoneSchema>;

export const CreateMilestoneInputSchema = MilestoneSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  sortOrder: true,
}).extend({
  isEnabled: z.boolean().default(true).optional(),
  sortOrder: z.number().optional(),
});
export type CreateMilestoneInput = z.infer<typeof CreateMilestoneInputSchema>;

export const UpdateMilestoneInputSchema = CreateMilestoneInputSchema.partial();
export type UpdateMilestoneInput = z.infer<typeof UpdateMilestoneInputSchema>;

// Achievement Schema (Immutable snapshot of earned milestone within a streak instance)
export const AchievementSchema = z.object({
  id: z.string().uuid(),
  habitId: z.string().uuid(),
  milestoneId: z.string().uuid(),
  thresholdDays: z.number().int().positive(),
  streakStartDate: z.string(), // YYYY-MM-DD
  achievedDate: z.string(),    // YYYY-MM-DD
  achievedStreakLength: z.number().int().positive(),
  rewardTitle: z.string(),       // Immutable snapshot of title
  rewardDescription: z.string(), // Immutable snapshot
  rewardCategory: z.string().optional(),
  personalNote: z.string().optional(),
  isClaimed: z.boolean().default(false),
  claimedAt: z.string().optional(), // ISO8601
  claimNotes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Achievement = z.infer<typeof AchievementSchema>;

export const ClaimRewardInputSchema = z.object({
  claimNotes: z.string().optional(),
  claimedAt: z.string().optional(), // Defaults to now
});
export type ClaimRewardInput = z.infer<typeof ClaimRewardInputSchema>;

// ==========================================
// Journal, Reflection & Urge Logs (M6)
// ==========================================
export * from '../journal/journalTypes';
export * from '../reflection/reflectionTypes';
export * from '../urges/urgeTypes';

// Legacy type alias for UrgeLog compatibility with Dexie v1
export type UrgeLog = import('../urges/urgeTypes').UrgeLogRecord;


// ==========================================
// Focus Sessions & Pomodoro (M8)
// ==========================================
export * from '../focus/focusTypes';
export * from '../focus/focusSchemas';

export type FocusSession = import('../focus/focusTypes').FocusSessionRecord;

// ==========================================
// User Settings & Privacy (Module 10)
// ==========================================
export const UserSettingsSchema = z.object({
  userName: z.string().default('Commander'),
  motto: z.string().default('Dignity. Self-respect. Discipline.'),
  strictStreakPolicy: z.boolean().default(true),
  theme: z.enum(['obsidian-gold']).default('obsidian-gold'),
  soundEnabled: z.boolean().default(false),
  autoArchiveDays: z.number().default(90),
  encryptionEnabled: z.boolean().default(false),
  syncEnabled: z.boolean().default(false),
});
export type UserSettings = z.infer<typeof UserSettingsSchema>;
