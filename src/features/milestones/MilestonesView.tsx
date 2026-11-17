import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../storage/db';
import { type Habit, type Milestone, type Achievement } from '../../core/domain/types';
import { MilestoneService } from '../../core/milestones/milestoneService';
import { AchievementEngine } from '../../core/milestones/achievementEngine';
import { StreakEngine } from '../../core/streak/streakEngine';
import { StreakCalculator } from '../../core/streak/streakCalculator';
import { formatCalendarDate, formatFriendlyDate } from '../../core/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { MilestoneFormModal } from '../../components/modals/MilestoneFormModal';
import { ClaimRewardModal } from '../../components/modals/ClaimRewardModal';
import {
  Trophy,
  Gift,
  Plus,
  CheckCircle2,
  Sparkles,
  Trash2,
  Edit,
  Quote
} from 'lucide-react';

export function MilestonesView() {
  const todayStr = formatCalendarDate(new Date());

  const [activeTab, setActiveTab] = useState<'unclaimed' | 'upcoming' | 'history'>('unclaimed');
  const [selectedHabitFilter, setSelectedHabitFilter] = useState<string>('all');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [selectedHabitForForm, setSelectedHabitForForm] = useState<string>('');

  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [selectedAchievementToClaim, setSelectedAchievementToClaim] = useState<Achievement | null>(null);

  // Live queries
  const habits = useLiveQuery(() => db.habits.toArray(), []);
  const allMilestones = useLiveQuery(() => db.milestones.toArray(), []);
  const allAchievements = useLiveQuery(() => db.achievements.toArray(), []);
  const allLogs = useLiveQuery(() => db.habitLogs.toArray(), []);
  const allAudits = useLiveQuery(() => db.auditRecords.toArray(), []);

  // Run evaluation on mount and when habits change
  useEffect(() => {
    AchievementEngine.evaluateAllActiveHabits().catch(() => {});
  }, [habits?.length]);

  // Habit lookup map
  const habitMap = useMemo(() => {
    const map = new Map<string, Habit>();
    if (habits) {
      for (const h of habits) {
        map.set(h.id, h);
      }
    }
    return map;
  }, [habits]);

  // Live streaks calculation
  const streakMap = useMemo(() => {
    if (!habits || !allLogs) return new Map<string, number>();
    const logsByHabit = new Map<string, typeof allLogs>();
    for (const log of allLogs) {
      if (!logsByHabit.has(log.habitId)) logsByHabit.set(log.habitId, []);
      logsByHabit.get(log.habitId)!.push(log);
    }

    const auditsByHabit = new Map<string, typeof allAudits>();
    if (allAudits) {
      for (const a of allAudits) {
        if (!auditsByHabit.has(a.habitId)) auditsByHabit.set(a.habitId, []);
        auditsByHabit.get(a.habitId)!.push(a);
      }
    }

    const map = new Map<string, number>();
    for (const habit of habits) {
      const hLogs = logsByHabit.get(habit.id) || [];
      const hAudits = auditsByHabit.get(habit.id) || [];
      const paused = StreakEngine.extractPausedRanges(hAudits, habit);
      const res = StreakCalculator.calculateStreak(habit, hLogs, {
        evaluationDate: todayStr,
        pausedRanges: paused
      });
      map.set(habit.id, res.currentStreak);
    }
    return map;
  }, [habits, allLogs, allAudits, todayStr]);

  // Filtered achievements
  const unclaimedAchievements = useMemo(() => {
    if (!allAchievements) return [];
    return allAchievements
      .filter((a) => !a.isClaimed)
      .filter((a) => (selectedHabitFilter === 'all' ? true : a.habitId === selectedHabitFilter))
      .sort((a, b) => b.achievedDate.localeCompare(a.achievedDate));
  }, [allAchievements, selectedHabitFilter]);

  const claimedAchievements = useMemo(() => {
    if (!allAchievements) return [];
    return allAchievements
      .filter((a) => a.isClaimed)
      .filter((a) => (selectedHabitFilter === 'all' ? true : a.habitId === selectedHabitFilter))
      .sort((a, b) => {
        const dateA = a.claimedAt || a.achievedDate;
        const dateB = b.claimedAt || b.achievedDate;
        return dateB.localeCompare(dateA);
      });
  }, [allAchievements, selectedHabitFilter]);

  // Upcoming milestones
  const upcomingMilestones = useMemo(() => {
    if (!allMilestones) return [];
    return allMilestones
      .filter((m) => (selectedHabitFilter === 'all' ? true : m.habitId === selectedHabitFilter))
      .sort((a, b) => a.thresholdDays - b.thresholdDays);
  }, [allMilestones, selectedHabitFilter]);

  // Open creation modal
  const handleOpenCreate = () => {
    setEditingMilestone(null);
    setSelectedHabitForForm(habits && habits.length > 0 ? habits[0].id : '');
    setIsFormModalOpen(true);
  };

  const handleEditMilestone = (m: Milestone) => {
    setEditingMilestone(m);
    setSelectedHabitForForm(m.habitId);
    setIsFormModalOpen(true);
  };

  const handleDeleteMilestone = async (id: string) => {
    if (confirm('Delete this milestone definition? Historical rewards already unlocked will be preserved permanently.')) {
      await MilestoneService.deleteMilestone(id);
    }
  };

  const handleOpenClaim = (achievement: Achievement) => {
    setSelectedAchievementToClaim(achievement);
    setIsClaimModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-100">
              Custom Milestones & Reward Center
            </h2>
            <Badge variant="gold" size="sm">Independent Engine</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Dignity, self-respect, and disciplined rewards. Independent thresholds per habit with idempotent unlock logic.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenCreate}
          className="gap-2"
          disabled={!habits || habits.length === 0}
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Custom Milestone</span>
        </Button>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setActiveTab('unclaimed')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'unclaimed'
              ? 'bg-gradient-to-br from-obsidian-800 to-obsidian-850 border-gold-500 shadow-gold-sm'
              : 'bg-obsidian-850 border-obsidian-750 hover:border-gold-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-wider">
            <span>Ready to Claim</span>
            <Gift className="w-4 h-4 text-gold-400" />
          </div>
          <span className="text-3xl font-bold font-mono text-gold-300 mt-2 block">
            {unclaimedAchievements.length}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">
            {unclaimedAchievements.length > 0
              ? 'Unlocked milestones waiting for celebration'
              : 'All earned milestones claimed'}
          </span>
        </div>

        <div
          onClick={() => setActiveTab('upcoming')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'upcoming'
              ? 'bg-gradient-to-br from-obsidian-800 to-obsidian-850 border-gold-500 shadow-gold-sm'
              : 'bg-obsidian-850 border-obsidian-750 hover:border-gold-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-wider">
            <span>Configured Milestones</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-3xl font-bold font-mono text-slate-100 mt-2 block">
            {allMilestones?.length || 0}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">
            Independent thresholds across active habits
          </span>
        </div>

        <div
          onClick={() => setActiveTab('history')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'history'
              ? 'bg-gradient-to-br from-obsidian-800 to-obsidian-850 border-gold-500 shadow-gold-sm'
              : 'bg-obsidian-850 border-obsidian-750 hover:border-gold-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-wider">
            <span>Claimed Celebrations</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-3xl font-bold font-mono text-emerald-400 mt-2 block">
            {claimedAchievements.length}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">
            Permanent record of honored commitments
          </span>
        </div>
      </div>

      {/* Filter and Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-obsidian-750">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('unclaimed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'unclaimed'
                ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ready to Claim ({unclaimedAchievements.length})
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'upcoming'
                ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Upcoming Milestones ({upcomingMilestones.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Reward Ledger ({claimedAchievements.length})
          </button>
        </div>

        {/* Habit Filter Dropdown */}
        {habits && habits.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Filter Habit:</span>
            <select
              value={selectedHabitFilter}
              onChange={(e) => setSelectedHabitFilter(e.target.value)}
              className="bg-obsidian-900 border border-obsidian-750 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-gold-500/70"
            >
              <option value="all">All Habits</option>
              {habits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: Ready to Claim */}
      {activeTab === 'unclaimed' && (
        <div className="space-y-4">
          {unclaimedAchievements.length === 0 ? (
            <Card className="border-obsidian-750 bg-obsidian-850 p-8 text-center">
              <Gift className="w-10 h-10 text-slate-500 mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-semibold text-slate-200">No Unclaimed Rewards</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Maintain consistency. When an active streak reaches a milestone threshold, your reward will automatically appear here ready to claim.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {unclaimedAchievements.map((ach) => {
                const habit = habitMap.get(ach.habitId);

                return (
                  <Card
                    key={ach.id}
                    className="border-gold-500/60 bg-gradient-to-br from-obsidian-800 to-obsidian-850 shadow-gold-sm relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 rounded-full blur-2xl pointer-events-none" />
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                      <div>
                        <Badge variant="gold" size="sm" className="font-mono text-[10px]">
                          {ach.thresholdDays} Days Unlocked
                        </Badge>
                        <CardTitle className="text-lg font-serif font-bold text-slate-100 mt-1">
                          {ach.rewardTitle}
                        </CardTitle>
                        <CardDescription className="text-gold-300 font-medium">
                          {habit?.title || 'Habit Milestone'}
                        </CardDescription>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-gold-500/20 border border-gold-500/40 flex items-center justify-center text-gold-400 shrink-0">
                        <Sparkles className="w-5 h-5" />
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      {ach.rewardDescription && (
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {ach.rewardDescription}
                        </p>
                      )}

                      {ach.personalNote && (
                        <div className="p-2.5 rounded-lg bg-obsidian-900 border border-obsidian-750 text-xs text-slate-300 italic flex items-start gap-2">
                          <Quote className="w-3.5 h-3.5 text-gold-400 shrink-0 mt-0.5" />
                          <span>"{ach.personalNote}"</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-obsidian-750 text-xs">
                        <span className="text-slate-400">
                          Achieved on: <span className="text-slate-200 font-medium">{formatFriendlyDate(ach.achievedDate)}</span>
                        </span>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleOpenClaim(ach)}
                          className="text-xs h-8 px-3"
                        >
                          <Trophy className="w-3.5 h-3.5 mr-1 text-obsidian-950" />
                          Claim Reward
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Upcoming Milestones Across Habits */}
      {activeTab === 'upcoming' && (
        <div className="space-y-4">
          {upcomingMilestones.length === 0 ? (
            <Card className="border-obsidian-750 bg-obsidian-850 p-8 text-center">
              <Trophy className="w-10 h-10 text-slate-500 mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-semibold text-slate-200">No Milestones Configured</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
                Define milestones to attach meaningful personal rewards to your streaks.
              </p>
              <Button variant="primary" size="sm" onClick={handleOpenCreate}>
                <Plus className="w-4 h-4 mr-1.5" /> Configure First Milestone
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingMilestones.map((m) => {
                const habit = habitMap.get(m.habitId);
                const currentStreak = habit ? streakMap.get(habit.id) || 0 : 0;
                const isReached = currentStreak >= m.thresholdDays;
                const daysRemaining = Math.max(0, m.thresholdDays - currentStreak);
                const progressPct = Math.min(100, Math.round((currentStreak / m.thresholdDays) * 100));

                return (
                  <Card key={m.id} className="border-obsidian-750 bg-obsidian-850">
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant={m.isEnabled ? 'gold' : 'neutral'} size="sm">
                            {m.thresholdDays} Days
                          </Badge>
                          {habit && (
                            <span className="text-xs text-slate-400 truncate max-w-[180px]">
                              {habit.title}
                            </span>
                          )}
                        </div>
                        <CardTitle className="text-base font-semibold text-slate-100 mt-1">
                          {m.rewardTitle}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditMilestone(m)}
                          className="h-7 w-7 text-slate-400 hover:text-slate-200"
                          title="Edit Milestone"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteMilestone(m.id)}
                          className="h-7 w-7 text-slate-400 hover:text-red-400"
                          title="Delete Milestone"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      {m.rewardDescription && (
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {m.rewardDescription}
                        </p>
                      )}

                      {/* Progress toward threshold */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400">
                            Current Streak: <span className="text-gold-300 font-bold">{currentStreak}</span> / {m.thresholdDays}d
                          </span>
                          <span className="text-slate-300 font-semibold">{progressPct}%</span>
                        </div>
                        <Progress value={progressPct} />
                        <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
                          <span>
                            {isReached
                              ? 'Threshold Conquered in Current Streak'
                              : `${daysRemaining} scheduled day${daysRemaining === 1 ? '' : 's'} remaining`}
                          </span>
                          {!m.isEnabled && (
                            <span className="text-amber-400">Paused</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Claimed Rewards Ledger */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {claimedAchievements.length === 0 ? (
            <Card className="border-obsidian-750 bg-obsidian-850 p-8 text-center">
              <CheckCircle2 className="w-10 h-10 text-slate-500 mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-semibold text-slate-200">No Claimed Rewards Yet</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Your historical record of celebrated milestones and self-discipline rewards will appear here.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {claimedAchievements.map((ach) => {
                const habit = habitMap.get(ach.habitId);

                return (
                  <div
                    key={ach.id}
                    className="p-4 rounded-xl bg-obsidian-850 border border-obsidian-750 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="gold" size="sm" className="font-mono text-xs">
                          {ach.thresholdDays} Days
                        </Badge>
                        <span className="text-xs text-gold-400 font-medium">
                          {habit?.title || 'Habit'}
                        </span>
                        {ach.rewardCategory && (
                          <Badge variant="outline" size="sm" className="text-[10px]">
                            {ach.rewardCategory}
                          </Badge>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-slate-100 font-serif">
                        {ach.rewardTitle}
                      </h4>
                      {ach.rewardDescription && (
                        <p className="text-xs text-slate-400">{ach.rewardDescription}</p>
                      )}
                      {ach.claimNotes && (
                        <p className="text-xs text-slate-300 italic pt-1">
                          Celebration Note: "{ach.claimNotes}"
                        </p>
                      )}
                    </div>

                    <div className="text-right sm:shrink-0 text-xs font-mono space-y-1">
                      <div className="text-emerald-400 font-semibold flex items-center justify-end gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Claimed
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Claimed on: {ach.claimedAt ? formatFriendlyDate(ach.claimedAt.split('T')[0]) : 'Recorded'}
                      </div>
                      <div className="text-slate-500 text-[10px]">
                        Earned: {formatFriendlyDate(ach.achievedDate)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <MilestoneFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        habitId={selectedHabitForForm}
        habitName={habitMap.get(selectedHabitForForm)?.title}
        existingMilestone={editingMilestone}
        onSuccess={() => {}}
      />

      <ClaimRewardModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        achievement={selectedAchievementToClaim}
        habitName={
          selectedAchievementToClaim ? habitMap.get(selectedAchievementToClaim.habitId)?.title : undefined
        }
        onSuccess={() => {}}
      />
    </div>
  );
}
