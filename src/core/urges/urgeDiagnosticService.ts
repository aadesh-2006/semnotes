import { v4 as uuidv4 } from 'uuid';
import { db } from '../../storage/db';
import type {
  CreateUrgeLogInput,
  UrgeLogRecord,
  UrgeDiagnosticSummary,
  TriggerFrequency,
  OutcomeDistribution,
  TimeOfDayDistribution,
  TriggerCategory,
  UrgeResponse
} from './urgeTypes';
import { CreateUrgeLogInputSchema } from './urgeTypes';

export class UrgeDiagnosticService {
  /**
   * Records a new urge diagnostic entry in the local database.
   * NOTE: An urge log is purely diagnostic and does NOT affect habit streak calculations.
   */
  static async recordUrge(input: CreateUrgeLogInput): Promise<UrgeLogRecord> {
    const validated = CreateUrgeLogInputSchema.parse(input);
    const nowIso = new Date().toISOString();

    const record: UrgeLogRecord = {
      id: uuidv4(),
      date: validated.date,
      timestamp: validated.timestamp || nowIso,
      intensity: validated.intensity,
      triggerCategories: validated.triggerCategories,
      customTrigger: validated.customTrigger?.trim() || '',
      context: validated.context?.trim() || '',
      emotionalState: validated.emotionalState?.trim() || '',
      linkedHabitId: validated.linkedHabitId,
      responseOutcome: validated.responseOutcome,
      tacticsUsed: validated.tacticsUsed || [],
      reflectionNote: validated.reflectionNote?.trim() || '',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    await db.urgeLogs.add(record);
    return record;
  }

  /**
   * Retrieves an urge entry by its ID.
   */
  static async getUrgeById(id: string): Promise<UrgeLogRecord | undefined> {
    return db.urgeLogs.get(id);
  }

  /**
   * Retrieves all urges within an optional date range.
   */
  static async getUrgesByDateRange(startDate?: string, endDate?: string): Promise<UrgeLogRecord[]> {
    let collection = db.urgeLogs.toCollection();

    if (startDate && endDate) {
      collection = db.urgeLogs.where('date').between(startDate, endDate, true, true);
    } else if (startDate) {
      collection = db.urgeLogs.where('date').aboveOrEqual(startDate);
    } else if (endDate) {
      collection = db.urgeLogs.where('date').belowOrEqual(endDate);
    }

    const records = await collection.toArray();
    // Sort descending by timestamp
    return records.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  /**
   * Retrieves all urges linked to a specific habit.
   */
  static async getUrgesForHabit(habitId: string): Promise<UrgeLogRecord[]> {
    const records = await db.urgeLogs.where('linkedHabitId').equals(habitId).toArray();
    return records.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  /**
   * Updates an existing urge entry.
   */
  static async updateUrge(id: string, updates: Partial<CreateUrgeLogInput>): Promise<UrgeLogRecord> {
    const existing = await db.urgeLogs.get(id);
    if (!existing) {
      throw new Error(`Urge log record with ID ${id} not found.`);
    }

    const nowIso = new Date().toISOString();
    const updated: UrgeLogRecord = {
      ...existing,
      ...updates,
      intensity: updates.intensity !== undefined ? updates.intensity : existing.intensity,
      triggerCategories: updates.triggerCategories || existing.triggerCategories,
      updatedAt: nowIso
    };

    await db.urgeLogs.put(updated);
    return updated;
  }

  /**
   * Deletes an urge log record.
   */
  static async deleteUrge(id: string): Promise<void> {
    await db.urgeLogs.delete(id);
  }

  /**
   * Pure deterministic calculation of diagnostic summaries from urge history.
   * Returns descriptive statistics without clinical judgment or shame.
   */
  static calculateDiagnostics(urges: UrgeLogRecord[]): UrgeDiagnosticSummary {
    if (urges.length === 0) {
      return {
        totalUrgesRecorded: 0,
        averageIntensity: 0,
        highestIntensity: 0,
        lowestIntensity: 0,
        topTriggers: [],
        outcomeDistribution: [],
        timeOfDayDistribution: [
          { timeSlot: 'morning', count: 0 },
          { timeSlot: 'afternoon', count: 0 },
          { timeSlot: 'evening', count: 0 },
          { timeSlot: 'night', count: 0 }
        ],
        resistedOrDivertedRate: 0,
        unresolvedCount: 0
      };
    }

    const total = urges.length;
    let sumIntensity = 0;
    let highestIntensity = urges[0].intensity;
    let lowestIntensity = urges[0].intensity;
    let resistedOrDivertedCount = 0;
    let unresolvedCount = 0;

    const triggerCounts: Partial<Record<TriggerCategory, number>> = {};
    const outcomeCounts: Partial<Record<UrgeResponse, number>> = {};
    const timeSlots: Record<'morning' | 'afternoon' | 'evening' | 'night', number> = {
      morning: 0,
      afternoon: 0,
      evening: 0,
      night: 0
    };

    for (const record of urges) {
      sumIntensity += record.intensity;
      if (record.intensity > highestIntensity) highestIntensity = record.intensity;
      if (record.intensity < lowestIntensity) lowestIntensity = record.intensity;

      if (['resisted', 'diverted', 'delayed'].includes(record.responseOutcome)) {
        resistedOrDivertedCount++;
      }
      if (record.responseOutcome === 'unresolved') {
        unresolvedCount++;
      }

      // Triggers
      for (const cat of record.triggerCategories) {
        triggerCounts[cat] = (triggerCounts[cat] || 0) + 1;
      }

      // Outcomes
      outcomeCounts[record.responseOutcome] = (outcomeCounts[record.responseOutcome] || 0) + 1;

      // Time slot from timestamp or ISO date
      try {
        const dateObj = new Date(record.timestamp);
        const hours = dateObj.getHours();
        if (hours >= 5 && hours < 12) {
          timeSlots.morning++;
        } else if (hours >= 12 && hours < 17) {
          timeSlots.afternoon++;
        } else if (hours >= 17 && hours < 22) {
          timeSlots.evening++;
        } else {
          timeSlots.night++;
        }
      } catch {
        timeSlots.evening++;
      }
    }

    const averageIntensity = Math.round((sumIntensity / total) * 10) / 10;
    const resistedOrDivertedRate = Math.round((resistedOrDivertedCount / total) * 100);

    const topTriggers: TriggerFrequency[] = Object.entries(triggerCounts)
      .map(([cat, count]) => ({
        category: cat as TriggerCategory,
        count: count ?? 0,
        percentage: Math.round(((count ?? 0) / total) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    const outcomeDistribution: OutcomeDistribution[] = Object.entries(outcomeCounts)
      .map(([outcome, count]) => ({
        outcome: outcome as UrgeResponse,
        count: count ?? 0,
        percentage: Math.round(((count ?? 0) / total) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    const timeOfDayDistribution: TimeOfDayDistribution[] = [
      { timeSlot: 'morning', count: timeSlots.morning },
      { timeSlot: 'afternoon', count: timeSlots.afternoon },
      { timeSlot: 'evening', count: timeSlots.evening },
      { timeSlot: 'night', count: timeSlots.night }
    ];

    return {
      totalUrgesRecorded: total,
      averageIntensity,
      highestIntensity,
      lowestIntensity,
      topTriggers,
      outcomeDistribution,
      timeOfDayDistribution,
      resistedOrDivertedRate,
      unresolvedCount
    };
  }
}
