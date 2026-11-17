import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { JournalService } from '../../core/journal/journalService';
import { HabitService } from '../../core/services/habitService';
import type { JournalEntry } from '../../core/journal/journalTypes';
import type { Habit } from '../../core/domain/types';
import {
  Search,
  Tag,
  Calendar,
  Archive,
  Edit2,
  BookOpen,
  Smile,
  X
} from 'lucide-react';

interface JournalHistoryProps {
  onSelectEntryForEdit: (entry: JournalEntry) => void;
  refreshTrigger?: number;
}

export const JournalHistory: React.FC<JournalHistoryProps> = ({
  onSelectEntryForEdit,
  refreshTrigger = 0
}) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedHabitId, setSelectedHabitId] = useState<string>('');
  const [includeArchived, setIncludeArchived] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);
  const pageSize = 10;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [res, tags, allHabits] = await Promise.all([
        JournalService.queryEntries({
          searchQuery: searchQuery.trim() || undefined,
          tags: selectedTag ? [selectedTag] : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          linkedHabitId: selectedHabitId || undefined,
          includeArchived,
          limit: pageSize,
          offset: page * pageSize
        }),
        JournalService.getAllTags(),
        HabitService.getAllHabits({ status: 'active' })
      ]);

      setEntries(res.entries);
      setTotalCount(res.total);
      setAllTags(tags);
      setHabits(allHabits);
    } catch (err) {
      console.error('Failed to load journal history', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedTag, startDate, endDate, selectedHabitId, includeArchived, page]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshTrigger]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTag('');
    setStartDate('');
    setEndDate('');
    setSelectedHabitId('');
    setIncludeArchived(false);
    setPage(0);
  };

  const hasActiveFilters =
    Boolean(searchQuery) ||
    Boolean(selectedTag) ||
    Boolean(startDate) ||
    Boolean(endDate) ||
    Boolean(selectedHabitId) ||
    includeArchived;

  const getHabitTitle = (id?: string) => {
    if (!id) return null;
    const h = habits.find((item) => item.id === id);
    return h ? h.title : null;
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <Card className="border-obsidian-750 bg-obsidian-850 shadow-md">
      <CardHeader className="pb-3 border-b border-obsidian-750/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-gold-400" />
            <CardTitle className="text-base text-slate-100">Journal Archives & Timeline</CardTitle>
            <Badge variant="outline" size="sm" className="font-mono text-[10px]">
              {totalCount} {totalCount === 1 ? 'entry' : 'entries'}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIncludeArchived(!includeArchived);
                setPage(0);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border transition-colors ${
                includeArchived
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-obsidian-900 border-obsidian-750 text-slate-400 hover:text-slate-300'
              }`}
            >
              <Archive className="w-3 h-3" />
              <span>{includeArchived ? 'Showing Archived' : 'Show Archived'}</span>
            </button>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs text-slate-400 hover:text-slate-200 gap-1 px-2 py-1"
              >
                <X className="w-3 h-3" />
                <span>Reset</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="pt-3 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-5 relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="Search reflections by keyword..."
                className="w-full bg-obsidian-900 border border-obsidian-750 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-gold-500/50"
              />
            </div>

            <div className="sm:col-span-4 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(0);
                }}
                className="w-full bg-obsidian-900 border border-obsidian-750 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-gold-500/50"
                title="Start Date"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(0);
                }}
                className="w-full bg-obsidian-900 border border-obsidian-750 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-gold-500/50"
                title="End Date"
              />
            </div>

            <div className="sm:col-span-3">
              <select
                value={selectedHabitId}
                onChange={(e) => {
                  setSelectedHabitId(e.target.value);
                  setPage(0);
                }}
                className="w-full bg-obsidian-900 border border-obsidian-750 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-gold-500/50"
              >
                <option value="">All Habits</option>
                {habits.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tag Pills Bar */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0">
                <Tag className="w-3 h-3 text-gold-400" />
                <span>Tags:</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedTag('');
                  setPage(0);
                }}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors shrink-0 ${
                  !selectedTag
                    ? 'bg-gold-500/20 text-gold-300 font-medium border border-gold-500/40'
                    : 'bg-obsidian-900 text-slate-400 border border-obsidian-750'
                }`}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setSelectedTag(selectedTag === tag ? '' : tag);
                    setPage(0);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors shrink-0 ${
                    selectedTag === tag
                      ? 'bg-gold-500/20 text-gold-300 font-medium border border-gold-500/40'
                      : 'bg-obsidian-900 text-slate-400 border border-obsidian-750 hover:text-slate-200'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-3">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading sovereign timeline...</div>
        ) : entries.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <BookOpen className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
            <h4 className="text-sm font-medium text-slate-200">No reflections found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'No journal entries match the current filter criteria. Try resetting filters.'
                : 'Your journal is a blank slate. Begin recording your sovereign thoughts above.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const habitTitle = getHabitTitle(entry.linkedHabitId);
              const previewText =
                entry.content.length > 220 ? `${entry.content.slice(0, 220)}...` : entry.content;

              return (
                <div
                  key={entry.id}
                  className="p-3.5 rounded-xl bg-obsidian-900/90 border border-obsidian-750 hover:border-gold-500/40 transition-all group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-gold-400 bg-gold-950/60 border border-gold-800/40 px-2 py-0.5 rounded">
                        {entry.date}
                      </span>
                      {entry.title && (
                        <h4 className="text-sm font-semibold text-slate-100">{entry.title}</h4>
                      )}
                      {entry.isArchived && (
                        <Badge variant="outline" size="sm" className="text-[10px] text-amber-400 border-amber-600/40">
                          Archived
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {entry.mood && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Smile className="w-3 h-3 text-gold-400" />
                          <span>Mood: {entry.mood}/5</span>
                        </span>
                      )}
                      {entry.emotionalState && (
                        <span className="text-[11px] capitalize text-slate-300 bg-obsidian-800 border border-obsidian-700 px-2 py-0.5 rounded">
                          {entry.emotionalState}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSelectEntryForEdit(entry)}
                        className="text-xs text-slate-400 hover:text-gold-300 gap-1 px-2 py-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-3 mb-2.5">
                    {previewText}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex flex-wrap gap-1">
                      {entry.tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded bg-obsidian-800 border border-obsidian-700 text-slate-400 text-[10px]"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>

                    {habitTitle && (
                      <span className="text-[10px] text-gold-400/90 bg-gold-950/40 border border-gold-800/40 px-2 py-0.5 rounded">
                        Commitment: {habitTitle}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-obsidian-750/70 text-xs">
            <span className="text-slate-400">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="text-xs px-2.5 py-1"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage(page + 1)}
                className="text-xs px-2.5 py-1"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
