import React from 'react';
import type { AnalyticsFilterCriteria, AnalyticsTimePreset } from '../../core/analytics/analyticsTypes';
import type { Habit } from '../../core/domain/types';
import { Calendar, X } from 'lucide-react';
import { Button } from '../../components/ui/button';

interface AnalyticsFiltersProps {
  filters: AnalyticsFilterCriteria;
  habits: Habit[];
  onPresetChange: (preset: AnalyticsTimePreset) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onHabitChange: (habitId?: string) => void;
  onCategoryChange: (category?: string) => void;
  onReset: () => void;
}

export const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({
  filters,
  habits,
  onPresetChange,
  onStartDateChange,
  onEndDateChange,
  onHabitChange,
  onCategoryChange,
  onReset
}) => {
  const PRESETS: { id: AnalyticsTimePreset; label: string }[] = [
    { id: '7d', label: '7D' },
    { id: '30d', label: '30D' },
    { id: '90d', label: '90D' },
    { id: '6m', label: '6M' },
    { id: '12m', label: '12M' },
    { id: 'custom', label: 'Custom' }
  ];

  const categories = Array.from(new Set(habits.map((h) => h.category))).sort();

  const isCustomActive =
    filters.preset !== '30d' ||
    Boolean(filters.selectedHabitId) ||
    Boolean(filters.selectedCategory);

  return (
    <div className="p-3.5 rounded-xl bg-obsidian-850 border border-obsidian-750 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Preset Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-gold-400" />
            <span>Range:</span>
          </span>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPresetChange(p.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-colors ${
                filters.preset === p.id
                  ? 'bg-gold-500/20 text-gold-300 border border-gold-500/50'
                  : 'bg-obsidian-900 border border-obsidian-750 text-slate-400 hover:text-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Reset button if filtered */}
        {isCustomActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-xs text-slate-400 hover:text-slate-200 gap-1 px-2.5 py-1 self-end sm:self-auto"
          >
            <X className="w-3 h-3" />
            <span>Reset to 30D</span>
          </Button>
        )}
      </div>

      {/* Date Range Inputs & Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1 border-t border-obsidian-750/70 text-xs">
        {/* Date inputs */}
        <div className="sm:col-span-5 flex items-center gap-1.5">
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full bg-obsidian-900 border border-obsidian-750 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-gold-500/50"
            title="Start Date"
          />
          <span className="text-slate-400 text-xs shrink-0">to</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full bg-obsidian-900 border border-obsidian-750 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-gold-500/50"
            title="End Date"
          />
        </div>

        {/* Habit dropdown */}
        <div className="sm:col-span-4">
          <select
            value={filters.selectedHabitId || ''}
            onChange={(e) => onHabitChange(e.target.value || undefined)}
            className="w-full bg-obsidian-900 border border-obsidian-750 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-gold-500/50"
          >
            <option value="">All Commitments ({habits.length})</option>
            {habits.map((h) => (
              <option key={h.id} value={h.id}>
                {h.title}
              </option>
            ))}
          </select>
        </div>

        {/* Category dropdown */}
        <div className="sm:col-span-3">
          <select
            value={filters.selectedCategory || ''}
            onChange={(e) => onCategoryChange(e.target.value || undefined)}
            className="w-full bg-obsidian-900 border border-obsidian-750 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-gold-500/50 uppercase font-mono"
          >
            <option value="">All Domains</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
