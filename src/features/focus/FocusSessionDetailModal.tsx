/**
 * SEMNÓTĒS — Focus Session Detail Modal
 * Obsidian & Gold Design System.
 *
 * Detailed inspection of a historical focus session with complete audit telemetry.
 */

import React from 'react';
import type { FocusSessionRecord } from '../../core/focus/focusTypes';
import { FocusTimerEngine } from '../../core/focus/focusTimerEngine';
import { Modal } from '../../components/ui/modal';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Clock,
  Calendar,
  Tag,
  Link2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  Coffee,
  Flame,
  FileText
} from 'lucide-react';

interface FocusSessionDetailModalProps {
  session: FocusSessionRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleteSession?: (id: string) => void;
  linkedHabitTitle?: string;
}

export function FocusSessionDetailModal({
  session,
  isOpen,
  onClose,
  onDeleteSession,
  linkedHabitTitle,
}: FocusSessionDetailModalProps) {
  if (!session) return null;

  const getStatusBadge = () => {
    switch (session.status) {
      case 'completed':
        return (
          <Badge variant="gold" size="sm" className="font-mono gap-1">
            <CheckCircle2 className="w-3 h-3 text-gold-400" />
            <span>Completed</span>
          </Badge>
        );
      case 'interrupted':
        return (
          <Badge variant="amber" size="sm" className="font-mono gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>Interrupted Early</span>
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" size="sm" className="font-mono gap-1 text-rose-400 border-rose-800/40">
            <XCircle className="w-3 h-3 text-rose-400" />
            <span>Cancelled</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" size="sm" className="font-mono">
            {session.status}
          </Badge>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Focus Session Telemetry"
      description={`Session ID: ${session.id.substring(0, 8)}...`}
      size="md"
    >
      <div className="space-y-5 pt-2">
        {/* Header Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-obsidian-850 border border-obsidian-750">
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <Badge variant="outline" size="sm" className="font-mono text-slate-300">
              {session.sessionMode === 'custom' ? 'Continuous Custom' : 'Pomodoro Cycles'}
            </Badge>
          </div>
          <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-gold-400" />
            <span>{session.date}</span>
          </span>
        </div>

        {/* Title & Habit */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <Tag className="w-3.5 h-3.5 text-gold-400" />
            <span>Activity Title</span>
          </div>
          <p className="text-lg font-bold font-display text-slate-100">
            {session.title}
          </p>

          {linkedHabitTitle && (
            <div className="flex items-center gap-1.5 text-xs text-gold-300 pt-1">
              <Link2 className="w-3 h-3 text-gold-400" />
              <span>Linked to habit: <strong>{linkedHabitTitle}</strong></span>
            </div>
          )}
        </div>

        {/* Duration Invariants Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-obsidian-850 border border-obsidian-750 text-center space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Planned
            </span>
            <span className="text-base font-bold font-mono text-slate-200">
              {session.plannedDurationMinutes}m
            </span>
          </div>

          <div className="p-3 rounded-xl bg-obsidian-850 border border-gold-500/40 text-center space-y-1">
            <span className="text-[10px] font-mono text-gold-400 uppercase tracking-wider flex items-center justify-center gap-1">
              <Flame className="w-3 h-3" /> Actual Focus
            </span>
            <span className="text-base font-bold font-mono text-gold-300">
              {FocusTimerEngine.formatDigitalClock(session.actualDurationSeconds)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-obsidian-850 border border-obsidian-750 text-center space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1">
              <Coffee className="w-3 h-3 text-amber-400" /> Break Time
            </span>
            <span className="text-base font-bold font-mono text-slate-300">
              {session.breakDurationSeconds > 0
                ? FocusTimerEngine.formatDigitalClock(session.breakDurationSeconds)
                : '00:00'}
            </span>
          </div>
        </div>

        {/* Timestamps */}
        <div className="p-3 rounded-xl bg-obsidian-900 border border-obsidian-750 text-xs font-mono text-slate-400 space-y-1">
          <div className="flex justify-between">
            <span>Started:</span>
            <span className="text-slate-200">{new Date(session.startedAt).toLocaleTimeString()}</span>
          </div>
          {session.endedAt && (
            <div className="flex justify-between">
              <span>Finished:</span>
              <span className="text-slate-200">{new Date(session.endedAt).toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {/* Session Intention / Notes */}
        {session.notes && (
          <div className="space-y-1.5 p-3 rounded-xl bg-obsidian-850 border border-obsidian-750">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
              <FileText className="w-3 h-3 text-gold-400" />
              <span>Notes & Intention</span>
            </span>
            <p className="text-xs text-slate-200 italic font-serif">
              "{session.notes}"
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-obsidian-750">
          {onDeleteSession ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 text-xs gap-1.5"
              onClick={() => {
                onDeleteSession(session.id);
                onClose();
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Session</span>
            </Button>
          ) : <div />}

          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
