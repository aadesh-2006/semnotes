/**
 * SEMNÓTĒS — Focus Mode Selector
 * Obsidian & Gold Design System.
 *
 * Provides a clean, calm toggle between:
 * - Custom Focus (Single uninterrupted session of any duration)
 * - Pomodoro Cycles (Configurable cycles with short and long breaks)
 */

import type { SessionMode } from '../../core/focus/focusTypes';
import { Timer, RotateCcw } from 'lucide-react';

interface FocusModeSelectorProps {
  mode: SessionMode;
  onChangeMode: (mode: SessionMode) => void;
  disabled?: boolean;
}

export function FocusModeSelector({
  mode,
  onChangeMode,
  disabled = false,
}: FocusModeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3 p-1 rounded-2xl bg-obsidian-900 border border-obsidian-750">
      {/* Custom Focus Mode Card */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChangeMode('custom')}
        className={`p-3 rounded-xl text-left transition-all flex items-start gap-3 ${
          mode === 'custom'
            ? 'bg-obsidian-800/90 text-gold-200 border border-gold-500/50 shadow-gold-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-obsidian-850/50 border border-transparent'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div
          className={`p-2 rounded-lg ${
            mode === 'custom' ? 'bg-gold-500/20 text-gold-300' : 'bg-obsidian-750 text-slate-400'
          }`}
        >
          <Timer className="w-4 h-4" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-100 font-display">Custom Focus</span>
            {mode === 'custom' && (
              <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse" />
            )}
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            One continuous session of any duration without forced breaks.
          </p>
        </div>
      </button>

      {/* Pomodoro Cycles Mode Card */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChangeMode('pomodoro')}
        className={`p-3 rounded-xl text-left transition-all flex items-start gap-3 ${
          mode === 'pomodoro'
            ? 'bg-obsidian-800/90 text-gold-200 border border-gold-500/50 shadow-gold-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-obsidian-850/50 border border-transparent'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div
          className={`p-2 rounded-lg ${
            mode === 'pomodoro' ? 'bg-gold-500/20 text-gold-300' : 'bg-obsidian-750 text-slate-400'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-100 font-display">Pomodoro Cycles</span>
            {mode === 'pomodoro' && (
              <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse" />
            )}
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Structured intervals with configurable short and long breaks.
          </p>
        </div>
      </button>
    </div>
  );
}
