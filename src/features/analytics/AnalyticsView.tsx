import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../storage/db';
import { formatCalendarDate, parseCalendarDate } from '../../core/utils';
import { getPresetDateRange } from '../../core/analytics/analyticsDateUtils';
import { DisciplineScoreEngine } from '../../core/analytics/disciplineScoreEngine';
import { TrendAnalysisService } from '../../core/analytics/trendAnalysisService';
import { HabitPerformanceService } from '../../core/analytics/habitPerformanceService';
import { ConsistencyInsightsService } from '../../core/analytics/consistencyInsightsService';
import type {
  AnalyticsFilterCriteria,
  AnalyticsTimePreset
} from '../../core/analytics/analyticsTypes';

import { DisciplineScoreCard } from './DisciplineScoreCard';
import { DisciplineTrendChart } from './DisciplineTrendChart';
import { CompletedVsMissedChart } from './CompletedVsMissedChart';
import { HabitPerformancePanel } from './HabitPerformancePanel';
import { CategoryPerformancePanel } from './CategoryPerformancePanel';
import { ConsistencyInsights } from './ConsistencyInsights';
import { RecoveryAnalytics } from './RecoveryAnalytics';
import { AnalyticsFilters } from './AnalyticsFilters';
import { Badge } from '../../components/ui/badge';
import { Activity, Shield } from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const todayStr = formatCalendarDate(new Date());

  // Dexie live queries
  const habits = useLiveQuery(() => db.habits.toArray(), []);
  const logs = useLiveQuery(() => db.habitLogs.toArray(), []);
  const audits = useLiveQuery(() => db.auditRecords.toArray(), []);

  // Filter criteria state with fully resolved default date range
  const [filters, setFilters] = useState<AnalyticsFilterCriteria>(() => {
    const range = getPresetDateRange('30d', formatCalendarDate(new Date()));
    return {
      preset: '30d',
      startDate: range.startDate,
      endDate: range.endDate
    };
  });

  // Window days calculation
  const windowDays = useMemo(() => {
    const dStart = parseCalendarDate(filters.startDate);
    const dEnd = parseCalendarDate(filters.endDate);
    const diff = Math.round((dEnd.getTime() - dStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  }, [filters.startDate, filters.endDate]);

  // Filter handlers
  const handlePresetChange = (preset: AnalyticsTimePreset) => {
    if (preset === 'custom') {
      setFilters((prev) => ({
        ...prev,
        preset: 'custom'
      }));
    } else {
      const range = getPresetDateRange(preset, todayStr);
      setFilters((prev) => ({
        ...prev,
        preset,
        startDate: range.startDate,
        endDate: range.endDate
      }));
    }
  };

  const handleStartDateChange = (newStart: string) => {
    setFilters((prev) => ({
      ...prev,
      preset: 'custom',
      startDate: newStart,
      endDate: prev.endDate || todayStr
    }));
  };

  const handleEndDateChange = (newEnd: string) => {
    setFilters((prev) => ({
      ...prev,
      preset: 'custom',
      startDate: prev.startDate,
      endDate: newEnd
    }));
  };

  const handleHabitChange = (habitId?: string) => {
    setFilters((prev) => ({
      ...prev,
      selectedHabitId: habitId
    }));
  };

  const handleCategoryChange = (category?: string) => {
    setFilters((prev) => ({
      ...prev,
      selectedCategory: category
    }));
  };

  const handleReset = () => {
    const range = getPresetDateRange('30d', todayStr);
    setFilters({
      preset: '30d',
      startDate: range.startDate,
      endDate: range.endDate
    });
  };

  // Filtered habits for calculations
  const filteredHabits = useMemo(() => {
    if (!habits) return [];
    return habits.filter((h) => {
      if (filters.selectedHabitId && h.id !== filters.selectedHabitId) return false;
      if (filters.selectedCategory && h.category !== filters.selectedCategory) return false;
      return true;
    });
  }, [habits, filters.selectedHabitId, filters.selectedCategory]);

  // Calculate Headline Discipline Score Result
  const scoreResult = useMemo(() => {
    if (!habits) return null;
    return DisciplineScoreEngine.calculateDisciplineScore(
      filteredHabits,
      logs || [],
      audits || [],
      {
        evaluationDate: filters.endDate,
        windowDays: windowDays
      }
    );
  }, [filteredHabits, logs, audits, filters.endDate, windowDays]);

  // Daily Adherence Series for Recharts
  const dailyTrendSeries = useMemo(() => {
    if (!habits) return [];
    return TrendAnalysisService.buildDailyAdherenceSeries(
      filters.startDate,
      filters.endDate,
      filteredHabits,
      logs || [],
      audits || [],
      todayStr
    );
  }, [filteredHabits, logs, audits, filters.startDate, filters.endDate, todayStr]);

  // Weekly & Monthly Series
  const weeklyTrendSeries = useMemo(() => {
    return TrendAnalysisService.buildWeeklyAdherenceSeries(dailyTrendSeries);
  }, [dailyTrendSeries]);

  const monthlyTrendSeries = useMemo(() => {
    return TrendAnalysisService.buildMonthlyAdherenceSeries(dailyTrendSeries);
  }, [dailyTrendSeries]);

  // Habit Performance Metrics
  const habitPerformances = useMemo(() => {
    if (!habits) return [];
    return HabitPerformanceService.calculateHabitPerformance(
      habits,
      logs || [],
      audits || [],
      {
        startDate: filters.startDate,
        endDate: filters.endDate,
        evaluationDate: todayStr,
        filterHabitIds: filters.selectedHabitId ? [filters.selectedHabitId] : undefined,
        filterCategories: filters.selectedCategory ? [filters.selectedCategory] : undefined
      }
    );
  }, [habits, logs, audits, filters.startDate, filters.endDate, todayStr, filters.selectedHabitId, filters.selectedCategory]);

  // Category Performance Metrics
  const categoryPerformances = useMemo(() => {
    return HabitPerformanceService.calculateCategoryPerformance(habitPerformances);
  }, [habitPerformances]);

  // Consistency Insights
  const insights = useMemo(() => {
    return ConsistencyInsightsService.generateInsights(dailyTrendSeries, habitPerformances);
  }, [dailyTrendSeries, habitPerformances]);

  // Setback Recovery Analytics
  const recoveryMetric = useMemo(() => {
    return ConsistencyInsightsService.calculateSetbackRecovery(
      dailyTrendSeries,
      habitPerformances
    );
  }, [dailyTrendSeries, habitPerformances]);

  const isLoading = habits === undefined || logs === undefined || audits === undefined;

  if (isLoading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gold-400 font-mono text-sm animate-pulse">
          <Activity className="w-4 h-4 animate-spin" />
          <span>Aggregating discipline ledger...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-100">
              Discipline Analytics
            </h2>
            <Badge variant="gold" size="sm">Audited Ledger</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Deterministic consistency auditing, rolling discipline scores, and zero-compromise habit analytics.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant="neutral" size="sm" className="font-mono text-[11px]">
            Audited through {filters.endDate}
          </Badge>
        </div>
      </div>

      {/* Filter Bar */}
      <AnalyticsFilters
        filters={filters}
        habits={habits}
        onPresetChange={handlePresetChange}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        onHabitChange={handleHabitChange}
        onCategoryChange={handleCategoryChange}
        onReset={handleReset}
      />

      {/* Primary Discipline Score Card */}
      {scoreResult && <DisciplineScoreCard scoreResult={scoreResult} />}

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DisciplineTrendChart
          dailyPoints={dailyTrendSeries}
          weeklyPoints={weeklyTrendSeries}
          monthlyPoints={monthlyTrendSeries}
        />
        <CompletedVsMissedChart dailyPoints={dailyTrendSeries} />
      </div>

      {/* Performance Deep Dive: Habit & Category Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HabitPerformancePanel habitMetrics={habitPerformances} />
        <CategoryPerformancePanel categoryMetrics={categoryPerformances} />
      </div>

      {/* Consistency Patterns & Setback Recovery */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConsistencyInsights insights={insights} />
        <RecoveryAnalytics recoveryMetric={recoveryMetric} />
      </div>

      {/* Methodology & Privacy Notice */}
      <div className="p-4 rounded-xl bg-obsidian-900/40 border border-obsidian-800 flex items-start gap-3 text-xs text-slate-400">
        <Shield className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium text-slate-300">
            Algorithmic Integrity & Local Data Sovereignty
          </p>
          <p>
            SEMNÓTĒS calculations run purely in your local browser sandbox via Dexie IndexedDB.
            Discipline scores evaluate scheduled commitments only; rest days, paused periods, and future dates are strictly excluded from the denominator.
            Private journal reflections and urge descriptions are never analyzed or aggregated.
          </p>
        </div>
      </div>
    </div>
  );
};
