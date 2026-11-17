/**
 * SEMNÓTĒS — Focus Mode & Custom Pomodoro Engine
 * Sovereign personal discipline operating system.
 *
 * Implements:
 * 1. Timestamp-driven deterministic focus timer with tab reconciliation.
 * 2. Unrestricted custom duration selection (1m to 720m).
 * 3. Configurable Pomodoro cycles with short/long break state machine.
 * 4. Persistent session history and analytics.
 * 5. Web Audio API synthesized harmonic bell and desktop notifications.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../storage/db';
import type { LiveTimerState, FocusPreferences as FocusPreferencesType, SessionMode, PomodoroConfig } from '../../core/focus/focusTypes';
import { FocusTimerEngine } from '../../core/focus/focusTimerEngine';
import { PomodoroEngine } from '../../core/focus/pomodoroEngine';
import { FocusPersistenceService } from '../../core/focus/focusPersistenceService';
import { FocusSessionService } from '../../core/focus/focusSessionService';
import { FocusNotificationService } from '../../core/focus/focusNotificationService';
import { FocusTimer } from './FocusTimer';
import { DurationSelector } from './DurationSelector';
import { FocusModeSelector } from './FocusModeSelector';
import { FocusSessionSetup } from './FocusSessionSetup';
import { FocusSessionHistory } from './FocusSessionHistory';
import { FocusAnalytics } from './FocusAnalytics';
import { FocusPreferences } from './FocusPreferences';
import { Badge } from '../../components/ui/badge';
import { Timer, History, BarChart3, Settings2 } from 'lucide-react';

export function FocusView() {
  const [activeTab, setActiveTab] = useState<'timer' | 'history' | 'analytics' | 'preferences'>('timer');
  const [preferences, setPreferences] = useState<FocusPreferencesType>(() => FocusPersistenceService.loadPreferences());

  // Reactive Dexie queries
  const allSessions = useLiveQuery(() => db.focusSessions.toArray(), []);
  const activeHabits = useLiveQuery(() => db.habits.where('status').equals('active').toArray(), []);

  const habitTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    if (activeHabits) {
      for (const h of activeHabits) {
        map.set(h.id, h.title);
      }
    }
    return map;
  }, [activeHabits]);

  // Timer Configuration State (before starting)
  const [sessionTitle, setSessionTitle] = useState('Deep Work');
  const [selectedDurationMins, setSelectedDurationMins] = useState(preferences.defaultDurationMinutes);
  const [sessionMode, setSessionMode] = useState<SessionMode>(preferences.defaultMode);
  const [linkedHabitId, setLinkedHabitId] = useState<string | undefined>(undefined);
  const [sessionNotes, setSessionNotes] = useState('');
  const [pomodoroConfig, setPomodoroConfig] = useState<PomodoroConfig>(preferences.pomodoroConfig);

  // Live Timer State (active run)
  const [timerState, setTimerState] = useState<LiveTimerState>(() => {
    const saved = FocusPersistenceService.loadActiveTimer();
    if (saved) return saved;

    return FocusTimerEngine.createInitialState({
      title: 'Deep Work',
      sessionMode: preferences.defaultMode,
      durationMinutes: preferences.defaultDurationMinutes,
      pomodoroConfig: preferences.pomodoroConfig,
    });
  });

  // Clock tick state for UI re-rendering
  const [nowMs, setNowMs] = useState(Date.now());
  const timerCreatedInDbRef = useRef<boolean>(false);

  // Sync timer title/habit/notes if idle
  useEffect(() => {
    if (timerState.status === 'idle') {
      setTimerState(
        FocusTimerEngine.createInitialState({
          title: sessionTitle,
          sessionMode,
          durationMinutes: selectedDurationMins,
          linkedHabitId,
          notes: sessionNotes,
          pomodoroConfig,
        })
      );
    }
  }, [sessionTitle, selectedDurationMins, sessionMode, linkedHabitId, sessionNotes, pomodoroConfig, timerState.status]);

  // Real-time animation/timer loop
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (timerState.status === 'running') {
      intervalId = setInterval(() => {
        const now = Date.now();
        setNowMs(now);

        // Check for phase completion
        if (FocusTimerEngine.isExpired(timerState, now)) {
          handlePhaseExpiration(now);
        }
      }, 500);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [timerState]);

  // Window visibility and tab focus reconciliation
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && timerState.status === 'running') {
        const now = Date.now();
        setNowMs(now);
        const reconciled = FocusTimerEngine.reconcile(timerState, now);
        setTimerState(reconciled);
        FocusPersistenceService.saveActiveTimer(reconciled);

        if (FocusTimerEngine.isExpired(reconciled, now)) {
          handlePhaseExpiration(now);
        }
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [timerState]);

  // Handle phase expiration (Focus or Break)
  const handlePhaseExpiration = useCallback(
    async (now: number) => {
      if (preferences.soundEnabled) {
        FocusNotificationService.playCompletionChime(preferences.soundVolume);
      }

      if (preferences.notificationsEnabled) {
        const phaseName = timerState.phase === 'focus' ? 'Focus Phase Complete' : 'Break Finished';
        FocusNotificationService.sendNotification(
          `SEMNÓTĒS — ${phaseName}`,
          `${timerState.title}: Time is up. Take a well-earned breath.`
        );
      }

      if (timerState.sessionMode === 'pomodoro') {
        // Transition to next cycle phase
        const nextState = PomodoroEngine.transitionToNextPhase(timerState, now);
        setTimerState(nextState);
        FocusPersistenceService.saveActiveTimer(nextState);

        // Update Dexie record with latest progress
        try {
          const totalFocus = PomodoroEngine.getTotalFocusedSeconds(nextState, now);
          const totalBreak = PomodoroEngine.getTotalBreakSeconds(nextState, now);
          await FocusSessionService.completeSession(nextState.sessionId, totalFocus, {
            breakDurationSeconds: totalBreak,
            completedCycles: nextState.completedCycles,
          });
        } catch {
          // If not in DB yet, create it
        }
      } else {
        // Custom focus session completed
        const completedState: LiveTimerState = {
          ...timerState,
          status: 'completed',
        };
        setTimerState(completedState);
        FocusPersistenceService.clearActiveTimer();

        try {
          await FocusSessionService.completeSession(
            timerState.sessionId,
            timerState.plannedDurationSeconds,
            { notes: timerState.notes }
          );
        } catch {
          // In case session wasn't already registered
          await FocusSessionService.createSession({
            title: timerState.title,
            sessionMode: timerState.sessionMode,
            linkedHabitId: timerState.linkedHabitId,
            plannedDurationMinutes: Math.round(timerState.plannedDurationSeconds / 60),
            notes: timerState.notes,
          }).then((s) =>
            FocusSessionService.completeSession(s.id, timerState.plannedDurationSeconds, {
              notes: timerState.notes,
            })
          );
        }
      }
    },
    [timerState, preferences]
  );

  // Timer Control Handlers
  const handleStartTimer = async () => {
    const now = Date.now();
    const running = FocusTimerEngine.start(timerState, now);
    setTimerState(running);
    setNowMs(now);
    FocusPersistenceService.saveActiveTimer(running);

    // Register session in Dexie DB
    if (!timerCreatedInDbRef.current) {
      try {
        await FocusSessionService.createSession({
          title: running.title,
          sessionMode: running.sessionMode,
          linkedHabitId: running.linkedHabitId,
          plannedDurationMinutes: Math.round(running.plannedDurationSeconds / 60),
          notes: running.notes,
          startedAt: new Date(running.startTimestamp).toISOString(),
        });
        timerCreatedInDbRef.current = true;
      } catch {
        // Silently handle
      }
    }
  };

  const handlePauseTimer = () => {
    const now = Date.now();
    const paused = FocusTimerEngine.pause(timerState, now);
    setTimerState(paused);
    setNowMs(now);
    FocusPersistenceService.saveActiveTimer(paused);
  };

  const handleResumeTimer = () => {
    const now = Date.now();
    const resumed = FocusTimerEngine.resume(timerState, now);
    setTimerState(resumed);
    setNowMs(now);
    FocusPersistenceService.saveActiveTimer(resumed);
  };

  const handleResetTimer = () => {
    const now = Date.now();
    const reset = FocusTimerEngine.reset(timerState, now);
    setTimerState(reset);
    setNowMs(now);
    FocusPersistenceService.saveActiveTimer(reset);
  };

  const handleCompleteSession = async () => {
    const now = Date.now();
    const totalFocused = PomodoroEngine.getTotalFocusedSeconds(timerState, now);
    const totalBreak = PomodoroEngine.getTotalBreakSeconds(timerState, now);

    try {
      await FocusSessionService.completeSession(timerState.sessionId, totalFocused, {
        notes: timerState.notes,
        breakDurationSeconds: totalBreak,
        completedCycles: timerState.completedCycles,
      });
    } catch {
      // Create and complete
      const s = await FocusSessionService.createSession({
        title: timerState.title,
        sessionMode: timerState.sessionMode,
        linkedHabitId: timerState.linkedHabitId,
        plannedDurationMinutes: Math.round(timerState.plannedDurationSeconds / 60),
        notes: timerState.notes,
      });
      await FocusSessionService.completeSession(s.id, totalFocused, {
        notes: timerState.notes,
        breakDurationSeconds: totalBreak,
        completedCycles: timerState.completedCycles,
      });
    }

    if (preferences.soundEnabled) {
      FocusNotificationService.playCompletionChime(preferences.soundVolume);
    }

    FocusPersistenceService.clearActiveTimer();
    timerCreatedInDbRef.current = false;

    // Reset to idle for next session
    setTimerState(
      FocusTimerEngine.createInitialState({
        title: sessionTitle,
        sessionMode,
        durationMinutes: selectedDurationMins,
        linkedHabitId,
        notes: sessionNotes,
        pomodoroConfig,
      })
    );
  };

  const handleInterruptSession = async () => {
    const now = Date.now();
    const totalFocused = PomodoroEngine.getTotalFocusedSeconds(timerState, now);
    const totalBreak = PomodoroEngine.getTotalBreakSeconds(timerState, now);

    try {
      await FocusSessionService.interruptSession(timerState.sessionId, totalFocused, {
        notes: timerState.notes,
        breakDurationSeconds: totalBreak,
        completedCycles: timerState.completedCycles,
      });
    } catch {
      // Create and interrupt
      const s = await FocusSessionService.createSession({
        title: timerState.title,
        sessionMode: timerState.sessionMode,
        linkedHabitId: timerState.linkedHabitId,
        plannedDurationMinutes: Math.round(timerState.plannedDurationSeconds / 60),
        notes: timerState.notes,
      });
      await FocusSessionService.interruptSession(s.id, totalFocused, {
        notes: timerState.notes,
        breakDurationSeconds: totalBreak,
        completedCycles: timerState.completedCycles,
      });
    }

    FocusPersistenceService.clearActiveTimer();
    timerCreatedInDbRef.current = false;

    setTimerState(
      FocusTimerEngine.createInitialState({
        title: sessionTitle,
        sessionMode,
        durationMinutes: selectedDurationMins,
        linkedHabitId,
        notes: sessionNotes,
        pomodoroConfig,
      })
    );
  };

  const handleCancelSession = async () => {
    try {
      await FocusSessionService.cancelSession(timerState.sessionId);
    } catch {
      // Ignore if not in DB
    }

    FocusPersistenceService.clearActiveTimer();
    timerCreatedInDbRef.current = false;

    setTimerState(
      FocusTimerEngine.createInitialState({
        title: sessionTitle,
        sessionMode,
        durationMinutes: selectedDurationMins,
        linkedHabitId,
        notes: sessionNotes,
        pomodoroConfig,
      })
    );
  };

  const handleSkipBreak = () => {
    const now = Date.now();
    const skipped = PomodoroEngine.skipBreak(timerState, now);
    setTimerState(skipped);
    setNowMs(now);
    FocusPersistenceService.saveActiveTimer(skipped);
  };

  const handleDeleteSession = async (id: string) => {
    await FocusSessionService.deleteSession(id);
  };

  const handleSavePreferences = (newPrefs: FocusPreferencesType) => {
    setPreferences(newPrefs);
    FocusPersistenceService.savePreferences(newPrefs);
  };

  // Live computed metrics for current phase
  const remainingSecs = FocusTimerEngine.calculateRemainingSeconds(timerState, nowMs);
  const elapsedSecs = FocusTimerEngine.calculateElapsedSeconds(timerState, nowMs);
  const progressPct = FocusTimerEngine.calculateProgress(timerState, nowMs);

  const completedTodayCount = useMemo(() => {
    if (!allSessions) return 0;
    const todayStr = new Date().toISOString().substring(0, 10);
    return allSessions.filter((s) => s.date === todayStr && s.status === 'completed').length;
  }, [allSessions]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-100">
              Focus Mode & Deep Work
            </h2>
            <Badge variant="gold" size="sm">
              Module 8 Active
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Uncompromising, distraction-free environment for continuous focus sessions and Pomodoro cycles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="gold-subtle" size="md" className="font-mono">
            {completedTodayCount} Sessions Completed Today
          </Badge>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-obsidian-750 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('timer')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'timer'
              ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40 shadow-gold-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-obsidian-800'
          }`}
        >
          <Timer className="w-3.5 h-3.5" />
          <span>Focus Timer</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'history'
              ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40 shadow-gold-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-obsidian-800'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Session History</span>
          {allSessions && allSessions.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-obsidian-750 text-slate-300">
              {allSessions.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'analytics'
              ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40 shadow-gold-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-obsidian-800'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Focus Analytics</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preferences')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'preferences'
              ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40 shadow-gold-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-obsidian-800'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>Preferences</span>
        </button>
      </div>

      {/* Tab 1: Focus Timer View */}
      {activeTab === 'timer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Timer Display */}
          <div className="lg:col-span-7">
            <FocusTimer
              timerState={timerState}
              remainingSeconds={remainingSecs}
              elapsedSeconds={elapsedSecs}
              progressPercent={progressPct}
              linkedHabitTitle={
                timerState.linkedHabitId ? habitTitleMap.get(timerState.linkedHabitId) : undefined
              }
              onStart={handleStartTimer}
              onPause={handlePauseTimer}
              onResume={handleResumeTimer}
              onReset={handleResetTimer}
              onComplete={handleCompleteSession}
              onInterrupt={handleInterruptSession}
              onSkipBreak={handleSkipBreak}
              onCancel={handleCancelSession}
            />
          </div>

          {/* Session Setup Controls (Disabled if currently running) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="p-5 rounded-3xl bg-obsidian-850/80 border border-obsidian-750 space-y-5">
              <div className="border-b border-obsidian-750 pb-3">
                <h4 className="text-sm font-semibold text-slate-100 font-display">
                  Session Configuration
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Customize duration, session type, and optional habit tracking.
                </p>
              </div>

              {/* Mode Selector */}
              <FocusModeSelector
                mode={sessionMode}
                onChangeMode={setSessionMode}
                disabled={timerState.status !== 'idle'}
              />

              {/* Duration Selector */}
              <DurationSelector
                selectedMinutes={selectedDurationMins}
                onChangeDuration={setSelectedDurationMins}
                disabled={timerState.status !== 'idle'}
              />

              {/* Session Setup */}
              <FocusSessionSetup
                title={sessionTitle}
                onChangeTitle={setSessionTitle}
                linkedHabitId={linkedHabitId}
                onChangeLinkedHabitId={setLinkedHabitId}
                notes={sessionNotes}
                onChangeNotes={setSessionNotes}
                sessionMode={sessionMode}
                pomodoroConfig={pomodoroConfig}
                onChangePomodoroConfig={setPomodoroConfig}
                disabled={timerState.status !== 'idle'}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: History View */}
      {activeTab === 'history' && (
        <FocusSessionHistory
          sessions={allSessions || []}
          habitTitleMap={habitTitleMap}
          onDeleteSession={handleDeleteSession}
        />
      )}

      {/* Tab 3: Analytics View */}
      {activeTab === 'analytics' && (
        <FocusAnalytics
          sessions={allSessions || []}
          habitTitleMap={habitTitleMap}
        />
      )}

      {/* Tab 4: Preferences View */}
      {activeTab === 'preferences' && (
        <FocusPreferences
          preferences={preferences}
          onSavePreferences={handleSavePreferences}
        />
      )}
    </div>
  );
}

export default FocusView;
