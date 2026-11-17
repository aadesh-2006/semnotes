import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { CalendarDays } from 'lucide-react';

export function CalendarView() {
  // Generate sample 28-day grid for current month visual layout
  const days = Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    status: i === 14 ? 'failed' : i > 24 ? 'upcoming' : 'success'
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-100">
              Consistency Calendar
            </h2>
            <Badge variant="gold" size="sm">M5 Domain</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            GitHub-style contribution heatmaps, monthly tracking, and individual streak filters.
          </p>
        </div>
      </div>

      <Card className="border-obsidian-700/80 bg-obsidian-850">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-gold-400" />
              <span>Monthly Matrix Preview</span>
            </CardTitle>
            <CardDescription>
              Visual overview of adherence. Green represents completed; amber indicates rest days; red denotes audited reset.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-7 gap-2 text-center text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <span key={d} className="font-semibold text-slate-400 pb-2">
                {d}
              </span>
            ))}
            {days.map((item) => (
              <div
                key={item.day}
                className={`p-3 rounded-lg border font-mono flex flex-col items-center justify-center gap-1 transition-all ${
                  item.status === 'success'
                    ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
                    : item.status === 'failed'
                    ? 'bg-red-950/40 border-red-800/40 text-red-300'
                    : 'bg-obsidian-800/50 border-obsidian-700/50 text-slate-400'
                }`}
              >
                <span className="text-xs font-bold">{item.day}</span>
                <span className="text-[10px] uppercase font-sans">
                  {item.status === 'success' ? 'Clean' : item.status === 'failed' ? 'Reset' : '—'}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-obsidian-750 text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500/80" /> Successful Day
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-500/80" /> Strict Reset Day
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-obsidian-700" /> Scheduled Rest
              </span>
            </div>
            <span className="font-mono text-gold-400">Filtering: All Streaks Combined</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
