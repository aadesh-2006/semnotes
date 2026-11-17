import { describe, it, expect } from 'vitest';
import {
  getPromptForDate,
  getDailyPrompts,
  getAllPrompts,
  hashDateString,
  REFLECTION_PROMPTS
} from './reflectionPromptEngine';
import type { PromptCategory } from './reflectionTypes';

describe('ReflectionPromptEngine', () => {
  describe('Deterministic date selection', () => {
    it('returns the exact same prompt for the same date and options', () => {
      const p1 = getPromptForDate('2026-11-17');
      const p2 = getPromptForDate('2026-11-17');
      expect(p1.id).toBe(p2.id);
      expect(p1.prompt).toBe(p2.prompt);
    });

    it('rotates across different calendar dates', () => {
      const dates = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'];
      const promptIds = new Set(dates.map((d) => getPromptForDate(d).id));
      // At least 4 distinct prompts across 5 consecutive days
      expect(promptIds.size).toBeGreaterThanOrEqual(4);
    });

    it('supports deterministic skipping with skipCount offset', () => {
      const initial = getPromptForDate('2026-11-17', { skipCount: 0 });
      const skipped1 = getPromptForDate('2026-11-17', { skipCount: 1 });
      const skipped2 = getPromptForDate('2026-11-17', { skipCount: 2 });

      expect(initial.id).not.toBe(skipped1.id);
      expect(skipped1.id).not.toBe(skipped2.id);
    });
  });

  describe('Category filtering', () => {
    it('filters prompts exclusively by the requested category', () => {
      const categories: PromptCategory[] = [
        'discipline',
        'self_respect',
        'gratitude',
        'focus',
        'growth',
        'resilience',
        'accountability',
        'recovery'
      ];

      for (const cat of categories) {
        const prompt = getPromptForDate('2026-11-17', { category: cat });
        expect(prompt.category).toBe(cat);
      }
    });

    it('getAllPrompts returns all prompts or filtered by category', () => {
      const all = getAllPrompts();
      expect(all.length).toBe(REFLECTION_PROMPTS.length);

      const gratitudePrompts = getAllPrompts('gratitude');
      expect(gratitudePrompts.length).toBeGreaterThan(0);
      expect(gratitudePrompts.every((p) => p.category === 'gratitude')).toBe(true);
    });

    it('handles non-existent or empty categories by falling back safely', () => {
      // @ts-expect-error testing runtime fallback
      const fallback = getPromptForDate('2026-11-17', { category: 'non_existent_category' });
      expect(fallback).toBeDefined();
      expect(fallback.prompt.length).toBeGreaterThan(0);
    });
  });

  describe('Daily paired prompts', () => {
    it('returns paired morning and evening prompts with distinct roles', () => {
      const { morning, evening } = getDailyPrompts('2026-11-17');

      expect(morning).toBeDefined();
      expect(evening).toBeDefined();
      expect(morning.id).not.toBe(evening.id);

      // Morning should be intention/focus oriented
      expect(['discipline', 'focus', 'self_respect', 'growth']).toContain(morning.category);
      // Evening should be reflection/accountability oriented
      expect(['accountability', 'gratitude', 'resilience', 'recovery']).toContain(evening.category);
    });

    it('hashDateString produces positive deterministic integer', () => {
      const hash1 = hashDateString('2026-11-17');
      const hash2 = hashDateString('2026-11-17');
      expect(hash1).toBe(hash2);
      expect(hash1).toBeGreaterThanOrEqual(0);
    });
  });
});
