import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import type { SetbackRecoveryMetric } from '../../core/analytics/analyticsTypes';
import { ShieldCheck, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';

interface RecoveryAnalyticsProps {
  recoveryMetric: SetbackRecoveryMetric;
}

export const RecoveryAnalytics: React.FC<RecoveryAnalyticsProps> = ({ recoveryMetric }) => {
  return (
    <Card className="border-obsidian-750 bg-obsidian-850 shadow-md">
      <CardHeader className="pb-3 border-b border-obsidian-750/70">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-slate-100">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Setback & Recovery Auditing</span>
          </CardTitle>
          <span className="text-[10px] text-slate-400 font-mono">
            Return to Center
          </span>
        </div>
        <CardDescription className="text-xs text-slate-400">
          Evaluates how quickly discipline is restored on the day following a setback. A slip is data, not defeat.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Metric stat row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-obsidian-900 border border-obsidian-750 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Total Setbacks</span>
            </div>
            <span className="text-xl font-mono font-bold text-slate-100 block">
              {recoveryMetric.totalSetbacks}
            </span>
            <span className="text-[10px] text-slate-400">Failed or unfulfilled days</span>
          </div>

          <div className="p-3.5 rounded-xl bg-obsidian-900 border border-obsidian-750 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Next-Day Recoveries</span>
            </div>
            <span className="text-xl font-mono font-bold text-emerald-400 block">
              {recoveryMetric.recoveredNextDayCount}
            </span>
            <span className="text-[10px] text-slate-400">Restored next scheduled day</span>
          </div>

          <div className="p-3.5 rounded-xl bg-obsidian-900 border border-obsidian-750 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-gold-400" />
              <span>Recovery Rate</span>
            </div>
            <span className="text-xl font-mono font-bold text-gold-300 block">
              {recoveryMetric.nextDayRecoveryRate !== null
                ? `${recoveryMetric.nextDayRecoveryRate}%`
                : '100%'}
            </span>
            <span className="text-[10px] text-slate-400">Speed of return to standard</span>
          </div>
        </div>

        {/* Recurring Misses Habit List */}
        {recoveryMetric.habitsWithRecurringMisses.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-obsidian-750/70">
            <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span>Habits with Friction Observations</span>
            </h4>
            <div className="space-y-1.5">
              {recoveryMetric.habitsWithRecurringMisses.slice(0, 3).map((item) => (
                <div
                  key={item.habitId}
                  className="flex items-center justify-between text-xs p-2 rounded-lg bg-obsidian-900 border border-obsidian-750 text-slate-300"
                >
                  <span className="font-medium">{item.habitTitle}</span>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-amber-400">
                    <span>{item.missCount} missed/failed</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
