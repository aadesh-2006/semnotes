import { describe, it, expect } from 'vitest';
import { formatCalendarDate, parseCalendarDate, generateUUID } from '../core/utils';
import { HabitSchema } from '../core/domain/types';

describe('Core Utilities & Date Engine', () => {
  it('formats calendar dates in ISO YYYY-MM-DD format', () => {
    const testDate = new Date(2026, 10, 17); // Nov 17 2026
    expect(formatCalendarDate(testDate)).toBe('2026-11-17');
  });

  it('parses calendar date string back to date object correctly', () => {
    const date = parseCalendarDate('2026-11-17');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(10); // November is 10 (0-indexed)
    expect(date.getDate()).toBe(17);
  });

  it('generates valid RFC4122 v4 UUIDs', () => {
    const uuid = generateUUID();
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });
});

describe('Domain Models & Zod Validation', () => {
  it('validates a correct abstinence habit definition', () => {
    const habitData = {
      id: generateUUID(),
      title: 'Digital Purity',
      description: 'Zero indulgence in pornography or lustful triggers',
      category: 'abstinence',
      type: 'abstinence',
      schedule: {
        frequency: 'daily',
        selectedDays: [0, 1, 2, 3, 4, 5, 6]
      },
      startDate: '2026-11-01',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sortOrder: 0
    };

    const parsed = HabitSchema.safeParse(habitData);
    expect(parsed.success).toBe(true);
  });

  it('validates a quantitative habit with target value and unit', () => {
    const habitData = {
      id: generateUUID(),
      title: 'Daily Conditioning Run',
      description: '5k steps or morning run',
      category: 'body',
      type: 'quantitative',
      targetValue: 5000,
      unit: 'steps',
      schedule: {
        frequency: 'daily',
        selectedDays: [0, 1, 2, 3, 4, 5, 6]
      },
      startDate: '2026-11-01',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sortOrder: 1
    };

    const parsed = HabitSchema.safeParse(habitData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.targetValue).toBe(5000);
      expect(parsed.data.unit).toBe('steps');
    }
  });

  it('rejects invalid habit types', () => {
    const invalidData = {
      id: generateUUID(),
      title: 'Invalid Habit',
      category: 'unknown_cat',
      type: 'invalid_type',
      schedule: { frequency: 'daily', selectedDays: [] },
      startDate: '2026-11-01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const parsed = HabitSchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
  });
});
