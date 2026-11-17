import React from 'react';
import { Card, CardHeader, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { type Habit, type HabitLog } from '../../../core/domain/types';
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
  X
} from 'lucide-react';

interface HabitCardProps {
  habit: Habit;
  isScheduledToday: boolean;
  todayLog?: HabitLog;
  totalSuccessDays: number;
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
    statusBadge = <Badge variant="neutral" size="sm">Scheduled Rest Day</Badge>;
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

        {/* Quick Check-in or Log Status button on right */}
        {habit.status === 'active' && isScheduledToday && (
          <div className="flex-shrink-0">
            {todayLog ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCheckIn(habit)}
                className="text-xs h-8 px-2.5 border-obsidian-700 hover:border-gold-500/40 text-slate-300"
                title="Click to view or correct today's log"
              >
                {todayLog.status === 'completed' ? '✓ Logged' : '⚠ Correct'}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onCheckIn(habit)}
                className="text-xs h-8 px-3 font-semibold shadow-gold-sm"
              >
                Check In
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-2 border-t border-obsidian-750/70 space-y-3">
        {/* Quantitative details if applicable */}
        {isQuantitative && habit.targetValue && (
          <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-obsidian-900 border border-obsidian-750 font-mono">
            <span className="text-slate-400">Configured Target:</span>
            <span className="text-gold-300 font-bold">
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
            <strong className="text-gold-400">{totalSuccessDays}</strong> days clean / completed
          </span>
        </div>

        {/* Bottom Action Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-obsidian-750/50">
          <button
            onClick={() => onViewDetails(habit)}
            className="text-xs text-slate-400 hover:text-gold-300 flex items-center gap-1 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>History & Details</span>
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
