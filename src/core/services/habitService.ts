import { db } from '../../storage/db';
import {
  type Habit,
  type CreateHabitInput,
  type UpdateHabitInput,
  type HabitStatus,
  type HabitCategory,
  HabitSchema,
  CreateHabitInputSchema,
  UpdateHabitInputSchema
} from '../domain/types';
import { generateUUID } from '../utils';

export class HabitService {
  /**
   * Create a new habit with full Zod validation and store in IndexedDB.
   */
  static async createHabit(input: CreateHabitInput): Promise<Habit> {
    const validatedInput = CreateHabitInputSchema.parse(input);
    const now = new Date().toISOString();

    const habit: Habit = {
      ...validatedInput,
      description: validatedInput.description || '',
      id: generateUUID(),
      status: validatedInput.status || 'active',
      createdAt: now,
      updatedAt: now,
      sortOrder: Date.now(),
    };

    // Strict validation against full entity schema
    const validatedHabit = HabitSchema.parse(habit);

    await db.transaction('rw', db.habits, db.auditRecords, async () => {
      await db.habits.add(validatedHabit);
      await db.auditRecords.add({
        id: generateUUID(),
        habitId: validatedHabit.id,
        date: validatedHabit.startDate,
        action: 'create',
        newStatus: validatedHabit.status,
        timestamp: now,
        reason: 'Habit created'
      });
    });

    return validatedHabit;
  }

  /**
   * Update an existing habit. Historical logs remain completely intact.
   */
  static async updateHabit(id: string, input: UpdateHabitInput): Promise<Habit> {
    const existing = await db.habits.get(id);
    if (!existing) {
      throw new Error(`Habit with ID ${id} not found`);
    }

    const validatedInput = UpdateHabitInputSchema.parse(input);
    const now = new Date().toISOString();

    const updatedHabit: Habit = {
      ...existing,
      ...validatedInput,
      schedule: validatedInput.schedule || existing.schedule,
      updatedAt: now,
    };

    const validated = HabitSchema.parse(updatedHabit);

    await db.transaction('rw', db.habits, db.auditRecords, async () => {
      await db.habits.put(validated);
      await db.auditRecords.add({
        id: generateUUID(),
        habitId: id,
        date: new Date().toISOString().split('T')[0],
        action: 'status_change',
        previousStatus: existing.status,
        newStatus: validated.status,
        timestamp: now,
        reason: 'Habit details updated'
      });
    });

    return validated;
  }

  /**
   * Pause habit. Preserves existing history and prevents auto-marking missed days.
   */
  static async pauseHabit(id: string, reason?: string): Promise<Habit> {
    const habit = await db.habits.get(id);
    if (!habit) throw new Error(`Habit ${id} not found`);

    const now = new Date().toISOString();
    const updated: Habit = {
      ...habit,
      status: 'paused',
      updatedAt: now
    };

    await db.transaction('rw', db.habits, db.auditRecords, async () => {
      await db.habits.put(updated);
      await db.auditRecords.add({
        id: generateUUID(),
        habitId: id,
        date: new Date().toISOString().split('T')[0],
        action: 'pause',
        previousStatus: habit.status,
        newStatus: 'paused',
        reason: reason || 'Habit paused by user',
        timestamp: now
      });
    });

    return updated;
  }

  /**
   * Resume a paused or archived habit.
   */
  static async resumeHabit(id: string): Promise<Habit> {
    const habit = await db.habits.get(id);
    if (!habit) throw new Error(`Habit ${id} not found`);

    const now = new Date().toISOString();
    const updated: Habit = {
      ...habit,
      status: 'active',
      updatedAt: now
    };

    await db.transaction('rw', db.habits, db.auditRecords, async () => {
      await db.habits.put(updated);
      await db.auditRecords.add({
        id: generateUUID(),
        habitId: id,
        date: new Date().toISOString().split('T')[0],
        action: 'resume',
        previousStatus: habit.status,
        newStatus: 'active',
        reason: 'Habit resumed to active status',
        timestamp: now
      });
    });

    return updated;
  }

  /**
   * Archive habit. Preserves all historical records for analytics.
   */
  static async archiveHabit(id: string): Promise<Habit> {
    const habit = await db.habits.get(id);
    if (!habit) throw new Error(`Habit ${id} not found`);

    const now = new Date().toISOString();
    const updated: Habit = {
      ...habit,
      status: 'archived',
      updatedAt: now
    };

    await db.transaction('rw', db.habits, db.auditRecords, async () => {
      await db.habits.put(updated);
      await db.auditRecords.add({
        id: generateUUID(),
        habitId: id,
        date: new Date().toISOString().split('T')[0],
        action: 'archive',
        previousStatus: habit.status,
        newStatus: 'archived',
        reason: 'Habit archived',
        timestamp: now
      });
    });

    return updated;
  }

