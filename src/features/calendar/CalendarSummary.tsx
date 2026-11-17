import { Card, CardContent } from '../../components/ui/card';
import { CalendarCheck, CalendarX, TrendingUp, Award, Clock } from 'lucide-react';
import type { MonthlySummaryMetrics } from '../../core/calendar/calendarTypes';

interface CalendarSummaryProps {
  metrics: MonthlySummaryMetrics;
}

export function CalendarSummary({ metrics }: CalendarSummaryProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {/* 1. Scheduled Commitments */}
      <Card className="border-obsidian-750 bg-obsidian-850/80 shadow-md">
        <CardContent className="p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Scheduled
            </span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-100">
              {metrics.totalScheduledCommitments}
            </span>
            <span className="text-[10px] text-slate-400">commitments</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
            {metrics.monthLabel}
          </p>
        </CardContent>
      </Card>

      {/* 2. Completed Commitments */}
      <Card className="border-obsidian-750 bg-obsidian-850/80 shadow-md">
        <CardContent className="p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-gold-400 uppercase tracking-wider">
              Completed
            </span>
            <CalendarCheck className="w-3.5 h-3.5 text-gold-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-gold-300">
              {metrics.totalCompletedCommitments}
            </span>
            <span className="text-[10px] text-gold-500/80">fulfilled</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
            {metrics.totalSuccessfulDays} flawless days
          </p>
        </CardContent>
      </Card>

      {/* 3. Missed & Failed */}
      <Card className="border-obsidian-750 bg-obsidian-850/80 shadow-md">
        <CardContent className="p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-red-400 uppercase tracking-wider">
              Missed / Failed
            </span>
            <CalendarX className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-red-400">
              {metrics.totalFailedCommitments + metrics.totalMissedCommitments}
            </span>
            <span className="text-[10px] text-red-500/80">unmet</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
            {metrics.totalMissedCommitments} missed · {metrics.totalFailedCommitments} setbacks
          </p>
        </CardContent>
      </Card>

      {/* 4. Average Consistency */}
      <Card className="border-obsidian-750 bg-obsidian-850/80 shadow-md">
        <CardContent className="p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">
              Avg Consistency
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-300">
              {metrics.averageCompletionPercentage}%
            </span>
            <span className="text-[10px] text-emerald-500/80">rate</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
            Across {metrics.totalEvaluatedDays} active days
          </p>
        </CardContent>
      </Card>

      {/* 5. Best Adherence Day */}
      <Card className="border-obsidian-750 bg-obsidian-850/80 shadow-md col-span-2 md:col-span-1">
        <CardContent className="p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-gold-400 uppercase tracking-wider">
              Peak Day
            </span>
            <Award className="w-3.5 h-3.5 text-gold-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            {metrics.bestConsistencyDay ? (
              <>
                <span className="text-xl sm:text-2xl font-bold font-mono text-gold-300">
                  {metrics.bestConsistencyDay.percentage}%
                </span>
                <span className="text-[10px] text-slate-400">
                  ({metrics.bestConsistencyDay.completedCount}/{metrics.bestConsistencyDay.scheduledCount})
                </span>
              </>
            ) : (
              <span className="text-lg font-mono text-slate-400">—</span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
            {metrics.bestConsistencyDay?.date || 'No evaluated days'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
