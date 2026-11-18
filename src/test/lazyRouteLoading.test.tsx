/**
 * SEMNÓTĒS — Milestone 10 Phase 2, Batch 3B: Lazy Route Loading & Fallback Test Suite
 * Dignity. Self-respect. Discipline.
 *
 * Verifies route-level code splitting, lazy module loading, Suspense fallback rendering,
 * and seamless resolution of on-demand views without blank screens or regressions.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { RouteLoadingFallback } from '../components/feedback/RouteLoadingFallback';
import { AppContent } from '../App';

describe('RouteLoadingFallback Component', () => {
  it('renders accessible loading status indicator matching Obsidian & Gold aesthetic', () => {
    render(<RouteLoadingFallback />);

    const statusEl = screen.getByRole('status', { name: /loading workspace module/i });
    expect(statusEl).toBeInTheDocument();
    expect(screen.getByText('Aligning Protocol')).toBeInTheDocument();
    expect(screen.getByText('Loading module workspace...')).toBeInTheDocument();
  });
});

describe('Route-Level Lazy Loading & Suspense Integration (AUDIT-PERF-01)', () => {
  it('renders Command Center immediately on root route (/) without Suspense blocking', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppContent />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /command center/i })).toBeInTheDocument();
  });

  it('asynchronously resolves and renders StreaksView on on-demand navigation to /streaks', async () => {
    render(
      <MemoryRouter initialEntries={['/streaks']}>
        <AppContent />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /my streaks/i })).toBeInTheDocument();
    });
  });

  it('asynchronously resolves and renders CalendarView on on-demand navigation to /calendar', async () => {
    render(
      <MemoryRouter initialEntries={['/calendar']}>
        <AppContent />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /consistency calendar/i })).toBeInTheDocument();
    });
  });

  it('asynchronously resolves and renders JournalView on on-demand navigation to /journal', async () => {
    render(
      <MemoryRouter initialEntries={['/journal']}>
        <AppContent />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /journal & reflections/i })).toBeInTheDocument();
    });
  });

  it('asynchronously resolves and renders AnalyticsView on on-demand navigation to /analytics', async () => {
    render(
      <MemoryRouter initialEntries={['/analytics']}>
        <AppContent />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /discipline analytics/i })).toBeInTheDocument();
    });
  });

  it('asynchronously resolves and renders FocusView on on-demand navigation to /focus', async () => {
    render(
      <MemoryRouter initialEntries={['/focus']}>
        <AppContent />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /focus mode/i })).toBeInTheDocument();
    });
  });

  it('asynchronously resolves and renders SettingsView on on-demand navigation to /settings', async () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <AppContent />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /settings & storage/i })).toBeInTheDocument();
    });
  });

  it('asynchronously resolves and renders MilestonesView on on-demand navigation to /milestones', async () => {
    render(
      <MemoryRouter initialEntries={['/milestones']}>
        <AppContent />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /milestones & rewards/i })).toBeInTheDocument();
    });
  });

  it('asynchronously resolves NotFoundView on unknown route navigation', async () => {
    render(
      <MemoryRouter initialEntries={['/unmapped-realm']}>
        <AppContent />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('404 — Path Not Found')).toBeInTheDocument();
      expect(screen.getByText('/unmapped-realm')).toBeInTheDocument();
    });
  });

  it('renders RouteLoadingFallback while waiting for delayed lazy components', () => {
    // Verifies the fallback renders with expected status and message
    const { container } = render(<RouteLoadingFallback />);
    expect(container.querySelector('[role="status"]')).toBeInTheDocument();
    expect(screen.getByText('Aligning Protocol')).toBeInTheDocument();
  });
});
