import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import type { HabitPerformanceMetric } from '../../core/analytics/analyticsTypes';
import { Target, Flame, TrendingUp, TrendingDown, Minus, Trophy } from 'lucide-react';

interface HabitPerformancePanelProps {
  habitMetrics: HabitPerformanceMetric[];
}

export const HabitPerformancePanel: React.FC<HabitPerformancePanelProps> = ({ habitMetrics }) => {
  const getTrendBadge = (trend: HabitPerformanceMetric['recentTrend'], delta: number | null) => {
    if (trend === 'improving') {
      return (
        <span className="flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
          <TrendingUp className="w-3 h-3" />
          <span>+{delta}%</span>
        </span>
      );
    }
    if (trend === 'declining') {
      return (
        <span className="flex items-center gap-1 font-mono text-[11px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800/40 px-2 py-0.5 rounded">
          <TrendingDown className="w-3 h-3" />
          <span>{delta}%</span>
        </span>
      );
    }
    if (trend === 'stable' && delta !== null) {
      return (
        <span className="flex items-center gap-1 font-mono text-[11px] text-slate-300 bg-obsidian-900 border border-obsidian-750 px-2 py-0.5 rounded">
          <Minus className="w-3 h-3" />
          <span>{delta > 0 ? `+${delta}%` : `${delta}%`}</span>
        </span>
      );
    }
    return (
      <span className="text-[10px] text-slate-400 bg-obsidian-900 border border-obsidian-750 px-2 py-0.5 rounded">
        Awaiting Data
      </span>
    );
  };

  return (
    <Card className="border-obsidian-750 bg-obsidian-850 shadow-md">
      <CardHeader className="pb-3 border-b border-obsidian-750/70">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-slate-100">
            <Target className="w-4 h-4 text-gold-400" />
            <span>Habit Adherence Breakdown</span>
          </CardTitle>
          <Badge variant="outline" size="sm" className="font-mono text-[10px]">
            {habitMetrics.length} {habitMetrics.length === 1 ? 'Habit' : 'Habits'}
          </Badge>
        </div>
        <CardDescription className="text-xs text-slate-400">
          Individual habit adherence percentage evaluated over scheduled unpaused days.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4 space-y-3">
        {habitMetrics.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No active commitments found for this period.
          </div>
        ) : (
          <div className="space-y-2.5">
            {habitMetrics.map((h) => {
              const rate = h.completionPercentage;
              const rateColor =
                rate === null
                  ? 'bg-slate-700'
                  : rate >= 90
                  ? 'bg-gold-400'
                  : rate >= 75
                  ? 'bg-emerald-400'
                  : rate >= 60
                  ? 'bg-amber-400'
                  : 'bg-rose-400';

              return (
                <div
                  key={h.habitId}
                  className="p-3.5 rounded-xl bg-obsidian-900/90 border border-obsidian-750/80 hover:border-gold-500/40 transition-colors space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-xs sm:text-sm text-slate-100">
                        {h.habitTitle}
                      </span>
                      <span className="text-[10px] capitalize text-slate-400 bg-obsidian-800 border border-obsidian-700 px-2 py-0.5 rounded">
                        {h.habitCategory}
                      </span>
                      <span className="text-[10px] capitalize text-slate-400 bg-obsidian-800 border border-obsidian-700 px-2 py-0.5 rounded">
                        {h.habitType}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Current streak */}
                      <div className="flex items-center gap-1 text-xs font-mono font-bold text-gold-300">
                        <Flame className="w-3.5 h-3.5 text-gold-400" />
                        <span>{h.currentStreak}d</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-slate-400" />
                        <span>Best: {h.longestStreak}d</span>
                      </div>
                      {getTrendBadge(h.recentTrend, h.percentageDelta)}
                    </div>
                  </div>

                  {/* Progress bar and metrics */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">
                        {h.completedCount} / {h.evaluatedCount} fulfilled
                        {h.failedCount > 0 && <span className="text-rose-400 ml-1.5">({h.failedCount} failed)</span>}
                        {h.missedCount > 0 && <span className="text-amber-400 ml-1.5">({h.missedCount} missed)</span>}
                      </span>
                      <span className="font-bold text-slate-200">
                        {rate !== null ? `${rate}%` : 'Awaiting data'}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-obsidian-950 rounded-full overflow-hidden border border-obsidian-750">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${rateColor}`}
                        style={{ width: `${rate ?? 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
