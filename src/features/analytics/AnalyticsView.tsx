import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Activity, TrendingUp, Target } from 'lucide-react';

export function AnalyticsView() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-100">
              Discipline Analytics
            </h2>
            <Badge variant="gold" size="sm">M6 Domain</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Audited consistency, rolling 30-day discipline metrics, and transparent habit analytics.
          </p>
        </div>
      </div>

      {/* Transparent Discipline Score Banner */}
      <Card className="border-gold-600/40 bg-gradient-to-r from-obsidian-900 via-obsidian-850 to-obsidian-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-gold-400" />
              <CardTitle className="text-base text-gold-300">
                Transparent 30-Day Discipline Score: 94 / 100
              </CardTitle>
            </div>
            <Badge variant="gold" size="sm">Algorithmic Adherence</Badge>
          </div>
          <CardDescription>
            Calculated as: (Scheduled commitments fulfilled in last 30 days / Total scheduled commitments in last 30 days) × 100.
            No inflated vanity metrics or artificial multipliers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-3.5 rounded-xl bg-obsidian-800/80 border border-obsidian-750">
              <span className="text-xs text-slate-400 block">Rolling Window</span>
              <span className="text-lg font-bold font-mono text-slate-100 mt-1 block">30 Days</span>
              <span className="text-[11px] text-slate-400">114 of 120 completed</span>
            </div>
            <div className="p-3.5 rounded-xl bg-obsidian-800/80 border border-obsidian-750">
              <span className="text-xs text-slate-400 block">Relapse Impact</span>
              <span className="text-lg font-bold font-mono text-amber-400 mt-1 block">-3.3% per missed day</span>
              <span className="text-[11px] text-slate-400">Linear recovery rate</span>
            </div>
            <div className="p-3.5 rounded-xl bg-obsidian-800/80 border border-obsidian-750">
              <span className="text-xs text-slate-400 block">Adherence Grade</span>
              <span className="text-lg font-bold font-mono text-emerald-400 mt-1 block">Sovereign Tier</span>
              <span className="text-[11px] text-slate-400">Top 5% consistency bracket</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Habit Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-obsidian-700/80 bg-obsidian-850">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-gold-400" />
              <span>Habit Completion Variance</span>
            </CardTitle>
            <CardDescription>Performance by tracking category</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: 'Abstinence & Digital Purity', rate: 98, color: 'bg-gold-400' },
              { name: 'DSA & Algorithmic Practice', rate: 92, color: 'bg-emerald-400' },
              { name: 'Physical Conditioning (Run / Calisthenics)', rate: 86, color: 'bg-sky-400' },
              { name: 'Stoic Reading & Night Reflection', rate: 95, color: 'bg-indigo-400' },
            ].map((item) => (
              <div key={item.name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">{item.name}</span>
                  <span className="font-mono text-gold-300 font-semibold">{item.rate}%</span>
                </div>
                <div className="h-2 w-full bg-obsidian-900 rounded-full overflow-hidden border border-obsidian-750">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.rate}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-obsidian-700/80 bg-obsidian-850">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gold-400" />
              <span>Recharts Integration Architecture</span>
            </CardTitle>
            <CardDescription>
              Configured for M6 visualization engine
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-300">
            <p>
              Recharts 2.x is bundled and ready. In Milestone 6, this panel will render interactive multi-line trend charts comparing:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Urge frequency vs sleep hours</li>
              <li>Weekday vs weekend adherence drop-off</li>
              <li>Rolling 7-day vs 30-day discipline velocity</li>
            </ul>
            <div className="p-3 rounded-lg bg-obsidian-900 border border-obsidian-750 text-gold-300/80 font-mono text-[11px]">
              Ready for M6 Chart Components & Recharts pipeline
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
