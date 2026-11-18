import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import {
  type Habit,
  type HabitCategory,
  type HabitType,
  type TargetConstraint,
  CreateHabitInputSchema
} from '../../core/domain/types';
import { formatCalendarDate } from '../../core/utils';
import { HabitService } from '../../core/services/habitService';
import { Sparkles, Target, Shield, Dumbbell, Brain, Code } from 'lucide-react';

interface HabitFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  habitToEdit?: Habit;
  onSuccess: (habit: Habit) => void;
}

const CATEGORIES: { id: HabitCategory; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'abstinence', label: 'Abstinence', icon: <Shield className="w-4 h-4" />, desc: 'Digital purity, sobriety, vices' },
  { id: 'craft', label: 'Craft & Code', icon: <Code className="w-4 h-4" />, desc: 'DSA, software, writing' },
  { id: 'body', label: 'Body & Health', icon: <Dumbbell className="w-4 h-4" />, desc: 'Workouts, runs, nutrition' },
  { id: 'mind', label: 'Mind & Stoicism', icon: <Brain className="w-4 h-4" />, desc: 'Reading, meditation, review' },
  { id: 'discipline', label: 'Discipline', icon: <Sparkles className="w-4 h-4" />, desc: 'Cold shower, sleep schedule' },
  { id: 'custom', label: 'Custom', icon: <Target className="w-4 h-4" />, desc: 'Personal sovereign habit' },
];

const DAYS = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

