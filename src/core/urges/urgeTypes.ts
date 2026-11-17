import { z } from 'zod';

// ==========================================
// Urge Triggers & Responses
// ==========================================

export const TriggerCategorySchema = z.enum([
  'boredom',
  'stress',
  'loneliness',
  'fatigue',
  'anxiety',
  'procrastination',
  'environmental',
  'social_media',
  'habitual_routine',
  'other'
]);
export type TriggerCategory = z.infer<typeof TriggerCategorySchema>;

export const UrgeResponseSchema = z.enum([
  'resisted',    // Stood firm, let the wave pass without acting
  'diverted',    // Redirected energy to productive substitute action
  'delayed',     // Implemented 10-minute freeze or postponement
  'succumbed',   // Acted on urge (neutral observation, no shame)
  'unresolved'   // Currently experiencing or still ongoing
]);
export type UrgeResponse = z.infer<typeof UrgeResponseSchema>;

export const UrgeIntensitySchema = z.number().int().min(1).max(10);
export type UrgeIntensity = z.infer<typeof UrgeIntensitySchema>;

// ==========================================
// Urge Log Record
// ==========================================

export const UrgeLogRecordSchema = z.object({
  id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
  timestamp: z.string(), // ISO8601
  intensity: UrgeIntensitySchema,
  triggerCategories: z.array(TriggerCategorySchema).min(1, 'Select at least one trigger category'),
  customTrigger: z.string().default('').optional(),
  context: z.string().default('').optional(),
  emotionalState: z.string().default('').optional(),
  linkedHabitId: z.string().uuid().optional(),
  responseOutcome: UrgeResponseSchema,
  tacticsUsed: z.array(z.string()).default([]),
  reflectionNote: z.string().default('').optional(),
  createdAt: z.string(), // ISO8601
  updatedAt: z.string(), // ISO8601
});
export type UrgeLogRecord = z.infer<typeof UrgeLogRecordSchema>;

export const CreateUrgeLogInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
  timestamp: z.string().optional(), // Defaults to ISO8601 now
  intensity: UrgeIntensitySchema,
  triggerCategories: z.array(TriggerCategorySchema).min(1, 'Select at least one trigger category'),
  customTrigger: z.string().default('').optional(),
  context: z.string().default('').optional(),
  emotionalState: z.string().default('').optional(),
  linkedHabitId: z.string().uuid().optional(),
  responseOutcome: UrgeResponseSchema,
  tacticsUsed: z.array(z.string()).default([]).optional(),
  reflectionNote: z.string().default('').optional(),
});
export type CreateUrgeLogInput = z.infer<typeof CreateUrgeLogInputSchema>;

// Diagnostic Metrics & Summaries
export interface TriggerFrequency {
  category: TriggerCategory;
  count: number;
  percentage: number;
}

export interface OutcomeDistribution {
  outcome: UrgeResponse;
  count: number;
  percentage: number;
}

export interface TimeOfDayDistribution {
  timeSlot: 'morning' | 'afternoon' | 'evening' | 'night';
  count: number;
}

export interface UrgeDiagnosticSummary {
  totalUrgesRecorded: number;
  averageIntensity: number;
  highestIntensity: number;
  lowestIntensity: number;
  topTriggers: TriggerFrequency[];
  outcomeDistribution: OutcomeDistribution[];
  timeOfDayDistribution: TimeOfDayDistribution[];
  resistedOrDivertedRate: number; // percentage
  unresolvedCount: number;
}
