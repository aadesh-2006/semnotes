import { useState } from 'react';
import { MONTH_NAMES } from '../../core/calendar/calendarUtils';
import type { DailyDisciplineSummary } from '../../core/calendar/calendarTypes';
import { selectHeatmapData } from '../../core/calendar/calendarSelectors';

interface YearlyHeatmapProps {
  year: number;
  summaries: Map<string, DailyDisciplineSummary>;
  selectedDate?: string;
  onSelectDate: (date: string) => void;
}

export function YearlyHeatmap({
  year,
  summaries,
  selectedDate,
  onSelectDate
}: YearlyHeatmapProps) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const heatmapDays = selectHeatmapData(summaries);

  // Group into 53 columns (weeks 0 to 52)
  const columns: typeof heatmapDays[] = [];
  let currentWeek: typeof heatmapDays = [];

  for (const day of heatmapDays) {
    if (day.dayOfWeek === 0 && currentWeek.length > 0) {
      columns.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  }
  if (currentWeek.length > 0) {
    columns.push(currentWeek);
  }

  // Get style class for intensity
  const getCellClasses = (day: (typeof heatmapDays)[0]) => {
    const isSelected = selectedDate === day.date;
    let base = 'transition-all cursor-pointer rounded-[2px] border ';

    if (isSelected) {
      return base + 'ring-2 ring-gold-400 border-gold-300 z-10 scale-125';
    }

    if (day.status === 'paused') {
      return base + 'bg-obsidian-800 border-obsidian-700 opacity-60';
    }

    switch (day.intensity) {
      case 4: // 100% Complete
        return base + 'bg-[#C5A869] border-[#E5C378] shadow-sm shadow-gold-500/20';
      case 3: // 75-99%
        return base + 'bg-[#8A6724] border-[#B88E33]';
      case 2: // 40-74%
        return base + 'bg-[#553E17] border-[#7F5E24]';
      case 1: // 1-39% or pending
        return base + 'bg-[#2E2312] border-[#4A371B]';
      case 0: // Failed / Missed (strict red)
        return base + 'bg-[#401818] border-[#662626]';
      case -1: // Rest / Unscheduled / Future
      default:
        return base + 'bg-[#101117] border-[#1A1C24] hover:border-obsidian-600';
    }
  };

  const hoveredSummary = hoveredDate ? summaries.get(hoveredDate) : null;

  return (
    <div className="rounded-xl border border-obsidian-750 bg-obsidian-850 p-4 sm:p-5 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-obsidian-750">
        <div>
          <h3 className="text-base sm:text-lg font-bold font-display text-slate-100">
            {year} Discipline Contribution Heatmap
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Full annual consistency matrix. Dark obsidian indicates rest; sovereign gold reflects perfect adherence; crimson denotes setbacks.
          </p>
        </div>

        {/* Hover inspector badge */}
        <div className="h-6 flex items-center">
          {hoveredSummary ? (
            <div className="text-xs font-mono px-2 py-0.5 rounded bg-obsidian-900 border border-obsidian-700 text-slate-200 flex items-center gap-2">
              <span className="font-semibold text-gold-400">{hoveredSummary.date}</span>
              <span>•</span>
              <span className="capitalize">{hoveredSummary.status}</span>
              {hoveredSummary.scheduledCount > 0 && (
                <>
                  <span>•</span>
                  <span>
                    {hoveredSummary.completedCount}/{hoveredSummary.scheduledCount} ({hoveredSummary.completionPercentage ?? 0}%)
                  </span>
                </>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-400 font-mono">
              Hover or click any square to inspect
            </span>
          )}
        </div>
      </div>

      {/* Heatmap Grid Wrapper (horizontally scrollable on small screens) */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[720px] inline-block">
          {/* Month Header row */}
          <div className="flex text-[10px] text-slate-400 font-mono mb-1.5 pl-6">
            {MONTH_NAMES.map((month) => (
              <span key={month} className="w-[58px] text-left truncate">
                {month.slice(0, 3)}
              </span>
            ))}
          </div>

          <div className="flex gap-1.5">
            {/* Weekday Labels (Mon, Wed, Fri) */}
            <div className="flex flex-col justify-between text-[9px] text-slate-400 font-mono pr-1.5 pt-0.5 pb-0.5 select-none">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Weeks Columns */}
            <div className="flex gap-1">
              {columns.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1">
                  {/* Pad week if starting mid-week */}
                  {wIdx === 0 &&
                    Array.from({ length: week[0]?.dayOfWeek || 0 }).map((_, padIdx) => (
                      <div key={`pad-${padIdx}`} className="w-3 h-3 opacity-0" />
                    ))}

                  {week.map((day) => (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => onSelectDate(day.date)}
                      onMouseEnter={() => setHoveredDate(day.date)}
                      onMouseLeave={() => setHoveredDate(null)}
                      className={`w-3 h-3 ${getCellClasses(day)}`}
                      aria-label={`${day.date}: ${day.status}, ${day.completionPercentage ?? 0}% completed`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap Legend */}
      <div className="pt-3 border-t border-obsidian-750 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="text-[11px]">Strict Failure:</span>
          <span className="w-3 h-3 rounded-[2px] bg-[#401818] border border-[#662626]" title="Failed / Missed" />
          <span className="text-[11px] text-red-400">0%</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px]">Rest / Unscheduled:</span>
          <span className="w-3 h-3 rounded-[2px] bg-[#101117] border border-[#1A1C24]" title="Rest Day" />
          <span className="text-[11px]">Paused:</span>
          <span className="w-3 h-3 rounded-[2px] bg-obsidian-800 border border-obsidian-700" title="Paused" />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] mr-1">Adherence:</span>
          <span className="text-[10px]">Less</span>
          <span className="w-3 h-3 rounded-[2px] bg-[#2E2312] border border-[#4A371B]" title="1-39%" />
          <span className="w-3 h-3 rounded-[2px] bg-[#553E17] border-[#7F5E24]" title="40-74%" />
          <span className="w-3 h-3 rounded-[2px] bg-[#8A6724] border-[#B88E33]" title="75-99%" />
          <span className="w-3 h-3 rounded-[2px] bg-[#C5A869] border-[#E5C378]" title="100% Sovereign Adherence" />
          <span className="text-[10px] ml-1">Flawless</span>
        </div>
      </div>
    </div>
  );
}