export function HabitFormModal({
  isOpen,
  onClose,
  habitToEdit,
  onSuccess
}: HabitFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<HabitCategory>('abstinence');
  const [type, setType] = useState<HabitType>('abstinence');
  const [targetValue, setTargetValue] = useState<number | ''>('');
  const [unit, setUnit] = useState('');
  const [targetConstraint, setTargetConstraint] = useState<TargetConstraint>('at_least');
  const [frequency, setFrequency] = useState<'daily' | 'selected_days'>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [startDate, setStartDate] = useState(formatCalendarDate(new Date()));
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (habitToEdit) {
      setTitle(habitToEdit.title);
      setDescription(habitToEdit.description || '');
      setCategory(habitToEdit.category);
      setType(habitToEdit.type);
      setTargetValue(habitToEdit.targetValue !== undefined ? habitToEdit.targetValue : '');
      setUnit(habitToEdit.unit || '');
      setTargetConstraint(habitToEdit.targetConstraint || 'at_least');
      setFrequency(habitToEdit.schedule.frequency);
      setSelectedDays(habitToEdit.schedule.selectedDays);
      setStartDate(habitToEdit.startDate);
      setEndDate(habitToEdit.endDate || '');
      setNotes(habitToEdit.notes || '');
    } else {
      // Reset defaults
      setTitle('');
      setDescription('');
      setCategory('abstinence');
      setType('abstinence');
      setTargetValue('');
      setUnit('');
      setTargetConstraint('at_least');
      setFrequency('daily');
      setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
      setStartDate(formatCalendarDate(new Date()));
      setEndDate('');
      setNotes('');
    }
    setErrors({});
  }, [habitToEdit, isOpen]);

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) return; // Must have at least 1 day
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort((a, b) => a - b));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    const payload: any = {
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      type,
      schedule: {
        frequency,
        selectedDays: frequency === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : selectedDays
      },
      startDate,
      endDate: endDate || undefined,
      notes: notes.trim() || undefined
    };

    if (type === 'quantitative') {
      payload.targetValue = targetValue === '' ? undefined : Number(targetValue);
      payload.unit = unit.trim() || undefined;
      payload.targetConstraint = targetConstraint;
    }

    const validation = CreateHabitInputSchema.safeParse(payload);
    if (!validation.success) {
      const errMap: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        errMap[path || 'form'] = issue.message;
      });
      setErrors(errMap);
      setIsSubmitting(false);
      return;
    }

    try {
      let savedHabit: Habit;
      if (habitToEdit) {
        savedHabit = await HabitService.updateHabit(habitToEdit.id, payload);
      } else {
        savedHabit = await HabitService.createHabit(payload);
      }
      onSuccess(savedHabit);
      onClose();
    } catch (err: any) {
      setErrors({ form: err.message || 'Failed to establish habit' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={habitToEdit ? 'Edit Discipline Habit' : 'Architect New Habit'}
      description="Configure an uncompromising, independently tracked discipline commitment."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {errors.form && (
          <div
            role="alert"
            aria-live="polite"
            className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs"
          >
            {errors.form}
          </div>
        )}

        {/* Title & Description */}
        <div className="space-y-3">
          <div>
            <label
              htmlFor="habit-name-input"
              className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1"
            >
              Habit Name <span className="text-gold-400" aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <input
              id="habit-name-input"
              type="text"
              required
              aria-required="true"
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? 'habit-name-error' : undefined}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Digital Purity, DSA Practice, 5km Daily Run"
              className="w-full bg-obsidian-900 border border-obsidian-750 focus:border-gold-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-900 transition-colors"
              autoFocus
            />
            {errors.title && (
              <span id="habit-name-error" role="alert" className="text-xs text-red-400 mt-1 block">
                {errors.title}
              </span>
            )}
          </div>

          <div>
            <label
              htmlFor="habit-desc-input"
              className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1"
            >
              Description / Standard of Excellence
            </label>
            <textarea
              id="habit-desc-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Describe what sovereign fulfillment of this commitment looks like..."
              className="w-full bg-obsidian-900 border border-obsidian-750 focus:border-gold-500 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-900 transition-colors"
            />
          </div>
        </div>

        {/* Tracking Type */}
        <fieldset className="space-y-2 border-0 p-0 m-0">
          <legend className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
            Tracking Type <span className="text-gold-400" aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </legend>
          <div role="radiogroup" aria-label="Tracking Type" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              {
                id: 'abstinence' as HabitType,
                title: 'Abstinence',
                sub: 'Succeeds by avoiding trigger (Maintained vs Setback)'
              },
              {
                id: 'completion' as HabitType,
                title: 'Completion',
                sub: 'Binary achievement (Done vs Missed)'
              },
              {
                id: 'quantitative' as HabitType,
                title: 'Quantitative',
                sub: 'Measured target (Steps, minutes, liters)'
              }
            ].map((t) => (
              <button
                type="button"
                role="radio"
                aria-checked={type === t.id}
                key={t.id}
                onClick={() => setType(t.id)}
                className={`p-3 rounded-xl border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-900 ${
                  type === t.id
                    ? 'bg-gold-500/15 border-gold-400/80 text-gold-200 shadow-gold-sm'
                    : 'bg-obsidian-900/60 border-obsidian-750 text-slate-400 hover:text-slate-200 hover:border-obsidian-600'
                }`}
              >
                <span className="font-semibold text-xs block">{t.title}</span>
                <span className="text-[11px] leading-tight block mt-1 opacity-80">{t.sub}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {/* Quantitative Target Details (if applicable) */}
        {type === 'quantitative' && (
          <div className="p-3.5 rounded-xl bg-obsidian-900/80 border border-obsidian-750 space-y-3">
            <span className="text-xs font-semibold text-gold-300 block">Target Configuration</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="habit-target-value" className="text-[11px] text-slate-400 block mb-1">
                  Target Value
                </label>
                <input
                  id="habit-target-value"
                  type="number"
                  step="any"
                  min="0.01"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 5000"
                  className="w-full bg-obsidian-850 border border-obsidian-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-400"
                />
              </div>

              <div>
                <label htmlFor="habit-unit" className="text-[11px] text-slate-400 block mb-1">
                  Unit
                </label>
                <input
                  id="habit-unit"
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="e.g. steps, pages, mins"
                  className="w-full bg-obsidian-850 border border-obsidian-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-400"
                />
              </div>

              <div>
                <label htmlFor="habit-constraint" className="text-[11px] text-slate-400 block mb-1">
                  Condition
                </label>
                <select
                  id="habit-constraint"
                  value={targetConstraint}
                  onChange={(e) => setTargetConstraint(e.target.value as TargetConstraint)}
                  className="w-full bg-obsidian-850 border border-obsidian-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-400"
                >
                  <option value="at_least">At least (≥ target)</option>
                  <option value="at_most">At most (≤ target)</option>
                </select>
              </div>
            </div>
            {errors.targetValue && (
              <span role="alert" className="text-xs text-red-400 block">
                {errors.targetValue}
              </span>
            )}
          </div>
        )}

        {/* Category Picker */}
        <fieldset className="space-y-2 border-0 p-0 m-0">
          <legend className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
            Category
          </legend>
          <div role="radiogroup" aria-label="Habit Category" className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                type="button"
                role="radio"
                aria-checked={category === cat.id}
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-900 ${
                  category === cat.id
                    ? 'bg-gold-500/15 border-gold-400/80 text-gold-300 font-medium'
                    : 'bg-obsidian-900 border-obsidian-750 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className={category === cat.id ? 'text-gold-400' : 'text-slate-500'} aria-hidden="true">
                  {cat.icon}
                </span>
                <span className="truncate">{cat.label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {/* Schedule */}
        <div className="space-y-3 p-3.5 rounded-xl bg-obsidian-900/80 border border-obsidian-750">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200">Tracking Schedule</span>
            <div role="radiogroup" aria-label="Tracking Frequency" className="flex items-center gap-1 bg-obsidian-850 p-1 rounded-lg border border-obsidian-750 text-xs">
              <button
                type="button"
                role="radio"
                aria-checked={frequency === 'daily'}
                onClick={() => setFrequency('daily')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${
                  frequency === 'daily'
                    ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Every Day
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={frequency === 'selected_days'}
                onClick={() => setFrequency('selected_days')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${
                  frequency === 'selected_days'
                    ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Selected Days
              </button>
            </div>
          </div>

          {frequency === 'selected_days' && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] text-slate-400 block">Select active weekdays:</span>
              <div role="group" aria-label="Active Weekdays" className="flex items-center justify-between gap-1.5">
                {DAYS.map((d) => {
                  const isSelected = selectedDays.includes(d.value);
                  return (
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isSelected}
                      key={d.value}
                      onClick={() => toggleDay(d.value)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${
                        isSelected
                          ? 'bg-gold-500/20 text-gold-300 border border-gold-500/60 shadow-gold-sm'
                          : 'bg-obsidian-850 text-slate-500 border border-obsidian-750 hover:text-slate-300'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label htmlFor="habit-start-date" className="text-[11px] text-slate-400 block mb-1">
                Start Date
              </label>
              <input
                id="habit-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-obsidian-850 border border-obsidian-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-400 font-mono"
              />
            </div>

            <div>
              <label htmlFor="habit-end-date" className="text-[11px] text-slate-400 block mb-1">
                End Date (Optional)
              </label>
              <input
                id="habit-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-obsidian-850 border border-obsidian-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-400 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-obsidian-750">
          <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
            {habitToEdit ? 'Save Changes' : 'Establish Habit'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
