import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../storage/db';
import { ReflectionService } from './reflectionService';

describe('ReflectionService', () => {
  beforeEach(async () => {
    await db.morningIntentions.clear();
    await db.eveningDebriefs.clear();
  });

  describe('Morning Intention', () => {
    it('saves a morning intention with primary intention and optional fields', async () => {
      const saved = await ReflectionService.saveMorningIntention({
        date: '2026-11-17',
        primaryIntention: 'Maintain unshakable presence and focus',
        keyCommitment: 'Ship Milestone 6 with zero defects',
        potentialObstacle: 'Late afternoon fatigue',
        plannedResponse: 'Take a brisk walk and drink water instead of resting on couch',
        personalNote: 'Discipline is self-respect.'
      });

      expect(saved.id).toBeDefined();
      expect(saved.date).toBe('2026-11-17');
      expect(saved.primaryIntention).toBe('Maintain unshakable presence and focus');

      const retrieved = await ReflectionService.getMorningIntention('2026-11-17');
      expect(retrieved).toBeDefined();
      expect(retrieved?.keyCommitment).toBe('Ship Milestone 6 with zero defects');
    });

    it('updates existing morning intention when saved again for same calendar date', async () => {
      await ReflectionService.saveMorningIntention({
        date: '2026-11-17',
        primaryIntention: 'Initial intention'
      });

      const updated = await ReflectionService.saveMorningIntention({
        date: '2026-11-17',
        primaryIntention: 'Elevated intention'
      });

      expect(updated.primaryIntention).toBe('Elevated intention');

      const all = await db.morningIntentions.toArray();
      // Enforces one primary record per date
      expect(all.length).toBe(1);
    });

    it('rejects saving when primary intention is empty', async () => {
      await expect(
        ReflectionService.saveMorningIntention({
          date: '2026-11-17',
          primaryIntention: ''
        })
      ).rejects.toThrow('Primary intention is required');
    });
  });

  describe('Evening Debrief', () => {
    it('saves evening debrief and handles partial reflections', async () => {
      const saved = await ReflectionService.saveEveningDebrief({
        date: '2026-11-17',
        wentWell: 'Deep work sprint without distractions',
        gratitude: 'Quiet morning hours and clear health'
      });

      expect(saved.id).toBeDefined();
      expect(saved.date).toBe('2026-11-17');
      expect(saved.wentWell).toBe('Deep work sprint without distractions');

      const retrieved = await ReflectionService.getEveningDebrief('2026-11-17');
      expect(retrieved).toBeDefined();
      expect(retrieved?.gratitude).toBe('Quiet morning hours and clear health');
    });

    it('updates existing debrief when returned to later in the evening', async () => {
      await ReflectionService.saveEveningDebrief({
        date: '2026-11-17',
        wentWell: 'Started the session on time'
      });

      const updated = await ReflectionService.saveEveningDebrief({
        date: '2026-11-17',
        tomorrowImprovements: 'Prepare tomorrow task list before sleep'
      });

      expect(updated.wentWell).toBe('Started the session on time');
      expect(updated.tomorrowImprovements).toBe('Prepare tomorrow task list before sleep');

      const all = await db.eveningDebriefs.toArray();
      expect(all.length).toBe(1);
    });
  });

  describe('Daily Reflection Status Integration', () => {
    it('correctly reports daily reflection completion states', async () => {
      const statusEmpty = await ReflectionService.getDailyReflectionStatus('2026-11-17');
      expect(statusEmpty.hasMorning).toBe(false);
      expect(statusEmpty.hasEvening).toBe(false);

      await ReflectionService.saveMorningIntention({
        date: '2026-11-17',
        primaryIntention: 'Master the day'
      });

      const statusMorningOnly = await ReflectionService.getDailyReflectionStatus('2026-11-17');
      expect(statusMorningOnly.hasMorning).toBe(true);
      expect(statusMorningOnly.hasEvening).toBe(false);

      await ReflectionService.saveEveningDebrief({
        date: '2026-11-17',
        wentWell: 'Executed all commitments'
      });

      const statusBoth = await ReflectionService.getDailyReflectionStatus('2026-11-17');
      expect(statusBoth.hasMorning).toBe(true);
      expect(statusBoth.hasEvening).toBe(true);
    });
  });
});
