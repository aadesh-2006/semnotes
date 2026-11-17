import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import type { DailyAdherencePoint } from '../../core/analytics/analyticsTypes';
import { BarChart3 } from 'lucide-react';

interface CompletedVsMissedChartProps {
  dailyPoints: DailyAdherencePoint[];
}

export const CompletedVsMissedChart: React.FC<CompletedVsMissedChartProps> = ({ dailyPoints }) => {
  // Aggregate daily points into 7-day buckets if date count > 14 for clean readability
  const data = React.useMemo(() => {
    if (dailyPoints.length <= 14) {
      return dailyPoints.map((p) => ({
        label: p.displayDate,
        Completed: p.completedCount,
        Missed: p.failedCount + p.missedCount
      }));
    }

    // Chunk into 7-day groups
    const chunks: { label: string; Completed: number; Missed: number }[] = [];
    const chunkSize = Math.ceil(dailyPoints.length / 8);

    for (let i = 0; i < dailyPoints.length; i += chunkSize) {
      const slice = dailyPoints.slice(i, i + chunkSize);
      let comp = 0;
      let missed = 0;
      for (const p of slice) {
        comp += p.completedCount;
        missed += p.failedCount + p.missedCount;
      }
      const startLbl = slice[0].displayDate;
      const endLbl = slice[slice.length - 1].displayDate;
      chunks.push({
        label: startLbl === endLbl ? startLbl : `${startLbl}-${endLbl}`,
        Completed: comp,
        Missed: missed
      });
    }

    return chunks;
  }, [dailyPoints]);

  const hasData = data.some((d) => d.Completed > 0 || d.Missed > 0);

  return (
    <Card className="border-obsidian-750 bg-obsidian-850 shadow-md">
      <CardHeader className="pb-3 border-b border-obsidian-750/70">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-slate-100">
            <BarChart3 className="w-4 h-4 text-gold-400" />
            <span>Completed vs Missed Commitments</span>
          </CardTitle>
          <span className="text-[10px] text-slate-400 font-mono">Commitment Volume</span>
        </div>
        <CardDescription className="text-xs text-slate-400">
          Comparison of fulfilled commitments versus missed scheduled days.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        {!hasData ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No commitment activity recorded for this period.
          </div>
        ) : (
          <div className="w-full h-64 sm:h-72 select-none">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262833" vertical={false} />
                <XAxis dataKey="label" stroke="#6b7280" fontSize={11} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#12141a',
                    borderColor: '#2d313e',
                    borderRadius: '0.5rem',
                    fontSize: '11px',
                    color: '#f1f5f9'
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  iconSize={8}
                />
                <Bar dataKey="Completed" fill="#d4af37" radius={[4, 4, 0, 0]} maxBarSize={32} animationDuration={300} />
                <Bar dataKey="Missed" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={32} animationDuration={300} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
