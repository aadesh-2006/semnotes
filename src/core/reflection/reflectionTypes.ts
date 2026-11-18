import { z } from 'zod';

// ==========================================
// Prompt Category & Structure
// ==========================================

export const PromptCategorySchema = z.enum([
  'discipline',
  'self_respect',
  'gratitude',
  'focus',
  'growth',
  'resilience',
  'accountability',
  'recovery'
]);
export type PromptCategory = z.infer<typeof PromptCategorySchema>;

export const ReflectionPromptSchema = z.object({
  id: z.string(),
  category: PromptCategorySchema,
  prompt: z.string().min(1),
  subtext: z.string().optional(),
});
export type ReflectionPrompt = z.infer<typeof ReflectionPromptSchema>;

// ==========================================
// Morning Intention Schema
// ==========================================

export const MorningIntentionSchema = z.object({
  id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
  primaryIntention: z.string().min(1, 'Primary intention is required'),
  keyCommitment: z.string().default(''),
  potentialObstacle: z.string().default('').optional(),
  plannedResponse: z.string().default('').optional(),
  linkedHabitIds: z.array(z.string().uuid()).default([]),
  personalNote: z.string().default('').optional(),
  createdAt: z.string(), // ISO8601
  updatedAt: z.string(), // ISO8601
});
export type MorningIntention = z.infer<typeof MorningIntentionSchema>;

export const SaveMorningIntentionInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
  primaryIntention: z.string().min(1, 'Primary intention is required'),
  keyCommitment: z.string().optional(),
  potentialObstacle: z.string().optional(),
  plannedResponse: z.string().optional(),
  linkedHabitIds: z.array(z.string().uuid()).optional(),
  personalNote: z.string().optional(),
});
export type SaveMorningIntentionInput = z.infer<typeof SaveMorningIntentionInputSchema>;

// ==========================================
// Evening Debrief Schema
// ==========================================

export const EveningDebriefSchema = z.object({
  id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
  wentWell: z.string().default('').optional(),
  commitmentsFulfilled: z.array(z.string()).default([]),
  difficultiesFaced: z.string().default('').optional(),
  lessonsLearned: z.string().default('').optional(),
  tomorrowImprovements: z.string().default('').optional(),
  gratitude: z.string().default('').optional(),
  closingNote: z.string().default('').optional(),
  createdAt: z.string(), // ISO8601
  updatedAt: z.string(), // ISO8601
});
export type EveningDebrief = z.infer<typeof EveningDebriefSchema>;

export const SaveEveningDebriefInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
  wentWell: z.string().optional(),
  commitmentsFulfilled: z.array(z.string()).optional(),
  difficultiesFaced: z.string().optional(),
  lessonsLearned: z.string().optional(),
  tomorrowImprovements: z.string().optional(),
  gratitude: z.string().optional(),
  closingNote: z.string().optional(),
});
export type SaveEveningDebriefInput = z.infer<typeof SaveEveningDebriefInputSchema>;
