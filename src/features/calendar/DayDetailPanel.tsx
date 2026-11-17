import { X, CheckCircle2, AlertTriangle, XCircle, Clock, Pause, Moon, ArrowRight, Edit3 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { formatFriendlyDate } from '../../core/utils';
import type { DailyDisciplineSummary, DayHabitDetail } from '../../core/calendar/calendarTypes';
import type { Habit } from '../../core/domain/types';

interface DayDetailPanelProps {
  summary?: DailyDisciplineSummary;
  date: string;
  onClose: () => void;
  onOpenCheckIn: (habit: Habit, date: string) => void;
  onNavigateToHabit: (habitId: string) => void;
  habitsMap: Map<string, Habit>;
}

export function DayDetailPanel({
  summary,
  date,
  onClose,
  onOpenCheckIn,
  onNavigateToHabit,
  habitsMap
}: DayDetailPanelProps) {
  const formattedDate = formatFriendlyDate(date);

  const getStatusBadge = () => {
    if (!summary) {
      return <Badge variant="outline">Unrecorded</Badge>;
    }

    switch (summary.status) {
      case 'complete':
        return (
          <Badge variant="gold" className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Complete (100%)</span>
          </Badge>
        );
      case 'partial':
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>{summary.hasPending ? 'In Progress' : 'Partial'}</span>
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="danger" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            <span>Strict Failure (0%)</span>
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="warning" className="flex items-center gap-1 text-amber-300 border-amber-600/40">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Pending Evaluation</span>
          </Badge>
        );
      case 'paused':
        return (
          <Badge variant="outline" className="flex items-center gap-1 text-slate-400">
            <Pause className="w-3 h-3" />
            <span>Excluded (Paused)</span>
          </Badge>
        );
      case 'future':
        return (
          <Badge variant="outline" className="text-slate-400">
            Upcoming Future
          </Badge>
        );
      case 'rest':
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1 text-slate-400">
            <Moon className="w-3 h-3" />
            <span>Rest / Unscheduled</span>
          </Badge>
        );
    }
  };

  const getStreakImpactBadge = (impact: DayHabitDetail['streakImpact']) => {
    if (impact === '+1 Increment') {
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gold-950/50 border border-gold-500/30 text-gold-300">
          +1 Streak Increment
        </span>
      );
    }
    if (impact === 'Resets to 0') {
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950/50 border border-red-800/40 text-red-300">
          Resets Streak to 0
        </span>
      );
    }
    return (
      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-obsidian-800 border border-obsidian-700 text-slate-400">
        No Streak Impact
      </span>
    );
  };

  return (
    <div className="rounded-xl border border-obsidian-750 bg-obsidian-850 p-4 sm:p-5 shadow-xl space-y-5">
      {/* Top Header */}
      <div className="flex items-start justify-between pb-3 border-b border-obsidian-750 gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base sm:text-lg font-bold font-display text-slate-100">
              {formattedDate}
            </h3>
            {getStatusBadge()}
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Evaluated Discipline Record · {date}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-obsidian-750 transition-colors"
          aria-label="Close day details"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Adherence Scorecard */}
      {summary && summary.scheduledCount > 0 && (
        <div className="p-3.5 rounded-lg bg-obsidian-900 border border-obsidian-750 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Daily Adherence Rate</span>
            <span className="font-mono font-bold text-gold-300 text-sm">
              {summary.completionPercentage !== null ? `${summary.completionPercentage}%` : 'Pending'}
            </span>
          </div>

          {/* Progress meter */}
          <div className="h-2 w-full rounded-full bg-obsidian-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                summary.status === 'complete'
                  ? 'bg-gradient-to-r from-gold-500 to-gold-400'
                  : summary.status === 'failed'
                  ? 'bg-red-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${summary.completionPercentage ?? 0}%` }}
            />
          </div>

          {/* Micro stat chips */}
          <div className="grid grid-cols-4 gap-2 pt-1 text-center font-mono">
            <div className="p-1.5 rounded bg-obsidian-850 border border-obsidian-750/60">
              <span className="text-[10px] text-slate-400 block">Scheduled</span>
              <span className="text-xs font-bold text-slate-200">{summary.scheduledCount}</span>
            </div>
            <div className="p-1.5 rounded bg-obsidian-850 border border-obsidian-750/60">
              <span className="text-[10px] text-gold-400 block">Completed</span>
              <span className="text-xs font-bold text-gold-300">{summary.completedCount}</span>
            </div>
            <div className="p-1.5 rounded bg-obsidian-850 border border-obsidian-750/60">
              <span className="text-[10px] text-red-400 block">Missed</span>
              <span className="text-xs font-bold text-red-400">{summary.missedCount + summary.failedCount}</span>
            </div>
            <div className="p-1.5 rounded bg-obsidian-850 border border-obsidian-750/60">
              <span className="text-[10px] text-amber-300 block">Pending</span>
              <span className="text-xs font-bold text-amber-300">{summary.pendingCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Habit-by-Habit Breakdown */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Commitment Breakdown ({summary?.habits.length || 0})
        </h4>

        {(!summary || summary.habits.length === 0) ? (
          <div className="p-6 text-center rounded-lg border border-obsidian-800 bg-obsidian-900/50 text-slate-400 text-xs">
            No habits were active or applicable on this date.
          </div>
        ) : (
          <div className="space-y-2.5">
            {summary.habits.map((detail) => {
              const habit = habitsMap.get(detail.habitId);

              return (
                <div
                  key={detail.habitId}
                  className="p-3.5 rounded-lg border border-obsidian-750 bg-obsidian-900 space-y-2 hover:border-obsidian-650 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-slate-100">
                          {detail.habitName}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-obsidian-800 text-slate-400 capitalize">
                          {detail.habitCategory}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-obsidian-800 text-slate-400 capitalize">
                          {detail.habitType}
                        </span>
                      </div>

                      {/* Status / measured values */}
                      <p className="text-xs text-slate-400 mt-1">
                        {detail.habitType === 'quantitative' && detail.targetValue && (
                          <span className="font-mono mr-2">
                            Recorded: {detail.recordedValue ?? '—'} / {detail.targetValue} {detail.targetUnit}
                          </span>
                        )}
                        {detail.status === 'completed' && (
                          <span className="text-gold-300 font-medium">✓ Completed</span>
                        )}
                        {detail.status === 'failed' && (
                          <span className="text-red-400 font-medium">✗ Failed Target / Setback</span>
                        )}
                        {detail.status === 'missed' && (
                          <span className="text-red-400 font-medium">✗ Unrecorded Missed Day</span>
                        )}
                        {detail.status === 'pending' && (
                          <span className="text-amber-300 font-medium">⏳ Pending Check-In</span>
                        )}
                        {detail.status === 'paused' && (
                          <span className="text-slate-400 font-medium">⏸ Paused / Excluded</span>
                        )}
                        {detail.status === 'unscheduled' && (
                          <span className="text-slate-400 font-medium">🌙 Scheduled Rest</span>
                        )}
                      </p>

                      {detail.reflectionNote && (
                        <p className="text-[11px] italic text-slate-400 mt-1 bg-obsidian-950/60 p-1.5 rounded border border-obsidian-800">
                          "{detail.reflectionNote}"
                        </p>
                      )}
                    </div>

                    <div>{getStreakImpactBadge(detail.streakImpact)}</div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-obsidian-800/80 text-xs">
                    <button
                      type="button"
                      onClick={() => onNavigateToHabit(detail.habitId)}
                      className="text-slate-400 hover:text-gold-300 transition-colors flex items-center gap-1 text-[11px]"
                    >
                      <span>Streak History</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>

                    {habit && (
                      <div className="flex items-center gap-1.5">
                        {detail.log ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenCheckIn(habit, date)}
                            className="h-6 text-[10px] text-slate-400 hover:text-slate-200 px-2"
                          >
                            <Edit3 className="w-2.5 h-2.5 mr-1" />
                            Audit Correction
                          </Button>
                        ) : detail.status === 'pending' || detail.status === 'missed' ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onOpenCheckIn(habit, date)}
                            className="h-6 text-[10px] bg-gold-500/10 hover:bg-gold-500/20 text-gold-300 border-gold-500/30 px-2"
                          >
                            <CheckCircle2 className="w-2.5 h-2.5 mr-1 text-gold-400" />
                            Log Check-In
                          </Button>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
