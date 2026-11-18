import { useState, useEffect } from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { type Milestone } from '../../core/domain/types';
import { MilestoneService } from '../../core/milestones/milestoneService';
import { AchievementEngine } from '../../core/milestones/achievementEngine';
import { Award, AlertCircle, Sparkles } from 'lucide-react';

interface MilestoneFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  habitId: string;
  habitName?: string;
  existingMilestone?: Milestone | null;
  onSuccess: (milestone: Milestone) => void;
}

const PRESET_CATEGORIES = [
  'Personal Treat',
  'Leisure & Rest',
  'Books & Knowledge',
  'Gear & Tools',
  'Experience',
  'Celebration'
];

export function MilestoneFormModal({
  isOpen,
  onClose,
  habitId,
  habitName,
  existingMilestone,
  onSuccess
}: MilestoneFormModalProps) {
  const [thresholdDays, setThresholdDays] = useState<number | ''>(7);
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');
  const [rewardCategory, setRewardCategory] = useState('Personal Treat');
  const [personalNote, setPersonalNote] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(existingMilestone);

  useEffect(() => {
    if (existingMilestone) {
      setThresholdDays(existingMilestone.thresholdDays);
      setRewardTitle(existingMilestone.rewardTitle);
      setRewardDescription(existingMilestone.rewardDescription || '');
      setRewardCategory(existingMilestone.rewardCategory || 'Personal Treat');
      setPersonalNote(existingMilestone.personalNote || '');
      setIsEnabled(existingMilestone.isEnabled);
    } else {
      setThresholdDays(7);
      setRewardTitle('');
      setRewardDescription('');
      setRewardCategory('Personal Treat');
      setPersonalNote('');
      setIsEnabled(true);
    }
    setError(null);
  }, [existingMilestone, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedThreshold = Number(thresholdDays);
    if (!Number.isInteger(parsedThreshold) || parsedThreshold <= 0) {
      setError('Threshold must be a whole positive number greater than 0.');
      return;
    }

    if (!rewardTitle.trim()) {
      setError('Please provide a reward name.');
      return;
    }

    setIsSubmitting(true);
    try {
      let saved: Milestone;
      if (isEditing && existingMilestone) {
        saved = await MilestoneService.updateMilestone(existingMilestone.id, {
          thresholdDays: parsedThreshold,
          rewardTitle: rewardTitle.trim(),
          rewardDescription: rewardDescription.trim() || undefined,
          rewardCategory: rewardCategory.trim() || undefined,
          personalNote: personalNote.trim() || undefined,
          isEnabled
        });
      } else {
        saved = await MilestoneService.createMilestone({
          habitId,
          thresholdDays: parsedThreshold,
          rewardTitle: rewardTitle.trim(),
          rewardDescription: rewardDescription.trim() || undefined,
          rewardCategory: rewardCategory.trim() || undefined,
          personalNote: personalNote.trim() || undefined,
          isEnabled
        });
      }

      await AchievementEngine.evaluateAndRecordAchievements(habitId);

      onSuccess(saved);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to establish milestone');
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
          <Award className="w-5 h-5 text-gold-400" aria-hidden="true" />
          <span>{isEditing ? 'Edit Milestone & Reward' : 'New Milestone & Reward'}</span>
        </div>
      }
      description={
        habitName
          ? `Define an independent streak milestone and celebratory reward for "${habitName}".`
          : 'Define an independent streak milestone and celebratory reward.'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="flex items-start gap-2.5 p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Threshold Days */}
        <div>
          <label htmlFor="milestone-threshold" className="block text-xs font-semibold uppercase tracking-wider text-charcoal-300 mb-1.5">
            Streak Threshold (Consecutive Days) <span className="text-gold-400" aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </label>
          <div className="relative">
            <input
              id="milestone-threshold"
              type="number"
              min="1"
              step="1"
              required
              aria-required="true"
              value={thresholdDays}
              onChange={(e) => setThresholdDays(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
              placeholder="e.g. 7, 14, 30, 90"
              className="w-full bg-charcoal-900 border border-charcoal-700/80 rounded-lg px-3.5 py-2.5 text-sm text-charcoal-100 placeholder-charcoal-500 focus:outline-none focus:border-gold-500/70 focus-visible:ring-2 focus-visible:ring-gold-400 font-mono"
            />
            <span className="absolute right-3.5 top-2.5 text-xs text-charcoal-400 font-sans pointer-events-none" aria-hidden="true">
              days
            </span>
          </div>
          <p className="text-[11px] text-charcoal-400 mt-1">
            Achieved strictly when your active streak reaches this exact number of successful scheduled days.
          </p>
        </div>

        {/* Reward Name */}
        <div>
          <label htmlFor="milestone-reward-title" className="block text-xs font-semibold uppercase tracking-wider text-charcoal-300 mb-1.5">
            Reward Title <span className="text-gold-400" aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </label>
          <input
            id="milestone-reward-title"
            type="text"
            required
            aria-required="true"
            value={rewardTitle}
            onChange={(e) => setRewardTitle(e.target.value)}
            placeholder="e.g. Specialty Coffee Tasting, New Hardcover Book, Rest Day"
            className="w-full bg-charcoal-900 border border-charcoal-700/80 rounded-lg px-3.5 py-2.5 text-sm text-charcoal-100 placeholder-charcoal-500 focus:outline-none focus:border-gold-500/70 focus-visible:ring-2 focus-visible:ring-gold-400"
          />
        </div>

        {/* Reward Category & Quick Select */}
        <div>
          <label htmlFor="milestone-reward-category" className="block text-xs font-semibold uppercase tracking-wider text-charcoal-300 mb-1.5">
            Reward Category
          </label>
          <div role="group" aria-label="Preset Reward Categories" className="flex flex-wrap gap-1.5 mb-2">
            {PRESET_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setRewardCategory(cat)}
                className={`text-[11px] px-2.5 py-1 rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${
                  rewardCategory === cat
                    ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40 font-medium'
                    : 'bg-charcoal-900/60 text-charcoal-400 border border-charcoal-800 hover:text-charcoal-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <input
            id="milestone-reward-category"
            type="text"
            value={rewardCategory}
            onChange={(e) => setRewardCategory(e.target.value)}
            placeholder="Custom Category"
            className="w-full bg-charcoal-900 border border-charcoal-700/80 rounded-lg px-3.5 py-2 text-xs text-charcoal-100 placeholder-charcoal-500 focus:outline-none focus:border-gold-500/70 focus-visible:ring-2 focus-visible:ring-gold-400"
          />
        </div>

        {/* Reward Description */}
        <div>
          <label htmlFor="milestone-reward-desc" className="block text-xs font-semibold uppercase tracking-wider text-charcoal-300 mb-1.5">
            Reward Details (Optional)
          </label>
          <textarea
            id="milestone-reward-desc"
            rows={2}
            value={rewardDescription}
            onChange={(e) => setRewardDescription(e.target.value)}
            placeholder="What does this reward entail? Specific treats, experiences, or gear."
            className="w-full bg-charcoal-900 border border-charcoal-700/80 rounded-lg px-3.5 py-2 text-xs text-charcoal-100 placeholder-charcoal-500 focus:outline-none focus:border-gold-500/70 focus-visible:ring-2 focus-visible:ring-gold-400 resize-none"
          />
        </div>

        {/* Personal Note */}
        <div>
          <label htmlFor="milestone-personal-note" className="block text-xs font-semibold uppercase tracking-wider text-charcoal-300 mb-1.5">
            Personal Reflection Note (Optional)
          </label>
          <textarea
            id="milestone-personal-note"
            rows={2}
            value={personalNote}
            onChange={(e) => setPersonalNote(e.target.value)}
            placeholder="Why does reaching this milestone matter to you personally?"
            className="w-full bg-charcoal-900 border border-charcoal-700/80 rounded-lg px-3.5 py-2 text-xs text-charcoal-100 placeholder-charcoal-500 focus:outline-none focus:border-gold-500/70 focus-visible:ring-2 focus-visible:ring-gold-400 resize-none"
          />
        </div>

        {/* Enabled Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-charcoal-900/60 border border-charcoal-800">
          <div>
            <div className="text-xs font-medium text-charcoal-200">Active Milestone</div>
            <div className="text-[11px] text-charcoal-400">
              When active, eligible streak runs automatically unlock this reward.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isEnabled}
            aria-label="Toggle active milestone status"
            onClick={() => setIsEnabled(!isEnabled)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${
              isEnabled ? 'bg-gold-500' : 'bg-charcoal-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-obsidian-950 shadow ring-0 transition duration-200 ease-in-out ${
                isEnabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-charcoal-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            <Sparkles className="w-4 h-4 mr-1.5 text-obsidian-950" aria-hidden="true" />
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Milestone' : 'Establish Milestone'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
