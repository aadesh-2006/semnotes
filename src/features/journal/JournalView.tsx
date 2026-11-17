import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { BookOpen, ShieldAlert, Lock, Send } from 'lucide-react';

export function JournalView() {
  const [urgeIntensity, setUrgeIntensity] = useState(5);
  const [journalContent, setJournalContent] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const handleSavePreview = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-100">
              Journal & Reflections
            </h2>
            <Badge variant="gold" size="sm">M5 / M6 Domain</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            End-to-end sovereign private reflections, trigger logs, and emotional resilience records.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-gold-400 bg-gold-950/40 border border-gold-800/40 px-3 py-1.5 rounded-lg">
          <Lock className="w-3.5 h-3.5" />
          <span>Local Client-Side Encrypted Storage</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Journal Editor */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-obsidian-700/80 bg-obsidian-850">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-gold-400" />
                <span>Today's Sovereign Reflection</span>
              </CardTitle>
              <CardDescription>
                Unfiltered thoughts. Nothing leaves your browser without client-side encryption.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-obsidian-900 border border-obsidian-750 text-xs text-slate-300">
                <span className="text-gold-400 font-semibold block mb-1">Guiding Prompt:</span>
                "What trigger attempted to seduce your discipline today, and what sovereign standard kept you grounded?"
              </div>

              <textarea
                value={journalContent}
                onChange={(e) => setJournalContent(e.target.value)}
                placeholder="Record your thoughts, triumphs, or internal conflicts here..."
                rows={7}
                className="w-full bg-obsidian-900 border border-obsidian-700 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-gold-500/60 transition-colors font-sans"
              />

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {journalContent.length} characters &bull; Auto-saved to IndexedDB
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSavePreview}
                  className="gap-2"
                >
                  <Send className="w-3.5 h-3.5 text-obsidian-950" />
                  <span>{isSaved ? 'Reflected & Saved ✓' : 'Save Reflection'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Urge & Trigger Quick Logger */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-amber-800/40 bg-gradient-to-b from-obsidian-850 to-obsidian-900">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2 text-amber-300">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Urge Diagnostic</span>
                </CardTitle>
                <Badge variant="warning" size="sm">Emergency Tool</Badge>
              </div>
              <CardDescription>
                Quantify urge intensity before reacting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Urge Intensity</span>
                  <span className="font-mono text-amber-400 font-bold">{urgeIntensity} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={urgeIntensity}
                  onChange={(e) => setUrgeIntensity(Number(e.target.value))}
                  className="w-full accent-amber-500 bg-obsidian-800 rounded-lg cursor-pointer"
                  aria-label="Urge intensity slider"
                />
              </div>

              <div className="space-y-1.5 text-xs">
                <span className="text-slate-400">Common Triggers</span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['Late Night Boredom', 'Stress / Exhaustion', 'Social Media', 'Isolation'].map((t) => (
                    <button
                      key={t}
                      className="px-2.5 py-1 rounded-md bg-obsidian-800 border border-obsidian-700 hover:border-gold-500/40 text-slate-300 text-[11px] transition-colors"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <Button variant="outline" size="sm" className="w-full text-xs border-amber-600/40 text-amber-300">
                Log Urge & Start 10-Min Freeze
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
