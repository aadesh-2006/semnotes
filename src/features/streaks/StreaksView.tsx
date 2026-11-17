import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../storage/db';
import {
  type Habit,
  type HabitCategory,
  type HabitStatus,
  type HabitLog
} from '../../core/domain/types';
import { HabitService } from '../../core/services/habitService';
import { isScheduledDay } from '../../core/services/scheduleService';
import { formatCalendarDate } from '../../core/utils';
import { HabitCard } from './components/HabitCard';
import { HabitDetailView } from './HabitDetailView';
import { HabitFormModal } from '../../components/modals/HabitFormModal';
import { CheckInModal } from '../../components/modals/CheckInModal';
import { ConfirmationDialog } from '../../components/ui/confirmation-dialog';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Plus,
  Filter,
  Shield
} from 'lucide-react';

interface StreaksViewProps {
  onOpenNewHabit?: () => void;
  selectedHabitIdFromParent?: string | null;
}

export function StreaksView({ onOpenNewHabit, selectedHabitIdFromParent }: StreaksViewProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | HabitStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | HabitCategory>('all');
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(selectedHabitIdFromParent || null);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<Habit | undefined>(undefined);

  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [checkInHabit, setCheckInHabit] = useState<Habit | null>(null);
  const [checkInTargetDate, setCheckInTargetDate] = useState<string>(formatCalendarDate(new Date()));
  const [existingLogForCheckIn, setExistingLogForCheckIn] = useState<HabitLog | null>(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'primary';
    confirmLabel?: string;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {}
  });

  const todayStr = formatCalendarDate(new Date());

  // Reactive Dexie queries
  const allHabits = useLiveQuery(() => db.habits.toArray(), []);
  const todayLogs = useLiveQuery(() => db.habitLogs.where('date').equals(todayStr).toArray(), [todayStr]);
  const allCompletedLogs = useLiveQuery(
    () => db.habitLogs.filter((l) => l.status === 'completed').toArray(),
    []
  );

  // Build lookup maps
  const todayLogMap = new Map<string, HabitLog>(todayLogs?.map((l) => [l.habitId, l]) || []);

  const successCountsByHabit = new Map<string, number>();
  if (allCompletedLogs) {
    for (const log of allCompletedLogs) {
      successCountsByHabit.set(log.habitId, (successCountsByHabit.get(log.habitId) || 0) + 1);
    }
  }

  // Filter habits
  const filteredHabits = (allHabits || []).filter((habit) => {
    if (statusFilter !== 'all' && habit.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && habit.category !== categoryFilter) return false;
    return true;
  });

  // Action handlers
  const handleOpenCreate = () => {
    if (onOpenNewHabit) {
      onOpenNewHabit();
    } else {
      setHabitToEdit(undefined);
      setIsFormModalOpen(true);
    }
  };

  const handleOpenEdit = (habit: Habit) => {
    setHabitToEdit(habit);
    setIsFormModalOpen(true);
  };

  const handleCheckIn = async (habit: Habit, date = todayStr, existingLog?: HabitLog) => {
    setCheckInHabit(habit);
    setCheckInTargetDate(date);
    if (existingLog) {
      setExistingLogForCheckIn(existingLog);
    } else {
      const log = todayLogMap.get(habit.id);
      setExistingLogForCheckIn(log || null);
    }
    setIsCheckInOpen(true);
  };

  const handlePauseToggle = (habit: Habit) => {
    if (habit.status === 'paused') {
      HabitService.resumeHabit(habit.id);
    } else {
      setConfirmDialog({
        isOpen: true,
        title: 'Pause Habit Commitment?',
        description: `Pausing "${habit.title}" will preserve all historical logs and prevent unscheduled misses. You can resume at any time.`,
        confirmLabel: 'Pause Habit',
        variant: 'warning',
        onConfirm: async () => {
          await HabitService.pauseHabit(habit.id);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      });
    }
  };

  const handleArchiveToggle = (habit: Habit) => {
    if (habit.status === 'archived') {
      HabitService.resumeHabit(habit.id);
    } else {
      setConfirmDialog({
        isOpen: true,
        title: 'Archive Habit?',
        description: `Archiving "${habit.title}" removes it from daily tracking while permanently safeguarding all historical data.`,
        confirmLabel: 'Archive Habit',
        variant: 'warning',
        onConfirm: async () => {
          await HabitService.archiveHabit(habit.id);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      });
    }
  };

  // If a habit detail view is active, render it
  if (selectedHabitId) {
    return (
      <HabitDetailView
        habitId={selectedHabitId}
        onBack={() => setSelectedHabitId(null)}
        onEdit={handleOpenEdit}
        onCheckIn={handleCheckIn}
        onPauseToggle={handlePauseToggle}
        onArchiveToggle={handleArchiveToggle}
      />
    );
  }

  const activeCount = allHabits?.filter((h) => h.status === 'active').length || 0;
  const pausedCount = allHabits?.filter((h) => h.status === 'paused').length || 0;
  const archivedCount = allHabits?.filter((h) => h.status === 'archived').length || 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-100">
              Habit Management & Architecture
            </h2>
            <Badge variant="gold" size="sm">M2 Engine Active</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Independently configured abstinence, completion, and quantitative habits persisted in IndexedDB.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleOpenCreate} className="gap-2 shadow-gold-sm">
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Habit Commitment</span>
        </Button>
      </div>

      {/* Filter Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-xl bg-obsidian-900 border border-obsidian-750">
        {/* Status Filters */}
        <div className="flex items-center gap-1">
          {[
            { id: 'all', label: 'All', count: allHabits?.length || 0 },
            { id: 'active', label: 'Active', count: activeCount },
            { id: 'paused', label: 'Paused', count: pausedCount },
            { id: 'archived', label: 'Archived', count: archivedCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40 shadow-gold-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-obsidian-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className="font-mono text-[10px] opacity-70">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="bg-obsidian-850 border border-obsidian-700 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-gold-500"
          >
            <option value="all">All Categories</option>
            <option value="abstinence">Abstinence</option>
            <option value="craft">Craft & Code</option>
            <option value="body">Body & Health</option>
            <option value="mind">Mind & Stoicism</option>
            <option value="discipline">Discipline</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>

      {/* Habit Cards Grid / Empty States */}
      {!allHabits || allHabits.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-obsidian-850 border border-dashed border-obsidian-700 max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-gold-950/60 border border-gold-600/40 flex items-center justify-center mx-auto shadow-gold-glow">
            <Shield className="w-7 h-7 text-gold-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold font-display text-slate-100">
              No Habits Established Yet
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Discipline begins with a single sovereign commitment. Architect your first abstinence, completion, or quantitative habit.
            </p>
          </div>
          <Button variant="primary" size="md" onClick={handleOpenCreate} className="gap-2">
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Architect First Habit</span>
          </Button>
        </div>
      ) : filteredHabits.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-obsidian-850 border border-obsidian-750 text-slate-400 text-xs">
          No habits found matching the selected "{statusFilter}" status or category filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHabits.map((habit) => {
            const isScheduled = isScheduledDay(
              habit.schedule,
              todayStr,
              habit.startDate,
              habit.endDate
            );
            const todayLog = todayLogMap.get(habit.id);
            const totalSuccess = successCountsByHabit.get(habit.id) || 0;

            return (
              <HabitCard
                key={habit.id}
                habit={habit}
                isScheduledToday={isScheduled}
                todayLog={todayLog}
                totalSuccessDays={totalSuccess}
                onCheckIn={handleCheckIn}
                onViewDetails={(h) => setSelectedHabitId(h.id)}
                onEdit={handleOpenEdit}
                onPauseToggle={handlePauseToggle}
                onArchiveToggle={handleArchiveToggle}
              />
            );
          })}
        </div>
      )}

      {/* Modals & Dialogs */}
      <HabitFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        habitToEdit={habitToEdit}
        onSuccess={() => {}}
      />

      <CheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        habit={checkInHabit}
        targetDate={checkInTargetDate}
        existingLog={existingLogForCheckIn}
        onSuccess={() => {}}
      />

      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
      />
    </div>
  );
}
