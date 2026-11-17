import { ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, XCircle, Clock, Pause, Moon } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { getMonthMatrix, formatMonthYearLabel } from '../../core/calendar/calendarUtils';
import type { DailyDisciplineSummary } from '../../core/calendar/calendarTypes';

interface MonthlyCalendarProps {
  year: number;
  month: number; // 1-12
  selectedDate?: string;
  onSelectDate: (date: string) => void;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onJumpToday: () => void;
  summaries: Map<string, DailyDisciplineSummary>;
}

export function MonthlyCalendar({
  year,
  month,
  selectedDate,
  onSelectDate,
  onNavigatePrev,
  onNavigateNext,
  onJumpToday,
  summaries
}: MonthlyCalendarProps) {
  const cells = getMonthMatrix(year, month, 0);

  const getStatusDisplay = (summary?: DailyDisciplineSummary, isFuture?: boolean) => {
    if (isFuture) {
      return {
        badgeClass: 'text-slate-400 bg-obsidian-900 border-obsidian-800',
        icon: null,
        label: 'Future',
        metric: '—'
      };
    }

    if (!summary) {
      return {
        badgeClass: 'text-slate-400 bg-obsidian-900 border-obsidian-800',
        icon: <Moon className="w-3 h-3 text-slate-400" />,
        label: 'Rest',
        metric: '—'
      };
    }

    switch (summary.status) {
      case 'complete':
        return {
          badgeClass: 'text-gold-300 bg-gold-950/40 border-gold-500/40 font-semibold',
          icon: <CheckCircle2 className="w-3 h-3 text-gold-400" />,
          label: 'Complete',
          metric: `${summary.completedCount}/${summary.scheduledCount}`
        };
      case 'partial':
        return {
          badgeClass: 'text-amber-300 bg-amber-950/40 border-amber-600/40 font-medium',
          icon: <AlertTriangle className="w-3 h-3 text-amber-400" />,
          label: summary.hasPending ? 'In Progress' : 'Partial',
          metric: `${summary.completedCount}/${summary.scheduledCount}`
        };
      case 'failed':
        return {
          badgeClass: 'text-red-300 bg-red-950/50 border-red-800/50 font-medium',
          icon: <XCircle className="w-3 h-3 text-red-400" />,
          label: 'Failed',
          metric: `0/${summary.scheduledCount}`
        };
      case 'pending':
        return {
          badgeClass: 'text-amber-200 bg-amber-950/30 border-amber-500/30',
          icon: <Clock className="w-3 h-3 text-amber-400" />,
          label: 'Pending',
          metric: `${summary.scheduledCount} due`
        };
      case 'paused':
        return {
          badgeClass: 'text-slate-400 bg-obsidian-800 border-obsidian-700',
          icon: <Pause className="w-3 h-3 text-slate-400" />,
          label: 'Paused',
          metric: 'Excluded'
        };
      case 'rest':
      default:
        return {
          badgeClass: 'text-slate-400 bg-obsidian-900/60 border-obsidian-800',
          icon: <Moon className="w-3 h-3 text-slate-400" />,
          label: 'Rest',
          metric: '—'
        };
    }
  };

  return (
    <div className="rounded-xl border border-obsidian-750 bg-obsidian-850 p-4 sm:p-5 shadow-lg space-y-4">
      {/* Month Navigation Header */}
      <div className="flex items-center justify-between pb-3 border-b border-obsidian-750">
        <div className="flex items-center gap-2">
          <h3 className="text-lg sm:text-xl font-bold font-display text-slate-100">
            {formatMonthYearLabel(year, month)}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onJumpToday}
            className="text-xs text-gold-400 hover:text-gold-300 hover:bg-gold-500/10 h-7 px-2 font-mono"
          >
            Today
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onNavigatePrev}
            className="p-1.5 rounded-md hover:bg-obsidian-750 text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onNavigateNext}
            className="p-1.5 rounded-md hover:bg-obsidian-750 text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Column Headers */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider pb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {cells.map((cell) => {
          const summary = summaries.get(cell.date);
          const isSelected = selectedDate === cell.date;
          const display = getStatusDisplay(summary, summary?.status === 'future');

          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => onSelectDate(cell.date)}
              className={`min-h-[72px] sm:min-h-[88px] p-2 rounded-lg border text-left flex flex-col justify-between transition-all relative ${
                cell.isCurrentMonth ? 'bg-obsidian-900/90' : 'bg-obsidian-950/40 opacity-40'
              } ${
                isSelected
                  ? 'border-gold-400 ring-2 ring-gold-400/40 shadow-md shadow-gold-950/50 bg-obsidian-850'
                  : 'border-obsidian-750/80 hover:border-obsidian-650 hover:bg-obsidian-800/60'
              }`}
              aria-label={`Date ${cell.date}, status ${display.label}`}
            >
              {/* Day Header Row */}
              <div className="flex items-center justify-between w-full">
                <span
                  className={`text-xs font-mono font-bold ${
                    cell.isToday
                      ? 'text-gold-400 flex items-center gap-1'
                      : cell.isCurrentMonth
                      ? 'text-slate-200'
                      : 'text-slate-400'
                  }`}
                >
                  {cell.dayOfMonth}
                  {cell.isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-400 inline-block" />
                  )}
                </span>

                <span className="text-[10px] font-mono text-slate-400">
                  {display.metric !== '—' ? display.metric : ''}
                </span>
              </div>

              {/* Status Pill */}
              <div className="w-full mt-1.5">
                <span
                  className={`inline-flex items-center gap-1 w-full px-1.5 py-0.5 rounded text-[10px] border truncate ${display.badgeClass}`}
                >
                  {display.icon}
                  <span className="truncate">{display.label}</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend Footer */}
      <div className="pt-3 border-t border-obsidian-750 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-gold-400" /> Complete (100%)
          </span>
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Partial / In Progress
          </span>
          <span className="flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-red-400" /> Failed / Missed
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-300" /> Pending Today
          </span>
          <span className="flex items-center gap-1.5">
            <Moon className="w-3.5 h-3.5 text-slate-400" /> Rest / Unscheduled
          </span>
          <span className="flex items-center gap-1.5">
            <Pause className="w-3.5 h-3.5 text-slate-400" /> Paused
          </span>
        </div>
      </div>
    </div>
  );
}