  /**
   * Delete a habit.
   * Case 1 (default / purgeHistory = false): Normal habit deletion.
   * Marks habit as 'deleted' with deletedAt timestamp, hides it from active lists,
   * but strictly preserves all historical habit logs, audit history, earned achievements,
   * milestone definitions, focus sessions, and journal entries.
   *
   * Case 2 (purgeHistory = true): Explicit permanent history purge.
   * Transactionally purges the habit and dependent logs/audits/milestones/achievements,
   * while decoupling (nullifying) foreign key references in focus sessions and journal entries
   * so user time records and private reflections are never lost.
   */
  static async deleteHabit(
    id: string,
    options?: boolean | { purgeHistory?: boolean }
  ): Promise<void> {
    const shouldPurge = typeof options === 'boolean' ? options : (options?.purgeHistory === true);

    if (shouldPurge) {
      await this.purgeHabitHistory(id);
      return;
    }

    // Normal deletion: preserve historical data
    const habit = await db.habits.get(id);
    if (!habit || habit.status === 'deleted') {
      return;
    }

    const now = new Date().toISOString();
    const updated: Habit = {
      ...habit,
      status: 'deleted',
      deletedAt: now,
      updatedAt: now,
    };

    await db.transaction('rw', db.habits, db.auditRecords, async () => {
      await db.habits.put(updated);
      await db.auditRecords.add({
        id: generateUUID(),
        habitId: id,
        date: now.split('T')[0],
        action: 'delete',
        previousStatus: habit.status,
        newStatus: 'deleted',
        reason: 'Habit deleted (history preserved)',
        timestamp: now,
      });
    });
  }

  /**
   * Explicit permanent history purge.
   * Transactionally removes the habit and all dependent logs/milestones/achievements/audits.
   * Decouples references in focus sessions, journal entries, urge logs, and morning intentions
   * so personal writings, focus hours, and intentions are preserved without orphaned references.
   */
  static async purgeHabitHistory(id: string): Promise<void> {
    const allAffectedTables = [
      db.habits,
      db.habitLogs,
      db.auditRecords,
      db.milestones,
      db.achievements,
      db.focusSessions,
      db.journalEntries,
      db.urgeLogs,
      db.morningIntentions,
    ];

    await db.transaction('rw', allAffectedTables, async () => {
      // 1. Delete habit entity
      await db.habits.delete(id);

      // 2. Cascade delete direct dependent habit records
      await db.habitLogs.where('habitId').equals(id).delete();
      await db.auditRecords.where('habitId').equals(id).delete();
      await db.milestones.where('habitId').equals(id).delete();
      await db.achievements.where('habitId').equals(id).delete();

      // 3. Decouple focusSessions (preserve user focused hours)
      const affectedSessions = await db.focusSessions
        .filter((s) => s.habitId === id || s.linkedHabitId === id)
        .toArray();
      for (const session of affectedSessions) {
        const updated = { ...session };
        if (updated.habitId === id) delete (updated as any).habitId;
        if (updated.linkedHabitId === id) delete (updated as any).linkedHabitId;
        await db.focusSessions.put(updated);
      }

      // 4. Decouple journalEntries (preserve personal writings)
      const affectedJournals = await db.journalEntries
        .where('linkedHabitId')
        .equals(id)
        .toArray();
      for (const journal of affectedJournals) {
        const updated = { ...journal };
        delete (updated as any).linkedHabitId;
        await db.journalEntries.put(updated);
      }

      // 5. Decouple urgeLogs
      const affectedUrges = await db.urgeLogs
        .where('linkedHabitId')
        .equals(id)
        .toArray();
      for (const urge of affectedUrges) {
        const updated = { ...urge };
        delete (updated as any).linkedHabitId;
        await db.urgeLogs.put(updated);
      }

      // 6. Decouple morningIntentions
      const affectedIntentions = await db.morningIntentions
        .filter((m) => Array.isArray(m.linkedHabitIds) && m.linkedHabitIds.includes(id))
        .toArray();
      for (const intention of affectedIntentions) {
        const updated = {
          ...intention,
          linkedHabitIds: (intention.linkedHabitIds || []).filter((hId) => hId !== id),
        };
        await db.morningIntentions.put(updated);
      }
    });
  }

  /**
   * Restore a previously deleted habit back to active status.
   */
  static async restoreDeletedHabit(id: string): Promise<Habit> {
    const habit = await db.habits.get(id);
    if (!habit) throw new Error(`Habit ${id} not found`);

    const now = new Date().toISOString();
    const updated: Habit = {
      ...habit,
      status: 'active',
      deletedAt: undefined,
      updatedAt: now,
    };

    await db.transaction('rw', db.habits, db.auditRecords, async () => {
      await db.habits.put(updated);
      await db.auditRecords.add({
        id: generateUUID(),
        habitId: id,
        date: now.split('T')[0],
        action: 'resume',
        previousStatus: habit.status,
        newStatus: 'active',
        reason: 'Habit restored from deleted status',
        timestamp: now,
      });
    });

    return updated;
  }

  /**
   * Retrieve a single habit by ID.
   */
  static async getHabitById(id: string): Promise<Habit | undefined> {
    return db.habits.get(id);
  }

  /**
   * Retrieve all habits with optional status and category filtering.
   * By default, excludes habits with status === 'deleted'.
   */
  static async getAllHabits(filter?: {
    status?: HabitStatus;
    category?: HabitCategory;
    includeDeleted?: boolean;
  }): Promise<Habit[]> {
    let collection = db.habits.toCollection();

    if (filter?.status) {
      collection = db.habits.where('status').equals(filter.status);
    }

    let habits = await collection.toArray();

    // Unless an explicit status was filtered or includeDeleted was requested, hide deleted habits
    if (!filter?.status && !filter?.includeDeleted) {
      habits = habits.filter((h) => h.status !== 'deleted');
    }

    if (filter?.category) {
      habits = habits.filter((h) => h.category === filter.category);
    }

    return habits.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }
}
