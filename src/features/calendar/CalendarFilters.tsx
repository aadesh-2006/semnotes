import { Button } from '../../components/ui/button';
import { Calendar, Flame, Check } from 'lucide-react';
import type { Habit, HabitCategory, HabitType, HabitStatus } from '../../core/domain/types';
import type { CalendarFilters as FilterOptions, CalendarViewMode } from '../../core/calendar/calendarTypes';

interface CalendarFiltersProps {
  habits: Habit[];
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
}

const CATEGORIES: { label: string; value: HabitCategory }[] = [
  { label: 'Abstinence', value: 'abstinence' },
  { label: 'Craft & Code', value: 'craft' },
  { label: 'Body & Health', value: 'body' },
  { label: 'Mind & Stoicism', value: 'mind' },
  { label: 'Discipline', value: 'discipline' },
  { label: 'Custom', value: 'custom' }
];

const TRACKING_TYPES: { label: string; value: HabitType }[] = [
  { label: 'Abstinence', value: 'abstinence' },
  { label: 'Completion', value: 'completion' },
  { label: 'Quantitative', value: 'quantitative' }
];

export function CalendarFilters({
  habits,
  filters,
  onFilterChange,
  viewMode,
  onViewModeChange
}: CalendarFiltersProps) {
  const selectedHabitId = filters.habitIds && filters.habitIds.length === 1 ? filters.habitIds[0] : '';
  const selectedCategory = filters.categories && filters.categories.length === 1 ? filters.categories[0] : '';
  const selectedType = filters.trackingTypes && filters.trackingTypes.length === 1 ? filters.trackingTypes[0] : '';

  const activeLifecycles = filters.lifecycleStatuses || ['active', 'paused'];

  const toggleLifecycle = (status: HabitStatus) => {
    const next = activeLifecycles.includes(status)
      ? activeLifecycles.filter((s) => s !== status)
      : [...activeLifecycles, status];

    // Ensure at least one status remains selected
    if (next.length > 0) {
      onFilterChange({ ...filters, lifecycleStatuses: next });
    }
  };

  const handleHabitSelect = (habitId: string) => {
    onFilterChange({
      ...filters,
      habitIds: habitId ? [habitId] : undefined
    });
  };

  const handleCategorySelect = (category: string) => {
    onFilterChange({
      ...filters,
      categories: category ? [category as HabitCategory] : undefined
    });
  };

  const handleTypeSelect = (type: string) => {
    onFilterChange({
      ...filters,
      trackingTypes: type ? [type as HabitType] : undefined
    });
  };

  const isFiltered =
    Boolean(filters.habitIds?.length) ||
    Boolean(filters.categories?.length) ||
    Boolean(filters.trackingTypes?.length) ||
    (filters.lifecycleStatuses && filters.lifecycleStatuses.length !== 2);

  const resetFilters = () => {
    onFilterChange({
      habitIds: undefined,
      categories: undefined,
      trackingTypes: undefined,
      lifecycleStatuses: ['active', 'paused']
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* View Mode Switcher */}
        <div className="inline-flex items-center p-1 rounded-lg bg-obsidian-900 border border-obsidian-750">
          <button
            type="button"
            onClick={() => onViewModeChange('monthly')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === 'monthly'
                ? 'bg-gold-500/20 text-gold-300 border border-gold-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Monthly Grid</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange('heatmap')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === 'heatmap'
                ? 'bg-gold-500/20 text-gold-300 border border-gold-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Discipline Heatmap</span>
          </button>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Habit Filter */}
          <select
            value={selectedHabitId}
            onChange={(e) => handleHabitSelect(e.target.value)}
            className="h-8 px-2.5 rounded-md bg-obsidian-900 border border-obsidian-750 text-xs text-slate-200 focus:outline-none focus:border-gold-500/50"
            aria-label="Filter Habit"
          >
            <option value="">All Commitments ({habits.length})</option>
            {habits.map((h) => (
              <option key={h.id} value={h.id}>
                {h.title} {h.status === 'archived' ? '(Archived)' : h.status === 'paused' ? '(Paused)' : ''}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => handleCategorySelect(e.target.value)}
            className="h-8 px-2.5 rounded-md bg-obsidian-900 border border-obsidian-750 text-xs text-slate-200 focus:outline-none focus:border-gold-500/50"
            aria-label="Filter Category"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Tracking Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => handleTypeSelect(e.target.value)}
            className="h-8 px-2.5 rounded-md bg-obsidian-900 border border-obsidian-750 text-xs text-slate-200 focus:outline-none focus:border-gold-500/50"
            aria-label="Filter Type"
          >
            <option value="">All Types</option>
            {TRACKING_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          {/* Lifecycle Pills */}
          <div className="flex items-center gap-1 p-0.5 rounded-md bg-obsidian-900 border border-obsidian-750">
            {(['active', 'paused', 'archived'] as HabitStatus[]).map((status) => {
              const active = activeLifecycles.includes(status);
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => toggleLifecycle(status)}
                  className={`px-2 py-1 rounded text-[11px] capitalize font-mono transition-all flex items-center gap-1 ${
                    active
                      ? 'bg-obsidian-750 text-gold-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  {active && <Check className="w-2.5 h-2.5 text-gold-400" />}
                  <span>{status}</span>
                </button>
              );
            })}
          </div>

          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 text-xs text-slate-400 hover:text-gold-300 px-2"
            >
              Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
