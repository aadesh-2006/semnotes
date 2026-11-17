/**
 * SEMNÓTĒS — Focus Session Setup
 * Obsidian & Gold Design System.
 *
 * Provides:
 * - Session title input with instant suggested quick-pick pills.
 * - Optional linked habit dropdown with explicit privacy & non-mutation disclaimer.
 * - Optional intention/session notes input.
 * - Pomodoro configuration modal trigger.
 */

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../storage/db';
import type { SessionMode, PomodoroConfig } from '../../core/focus/focusTypes';
import { PomodoroSettingsModal } from './PomodoroSettingsModal';
import { Tag, Link2, FileText, Settings2, Info } from 'lucide-react';

interface FocusSessionSetupProps {
  title: string;
  onChangeTitle: (title: string) => void;
  linkedHabitId?: string;
  onChangeLinkedHabitId: (habitId?: string) => void;
  notes?: string;
  onChangeNotes: (notes: string) => void;
  sessionMode: SessionMode;
  pomodoroConfig: PomodoroConfig;
  onChangePomodoroConfig: (config: PomodoroConfig) => void;
  disabled?: boolean;
}

const COMMON_SUGGESTIONS = [
  'DSA Practice',
  'Software Development',
  'Book Reading',
  'Exam Revision',
  'Research & Writing',
  'Deep Work',
];

export function FocusSessionSetup({
  title,
  onChangeTitle,
  linkedHabitId,
  onChangeLinkedHabitId,
  notes,
  onChangeNotes,
  sessionMode,
  pomodoroConfig,
  onChangePomodoroConfig,
  disabled = false,
}: FocusSessionSetupProps) {
  const [isPomodoroModalOpen, setIsPomodoroModalOpen] = useState(false);
  const activeHabits = useLiveQuery(() => db.habits.where('status').equals('active').toArray(), []);

  return (
    <div className="space-y-4">
      {/* Session Title & Quick Suggestions */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
          <Tag className="w-3.5 h-3.5 text-gold-400" />
          <span>Session Title</span>
        </label>
        <input
          type="text"
          value={title}
          disabled={disabled}
          onChange={(e) => onChangeTitle(e.target.value)}
          placeholder="e.g. DSA Practice, React Development, Book Reading..."
          className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-850 border border-obsidian-750 text-slate-100 placeholder-slate-500 text-sm focus:border-gold-500/60 focus:outline-none"
        />

        {/* Suggestion Pills */}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {COMMON_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={disabled}
              onClick={() => onChangeTitle(suggestion)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition-all ${
                title === suggestion
                  ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40'
                  : 'bg-obsidian-800 text-slate-400 hover:text-slate-200 border border-obsidian-750'
              }`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Habit Association & Pomodoro Settings Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Optional Habit Association */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <Link2 className="w-3.5 h-3.5 text-gold-400" />
            <span>Link to Habit (Optional)</span>
          </label>
          <select
            value={linkedHabitId ?? ''}
            disabled={disabled}
            onChange={(e) => onChangeLinkedHabitId(e.target.value ? e.target.value : undefined)}
            className="w-full px-3 py-2 rounded-xl bg-obsidian-850 border border-obsidian-750 text-slate-200 text-xs focus:border-gold-500/60 focus:outline-none"
          >
            <option value="">(None / General Focus)</option>
            {activeHabits?.map((habit) => (
              <option key={habit.id} value={habit.id}>
                {habit.title} ({habit.category})
              </option>
            ))}
          </select>
        </div>

        {/* Mode-specific actions */}
        <div className="space-y-1.5 flex flex-col justify-end">
          {sessionMode === 'pomodoro' ? (
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono mb-1.5">
                <Settings2 className="w-3.5 h-3.5 text-gold-400" />
                <span>Cycle Settings</span>
              </label>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setIsPomodoroModalOpen(true)}
                className="w-full px-3 py-2 rounded-xl bg-obsidian-850 border border-obsidian-750 hover:border-gold-500/40 text-gold-300 text-xs font-medium flex items-center justify-between transition-all"
              >
                <span>
                  {pomodoroConfig.focusDurationMinutes}m / {pomodoroConfig.shortBreakMinutes}m / {pomodoroConfig.longBreakMinutes}m
                </span>
                <span className="text-[10px] font-mono text-slate-400">Configure</span>
              </button>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-obsidian-850/60 border border-obsidian-750/70 text-[11px] text-slate-400 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-gold-400/80 shrink-0 mt-0.5" />
              <span>
                Single continuous focus without forced breaks. Break time is never counted.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Optional Intention / Session Notes */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
          <FileText className="w-3.5 h-3.5 text-gold-400" />
          <span>Session Intention / Notes (Optional)</span>
        </label>
        <textarea
          rows={2}
          value={notes ?? ''}
          disabled={disabled}
          onChange={(e) => onChangeNotes(e.target.value)}
          placeholder="What specific objective will you achieve in this focus block?"
          className="w-full px-3 py-2 rounded-xl bg-obsidian-850 border border-obsidian-750 text-slate-100 placeholder-slate-500 text-xs focus:border-gold-500/60 focus:outline-none resize-none"
        />
      </div>

      {/* Pomodoro Configuration Modal */}
      <PomodoroSettingsModal
        isOpen={isPomodoroModalOpen}
        onClose={() => setIsPomodoroModalOpen(false)}
        config={pomodoroConfig}
        onSave={onChangePomodoroConfig}
      />
    </div>
  );
}
