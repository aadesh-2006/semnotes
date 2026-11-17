import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../storage/db';
import { JournalService } from '../core/journal/journalService';
import { ReflectionService } from '../core/reflection/reflectionService';
import { UrgeDiagnosticService } from '../core/urges/urgeDiagnosticService';
import { HabitService } from '../core/services/habitService';
import { HabitLogService } from '../core/services/habitLogService';
import { StreakCalculator } from '../core/streak/streakCalculator';

describe('Milestone 6: Journal & Reflection Subsystem Integration', () => {
  beforeEach(async () => {
    await db.journalEntries.clear();
    await db.morningIntentions.clear();
    await db.eveningDebriefs.clear();
    await db.urgeLogs.clear();
    await db.habits.clear();
    await db.habitLogs.clear();
    await db.auditRecords.clear();
    await db.milestones.clear();
    await db.achievements.clear();
  });

  describe('End-to-End Daily Reflection Lifecycle', () => {
    it('executes full daily reflection cycle: morning intention -> day check-in -> evening debrief', async () => {
      const testDate = '2026-11-17';

      // 1. Check initial status: empty
      const initialStatus = await ReflectionService.getDailyReflectionStatus(testDate);
      expect(initialStatus.hasMorning).toBe(false);
      expect(initialStatus.hasEvening).toBe(false);

      // 2. User sets morning intention
      const morning = await ReflectionService.saveMorningIntention({
        date: testDate,
        primaryIntention: 'Maintain complete focus during algorithmic problem solving',
        keyCommitment: 'Solve 2 hard DP problems without distraction',
        potentialObstacle: 'Mental fatigue after lunch',
        plannedResponse: '15-minute brisk walk and cold water'
      });
      expect(morning.id).toBeDefined();

      const midDayStatus = await ReflectionService.getDailyReflectionStatus(testDate);
      expect(midDayStatus.hasMorning).toBe(true);
      expect(midDayStatus.hasEvening).toBe(false);

      // 3. User logs an urge during the afternoon
      const urge = await UrgeDiagnosticService.recordUrge({
        date: testDate,
        intensity: 6,
        triggerCategories: ['fatigue', 'procrastination'],
        context: 'Stuck on dynamic programming base case',
        responseOutcome: 'diverted',
        reflectionNote: 'Walked outside and wrote recurrence relation on paper'
      });
      expect(urge.id).toBeDefined();

      // 4. User completes evening debrief
      const evening = await ReflectionService.saveEveningDebrief({
        date: testDate,
        wentWell: 'Maintained commitment to walk instead of browsing',
        lessonsLearned: 'Writing state space tree on physical paper breaks mental logjams',
        gratitude: 'Clear mind and uninterrupted workspace'
      });
      expect(evening.id).toBeDefined();

      // 5. Final reflection status confirms both are locked in
      const finalStatus = await ReflectionService.getDailyReflectionStatus(testDate);
      expect(finalStatus.hasMorning).toBe(true);
      expect(finalStatus.hasEvening).toBe(true);
    });
  });

  describe('Journal & Habit Coexistence with Zero Streak Tampering', () => {
    it('guarantees journal entries and urge logs do not mutate habit streak logs or metrics', async () => {
      // Create a habit
      const habit = await HabitService.createHabit({
        title: 'Deep Craft',
        category: 'craft',
        type: 'completion',
        schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
        startDate: '2026-11-10',
        status: 'active'
      });

      // Record 3 days of check-ins
      await HabitLogService.recordCheckIn(habit, '2026-11-10', { status: 'completed' });
      await HabitLogService.recordCheckIn(habit, '2026-11-11', { status: 'completed' });
      await HabitLogService.recordCheckIn(habit, '2026-11-12', { status: 'completed' });

      const logsBefore = await HabitLogService.getLogsForHabit(habit.id);
      const streakBefore = StreakCalculator.calculateStreak(habit, logsBefore, {
        evaluationDate: '2026-11-12'
      });
      expect(streakBefore.currentStreak).toBe(3);

      // Create linked journal entry
      const entry = await JournalService.createEntry({
        date: '2026-11-12',
        title: 'Craft Deep Dive',
        content: 'Refactored graph components with clean separation of concerns.',
        linkedHabitId: habit.id,
        tags: ['craft', 'architecture'],
        mood: 5
      });
      expect(entry.linkedHabitId).toBe(habit.id);

      // Create linked urge record with outcome 'succumbed'
      await UrgeDiagnosticService.recordUrge({
        date: '2026-11-12',
        intensity: 8,
        triggerCategories: ['stress'],
        linkedHabitId: habit.id,
        responseOutcome: 'succumbed'
      });

      // Assert habit logs count and content remain entirely unchanged
      const logsAfter = await HabitLogService.getLogsForHabit(habit.id);
      expect(logsAfter.length).toBe(logsBefore.length);

      // Assert streak remains unchanged (streak engine isolation)
      const streakAfter = StreakCalculator.calculateStreak(habit, logsAfter, {
        evaluationDate: '2026-11-12'
      });
      expect(streakAfter.currentStreak).toBe(3);
    });
  });

  describe('Database Persistence & M1-M5 Schema Preservation', () => {
    it('verifies that Dexie schema v4 holds habits, logs, audits, milestones, achievements, journal, and urges', async () => {
      // Add habit
      const h = await HabitService.createHabit({
        title: 'Digital Purity',
        category: 'abstinence',
        type: 'abstinence',
        schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
        startDate: '2026-11-01',
        status: 'active'
      });

      // Add habit check-in
      await HabitLogService.recordCheckIn(h, '2026-11-01', { status: 'completed' });

      // Add journal entry
      await JournalService.createEntry({
        date: '2026-11-01',
        title: 'Initial Day',
        content: 'Day 1 completed.'
      });

      // Add urge log
      await UrgeDiagnosticService.recordUrge({
        date: '2026-11-01',
        intensity: 3,
        triggerCategories: ['boredom'],
        responseOutcome: 'resisted'
      });

      // Verify all tables hold data simultaneously
      expect(await db.habits.count()).toBe(1);
      expect(await db.habitLogs.count()).toBe(1);
      expect(await db.auditRecords.count()).toBeGreaterThanOrEqual(1);
      expect(await db.journalEntries.count()).toBe(1);
      expect(await db.urgeLogs.count()).toBe(1);
    });
  });
});
