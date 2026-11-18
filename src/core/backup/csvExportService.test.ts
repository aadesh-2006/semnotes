import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../storage/db';
import { HabitService } from '../services/habitService';
import { HabitLogService } from '../services/habitLogService';
import { FocusSessionService } from '../focus/focusSessionService';
import { ReflectionService } from '../reflection/reflectionService';
import { MilestoneService } from '../milestones/milestoneService';
import { CsvExportService } from './csvExportService';

describe('CSV Export Service', () => {
  beforeEach(async () => {
    // Clear all tables before each test
    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) {
        await table.clear();
      }
    });
  });

  describe('RFC 4180 Escaping and Formatting', () => {
    it('escapes plain strings, commas, double-quotes, newlines, and nulls properly', () => {
      expect(CsvExportService.escapeCell('simple text')).toBe('simple text');
      expect(CsvExportService.escapeCell('text, with comma')).toBe('"text, with comma"');
      expect(CsvExportService.escapeCell('text with "quotes" inside')).toBe('"text with ""quotes"" inside"');
      expect(CsvExportService.escapeCell('text\nwith\nnewlines')).toBe('"text\nwith\nnewlines"');
      expect(CsvExportService.escapeCell(null)).toBe('');
      expect(CsvExportService.escapeCell(undefined)).toBe('');
      expect(CsvExportService.escapeCell(123)).toBe('123');
      expect(CsvExportService.escapeCell(true)).toBe('true');
    });

    it('formats rows and prepends UTF-8 BOM to documents', () => {
      const headers = ['Name', 'Quote', 'Count'];
      const rows = [
        ['Alice', 'Stay "hard", keep moving', 42],
        ['Bob', 'Hello world', 0],
      ];

      const csv = CsvExportService.buildDocument(headers, rows);
      expect(csv.startsWith('\uFEFF')).toBe(true);

      const lines = csv.replace('\uFEFF', '').split('\r\n');
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe('Name,Quote,Count');
      expect(lines[1]).toBe('Alice,"Stay ""hard"", keep moving",42');
      expect(lines[2]).toBe('Bob,Hello world,0');
    });
  });

  describe('Category-Specific CSV Exports', () => {
    it('exports habits to CSV with correct headers and values', async () => {
      await HabitService.createHabit({
        title: 'Deep Meditation',
        description: 'Mindfulness and breathwork',
        category: 'mind',
        type: 'completion',
        schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
        startDate: '2026-01-01',
      });

      const csv = await CsvExportService.exportHabitsCsv();
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('Habit ID,Title,Description,Category,Type');
      expect(csv).toContain('Deep Meditation');
      expect(csv).toContain('mind');
    });

    it('exports check-ins to CSV and resolves habit titles', async () => {
      const habit = await HabitService.createHabit({
        title: 'Morning Cold Shower',
        category: 'discipline',
        type: 'completion',
        schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
        startDate: '2026-01-01',
      });

      await HabitLogService.recordCheckIn(habit, '2026-01-05', {
        status: 'completed',
        notes: 'Felt invigorating, 3 minutes cold',
      });

      const csv = await CsvExportService.exportCheckInsCsv();
      expect(csv).toContain('Morning Cold Shower');
      expect(csv).toContain('2026-01-05');
      expect(csv).toContain('completed');
      expect(csv).toContain('"Felt invigorating, 3 minutes cold"');
    });

    it('exports focus sessions to CSV', async () => {
      const habit = await HabitService.createHabit({
        title: 'Coding Practice',
        category: 'craft',
        type: 'completion',
        schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
        startDate: '2026-01-01',
      });

      await FocusSessionService.createSession({
        title: 'Algorithms Revision',
        sessionMode: 'pomodoro',
        plannedDurationMinutes: 50,
        linkedHabitId: habit.id,
      });

      const csv = await CsvExportService.exportFocusSessionsCsv();
      expect(csv).toContain('Algorithms Revision');
      expect(csv).toContain('pomodoro');
      expect(csv).toContain('Coding Practice');
      expect(csv).toContain('50');
    });

    it('exports milestones to CSV', async () => {
      const habit = await HabitService.createHabit({
        title: 'Clean Nutrition',
        category: 'body',
        type: 'completion',
        schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
        startDate: '2026-01-01',
      });

      await MilestoneService.createMilestone({
        habitId: habit.id,
        thresholdDays: 30,
        rewardTitle: 'Fine Dining Night',
        rewardDescription: 'Enjoy a gourmet steak dinner',
      });

      const csv = await CsvExportService.exportMilestonesCsv();
      expect(csv).toContain('Fine Dining Night');
      expect(csv).toContain('30');
      expect(csv).toContain('Clean Nutrition');
    });

    it('exports reflections to CSV unifying morning and evening records', async () => {
      await ReflectionService.saveMorningIntention({
        date: '2026-01-10',
        primaryIntention: 'Deliver exceptional focus today',
        keyCommitment: 'Zero distractions during work hours',
      });

      await ReflectionService.saveEveningDebrief({
        date: '2026-01-10',
        wentWell: 'Completed all critical tasks on time',
        commitmentsFulfilled: ['Zero distractions during work hours'],
      });

      const csv = await CsvExportService.exportReflectionsCsv();
      expect(csv).toContain('Morning Intention');
      expect(csv).toContain('Deliver exceptional focus today');
      expect(csv).toContain('Evening Debrief');
      expect(csv).toContain('Completed all critical tasks on time');
    });
  });
});
