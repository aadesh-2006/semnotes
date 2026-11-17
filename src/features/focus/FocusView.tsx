import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Play, Pause, RotateCcw, Flame } from 'lucide-react';

export function FocusView() {
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [completedSessions, setCompletedSessions] = useState(3);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    } else if (secondsRemaining === 0 && isActive) {
      setIsActive(false);
      setCompletedSessions((prev) => prev + 1);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, secondsRemaining]);

  const handleSelectDuration = (mins: number) => {
    setIsActive(false);
    setDurationMinutes(mins);
    setSecondsRemaining(mins * 60);
  };

  const handleReset = () => {
    setIsActive(false);
    setSecondsRemaining(durationMinutes * 60);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainderSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainderSecs).padStart(2, '0')}`;
  };

  const progressPercent = Math.round(
    ((durationMinutes * 60 - secondsRemaining) / (durationMinutes * 60)) * 100
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-100">
              Focus Mode & Deep Work
            </h2>
            <Badge variant="gold" size="sm">Module 8 Active</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Distraction-free environment for uncompromising deep work sessions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="gold-subtle" size="md" className="font-mono">
            {completedSessions} Sessions Completed Today
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Timer Display */}
        <div className="lg:col-span-7">
          <Card className="border-gold-600/40 bg-gradient-to-b from-obsidian-850 to-obsidian-900 text-center py-8 px-6">
            <div className="max-w-md mx-auto space-y-6">
              {/* Presets */}
              <div className="flex justify-center gap-2">
                {[
                  { label: 'Pomodoro (25m)', mins: 25 },
                  { label: 'Deep Work (50m)', mins: 50 },
                  { label: 'Quick Sprint (15m)', mins: 15 },
                ].map((preset) => (
                  <button
                    key={preset.mins}
                    onClick={() => handleSelectDuration(preset.mins)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      durationMinutes === preset.mins
                        ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40 shadow-gold-sm font-semibold'
                        : 'bg-obsidian-800 text-slate-400 hover:text-slate-200 border border-obsidian-750'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Big Digital Clock */}
              <div className="relative py-8">
                <span className="font-mono text-6xl sm:text-7xl font-bold tracking-tight text-slate-100 tabular-nums select-none drop-shadow-md">
                  {formatTime(secondsRemaining)}
                </span>
                <div className="w-48 h-1 mx-auto bg-obsidian-750 rounded-full mt-4 overflow-hidden">
                  <div
                    className="h-full bg-gold-400 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="flex justify-center items-center gap-4">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleReset}
                  title="Reset Timer"
                  aria-label="Reset Timer"
                >
                  <RotateCcw className="w-4 h-4 text-slate-400 hover:text-slate-200" />
                </Button>

                <Button
                  variant="gold-glow"
                  size="lg"
                  onClick={() => setIsActive(!isActive)}
                  className="px-8 font-semibold text-obsidian-950 gap-2"
                >
                  {isActive ? (
                    <>
                      <Pause className="w-5 h-5 fill-obsidian-950" />
                      <span>Pause Focus</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-obsidian-950" />
                      <span>Begin Session</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Optional Session Notes */}
              <div className="pt-4 border-t border-obsidian-750/70 text-left">
                <label className="text-xs text-slate-400 block mb-1.5">
                  Current Session Objective:
                </label>
                <input
                  type="text"
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="e.g. Implement Dijkstra algorithm in TypeScript..."
                  className="w-full bg-obsidian-900 border border-obsidian-750 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-gold-500/50 font-sans"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Focus Stats & Discipline Architecture */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-obsidian-700/80 bg-obsidian-850">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Flame className="w-4 h-4 text-gold-400" />
                <span>Today's Focus Metrics</span>
              </CardTitle>
              <CardDescription>
                Audited deep work hours for personal mastery.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-obsidian-900 border border-obsidian-750">
                <span className="text-xs text-slate-400">Total Focused Time:</span>
                <span className="font-mono text-gold-300 font-bold text-sm">1h 40m</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-obsidian-900 border border-obsidian-750">
                <span className="text-xs text-slate-400">Distractions Logged:</span>
                <span className="font-mono text-emerald-400 font-bold text-sm">0</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-obsidian-900 border border-obsidian-750">
                <span className="text-xs text-slate-400">Target Daily Threshold:</span>
                <span className="font-mono text-slate-300 font-bold text-sm">2h 30m</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
