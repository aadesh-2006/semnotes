import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { UrgeSlider } from './UrgeSlider';
import { TriggerSelector } from './TriggerSelector';
import { UrgeDiagnosticService } from '../../core/urges/urgeDiagnosticService';
import type { TriggerCategory, UrgeResponse, UrgeLogRecord } from '../../core/urges/urgeTypes';
import { formatCalendarDate } from '../../core/utils';
import { ShieldAlert, CheckCircle2, Clock } from 'lucide-react';

interface UrgeLoggerCardProps {
  linkedHabitId?: string;
  onUrgeLogged?: (record: UrgeLogRecord) => void;
}

export const UrgeLoggerCard: React.FC<UrgeLoggerCardProps> = ({ linkedHabitId, onUrgeLogged }) => {
  const [intensity, setIntensity] = useState<number>(5);
  const [selectedCategories, setSelectedCategories] = useState<TriggerCategory[]>(['stress']);
  const [customTrigger, setCustomTrigger] = useState<string>('');
  const [responseOutcome, setResponseOutcome] = useState<UrgeResponse>('delayed');
  const [contextNote, setContextNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCategories.length === 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      const record = await UrgeDiagnosticService.recordUrge({
        date: formatCalendarDate(new Date()),
        intensity,
        triggerCategories: selectedCategories,
        customTrigger: customTrigger.trim() || undefined,
        context: contextNote.trim() || undefined,
        responseOutcome,
        linkedHabitId: linkedHabitId || undefined,
        reflectionNote: contextNote.trim() || undefined
      });

      setSuccessMessage('Urge logged with dignity. Stay anchored.');
      setTimeout(() => setSuccessMessage(null), 3500);

      // Reset form
      setIntensity(5);
      setContextNote('');
      setCustomTrigger('');
      setResponseOutcome('delayed');

      if (onUrgeLogged) {
        onUrgeLogged(record);
      }
    } catch (err) {
      console.error('Failed to log urge diagnostic', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-amber-900/40 bg-gradient-to-b from-obsidian-850 to-obsidian-900">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-amber-300">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Urge Diagnostic Logger</span>
          </CardTitle>
          <span className="text-[11px] font-mono text-amber-400/80 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded">
            Self-Awareness
          </span>
        </div>
        <CardDescription className="text-xs text-slate-400">
          Observe and quantify friction objectively without judgment or self-blame.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <UrgeSlider value={intensity} onChange={setIntensity} disabled={isSubmitting} />

          <TriggerSelector
            selectedCategories={selectedCategories}
            customTrigger={customTrigger}
            onCategoriesChange={setSelectedCategories}
            onCustomTriggerChange={setCustomTrigger}
            disabled={isSubmitting}
          />

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300">
              Chosen Response Strategy
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
              {[
                { id: 'delayed', label: '10-Min Freeze', icon: Clock },
                { id: 'resisted', label: 'Stood Firm', icon: ShieldAlert },
                { id: 'diverted', label: 'Productive Pivot', icon: CheckCircle2 },
                { id: 'unresolved', label: 'In Progress', icon: Clock }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setResponseOutcome(opt.id as UrgeResponse)}
                  className={`py-2 px-2.5 rounded-lg border text-center transition-all ${
                    responseOutcome === opt.id
                      ? 'bg-gold-500/15 border-gold-500/50 text-gold-300 font-medium'
                      : 'bg-obsidian-900 border-obsidian-750 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Context & Situational Observation (Optional)
            </label>
            <textarea
              rows={2}
              value={contextNote}
              onChange={(e) => setContextNote(e.target.value)}
              placeholder="What specific environment or thought pattern triggered this?"
              className="w-full bg-obsidian-900 border border-obsidian-750 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-gold-500/50"
            />
          </div>

          {successMessage && (
            <div className="p-2.5 rounded-lg bg-gold-950/50 border border-gold-800/60 text-xs text-gold-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-gold-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="pt-1">
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={isSubmitting || selectedCategories.length === 0}
              className="w-full border-amber-600/50 hover:bg-amber-950/40 text-amber-300 text-xs py-2 gap-2"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Recording...' : 'Log Urge Diagnostic'}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
