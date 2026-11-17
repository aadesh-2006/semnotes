import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import type { ConsistencyInsight } from '../../core/analytics/analyticsTypes';
import { Lightbulb, CheckCircle2, AlertTriangle, ArrowUpRight, ArrowDownRight, Anchor } from 'lucide-react';

interface ConsistencyInsightsProps {
  insights: ConsistencyInsight[];
}

export const ConsistencyInsights: React.FC<ConsistencyInsightsProps> = ({ insights }) => {
  const getIcon = (type: ConsistencyInsight['type']) => {
    switch (type) {
      case 'strongest_day':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'weakest_day':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'top_habit':
        return <Anchor className="w-4 h-4 text-gold-400" />;
      case 'improving_habit':
        return <ArrowUpRight className="w-4 h-4 text-emerald-400" />;
      case 'declining_habit':
        return <ArrowDownRight className="w-4 h-4 text-rose-400" />;
      default:
        return <Lightbulb className="w-4 h-4 text-gold-400" />;
    }
  };

  return (
    <Card className="border-obsidian-750 bg-obsidian-850 shadow-md">
      <CardHeader className="pb-3 border-b border-obsidian-750/70">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-slate-100">
            <Lightbulb className="w-4 h-4 text-gold-400" />
            <span>Consistency Insights & Patterns</span>
          </CardTitle>
          <span className="text-[10px] text-slate-400 font-mono">
            Empirical Adherence Auditing
          </span>
        </div>
        <CardDescription className="text-xs text-slate-400">
          Transparent, sample-size bounded observations derived strictly from verified logs.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4 space-y-3">
        {insights.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Awaiting additional verified commitment history (&ge; 5 evaluations per category) to derive patterns.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((ins) => (
              <div
                key={ins.id}
                className={`p-3.5 rounded-xl border space-y-1.5 transition-colors ${
                  ins.isPositive
                    ? 'bg-obsidian-900/90 border-obsidian-750/90 hover:border-gold-500/40'
                    : 'bg-obsidian-900/90 border-amber-900/30 hover:border-amber-700/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getIcon(ins.type)}
                    <h4 className="text-xs font-semibold text-slate-200">{ins.title}</h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-gold-300">
                    {ins.metricValue}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {ins.description}
                </p>

                <div className="text-[10px] text-slate-400 font-mono pt-1">
                  Sample size: {ins.sampleSize} evaluated commitments
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
