import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import type { CategoryPerformanceMetric } from '../../core/analytics/analyticsTypes';
import { Layers, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CategoryPerformancePanelProps {
  categoryMetrics: CategoryPerformanceMetric[];
}

export const CategoryPerformancePanel: React.FC<CategoryPerformancePanelProps> = ({
  categoryMetrics
}) => {
  return (
    <Card className="border-obsidian-750 bg-obsidian-850 shadow-md">
      <CardHeader className="pb-3 border-b border-obsidian-750/70">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-slate-100">
            <Layers className="w-4 h-4 text-gold-400" />
            <span>Category Adherence</span>
          </CardTitle>
          <span className="text-[10px] text-slate-400 font-mono">
            {categoryMetrics.length} Categories Active
          </span>
        </div>
        <CardDescription className="text-xs text-slate-400">
          Aggregated commitment fulfillment by discipline domain.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4 space-y-3">
        {categoryMetrics.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No category commitments recorded for this period.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categoryMetrics.map((cat) => {
              const rate = cat.completionPercentage;
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
                  key={cat.category}
                  className="p-3.5 rounded-xl bg-obsidian-900 border border-obsidian-750 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                        {cat.category}
                      </h4>
                      <span className="text-[10px] text-slate-400 block">
                        {cat.totalHabits} {cat.totalHabits === 1 ? 'habit' : 'habits'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-base font-bold text-slate-100">
                        {rate !== null ? `${rate}%` : '—'}
                      </span>
                      {cat.percentageDelta !== null && (
                        <div
                          className={`flex items-center justify-end gap-0.5 text-[10px] font-mono font-bold ${
                            cat.percentageDelta > 0
                              ? 'text-emerald-400'
                              : cat.percentageDelta < 0
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {cat.percentageDelta > 0 ? (
                            <TrendingUp className="w-2.5 h-2.5" />
                          ) : cat.percentageDelta < 0 ? (
                            <TrendingDown className="w-2.5 h-2.5" />
                          ) : (
                            <Minus className="w-2.5 h-2.5" />
                          )}
                          <span>
                            {cat.percentageDelta > 0 ? `+${cat.percentageDelta}%` : `${cat.percentageDelta}%`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{cat.totalCompleted} / {cat.totalEvaluated} fulfilled</span>
                      {cat.totalFailedOrMissed > 0 && (
                        <span className="text-rose-400">{cat.totalFailedOrMissed} missed</span>
                      )}
                    </div>
                    <div className="w-full h-1.5 bg-obsidian-950 rounded-full overflow-hidden border border-obsidian-750">
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
