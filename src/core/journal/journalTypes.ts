import { z } from 'zod';

// ==========================================
// Journal Entry Domain Schemas & Types
// ==========================================

export const MoodScoreSchema = z.number().int().min(1).max(5);
export type MoodScore = z.infer<typeof MoodScoreSchema>;

export const EmotionalStateSchema = z.enum([
  'calm',
  'focused',
  'energized',
  'anxious',
  'fatigued',
  'frustrated',
  'reflective',
  'victorious',
  'neutral'
]);
export type EmotionalState = z.infer<typeof EmotionalStateSchema>;

export const JournalEntrySchema = z.object({
  id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
  title: z.string().default(''),
  content: z.string(),
  tags: z.array(z.string()).default([]),
  linkedHabitId: z.string().uuid().optional(),
  mood: MoodScoreSchema.optional(),
  emotionalState: EmotionalStateSchema.optional(),
  isArchived: z.boolean().default(false),
  createdAt: z.string(), // ISO8601
  updatedAt: z.string(), // ISO8601
});
export type JournalEntry = z.infer<typeof JournalEntrySchema>;

// Creation Input Schema
export const CreateJournalEntryInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
  title: z.string().default('').optional(),
  content: z.string().min(1, 'Journal content cannot be empty'),
  tags: z.array(z.string()).default([]).optional(),
  linkedHabitId: z.string().uuid().optional(),
  mood: MoodScoreSchema.optional(),
  emotionalState: EmotionalStateSchema.optional(),
  isArchived: z.boolean().default(false).optional(),
});
export type CreateJournalEntryInput = z.infer<typeof CreateJournalEntryInputSchema>;

// Update Input Schema
export const UpdateJournalEntryInputSchema = CreateJournalEntryInputSchema.partial();
export type UpdateJournalEntryInput = z.infer<typeof UpdateJournalEntryInputSchema>;

// Filter Criteria
export interface JournalQueryFilter {
  searchQuery?: string;
  tags?: string[];
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  linkedHabitId?: string;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}
