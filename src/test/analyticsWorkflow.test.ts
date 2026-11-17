import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../storage/db';
import { HabitService } from '../core/services/habitService';
import { HabitLogService } from '../core/services/habitLogService';
import { DisciplineScoreEngine } from '../core/analytics/disciplineScoreEngine';
import { HabitPerformanceService } from '../core/analytics/habitPerformanceService';
import { TrendAnalysisService } from '../core/analytics/trendAnalysisService';
import { ConsistencyInsightsService } from '../core/analytics/consistencyInsightsService';
import { shiftCalendarDate } from '../core/analytics/analyticsDateUtils';

describe('Milestone 7: Discipline Analytics Subsystem Workflow', () => {
  beforeEach(async () => {
    await db.habits.clear();
    await db.habitLogs.clear();
    await db.auditRecords.clear();
    await db.milestones.clear();
    await db.achievements.clear();
    await db.journalEntries.clear();
    await db.morningIntentions.clear();
    await db.eveningDebriefs.clear();
    await db.urgeLogs.clear();
  });

  describe('End-to-End Analytics Ledger Integration', () => {
    it('populates habits, logs check-ins, and calculates deterministic 30-day discipline score directly from Dexie DB', async () => {
      const evaluationDate = '2026-11-17';

      // 1. Architect 2 active habits:
      // Habit A: Daily Meditation (mind category)
      const habitA = await HabitService.createHabit({
        title: 'Daily Meditation',
        description: 'Morning mindfulness protocol',
        category: 'mind',
        type: 'completion',
        schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
        startDate: '2026-10-19' // Exactly 30 days window start
      });

      // Habit B: MWF Calisthenics (body category)
      const habitB = await HabitService.createHabit({
        title: 'Calisthenics',
        description: 'Bodyweight strength conditioning',
        category: 'body',
        type: 'completion',
        schedule: { frequency: 'selected_days', selectedDays: [1, 3, 5] },
        startDate: '2026-10-19'
      });
      // Complete 1 session for habitB on Monday 2026-10-20 (or 2026-10-19)
      await HabitLogService.recordCheckIn(habitB, '2026-10-20', { status: 'completed' });

      // Initially, with zero check-in logs for habitA:
      const initialScore = await DisciplineScoreEngine.fetchAndCalculateScore({
        windowDays: 30,
        evaluationDate
      });
      expect(initialScore.hasSufficientData).toBe(true);

      // 2. Log completions for Habit A for 25 days (days 1-25) and failure for day 26
      // In rolling 30d window: 2026-10-19 to 2026-11-17
      for (let offset = 0; offset < 25; offset++) {
        const d = shiftCalendarDate('2026-10-19', offset);
        await HabitLogService.recordCheckIn(habitA, d, { status: 'completed' });
      }
      const failDateA = shiftCalendarDate('2026-10-19', 25); // 2026-11-13
      await HabitLogService.recordCheckIn(habitA, failDateA, { status: 'failed', notes: 'Late meeting fatigue' });

      // Check recalculated score from DB
      const updatedScore = await DisciplineScoreEngine.fetchAndCalculateScore({
        windowDays: 30,
        evaluationDate
      });
      expect(updatedScore.totalCompleted).toBeGreaterThanOrEqual(25);
      expect(updatedScore.totalFailed).toBe(1);
      expect(updatedScore.score).toBeGreaterThan(0);

      // 3. Verify Habit Performance Service against Dexie DB
      const { habits: habitMetrics, categories: categoryMetrics } =
        await HabitPerformanceService.fetchAndCalculateHabitPerformance({
          evaluationDate,
          startDate: '2026-10-19',
          endDate: evaluationDate
        });

      expect(habitMetrics).toHaveLength(2);
      const metricA = habitMetrics.find((m) => m.habitId === habitA.id)!;
      expect(metricA.completedCount).toBe(25);
      expect(metricA.failedCount).toBe(1);
      expect(metricA.habitCategory).toBe('mind');

      // 4. Verify Category Performance
      expect(categoryMetrics.length).toBeGreaterThanOrEqual(1);
      const mindCategory = categoryMetrics.find((c) => c.category === 'mind');
      expect(mindCategory).toBeDefined();
      expect(mindCategory!.totalHabits).toBe(1);
      expect(mindCategory!.totalCompleted).toBe(25);
    });

    it('isolates habit and category filters accurately', async () => {
      const evaluationDate = '2026-11-17';

      const habit1 = await HabitService.createHabit({
        title: 'Deep Work',
        description: 'Focus blocks',
        category: 'mind',
        type: 'completion',
        schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
        startDate: '2026-11-01'
      });

      const habit2 = await HabitService.createHabit({
        title: 'Running',
        description: 'Endurance work',
        category: 'body',
        type: 'completion',
        schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
        startDate: '2026-11-01'
      });

      // Complete 5 days for habit 1, 0 for habit 2 in the 7-day window ending 2026-11-17
      for (let i = 0; i < 5; i++) {
        const d = shiftCalendarDate('2026-11-11', i);
        await HabitLogService.recordCheckIn(habit1, d, { status: 'completed' });
      }

      const allHabits = await db.habits.toArray();
      const allLogs = await db.habitLogs.toArray();
      const allAudits = await db.auditRecords.toArray();

      // Score filtered to habit1 only
      const habit1Score = DisciplineScoreEngine.calculateDisciplineScore(
        allHabits,
        allLogs,
        allAudits,
        {
          evaluationDate,
          windowDays: 7,
          filterHabitIds: [habit1.id]
        }
      );

      // Score filtered to habit2 only
      const habit2Score = DisciplineScoreEngine.calculateDisciplineScore(
        allHabits,
        allLogs,
        allAudits,
        {
          evaluationDate,
          windowDays: 7,
          filterHabitIds: [habit2.id]
        }
      );

      expect(habit1Score.totalCompleted).toBeGreaterThan(0);
      expect(habit2Score.totalCompleted).toBe(0);
    });

    it('updates discipline score dynamically upon retroactive audit correction', async () => {
      const evaluationDate = '2026-11-15';
      const habit = await HabitService.createHabit({
        title: 'Cold Shower',
        description: 'Morning shock conditioning',
        category: 'body',
        type: 'completion',
        schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
        startDate: '2026-11-10'
      });

      // Days: 10, 11, 12 completed; Day 13 failed
      await HabitLogService.recordCheckIn(habit, '2026-11-10', { status: 'completed' });
      await HabitLogService.recordCheckIn(habit, '2026-11-11', { status: 'completed' });
      await HabitLogService.recordCheckIn(habit, '2026-11-12', { status: 'completed' });
      const failLog = await HabitLogService.recordCheckIn(habit, '2026-11-13', { status: 'failed', notes: 'Accidental skip' });

      // Score before audit
      const scoreBefore = await DisciplineScoreEngine.fetchAndCalculateScore({ windowDays: 6, evaluationDate });
      expect(scoreBefore.totalFailed).toBe(1);

      // Correct Day 13 to completed via HabitLogService
      await HabitLogService.correctCheckIn(failLog.id, {
        status: 'completed',
        notes: 'Retroactive correction: completed at night',
        reason: 'Correction via late verification'
      });

      // Score after audit correction
      const scoreAfter = await DisciplineScoreEngine.fetchAndCalculateScore({ windowDays: 6, evaluationDate });
      expect(scoreAfter.totalFailed).toBe(0);
      expect(scoreAfter.totalCompleted).toBe(4);
      expect(scoreAfter.score).toBeGreaterThan(scoreBefore.score!);
    });

    it('generates sample-size bounded consistency insights and setback recovery metrics', async () => {
      const evaluationDate = '2026-11-17';
      const habit = await HabitService.createHabit({
        title: 'DSA Practice',
        description: 'Daily algorithms',
        category: 'mind',
        type: 'completion',
        schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
        startDate: '2026-10-19'
      });

      // Complete 20 days with 2 scattered setbacks, each recovered the next day
      for (let i = 0; i < 20; i++) {
        const d = shiftCalendarDate('2026-10-19', i);
        if (i === 5 || i === 12) {
          await HabitLogService.recordCheckIn(habit, d, { status: 'failed', notes: 'Friction point' });
        } else {
          await HabitLogService.recordCheckIn(habit, d, { status: 'completed' });
        }
      }

      const allHabits = await db.habits.toArray();
      const allLogs = await db.habitLogs.toArray();
      const allAudits = await db.auditRecords.toArray();

      const dailySeries = TrendAnalysisService.buildDailyAdherenceSeries(
        '2026-10-19',
        evaluationDate,
        allHabits,
        allLogs,
        allAudits,
        evaluationDate
      );

      const habitMetrics = HabitPerformanceService.calculateHabitPerformance(
        allHabits,
        allLogs,
        allAudits,
        {
          startDate: '2026-10-19',
          endDate: evaluationDate,
          evaluationDate
        }
      );

      const insights = ConsistencyInsightsService.generateInsights(dailySeries, habitMetrics);
      expect(Array.isArray(insights)).toBe(true);

      const recovery = ConsistencyInsightsService.calculateSetbackRecovery(dailySeries, habitMetrics);
      expect(recovery.totalSetbacks).toBeGreaterThanOrEqual(2);
      expect(recovery.nextDayRecoveryRate).not.toBeNull();
      // Since days 6 and 13 were completed immediately after setbacks on 5 and 12, recovery rate should be positive
      expect(recovery.nextDayRecoveryRate!).toBeGreaterThan(0);
    });
  });
});
