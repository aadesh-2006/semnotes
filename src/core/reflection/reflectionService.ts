import { generateUUID } from '../utils';
import { db } from '../../storage/db';
import type {
  MorningIntention,
  SaveMorningIntentionInput,
  EveningDebrief,
  SaveEveningDebriefInput
} from './reflectionTypes';
import {
  SaveMorningIntentionInputSchema,
  SaveEveningDebriefInputSchema
} from './reflectionTypes';

export class ReflectionService {
  /**
   * Saves or updates a morning intention for a specific calendar date.
   * Enforces one primary morning intention per date.
   */
  static async saveMorningIntention(input: SaveMorningIntentionInput): Promise<MorningIntention> {
    const validated = SaveMorningIntentionInputSchema.parse(input);
    const nowIso = new Date().toISOString();

    const existing = await db.morningIntentions.where('date').equals(validated.date).first();

    if (existing) {
      const updated: MorningIntention = {
        ...existing,
        primaryIntention: validated.primaryIntention.trim(),
        keyCommitment: validated.keyCommitment?.trim() ?? existing.keyCommitment,
        potentialObstacle: validated.potentialObstacle?.trim() ?? existing.potentialObstacle,
        plannedResponse: validated.plannedResponse?.trim() ?? existing.plannedResponse,
        linkedHabitIds: validated.linkedHabitIds ?? existing.linkedHabitIds,
        personalNote: validated.personalNote?.trim() ?? existing.personalNote,
        updatedAt: nowIso
      };
      await db.morningIntentions.put(updated);
      return updated;
    }

    const record: MorningIntention = {
      id: generateUUID(),
      date: validated.date,
      primaryIntention: validated.primaryIntention.trim(),
      keyCommitment: validated.keyCommitment?.trim() || '',
      potentialObstacle: validated.potentialObstacle?.trim() || '',
      plannedResponse: validated.plannedResponse?.trim() || '',
      linkedHabitIds: validated.linkedHabitIds || [],
      personalNote: validated.personalNote?.trim() || '',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    await db.morningIntentions.add(record);
    return record;
  }

  /**
   * Retrieves the morning intention for a given date.
   */
  static async getMorningIntention(date: string): Promise<MorningIntention | undefined> {
    return db.morningIntentions.where('date').equals(date).first();
  }

  /**
   * Saves or updates an evening debrief for a specific calendar date.
   * Enforces one primary debrief per date while preserving user edits.
   */
  static async saveEveningDebrief(input: SaveEveningDebriefInput): Promise<EveningDebrief> {
    const validated = SaveEveningDebriefInputSchema.parse(input);
    const nowIso = new Date().toISOString();

    const existing = await db.eveningDebriefs.where('date').equals(validated.date).first();

    if (existing) {
      const updated: EveningDebrief = {
        ...existing,
        wentWell: validated.wentWell?.trim() ?? existing.wentWell,
        commitmentsFulfilled: validated.commitmentsFulfilled ?? existing.commitmentsFulfilled,
        difficultiesFaced: validated.difficultiesFaced?.trim() ?? existing.difficultiesFaced,
        lessonsLearned: validated.lessonsLearned?.trim() ?? existing.lessonsLearned,
        tomorrowImprovements: validated.tomorrowImprovements?.trim() ?? existing.tomorrowImprovements,
        gratitude: validated.gratitude?.trim() ?? existing.gratitude,
        closingNote: validated.closingNote?.trim() ?? existing.closingNote,
        updatedAt: nowIso
      };
      await db.eveningDebriefs.put(updated);
      return updated;
    }

    const record: EveningDebrief = {
      id: generateUUID(),
      date: validated.date,
      wentWell: validated.wentWell?.trim() || '',
      commitmentsFulfilled: validated.commitmentsFulfilled || [],
      difficultiesFaced: validated.difficultiesFaced?.trim() || '',
      lessonsLearned: validated.lessonsLearned?.trim() || '',
      tomorrowImprovements: validated.tomorrowImprovements?.trim() || '',
      gratitude: validated.gratitude?.trim() || '',
      closingNote: validated.closingNote?.trim() || '',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    await db.eveningDebriefs.add(record);
    return record;
  }

  /**
   * Retrieves the evening debrief for a given date.
   */
  static async getEveningDebrief(date: string): Promise<EveningDebrief | undefined> {
    return db.eveningDebriefs.where('date').equals(date).first();
  }

  /**
   * Returns completion status of reflections for a given date.
   */
  static async getDailyReflectionStatus(date: string): Promise<{ hasMorning: boolean; hasEvening: boolean }> {
    const [morning, evening] = await Promise.all([
      db.morningIntentions.where('date').equals(date).first(),
      db.eveningDebriefs.where('date').equals(date).first()
    ]);

    return {
      hasMorning: !!morning,
      hasEvening: !!evening
    };
  }
}
