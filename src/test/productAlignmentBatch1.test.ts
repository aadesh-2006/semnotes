/**
 * SEMNÓTĒS — Milestone 10 Phase 2, Batch 1: Product Alignment & Navigation Test Suite
 * Dignity. Self-respect. Discipline.
 *
 * Verifies that the obsolete Recovery Protocol route is completely removed,
 * leaving exactly the 8 approved sovereign general-purpose discipline routes,
 * while preserving all habit types (boolean, abstinence, quantitative)
 * and reflection subsystems.
 */

import { describe, it, expect } from 'vitest';
import { NAVIGATION_ROUTES, type RouteId } from '../app/routes';
import { HabitSchema } from '../core/domain/types';
import { UrgeLogRecordSchema } from '../core/urges/urgeTypes';

describe('Product Alignment & General-Purpose Discipline Navigation (Batch 1)', () => {
  it('excludes the obsolete recovery protocol from navigation routes', () => {
    const routeIds = NAVIGATION_ROUTES.map((r) => r.id);
    expect(routeIds).not.toContain('recovery');
  });

  it('contains exactly the 8 approved general-purpose discipline routes in order', () => {
    const expectedRouteIds: RouteId[] = [
      'dashboard',
      'streaks',
      'calendar',
      'journal',
      'analytics',
      'focus',
      'milestones',
      'settings',
    ];

    const actualRouteIds = NAVIGATION_ROUTES.map((r) => r.id);
    expect(actualRouteIds).toEqual(expectedRouteIds);
    expect(actualRouteIds.length).toBe(8);
  });

  it('confirms every route has a valid title, description, and icon', () => {
    NAVIGATION_ROUTES.forEach((route) => {
      expect(route.id).toBeTruthy();
      expect(route.label).toBeTruthy();
      expect(route.description).toBeTruthy();
      expect(route.icon).toBeDefined();
    });
  });

  it('preserves all 3 habit types in the domain model including abstinence', () => {
    // Completion habit (e.g. Morning Meditation)
    const completionHabit = HabitSchema.safeParse({
      id: 'a0000000-0000-4000-8000-000000000001',
      title: 'Morning Meditation',
      description: 'Quiet contemplation',
      category: 'mind',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01',
      status: 'active',
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
      sortOrder: 1,
    });
    expect(completionHabit.success).toBe(true);

    // Abstinence habit (e.g. Digital Screen Detox)
    const abstinenceHabit = HabitSchema.safeParse({
      id: 'a0000000-0000-4000-8000-000000000002',
      title: 'Digital Screen Detox',
      description: 'Zero social feeds after 9 PM',
      category: 'abstinence',
      type: 'abstinence',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01',
      status: 'active',
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
      sortOrder: 2,
    });
    expect(abstinenceHabit.success).toBe(true);

    // Quantitative habit (e.g. 50 Pages of Reading)
    const quantitativeHabit = HabitSchema.safeParse({
      id: 'a0000000-0000-4000-8000-000000000003',
      title: 'Deep Reading',
      description: 'Read philosophy or algorithms',
      category: 'craft',
      type: 'quantitative',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      targetValue: 50,
      unit: 'pages',
      startDate: '2026-11-01',
      status: 'active',
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
      sortOrder: 3,
    });
    expect(quantitativeHabit.success).toBe(true);
  });

  it('preserves urge tracking as an optional self-discipline diagnostic feature', () => {
    const urgeLog = UrgeLogRecordSchema.safeParse({
      id: 'b0000000-0000-4000-8000-000000000001',
      date: '2026-11-18',
      timestamp: '2026-11-18T00:00:00.000Z',
      intensity: 7,
      triggerCategories: ['procrastination', 'stress'],
      customTrigger: 'Difficult coding problem',
      context: 'Late night study session',
      responseOutcome: 'resisted',
      reflectionNote: 'Maintained focus and walked away for 5 minutes',
      createdAt: '2026-11-18T00:00:00.000Z',
      updatedAt: '2026-11-18T00:00:00.000Z',
    });
    expect(urgeLog.success).toBe(true);
  });
});
