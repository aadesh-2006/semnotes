import React from 'react';
import type { TriggerCategory } from '../../core/urges/urgeTypes';

const PRESET_TRIGGERS: { id: TriggerCategory; label: string; icon: string }[] = [
  { id: 'boredom', label: 'Boredom', icon: '⏳' },
  { id: 'stress', label: 'Stress / Pressure', icon: '⚡' },
  { id: 'loneliness', label: 'Loneliness / Isolation', icon: '🌑' },
  { id: 'fatigue', label: 'Fatigue / Exhaustion', icon: '🔋' },
  { id: 'anxiety', label: 'Anxiety / Restlessness', icon: '🌪️' },
  { id: 'procrastination', label: 'Procrastination', icon: '⏸️' },
  { id: 'environmental', label: 'Environment / Location', icon: '🚪' },
  { id: 'social_media', label: 'Social Media / Cues', icon: '📱' },
  { id: 'habitual_routine', label: 'Habitual Routine', icon: '🔄' },
  { id: 'other', label: 'Other Circumstance', icon: '🏷️' }
];

interface TriggerSelectorProps {
  selectedCategories: TriggerCategory[];
  customTrigger?: string;
  onCategoriesChange: (categories: TriggerCategory[]) => void;
  onCustomTriggerChange?: (custom: string) => void;
  disabled?: boolean;
}

export const TriggerSelector: React.FC<TriggerSelectorProps> = ({
  selectedCategories,
  customTrigger = '',
  onCategoriesChange,
  onCustomTriggerChange,
  disabled
}) => {
  const toggleCategory = (cat: TriggerCategory) => {
    if (disabled) return;
    if (selectedCategories.includes(cat)) {
      // Keep at least one or allow unselecting if multiple
      onCategoriesChange(selectedCategories.filter((c) => c !== cat));
    } else {
      onCategoriesChange([...selectedCategories, cat]);
    }
  };

  const hasOther = selectedCategories.includes('other');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-300">
          Recognized Triggers & Context
        </label>
        <span className="text-[10px] text-slate-400">
          {selectedCategories.length} selected
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESET_TRIGGERS.map((t) => {
          const isSelected = selectedCategories.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              disabled={disabled}
              onClick={() => toggleCategory(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                isSelected
                  ? 'bg-gold-500/15 border-gold-500/50 text-gold-300 shadow-sm shadow-gold-950/50'
                  : 'bg-obsidian-850 border-obsidian-750 text-slate-400 hover:text-slate-200 hover:border-obsidian-650'
              } disabled:opacity-50`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {(hasOther || customTrigger.length > 0) && onCustomTriggerChange && (
        <div className="pt-1">
          <input
            type="text"
            value={customTrigger}
            disabled={disabled}
            onChange={(e) => onCustomTriggerChange(e.target.value)}
            placeholder="Specify custom trigger context..."
            className="w-full bg-obsidian-900 border border-obsidian-750 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-gold-500/50"
          />
        </div>
      )}
    </div>
  );
};
