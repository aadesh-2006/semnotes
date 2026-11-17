import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../storage/db';
import { DisciplineScoreEngine } from './disciplineScoreEngine';
import { HabitService } from '../services/habitService';
import { HabitLogService } from '../services/habitLogService';
import type { Habit, HabitLog, AuditRecord } from '../domain/types';

describe('DisciplineScoreEngine', () => {
  beforeEach(async () => {
    await db.habits.clear();
    await db.habitLogs.clear();
    await db.auditRecords.clear();
  });

  const createDummyHabit = (overrides?: Partial<Habit>): Habit => ({
    id: '11111111-1111-1111-1111-111111111111',
    title: 'Daily Deep Craft',
    description: 'Sovereign discipline',
    category: 'craft',
    type: 'completion',
    schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
    startDate: '2026-10-01',
    status: 'active',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    sortOrder: 0,
    ...overrides
  });

  describe('Pure Formula & Adherence Semantics', () => {
    it('1. returns 100% and sovereign grade when all evaluated commitments are completed', () => {
      const habit = createDummyHabit();
      const logs: HabitLog[] = [];

      // 30 consecutive completed days
      const evalDate = '2026-11-17';
      // Oct 19 to Nov 17
      for (let i = 0; i < 30; i++) {
        const dt = new Date(2026, 9, 19 + i); // 19 Oct + i
        const dStr = `2026-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        logs.push({
          id: `log-${i}`,
          habitId: habit.id,
          date: dStr,
          status: 'completed',
          createdAt: `${dStr}T10:00:00.000Z`,
          updatedAt: `${dStr}T10:00:00.000Z`
        });
      }

      const result = DisciplineScoreEngine.calculateDisciplineScore([habit], logs, [], {
        evaluationDate: evalDate
      });

      expect(result.score).toBe(100);
      expect(result.totalCompleted).toBe(30);
      expect(result.totalFailed).toBe(0);
      expect(result.totalMissed).toBe(0);
      expect(result.totalEvaluated).toBe(30);
      expect(result.hasSufficientData).toBe(true);
      expect(result.adherenceGrade).toBe('sovereign');
    });

    it('2. calculates accurate score for mixed completed and failed commitments', () => {
      const habit = createDummyHabit({ startDate: '2026-11-08' });
      const logs: HabitLog[] = [
        { id: '1', habitId: habit.id, date: '2026-11-08', status: 'completed', createdAt: '', updatedAt: '' },
        { id: '2', habitId: habit.id, date: '2026-11-09', status: 'completed', createdAt: '', updatedAt: '' },
        { id: '3', habitId: habit.id, date: '2026-11-10', status: 'completed', createdAt: '', updatedAt: '' },
        { id: '4', habitId: habit.id, date: '2026-11-11', status: 'completed', createdAt: '', updatedAt: '' },
        { id: '5', habitId: habit.id, date: '2026-11-12', status: 'failed', createdAt: '', updatedAt: '' },
        { id: '6', habitId: habit.id, date: '2026-11-13', status: 'completed', createdAt: '', updatedAt: '' },
        { id: '7', habitId: habit.id, date: '2026-11-14', status: 'completed', createdAt: '', updatedAt: '' },
        { id: '8', habitId: habit.id, date: '2026-11-15', status: 'completed', createdAt: '', updatedAt: '' },
        { id: '9', habitId: habit.id, date: '2026-11-16', status: 'failed', createdAt: '', updatedAt: '' },
        { id: '10', habitId: habit.id, date: '2026-11-17', status: 'completed', createdAt: '', updatedAt: '' }
      ];

      // 8 completed, 2 failed -> 8/10 = 80% (disciplined)
      const result = DisciplineScoreEngine.calculateDisciplineScore([habit], logs, [], {
        evaluationDate: '2026-11-17'
      });

      expect(result.score).toBe(80);
      expect(result.totalCompleted).toBe(8);
      expect(result.totalFailed).toBe(2);
      expect(result.totalEvaluated).toBe(10);
      expect(result.adherenceGrade).toBe('disciplined');
    });

    it('3. treats past missed scheduled commitments as unfulfilled in the denominator', () => {
      const habit = createDummyHabit({ startDate: '2026-11-08' });
      // 7 completed, 3 days missing in the past (2026-11-12, 2026-11-14, 2026-11-16)
      const logs: HabitLog[] = [
        { id: '1', habitId: habit.id, date: '2026-11-08', status: 'completed', createdAt: '', updatedAt: '' },
        { id: '2', habitId: habit.id, date: '2026-11-09', status: 'completed', createdAt: '', updatedAt: '' },
        { id: '3', habitId: habit.id, date: '2026-11-10', status: 'completed', createdAt: '', updatedAt: '' },
        { id: '4', habitId: habit.id, date: '2026-11-11', status: 'completed', createdAt: '', updatedAt: '' },
        { id: '6', habitId: habit.id, date: '2026-11-13', status: 'completed', createdAt: '', updatedAt: '' },
        { id: '8', habitId: habit.id, date: '2026-11-15', status: 'completed', createdAt: '', updatedAt: '' },
        { id: '10', habitId: habit.id, date: '2026-11-17', status: 'completed', createdAt: '', updatedAt: '' }
      ];

      const result = DisciplineScoreEngine.calculateDisciplineScore([habit], logs, [], {
        evaluationDate: '2026-11-17'
      });

      // 7 completed, 3 missed -> 7 / 10 = 70% (stable)
      expect(result.score).toBe(70);
      expect(result.totalCompleted).toBe(7);
      expect(result.totalMissed).toBe(3);
      expect(result.totalEvaluated).toBe(10);
      expect(result.adherenceGrade).toBe('stable');
    });

    it('4. returns 0% when all commitments failed or were missed', () => {
      const habit = createDummyHabit({ startDate: '2026-11-13' });
      const logs: HabitLog[] = [
        { id: '1', habitId: habit.id, date: '2026-11-13', status: 'failed', createdAt: '', updatedAt: '' },
        { id: '2', habitId: habit.id, date: '2026-11-14', status: 'failed', createdAt: '', updatedAt: '' }
      ];

      const result = DisciplineScoreEngine.calculateDisciplineScore([habit], logs, [], {
        evaluationDate: '2026-11-15'
      });

      // 0 completed out of 3 evaluated (2 failed + 1 missed on 2026-11-15)
      expect(result.score).toBe(0);
      expect(result.totalCompleted).toBe(0);
      expect(result.adherenceGrade).toBe('vulnerable');
    });

    it('5. returns null score and insufficient_data when zero commitments were evaluated', () => {
      // Habit starts in the future relative to window
      const habit = createDummyHabit({ startDate: '2026-12-01' });

      const result = DisciplineScoreEngine.calculateDisciplineScore([habit], [], [], {
        evaluationDate: '2026-11-17'
      });

      expect(result.score).toBeNull();
      expect(result.totalEvaluated).toBe(0);
      expect(result.hasSufficientData).toBe(false);
      expect(result.adherenceGrade).toBe('insufficient_data');
    });

    it('6. excludes today pending commitments from failure penalty and denominator', () => {
      const habit = createDummyHabit({ startDate: '2026-11-16' });
      // 2026-11-16 completed, 2026-11-17 (today) has no log yet -> pending
      const logs: HabitLog[] = [
        { id: '1', habitId: habit.id, date: '2026-11-16', status: 'completed', createdAt: '', updatedAt: '' }
      ];

      const result = DisciplineScoreEngine.calculateDisciplineScore([habit], logs, [], {
        evaluationDate: '2026-11-17'
      });

      expect(result.totalCompleted).toBe(1);
      expect(result.totalFailed).toBe(0);
      expect(result.totalMissed).toBe(0);
      expect(result.totalPending).toBe(1);
      // Evaluated only includes completed, failed, missed (1 evaluated)
      expect(result.totalEvaluated).toBe(1);
      expect(result.score).toBe(100);
    });

    it('7. excludes paused commitments from evaluated denominator', () => {
      const habit = createDummyHabit({ startDate: '2026-11-10' });
      // Paused for 3 days: 2026-11-12 to 2026-11-14
      const audits: AuditRecord[] = [
        {
          id: 'a1',
          habitId: habit.id,
          date: '2026-11-12',
          action: 'pause',
          timestamp: '2026-11-12T00:00:00.000Z',
          reason: 'Medical recovery'
        },
        {
          id: 'a2',
          habitId: habit.id,
          date: '2026-11-14',
          action: 'resume',
          timestamp: '2026-11-14T23:59:59.000Z',
          reason: 'Resumed'
        }
      ];

      // Logs for unpaused days (10, 11, 15)
      const logs: HabitLog[] = [
        { id: '1', habitId: habit.id, date: '2026-11-10', status: 'completed', createdAt: '', updatedAt: '' },
        { id: '2', habitId: habit.id, date: '2026-11-11', status: 'completed', createdAt: '', updatedAt: '' },
        { id: '3', habitId: habit.id, date: '2026-11-15', status: 'completed', createdAt: '', updatedAt: '' }
      ];

      const result = DisciplineScoreEngine.calculateDisciplineScore([habit], logs, audits, {
        evaluationDate: '2026-11-15'
      });

      expect(result.totalCompleted).toBe(3);
      expect(result.totalPaused).toBe(3); // 12, 13, 14
      expect(result.totalFailed).toBe(0);
      expect(result.totalMissed).toBe(0);
      expect(result.totalEvaluated).toBe(3);
      expect(result.score).toBe(100);
    });

    it('8. excludes unscheduled rest days (e.g. MWF schedule on Tue/Thu/Sat/Sun)', () => {
      // Habit scheduled MWF only (1, 3, 5)
      const mwfHabit = createDummyHabit({
        startDate: '2026-11-09', // Monday
        schedule: { frequency: 'selected_days', selectedDays: [1, 3, 5] }
      });

      // Mon (Nov 9), Wed (Nov 11), Fri (Nov 13) completed
      const logs: HabitLog[] = [
        { id: '1', habitId: mwfHabit.id, date: '2026-11-09', status: 'completed', createdAt: '', updatedAt: '' },
        { id: '2', habitId: mwfHabit.id, date: '2026-11-11', status: 'completed', createdAt: '', updatedAt: '' },
        { id: '3', habitId: mwfHabit.id, date: '2026-11-13', status: 'completed', createdAt: '', updatedAt: '' }
      ];

      // Evaluate for 7-day window up to Sunday Nov 15
      const result = DisciplineScoreEngine.calculateDisciplineScore([mwfHabit], logs, [], {
        evaluationDate: '2026-11-15',
        windowDays: 7
      });

      expect(result.totalCompleted).toBe(3);
      expect(result.totalEvaluated).toBe(3);
      expect(result.totalUnscheduled).toBe(4); // Tue, Thu, Sat, Sun
      expect(result.score).toBe(100);
    });
  });

  describe('Rolling Window Boundaries & Previous Period Delta', () => {
    it('10. calculates exact 30-day window boundaries ending on evaluation date', () => {
      const habit = createDummyHabit();
      const result = DisciplineScoreEngine.calculateDisciplineScore([habit], [], [], {
        evaluationDate: '2026-11-17',
        windowDays: 30
      });

      expect(result.windowEndDate).toBe('2026-11-17');
      expect(result.windowStartDate).toBe('2026-10-19');
      expect(result.windowDays).toBe(30);
    });

    it('11. computes accurate scoreDelta when compared against preceding 30-day window', () => {
      const habit = createDummyHabit({ startDate: '2026-09-01' });
      const logs: HabitLog[] = [];

      // Preceding window (2026-09-19 to 2026-10-18): 21 completed, 9 failed -> 21 / 30 = 70%
      for (let i = 0; i < 21; i++) {
        const dt = new Date(2026, 8, 19 + i);
        const dStr = `2026-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        logs.push({
          id: `prev-${i}`,
          habitId: habit.id,
          date: dStr,
          status: 'completed',
          createdAt: '',
          updatedAt: ''
        });
      }
      for (let i = 21; i < 30; i++) {
        const dt = new Date(2026, 8, 19 + i);
        const dStr = `2026-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        logs.push({
          id: `prev-${i}`,
          habitId: habit.id,
          date: dStr,
          status: 'failed',
          createdAt: '',
          updatedAt: ''
        });
      }

      // Current window (2026-10-19 to 2026-11-17): 27 completed, 3 failed -> 27 / 30 = 90%
      for (let i = 0; i < 27; i++) {
        const dt = new Date(2026, 9, 19 + i);
        const dStr = `2026-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        logs.push({
          id: `curr-${i}`,
          habitId: habit.id,
          date: dStr,
          status: 'completed',
          createdAt: '',
          updatedAt: ''
        });
      }
      for (let i = 27; i < 30; i++) {
        const dt = new Date(2026, 9, 19 + i);
        const dStr = `2026-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        logs.push({
          id: `curr-${i}`,
          habitId: habit.id,
          date: dStr,
          status: 'failed',
          createdAt: '',
          updatedAt: ''
        });
      }

      const result = DisciplineScoreEngine.calculateDisciplineScore([habit], logs, [], {
        evaluationDate: '2026-11-17'
      });

      expect(result.score).toBe(90);
      expect(result.precedingScore).toBe(70);
      expect(result.scoreDelta).toBe(20); // +20% improvement
      expect(result.adherenceGrade).toBe('sovereign');
    });

    it('12. supports evaluation at any historical date deterministically', () => {
      const habit = createDummyHabit({ startDate: '2026-08-01' });
      const resultPast = DisciplineScoreEngine.calculateDisciplineScore([habit], [], [], {
        evaluationDate: '2026-08-31'
      });

      expect(resultPast.windowEndDate).toBe('2026-08-31');
      expect(resultPast.windowStartDate).toBe('2026-08-02');
    });

    it('13. includes archived habits in historical calculations when active during window', () => {
      // Habit active from Oct 1 to Nov 5, archived on Nov 6
      const archivedHabit = createDummyHabit({
        startDate: '2026-10-01',
        endDate: '2026-11-05',
        status: 'archived'
      });

      const logs: HabitLog[] = [
        { id: '1', habitId: archivedHabit.id, date: '2026-10-25', status: 'completed', createdAt: '', updatedAt: '' },
        { id: '2', habitId: archivedHabit.id, date: '2026-10-26', status: 'completed', createdAt: '', updatedAt: '' }
      ];

      // Window: 2026-10-19 to 2026-11-17
      const result = DisciplineScoreEngine.calculateDisciplineScore([archivedHabit], logs, [], {
        evaluationDate: '2026-11-17'
      });

      expect(result.totalCompleted).toBe(2);
      expect(result.totalEvaluated).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Database Persistence & Live Calculation', () => {
    it('15. verifies historical corrections dynamically update score via IndexedDB', async () => {
      const habit = await HabitService.createHabit({
        title: 'Morning Read',
        category: 'mind',
        type: 'completion',
        schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
        startDate: '2026-11-16',
        status: 'active'
      });

      // Record check in as failed first
      const initialLog = await HabitLogService.recordCheckIn(habit, '2026-11-16', { status: 'failed' });

      const scoreBefore = await DisciplineScoreEngine.fetchAndCalculateScore({
        evaluationDate: '2026-11-16'
      });
      expect(scoreBefore.score).toBe(0);

      // Audit correction: change failed to completed
      await HabitLogService.correctCheckIn(initialLog.id, {
        status: 'completed',
        reason: 'Mistaken tap; was completed on time'
      });

      const scoreAfter = await DisciplineScoreEngine.fetchAndCalculateScore({
        evaluationDate: '2026-11-16'
      });
      expect(scoreAfter.score).toBe(100);
    });
  });
});
