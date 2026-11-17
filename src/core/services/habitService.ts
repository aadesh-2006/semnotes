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
   * Hard delete habit and associated records when explicitly requested.
   */
  static async deleteHabit(id: string, purgeHistory = false): Promise<void> {
    await db.transaction('rw', db.habits, db.habitLogs, db.auditRecords, async () => {
      await db.habits.delete(id);
      if (purgeHistory) {
        await db.habitLogs.where('habitId').equals(id).delete();
        await db.auditRecords.where('habitId').equals(id).delete();
      }
    });
  }

  /**
   * Retrieve a single habit by ID.
   */
  static async getHabitById(id: string): Promise<Habit | undefined> {
    return db.habits.get(id);
  }

  /**
   * Retrieve all habits with optional status and category filtering.
   */
  static async getAllHabits(filter?: {
    status?: HabitStatus;
    category?: HabitCategory;
  }): Promise<Habit[]> {
    let collection = db.habits.toCollection();

    if (filter?.status) {
      collection = db.habits.where('status').equals(filter.status);
    }

    let habits = await collection.toArray();

    if (filter?.category) {
      habits = habits.filter((h) => h.category === filter.category);
    }

    return habits.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }
}
