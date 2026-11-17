import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../storage/db';
import { type Habit, type HabitLog } from '../../core/domain/types';
import { formatScheduleSummary } from '../../core/services/scheduleService';
import { StreakCalculator } from '../../core/streak/streakCalculator';
import { StreakEngine } from '../../core/streak/streakEngine';
import { formatCalendarDate, formatFriendlyDate } from '../../core/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  Plus,
  Edit,
  Pause,
  Play,
  RefreshCw,
  Clock,
  Flame,
  Trophy,
  Activity
} from 'lucide-react';

interface HabitDetailViewProps {
  habitId: string;
  onBack: () => void;
  onEdit: (habit: Habit) => void;
  onCheckIn: (habit: Habit, date?: string, existingLog?: HabitLog) => void;
  onPauseToggle: (habit: Habit) => void;
  onArchiveToggle: (habit: Habit) => void;
}

export function HabitDetailView({
  habitId,
  onBack,
  onEdit,
  onCheckIn,
  onPauseToggle,
  onArchiveToggle
}: HabitDetailViewProps) {
  const todayStr = formatCalendarDate(new Date());

  const habit = useLiveQuery(() => db.habits.get(habitId), [habitId]);
  const logs = useLiveQuery(
    () => db.habitLogs.where('habitId').equals(habitId).reverse().sortBy('date'),
    [habitId]
  );
  const auditRecords = useLiveQuery(
    () => db.auditRecords.where('habitId').equals(habitId).reverse().sortBy('timestamp'),
    [habitId]
  );

  // Compute full deterministic streak metrics
  const streak = useMemo(() => {
    if (!habit || !logs) return undefined;
    const pausedRanges = auditRecords ? StreakEngine.extractPausedRanges(auditRecords, habit) : [];
    return StreakCalculator.calculateStreak(habit, logs, {
      evaluationDate: todayStr,
      pausedRanges
    });
  }, [habit, logs, auditRecords, todayStr]);

  if (!habit) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>Loading habit details or habit not found...</p>
        <Button variant="ghost" size="sm" onClick={onBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Habits
        </Button>
      </div>
    );
  }

  const scheduleSummary = formatScheduleSummary(habit.schedule);
  const isAbstinence = habit.type === 'abstinence';
  const isQuantitative = habit.type === 'quantitative';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header with Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-obsidian-750">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} title="Back to Habits">
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-100">
                {habit.title}
              </h2>
              <Badge variant="gold" size="sm" className="capitalize">
                {habit.category}
              </Badge>
              <Badge variant="outline" size="sm" className="capitalize">
                {habit.type}
              </Badge>
              {habit.status === 'paused' && <Badge variant="warning" size="sm">Paused</Badge>}
              {habit.status === 'archived' && <Badge variant="neutral" size="sm">Archived</Badge>}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Established on {formatFriendlyDate(habit.startDate)}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCheckIn(habit, todayStr)}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Today's Check-In</span>
          </Button>

          <Button variant="secondary" size="sm" onClick={() => onEdit(habit)} className="gap-1.5">
            <Edit className="w-3.5 h-3.5" />
            <span>Edit</span>
          </Button>

          {habit.status === 'archived' ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onArchiveToggle(habit)}
              className="gap-1.5 text-emerald-400"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restore</span>
            </Button>
          ) : habit.status === 'paused' ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPauseToggle(habit)}
              className="gap-1.5 text-gold-400"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Resume</span>
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPauseToggle(habit)}
              className="gap-1.5 text-amber-400"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </Button>
          )}
        </div>
      </div>

      {/* Description & Standard */}
      {habit.description && (
        <Card className="border-obsidian-750 bg-obsidian-850">
          <CardContent className="py-4">
            <span className="text-xs font-semibold text-gold-400 uppercase tracking-wider block mb-1">
              Standard of Excellence
            </span>
            <p className="text-sm text-slate-200 leading-relaxed">{habit.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Primary Streak Metrics Grid (Section 2 & 7) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Current Streak */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-obsidian-800 to-obsidian-850 border border-gold-600/50 shadow-gold-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-wider">
            <span>Current Streak</span>
            <Flame className="w-4 h-4 text-gold-400" />
          </div>
          <span className="text-3xl font-bold font-mono text-gold-300 mt-2 block">
            {streak?.currentStreak ?? 0}
            <span className="text-xs font-normal text-slate-400 ml-1">days</span>
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">
            {streak?.currentStreakStartDate
              ? `Started on ${streak.currentStreakStartDate}`
              : 'No active continuous streak'}
          </span>
        </div>

        {/* Longest Streak */}
        <div className="p-4 rounded-xl bg-obsidian-850 border border-obsidian-750">
          <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-wider">
            <span>All-Time Longest</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-3xl font-bold font-mono text-slate-100 mt-2 block">
            {streak?.longestStreak ?? 0}
            <span className="text-xs font-normal text-slate-400 ml-1">days</span>
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">
            {streak?.longestStreakRange
              ? `${streak.longestStreakRange.startDate} to ${streak.longestStreakRange.endDate}`
              : 'Preserved permanently'}
          </span>
        </div>

        {/* Success Rate */}
        <div className="p-4 rounded-xl bg-obsidian-850 border border-obsidian-750">
          <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-wider">
            <span>Success Adherence</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-3xl font-bold font-mono text-emerald-400 mt-2 block">
            {streak?.successPercentage ?? 0}%
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">
            {streak?.totalSuccessfulDays ?? 0} of {streak?.totalScheduledDays ?? 0} scheduled
          </span>
        </div>

        {/* Next Scheduled Day */}
        <div className="p-4 rounded-xl bg-obsidian-850 border border-obsidian-750">
          <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-wider">
            <span>Next Commitment</span>
            <Calendar className="w-4 h-4 text-sky-400" />
          </div>
          <span className="text-xl font-bold font-mono text-slate-100 mt-2 block">
            {streak?.nextScheduledDate || 'None'}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1 truncate">
            Schedule: {scheduleSummary}
          </span>
        </div>
      </div>

      {/* Streak Forensic Breakdown */}
      <Card className="border-obsidian-750 bg-obsidian-850">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wider text-slate-300">
            Strict Streak Invariants & Status
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1 font-mono">
          <div className="p-3 rounded-lg bg-obsidian-900 border border-obsidian-750">
            <span className="text-slate-400 block font-sans">Total Successful Days:</span>
            <span className="text-emerald-400 font-bold text-base mt-0.5 block">
              {streak?.totalSuccessfulDays ?? 0}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-obsidian-900 border border-obsidian-750">
            <span className="text-slate-400 block font-sans">Total Failed / Setbacks:</span>
            <span className="text-red-400 font-bold text-base mt-0.5 block">
              {streak?.totalFailedDays ?? 0}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-obsidian-900 border border-obsidian-750">
            <span className="text-slate-400 block font-sans">Unrecorded Missed Days:</span>
            <span className="text-amber-400 font-bold text-base mt-0.5 block">
              {streak?.totalMissedDays ?? 0}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-obsidian-900 border border-obsidian-750">
            <span className="text-slate-400 block font-sans">Last Successful Date:</span>
            <span className="text-gold-300 font-bold text-base mt-0.5 block">
              {streak?.lastSuccessfulDate || 'None'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Timeline Table */}
      <Card className="border-obsidian-750 bg-obsidian-850">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gold-400" />
              <span>Full Historical Streak Timeline</span>
            </CardTitle>
            <CardDescription>
              Chronological day-by-day sequence showing scheduled status, logs, and streak impact.
            </CardDescription>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCheckIn(habit)}
            className="text-xs text-gold-400 hover:text-gold-300"
          >
            + Log Custom Date
          </Button>
        </CardHeader>

        <CardContent>
          {!streak || streak.timeline.length === 0 ? (
            <div className="p-8 text-center text-slate-400 border border-dashed border-obsidian-750 rounded-xl">
              <Clock className="w-8 h-8 mx-auto text-slate-500 mb-2" />
              <p className="text-sm font-medium text-slate-300">No timeline data available</p>
              <p className="text-xs text-slate-400 mt-1">
                This habit has not started yet or has no scheduled days prior to today.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-obsidian-750/70 overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-obsidian-750 font-mono uppercase text-[10px] sticky top-0 bg-obsidian-850">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Schedule</th>
                    <th className="py-2.5 px-3">Evaluated Status</th>
                    <th className="py-2.5 px-3">Streak Impact</th>
                    {isQuantitative && <th className="py-2.5 px-3">Measured Value</th>}
                    <th className="py-2.5 px-3">Notes</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-obsidian-750/50">
                  {streak.timeline
                    .slice()
                    .reverse()
                    .map((item) => {
                      return (
                        <tr
                          key={item.date}
                          className={`hover:bg-obsidian-800/40 transition-colors ${
                            item.breaksStreak ? 'bg-red-950/10' : ''
                          }`}
                        >
                          <td className="py-3 px-3 font-mono font-medium text-slate-200">
                            {item.date}
                          </td>

                          <td className="py-3 px-3 font-sans">
                            {item.isPaused ? (
                              <Badge variant="warning" size="sm">Paused</Badge>
                            ) : item.isScheduled ? (
                              <span className="text-slate-300">Scheduled</span>
                            ) : (
                              <span className="text-slate-500">Unscheduled</span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            {item.status === 'completed' ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 font-mono text-[11px] font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {isAbstinence ? 'Maintained' : 'Completed'}
                              </span>
                            ) : item.status === 'failed' ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-950/60 border border-red-800/50 text-red-400 font-mono text-[11px] font-semibold">
                                <XCircle className="w-3.5 h-3.5" />
                                {isAbstinence ? 'Setback' : 'Failed'}
                              </span>
                            ) : item.status === 'missed' ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-950/40 border border-red-800/30 text-red-400 font-mono text-[11px]">
                                Missed
                              </span>
                            ) : item.status === 'pending' ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-gold-950/40 border border-gold-800/40 text-gold-300 font-mono text-[11px]">
                                Pending Today
                              </span>
                            ) : (
                              <span className="text-slate-500 font-mono text-[11px]">Rest Day</span>
                            )}
                          </td>

                          <td className="py-3 px-3 font-mono text-[11px]">
                            {item.contributesToStreak ? (
                              <span className="text-emerald-400 font-bold">+1 Increment</span>
                            ) : item.breaksStreak ? (
                              <span className="text-red-400 font-bold">Resets to 0</span>
                            ) : (
                              <span className="text-slate-500">Neutral</span>
                            )}
                          </td>

                          {isQuantitative && (
                            <td className="py-3 px-3 font-mono text-slate-300">
                              {item.log?.numericValue !== undefined
                                ? `${item.log.numericValue} ${habit.unit}`
                                : '—'}
                            </td>
                          )}

                          <td className="py-3 px-3 text-slate-400 max-w-xs truncate">
                            {item.log?.notes || <span className="text-slate-600 italic">None</span>}
                            {item.log?.correctedAt && (
                              <span className="block text-[10px] text-amber-400 font-mono mt-0.5">
                                Corrected: {item.log.correctionReason || 'Audited'}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right">
                            {item.isScheduled && !item.isPaused && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onCheckIn(habit, item.date, item.log)}
                                className="text-xs h-7 px-2 text-slate-400 hover:text-gold-300"
                              >
                                {item.log ? 'Correct' : 'Log'}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
