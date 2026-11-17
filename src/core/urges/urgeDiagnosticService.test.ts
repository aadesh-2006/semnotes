import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../storage/db';
import { UrgeDiagnosticService } from './urgeDiagnosticService';
import type { UrgeLogRecord } from './urgeTypes';
import { HabitLogService } from '../services/habitLogService';
import { StreakCalculator } from '../streak/streakCalculator';
import type { Habit } from '../domain/types';

describe('UrgeDiagnosticService', () => {
  beforeEach(async () => {
    await db.urgeLogs.clear();
    await db.habitLogs.clear();
  });

  describe('Pure Diagnostic Calculations', () => {
    it('handles empty urge history gracefully without NaN or errors', () => {
      const summary = UrgeDiagnosticService.calculateDiagnostics([]);

      expect(summary.totalUrgesRecorded).toBe(0);
      expect(summary.averageIntensity).toBe(0);
      expect(summary.highestIntensity).toBe(0);
      expect(summary.lowestIntensity).toBe(0);
      expect(summary.topTriggers).toEqual([]);
      expect(summary.outcomeDistribution).toEqual([]);
      expect(summary.resistedOrDivertedRate).toBe(0);
      expect(summary.unresolvedCount).toBe(0);
      expect(summary.timeOfDayDistribution).toHaveLength(4);
    });

    it('calculates descriptive statistics, averages, and rates accurately', () => {
      const mockUrges: UrgeLogRecord[] = [
        {
          id: 'u1',
          date: '2026-11-17',
          timestamp: '2026-11-17T08:30:00.000Z', // morning
          intensity: 4,
          triggerCategories: ['boredom', 'social_media'],
          responseOutcome: 'resisted',
          tacticsUsed: ['walk'],
          createdAt: '2026-11-17T08:30:00.000Z',
          updatedAt: '2026-11-17T08:30:00.000Z'
        },
        {
          id: 'u2',
          date: '2026-11-17',
          timestamp: '2026-11-17T14:15:00.000Z', // afternoon
          intensity: 8,
          triggerCategories: ['stress'],
          responseOutcome: 'diverted',
          tacticsUsed: ['deep work'],
          createdAt: '2026-11-17T14:15:00.000Z',
          updatedAt: '2026-11-17T14:15:00.000Z'
        },
        {
          id: 'u3',
          date: '2026-11-17',
          timestamp: '2026-11-17T20:45:00.000Z', // evening
          intensity: 6,
          triggerCategories: ['boredom', 'fatigue'],
          responseOutcome: 'delayed',
          tacticsUsed: ['10-min freeze'],
          createdAt: '2026-11-17T20:45:00.000Z',
          updatedAt: '2026-11-17T20:45:00.000Z'
        },
        {
          id: 'u4',
          date: '2026-11-17',
          timestamp: '2026-11-17T23:10:00.000Z', // night
          intensity: 7,
          triggerCategories: ['fatigue'],
          responseOutcome: 'succumbed',
          tacticsUsed: [],
          createdAt: '2026-11-17T23:10:00.000Z',
          updatedAt: '2026-11-17T23:10:00.000Z'
        }
      ];

      const summary = UrgeDiagnosticService.calculateDiagnostics(mockUrges);

      expect(summary.totalUrgesRecorded).toBe(4);
      // Average: (4 + 8 + 6 + 7) / 4 = 25 / 4 = 6.25 -> rounded to 6.3
      expect(summary.averageIntensity).toBe(6.3);
      expect(summary.highestIntensity).toBe(8);
      expect(summary.lowestIntensity).toBe(4);

      // Resisted or diverted: 3 of 4 = 75%
      expect(summary.resistedOrDivertedRate).toBe(75);

      // Top triggers: boredom (2), fatigue (2), social_media (1), stress (1)
      const boredom = summary.topTriggers.find((t) => t.category === 'boredom');
      expect(boredom?.count).toBe(2);
      expect(boredom?.percentage).toBe(50);

      // Outcome distribution
      const resisted = summary.outcomeDistribution.find((o) => o.outcome === 'resisted');
      expect(resisted?.count).toBe(1);
      expect(resisted?.percentage).toBe(25);
    });
  });

  describe('Database Persistence & Input Validation', () => {
    it('persists and retrieves urge records in Dexie', async () => {
      const created = await UrgeDiagnosticService.recordUrge({
        date: '2026-11-17',
        intensity: 5,
        triggerCategories: ['stress', 'procrastination'],
        customTrigger: 'Impending project deadline',
        context: 'Working alone late',
        responseOutcome: 'resisted',
        reflectionNote: 'Walked outside for 5 minutes instead'
      });

      expect(created.id).toBeDefined();
      expect(created.intensity).toBe(5);

      const fetched = await UrgeDiagnosticService.getUrgeById(created.id);
      expect(fetched).toBeDefined();
      expect(fetched?.customTrigger).toBe('Impending project deadline');
    });

    it('rejects invalid intensity outside 1 to 10', async () => {
      await expect(
        UrgeDiagnosticService.recordUrge({
          date: '2026-11-17',
          intensity: 11 as any,
          triggerCategories: ['boredom'],
          responseOutcome: 'resisted'
        })
      ).rejects.toThrow();

      await expect(
        UrgeDiagnosticService.recordUrge({
          date: '2026-11-17',
          intensity: 0 as any,
          triggerCategories: ['boredom'],
          responseOutcome: 'resisted'
        })
      ).rejects.toThrow();
    });

    it('updates and deletes urge records cleanly', async () => {
      const created = await UrgeDiagnosticService.recordUrge({
        date: '2026-11-17',
        intensity: 7,
        triggerCategories: ['anxiety'],
        responseOutcome: 'unresolved'
      });

      const updated = await UrgeDiagnosticService.updateUrge(created.id, {
        responseOutcome: 'resisted',
        reflectionNote: 'Urge passed after breathwork'
      });

      expect(updated.responseOutcome).toBe('resisted');

      await UrgeDiagnosticService.deleteUrge(created.id);
      const afterDelete = await UrgeDiagnosticService.getUrgeById(created.id);
      expect(afterDelete).toBeUndefined();
    });
  });

  describe('Domain Invariant: Separation of Urges from Habit Streaks', () => {
    it('ensures recording an urge does NOT create a habit log or reset streaks', async () => {
      const dummyHabit: Habit = {
        id: '11111111-2222-3333-4444-555555555555',
        title: 'Digital Purity',
        description: 'Sovereign discipline',
        category: 'abstinence',
        type: 'abstinence',
        schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
        startDate: '2026-11-10',
        status: 'active',
        createdAt: '2026-11-10T00:00:00.000Z',
        updatedAt: '2026-11-10T00:00:00.000Z',
        sortOrder: 0
      };

      // 3 successful days recorded in habit logs
      await HabitLogService.recordCheckIn(dummyHabit, '2026-11-10', { status: 'completed' });
      await HabitLogService.recordCheckIn(dummyHabit, '2026-11-11', { status: 'completed' });
      await HabitLogService.recordCheckIn(dummyHabit, '2026-11-12', { status: 'completed' });

      const logsBefore = await HabitLogService.getLogsForHabit(dummyHabit.id);
      const streakBefore = StreakCalculator.calculateStreak(dummyHabit, logsBefore, { evaluationDate: '2026-11-12' });
      expect(streakBefore.currentStreak).toBe(3);

      // Record an intense urge even with outcome 'succumbed' or 'unresolved'
      await UrgeDiagnosticService.recordUrge({
        date: '2026-11-12',
        intensity: 9,
        triggerCategories: ['loneliness'],
        linkedHabitId: dummyHabit.id,
        responseOutcome: 'succumbed',
        reflectionNote: 'Struggled deeply'
      });

      // Verify habit logs were completely untouched
      const logsAfter = await HabitLogService.getLogsForHabit(dummyHabit.id);
      expect(logsAfter.length).toBe(logsBefore.length);

      const streakAfter = StreakCalculator.calculateStreak(dummyHabit, logsAfter, { evaluationDate: '2026-11-12' });
      expect(streakAfter.currentStreak).toBe(3);
      expect(streakAfter.currentStreak).toBe(streakBefore.currentStreak);
    });
  });
});
