import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import type {
  DailyAdherencePoint,
  WeeklyAdherencePoint,
  MonthlyAdherencePoint
} from '../../core/analytics/analyticsTypes';
import { TrendingUp, BarChart3 } from 'lucide-react';

interface DisciplineTrendChartProps {
  dailyPoints: DailyAdherencePoint[];
  weeklyPoints: WeeklyAdherencePoint[];
  monthlyPoints: MonthlyAdherencePoint[];
}

export const DisciplineTrendChart: React.FC<DisciplineTrendChartProps> = ({
  dailyPoints,
  weeklyPoints,
  monthlyPoints
}) => {
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Format data for chart
  const chartData = React.useMemo(() => {
    if (granularity === 'weekly') {
      return weeklyPoints.map((p) => ({
        label: p.weekLabel,
        adherence: p.completionPercentage,
        completed: p.completedCount,
        evaluated: p.evaluatedCount
      }));
    }
    if (granularity === 'monthly') {
      return monthlyPoints.map((p) => ({
        label: p.monthLabel,
        adherence: p.completionPercentage,
        completed: p.completedCount,
        evaluated: p.evaluatedCount
      }));
    }
    return dailyPoints.map((p) => ({
      label: p.displayDate,
      date: p.date,
      adherence: p.completionPercentage,
      rolling30: p.rolling30Score,
      completed: p.completedCount,
      evaluated: p.evaluatedCount
    }));
  }, [granularity, dailyPoints, weeklyPoints, monthlyPoints]);

  const hasData = chartData.some((d) => d.evaluated > 0);

  // Custom Obsidian & Gold Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-obsidian-900 border border-obsidian-700/80 p-3 rounded-lg shadow-xl text-xs space-y-1.5 z-50">
          <p className="font-semibold text-slate-200 border-b border-obsidian-750 pb-1">{label}</p>
          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex items-center justify-between gap-4 text-gold-300">
              <span>Adherence:</span>
              <span className="font-bold">
                {data.adherence !== null ? `${data.adherence}%` : 'No commitments'}
              </span>
            </div>
            {data.rolling30 !== undefined && (
              <div className="flex items-center justify-between gap-4 text-amber-400">
                <span>Rolling 30d Score:</span>
                <span className="font-bold">
                  {data.rolling30 !== null ? `${data.rolling30}%` : '—'}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between gap-4 text-slate-400 pt-1 border-t border-obsidian-750">
              <span>Fulfillment:</span>
              <span>{data.completed} / {data.evaluated} completed</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-obsidian-750 bg-obsidian-850 shadow-md">
      <CardHeader className="pb-3 border-b border-obsidian-750/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gold-400" />
            <CardTitle className="text-base text-slate-100">Discipline Adherence Trend</CardTitle>
          </div>

          {/* Granularity Switcher */}
          <div className="flex items-center bg-obsidian-900 border border-obsidian-750 rounded-lg p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setGranularity('daily')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                granularity === 'daily'
                  ? 'bg-obsidian-800 text-gold-300 border border-gold-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setGranularity('weekly')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                granularity === 'weekly'
                  ? 'bg-obsidian-800 text-gold-300 border border-gold-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setGranularity('monthly')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                granularity === 'monthly'
                  ? 'bg-obsidian-800 text-gold-300 border border-gold-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>
        <CardDescription className="text-xs text-slate-400">
          Historical consistency curve over time. Gold area reflects adherence percentage per period.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        {!hasData ? (
          <div className="py-16 text-center space-y-2">
            <BarChart3 className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
            <p className="text-xs text-slate-400">
              Insufficient adherence data in selected period to render trend curves.
            </p>
          </div>
        ) : (
          <div className="w-full h-72 sm:h-80 select-none">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d4af37" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#d4af37" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262833" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#6b7280"
                  fontSize={11}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={11}
                  domain={[0, 100]}
                  tickLine={false}
                  ticks={[0, 25, 50, 75, 100]}
                  unit="%"
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="adherence"
                  stroke="#d4af37"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#goldGradient)"
                  connectNulls
                  name="Adherence %"
                />
                {granularity === 'daily' && (
                  <Line
                    type="monotone"
                    dataKey="rolling30"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    dot={false}
                    strokeDasharray="4 4"
                    connectNulls
                    name="Rolling 30d Score"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-obsidian-750/70">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gold-400 inline-block" />
              <span>Period Adherence %</span>
            </span>
            {granularity === 'daily' && (
              <span className="flex items-center gap-1.5">
                <span className="w-3 border-t border-dashed border-amber-400 inline-block" />
                <span>Rolling 30d Score</span>
              </span>
            )}
          </div>
          <span className="font-mono">Obsidian & Gold Engine</span>
        </div>
      </CardContent>
    </Card>
  );
};
