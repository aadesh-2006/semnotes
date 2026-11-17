/**
 * SEMNÓTĒS — Focus Analytics Service Tests
 * Verifies summary metrics, daily aggregations, habit distributions,
 * and strict break and cancelled session exclusion rules.
 */

import { describe, it, expect } from 'vitest';
import { FocusAnalyticsService } from './focusAnalyticsService';
import type { FocusSessionRecord } from './focusTypes';

describe('FocusAnalyticsService', () => {
  const mockSessions: FocusSessionRecord[] = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      title: 'DSA Practice',
      sessionMode: 'custom',
      linkedHabitId: 'aaaa1111-1111-4111-8111-111111111111',
      plannedDurationMinutes: 50,
      actualDurationSeconds: 3000, // 50 mins
      breakDurationSeconds: 0,
      startedAt: '2026-11-10T10:00:00.000Z',
      endedAt: '2026-11-10T10:50:00.000Z',
      status: 'completed',
      date: '2026-11-10',
      createdAt: '2026-11-10T10:00:00.000Z',
      updatedAt: '2026-11-10T10:50:00.000Z',
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      title: 'System Design Marathon',
      sessionMode: 'custom',
      plannedDurationMinutes: 180,
      actualDurationSeconds: 10800, // 3 hours (180 mins)
      breakDurationSeconds: 0,
      startedAt: '2026-11-10T14:00:00.000Z',
      endedAt: '2026-11-10T17:00:00.000Z',
      status: 'completed',
      date: '2026-11-10',
      createdAt: '2026-11-10T14:00:00.000Z',
      updatedAt: '2026-11-10T17:00:00.000Z',
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      title: 'Pomodoro Sprint',
      sessionMode: 'pomodoro',
      linkedHabitId: 'aaaa1111-1111-4111-8111-111111111111',
      plannedDurationMinutes: 50,
      actualDurationSeconds: 3000, // 50 mins focused
      breakDurationSeconds: 600,   // 10 mins break (MUST BE EXCLUDED FROM FOCUS TIME)
      startedAt: '2026-11-11T09:00:00.000Z',
      endedAt: '2026-11-11T10:00:00.000Z',
      status: 'completed',
      date: '2026-11-11',
      createdAt: '2026-11-11T09:00:00.000Z',
      updatedAt: '2026-11-11T10:00:00.000Z',
    },
    {
      id: '44444444-4444-4444-8444-444444444444',
      title: 'Reading Book',
      sessionMode: 'custom',
      plannedDurationMinutes: 60,
      actualDurationSeconds: 1800, // 30 mins
      breakDurationSeconds: 0,
      startedAt: '2026-11-11T15:00:00.000Z',
      endedAt: '2026-11-11T15:30:00.000Z',
      status: 'interrupted',
      date: '2026-11-11',
      createdAt: '2026-11-11T15:00:00.000Z',
      updatedAt: '2026-11-11T15:30:00.000Z',
    },
    {
      id: '55555555-5555-4555-8555-555555555555',
      title: 'Cancelled Test',
      sessionMode: 'custom',
      plannedDurationMinutes: 25,
      actualDurationSeconds: 300,
      breakDurationSeconds: 0,
      startedAt: '2026-11-11T18:00:00.000Z',
      status: 'cancelled',
      date: '2026-11-11',
      createdAt: '2026-11-11T18:00:00.000Z',
      updatedAt: '2026-11-11T18:05:00.000Z',
    },
  ];

  it('calculates summary metrics accurately excluding break time and cancelled sessions', () => {
    const summary = FocusAnalyticsService.calculateSummary(mockSessions);

    expect(summary.hasData).toBe(true);
    // Focus seconds: 3000 + 10800 + 3000 + 1800 = 18,600s = 310 minutes
    // (Notice 600s break time and 300s cancelled session are EXCLUDED)
    expect(summary.totalFocusedSeconds).toBe(18600);
    expect(summary.totalFocusedMinutes).toBe(310);
    expect(summary.totalFocusedHours).toBe(5.2);

    expect(summary.completedSessionsCount).toBe(3);
    expect(summary.interruptedSessionsCount).toBe(1);
    expect(summary.totalSessionsEvaluated).toBe(4);

    // Longest session is the 3-hour marathon (10,800s / 60 = 180 mins)
    expect(summary.longestSessionMinutes).toBe(180);

    // Average completed duration: (3000 + 10800 + 3000) / 3 / 60 = 16800 / 3 / 60 = 93.3 -> 93 mins
    expect(summary.averageSessionDurationMinutes).toBe(93);
  });

  it('returns explicit empty state when no focus sessions exist', () => {
    const emptySummary = FocusAnalyticsService.calculateSummary([]);

    expect(emptySummary.hasData).toBe(false);
    expect(emptySummary.totalFocusedMinutes).toBe(0);
    expect(emptySummary.completedSessionsCount).toBe(0);
    expect(emptySummary.averageSessionDurationMinutes).toBeNull();
    expect(emptySummary.longestSessionMinutes).toBeNull();
  });

  it('calculates today stats for a specific date', () => {
    const stats10 = FocusAnalyticsService.calculateTodayStats(mockSessions, '2026-11-10');
    // On 2026-11-10: 3000s + 10800s = 13800s = 230 minutes; 2 completed sessions
    expect(stats10.focusedMinutesToday).toBe(230);
    expect(stats10.completedSessionsToday).toBe(2);

    const stats11 = FocusAnalyticsService.calculateTodayStats(mockSessions, '2026-11-11');
    // On 2026-11-11: 3000s (completed) + 1800s (interrupted) = 4800s = 80 minutes; 1 completed session
    expect(stats11.focusedMinutesToday).toBe(80);
    expect(stats11.completedSessionsToday).toBe(1);
  });

  it('aggregates daily focus time correctly', () => {
    const daily = FocusAnalyticsService.aggregateDailyFocus(mockSessions);
    expect(daily.length).toBe(2);
    expect(daily[0].date).toBe('2026-11-10');
    expect(daily[0].focusedMinutes).toBe(230);
    expect(daily[0].completedSessions).toBe(2);

    expect(daily[1].date).toBe('2026-11-11');
    expect(daily[1].focusedMinutes).toBe(80);
    expect(daily[1].completedSessions).toBe(1);
  });

  it('aggregates focus by linked habit with correct percentages', () => {
    const habitMap = new Map<string, string>();
    habitMap.set('aaaa1111-1111-4111-8111-111111111111', 'Daily DSA Solving');

    const byHabit = FocusAnalyticsService.aggregateByHabit(mockSessions, habitMap);

    expect(byHabit.length).toBe(2);
    // 'Unlinked Focus' had 10800 + 1800 = 12600s = 210 mins
    // 'Daily DSA Solving' had 3000 + 3000 = 6000s = 100 mins
    expect(byHabit[0].habitTitle).toBe('Unlinked Focus');
    expect(byHabit[0].focusedMinutes).toBe(210);

    expect(byHabit[1].habitTitle).toBe('Daily DSA Solving');
    expect(byHabit[1].focusedMinutes).toBe(100);
  });

  it('aggregates focus by activity title', () => {
    const byActivity = FocusAnalyticsService.aggregateByActivity(mockSessions);
    expect(byActivity.length).toBe(4);
    // Highest is 'System Design Marathon' (180 mins)
    expect(byActivity[0].title).toBe('System Design Marathon');
    expect(byActivity[0].focusedMinutes).toBe(180);
  });
});
