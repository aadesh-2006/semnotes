import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import type { DisciplineScoreResult, AdherenceGrade } from '../../core/analytics/analyticsTypes';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  PauseCircle,
  Info
} from 'lucide-react';

interface DisciplineScoreCardProps {
  scoreResult: DisciplineScoreResult;
}

export const DisciplineScoreCard: React.FC<DisciplineScoreCardProps> = ({ scoreResult }) => {
  const getGradeDetails = (grade: AdherenceGrade) => {
    switch (grade) {
      case 'sovereign':
        return {
          label: 'Sovereign Tier',
          color: 'text-gold-300',
          bg: 'bg-gold-500/15 border-gold-500/40',
          badgeVariant: 'gold' as const,
          description: 'Top-tier consistency. Commitments maintained with exceptional dignity.'
        };
      case 'disciplined':
        return {
          label: 'Disciplined Tier',
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/15 border-emerald-500/40',
          badgeVariant: 'success' as const,
          description: 'Strong commitment adherence. Friction is regularly overcome.'
        };
      case 'stable':
        return {
          label: 'Stable Tier',
          color: 'text-amber-400',
          bg: 'bg-amber-500/15 border-amber-500/40',
          badgeVariant: 'warning' as const,
          description: 'Moderate adherence. Potential drop-off during fatigue or weekends.'
        };
      case 'vulnerable':
        return {
          label: 'Vulnerable Tier',
          color: 'text-rose-400',
          bg: 'bg-rose-500/15 border-rose-500/40',
          badgeVariant: 'danger' as const,
          description: 'High friction. Frequent missed commitments warrant schedule adjustment.'
        };
      case 'insufficient_data':
      default:
        return {
          label: 'Insufficient Data',
          color: 'text-slate-400',
          bg: 'bg-obsidian-800 border-obsidian-750',
          badgeVariant: 'outline' as const,
          description: 'Awaiting scheduled commitments within the rolling 30-day window.'
        };
    }
  };

  const gradeInfo = getGradeDetails(scoreResult.adherenceGrade);

  return (
    <Card className="border-gold-500/30 bg-gradient-to-br from-obsidian-900 via-obsidian-850 to-obsidian-900 shadow-xl overflow-hidden relative">
      {/* Background ambient glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />

      <CardHeader className="pb-3 border-b border-obsidian-750/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gold-950/70 border border-gold-700/50 flex items-center justify-center text-gold-400 shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                <span>Rolling 30-Day Discipline Score</span>
                <Badge variant={gradeInfo.badgeVariant} size="sm">
                  {gradeInfo.label}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Audited adherence window: <span className="font-mono text-slate-300">{scoreResult.windowStartDate}</span> to{' '}
                <span className="font-mono text-slate-300">{scoreResult.windowEndDate}</span>
              </CardDescription>
            </div>
          </div>

          {scoreResult.hasSufficientData && scoreResult.scoreDelta !== null && (
            <div className="flex items-center gap-2 bg-obsidian-900 border border-obsidian-750 px-3 py-1.5 rounded-lg text-xs">
              <span className="text-slate-400">vs Previous 30d:</span>
              <div
                className={`flex items-center gap-1 font-mono font-bold ${
                  scoreResult.scoreDelta > 0
                    ? 'text-emerald-400'
                    : scoreResult.scoreDelta < 0
                    ? 'text-rose-400'
                    : 'text-slate-300'
                }`}
              >
                {scoreResult.scoreDelta > 0 ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : scoreResult.scoreDelta < 0 ? (
                  <TrendingDown className="w-3.5 h-3.5" />
                ) : (
                  <Minus className="w-3.5 h-3.5" />
                )}
                <span>
                  {scoreResult.scoreDelta > 0 ? `+${scoreResult.scoreDelta}%` : `${scoreResult.scoreDelta}%`}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Score & Visual Gauge Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-5 flex items-center gap-5">
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-slate-100">
                  {scoreResult.score !== null ? scoreResult.score : '—'}
                </span>
                <span className="text-lg font-mono text-slate-400 font-bold">/ 100</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1">
                {scoreResult.hasSufficientData
                  ? `${scoreResult.totalCompleted} of ${scoreResult.totalEvaluated} commitments fulfilled`
                  : 'No scheduled commitments evaluated yet'}
              </span>
            </div>
          </div>

          <div className="md:col-span-7 p-3 rounded-xl bg-obsidian-900/90 border border-obsidian-750/70 text-xs text-slate-300 leading-relaxed">
            <p className="font-medium text-slate-200 mb-1">{gradeInfo.description}</p>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
              <Info className="w-3 h-3 text-gold-400 shrink-0" />
              <span>
                Exact formula: <code className="text-gold-300 font-mono">(Completed / Evaluated) &times; 100</code>. Rest and paused days are excluded from the denominator.
              </span>
            </div>
          </div>
        </div>

        {/* Commitment Counts Breakdown Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2">
          <div className="p-2.5 rounded-lg bg-obsidian-900 border border-obsidian-750 space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wider">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Completed</span>
            </div>
            <span className="text-base font-mono font-bold text-emerald-400 block">
              {scoreResult.totalCompleted}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-obsidian-900 border border-obsidian-750 space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wider">
              <XCircle className="w-3 h-3 text-rose-400" />
              <span>Failed</span>
            </div>
            <span className="text-base font-mono font-bold text-rose-400 block">
              {scoreResult.totalFailed}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-obsidian-900 border border-obsidian-750 space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wider">
              <AlertCircle className="w-3 h-3 text-amber-400" />
              <span>Missed</span>
            </div>
            <span className="text-base font-mono font-bold text-amber-400 block">
              {scoreResult.totalMissed}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-obsidian-900 border border-obsidian-750 space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wider">
              <Activity className="w-3 h-3 text-gold-400" />
              <span>Evaluated</span>
            </div>
            <span className="text-base font-mono font-bold text-slate-100 block">
              {scoreResult.totalEvaluated}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-obsidian-900 border border-obsidian-750 space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wider">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Pending</span>
            </div>
            <span className="text-base font-mono font-bold text-slate-400 block">
              {scoreResult.totalPending}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-obsidian-900 border border-obsidian-750 space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wider">
              <PauseCircle className="w-3 h-3 text-slate-400" />
              <span>Excluded</span>
            </div>
            <span className="text-base font-mono font-bold text-slate-400 block">
              {scoreResult.totalPaused + scoreResult.totalUnscheduled}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
