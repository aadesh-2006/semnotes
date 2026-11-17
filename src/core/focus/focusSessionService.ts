/**
 * SEMNÓTĒS — Focus Session Persistence & Query Service
 * Sovereign personal discipline operating system.
 *
 * CRITICAL INVARIANTS:
 * 1. Completing a focus session NEVER automatically creates habit logs or checks in a habit.
 * 2. Focus sessions NEVER automatically modify streaks, milestones, or discipline scores.
 * 3. Break time is strictly isolated and never credited towards focused duration.
 * 4. Cancelled or abandoned sessions are strictly excluded from completed statistics.
 */

import { db } from '../../storage/db';
import type { FocusSessionRecord, CreateFocusSessionInput } from './focusTypes';
import { CreateFocusSessionInputSchema, FocusSessionRecordSchema } from './focusSchemas';
import { formatCalendarDate } from '../utils';

export class FocusSessionService {
  /**
   * Creates and persists a new focus session record in Dexie.
   */
  static async createSession(input: CreateFocusSessionInput): Promise<FocusSessionRecord> {
    const validated = CreateFocusSessionInputSchema.parse(input);
    const now = new Date();
    const isoNow = now.toISOString();
    const dateStr = formatCalendarDate(validated.startedAt ? new Date(validated.startedAt) : now);

    const record: FocusSessionRecord = {
      id: crypto.randomUUID(),
      title: validated.title.trim(),
      sessionMode: validated.sessionMode,
      linkedHabitId: validated.linkedHabitId,
      plannedDurationMinutes: validated.plannedDurationMinutes,
      actualDurationSeconds: 0,
      breakDurationSeconds: 0,
      startedAt: validated.startedAt ?? isoNow,
      status: 'interrupted', // Default until explicitly completed
      notes: validated.notes?.trim() || undefined,
      date: dateStr,
      createdAt: isoNow,
      updatedAt: isoNow,
      completedCycles: 0,
      totalPlannedCycles: validated.totalPlannedCycles,
    };

    const validatedRecord = FocusSessionRecordSchema.parse(record);
    await db.focusSessions.put(validatedRecord);
    return validatedRecord;
  }

  /**
   * Finalizes a focus session as completed.
   */
  static async completeSession(
    id: string,
    actualDurationSeconds: number,
    options?: {
      notes?: string;
      breakDurationSeconds?: number;
      completedCycles?: number;
      endedAt?: string;
    }
  ): Promise<FocusSessionRecord> {
    const existing = await db.focusSessions.get(id);
    if (!existing) {
      throw new Error(`Focus session not found for id: ${id}`);
    }

    const isoNow = options?.endedAt ?? new Date().toISOString();
    const updated: FocusSessionRecord = {
      ...existing,
      status: 'completed',
      actualDurationSeconds: Math.max(0, Math.floor(actualDurationSeconds)),
      breakDurationSeconds: Math.max(0, Math.floor(options?.breakDurationSeconds ?? existing.breakDurationSeconds ?? 0)),
      completedCycles: options?.completedCycles ?? existing.completedCycles ?? 1,
      endedAt: isoNow,
      notes: options?.notes?.trim() ?? existing.notes,
      updatedAt: isoNow,
    };

    const validated = FocusSessionRecordSchema.parse(updated);
    await db.focusSessions.put(validated);
    return validated;
  }

  /**
   * Finalizes an interrupted focus session (ended early by user).
   */
  static async interruptSession(
    id: string,
    actualDurationSeconds: number,
    options?: {
      notes?: string;
      breakDurationSeconds?: number;
      completedCycles?: number;
      endedAt?: string;
    }
  ): Promise<FocusSessionRecord> {
    const existing = await db.focusSessions.get(id);
    if (!existing) {
      throw new Error(`Focus session not found for id: ${id}`);
    }

    const isoNow = options?.endedAt ?? new Date().toISOString();
    const updated: FocusSessionRecord = {
      ...existing,
      status: 'interrupted',
      actualDurationSeconds: Math.max(0, Math.floor(actualDurationSeconds)),
      breakDurationSeconds: Math.max(0, Math.floor(options?.breakDurationSeconds ?? existing.breakDurationSeconds ?? 0)),
      completedCycles: options?.completedCycles ?? existing.completedCycles ?? 0,
      endedAt: isoNow,
      notes: options?.notes?.trim() ?? existing.notes,
      updatedAt: isoNow,
    };

    const validated = FocusSessionRecordSchema.parse(updated);
    await db.focusSessions.put(validated);
    return validated;
  }

  /**
   * Marks a session as cancelled.
   */
  static async cancelSession(
    id: string,
    actualDurationSeconds: number = 0,
    options?: { notes?: string; endedAt?: string }
  ): Promise<FocusSessionRecord> {
    const existing = await db.focusSessions.get(id);
    if (!existing) {
      throw new Error(`Focus session not found for id: ${id}`);
    }

    const isoNow = options?.endedAt ?? new Date().toISOString();
    const updated: FocusSessionRecord = {
      ...existing,
      status: 'cancelled',
      actualDurationSeconds: Math.max(0, Math.floor(actualDurationSeconds)),
      endedAt: isoNow,
      notes: options?.notes?.trim() ?? existing.notes,
      updatedAt: isoNow,
    };

    const validated = FocusSessionRecordSchema.parse(updated);
    await db.focusSessions.put(validated);
    return validated;
  }

  /**
   * Marks a session as abandoned (e.g. tab closed or expired without interaction).
   */
  static async abandonSession(id: string, actualDurationSeconds: number = 0): Promise<FocusSessionRecord> {
    const existing = await db.focusSessions.get(id);
    if (!existing) {
      throw new Error(`Focus session not found for id: ${id}`);
    }

    const isoNow = new Date().toISOString();
    const updated: FocusSessionRecord = {
      ...existing,
      status: 'abandoned',
      actualDurationSeconds: Math.max(0, Math.floor(actualDurationSeconds)),
      endedAt: isoNow,
      updatedAt: isoNow,
    };

    const validated = FocusSessionRecordSchema.parse(updated);
    await db.focusSessions.put(validated);
    return validated;
  }

  /**
   * Retrieves all focus sessions sorted chronologically descending.
   */
  static async getAllSessions(): Promise<FocusSessionRecord[]> {
    const records = await db.focusSessions.toArray();
    return records.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  /**
   * Retrieves a specific session by ID.
   */
  static async getSessionById(id: string): Promise<FocusSessionRecord | undefined> {
    return await db.focusSessions.get(id);
  }

  /**
   * Retrieves sessions for a specific calendar date (YYYY-MM-DD).
   */
  static async getSessionsByDate(dateStr: string): Promise<FocusSessionRecord[]> {
    const records = await db.focusSessions.where('date').equals(dateStr).toArray();
    return records.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  /**
   * Retrieves sessions within an inclusive date range [startDate, endDate].
   */
  static async getSessionsByDateRange(startDate: string, endDate: string): Promise<FocusSessionRecord[]> {
    const records = await db.focusSessions
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
    return records.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  /**
   * Retrieves sessions linked to a specific habit.
   */
  static async getSessionsByHabit(habitId: string): Promise<FocusSessionRecord[]> {
    const records = await db.focusSessions.where('linkedHabitId').equals(habitId).toArray();
    return records.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  /**
   * Deletes a focus session.
   */
  static async deleteSession(id: string): Promise<void> {
    await db.focusSessions.delete(id);
  }

  /**
   * Purges all focus sessions (for testing or reset).
   */
  static async clearAllSessions(): Promise<void> {
    await db.focusSessions.clear();
  }
}
