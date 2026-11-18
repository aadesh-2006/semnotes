import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../storage/db';
import { RestoreTransactionService } from './restoreTransactionService';
import type { SemnotesBackupPayload } from './backupTypes';

describe('Safe Restore Transaction Service', () => {
  beforeEach(async () => {
    // Clear all tables before each test
    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) {
        await table.clear();
      }
    });
  });

  const sampleHabitA = {
    id: 'a0000000-0000-4000-8000-000000000001',
    title: 'Morning Run',
    description: 'Daily run',
    category: 'body' as const,
    type: 'completion' as const,
    schedule: { frequency: 'daily' as const, selectedDays: [0, 1, 2, 3, 4, 5, 6] },
    targetValue: 5,
    unit: 'km',
    startDate: '2026-01-01',
    status: 'active' as const,
    createdAt: '2026-01-01T06:00:00.000Z',
    updatedAt: '2026-01-03T06:00:00.000Z',
    sortOrder: 0,
  };

  const sampleHabitB = {
    id: 'a0000000-0000-4000-8000-000000000002',
    title: 'Evening Reading',
    description: 'Read philosophy',
    category: 'mind' as const,
    type: 'completion' as const,
    schedule: { frequency: 'daily' as const, selectedDays: [0, 1, 2, 3, 4, 5, 6] },
    targetValue: 20,
    unit: 'pages',
    startDate: '2026-01-01',
    status: 'active' as const,
    createdAt: '2026-01-01T20:00:00.000Z',
    updatedAt: '2026-01-12T20:00:00.000Z',
    sortOrder: 1,
  };

  describe('captureSafetySnapshot & restoreSafetySnapshot', () => {
    it('captures full database snapshot and can restore it exactly', async () => {
      await db.habits.add(sampleHabitA);
      await db.habitLogs.add({
        id: 'b0000000-0000-4000-8000-000000000001',
        habitId: sampleHabitA.id,
        date: '2026-01-01',
        status: 'completed',
        numericValue: 5,
        createdAt: '2026-01-01T07:00:00.000Z',
        updatedAt: '2026-01-01T07:00:00.000Z',
      });

      const snapshot = await RestoreTransactionService.captureSafetySnapshot();
      expect(snapshot.habits).toHaveLength(1);
      expect(snapshot.habitLogs).toHaveLength(1);

      // Now clear everything
      await db.habits.clear();
      await db.habitLogs.clear();
      expect(await db.habits.count()).toBe(0);

      // Restore snapshot
      await RestoreTransactionService.restoreSafetySnapshot(snapshot);
      expect(await db.habits.count()).toBe(1);
      expect(await db.habitLogs.count()).toBe(1);
      const restoredHabit = await db.habits.get(sampleHabitA.id);
      expect(restoredHabit?.title).toBe('Morning Run');
    });
  });

  describe('restoreReplace', () => {
    it('completely replaces current state with backup payload', async () => {
      // Current DB has Habit A
      await db.habits.add(sampleHabitA);
      expect(await db.habits.count()).toBe(1);

      // Create backup payload that has Habit B
      const backupToRestore: SemnotesBackupPayload = {
        manifest: {
          app: 'semnotes',
          backupVersion: '1.0',
          appVersion: '1.0.0',
          dbVersion: 5,
          exportedAt: new Date().toISOString(),
          checksum: 'mock-checksum',
          recordCounts: { habits: 1 },
        },
        data: {
          habits: [sampleHabitB],
          habitLogs: [],
          auditRecords: [],
          milestones: [],
          achievements: [],
          journalEntries: [],
          urgeLogs: [],
          morningIntentions: [],
          eveningDebriefs: [],
          focusSessions: [],
          userSettings: [],
        },
      };

      const result = await RestoreTransactionService.restoreReplace(backupToRestore);
      expect(result.success).toBe(true);
      expect(result.mode).toBe('replace');
      expect(result.totalRestored).toBe(1);

      // Verify DB now only contains Habit B
      const habits = await db.habits.toArray();
      expect(habits).toHaveLength(1);
      expect(habits[0].id).toBe(sampleHabitB.id);
      expect(habits[0].title).toBe('Evening Reading');
    });
  });

  describe('restoreMerge', () => {
    it('merges new records while preserving existing records without duplicate collisions', async () => {
      // Current DB has Habit A and a log
      await db.habits.add(sampleHabitA);
      await db.habitLogs.add({
        id: 'b0000000-0000-4000-8000-000000000001',
        habitId: sampleHabitA.id,
        date: '2026-01-01',
        status: 'completed',
        numericValue: 5,
        createdAt: '2026-01-01T07:00:00.000Z',
        updatedAt: '2026-01-01T07:00:00.000Z',
      });

      // Backup payload has Habit A (duplicate ID) and Habit B (new)
      // and duplicate log for habit-a on 2026-01-01
      const backupToMerge: SemnotesBackupPayload = {
        manifest: {
          app: 'semnotes',
          backupVersion: '1.0',
          appVersion: '1.0.0',
          dbVersion: 5,
          exportedAt: new Date().toISOString(),
          checksum: 'mock-checksum',
          recordCounts: { habits: 2, habitLogs: 2 },
        },
        data: {
          habits: [
            sampleHabitA, // duplicate ID
            sampleHabitB, // new
          ],
          habitLogs: [
            {
              id: 'b0000000-0000-4000-8000-000000000002',
              habitId: sampleHabitA.id,
              date: '2026-01-01', // duplicate date for habit-a
              status: 'completed',
              numericValue: 5,
              createdAt: '2026-01-01T07:00:00.000Z',
              updatedAt: '2026-01-01T07:00:00.000Z',
            },
            {
              id: 'b0000000-0000-4000-8000-000000000003',
              habitId: sampleHabitB.id,
              date: '2026-01-01', // valid new log
              status: 'completed',
              numericValue: 20,
              createdAt: '2026-01-01T21:00:00.000Z',
              updatedAt: '2026-01-01T21:00:00.000Z',
            },
          ],
          auditRecords: [],
          milestones: [],
          achievements: [],
          journalEntries: [],
          urgeLogs: [],
          morningIntentions: [],
          eveningDebriefs: [],
          focusSessions: [],
          userSettings: [],
        },
      };

      const result = await RestoreTransactionService.restoreMerge(backupToMerge);
      expect(result.success).toBe(true);
      expect(result.mode).toBe('merge');
      expect(result.insertedCount).toBe(2); // Habit B and log-b3
      expect(result.skippedCount).toBe(2);  // Habit A and duplicate date log

      // DB now has both habits
      const habits = await db.habits.toArray();
      expect(habits).toHaveLength(2);
      expect(habits.map((h) => h.id).sort()).toEqual([sampleHabitA.id, sampleHabitB.id].sort());

      // DB now has 2 logs
      const logs = await db.habitLogs.toArray();
      expect(logs).toHaveLength(2);
    });

    it('deduplicates morning intentions and evening debriefs by date', async () => {
      // Existing morning intention for 2026-01-01
      await db.morningIntentions.add({
        id: 'c0000000-0000-4000-8000-000000000001',
        date: '2026-01-01',
        primaryIntention: 'Finish Chapter 4',
        keyCommitment: 'High focus',
        linkedHabitIds: [],
        createdAt: '2026-01-01T06:00:00.000Z',
        updatedAt: '2026-01-01T06:00:00.000Z',
      });

      const backupToMerge: SemnotesBackupPayload = {
        manifest: {
          app: 'semnotes',
          backupVersion: '1.0',
          appVersion: '1.0.0',
          dbVersion: 5,
          exportedAt: new Date().toISOString(),
          checksum: 'mock',
          recordCounts: {},
        },
        data: {
          habits: [],
          habitLogs: [],
          auditRecords: [],
          milestones: [],
          achievements: [],
          journalEntries: [],
          urgeLogs: [],
          morningIntentions: [
            {
              id: 'c0000000-0000-4000-8000-000000000002',
              date: '2026-01-01', // same date!
              primaryIntention: 'Conflicting intention',
              keyCommitment: 'Other commitment',
              linkedHabitIds: [],
              createdAt: '2026-01-01T06:30:00.000Z',
              updatedAt: '2026-01-01T06:30:00.000Z',
            },
            {
              id: 'c0000000-0000-4000-8000-000000000003',
              date: '2026-01-02', // new date
              primaryIntention: 'Review flashcards',
              keyCommitment: '30 minutes',
              linkedHabitIds: [],
              createdAt: '2026-01-02T06:00:00.000Z',
              updatedAt: '2026-01-02T06:00:00.000Z',
            },
          ],
          eveningDebriefs: [],
          focusSessions: [],
          userSettings: [],
        },
      };

      const result = await RestoreTransactionService.restoreMerge(backupToMerge);
      expect(result.success).toBe(true);
      expect(result.insertedCount).toBe(1); // Only 2026-01-02 was inserted
      expect(result.skippedCount).toBe(1);  // 2026-01-01 was skipped

      const allIntentions = await db.morningIntentions.toArray();
      expect(allIntentions).toHaveLength(2);
      expect(allIntentions.find((i) => i.date === '2026-01-01')?.primaryIntention).toBe('Finish Chapter 4');
      expect(allIntentions.find((i) => i.date === '2026-01-02')?.primaryIntention).toBe('Review flashcards');
    });
  });
});
