import { useState } from 'react';
import {
  Flame,
  CheckCircle2,
  Trophy,
  Activity,
  ArrowRight,
  ShieldAlert,
  BookOpen,
  Check,
  Zap
} from 'lucide-react';
import { MetricCard } from '../../components/ui/metric-card';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { formatFriendlyDate } from '../../core/utils';
import type { RouteId } from '../../app/routes';

interface CommandCenterProps {
  onNavigate: (route: RouteId) => void;
  onOpenQuickAction: () => void;
}

interface PreviewHabitItem {
  id: string;
  title: string;
  category: 'abstinence' | 'craft' | 'body' | 'mind';
  type: 'abstinence' | 'completion' | 'quantitative';
  target?: string;
  currentStreak: number;
  longestStreak: number;
  completedToday: boolean;
  frequency: string;
}

export function CommandCenter({ onNavigate, onOpenQuickAction }: CommandCenterProps) {
  // Demonstration interactive state for M1 Foundation preview
  const [habits, setHabits] = useState<PreviewHabitItem[]>([
    {
      id: 'h1',
      title: 'Digital Purity & Abstinence',
      category: 'abstinence',
      type: 'abstinence',
      currentStreak: 24,
      longestStreak: 45,
      completedToday: true,
      frequency: 'Strict Daily'
    },
    {
      id: 'h2',
      title: 'DSA & Algorithmic Practice',
      category: 'craft',
      type: 'completion',
      currentStreak: 12,
      longestStreak: 28,
      completedToday: true,
      frequency: 'Daily'
    },
    {
      id: 'h3',
      title: 'Physical Conditioning (Run / Calisthenics)',
      category: 'body',
      type: 'quantitative',
      target: '5,000 steps / 45m',
      currentStreak: 8,
      longestStreak: 15,
      completedToday: false,
      frequency: 'Daily'
    },
    {
      id: 'h4',
      title: 'Stoic Reading & Night Reflection',
      category: 'mind',
      type: 'completion',
      currentStreak: 19,
      longestStreak: 19,
      completedToday: false,
      frequency: 'Daily'
    }
  ]);

  const toggleHabit = (id: string) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id === id) {
          const nextState = !h.completedToday;
          return {
            ...h,
            completedToday: nextState,
            currentStreak: nextState ? h.currentStreak + 1 : Math.max(0, h.currentStreak - 1)
          };
        }
        return h;
      })
    );
  };

  const completedCount = habits.filter((h) => h.completedToday).length;
  const completionPercentage = Math.round((completedCount / habits.length) * 100);
  const activeStreakCount = habits.length;

  return (
    <div className="space-y-8">
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-obsidian-900 via-obsidian-850 to-obsidian-900 border border-gold-600/30 p-6 sm:p-8 shadow-obsidian-elevated">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge variant="gold" size="sm" className="font-mono">
                COMMAND CENTER &bull; M1
              </Badge>
              <span className="text-xs text-slate-400 font-mono">
                {formatFriendlyDate(new Date())}
              </span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
              Dignity. Self-respect. Discipline.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed font-sans">
              True strength is not measured by the absence of temptation, but by unwavering adherence to your sovereign standards. Every day clean is victory earned.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('journal')}
              className="gap-2"
            >
              <BookOpen className="w-4 h-4 text-gold-400" />
              <span>Evening Journal</span>
            </Button>
            <Button
              variant="gold-glow"
              size="sm"
              onClick={onOpenQuickAction}
              className="gap-2"
            >
              <Zap className="w-4 h-4 text-obsidian-950 fill-obsidian-950" />
              <span>Log Commitment</span>
            </Button>
          </div>
        </div>

        {/* Preview Badge Notice */}
        <div className="mt-4 pt-4 border-t border-obsidian-750/70 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gold-400/80 animate-pulse" />
            <span>Interactive Foundation Preview — Ready for M2 Habit Engine persistence</span>
          </span>
          <span className="text-[11px] font-mono text-gold-400/80">Dexie IndexedDB Engine Initialized</span>
        </div>
      </div>

      {/* 4-Column High-Level Discipline Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Active Streaks"
          value={activeStreakCount}
          unit="commitments"
          subtext="100% independent tracking"
          icon={<Flame className="w-5 h-5 text-gold-400" />}
          highlight={true}
        />
        <MetricCard
          label="Today's Fulfillment"
          value={`${completedCount}/${habits.length}`}
          unit={`(${completionPercentage}%)`}
          subtext={`${habits.length - completedCount} actions remaining today`}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          trend={{ value: `${completionPercentage}%`, isPositive: completionPercentage >= 50 }}
        />
        <MetricCard
          label="Discipline Score"
          value="94"
          unit="/ 100"
          subtext="Rolling 30-day scheduled consistency"
          icon={<Activity className="w-5 h-5 text-gold-300" />}
          trend={{ value: '+2.4 pts', isPositive: true }}
        />
        <MetricCard
          label="Longest Record"
          value="45"
          unit="days"
          subtext="Preserved permanently across resets"
          icon={<Trophy className="w-5 h-5 text-amber-400" />}
        />
      </div>

      {/* Main Grid: Today's Commitments & Active Streaks Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Today's Commitments Check-in */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-obsidian-700/80 bg-obsidian-850">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span>Today's Discipline Protocol</span>
                  <Badge variant="gold-subtle" size="sm">
                    {completedCount} / {habits.length} Complete
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Uncompromising check-in. Tap any habit to fulfill today's commitment.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('streaks')}
                className="text-xs text-gold-400 hover:text-gold-300"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>

            <CardContent className="space-y-3 pt-2">
              <Progress value={completionPercentage} showLabel={false} size="sm" className="mb-4" />

              {habits.map((habit) => {
                const isAbstinence = habit.type === 'abstinence';
                return (
                  <div
                    key={habit.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 ${
                      habit.completedToday
                        ? 'bg-obsidian-900/60 border-emerald-900/40 text-slate-300'
                        : 'bg-obsidian-800/80 border-obsidian-700/80 hover:border-gold-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <button
                        onClick={() => toggleHabit(habit.id)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          habit.completedToday
                            ? 'bg-emerald-500 text-obsidian-950 font-bold shadow-[0_0_10px_rgba(46,125,78,0.4)]'
                            : 'border border-obsidian-600 hover:border-gold-400 bg-obsidian-850'
                        }`}
                        title={habit.completedToday ? 'Mark as incomplete' : 'Mark as complete'}
                        aria-label={`Toggle completion for ${habit.title}`}
                      >
                        {habit.completedToday && <Check className="w-4 h-4 stroke-[3]" />}
                      </button>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-medium text-sm truncate ${
                              habit.completedToday ? 'line-through text-slate-400' : 'text-slate-100'
                            }`}
                          >
                            {habit.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                          <span className="capitalize">{habit.category}</span>
                          <span>&bull;</span>
                          <span className="font-mono text-gold-400">
                            {habit.currentStreak} day streak
                          </span>
                          {habit.target && (
                            <>
                              <span>&bull;</span>
                              <span className="font-mono text-slate-400">{habit.target}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          isAbstinence
                            ? 'gold-subtle'
                            : habit.type === 'quantitative'
                            ? 'warning'
                            : 'neutral'
                        }
                        size="sm"
                        className="capitalize hidden sm:inline-flex"
                      >
                        {habit.type}
                      </Badge>
                      {habit.completedToday ? (
                        <span className="text-xs text-emerald-400 font-mono font-medium px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40">
                          Secured
                        </span>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => toggleHabit(habit.id)}
                          className="text-xs h-7 px-2.5"
                        >
                          Check In
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Quick Urge Intervention Shortcut */}
          <div className="p-4 rounded-xl bg-obsidian-900/90 border border-amber-900/40 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-950/70 border border-amber-700/50 flex items-center justify-center text-amber-400 flex-shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-100">
                  Experiencing an Urge or Trigger?
                </span>
                <span className="text-xs text-slate-400">
                  Take a 10-minute pause. Log the intensity before making any irreversible move.
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('journal')}
              className="border-amber-600/40 text-amber-300 hover:bg-amber-950/30 flex-shrink-0 text-xs"
            >
              Log Urge
            </Button>
          </div>
        </div>

        {/* Right Column (5 cols): Milestones, Streaks Summary & Reflection Prompt */}
        <div className="lg:col-span-5 space-y-6">
          {/* Upcoming Milestone Preview */}
          <Card className="border-obsidian-700/80 bg-obsidian-850">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-gold-400" />
                  <span>Upcoming Milestones</span>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('milestones')}
                  className="text-xs text-gold-400 hover:text-gold-300"
                >
                  Rewards
                </Button>
              </div>
              <CardDescription>
                Independently configured per streak with custom rewards.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-1">
              {/* Milestone 1 */}
              <div className="p-3 rounded-xl bg-obsidian-800/80 border border-obsidian-700/70 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">
                    Digital Purity — 30 Days Sovereign
                  </span>
                  <Badge variant="gold" size="sm" className="font-mono">
                    6 Days Left
                  </Badge>
                </div>
                <p className="text-xs text-gold-300/90 font-medium">
                  Reward: High-end Leather Bound Journal
                </p>
                <Progress value={80} size="sm" variant="gold" />
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Day 24 of 30</span>
                  <span>80% complete</span>
                </div>
              </div>

              {/* Milestone 2 */}
              <div className="p-3 rounded-xl bg-obsidian-800/80 border border-obsidian-700/70 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">
                    DSA Practice — 14 Days Consistency
                  </span>
                  <Badge variant="gold-subtle" size="sm" className="font-mono">
                    2 Days Left
                  </Badge>
                </div>
                <p className="text-xs text-gold-300/90 font-medium">
                  Reward: Weekend Specialty Coffee & Book
                </p>
                <Progress value={85} size="sm" variant="gold" />
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Day 12 of 14</span>
                  <span>85% complete</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Evening Reflection Prompt Card */}
          <Card className="border-gold-600/30 bg-gradient-to-br from-obsidian-850 to-obsidian-900">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2 text-gold-300">
                  <BookOpen className="w-4 h-4 text-gold-400" />
                  <span>Daily Reflection Prompt</span>
                </CardTitle>
                <Badge variant="gold-subtle" size="sm">
                  Evening
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-1">
              <blockquote className="text-xs italic text-slate-300 border-l-2 border-gold-400/60 pl-3 py-1">
                "Where did you feel resistance today, and how did your dignity respond?"
              </blockquote>
              <p className="text-xs text-slate-400">
                A 3-minute evening review anchors the subconscious mind into discipline before sleep.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('journal')}
                className="w-full text-xs mt-1 border-gold-500/40 text-gold-300"
              >
                Write Today's Entry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
