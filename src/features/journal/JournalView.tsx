import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Badge } from '../../components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { MorningIntentionCard } from './MorningIntentionCard';
import { EveningReflectionCard } from './EveningReflectionCard';
import { UrgeLoggerCard } from '../urges/UrgeLoggerCard';
import { UrgeDiagnosticService } from '../../core/urges/urgeDiagnosticService';
import { RouteLoadingFallback } from '../../components/feedback/RouteLoadingFallback';
import type { UrgeLogRecord, UrgeDiagnosticSummary } from '../../core/urges/urgeTypes';
import type { JournalEntry } from '../../core/journal/journalTypes';
import { formatCalendarDate } from '../../core/utils';

// Lazy-load heavy markdown editor and searchable history archive
const JournalEditor = lazy(() => import('./JournalEditor').then((m) => ({ default: m.JournalEditor })));
const JournalHistory = lazy(() => import('./JournalHistory').then((m) => ({ default: m.JournalHistory })));
import {
  BookOpen,
  Sun,
  Moon,
  ShieldAlert,
  Archive,
  Lock,
  Calendar,
  Activity,
  Trash2,
  Clock
} from 'lucide-react';

export function JournalView() {
  const [activeTab, setActiveTab] = useState<'reflection' | 'journal' | 'urges' | 'history'>('reflection');
  const [selectedDate, setSelectedDate] = useState<string>(formatCalendarDate(new Date()));
  const [entryToEdit, setEntryToEdit] = useState<JournalEntry | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState<number>(0);

  // Urge diagnostics state
  const [recentUrges, setRecentUrges] = useState<UrgeLogRecord[]>([]);
  const [diagnosticSummary, setDiagnosticSummary] = useState<UrgeDiagnosticSummary | null>(null);

  const loadUrgeData = useCallback(async () => {
    try {
      const records = await UrgeDiagnosticService.getUrgesByDateRange();
      setRecentUrges(records.slice(0, 8));
      const summary = UrgeDiagnosticService.calculateDiagnostics(records);
      setDiagnosticSummary(summary);
    } catch (err) {
      console.error('Failed to load urge diagnostics', err);
    }
  }, []);

  useEffect(() => {
    loadUrgeData();
  }, [loadUrgeData]);

  const handleSelectEntryForEdit = (entry: JournalEntry) => {
    setEntryToEdit(entry);
    setActiveTab('journal');
  };

  const handleJournalSaved = () => {
    setEntryToEdit(null);
    setHistoryRefreshKey((k) => k + 1);
  };

  const handleJournalDeleted = () => {
    setEntryToEdit(null);
    setHistoryRefreshKey((k) => k + 1);
    setActiveTab('history');
  };

  const handleDeleteUrge = async (id: string) => {
    try {
      await UrgeDiagnosticService.deleteUrge(id);
      loadUrgeData();
    } catch (err) {
      console.error('Failed to delete urge', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-100">
              Journal & Reflections
            </h2>
            <Badge variant="gold" size="sm">Milestone 6</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Privacy-first reflection subsystem. Sovereign intention, debriefs, and urge self-awareness.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-gold-400 bg-gold-950/40 border border-gold-800/40 px-3 py-1.5 rounded-lg">
            <Lock className="w-3.5 h-3.5" />
            <span>Local-First Sovereign Storage</span>
          </div>

          <div className="flex items-center gap-1 text-xs text-slate-300 bg-obsidian-900 border border-obsidian-750 px-2.5 py-1.5 rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-gold-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
              title="Select reflection date"
            />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-obsidian-750 gap-2 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('reflection')}
          className={`flex items-center gap-2 px-3 py-2 border-b-2 font-medium transition-colors shrink-0 ${
            activeTab === 'reflection'
              ? 'border-gold-500 text-gold-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center -space-x-1">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <span>Daily Reflection</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setEntryToEdit(null);
            setActiveTab('journal');
          }}
          className={`flex items-center gap-2 px-3 py-2 border-b-2 font-medium transition-colors shrink-0 ${
            activeTab === 'journal'
              ? 'border-gold-500 text-gold-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-gold-400" />
          <span>Private Journal</span>
          {entryToEdit && (
            <span className="text-[10px] bg-gold-950/60 border border-gold-800/50 text-gold-400 px-1.5 py-0.2 rounded">
              Editing
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('urges')}
          className={`flex items-center gap-2 px-3 py-2 border-b-2 font-medium transition-colors shrink-0 ${
            activeTab === 'urges'
              ? 'border-gold-500 text-gold-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>Urge Diagnostics</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-3 py-2 border-b-2 font-medium transition-colors shrink-0 ${
            activeTab === 'history'
              ? 'border-gold-500 text-gold-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Archive className="w-3.5 h-3.5 text-slate-400" />
          <span>Timeline & Archives</span>
        </button>
      </div>

      {/* Tab 1: Daily Reflection (Morning & Evening) */}
      {activeTab === 'reflection' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MorningIntentionCard date={selectedDate} />
          <EveningReflectionCard date={selectedDate} />
        </div>
      )}

      {/* Tab 2: Private Journal Editor */}
      {activeTab === 'journal' && (
        <div className="space-y-4">
          <Suspense fallback={<RouteLoadingFallback />}>
            <JournalEditor
              entryToEdit={entryToEdit}
              onSaved={handleJournalSaved}
              onDeleted={handleJournalDeleted}
              onCancel={() => {
                setEntryToEdit(null);
                setActiveTab('history');
              }}
            />
          </Suspense>
        </div>
      )}

      {/* Tab 3: Urge Diagnostics */}
      {activeTab === 'urges' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Urge Logger */}
            <div className="lg:col-span-6">
              <UrgeLoggerCard onUrgeLogged={loadUrgeData} />
            </div>

            {/* Diagnostic Summary */}
            <div className="lg:col-span-6 space-y-4">
              <Card className="border-obsidian-750 bg-obsidian-850 shadow-md">
                <CardHeader className="pb-3 border-b border-obsidian-750/70">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2 text-slate-100">
                      <Activity className="w-4 h-4 text-gold-400" />
                      <span>Trigger Diagnostic Summary</span>
                    </CardTitle>
                    <Badge variant="outline" size="sm">Descriptive Analytics</Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-400">
                    Objective summary of self-reported friction. No clinical diagnosis or shame.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {diagnosticSummary && (
                    <>
                      {/* Metric Stat Row */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-3 rounded-lg bg-obsidian-900 border border-obsidian-750">
                          <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Recorded Urges</span>
                          <span className="text-lg font-mono font-bold text-slate-100">
                            {diagnosticSummary.totalUrgesRecorded}
                          </span>
                        </div>
                        <div className="p-3 rounded-lg bg-obsidian-900 border border-obsidian-750">
                          <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Avg Intensity</span>
                          <span className="text-lg font-mono font-bold text-amber-400">
                            {diagnosticSummary.averageIntensity} / 10
                          </span>
                        </div>
                        <div className="p-3 rounded-lg bg-obsidian-900 border border-obsidian-750">
                          <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Resisted / Diverted</span>
                          <span className="text-lg font-mono font-bold text-emerald-400">
                            {diagnosticSummary.resistedOrDivertedRate}%
                          </span>
                        </div>
                      </div>

                      {/* Top Trigger Breakdown */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-slate-300">Top Recorded Triggers</h4>
                        {diagnosticSummary.topTriggers.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No triggers recorded yet.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {diagnosticSummary.topTriggers.slice(0, 4).map((trig) => (
                              <div key={trig.category} className="flex items-center justify-between text-xs">
                                <span className="capitalize text-slate-300">{trig.category.replace('_', ' ')}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-24 bg-obsidian-950 h-2 rounded-full overflow-hidden border border-obsidian-750">
                                    <div
                                      className="bg-gold-500 h-full rounded-full"
                                      style={{ width: `${trig.percentage}%` }}
                                    />
                                  </div>
                                  <span className="font-mono text-slate-400 w-8 text-right">{trig.count} ({trig.percentage}%)</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Response Strategy Breakdown */}
                      <div className="space-y-2 pt-2 border-t border-obsidian-750/70">
                        <h4 className="text-xs font-medium text-slate-300">Response Outcomes</h4>
                        {diagnosticSummary.outcomeDistribution.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No response strategies recorded yet.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {diagnosticSummary.outcomeDistribution.map((o) => (
                              <div
                                key={o.outcome}
                                className="px-2.5 py-1 rounded-md bg-obsidian-900 border border-obsidian-750 text-xs flex items-center gap-1.5"
                              >
                                <span className="capitalize text-slate-300">{o.outcome}:</span>
                                <span className="font-mono text-gold-400 font-bold">{o.count}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Recent Urge Logs List */}
              <Card className="border-obsidian-750 bg-obsidian-850 shadow-md">
                <CardHeader className="pb-3 border-b border-obsidian-750/70">
                  <CardTitle className="text-sm text-slate-200">Recent Urge Observations</CardTitle>
                </CardHeader>
                <CardContent className="pt-3 space-y-2">
                  {recentUrges.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center">No recent urges recorded.</p>
                  ) : (
                    recentUrges.map((urge) => (
                      <div
                        key={urge.id}
                        className="p-2.5 rounded-lg bg-obsidian-900 border border-obsidian-750 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-amber-400 font-bold">{urge.intensity}/10</span>
                            <span className="text-slate-300">
                              {urge.triggerCategories.join(', ')}
                            </span>
                            {urge.customTrigger && (
                              <span className="text-[11px] text-slate-400">({urge.customTrigger})</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            <span>{urge.date} &bull; Strategy: {urge.responseOutcome}</span>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUrge(urge.id)}
                          className="text-slate-400 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Journal History & Archives */}
      {activeTab === 'history' && (
        <Suspense fallback={<RouteLoadingFallback />}>
          <JournalHistory
            onSelectEntryForEdit={handleSelectEntryForEdit}
            refreshTrigger={historyRefreshKey}
          />
        </Suspense>
      )}
    </div>
  );
}
