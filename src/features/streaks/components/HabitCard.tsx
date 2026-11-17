import React from 'react';
import { Card, CardHeader, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { type Habit, type HabitLog } from '../../../core/domain/types';
import { type HabitStreakResult } from '../../../core/streak/streakTypes';
import { formatScheduleSummary } from '../../../core/services/scheduleService';
import {
  Calendar,
  Pause,
  Play,
  Archive,
  RefreshCw,
  Edit,
  Eye,
  Check,
  X,
  Flame,
  Trophy,
  AlertCircle
} from 'lucide-react';

interface HabitCardProps {
  habit: Habit;
  isScheduledToday: boolean;
  todayLog?: HabitLog;
  totalSuccessDays: number;
  streak?: HabitStreakResult;
  onCheckIn: (habit: Habit) => void;
  onViewDetails: (habit: Habit) => void;
  onEdit: (habit: Habit) => void;
  onPauseToggle: (habit: Habit) => void;
  onArchiveToggle: (habit: Habit) => void;
}

export function HabitCard({
  habit,
  isScheduledToday,
  todayLog,
  totalSuccessDays,
  streak,
  onCheckIn,
  onViewDetails,
  onEdit,
  onPauseToggle,
  onArchiveToggle
}: HabitCardProps) {
  const isAbstinence = habit.type === 'abstinence';
  const isQuantitative = habit.type === 'quantitative';

  const scheduleSummary = formatScheduleSummary(habit.schedule);

  // Status computation for today
  let statusBadge: React.ReactNode = null;
  if (habit.status === 'paused') {
    statusBadge = <Badge variant="warning" size="sm">Paused</Badge>;
  } else if (habit.status === 'archived') {
    statusBadge = <Badge variant="outline" size="sm">Archived</Badge>;
  } else if (!isScheduledToday) {
    statusBadge = <Badge variant="neutral" size="sm">Rest Day</Badge>;
  } else if (todayLog) {
    if (todayLog.status === 'completed') {
      statusBadge = (
        <Badge variant="success" size="sm" className="font-mono">
          <Check className="w-3 h-3 stroke-[3]" />
          {isAbstinence ? 'Maintained Clean' : 'Completed'}
        </Badge>
      );
    } else {
      statusBadge = (
        <Badge variant="danger" size="sm" className="font-mono">
          <X className="w-3 h-3 stroke-[3]" />
          {isAbstinence ? 'Setback' : 'Missed'}
        </Badge>
      );
    }
  } else {
    statusBadge = (
      <Badge variant="gold-subtle" size="sm">
        Pending Check-In
      </Badge>
    );
  }

  const currentStreak = streak?.currentStreak ?? 0;
  const longestStreak = streak?.longestStreak ?? 0;

  return (
    <Card className="border-obsidian-750 bg-obsidian-850 hover:border-obsidian-650 transition-all duration-200">
      <CardHeader className="flex flex-row items-start justify-between pb-3 gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="gold" size="sm" className="capitalize">
              {habit.category}
            </Badge>
            <Badge variant="outline" size="sm" className="capitalize">
              {habit.type}
            </Badge>
            {statusBadge}
          </div>

          <h3
            onClick={() => onViewDetails(habit)}
            className="text-base font-semibold text-slate-100 hover:text-gold-300 cursor-pointer transition-colors truncate"
          >
            {habit.title}
          </h3>

          {habit.description && (
            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {habit.description}
            </p>
          )}
        </div>

        {/* Prominent Streak Badge & Action */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border font-mono text-sm font-bold shadow-sm ${
              currentStreak > 0
                ? 'bg-gradient-to-r from-gold-950/80 to-obsidian-800 border-gold-600/60 text-gold-300 shadow-gold-sm'
                : 'bg-obsidian-900 border-obsidian-750 text-slate-400'
            }`}
            title={`Current streak: ${currentStreak} days | Longest record: ${longestStreak} days`}
          >
            <Flame className={`w-4 h-4 ${currentStreak > 0 ? 'text-gold-400' : 'text-slate-500'}`} />
            <span>{currentStreak}d</span>
          </div>

          {habit.status === 'active' && isScheduledToday && (
            <div>
              {todayLog ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCheckIn(habit)}
                  className="text-xs h-7 px-2 border-obsidian-700 hover:border-gold-500/40 text-slate-300"
                  title="Click to view or correct today's log"
                >
                  {todayLog.status === 'completed' ? '✓ Logged' : '⚠ Correct'}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onCheckIn(habit)}
                  className="text-xs h-7 px-3 font-semibold shadow-gold-sm"
                >
                  Check In
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-2 border-t border-obsidian-750/70 space-y-3">
        {/* Streak Metrics Row */}
        <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded-lg bg-obsidian-900/90 border border-obsidian-750 font-mono">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Current Streak:</span>
            <span className="text-gold-300 font-bold">{currentStreak} days</span>
          </div>
          <div className="flex items-center justify-between border-l border-obsidian-750 pl-2">
            <span className="text-slate-400 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-500" /> Record:
            </span>
            <span className="text-slate-200 font-bold">{longestStreak} days</span>
          </div>
        </div>

        {/* Quantitative details if applicable */}
        {isQuantitative && habit.targetValue && (
          <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-obsidian-900/50 border border-obsidian-750 font-mono">
            <span className="text-slate-400">Target Condition:</span>
            <span className="text-gold-300 font-semibold">
              {habit.targetConstraint === 'at_most' ? '≤' : '≥'} {habit.targetValue} {habit.unit}
            </span>
          </div>
        )}

        {/* Schedule & History info */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 truncate">
            <Calendar className="w-3.5 h-3.5 text-gold-400 flex-shrink-0" />
            <span className="truncate">{scheduleSummary}</span>
          </span>

          <span className="font-mono text-slate-300 flex-shrink-0">
            <strong className="text-gold-400">{totalSuccessDays}</strong> total successes
          </span>
        </div>

        {/* At risk reminder if today is scheduled, streak > 0, but pending */}
        {streak?.streakStatus === 'at_risk' && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-950/40 border border-amber-800/40 text-[11px] text-amber-300">
            <AlertCircle className="w-3 h-3 text-amber-400 flex-shrink-0" />
            <span>Streak at risk: Check in before midnight to preserve continuity.</span>
          </div>
        )}

        {/* Bottom Action Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-obsidian-750/50">
          <button
            onClick={() => onViewDetails(habit)}
            className="text-xs text-slate-400 hover:text-gold-300 flex items-center gap-1 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Streak History & Details</span>
          </button>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(habit)}
              className="h-7 w-7 text-slate-400 hover:text-slate-200"
              title="Edit Habit"
            >
              <Edit className="w-3.5 h-3.5" />
            </Button>

            {habit.status === 'archived' ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onArchiveToggle(habit)}
                className="h-7 w-7 text-emerald-400 hover:text-emerald-300"
                title="Restore Habit"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            ) : habit.status === 'paused' ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onPauseToggle(habit)}
                className="h-7 w-7 text-gold-400 hover:text-gold-300"
                title="Resume Habit"
              >
                <Play className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onPauseToggle(habit)}
                  className="h-7 w-7 text-amber-400 hover:text-amber-300"
                  title="Pause Habit"
                >
                  <Pause className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onArchiveToggle(habit)}
                  className="h-7 w-7 text-slate-400 hover:text-slate-200"
                  title="Archive Habit"
                >
                  <Archive className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
