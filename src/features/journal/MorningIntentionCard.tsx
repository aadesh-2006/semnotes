import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Sun, CheckCircle2, Target, Shield, HelpCircle } from 'lucide-react';
import { ReflectionService } from '../../core/reflection/reflectionService';
import { getDailyPrompts } from '../../core/reflection/reflectionPromptEngine';
import type { MorningIntention } from '../../core/reflection/reflectionTypes';
import { formatCalendarDate } from '../../core/utils';

interface MorningIntentionCardProps {
  date?: string;
  onSaved?: (intention: MorningIntention) => void;
}

export const MorningIntentionCard: React.FC<MorningIntentionCardProps> = ({
  date = formatCalendarDate(new Date()),
  onSaved
}) => {
  const [primaryIntention, setPrimaryIntention] = useState('');
  const [keyCommitment, setKeyCommitment] = useState('');
  const [potentialObstacle, setPotentialObstacle] = useState('');
  const [plannedResponse, setPlannedResponse] = useState('');
  const [personalNote, setPersonalNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const dailyPrompt = getDailyPrompts(date).morning;

  useEffect(() => {
    let mounted = true;
    async function loadExisting() {
      setIsLoading(true);
      try {
        const existing = await ReflectionService.getMorningIntention(date);
        if (mounted && existing) {
          setPrimaryIntention(existing.primaryIntention);
          setKeyCommitment(existing.keyCommitment || '');
          setPotentialObstacle(existing.potentialObstacle || '');
          setPlannedResponse(existing.plannedResponse || '');
          setPersonalNote(existing.personalNote || '');
        }
      } catch (err) {
        console.error('Failed to load morning intention', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadExisting();
    return () => {
      mounted = false;
    };
  }, [date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryIntention.trim()) return;

    try {
      setIsSubmitting(true);
      const saved = await ReflectionService.saveMorningIntention({
        date,
        primaryIntention: primaryIntention.trim(),
        keyCommitment: keyCommitment.trim() || undefined,
        potentialObstacle: potentialObstacle.trim() || undefined,
        plannedResponse: plannedResponse.trim() || undefined,
        personalNote: personalNote.trim() || undefined
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);

      if (onSaved) {
        onSaved(saved);
      }
    } catch (err) {
      console.error('Failed to save morning intention', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-gold-500/30 bg-gradient-to-b from-obsidian-850 to-obsidian-900 shadow-md">
      <CardHeader className="pb-3 border-b border-obsidian-750/70">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-gold-400">
            <Sun className="w-4 h-4 text-amber-400" />
            <span>Morning Intention & Framing</span>
          </CardTitle>
          <span className="text-[11px] font-mono text-gold-400/80 bg-gold-950/60 border border-gold-800/40 px-2 py-0.5 rounded">
            {date}
          </span>
        </div>
        <CardDescription className="text-xs text-slate-400">
          Set your sovereign orientation before reacting to the world.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Morning Prompt Banner */}
        <div className="p-3 rounded-lg bg-obsidian-900 border border-obsidian-750 text-xs">
          <div className="flex items-center gap-1.5 text-gold-400 font-medium mb-1">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Morning Philosophical Prompt:</span>
          </div>
          <p className="text-slate-200 italic font-serif text-sm">
            "{dailyPrompt.prompt}"
          </p>
          {dailyPrompt.subtext && (
            <p className="text-[11px] text-slate-400 mt-1">{dailyPrompt.subtext}</p>
          )}
        </div>

        {isLoading ? (
          <div className="py-6 text-center text-xs text-slate-400">Loading daily intention...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 mb-1">
                <Target className="w-3.5 h-3.5 text-gold-400" />
                <span>Primary Sovereign Intention (Required)</span>
              </label>
              <input
                type="text"
                required
                value={primaryIntention}
                onChange={(e) => setPrimaryIntention(e.target.value)}
                placeholder="e.g. Unshakable calm and presence under all circumstances"
                className="w-full bg-obsidian-900 border border-obsidian-750 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-gold-500/50"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 mb-1">
                <span>Key Commitment for Today</span>
              </label>
              <input
                type="text"
                value={keyCommitment}
                onChange={(e) => setKeyCommitment(e.target.value)}
                placeholder="e.g. 2 hours deep craft without opening browser tabs"
                className="w-full bg-obsidian-900 border border-obsidian-750 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-gold-500/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 mb-1">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>Anticipated Obstacle</span>
                </label>
                <input
                  type="text"
                  value={potentialObstacle}
                  onChange={(e) => setPotentialObstacle(e.target.value)}
                  placeholder="e.g. Midday energy dip or restlessness"
                  className="w-full bg-obsidian-900 border border-obsidian-750 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-gold-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 mb-1">
                  <span>Planned Pre-Commitment Response</span>
                </label>
                <input
                  type="text"
                  value={plannedResponse}
                  onChange={(e) => setPlannedResponse(e.target.value)}
                  placeholder="e.g. Walk outside for 10 mins; no sugar"
                  className="w-full bg-obsidian-900 border border-obsidian-750 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-gold-500/50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 mb-1 block">
                Personal Standard / Note
              </label>
              <textarea
                rows={2}
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value)}
                placeholder="A quiet reminder of who you are choosing to be today..."
                className="w-full bg-obsidian-900 border border-obsidian-750 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-gold-500/50"
              />
            </div>

            {savedSuccess && (
              <div className="p-2.5 rounded-lg bg-gold-950/50 border border-gold-800/60 text-xs text-gold-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-gold-400 shrink-0" />
                <span>Morning intention locked in. Carry this standard forward.</span>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting || !primaryIntention.trim()}
                className="gap-2"
              >
                <Sun className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Saving...' : 'Set Morning Intention'}</span>
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};
