/**
 * SEMNÓTĒS — Focus Session History View
 * Obsidian & Gold Design System.
 *
 * Provides:
 * - Searchable chronological session history ledger.
 * - Multi-dimensional filters: Date presets (All, Today, 7D, 30D), Status, Habit.
 * - Drill-down to FocusSessionDetailModal.
 * - Clear empty states when no sessions match.
 */

import { useState, useMemo } from 'react';
import type { FocusSessionRecord } from '../../core/focus/focusTypes';
import { FocusTimerEngine } from '../../core/focus/focusTimerEngine';
import { FocusSessionDetailModal } from './FocusSessionDetailModal';
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  ChevronRight,
  FileQuestion
} from 'lucide-react';

interface FocusSessionHistoryProps {
  sessions: FocusSessionRecord[];
  habitTitleMap: Map<string, string>;
  onDeleteSession?: (id: string) => void;
}

export function FocusSessionHistory({
  sessions,
  habitTitleMap,
  onDeleteSession,
}: FocusSessionHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedHabitId, setSelectedHabitId] = useState<string>('all');
  const [inspectSession, setInspectSession] = useState<FocusSessionRecord | null>(null);

  // Filtered session list
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // Search by title or notes
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = s.title.toLowerCase().includes(query);
        const matchesNotes = s.notes ? s.notes.toLowerCase().includes(query) : false;
        if (!matchesTitle && !matchesNotes) return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && s.status !== selectedStatus) {
        return false;
      }

      // Habit filter
      if (selectedHabitId !== 'all') {
        if (selectedHabitId === 'unlinked' && s.linkedHabitId) return false;
        if (selectedHabitId !== 'unlinked' && s.linkedHabitId !== selectedHabitId) return false;
      }

      return true;
    });
  }, [sessions, searchQuery, selectedStatus, selectedHabitId]);

  const getStatusBadge = (status: FocusSessionRecord['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
            <CheckCircle2 className="w-2.5 h-2.5" /> Completed
          </span>
        );
      case 'interrupted':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded">
            <AlertTriangle className="w-2.5 h-2.5" /> Interrupted
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-400 bg-rose-950/60 border border-rose-800/40 px-2 py-0.5 rounded">
            <XCircle className="w-2.5 h-2.5" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-obsidian-800 border border-obsidian-750 px-2 py-0.5 rounded">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-obsidian-850 border border-obsidian-750 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Keyword Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search focus sessions by title or intention notes..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-obsidian-900 border border-obsidian-750 text-slate-100 placeholder-slate-500 text-xs focus:border-gold-500/60 focus:outline-none"
            />
          </div>

          {/* Status and Habit Selectors */}
          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-2 rounded-xl bg-obsidian-900 border border-obsidian-750 text-slate-200 text-xs focus:border-gold-500/60 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed Only</option>
              <option value="interrupted">Interrupted Only</option>
              <option value="cancelled">Cancelled Only</option>
            </select>

            <select
              value={selectedHabitId}
              onChange={(e) => setSelectedHabitId(e.target.value)}
              className="px-2.5 py-2 rounded-xl bg-obsidian-900 border border-obsidian-750 text-slate-200 text-xs focus:border-gold-500/60 focus:outline-none"
            >
              <option value="all">All Habits</option>
              <option value="unlinked">Unlinked Focus Only</option>
              {Array.from(habitTitleMap.entries()).map(([id, title]) => (
                <option key={id} value={id}>
                  {title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Session History List */}
      {filteredSessions.length > 0 ? (
        <div className="space-y-2">
          {filteredSessions.map((session) => {
            const habitTitle = session.linkedHabitId
              ? habitTitleMap.get(session.linkedHabitId)
              : undefined;

            return (
              <div
                key={session.id}
                onClick={() => setInspectSession(session)}
                className="p-3.5 sm:p-4 rounded-2xl bg-obsidian-850 hover:bg-obsidian-800 border border-obsidian-750 hover:border-gold-500/40 cursor-pointer transition-all flex items-center justify-between gap-4 group"
              >
                {/* Left Meta & Title */}
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-100 group-hover:text-gold-300 transition-colors">
                      {session.title}
                    </span>
                    {getStatusBadge(session.status)}
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      {session.sessionMode === 'custom' ? 'Custom' : 'Pomodoro'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gold-400" />
                      <span>{session.date}</span>
                    </span>
                    <span>·</span>
                    <span>Started {new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {habitTitle && (
                      <>
                        <span>·</span>
                        <span className="text-gold-300/80 truncate max-w-[150px]">{habitTitle}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right Focus Duration */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right font-mono">
                    <span className="text-sm font-bold text-slate-200 block">
                      {FocusTimerEngine.formatDigitalClock(session.actualDurationSeconds)}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      of {session.plannedDurationMinutes}m planned
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-gold-400 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center rounded-3xl bg-obsidian-900 border border-obsidian-750/60 space-y-3">
          <FileQuestion className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="text-base font-semibold text-slate-200 font-display">
            No Focus Sessions Found
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery || selectedStatus !== 'all' || selectedHabitId !== 'all'
              ? 'No sessions match your current filter parameters. Try clearing your search.'
              : 'You have not recorded any focus sessions yet. Start a focus session above to begin accumulating focused time.'}
          </p>
        </div>
      )}

      {/* Inspect Session Modal */}
      <FocusSessionDetailModal
        session={inspectSession}
        isOpen={inspectSession !== null}
        onClose={() => setInspectSession(null)}
        onDeleteSession={onDeleteSession}
        linkedHabitTitle={
          inspectSession?.linkedHabitId
            ? habitTitleMap.get(inspectSession.linkedHabitId)
            : undefined
        }
      />
    </div>
  );
}
