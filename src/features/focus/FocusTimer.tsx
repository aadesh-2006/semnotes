/**
 * SEMNÓTĒS — Centerpiece Focus Timer Component
 * Obsidian & Gold Design System.
 *
 * Implements:
 * - Circular SVG progress meter with smooth stroke animation.
 * - Large monospace digital clock display.
 * - Full controls: Start, Pause, Resume, Reset, Finish/End, Skip Break, Cancel.
 * - Accurate real-time rendering driven by FocusTimerEngine and timestamp reconciliation.
 */

import React, { useState } from 'react';
import type { LiveTimerState } from '../../core/focus/focusTypes';
import { FocusTimerEngine } from '../../core/focus/focusTimerEngine';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  XCircle,
  FastForward,
  Clock,
  Sparkles,
  Coffee,
  Flame,
  AlertTriangle
} from 'lucide-react';

interface FocusTimerProps {
  timerState: LiveTimerState;
  remainingSeconds: number;
  elapsedSeconds: number;
  progressPercent: number;
  linkedHabitTitle?: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onComplete: () => void;
  onInterrupt: () => void;
  onSkipBreak: () => void;
  onCancel: () => void;
  disabled?: boolean;
}

export function FocusTimer({
  timerState,
  remainingSeconds,
  elapsedSeconds,
  progressPercent,
  linkedHabitTitle,
  onStart,
  onPause,
  onResume,
  onReset,
  onComplete,
  onInterrupt,
  onSkipBreak,
  onCancel,
  disabled = false,
}: FocusTimerProps) {
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isInterruptModalOpen, setIsInterruptModalOpen] = useState(false);

  // SVG circular geometry
  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  // Progress stroke fills up as time passes
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const isBreak = timerState.phase === 'short_break' || timerState.phase === 'long_break';

  const getPhaseBadge = () => {
    if (timerState.sessionMode === 'custom') {
      return (
        <Badge variant="gold" size="sm" className="font-mono gap-1">
          <Flame className="w-3 h-3 text-gold-400" />
          <span>Continuous Focus</span>
        </Badge>
      );
    }

    if (timerState.phase === 'focus') {
      return (
        <Badge variant="gold" size="sm" className="font-mono gap-1">
          <Clock className="w-3 h-3 text-gold-400" />
          <span>Cycle {timerState.currentCycle} Focus</span>
        </Badge>
      );
    }

    if (timerState.phase === 'short_break') {
      return (
        <Badge variant="amber" size="sm" className="font-mono gap-1">
          <Coffee className="w-3 h-3 text-amber-400" />
          <span>Short Break</span>
        </Badge>
      );
    }

    return (
      <Badge variant="indigo" size="sm" className="font-mono gap-1">
        <Sparkles className="w-3 h-3 text-indigo-400" />
        <span>Long Break</span>
      </Badge>
    );
  };

  const getStatusBadge = () => {
    switch (timerState.status) {
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-950/60 border border-emerald-800/60 text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Running
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-amber-950/60 border border-amber-800/60 text-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Paused
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-gold-950/60 border border-gold-800/60 text-gold-300">
            <CheckCircle2 className="w-3 h-3 text-gold-400" />
            Finished
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-obsidian-800 border border-obsidian-750 text-slate-400">
            Ready
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-obsidian-850 via-obsidian-900 to-obsidian-950 border border-gold-600/30 shadow-2xl relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Meta Header */}
      <div className="w-full flex items-center justify-between gap-3 mb-6 relative z-10">
        <div className="flex items-center gap-2">
          {getPhaseBadge()}
          {getStatusBadge()}
        </div>

        {linkedHabitTitle && (
          <span className="text-xs font-mono text-slate-400 truncate max-w-[200px] bg-obsidian-800/80 border border-obsidian-750 px-2 py-0.5 rounded-md">
            {linkedHabitTitle}
          </span>
        )}
      </div>

      {/* Session Title & Monospace Note */}
      <div className="text-center space-y-1 mb-6 relative z-10">
        <h3 className="text-lg sm:text-xl font-bold font-display text-slate-100 tracking-tight">
          {timerState.title}
        </h3>
        {timerState.notes && (
          <p className="text-xs text-slate-400 italic max-w-md mx-auto line-clamp-1">
            "{timerState.notes}"
          </p>
        )}
      </div>

      {/* Centerpiece Circular Progress Ring */}
      <div className="relative flex items-center justify-center my-2 select-none">
        <svg className="w-72 h-72 sm:w-80 sm:h-80 -rotate-90 transform" viewBox="0 0 300 300">
          {/* Background Track */}
          <circle
            cx="150"
            cy="150"
            r={radius}
            stroke="currentColor"
            strokeWidth="10"
            className="text-obsidian-800/80"
            fill="transparent"
          />
          {/* Progress Arc */}
          <circle
            cx="150"
            cy="150"
            r={radius}
            stroke="currentColor"
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`transition-all duration-300 ease-out ${
              isBreak ? 'text-amber-400' : 'text-gold-400'
            }`}
            fill="transparent"
          />
        </svg>

        {/* Center Clock Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-5xl sm:text-6xl font-extrabold tracking-tight text-slate-100 tabular-nums drop-shadow-lg">
            {FocusTimerEngine.formatDigitalClock(remainingSeconds)}
          </span>

          <div className="flex items-center gap-2 mt-2 text-xs font-mono text-slate-400">
            <span>Elapsed: {FocusTimerEngine.formatDigitalClock(elapsedSeconds)}</span>
            <span>·</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
        </div>
      </div>

      {/* Main Control Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-8 relative z-10">
        {timerState.status === 'idle' && (
          <Button
            variant="gold"
            size="lg"
            disabled={disabled}
            onClick={onStart}
            className="px-8 py-3 text-sm font-semibold shadow-gold-md gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isBreak ? 'Start Break' : 'Start Focus'}</span>
          </Button>
        )}

        {timerState.status === 'running' && (
          <>
            <Button
              variant="outline"
              size="lg"
              disabled={disabled}
              onClick={onPause}
              className="px-6 py-2.5 text-sm gap-2 border-obsidian-700 bg-obsidian-800 hover:bg-obsidian-750 text-slate-200"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause</span>
            </Button>

            {!isBreak && (
              <Button
                variant="gold"
                size="lg"
                disabled={disabled}
                onClick={onComplete}
                className="px-6 py-2.5 text-sm gap-2 shadow-gold-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finish Session</span>
              </Button>
            )}

            {isBreak && (
              <Button
                variant="outline"
                size="lg"
                disabled={disabled}
                onClick={onSkipBreak}
                className="px-6 py-2.5 text-sm gap-2 border-amber-500/40 text-amber-300 hover:bg-amber-950/40"
              >
                <FastForward className="w-4 h-4" />
                <span>Skip Break</span>
              </Button>
            )}
          </>
        )}

        {timerState.status === 'paused' && (
          <>
            <Button
              variant="gold"
              size="lg"
              disabled={disabled}
              onClick={onResume}
              className="px-8 py-2.5 text-sm gap-2 shadow-gold-md"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Resume</span>
            </Button>

            <Button
              variant="outline"
              size="lg"
              disabled={disabled}
              onClick={() => setIsInterruptModalOpen(true)}
              className="px-5 py-2.5 text-sm gap-1.5 border-obsidian-700 text-slate-300"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
              <span>End Early</span>
            </Button>
          </>
        )}

        {/* Auxiliary Controls (Reset & Cancel) */}
        {timerState.status !== 'idle' && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-obsidian-750">
            <button
              type="button"
              disabled={disabled}
              onClick={onReset}
              className="p-2.5 rounded-xl bg-obsidian-800/80 hover:bg-obsidian-750 border border-obsidian-750 text-slate-400 hover:text-slate-200 text-xs transition-all cursor-pointer"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setIsCancelModalOpen(true)}
              className="p-2.5 rounded-xl bg-obsidian-800/80 hover:bg-rose-950/40 border border-obsidian-750 hover:border-rose-800/50 text-slate-400 hover:text-rose-300 text-xs transition-all cursor-pointer"
              title="Cancel Session"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Session Cancellation */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Discard Focus Session?"
        description="Are you sure you want to cancel this focus session? Cancelled sessions are not counted towards completed goals or focus time."
        size="sm"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/40 text-xs text-rose-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>
              This session will be marked as cancelled and discarded from focus metrics.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-obsidian-750">
            <Button variant="ghost" size="sm" onClick={() => setIsCancelModalOpen(false)}>
              Keep Session
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-rose-800/60 text-rose-400 hover:bg-rose-950/60"
              onClick={() => {
                setIsCancelModalOpen(false);
                onCancel();
              }}
            >
              Yes, Cancel Session
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal for Ending Early (Interruption) */}
      <Modal
        isOpen={isInterruptModalOpen}
        onClose={() => setIsInterruptModalOpen(false)}
        title="End Focus Session Early?"
        description="Save your progress so far. The actual focused time elapsed will be recorded accurately."
        size="sm"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-xl bg-obsidian-850 border border-obsidian-750 text-xs text-slate-300 space-y-1">
            <div className="flex justify-between font-mono">
              <span className="text-slate-400">Planned Duration:</span>
              <span>{FocusTimerEngine.formatDigitalClock(timerState.plannedDurationSeconds)}</span>
            </div>
            <div className="flex justify-between font-mono font-bold text-gold-300">
              <span>Actual Focused:</span>
              <span>{FocusTimerEngine.formatDigitalClock(elapsedSeconds)}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-obsidian-750">
            <Button variant="ghost" size="sm" onClick={() => setIsInterruptModalOpen(false)}>
              Continue Focusing
            </Button>
            <Button
              variant="gold"
              size="sm"
              onClick={() => {
                setIsInterruptModalOpen(false);
                onInterrupt();
              }}
            >
              Save & End Early
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
