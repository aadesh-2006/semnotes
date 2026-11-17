import { v4 as uuidv4 } from 'uuid';
import { db } from '../../storage/db';
import type {
  JournalEntry,
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
  JournalQueryFilter
} from './journalTypes';
import { CreateJournalEntryInputSchema, UpdateJournalEntryInputSchema } from './journalTypes';

export class JournalService {
  /**
   * Creates a new private journal entry.
   * Auto-generates UUID, createdAt, and updatedAt timestamps.
   */
  static async createEntry(input: CreateJournalEntryInput): Promise<JournalEntry> {
    const validated = CreateJournalEntryInputSchema.parse(input);
    const nowIso = new Date().toISOString();

    const entry: JournalEntry = {
      id: uuidv4(),
      date: validated.date,
      title: validated.title?.trim() || '',
      content: validated.content.trim(),
      tags: (validated.tags || []).map((t) => t.trim().toLowerCase()).filter(Boolean),
      linkedHabitId: validated.linkedHabitId,
      mood: validated.mood,
      emotionalState: validated.emotionalState,
      isArchived: validated.isArchived ?? false,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    await db.journalEntries.add(entry);
    return entry;
  }

  /**
   * Retrieves a journal entry by its primary UUID.
   */
  static async getEntryById(id: string): Promise<JournalEntry | undefined> {
    return db.journalEntries.get(id);
  }

  /**
   * Updates an existing journal entry with partial input.
   */
  static async updateEntry(id: string, updates: UpdateJournalEntryInput): Promise<JournalEntry> {
    const validated = UpdateJournalEntryInputSchema.parse(updates);
    const existing = await db.journalEntries.get(id);
    if (!existing) {
      throw new Error(`Journal entry with ID ${id} not found.`);
    }

    const nowIso = new Date().toISOString();
    const updated: JournalEntry = {
      ...existing,
      ...validated,
      title: validated.title !== undefined ? validated.title.trim() : existing.title,
      content: validated.content !== undefined ? validated.content.trim() : existing.content,
      tags: validated.tags !== undefined
        ? validated.tags.map((t) => t.trim().toLowerCase()).filter(Boolean)
        : existing.tags,
      updatedAt: nowIso
    };

    await db.journalEntries.put(updated);
    return updated;
  }

  /**
   * Toggles the archive state of a journal entry.
   */
  static async setArchiveState(id: string, isArchived: boolean): Promise<JournalEntry> {
    const existing = await db.journalEntries.get(id);
    if (!existing) {
      throw new Error(`Journal entry with ID ${id} not found.`);
    }

    const updated: JournalEntry = {
      ...existing,
      isArchived,
      updatedAt: new Date().toISOString()
    };

    await db.journalEntries.put(updated);
    return updated;
  }

  /**
   * Permanently deletes a journal entry.
   */
  static async deleteEntry(id: string): Promise<void> {
    const existing = await db.journalEntries.get(id);
    if (!existing) {
      throw new Error(`Journal entry with ID ${id} not found.`);
    }
    await db.journalEntries.delete(id);
  }

  /**
   * Queries journal entries with search, date ranges, tag matching, and pagination.
   */
  static async queryEntries(filter: JournalQueryFilter = {}): Promise<{ entries: JournalEntry[]; total: number }> {
    let collection = db.journalEntries.toCollection();

    // If archived flag is false/unset, filter out archived entries by default
    const includeArchived = filter.includeArchived ?? false;

    let all = await collection.toArray();

    // 1. Archive filter
    if (!includeArchived) {
      all = all.filter((e) => !e.isArchived);
    }

    // 2. Date filters
    if (filter.startDate) {
      all = all.filter((e) => e.date >= filter.startDate!);
    }
    if (filter.endDate) {
      all = all.filter((e) => e.date <= filter.endDate!);
    }

    // 3. Linked habit filter
    if (filter.linkedHabitId) {
      all = all.filter((e) => e.linkedHabitId === filter.linkedHabitId);
    }

    // 4. Tag filter (entry must contain all requested tags)
    if (filter.tags && filter.tags.length > 0) {
      const lowerTags = filter.tags.map((t) => t.toLowerCase());
      all = all.filter((e) => lowerTags.every((t) => e.tags.includes(t)));
    }

    // 5. Search query (matches title or content)
    if (filter.searchQuery && filter.searchQuery.trim().length > 0) {
      const q = filter.searchQuery.trim().toLowerCase();
      all = all.filter(
        (e) => e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q)
      );
    }

    // Sort descending by date, then createdAt
    all.sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return b.createdAt.localeCompare(a.createdAt);
    });

    const total = all.length;
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 50;
    const paged = all.slice(offset, offset + limit);

    return {
      entries: paged,
      total
    };
  }

  /**
   * Retrieves all unique tags across all stored journal entries.
   */
  static async getAllTags(): Promise<string[]> {
    const all = await db.journalEntries.toArray();
    const tagSet = new Set<string>();
    for (const entry of all) {
      for (const tag of entry.tags) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  }
}
