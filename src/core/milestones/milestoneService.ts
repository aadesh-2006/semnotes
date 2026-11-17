import { db } from '../../storage/db';
import {
  type Milestone,
  type CreateMilestoneInput,
  type UpdateMilestoneInput,
  MilestoneSchema,
  CreateMilestoneInputSchema,
  UpdateMilestoneInputSchema
} from '../domain/types';
import { generateUUID } from '../utils';

export class MilestoneService {
  /**
   * Create a custom milestone threshold for a habit.
   * Throws if threshold is non-positive or already exists for this habit.
   */
  static async createMilestone(input: CreateMilestoneInput): Promise<Milestone> {
    const validatedInput = CreateMilestoneInputSchema.parse(input);

    if (!Number.isInteger(validatedInput.thresholdDays) || validatedInput.thresholdDays <= 0) {
      throw new Error('Milestone threshold must be a positive integer greater than zero.');
    }

    // Check for duplicate threshold within the same habit
    const existingSameThreshold = await db.milestones
      .where('habitId')
      .equals(validatedInput.habitId)
      .filter((m) => m.thresholdDays === validatedInput.thresholdDays)
      .first();

    if (existingSameThreshold) {
      throw new Error(
        `A milestone with threshold ${validatedInput.thresholdDays} days already exists for this habit.`
      );
    }

    const now = new Date().toISOString();
    const milestone: Milestone = {
      ...validatedInput,
      id: generateUUID(),
      rewardDescription: validatedInput.rewardDescription || '',
      isEnabled: validatedInput.isEnabled !== undefined ? validatedInput.isEnabled : true,
      sortOrder: validatedInput.thresholdDays,
      createdAt: now,
      updatedAt: now
    };

    const validated = MilestoneSchema.parse(milestone);

    await db.transaction('rw', db.milestones, db.auditRecords, async () => {
      await db.milestones.add(validated);
      await db.auditRecords.add({
        id: generateUUID(),
        habitId: validated.habitId,
        date: now.split('T')[0],
        action: 'create',
        timestamp: now,
        reason: `Created milestone ${validated.thresholdDays}d reward: "${validated.rewardTitle}"`
      });
    });

    return validated;
  }

  /**
   * Update an existing milestone. Does not alter past achievement records.
   */
  static async updateMilestone(id: string, input: UpdateMilestoneInput): Promise<Milestone> {
    const existing = await db.milestones.get(id);
    if (!existing) {
      throw new Error(`Milestone with ID ${id} not found.`);
    }

    const validatedInput = UpdateMilestoneInputSchema.parse(input);

    // If thresholdDays is being changed, check for duplicates
    if (
      validatedInput.thresholdDays !== undefined &&
      validatedInput.thresholdDays !== existing.thresholdDays
    ) {
      if (!Number.isInteger(validatedInput.thresholdDays) || validatedInput.thresholdDays <= 0) {
        throw new Error('Milestone threshold must be a positive integer greater than zero.');
      }

      const duplicate = await db.milestones
        .where('habitId')
        .equals(existing.habitId)
        .filter((m) => m.thresholdDays === validatedInput.thresholdDays && m.id !== id)
        .first();

      if (duplicate) {
        throw new Error(
          `Another milestone with threshold ${validatedInput.thresholdDays} days already exists for this habit.`
        );
      }
    }

    const now = new Date().toISOString();
    const updated: Milestone = {
      ...existing,
      ...validatedInput,
      updatedAt: now
    };

    const validated = MilestoneSchema.parse(updated);

    await db.transaction('rw', db.milestones, db.auditRecords, async () => {
      await db.milestones.put(validated);
      await db.auditRecords.add({
        id: generateUUID(),
        habitId: existing.habitId,
        date: now.split('T')[0],
        action: 'status_change',
        timestamp: now,
        reason: `Updated milestone ${existing.thresholdDays}d -> ${validated.thresholdDays}d ("${validated.rewardTitle}")`
      });
    });

    return validated;
  }

  /**
   * Enable or disable a milestone. Disabling stops future achievement detection
   * without deleting already earned achievements.
   */
  static async toggleMilestone(id: string, isEnabled?: boolean): Promise<Milestone> {
    const existing = await db.milestones.get(id);
    if (!existing) throw new Error(`Milestone ${id} not found.`);

    const targetState = isEnabled !== undefined ? isEnabled : !existing.isEnabled;
    return this.updateMilestone(id, { isEnabled: targetState });
  }

  /**
   * Delete a milestone. Historical achievements previously earned remain permanently intact.
   */
  static async deleteMilestone(id: string): Promise<void> {
    const existing = await db.milestones.get(id);
    if (!existing) return;

    const now = new Date().toISOString();
    await db.transaction('rw', db.milestones, db.auditRecords, async () => {
      await db.milestones.delete(id);
      await db.auditRecords.add({
        id: generateUUID(),
        habitId: existing.habitId,
        date: now.split('T')[0],
        action: 'status_change',
        timestamp: now,
        reason: `Deleted milestone definition ${existing.thresholdDays}d ("${existing.rewardTitle}")`
      });
    });
  }

  /**
   * Fetch all milestones for a habit, sorted by threshold days ascending.
   */
  static async getMilestonesByHabit(habitId: string, onlyEnabled = false): Promise<Milestone[]> {
    let collection = db.milestones.where('habitId').equals(habitId);
    let items = await collection.toArray();

    if (onlyEnabled) {
      items = items.filter((m) => m.isEnabled);
    }

    return items.sort((a, b) => a.thresholdDays - b.thresholdDays);
  }

  /**
   * Fetch milestone by ID.
   */
  static async getMilestoneById(id: string): Promise<Milestone | undefined> {
    return db.milestones.get(id);
  }
}
