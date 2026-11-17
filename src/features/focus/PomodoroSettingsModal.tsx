/**
 * SEMNÓTĒS — Pomodoro Settings Modal
 * Obsidian & Gold Design System.
 *
 * Configures custom focus duration, short/long breaks, cycle counts,
 * and automatic phase transitions.
 */

import React, { useState } from 'react';
import { Modal } from '../../components/ui/modal';
import { Button } from '../../components/ui/button';
import type { PomodoroConfig } from '../../core/focus/focusTypes';
import { RotateCcw, Clock, Coffee, Sparkles } from 'lucide-react';

interface PomodoroSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PomodoroConfig;
  onSave: (config: PomodoroConfig) => void;
}

export function PomodoroSettingsModal({
  isOpen,
  onClose,
  config,
  onSave,
}: PomodoroSettingsModalProps) {
  const [focusMins, setFocusMins] = useState(config.focusDurationMinutes);
  const [shortBreakMins, setShortBreakMins] = useState(config.shortBreakMinutes);
  const [longBreakMins, setLongBreakMins] = useState(config.longBreakMinutes);
  const [cycles, setCycles] = useState(config.cyclesBeforeLongBreak);
  const [autoBreaks, setAutoBreaks] = useState(config.autoStartBreaks);
  const [autoFocus, setAutoFocus] = useState(config.autoStartFocus);

  const handleSave = () => {
    onSave({
      focusDurationMinutes: Math.min(240, Math.max(1, focusMins)),
      shortBreakMinutes: Math.min(60, Math.max(1, shortBreakMins)),
      longBreakMinutes: Math.min(120, Math.max(1, longBreakMins)),
      cyclesBeforeLongBreak: Math.min(12, Math.max(1, cycles)),
      autoStartBreaks: autoBreaks,
      autoStartFocus: autoFocus,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pomodoro Cycle Configuration"
      description="Configure custom phase durations and cycle boundaries to match your rhythm."
      size="md"
    >
      <div className="space-y-5 pt-2">
        {/* Phase Durations Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-obsidian-850 border border-obsidian-750 space-y-1">
            <label className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-gold-400" /> Focus (mins)
            </label>
            <input
              type="number"
              min={1}
              max={240}
              value={focusMins}
              onChange={(e) => setFocusMins(parseInt(e.target.value) || 1)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-obsidian-900 border border-obsidian-700 text-slate-100 font-mono text-sm focus:border-gold-500/60 focus:outline-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-obsidian-850 border border-obsidian-750 space-y-1">
            <label className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
              <Coffee className="w-3 h-3 text-amber-400" /> Short Break
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={shortBreakMins}
              onChange={(e) => setShortBreakMins(parseInt(e.target.value) || 1)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-obsidian-900 border border-obsidian-700 text-slate-100 font-mono text-sm focus:border-gold-500/60 focus:outline-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-obsidian-850 border border-obsidian-750 space-y-1">
            <label className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" /> Long Break
            </label>
            <input
              type="number"
              min={1}
              max={120}
              value={longBreakMins}
              onChange={(e) => setLongBreakMins(parseInt(e.target.value) || 1)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-obsidian-900 border border-obsidian-700 text-slate-100 font-mono text-sm focus:border-gold-500/60 focus:outline-none"
            />
          </div>
        </div>

        {/* Cycles Before Long Break */}
        <div className="p-3 rounded-xl bg-obsidian-850 border border-obsidian-750 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-200 block">Cycles Before Long Break</span>
            <span className="text-[11px] text-slate-400">
              A long break triggers every {cycles} completed focus phases.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {[2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setCycles(num)}
                className={`w-8 h-8 rounded-lg font-mono text-xs font-bold transition-all ${
                  cycles === num
                    ? 'bg-gold-500/20 text-gold-300 border border-gold-500/50 shadow-gold-sm'
                    : 'bg-obsidian-800 text-slate-400 hover:text-slate-200 border border-obsidian-700'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Automation Toggles */}
        <div className="space-y-2">
          <label className="flex items-center justify-between p-3 rounded-xl bg-obsidian-850 border border-obsidian-750 cursor-pointer">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">Auto-start Breaks</span>
              <span className="text-[11px] text-slate-400">
                Automatically start break timer when focus phase finishes.
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoBreaks}
              onChange={(e) => setAutoBreaks(e.target.checked)}
              className="w-4 h-4 rounded border-obsidian-700 bg-obsidian-800 text-gold-500 focus:ring-gold-500/40"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-obsidian-850 border border-obsidian-750 cursor-pointer">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">Auto-start Focus</span>
              <span className="text-[11px] text-slate-400">
                Automatically begin next focus phase when break finishes.
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoFocus}
              onChange={(e) => setAutoFocus(e.target.checked)}
              className="w-4 h-4 rounded border-obsidian-700 bg-obsidian-800 text-gold-500 focus:ring-gold-500/40"
            />
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-obsidian-750">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="gold" size="sm" onClick={handleSave}>
            Save Configuration
          </Button>
        </div>
      </div>
    </Modal>
  );
}
