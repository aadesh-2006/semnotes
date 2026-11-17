import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Moon, CheckCircle2, Heart, Award, ArrowUpRight, HelpCircle } from 'lucide-react';
import { ReflectionService } from '../../core/reflection/reflectionService';
import { getDailyPrompts } from '../../core/reflection/reflectionPromptEngine';
import type { EveningDebrief } from '../../core/reflection/reflectionTypes';
import { formatCalendarDate } from '../../core/utils';

interface EveningReflectionCardProps {
  date?: string;
  onSaved?: (debrief: EveningDebrief) => void;
}

export const EveningReflectionCard: React.FC<EveningReflectionCardProps> = ({
  date = formatCalendarDate(new Date()),
  onSaved
}) => {
  const [wentWell, setWentWell] = useState('');
  const [difficultiesFaced, setDifficultiesFaced] = useState('');
  const [lessonsLearned, setLessonsLearned] = useState('');
  const [tomorrowImprovements, setTomorrowImprovements] = useState('');
  const [gratitude, setGratitude] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const dailyPrompt = getDailyPrompts(date).evening;

  useEffect(() => {
    let mounted = true;
    async function loadExisting() {
      setIsLoading(true);
      try {
        const existing = await ReflectionService.getEveningDebrief(date);
        if (mounted && existing) {
          setWentWell(existing.wentWell || '');
          setDifficultiesFaced(existing.difficultiesFaced || '');
          setLessonsLearned(existing.lessonsLearned || '');
          setTomorrowImprovements(existing.tomorrowImprovements || '');
          setGratitude(existing.gratitude || '');
        }
      } catch (err) {
        console.error('Failed to load evening debrief', err);
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

    try {
      setIsSubmitting(true);
      const saved = await ReflectionService.saveEveningDebrief({
        date,
        wentWell: wentWell.trim() || undefined,
        difficultiesFaced: difficultiesFaced.trim() || undefined,
        lessonsLearned: lessonsLearned.trim() || undefined,
        tomorrowImprovements: tomorrowImprovements.trim() || undefined,
        gratitude: gratitude.trim() || undefined
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);

      if (onSaved) {
        onSaved(saved);
      }
    } catch (err) {
      console.error('Failed to save evening debrief', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-indigo-900/40 bg-gradient-to-b from-obsidian-850 to-obsidian-900 shadow-md">
      <CardHeader className="pb-3 border-b border-obsidian-750/70">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-indigo-300">
            <Moon className="w-4 h-4 text-indigo-400" />
            <span>Evening Debrief & Audit</span>
          </CardTitle>
          <span className="text-[11px] font-mono text-indigo-300/80 bg-indigo-950/60 border border-indigo-800/40 px-2 py-0.5 rounded">
            {date}
          </span>
        </div>
        <CardDescription className="text-xs text-slate-400">
          Close the day with sober truth, self-respect, and gratitude.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Evening Prompt Banner */}
        <div className="p-3 rounded-lg bg-obsidian-900 border border-obsidian-750 text-xs">
          <div className="flex items-center gap-1.5 text-indigo-300 font-medium mb-1">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Evening Philosophical Debrief:</span>
          </div>
          <p className="text-slate-200 italic font-serif text-sm">
            "{dailyPrompt.prompt}"
          </p>
          {dailyPrompt.subtext && (
            <p className="text-[11px] text-slate-400 mt-1">{dailyPrompt.subtext}</p>
          )}
        </div>

        {isLoading ? (
          <div className="py-6 text-center text-xs text-slate-400">Loading evening reflection...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 mb-1">
                <Award className="w-3.5 h-3.5 text-gold-400" />
                <span>What went genuinely well today?</span>
              </label>
              <textarea
                rows={2}
                value={wentWell}
                onChange={(e) => setWentWell(e.target.value)}
                placeholder="Where did your discipline hold firm? What did you build or protect?"
                className="w-full bg-obsidian-900 border border-obsidian-750 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 mb-1">
                <span>What was difficult or where was resistance felt?</span>
              </label>
              <textarea
                rows={2}
                value={difficultiesFaced}
                onChange={(e) => setDifficultiesFaced(e.target.value)}
                placeholder="State the unvarnished reality without self-punishment or excuses..."
                className="w-full bg-obsidian-900 border border-obsidian-750 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 mb-1">
                  <span>Lesson / Realization</span>
                </label>
                <textarea
                  rows={2}
                  value={lessonsLearned}
                  onChange={(e) => setLessonsLearned(e.target.value)}
                  placeholder="What truth about your habits became clear?"
                  className="w-full bg-obsidian-900 border border-obsidian-750 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 mb-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Improvement for Tomorrow</span>
                </label>
                <textarea
                  rows={2}
                  value={tomorrowImprovements}
                  onChange={(e) => setTomorrowImprovements(e.target.value)}
                  placeholder="One concrete adjustment for tomorrow's execution."
                  className="w-full bg-obsidian-900 border border-obsidian-750 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 mb-1">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                <span>Quiet Gratitude</span>
              </label>
              <input
                type="text"
                value={gratitude}
                onChange={(e) => setGratitude(e.target.value)}
                placeholder="A person, privilege, or capacity you are grateful for today..."
                className="w-full bg-obsidian-900 border border-obsidian-750 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            {savedSuccess && (
              <div className="p-2.5 rounded-lg bg-indigo-950/50 border border-indigo-800/60 text-xs text-indigo-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Evening debrief secured. Rest well with a clear conscience.</span>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
                className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-slate-100"
              >
                <Moon className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Saving...' : 'Lock In Evening Debrief'}</span>
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};
