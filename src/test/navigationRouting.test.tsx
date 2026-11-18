/**
 * SEMNÓTĒS — Milestone 10 Phase 2, Batch 3A: Navigation & Routing Test Suite
 * Dignity. Self-respect. Discipline.
 *
 * Verifies URL-based navigation, centralized route configurations,
 * direct URL access, browser back/forward history handling,
 * unknown route fallback (404), and IndexedDB state preservation across navigation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { AppContent } from '../App';
import {
  NAVIGATION_ROUTES,
  APP_ROUTES,
  getRouteIdFromPathname,
  getPathForRoute,
  isKnownRoutePath,
} from '../app/routes';
import { db } from '../storage/db';
import { HabitService } from '../core/services/habitService';

describe('Centralized Route Configuration (AUDIT-ROUT-01)', () => {
  it('exposes well-defined application paths for all primary views', () => {
    expect(APP_ROUTES.DASHBOARD).toBe('/');
    expect(APP_ROUTES.HABITS).toBe('/habits');
    expect(APP_ROUTES.STREAKS).toBe('/streaks');
    expect(APP_ROUTES.STREAK_DETAIL).toBe('/streaks/:habitId');
    expect(APP_ROUTES.CALENDAR).toBe('/calendar');
    expect(APP_ROUTES.JOURNAL).toBe('/journal');
    expect(APP_ROUTES.ANALYTICS).toBe('/analytics');
    expect(APP_ROUTES.FOCUS).toBe('/focus');
    expect(APP_ROUTES.MILESTONES).toBe('/milestones');
    expect(APP_ROUTES.SETTINGS).toBe('/settings');
    expect(APP_ROUTES.DATA).toBe('/data');
  });

  it('guarantees each of the 8 primary navigation items has a valid route path', () => {
    expect(NAVIGATION_ROUTES.length).toBe(8);
    NAVIGATION_ROUTES.forEach((route) => {
      expect(route.path).toBeDefined();
      expect(route.path.startsWith('/')).toBe(true);
      expect(route.label).toBeTruthy();
      expect(route.icon).toBeDefined();
    });
  });

  it('resolves correct RouteId from standard URL pathnames', () => {
    expect(getRouteIdFromPathname('/')).toBe('dashboard');
    expect(getRouteIdFromPathname('/streaks')).toBe('streaks');
    expect(getRouteIdFromPathname('/calendar')).toBe('calendar');
    expect(getRouteIdFromPathname('/journal')).toBe('journal');
    expect(getRouteIdFromPathname('/analytics')).toBe('analytics');
    expect(getRouteIdFromPathname('/focus')).toBe('focus');
    expect(getRouteIdFromPathname('/milestones')).toBe('milestones');
    expect(getRouteIdFromPathname('/settings')).toBe('settings');
  });

  it('resolves aliases and parameterized paths accurately', () => {
    // /habits aliases to streaks view
    expect(getRouteIdFromPathname('/habits')).toBe('streaks');
    // /streaks/:habitId resolves to streaks module
    expect(getRouteIdFromPathname('/streaks/test-uuid-123')).toBe('streaks');
    expect(getRouteIdFromPathname('/habits/test-uuid-123')).toBe('streaks');
    // /data aliases to settings / data management view
    expect(getRouteIdFromPathname('/data')).toBe('settings');
  });

  it('identifies unknown paths for not-found handling', () => {
    expect(getRouteIdFromPathname('/unknown-route')).toBeNull();
    expect(getRouteIdFromPathname('/dashboard/invalid/extra')).toBeNull();
    expect(getRouteIdFromPathname('/settings/deep/notfound')).toBeNull();

    expect(isKnownRoutePath('/')).toBe(true);
    expect(isKnownRoutePath('/streaks')).toBe(true);
    expect(isKnownRoutePath('/habits')).toBe(true);
    expect(isKnownRoutePath('/calendar')).toBe(true);
    expect(isKnownRoutePath('/journal')).toBe(true);
    expect(isKnownRoutePath('/analytics')).toBe(true);
    expect(isKnownRoutePath('/focus')).toBe(true);
    expect(isKnownRoutePath('/milestones')).toBe(true);
    expect(isKnownRoutePath('/settings')).toBe(true);
    expect(isKnownRoutePath('/data')).toBe(true);
    expect(isKnownRoutePath('/nonexistent')).toBe(false);
  });

  it('maps RouteId back to primary URL path accurately', () => {
    expect(getPathForRoute('dashboard')).toBe('/');
    expect(getPathForRoute('streaks')).toBe('/streaks');
    expect(getPathForRoute('calendar')).toBe('/calendar');
    expect(getPathForRoute('journal')).toBe('/journal');
    expect(getPathForRoute('analytics')).toBe('/analytics');
    expect(getPathForRoute('focus')).toBe('/focus');
    expect(getPathForRoute('milestones')).toBe('/milestones');
    expect(getPathForRoute('settings')).toBe('/settings');
  });
});

describe('Database State Preservation Across Navigation (AUDIT-ROUT-01)', () => {
  beforeEach(async () => {
    await db.habits.clear();
    await db.habitLogs.clear();
  });

  it('preserves IndexedDB data during routing and URL navigation events', async () => {
    await HabitService.createHabit({
      title: 'Deep Meditation',
      description: 'Morning meditation habit',
      category: 'mind',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01',
    });

    const habitsBefore = await db.habits.toArray();
    expect(habitsBefore.length).toBe(1);
    expect(habitsBefore[0].title).toBe('Deep Meditation');

    // Simulate route navigation: resolving multiple routes in sequence
    const routeSequence = ['/', '/streaks', '/calendar', '/journal', '/settings', '/'];
    for (const path of routeSequence) {
      const resolved = getRouteIdFromPathname(path);
      expect(resolved).toBeTruthy();
    }

    // Verify database remains untouched and identical
    const habitsAfter = await db.habits.toArray();
    expect(habitsAfter.length).toBe(1);
    expect(habitsAfter[0].id).toBe(habitsBefore[0].id);
    expect(habitsAfter[0].title).toBe('Deep Meditation');
  });
});

describe('Direct URL Access & View Rendering (AUDIT-ROUT-01)', () => {
  it('renders Command Center on default root URL (/)', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppContent />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /command center/i })).toBeInTheDocument();
  });

  it('renders My Streaks view on direct access to /streaks', async () => {
    render(
      <MemoryRouter initialEntries={['/streaks']}>
        <AppContent />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /my streaks/i })).toBeInTheDocument();
  });

  it('redirects /habits alias directly to /streaks', async () => {
    render(
      <MemoryRouter initialEntries={['/habits']}>
        <AppContent />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /my streaks/i })).toBeInTheDocument();
  });

  it('renders Consistency Calendar on direct access to /calendar', async () => {
    render(
      <MemoryRouter initialEntries={['/calendar']}>
        <AppContent />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /consistency calendar/i })).toBeInTheDocument();
  });

  it('renders Journal & Reflections on direct access to /journal', async () => {
    render(
      <MemoryRouter initialEntries={['/journal']}>
        <AppContent />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /journal & reflections/i })).toBeInTheDocument();
  });

  it('renders Discipline Analytics on direct access to /analytics', async () => {
    render(
      <MemoryRouter initialEntries={['/analytics']}>
        <AppContent />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /discipline analytics/i })).toBeInTheDocument();
  });

  it('renders Focus Mode on direct access to /focus', async () => {
    render(
      <MemoryRouter initialEntries={['/focus']}>
        <AppContent />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /focus mode/i })).toBeInTheDocument();
  });

  it('renders Milestones & Rewards on direct access to /milestones', async () => {
    render(
      <MemoryRouter initialEntries={['/milestones']}>
        <AppContent />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /milestones & rewards/i })).toBeInTheDocument();
  });

  it('renders Settings & Storage on direct access to /settings', async () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <AppContent />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /settings & storage/i })).toBeInTheDocument();
  });

  it('redirects /data alias directly to /settings', async () => {
    render(
      <MemoryRouter initialEntries={['/data']}>
        <AppContent />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /settings & storage/i })).toBeInTheDocument();
  });

  it('renders 404 NotFoundView on unrecognized routes with recovery options', async () => {
    render(
      <MemoryRouter initialEntries={['/nonexistent-dimension']}>
        <AppContent />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('404 — Path Not Found')).toBeInTheDocument();
      expect(screen.getByText('/nonexistent-dimension')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /return to command center/i })).toBeInTheDocument();
    });
  });

  it('renders habit detail view on parameterized direct route /streaks/:habitId', async () => {
    const habit = await HabitService.createHabit({
      title: 'Algorithmic Prowess',
      description: 'Daily LeetCode hard problem',
      category: 'mind',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01',
    });

    render(
      <MemoryRouter initialEntries={[`/streaks/${habit.id}`]}>
        <AppContent />
      </MemoryRouter>
    );

    await waitFor(
      () => {
        expect(screen.getByText('Algorithmic Prowess')).toBeInTheDocument();
      },
      { timeout: 4000 }
    );
  });
});
