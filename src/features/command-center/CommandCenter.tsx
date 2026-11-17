import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../storage/db';
import { type Habit, type HabitLog, type AuditRecord } from '../../core/domain/types';
import type { HabitStreakResult } from '../../core/streak/streakTypes';
import { HabitLogService } from '../../core/services/habitLogService';
import { StreakCalculator } from '../../core/streak/streakCalculator';
import { StreakEngine } from '../../core/streak/streakEngine';
import { isScheduledDay } from '../../core/services/scheduleService';
import { formatCalendarDate, formatFriendlyDate } from '../../core/utils';
import { MetricCard } from '../../components/ui/metric-card';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { CheckInModal } from '../../components/modals/CheckInModal';
import { HabitFormModal } from '../../components/modals/HabitFormModal';
import type { RouteId } from '../../app/routes';
import {
  Flame,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  BookOpen,
  Check,
  Plus,
  Shield,
  Clock,
  Trophy
} from 'lucide-react';

interface CommandCenterProps {
  onNavigate: (route: RouteId) => void;
  onOpenQuickAction: () => void;
}

export function CommandCenter({ onNavigate, onOpenQuickAction }: CommandCenterProps) {
  const todayStr = formatCalendarDate(new Date());

  // Reactive Dexie Live Queries
  const habits = useLiveQuery(() => db.habits.where('status').equals('active').toArray(), []);
  const allLogs = useLiveQuery(() => db.habitLogs.toArray(), []);
  const allAudits = useLiveQuery(() => db.auditRecords.toArray(), []);

  // Check-in modal state
  const [checkInHabit, setCheckInHabit] = useState<Habit | null>(null);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Compute live streaks for all habits
  const streakMap = useMemo(() => {
    if (!habits || !allLogs) return new Map<string, HabitStreakResult>();

    const logsByHabit = new Map<string, HabitLog[]>();
    for (const log of allLogs) {
      if (!logsByHabit.has(log.habitId)) {
        logsByHabit.set(log.habitId, []);
      }
      logsByHabit.get(log.habitId)!.push(log);
    }

    const auditsByHabit = new Map<string, AuditRecord[]>();
    if (allAudits) {
      for (const audit of allAudits) {
        if (!auditsByHabit.has(audit.habitId)) {
          auditsByHabit.set(audit.habitId, []);
        }
        auditsByHabit.get(audit.habitId)!.push(audit);
      }
    }

    const map = new Map<string, HabitStreakResult>();
    for (const habit of habits) {
      const hLogs = logsByHabit.get(habit.id) || [];
      const hAudits = auditsByHabit.get(habit.id) || [];
      const pausedRanges = StreakEngine.extractPausedRanges(hAudits, habit);
      map.set(
        habit.id,
        StreakCalculator.calculateStreak(habit, hLogs, {
          evaluationDate: todayStr,
          pausedRanges
        })
      );
    }
    return map;
  }, [habits, allLogs, allAudits, todayStr]);

  // Today log lookup map
  const todayLogMap = useMemo(() => {
    const map = new Map<string, HabitLog>();
    if (allLogs) {
      for (const log of allLogs) {
        if (log.date === todayStr) {
          map.set(log.habitId, log);
        }
      }
    }
    return map;
  }, [allLogs, todayStr]);

  // Derive metrics purely from actual database data
  const totalActiveCount = habits?.length || 0;

  const scheduledTodayHabits = (habits || []).filter((h) =>
    isScheduledDay(h.schedule, todayStr, h.startDate, h.endDate)
  );

  const completedTodayCount = scheduledTodayHabits.filter((h) => {
    const log = todayLogMap.get(h.id);
    return log?.status === 'completed';
  }).length;

  const pendingTodayCount = scheduledTodayHabits.filter((h) => {
    const log = todayLogMap.get(h.id);
    return !log;
  }).length;

  const failedTodayCount = scheduledTodayHabits.filter((h) => {
    const log = todayLogMap.get(h.id);
    return log?.status === 'failed' || log?.status === 'missed';
  }).length;

  const completionPercentage =
    scheduledTodayHabits.length > 0
      ? Math.round((completedTodayCount / scheduledTodayHabits.length) * 100)
      : 0;

  // Real streak counts derived from StreakCalculator
  let activeStreaksCount = 0;
  let allTimeLongestStreak = 0;

  for (const [, streak] of streakMap) {
    if (streak.currentStreak > 0) {
      activeStreaksCount++;
    }
    if (streak.longestStreak > allTimeLongestStreak) {
      allTimeLongestStreak = streak.longestStreak;
    }
  }

  const handleOpenCheckIn = (habit: Habit) => {
    setCheckInHabit(habit);
    setIsCheckInOpen(true);
  };

  const handleQuickToggle = async (habit: Habit) => {
    const existingLog = todayLogMap.get(habit.id);
    if (existingLog) {
      // Open modal to view/correct
      handleOpenCheckIn(habit);
    } else {
      // One-click default completion for binary or abstinence
      if (habit.type === 'quantitative') {
        handleOpenCheckIn(habit);
      } else {
        await HabitLogService.recordCheckIn(habit, todayStr, { status: 'completed' });
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Motto Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-obsidian-900 via-obsidian-850 to-obsidian-900 border border-gold-600/30 p-6 sm:p-8 shadow-obsidian-elevated">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge variant="gold" size="sm" className="font-mono">
                COMMAND CENTER &bull; M3
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
              onClick={onOpenQuickAction}
              className="gap-2"
            >
              <BookOpen className="w-4 h-4 text-gold-400" />
              <span>Quick Action</span>
            </Button>
            <Button
              variant="gold-glow"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="gap-2 font-semibold text-obsidian-950"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Architect Habit</span>
            </Button>
          </div>
        </div>

        {/* Database Real-Time Status */}
        <div className="mt-4 pt-4 border-t border-obsidian-750/70 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300">
              Strict Streak Engine: <strong>{activeStreaksCount} Active Streaks</strong>
            </span>
          </span>
          <span className="text-[11px] font-mono text-gold-400">
            {completedTodayCount} of {scheduledTodayHabits.length} Today Fulfillments
          </span>
        </div>
      </div>

      {/* 4-Column Real Metrics Cards (Zero Mock Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Active Streaks"
          value={activeStreaksCount}
          unit={`/ ${totalActiveCount} habits`}
          subtext="Independently maintained unbroken"
          icon={<Flame className="w-5 h-5 text-gold-400" />}
          highlight={true}
        />
        <MetricCard
          label="Today's Fulfillment"
          value={`${completedTodayCount}/${scheduledTodayHabits.length}`}
          unit={`(${completionPercentage}%)`}
          subtext={`${pendingTodayCount} pending check-in`}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          trend={{ value: `${completionPercentage}%`, isPositive: completionPercentage >= 50 }}
        />
        <MetricCard
          label="All-Time Longest"
          value={allTimeLongestStreak}
          unit="days"
          subtext="Preserved permanently across resets"
          icon={<Trophy className="w-5 h-5 text-amber-400" />}
        />
        <MetricCard
          label="Pending Today"
          value={pendingTodayCount}
          unit="commitments"
          subtext={failedTodayCount > 0 ? `${failedTodayCount} setbacks logged` : 'Zero setbacks logged today'}
          icon={<Clock className="w-5 h-5 text-slate-400" />}
        />
      </div>

      {/* Main Grid: Today's Protocol Checklist & Side Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Today's Active Habits Protocol */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-obsidian-750 bg-obsidian-850">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span>Today's Discipline Protocol</span>
                  {scheduledTodayHabits.length > 0 && (
                    <Badge variant="gold-subtle" size="sm">
                      {completedTodayCount} / {scheduledTodayHabits.length} Complete
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Uncompromising check-in for commitments scheduled for {formatFriendlyDate(todayStr)}.
                </CardDescription>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('streaks')}
                className="text-xs text-gold-400 hover:text-gold-300"
              >
                <span>Manage Streaks</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>

            <CardContent className="space-y-3 pt-2">
              {scheduledTodayHabits.length > 0 && (
                <Progress value={completionPercentage} showLabel={false} size="sm" className="mb-4" />
              )}

              {/* Empty state when no habits exist */}
              {totalActiveCount === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-obsidian-700 bg-obsidian-900/40 space-y-3">
                  <Shield className="w-8 h-8 text-gold-400 mx-auto" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-slate-200">
                      No Active Commitments Found
                    </h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      Begin by architecting your first abstinence, completion, or quantitative habit.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="gap-1.5"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Architect First Habit</span>
                  </Button>
                </div>
              ) : scheduledTodayHabits.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-obsidian-900/40 border border-obsidian-750 text-slate-400 text-xs">
                  All active habits are excused on this weekday according to your custom schedules.
                </div>
              ) : (
                scheduledTodayHabits.map((habit) => {
                  const log = todayLogMap.get(habit.id);
                  const isCompleted = log?.status === 'completed';
                  const isFailed = log?.status === 'failed' || log?.status === 'missed';
                  const isAbstinence = habit.type === 'abstinence';
                  const streak = streakMap.get(habit.id);
                  const currentStreak = streak?.currentStreak ?? 0;

                  return (
                    <div
                      key={habit.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 ${
                        isCompleted
                          ? 'bg-obsidian-900/60 border-emerald-900/40 text-slate-300'
                          : isFailed
                          ? 'bg-red-950/20 border-red-900/40 text-red-200'
                          : 'bg-obsidian-800/80 border-obsidian-700/80 hover:border-gold-500/40'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <button
                          onClick={() => handleQuickToggle(habit)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                            isCompleted
                              ? 'bg-emerald-500 text-obsidian-950 font-bold shadow-[0_0_10px_rgba(46,125,78,0.4)]'
                              : isFailed
                              ? 'bg-red-500 text-obsidian-950 font-bold'
                              : 'border border-obsidian-600 hover:border-gold-400 bg-obsidian-850'
                          }`}
                          title={isCompleted ? 'Completed (Click to view log)' : 'Check In'}
                          aria-label={`Toggle check-in for ${habit.title}`}
                        >
                          {isCompleted && <Check className="w-4 h-4 stroke-[3]" />}
                          {isFailed && <span className="font-bold text-xs">✕</span>}
                        </button>

                        <div className="flex flex-col min-w-0">
                          <span
                            className={`font-medium text-sm truncate ${
                              isCompleted ? 'line-through text-slate-400' : 'text-slate-100'
                            }`}
                          >
                            {habit.title}
                          </span>

                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                            <span className="capitalize">{habit.category}</span>
                            <span>&bull;</span>
                            <span className="font-mono text-gold-400 font-semibold flex items-center gap-1">
                              <Flame className="w-3 h-3 text-gold-400" />
                              {currentStreak}d streak
                            </span>
                            {habit.targetValue && (
                              <>
                                <span>&bull;</span>
                                <span className="font-mono text-slate-400">
                                  {habit.targetConstraint === 'at_most' ? '≤' : '≥'} {habit.targetValue} {habit.unit}
                                </span>
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

                        {isCompleted ? (
                          <button
                            onClick={() => handleOpenCheckIn(habit)}
                            className="text-xs text-emerald-400 font-mono font-medium px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40 hover:brightness-110"
                            title="Click to view or edit log"
                          >
                            {isAbstinence ? 'Maintained ✓' : 'Completed ✓'}
                          </button>
                        ) : isFailed ? (
                          <button
                            onClick={() => handleOpenCheckIn(habit)}
                            className="text-xs text-red-400 font-mono font-medium px-2 py-0.5 rounded bg-red-950/60 border border-red-800/40 hover:brightness-110"
                            title="Click to view or edit log"
                          >
                            {isAbstinence ? 'Setback ✕' : 'Missed ✕'}
                          </button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenCheckIn(habit)}
                            className="text-xs h-7 px-2.5"
                          >
                            Check In
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
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

        {/* Right Column (5 cols): Milestones Info & Evening Reflection */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Commitments Summary */}
          <Card className="border-obsidian-750 bg-obsidian-850">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Flame className="w-4 h-4 text-gold-400" />
                  <span>Independent Streaks</span>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('streaks')}
                  className="text-xs text-gold-400 hover:text-gold-300"
                >
                  View All
                </Button>
              </div>
              <CardDescription>
                Independently managed habits operating in complete isolation.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 pt-1">
              {(habits || []).slice(0, 3).map((h) => {
                const streak = streakMap.get(h.id);
                const current = streak?.currentStreak ?? 0;
                const longest = streak?.longestStreak ?? 0;

                return (
                  <div
                    key={h.id}
                    onClick={() => onNavigate('streaks')}
                    className="p-3 rounded-xl bg-obsidian-800/80 border border-obsidian-750 hover:border-gold-500/40 cursor-pointer transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200 truncate">{h.title}</span>
                      <div className="flex items-center gap-1 font-mono text-gold-300 font-bold">
                        <Flame className="w-3.5 h-3.5 text-gold-400" />
                        <span>{current}d streak</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Category: {h.category}</span>
                      <span className="text-slate-300">All-time record: {longest}d</span>
                    </div>
                  </div>
                );
              })}

              {totalActiveCount > 3 && (
                <p className="text-[11px] text-slate-500 text-center pt-1 font-mono">
                  + {totalActiveCount - 3} more habits active
                </p>
              )}
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

      {/* Modals */}
      <CheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        habit={checkInHabit}
        existingLog={checkInHabit ? todayLogMap.get(checkInHabit.id) || null : null}
        onSuccess={() => {}}
      />

      <HabitFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}
