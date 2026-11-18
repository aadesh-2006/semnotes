import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { CalendarSummary } from './CalendarSummary';
import { CalendarFilters } from './CalendarFilters';
import { MonthlyCalendar } from './MonthlyCalendar';
import { YearlyHeatmap } from './YearlyHeatmap';
import { DayDetailPanel } from './DayDetailPanel';
import { CheckInModal } from '../../components/modals/CheckInModal';
import { CalendarAggregationService } from '../../core/calendar/calendarAggregationService';
import { getMonthDateRange, getYearDateRange } from '../../core/calendar/calendarUtils';
import { formatCalendarDate } from '../../core/utils';
import type { Habit } from '../../core/domain/types';
import type {
  DailyDisciplineSummary,
  CalendarFilters as FilterOptions,
  CalendarViewMode,
  MonthlySummaryMetrics
} from '../../core/calendar/calendarTypes';
import type { RouteId } from '../../app/routes';

interface CalendarViewProps {
  onNavigate?: (route: RouteId) => void;
}

export function CalendarView({ onNavigate }: CalendarViewProps) {
  const navigate = useNavigate();
  const todayStr = useMemo(() => formatCalendarDate(new Date()), []);
  const todayDate = useMemo(() => new Date(), []);

  const [currentYear, setCurrentYear] = useState(todayDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(todayDate.getMonth() + 1); // 1-12
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('monthly');

  const [filters, setFilters] = useState<FilterOptions>({
    lifecycleStatuses: ['active', 'paused']
  });

  const [habits, setHabits] = useState<Habit[]>([]);
  const [summaries, setSummaries] = useState<Map<string, DailyDisciplineSummary>>(new Map());
  const [metrics, setMetrics] = useState<MonthlySummaryMetrics>({
    monthLabel: '',
    year: currentYear,
    month: currentMonth,
    totalScheduledCommitments: 0,
    totalCompletedCommitments: 0,
    totalFailedCommitments: 0,
    totalMissedCommitments: 0,
    averageCompletionPercentage: 0,
    totalSuccessfulDays: 0,
    totalEvaluatedDays: 0
  });

  const [loading, setLoading] = useState(true);

  // Check-in / Audit correction modal state
  const [checkInTarget, setCheckInTarget] = useState<{ habit: Habit; date: string } | null>(null);

  // Fast habit lookup map
  const habitsMap = useMemo(() => {
    const map = new Map<string, Habit>();
    for (const h of habits) {
      map.set(h.id, h);
    }
    return map;
  }, [habits]);

  // Load calendar aggregation data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let rangeStart: string;
      let rangeEnd: string;

      if (viewMode === 'heatmap') {
        // Query full calendar year for heatmap
        const yearRange = getYearDateRange(currentYear);
        rangeStart = yearRange.startDate;
        rangeEnd = yearRange.endDate;
      } else {
        // Monthly view: load month
        const monthRange = getMonthDateRange(currentYear, currentMonth);
        rangeStart = monthRange.startDate;
        rangeEnd = monthRange.endDate;
      }

      const result = await CalendarAggregationService.fetchAndAggregateRange(
        rangeStart,
        rangeEnd,
        filters,
        todayStr
      );

      setHabits(result.allHabits);
      setSummaries(result.summaries);
      setMetrics(result.metrics);
    } catch (err) {
      console.error('Failed to load calendar adherence data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth, viewMode, filters, todayStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Month navigation handlers
  const handleNavigatePrev = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNavigateNext = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleJumpToday = () => {
    setCurrentYear(todayDate.getFullYear());
    setCurrentMonth(todayDate.getMonth() + 1);
    setSelectedDate(todayStr);
  };

  const handleOpenCheckIn = (habit: Habit, date: string) => {
    setCheckInTarget({ habit, date });
  };

  const handleCheckInSaved = async () => {
    setCheckInTarget(null);
    await loadData();
  };

  const selectedSummary = selectedDate ? summaries.get(selectedDate) : undefined;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-100">
              Consistency Calendar & Heatmap
            </h2>
            <Badge variant="gold" size="sm">
              M5 Strict Engine
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Visual proof of sovereignty and discipline. Real adherence records, zero decorative vanity metrics.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-obsidian-750 bg-obsidian-850 hover:bg-obsidian-800 text-xs font-mono text-slate-300 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-gold-400' : ''}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* Analytics Summary */}
      <CalendarSummary metrics={metrics} />

      {/* Filters and View Switcher */}
      <CalendarFilters
        habits={habits}
        filters={filters}
        onFilterChange={setFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Main Calendar Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Calendar View (Monthly Grid or Yearly Heatmap) */}
        <div className="lg:col-span-2 space-y-4">
          {viewMode === 'monthly' ? (
            <MonthlyCalendar
              year={currentYear}
              month={currentMonth}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onNavigatePrev={handleNavigatePrev}
              onNavigateNext={handleNavigateNext}
              onJumpToday={handleJumpToday}
              summaries={summaries}
            />
          ) : (
            <YearlyHeatmap
              year={currentYear}
              summaries={summaries}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          )}
        </div>

        {/* Right Column: Selected Day Details Panel */}
        <div className="lg:col-span-1">
          <DayDetailPanel
            summary={selectedSummary}
            date={selectedDate}
            onClose={() => setSelectedDate('')}
            onOpenCheckIn={handleOpenCheckIn}
            onNavigateToHabit={(habitId) => {
              if (onNavigate) {
                onNavigate('streaks');
              }
              navigate(`/streaks/${habitId}`);
            }}
            habitsMap={habitsMap}
          />
        </div>
      </div>

      {/* In-place Check-in / Correction Modal */}
      {checkInTarget && (
        <CheckInModal
          isOpen={Boolean(checkInTarget)}
          onClose={() => setCheckInTarget(null)}
          habit={checkInTarget.habit}
          targetDate={checkInTarget.date}
          existingLog={selectedSummary?.habits.find((h) => h.habitId === checkInTarget.habit.id)?.log}
          onSuccess={handleCheckInSaved}
        />
      )}
    </div>
  );
}
