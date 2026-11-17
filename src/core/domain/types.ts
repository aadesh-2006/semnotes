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
  thresholdDays: z.number().positive(),
  rewardTitle: z.string().min(1, 'Reward title required'),
  rewardDescription: z.string().default(''),
  isUnlocked: z.boolean().default(false),
  unlockedAt: z.string().optional(),
  isClaimed: z.boolean().default(false),
  claimedAt: z.string().optional(),
  createdAt: z.string(),
});
export type Milestone = z.infer<typeof MilestoneSchema>;

// ==========================================
// Journal & Urge Log (M5)
// ==========================================
export const UrgeLogSchema = z.object({
  id: z.string().uuid(),
  habitId: z.string().uuid(),
  timestamp: z.string(),
  intensity: z.number().min(1).max(10), // 1 to 10
  trigger: z.string(),
  context: z.string().optional(),
  response: z.enum(['resisted', 'diverted', 'succumbed']),
  tacticsUsed: z.array(z.string()).default([]),
  notes: z.string().optional(),
});
export type UrgeLog = z.infer<typeof UrgeLogSchema>;

export const JournalEntrySchema = z.object({
  id: z.string().uuid(),
  date: z.string(), // YYYY-MM-DD
  mood: z.number().min(1).max(5), // 1 (lowest) to 5 (highest)
  energyLevel: z.number().min(1).max(5).default(3),
  title: z.string().optional(),
  content: z.string(),
  promptsAnswered: z.record(z.string()).optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type JournalEntry = z.infer<typeof JournalEntrySchema>;

// ==========================================
// Focus Sessions (Module 8)
// ==========================================
export const FocusSessionSchema = z.object({
  id: z.string().uuid(),
  habitId: z.string().uuid().optional(),
  durationMinutes: z.number().positive(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  status: z.enum(['completed', 'interrupted', 'in_progress']),
  notes: z.string().optional(),
});
export type FocusSession = z.infer<typeof FocusSessionSchema>;

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
