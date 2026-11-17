/**
 * SEMNÓTĒS — Focus Analytics Dashboard
 * Obsidian & Gold Design System.
 *
 * Visualizes actual focus data:
 * - High-level summary metrics (Total Focus, Completed Count, Average Duration, Longest Session)
 * - Habit distribution breakdown
 * - Activity distribution breakdown
 * - Daily focus trend breakdown
 * - Strictly excludes break time, cancelled sessions, and fabricated metrics.
 */

import { useMemo } from 'react';
import type { FocusSessionRecord } from '../../core/focus/focusTypes';
import { FocusAnalyticsService } from '../../core/focus/focusAnalyticsService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { MetricCard } from '../../components/ui/metric-card';
import { Progress } from '../../components/ui/progress';
import {
  Clock,
  CheckCircle2,
  Trophy,
  Flame,
  Calendar,
  Activity,
  Layers,
  FileQuestion
} from 'lucide-react';

interface FocusAnalyticsProps {
  sessions: FocusSessionRecord[];
  habitTitleMap: Map<string, string>;
}

export function FocusAnalytics({ sessions, habitTitleMap }: FocusAnalyticsProps) {
  const summary = useMemo(() => FocusAnalyticsService.calculateSummary(sessions), [sessions]);
  const byHabit = useMemo(() => FocusAnalyticsService.aggregateByHabit(sessions, habitTitleMap), [sessions, habitTitleMap]);
  const byActivity = useMemo(() => FocusAnalyticsService.aggregateByActivity(sessions), [sessions]);
  const dailyFocus = useMemo(() => FocusAnalyticsService.aggregateDailyFocus(sessions), [sessions]);

  if (!summary.hasData) {
    return (
      <div className="p-12 text-center rounded-3xl bg-obsidian-900 border border-obsidian-750/60 space-y-3">
        <FileQuestion className="w-10 h-10 text-slate-600 mx-auto" />
        <h4 className="text-base font-semibold text-slate-200 font-display">
          No Focus Data Recorded
        </h4>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Complete your first focus session to generate factual focus time analytics and habit breakdowns.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Total Focused Time"
          value={summary.totalFocusedHours >= 1 ? `${summary.totalFocusedHours}h` : `${summary.totalFocusedMinutes}m`}
          subtext={`${summary.totalFocusedMinutes} total minutes`}
          icon={<Clock className="w-5 h-5 text-gold-400" />}
          highlight={true}
        />

        <MetricCard
          label="Completed Sessions"
          value={String(summary.completedSessionsCount)}
          subtext={`${summary.interruptedSessionsCount} interrupted early`}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
        />

        <MetricCard
          label="Avg Session Duration"
          value={summary.averageSessionDurationMinutes ? `${summary.averageSessionDurationMinutes}m` : '—'}
          subtext="Actual focused time"
          icon={<Activity className="w-5 h-5 text-amber-400" />}
        />

        <MetricCard
          label="Longest Focus Session"
          value={summary.longestSessionMinutes ? `${summary.longestSessionMinutes}m` : '—'}
          subtext="Single continuous session"
          icon={<Trophy className="w-5 h-5 text-gold-400" />}
          highlight={true}
        />
      </div>

      {/* Habit Distribution & Activity Distribution Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Habit Focus Distribution */}
        <Card className="border-obsidian-750 bg-obsidian-850">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-gold-400" />
              <span>Focus Distribution by Habit</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Breakdown of focused time dedicated to associated habits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            {byHabit.length > 0 ? (
              byHabit.map((item) => (
                <div key={item.habitId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-semibold text-slate-200 truncate max-w-[220px]">
                      {item.habitTitle}
                    </span>
                    <span className="text-gold-300 font-bold">
                      {item.focusedMinutes}m ({item.percentage}%)
                    </span>
                  </div>
                  <Progress value={item.percentage} />
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">No habit-linked sessions yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Activity Distribution */}
        <Card className="border-obsidian-750 bg-obsidian-850">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Flame className="w-4 h-4 text-gold-400" />
              <span>Top Focus Activities</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Focused time organized by session title and discipline objectives.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            {byActivity.slice(0, 6).map((item) => (
              <div key={item.title} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-semibold text-slate-200 truncate max-w-[220px]">
                    {item.title}
                  </span>
                  <span className="text-gold-300 font-bold">
                    {item.focusedMinutes}m ({item.percentage}%)
                  </span>
                </div>
                <Progress value={item.percentage} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Daily Focus History Trend */}
      <Card className="border-obsidian-750 bg-obsidian-850">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gold-400" />
            <span>Daily Focus Output</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Actual focused minutes logged per calendar date.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            {dailyFocus.slice(-8).reverse().map((day) => (
              <div
                key={day.date}
                className="p-3 rounded-xl bg-obsidian-800/80 border border-obsidian-750 flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-mono font-bold text-slate-200 block">
                    {day.date}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {day.completedSessions} session{day.completedSessions === 1 ? '' : 's'}
                  </span>
                </div>
                <span className="text-sm font-mono font-extrabold text-gold-300">
                  {day.focusedMinutes}m
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
