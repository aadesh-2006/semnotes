import { useState } from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { type Achievement } from '../../core/domain/types';
import { RewardService } from '../../core/milestones/rewardService';
import { formatFriendlyDate, formatCalendarDate } from '../../core/utils';
import { Trophy, CheckCircle2, AlertCircle, Quote } from 'lucide-react';

interface ClaimRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievement: Achievement | null;
  habitName?: string;
  onSuccess: (updatedAchievement: Achievement) => void;
}

export function ClaimRewardModal({
  isOpen,
  onClose,
  achievement,
  habitName,
  onSuccess
}: ClaimRewardModalProps) {
  const [claimNotes, setClaimNotes] = useState('');
  const [claimDate, setClaimDate] = useState(formatCalendarDate(new Date()));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!achievement) return null;

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const updated = await RewardService.claimReward(achievement.id, {
        claimNotes: claimNotes.trim() || undefined,
        claimedAt: `${claimDate}T${new Date().toISOString().split('T')[1] || '12:00:00.000Z'}`
      });

      onSuccess(updated);
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Failed to claim reward.');
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
          <Trophy className="w-5 h-5 text-gold-400" aria-hidden="true" />
          <span>Claim Milestone Reward</span>
        </div>
      }
      description="Honor your discipline. Claim your well-deserved reward."
    >
      <form onSubmit={handleClaim} className="space-y-5" noValidate>
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

        {/* Celebratory Reward Card */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-charcoal-900/90 to-charcoal-950 border border-gold-500/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-gold-400/90">
                {habitName || 'Discipline Milestone'}
              </div>
              <h3 className="text-lg font-serif font-bold text-charcoal-50 mt-0.5">
                {achievement.rewardTitle}
              </h3>
            </div>
            <Badge variant="gold" className="shrink-0 font-mono text-xs font-semibold px-2.5 py-1">
              {achievement.thresholdDays} Days Unlocked
            </Badge>
          </div>

          {achievement.rewardDescription && (
            <p className="text-xs text-charcoal-300 mb-3 leading-relaxed">
              {achievement.rewardDescription}
            </p>
          )}

          {achievement.personalNote && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-charcoal-950/80 border border-charcoal-800 text-xs text-charcoal-300 italic mb-2">
              <Quote className="w-3.5 h-3.5 text-gold-500/60 shrink-0 mt-0.5" aria-hidden="true" />
              <span>"{achievement.personalNote}"</span>
            </div>
          )}

          <div className="flex items-center gap-4 text-[11px] text-charcoal-400 pt-2 border-t border-charcoal-800/80">
            <div>
              Unlocked on: <span className="text-charcoal-200 font-medium">{formatFriendlyDate(achievement.achievedDate)}</span>
            </div>
            {achievement.rewardCategory && (
              <div>
                Category: <span className="text-charcoal-200 font-medium">{achievement.rewardCategory}</span>
              </div>
            )}
          </div>
        </div>

        {/* Claim Date */}
        <div>
          <label htmlFor="claim-date-input" className="block text-xs font-semibold uppercase tracking-wider text-charcoal-300 mb-1.5">
            Date of Claim / Celebration <span className="text-gold-400" aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </label>
          <input
            id="claim-date-input"
            type="date"
            required
            aria-required="true"
            value={claimDate}
            onChange={(e) => setClaimDate(e.target.value)}
            className="w-full bg-charcoal-900 border border-charcoal-700/80 rounded-lg px-3.5 py-2.5 text-sm text-charcoal-100 focus:outline-none focus:border-gold-500/70 focus-visible:ring-2 focus-visible:ring-gold-400"
          />
        </div>

        {/* Optional Reflection Notes */}
        <div>
          <label htmlFor="claim-notes-input" className="block text-xs font-semibold uppercase tracking-wider text-charcoal-300 mb-1.5">
            Celebration Reflection (Optional)
          </label>
          <textarea
            id="claim-notes-input"
            rows={3}
            value={claimNotes}
            onChange={(e) => setClaimNotes(e.target.value)}
            placeholder="How did you celebrate or honor this milestone? What feelings or insights arose?"
            className="w-full bg-charcoal-900 border border-charcoal-700/80 rounded-lg px-3.5 py-2.5 text-xs text-charcoal-100 placeholder-charcoal-500 focus:outline-none focus:border-gold-500/70 focus-visible:ring-2 focus-visible:ring-gold-400 resize-none"
          />
        </div>

        {/* Strict Invariant Disclaimer */}
        <p className="text-[11px] text-charcoal-400 italic">
          Claiming this reward records your celebration in the reward ledger. It never resets or modifies your active streak.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-charcoal-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Later
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            <CheckCircle2 className="w-4 h-4 mr-1.5 text-obsidian-950" aria-hidden="true" />
            {isSubmitting ? 'Recording...' : 'Confirm Reward Claimed'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
