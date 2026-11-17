import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../storage/db';
import { type Habit, type HabitLog } from '../../core/domain/types';
import { formatScheduleSummary } from '../../core/services/scheduleService';
import { formatCalendarDate, formatFriendlyDate } from '../../core/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  Plus,
  Edit,
  Pause,
  Play,
  RefreshCw,
  Clock
} from 'lucide-react';

interface HabitDetailViewProps {
  habitId: string;
  onBack: () => void;
  onEdit: (habit: Habit) => void;
  onCheckIn: (habit: Habit, date?: string, existingLog?: HabitLog) => void;
  onPauseToggle: (habit: Habit) => void;
  onArchiveToggle: (habit: Habit) => void;
}

export function HabitDetailView({
  habitId,
  onBack,
  onEdit,
  onCheckIn,
  onPauseToggle,
  onArchiveToggle
}: HabitDetailViewProps) {
  const habit = useLiveQuery(() => db.habits.get(habitId), [habitId]);
  const logs = useLiveQuery(
    () => db.habitLogs.where('habitId').equals(habitId).reverse().sortBy('date'),
    [habitId]
  );
  const auditRecords = useLiveQuery(
    () => db.auditRecords.where('habitId').equals(habitId).reverse().sortBy('timestamp'),
    [habitId]
  );



  if (!habit) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>Loading habit details or habit not found...</p>
        <Button variant="ghost" size="sm" onClick={onBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Habits
        </Button>
      </div>
    );
  }

  const scheduleSummary = formatScheduleSummary(habit.schedule);
  const isAbstinence = habit.type === 'abstinence';
  const isQuantitative = habit.type === 'quantitative';

  const totalLogs = logs?.length || 0;
  const successfulDays = logs?.filter((l) => l.status === 'completed').length || 0;
  const setbackDays = logs?.filter((l) => l.status === 'failed').length || 0;
  const adherenceRate = totalLogs > 0 ? Math.round((successfulDays / totalLogs) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header with Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-obsidian-750">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} title="Back to Habits">
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-100">
                {habit.title}
              </h2>
              <Badge variant="gold" size="sm" className="capitalize">
                {habit.category}
              </Badge>
              <Badge variant="outline" size="sm" className="capitalize">
                {habit.type}
              </Badge>
              {habit.status === 'paused' && <Badge variant="warning" size="sm">Paused</Badge>}
              {habit.status === 'archived' && <Badge variant="neutral" size="sm">Archived</Badge>}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Established on {formatFriendlyDate(habit.startDate)}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCheckIn(habit, formatCalendarDate(new Date()))}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Today's Check-In</span>
          </Button>

          <Button variant="secondary" size="sm" onClick={() => onEdit(habit)} className="gap-1.5">
            <Edit className="w-3.5 h-3.5" />
            <span>Edit</span>
          </Button>

          {habit.status === 'archived' ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onArchiveToggle(habit)}
              className="gap-1.5 text-emerald-400"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restore</span>
            </Button>
          ) : habit.status === 'paused' ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPauseToggle(habit)}
              className="gap-1.5 text-gold-400"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Resume</span>
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPauseToggle(habit)}
              className="gap-1.5 text-amber-400"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </Button>
          )}
        </div>
      </div>

      {/* Description & Standard */}
      {habit.description && (
        <Card className="border-obsidian-750 bg-obsidian-850">
          <CardContent className="py-4">
            <span className="text-xs font-semibold text-gold-400 uppercase tracking-wider block mb-1">
              Standard of Excellence
            </span>
            <p className="text-sm text-slate-200 leading-relaxed">{habit.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Real Statistics derived from DB */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-obsidian-850 border border-obsidian-750">
          <span className="text-xs text-slate-400 block uppercase tracking-wider">Total Recorded Days</span>
          <span className="text-2xl font-bold font-mono text-slate-100 mt-1 block">
            {totalLogs}
          </span>
          <span className="text-[11px] text-slate-400">Canonical database entries</span>
        </div>

        <div className="p-4 rounded-xl bg-obsidian-850 border border-obsidian-750">
          <span className="text-xs text-slate-400 block uppercase tracking-wider">
            {isAbstinence ? 'Clean / Maintained' : 'Completed Target'}
          </span>
          <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
            {successfulDays}
          </span>
          <span className="text-[11px] text-slate-400">Adhered commitments</span>
        </div>

        <div className="p-4 rounded-xl bg-obsidian-850 border border-obsidian-750">
          <span className="text-xs text-slate-400 block uppercase tracking-wider">
            {isAbstinence ? 'Setbacks' : 'Missed Days'}
          </span>
          <span className="text-2xl font-bold font-mono text-red-400 mt-1 block">
            {setbackDays}
          </span>
          <span className="text-[11px] text-slate-400">Audited honest resets</span>
        </div>

        <div className="p-4 rounded-xl bg-obsidian-850 border border-obsidian-750">
          <span className="text-xs text-slate-400 block uppercase tracking-wider">Success Rate</span>
          <span className="text-2xl font-bold font-mono text-gold-300 mt-1 block">
            {adherenceRate}%
          </span>
          <span className="text-[11px] text-slate-400">Historical adherence</span>
        </div>
      </div>

      {/* Configuration Specifications */}
      <Card className="border-obsidian-750 bg-obsidian-850">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wider text-slate-300">
            Habit Configuration & Invariants
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
          <div className="p-3 rounded-lg bg-obsidian-900 border border-obsidian-750">
            <span className="text-slate-400 block">Schedule:</span>
            <span className="text-slate-100 font-semibold mt-0.5 block">{scheduleSummary}</span>
            <span className="text-[11px] text-slate-400">Non-scheduled days excused</span>
          </div>

          {isQuantitative && (
            <div className="p-3 rounded-lg bg-obsidian-900 border border-obsidian-750">
              <span className="text-slate-400 block">Target Threshold:</span>
              <span className="text-gold-300 font-mono font-bold mt-0.5 block">
                {habit.targetConstraint === 'at_most' ? '≤' : '≥'} {habit.targetValue} {habit.unit}
              </span>
              <span className="text-[11px] text-slate-400">Determined automatically</span>
            </div>
          )}

          <div className="p-3 rounded-lg bg-obsidian-900 border border-obsidian-750">
            <span className="text-slate-400 block">Audit Tracking:</span>
            <span className="text-emerald-400 font-semibold mt-0.5 block">Active</span>
            <span className="text-[11px] text-slate-400">{auditRecords?.length || 0} audit log entries</span>
          </div>
        </CardContent>
      </Card>

      {/* Historical Daily Logs Table */}
      <Card className="border-obsidian-750 bg-obsidian-850">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gold-400" />
              <span>Historical Daily Records</span>
            </CardTitle>
            <CardDescription>
              Every recorded check-in, measured value, note, and correction.
            </CardDescription>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCheckIn(habit)}
            className="text-xs text-gold-400 hover:text-gold-300"
          >
            + Log Custom Date
          </Button>
        </CardHeader>

        <CardContent>
          {!logs || logs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 border border-dashed border-obsidian-750 rounded-xl">
              <Clock className="w-8 h-8 mx-auto text-slate-500 mb-2" />
              <p className="text-sm font-medium text-slate-300">No logs recorded yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Fulfill your standard today to establish your first sovereign record.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onCheckIn(habit, formatCalendarDate(new Date()))}
                className="mt-4"
              >
                Log Today's Entry
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-obsidian-750/70 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-obsidian-750 font-mono uppercase text-[10px]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    {isQuantitative && <th className="py-2.5 px-3">Measured Value</th>}
                    <th className="py-2.5 px-3">Notes / Reflection</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-obsidian-750/50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-obsidian-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-medium text-slate-200">
                        {log.date}
                      </td>

                      <td className="py-3 px-3">
                        {log.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 font-mono text-[11px] font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {isAbstinence ? 'Maintained' : 'Completed'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-950/60 border border-red-800/50 text-red-400 font-mono text-[11px] font-semibold">
                            <XCircle className="w-3.5 h-3.5" />
                            {isAbstinence ? 'Setback' : 'Missed'}
                          </span>
                        )}
                      </td>

                      {isQuantitative && (
                        <td className="py-3 px-3 font-mono text-slate-300">
                          {log.numericValue !== undefined ? `${log.numericValue} ${habit.unit}` : '—'}
                        </td>
                      )}

                      <td className="py-3 px-3 text-slate-400 max-w-xs truncate">
                        {log.notes || <span className="text-slate-600 italic">No notes</span>}
                        {log.correctedAt && (
                          <span
                            className="block text-[10px] text-amber-400 font-mono mt-0.5"
                            title={log.correctionReason}
                          >
                            Corrected: {log.correctionReason || 'Audited change'}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onCheckIn(habit, log.date, log)}
                          className="text-xs h-7 px-2 text-slate-400 hover:text-gold-300"
                        >
                          Correct
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
