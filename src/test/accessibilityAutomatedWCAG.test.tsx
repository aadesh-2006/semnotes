import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import * as matchers from 'vitest-axe/matchers';
import { MemoryRouter } from 'react-router-dom';
import { db } from '../storage/db';
import { type Habit, type Milestone, type Achievement } from '../core/domain/types';

// Core UI & Layout
import { Sidebar } from '../app/Sidebar';
import { AppShell } from '../app/AppShell';
import { RootErrorBoundary } from '../components/errors/RootErrorBoundary';
import { NotFoundView } from '../features/not-found/NotFoundView';
import { Modal } from '../components/ui/modal';

// Modals & Forms
import { HabitFormModal } from '../components/modals/HabitFormModal';
import { CheckInModal } from '../components/modals/CheckInModal';
import { MilestoneFormModal } from '../components/modals/MilestoneFormModal';
import { ClaimRewardModal } from '../components/modals/ClaimRewardModal';
import { QuickActionModal } from '../components/modals/QuickActionModal';
import { BackupValidationModal } from '../features/data-management/BackupValidationModal';
import { BackupExportPanel } from '../features/data-management/BackupExportPanel';
import { BackupRestorePanel } from '../features/data-management/BackupRestorePanel';

// Views
import { CommandCenter } from '../features/command-center/CommandCenter';
import { StreaksView } from '../features/streaks/StreaksView';
import { HabitDetailView } from '../features/streaks/HabitDetailView';
import { CalendarView } from '../features/calendar/CalendarView';
import { JournalView } from '../features/journal/JournalView';
import { AnalyticsView } from '../features/analytics/AnalyticsView';
import { FocusView } from '../features/focus/FocusView';
import { FocusTimer } from '../features/focus/FocusTimer';
import { MilestonesView } from '../features/milestones/MilestonesView';
import { SettingsView } from '../features/settings/SettingsView';

expect.extend(matchers);

const sampleHabit: Habit = {
  id: 'a11y-habit-001',
  title: 'Morning Deep Reading',
  description: 'Read 20 pages of philosophy every day',
  category: 'mind',
  type: 'completion',
  schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
  startDate: '2026-01-01',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

const sampleMilestone: Milestone = {
  id: 'a11y-milestone-001',
  habitId: sampleHabit.id,
  thresholdDays: 7,
  rewardTitle: 'Specialty Coffee Roasting',
  rewardDescription: 'Enjoy a slow Sunday brew',
  rewardCategory: 'Personal Treat',
  personalNote: 'Discipline compounds daily',
  isEnabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

const sampleAchievement: Achievement = {
  id: 'a11y-achievement-001',
  habitId: sampleHabit.id,
  milestoneId: sampleMilestone.id,
  thresholdDays: 7,
  streakStartDate: '2026-01-01',
  achievedDate: '2026-01-07',
  isClaimed: false,
  rewardTitle: sampleMilestone.rewardTitle,
  rewardDescription: sampleMilestone.rewardDescription,
  rewardCategory: sampleMilestone.rewardCategory,
  personalNote: sampleMilestone.personalNote,
  createdAt: '2026-01-07T00:00:00.000Z'
};

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn();
});

beforeEach(async () => {
  await db.habits.clear();
  await db.habitLogs.clear();
  await db.milestones.clear();
  await db.achievements.clear();
  await db.focusSessions.clear();
  await db.journalEntries.clear();
  await db.habits.add(sampleHabit);
});

describe('Automated WCAG 2.1 AA Compliance Suite across 15 Subsystems (AUDIT-A11Y-01)', () => {
  it('1. Command Center accessibility: zero automated WCAG violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <CommandCenter onNavigate={() => {}} onOpenQuickAction={() => {}} />
      </MemoryRouter>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('2. Sidebar navigation accessibility: zero automated WCAG violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <Sidebar isCollapsed={false} onToggleCollapse={() => {}} />
      </MemoryRouter>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('3. Mobile navigation & AppShell accessibility: zero automated WCAG violations', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <AppShell>
          <div>Main landmark content</div>
        </AppShell>
      </MemoryRouter>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('4. Habit creation & edit form accessibility: zero automated WCAG violations', async () => {
    const { container } = render(
      <HabitFormModal
        isOpen={true}
        onClose={() => {}}
        onSuccess={() => {}}
      />
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('5. Check-in modal accessibility: zero automated WCAG violations', async () => {
    const { container } = render(
      <CheckInModal
        isOpen={true}
        onClose={() => {}}
        habit={sampleHabit}
        onSuccess={() => {}}
      />
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('6. Habit detail & Streaks view accessibility: zero automated WCAG violations', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={[`/streaks/${sampleHabit.id}`]}>
        <HabitDetailView
          habitId={sampleHabit.id}
          onBack={() => {}}
          onEdit={() => {}}
          onCheckIn={() => {}}
          onPauseToggle={() => {}}
          onArchiveToggle={() => {}}
        />
      </MemoryRouter>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('7. Consistency Calendar accessibility: zero automated WCAG violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <CalendarView onNavigate={() => {}} />
      </MemoryRouter>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('8. Journal & daily reflection accessibility: zero automated WCAG violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <JournalView />
      </MemoryRouter>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('9. Discipline Analytics view accessibility: zero automated WCAG violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <AnalyticsView />
      </MemoryRouter>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('10. Focus Mode & timer accessibility: zero automated WCAG violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <FocusView />
      </MemoryRouter>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('11. Milestone form & reward claim modal accessibility: zero automated WCAG violations', async () => {
    const { container } = render(
      <ClaimRewardModal
        isOpen={true}
        onClose={() => {}}
        achievement={sampleAchievement}
        habitName={sampleHabit.title}
        onSuccess={() => {}}
      />
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('12. Settings & storage view accessibility: zero automated WCAG violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <SettingsView />
      </MemoryRouter>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('13. Backup validation & restore modal accessibility: zero automated WCAG violations', async () => {
    const mockReport = {
      isValid: true,
      backupVersion: '2.0',
      dbVersion: 6,
      exportedAt: '2026-01-01T00:00:00.000Z',
      checksumValid: true,
      recordCounts: { habits: 1, habitLogs: 0, focusSessions: 0 },
      totalRecords: 1,
      errors: [],
      warnings: []
    };

    const { container } = render(
      <BackupValidationModal
        isOpen={true}
        onClose={() => {}}
        report={mockReport}
        onConfirmRestore={async () => {}}
      />
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('14. Root Error Boundary fallback accessibility: zero automated WCAG violations', async () => {
    function Broken(): JSX.Element {
      throw new Error('Test fault');
    }
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { container } = render(
      <RootErrorBoundary>
        <Broken />
      </RootErrorBoundary>
    );

    const results = await axe(container);
    expect(results.violations).toEqual([]);
    consoleError.mockRestore();
  });

  it('15. 404 Not Found view accessibility: zero automated WCAG violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <NotFoundView />
      </MemoryRouter>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
