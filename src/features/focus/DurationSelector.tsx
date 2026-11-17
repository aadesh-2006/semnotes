/**
 * SEMNÓTĒS — Focus Duration Selector
 * Obsidian & Gold Design System.
 *
 * Provides:
 * 1. Quick presets: 15m, 25m, 50m, 90m, 120m, 180m.
 * 2. Precise custom hours & minutes inputs (1 min to 12 hours / 720 mins).
 * 3. Quick adjustment buttons (+15m, +30m, -15m).
 */

import { useState, useEffect } from 'react';
import type { FocusPreset } from '../../core/focus/focusTypes';
import { DEFAULT_FOCUS_PRESETS } from '../../core/focus/focusTypes';
import { Clock, Plus, Minus } from 'lucide-react';

interface DurationSelectorProps {
  selectedMinutes: number;
  onChangeDuration: (minutes: number) => void;
  presets?: FocusPreset[];
  disabled?: boolean;
}

export function DurationSelector({
  selectedMinutes,
  onChangeDuration,
  presets = DEFAULT_FOCUS_PRESETS,
  disabled = false,
}: DurationSelectorProps) {
  const [hours, setHours] = useState(Math.floor(selectedMinutes / 60));
  const [minutes, setMinutes] = useState(selectedMinutes % 60);
  const [isCustomExpanded, setIsCustomExpanded] = useState(false);

  // Sync internal state when external selectedMinutes changes
  useEffect(() => {
    setHours(Math.floor(selectedMinutes / 60));
    setMinutes(selectedMinutes % 60);
  }, [selectedMinutes]);

  const handleCustomApply = (h: number, m: number) => {
    const total = h * 60 + m;
    const clamped = Math.min(720, Math.max(1, total));
    onChangeDuration(clamped);
  };

  const handleAdjustMinutes = (delta: number) => {
    const updated = Math.min(720, Math.max(1, selectedMinutes + delta));
    onChangeDuration(updated);
  };

  const isPresetActive = (mins: number) => selectedMinutes === mins;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
          <Clock className="w-3.5 h-3.5 text-gold-400" />
          <span>Planned Duration</span>
        </label>
        <span className="text-xs font-mono text-gold-300 font-semibold bg-gold-950/40 border border-gold-800/40 px-2 py-0.5 rounded">
          {hours > 0 ? `${hours}h ${minutes > 0 ? `${minutes}m` : ''}` : `${minutes}m`} ({selectedMinutes} mins)
        </span>
      </div>

      {/* Preset Pills */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {presets.map((preset) => {
          const active = isPresetActive(preset.durationMinutes);
          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              onClick={() => onChangeDuration(preset.durationMinutes)}
              className={`px-2.5 py-2 rounded-xl text-xs font-medium transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                active
                  ? 'bg-gold-500/20 text-gold-200 border border-gold-500/60 shadow-gold-sm font-semibold'
                  : 'bg-obsidian-800/80 text-slate-400 hover:text-slate-200 hover:bg-obsidian-750 border border-obsidian-750'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className="font-semibold text-slate-200">{preset.durationMinutes}m</span>
              <span className="text-[10px] text-slate-400 truncate max-w-full">{preset.label}</span>
            </button>
          );
        })}
      </div>

      {/* Custom Duration Toggle & Inputs */}
      <div className="pt-1">
        <div className="flex items-center justify-between pb-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsCustomExpanded((prev) => !prev)}
            className="text-xs text-gold-400 hover:text-gold-300 font-medium underline-offset-4 hover:underline transition-colors cursor-pointer"
          >
            {isCustomExpanded ? 'Hide Custom Duration' : 'Set Exact Custom Duration (Hours / Mins)...'}
          </button>

          {/* Quick Adjustment Steppers */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={disabled || selectedMinutes <= 5}
              onClick={() => handleAdjustMinutes(-15)}
              className="p-1 rounded bg-obsidian-800 hover:bg-obsidian-750 border border-obsidian-750 text-slate-300 text-xs disabled:opacity-40"
              title="-15 minutes"
            >
              -15m
            </button>
            <button
              type="button"
              disabled={disabled || selectedMinutes <= 1}
              onClick={() => handleAdjustMinutes(-5)}
              className="p-1 rounded bg-obsidian-800 hover:bg-obsidian-750 border border-obsidian-750 text-slate-300 text-xs disabled:opacity-40"
              title="-5 minutes"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              type="button"
              disabled={disabled || selectedMinutes >= 720}
              onClick={() => handleAdjustMinutes(5)}
              className="p-1 rounded bg-obsidian-800 hover:bg-obsidian-750 border border-obsidian-750 text-slate-300 text-xs disabled:opacity-40"
              title="+5 minutes"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              type="button"
              disabled={disabled || selectedMinutes >= 705}
              onClick={() => handleAdjustMinutes(15)}
              className="p-1 rounded bg-obsidian-800 hover:bg-obsidian-750 border border-obsidian-750 text-slate-300 text-xs disabled:opacity-40"
              title="+15 minutes"
            >
              +15m
            </button>
          </div>
        </div>

        {isCustomExpanded && (
          <div className="p-3 rounded-xl bg-obsidian-900/90 border border-obsidian-750/90 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                Hours (0 - 12)
              </label>
              <input
                type="number"
                min={0}
                max={12}
                disabled={disabled}
                value={hours}
                onChange={(e) => {
                  const val = Math.min(12, Math.max(0, parseInt(e.target.value) || 0));
                  setHours(val);
                  handleCustomApply(val, minutes);
                }}
                className="w-full px-3 py-1.5 rounded-lg bg-obsidian-800 border border-obsidian-700 text-slate-100 font-mono text-sm focus:border-gold-500/60 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                Minutes (0 - 59)
              </label>
              <input
                type="number"
                min={0}
                max={59}
                disabled={disabled}
                value={minutes}
                onChange={(e) => {
                  const val = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                  setMinutes(val);
                  handleCustomApply(hours, val);
                }}
                className="w-full px-3 py-1.5 rounded-lg bg-obsidian-800 border border-obsidian-700 text-slate-100 font-mono text-sm focus:border-gold-500/60 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
