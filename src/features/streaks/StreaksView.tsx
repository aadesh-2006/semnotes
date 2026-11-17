import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Flame, Plus, ShieldCheck } from 'lucide-react';

interface StreaksViewProps {
  onOpenNewHabit: () => void;
}

export function StreaksView({ onOpenNewHabit }: StreaksViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-100">
              Streak Architect & Engine
            </h2>
            <Badge variant="gold" size="sm">M2 / M3 Domain</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Independently tracked abstinence, completion, and quantitative commitments.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={onOpenNewHabit} className="gap-2">
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Streak Commitment</span>
        </Button>
      </div>

      {/* Strict Engine Policy Card */}
      <Card className="border-gold-600/30 bg-obsidian-850">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-gold-400" />
            <CardTitle className="text-base text-gold-300">Strict Streak Rule Specification</CardTitle>
          </div>
          <CardDescription>
            Engineered for uncompromising truth. In accordance with Section 4 Module 3:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-obsidian-900 border border-obsidian-750 space-y-1">
              <span className="font-semibold text-slate-200 block">1. Total Independence</span>
              <p className="text-slate-400">
                Breaking one streak never resets another streak. Abstinence, DSA, and workouts calculate strictly in isolation.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-obsidian-900 border border-obsidian-750 space-y-1">
              <span className="font-semibold text-slate-200 block">2. Permanent Longest Record</span>
              <p className="text-slate-400">
                A relapse resets current streak to zero, but your historic longest streak and log entries are permanently preserved.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-obsidian-900 border border-obsidian-750 space-y-1">
              <span className="font-semibold text-slate-200 block">3. Deterministic Recalculation</span>
              <p className="text-slate-400">
                Streaks are derived mathematically from audit logs and timezone-aware dates, eliminating desync and phantom numbers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demonstration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Habit Card 1 */}
        <Card className="border-obsidian-700/80 bg-obsidian-850">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-100 text-base">Digital Purity & Abstinence</span>
                <Badge variant="gold-subtle" size="sm">Abstinence</Badge>
              </div>
              <CardDescription className="mt-1">
                Zero pornography, zero indulgence. Clean mind and preserved vital energy.
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gold-950/60 border border-gold-800/50 text-gold-300 font-mono text-sm font-bold">
              <Flame className="w-4 h-4 text-gold-400" />
              <span>24d</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="flex justify-between text-xs text-slate-400 border-t border-obsidian-750 pt-3">
              <span>Longest Streak: <strong className="text-slate-200 font-mono">45 days</strong></span>
              <span>Success Rate: <strong className="text-gold-300 font-mono">96%</strong></span>
              <span>Schedule: <strong className="text-slate-200">Daily</strong></span>
            </div>
          </CardContent>
        </Card>

        {/* Habit Card 2 */}
        <Card className="border-obsidian-700/80 bg-obsidian-850">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-100 text-base">DSA & Algorithmic Practice</span>
                <Badge variant="neutral" size="sm">Completion</Badge>
              </div>
              <CardDescription className="mt-1">
                Solve at least 1 Medium or 2 Easy algorithmic problems every day.
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gold-950/60 border border-gold-800/50 text-gold-300 font-mono text-sm font-bold">
              <Flame className="w-4 h-4 text-gold-400" />
              <span>12d</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="flex justify-between text-xs text-slate-400 border-t border-obsidian-750 pt-3">
              <span>Longest Streak: <strong className="text-slate-200 font-mono">28 days</strong></span>
              <span>Success Rate: <strong className="text-gold-300 font-mono">88%</strong></span>
              <span>Schedule: <strong className="text-slate-200">Daily</strong></span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
