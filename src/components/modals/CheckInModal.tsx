import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { type Habit, type HabitLog, type HabitLogStatus } from '../../core/domain/types';
import { HabitLogService } from '../../core/services/habitLogService';
import { formatCalendarDate, formatFriendlyDate } from '../../core/utils';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  habit: Habit | null;
  targetDate?: string; // YYYY-MM-DD, defaults to today
  existingLog?: HabitLog | null;
  onSuccess: (log: HabitLog) => void;
}

export function CheckInModal({
  isOpen,
  onClose,
  habit,
  targetDate = formatCalendarDate(new Date()),
  existingLog,
  onSuccess
}: CheckInModalProps) {
  const [status, setStatus] = useState<HabitLogStatus>('completed');
  const [numericValue, setNumericValue] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditingExisting = !!existingLog;

  useEffect(() => {
    if (existingLog) {
      setStatus(existingLog.status);
      setNumericValue(existingLog.numericValue !== undefined ? existingLog.numericValue : '');
      setNotes(existingLog.notes || '');
      setCorrectionReason(existingLog.correctionReason || '');
    } else {
      setStatus('completed');
      setNumericValue(habit?.targetValue || '');
      setNotes('');
      setCorrectionReason('');
    }
    setError(null);
  }, [existingLog, habit, isOpen]);

  if (!habit) return null;

  const isQuantitative = habit.type === 'quantitative';
  const isAbstinence = habit.type === 'abstinence';

  // Live calculation for quantitative
  const isTargetMet = isQuantitative
    ? HabitLogService.isTargetFulfilled(
        habit,
        numericValue === '' ? undefined : Number(numericValue)
      )
    : status === 'completed';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isEditingExisting && !correctionReason.trim()) {
        throw new Error('Please provide an audit reason for modifying an existing check-in entry.');
      }

      const log = await HabitLogService.recordCheckIn(habit, targetDate, {
        status: isQuantitative ? (isTargetMet ? 'completed' : 'failed') : status,
        numericValue: isQuantitative && numericValue !== '' ? Number(numericValue) : undefined,
        notes: notes.trim() || undefined,
        reason: isEditingExisting ? correctionReason.trim() : undefined
      });

      onSuccess(log);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record check-in');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span>{isEditingExisting ? 'Correct Daily Entry' : 'Daily Check-In'}</span>
          <Badge variant="gold-subtle" size="sm">
            {formatFriendlyDate(targetDate)}
          </Badge>
        </div>
      }
      description={`Commitment: ${habit.title}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs"
          >
            {error}
          </div>
        )}

        {isEditingExisting && (
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/50 flex items-start gap-2.5 text-xs text-amber-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" aria-hidden="true" />
            <div>
              <span className="font-semibold block">Entry already exists for this date.</span>
              <span>Modifications will be logged in the permanent audit trail.</span>
            </div>
          </div>
        )}

        {/* Abstinence Mode */}
        {isAbstinence && (
          <fieldset className="space-y-2 border-0 p-0 m-0">
            <legend className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
              Sovereign Status
            </legend>
            <div role="radiogroup" aria-label="Sovereign Status" className="grid grid-cols-2 gap-3">
              <button
                type="button"
                role="radio"
                aria-checked={status === 'completed'}
                onClick={() => setStatus('completed')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-900 ${
                  status === 'completed'
                    ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-300 shadow-[0_0_15px_rgba(46,125,78,0.25)]'
                    : 'bg-obsidian-900 border-obsidian-750 text-slate-400 hover:border-obsidian-600'
                }`}
              >
                <ShieldCheck className="w-6 h-6 text-emerald-400" aria-hidden="true" />
                <span className="font-bold text-sm">Maintained Standard</span>
                <span className="text-[11px] text-slate-400 text-center">Clean & resolute today</span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={status === 'failed'}
                onClick={() => setStatus('failed')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-900 ${
                  status === 'failed'
                    ? 'bg-red-950/60 border-red-500/80 text-red-300 shadow-[0_0_15px_rgba(168,58,58,0.25)]'
                    : 'bg-obsidian-900 border-obsidian-750 text-slate-400 hover:border-obsidian-600'
                }`}
              >
                <ShieldAlert className="w-6 h-6 text-red-400" aria-hidden="true" />
                <span className="font-bold text-sm">Setback / Relapse</span>
                <span className="text-[11px] text-slate-400 text-center">Honest accountability</span>
              </button>
            </div>
          </fieldset>
        )}

        {/* Completion Mode */}
        {habit.type === 'completion' && (
          <fieldset className="space-y-2 border-0 p-0 m-0">
            <legend className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
              Completion Status
            </legend>
            <div role="radiogroup" aria-label="Completion Status" className="grid grid-cols-2 gap-3">
              <button
                type="button"
                role="radio"
                aria-checked={status === 'completed'}
                onClick={() => setStatus('completed')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-900 ${
                  status === 'completed'
                    ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-300 shadow-[0_0_15px_rgba(46,125,78,0.25)]'
                    : 'bg-obsidian-900 border-obsidian-750 text-slate-400 hover:border-obsidian-600'
                }`}
              >
                <CheckCircle2 className="w-6 h-6 text-emerald-400" aria-hidden="true" />
                <span className="font-bold text-sm">Completed</span>
                <span className="text-[11px] text-slate-400 text-center">Protocol fulfilled</span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={status === 'failed'}
                onClick={() => setStatus('failed')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-900 ${
                  status === 'failed'
                    ? 'bg-red-950/60 border-red-500/80 text-red-300 shadow-[0_0_15px_rgba(168,58,58,0.25)]'
                    : 'bg-obsidian-900 border-obsidian-750 text-slate-400 hover:border-obsidian-600'
                }`}
              >
                <XCircle className="w-6 h-6 text-red-400" aria-hidden="true" />
                <span className="font-bold text-sm">Missed / Failed</span>
                <span className="text-[11px] text-slate-400 text-center">Not fulfilled today</span>
              </button>
            </div>
          </fieldset>
        )}

        {/* Quantitative Mode */}
        {isQuantitative && (
          <div className="space-y-3 p-4 rounded-xl bg-obsidian-900 border border-obsidian-750">
            <div className="flex items-center justify-between">
              <label htmlFor="checkin-numeric-input" className="text-xs font-semibold text-slate-200">
                Recorded Value ({habit.unit || 'units'})
              </label>
              <Badge variant="gold" size="sm">
                Target: {habit.targetConstraint === 'at_most' ? '≤' : '≥'} {habit.targetValue} {habit.unit}
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="checkin-numeric-input"
                type="number"
                step="any"
                min="0"
                value={numericValue}
                onChange={(e) => setNumericValue(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={`e.g. ${habit.targetValue}`}
                className="w-full bg-obsidian-850 border border-obsidian-700 rounded-lg px-3.5 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-400"
                autoFocus
              />
              <span className="text-sm text-slate-400 font-medium whitespace-nowrap">
                {habit.unit}
              </span>
            </div>

            {numericValue !== '' && (
              <div
                role="status"
                aria-live="polite"
                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                  isTargetMet
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-800 text-amber-300'
                }`}
              >
                <span>
                  {isTargetMet ? '✓ Target successfully met' : '⚠ Below configured target threshold'}
                </span>
                <span className="font-mono font-bold">
                  {isTargetMet ? 'STATUS: COMPLETED' : 'STATUS: FAILED'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Optional Notes */}
        <div>
          <label htmlFor="checkin-notes-input" className="text-[11px] text-slate-400 block mb-1">
            Reflection / Context Note (Optional)
          </label>
          <input
            id="checkin-notes-input"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Finished morning workout with great focus..."
            className="w-full bg-obsidian-900 border border-obsidian-750 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-400"
          />
        </div>

        {/* Audit Correction Reason if modifying */}
        {isEditingExisting && (
          <div>
            <label htmlFor="checkin-correction-reason" className="text-[11px] text-amber-400 font-semibold block mb-1">
              Audit Correction Reason <span className="text-gold-400" aria-hidden="true">*</span>
              <span className="sr-only">(required for corrections)</span>
            </label>
            <input
              id="checkin-correction-reason"
              type="text"
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="e.g. Corrected typo in logged distance; actual was 6km"
              className="w-full bg-obsidian-900 border border-amber-700/60 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-400"
              required
              aria-required="true"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-obsidian-750">
          <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
            {isEditingExisting ? 'Save Audit Correction' : 'Commit Check-In'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
