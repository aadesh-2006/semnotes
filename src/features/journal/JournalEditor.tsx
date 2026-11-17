import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ConfirmationDialog } from '../../components/ui/confirmation-dialog';
import { JournalService } from '../../core/journal/journalService';
import { HabitService } from '../../core/services/habitService';
import type { JournalEntry, MoodScore, EmotionalState } from '../../core/journal/journalTypes';
import type { Habit } from '../../core/domain/types';
import { formatCalendarDate } from '../../core/utils';
import {
  BookOpen,
  Eye,
  Edit3,
  Save,
  Trash2,
  Archive,
  ArchiveRestore,
  Tag,
  Link,
  Smile,
  Lock,
  CheckCircle2
} from 'lucide-react';

interface JournalEditorProps {
  entryToEdit?: JournalEntry | null;
  onSaved?: (entry: JournalEntry) => void;
  onDeleted?: (id: string) => void;
  onCancel?: () => void;
}

const EMOTIONAL_STATES: { id: EmotionalState; label: string; icon: string }[] = [
  { id: 'calm', label: 'Calm', icon: '🌊' },
  { id: 'focused', label: 'Focused', icon: '🎯' },
  { id: 'energized', label: 'Energized', icon: '⚡' },
  { id: 'victorious', label: 'Victorious', icon: '🏆' },
  { id: 'reflective', label: 'Reflective', icon: '🕯️' },
  { id: 'neutral', label: 'Neutral', icon: '⚖️' },
  { id: 'anxious', label: 'Anxious', icon: '🌪️' },
  { id: 'fatigued', label: 'Fatigued', icon: '🔋' },
  { id: 'frustrated', label: 'Frustrated', icon: '🔥' }
];

export const JournalEditor: React.FC<JournalEditorProps> = ({
  entryToEdit,
  onSaved,
  onDeleted,
  onCancel
}) => {
  const [date, setDate] = useState<string>(entryToEdit?.date || formatCalendarDate(new Date()));
  const [title, setTitle] = useState<string>(entryToEdit?.title || '');
  const [content, setContent] = useState<string>(entryToEdit?.content || '');
  const [tags, setTags] = useState<string[]>(entryToEdit?.tags || []);
  const [tagInput, setTagInput] = useState<string>('');
  const [linkedHabitId, setLinkedHabitId] = useState<string>(entryToEdit?.linkedHabitId || '');
  const [mood, setMood] = useState<MoodScore | undefined>(entryToEdit?.mood);
  const [emotionalState, setEmotionalState] = useState<EmotionalState | undefined>(entryToEdit?.emotionalState);
  const [isArchived, setIsArchived] = useState<boolean>(entryToEdit?.isArchived || false);

  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    async function loadHabits() {
      try {
        const allHabits = await HabitService.getAllHabits({ status: 'active' });
        if (mounted) setHabits(allHabits);
      } catch (err) {
        console.error('Failed to load active habits for journal', err);
      }
    }
    loadHabits();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (entryToEdit) {
      setDate(entryToEdit.date);
      setTitle(entryToEdit.title);
      setContent(entryToEdit.content);
      setTags(entryToEdit.tags || []);
      setLinkedHabitId(entryToEdit.linkedHabitId || '');
      setMood(entryToEdit.mood);
      setEmotionalState(entryToEdit.emotionalState);
      setIsArchived(entryToEdit.isArchived);
    }
  }, [entryToEdit]);

  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const clean = tagInput.trim().toLowerCase();
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      setIsSubmitting(true);
      let saved: JournalEntry;

      if (entryToEdit) {
        saved = await JournalService.updateEntry(entryToEdit.id, {
          date,
          title: title.trim() || undefined,
          content: content.trim(),
          tags,
          linkedHabitId: linkedHabitId || undefined,
          mood,
          emotionalState,
          isArchived
        });
      } else {
        saved = await JournalService.createEntry({
          date,
          title: title.trim() || undefined,
          content: content.trim(),
          tags,
          linkedHabitId: linkedHabitId || undefined,
          mood,
          emotionalState,
          isArchived
        });
        // Clear if new entry
        setTitle('');
        setContent('');
        setTags([]);
        setLinkedHabitId('');
      }

      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);

      if (onSaved) {
        onSaved(saved);
      }
    } catch (err) {
      console.error('Failed to save journal entry', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!entryToEdit) return;
    try {
      await JournalService.deleteEntry(entryToEdit.id);
      setIsDeleteDialogOpen(false);
      if (onDeleted) {
        onDeleted(entryToEdit.id);
      }
    } catch (err) {
      console.error('Failed to delete journal entry', err);
    }
  };

  const toggleArchive = async () => {
    if (!entryToEdit) {
      setIsArchived(!isArchived);
      return;
    }
    const nextState = !isArchived;
    const updated = await JournalService.setArchiveState(entryToEdit.id, nextState);
    setIsArchived(nextState);
    if (onSaved) {
      onSaved(updated);
    }
  };

  // Simple Markdown renderer for preview
  const renderMarkdown = (text: string) => {
    if (!text.trim()) {
      return <p className="text-slate-400 italic text-xs">Nothing to preview yet.</p>;
    }
    const lines = text.split('\n');
    return (
      <div className="prose prose-invert max-w-none text-xs sm:text-sm space-y-2 text-slate-200">
        {lines.map((line, idx) => {
          if (line.startsWith('# ')) {
            return <h1 key={idx} className="text-lg font-bold text-slate-100">{line.slice(2)}</h1>;
          }
          if (line.startsWith('## ')) {
            return <h2 key={idx} className="text-base font-semibold text-slate-100">{line.slice(3)}</h2>;
          }
          if (line.startsWith('### ')) {
            return <h3 key={idx} className="text-sm font-semibold text-slate-200">{line.slice(4)}</h3>;
          }
          if (line.startsWith('> ')) {
            return (
              <blockquote key={idx} className="border-l-2 border-gold-500/50 pl-3 italic text-slate-300">
                {line.slice(2)}
              </blockquote>
            );
          }
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <li key={idx} className="ml-4 list-disc text-slate-300">
                {line.slice(2)}
              </li>
            );
          }
          if (!line.trim()) {
            return <div key={idx} className="h-2" />;
          }
          return <p key={idx} className="leading-relaxed">{line}</p>;
        })}
      </div>
    );
  };

  return (
    <Card className="border-obsidian-750 bg-obsidian-850 shadow-lg">
      <CardHeader className="pb-3 border-b border-obsidian-750/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-gold-400" />
              <span>{entryToEdit ? 'Edit Sovereign Journal Entry' : 'Private Reflection Journal'}</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              End-to-end local sovereign storage. Nothing is sent to cloud servers.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-gold-400/90 bg-gold-950/60 border border-gold-800/40 px-2.5 py-1 rounded-md">
              <Lock className="w-3 h-3" />
              <span>Sovereign Local-First</span>
            </div>

            {/* Edit / Preview Tabs */}
            <div className="flex items-center bg-obsidian-900 border border-obsidian-750 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('write')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  activeTab === 'write'
                    ? 'bg-obsidian-800 text-gold-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Edit3 className="w-3 h-3" />
                <span>Write</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-obsidian-800 text-gold-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Preview</span>
              </button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-8">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Entry title (e.g. Navigating Resistance with Dignity)..."
                className="w-full bg-obsidian-900 border border-obsidian-750 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-gold-500/50"
              />
            </div>
            <div className="sm:col-span-4">
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-obsidian-900 border border-obsidian-750 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-gold-500/50"
              />
            </div>
          </div>

          {activeTab === 'write' ? (
            <div>
              <textarea
                required
                rows={9}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your sovereign reflections here using Markdown (# headers, - lists, > quotes)..."
                className="w-full bg-obsidian-900 border border-obsidian-750 rounded-lg p-3 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-gold-500/50 font-mono"
              />
              <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
                <span>{content.length} characters &bull; Markdown supported</span>
                <span>Unsaved changes protected</span>
              </div>
            </div>
          ) : (
            <div className="min-h-[220px] p-4 bg-obsidian-900 border border-obsidian-750 rounded-lg">
              {renderMarkdown(content)}
            </div>
          )}

          {/* Metadata: Tags, Linked Habit, Emotional State */}
          <div className="p-3 bg-obsidian-900/80 border border-obsidian-750/70 rounded-lg space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Linked Habit */}
              <div>
                <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5 mb-1">
                  <Link className="w-3 h-3 text-gold-400" />
                  <span>Linked Commitment / Habit (Optional)</span>
                </label>
                <select
                  value={linkedHabitId}
                  onChange={(e) => setLinkedHabitId(e.target.value)}
                  className="w-full bg-obsidian-850 border border-obsidian-700 rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-gold-500/50"
                >
                  <option value="">No linked habit</option>
                  {habits.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.title} ({h.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Mood Scale (1 to 5) */}
              <div>
                <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5 mb-1">
                  <Smile className="w-3 h-3 text-gold-400" />
                  <span>Self-Reported State (1 = lowest, 5 = highest)</span>
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMood(m as MoodScore)}
                      className={`flex-1 py-1 rounded text-xs font-mono font-bold border transition-colors ${
                        mood === m
                          ? 'bg-gold-500/20 border-gold-500/60 text-gold-300'
                          : 'bg-obsidian-850 border-obsidian-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Emotional State Selector */}
            <div>
              <label className="text-[11px] font-medium text-slate-300 mb-1 block">
                Primary Emotional State (Self-Reported)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {EMOTIONAL_STATES.map((state) => (
                  <button
                    key={state.id}
                    type="button"
                    onClick={() => setEmotionalState(emotionalState === state.id ? undefined : state.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] border transition-colors ${
                      emotionalState === state.id
                        ? 'bg-gold-500/15 border-gold-500/50 text-gold-300 font-medium'
                        : 'bg-obsidian-850 border-obsidian-750 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <span>{state.icon}</span>
                    <span>{state.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tags management */}
            <div>
              <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5 mb-1">
                <Tag className="w-3 h-3 text-gold-400" />
                <span>Tags</span>
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Type tag and press enter (e.g. stoicism, deep-work)..."
                  className="w-full bg-obsidian-850 border border-obsidian-700 rounded-md px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-gold-500/50"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim()}
                  className="text-xs shrink-0"
                >
                  Add Tag
                </Button>
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <Badge
                      key={t}
                      variant="gold"
                      size="sm"
                      className="cursor-pointer gap-1"
                      onClick={() => handleRemoveTag(t)}
                    >
                      <span>#{t}</span>
                      <span className="text-gold-400 hover:text-white">&times;</span>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {savedNotice && (
            <div className="p-2.5 rounded-lg bg-gold-950/50 border border-gold-800/60 text-xs text-gold-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-gold-400 shrink-0" />
              <span>Sovereign entry saved to client database.</span>
            </div>
          )}

          {/* Action Toolbar */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              {entryToEdit && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleArchive}
                    className="text-xs gap-1.5 text-slate-300 border-obsidian-700"
                  >
                    {isArchived ? (
                      <>
                        <ArchiveRestore className="w-3.5 h-3.5" />
                        <span>Unarchive</span>
                      </>
                    ) : (
                      <>
                        <Archive className="w-3.5 h-3.5" />
                        <span>Archive</span>
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-xs gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {onCancel && (
                <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="text-xs">
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting || !content.trim()}
                className="gap-2 text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Saving...' : entryToEdit ? 'Update Entry' : 'Save Entry'}</span>
              </Button>
            </div>
          </div>
        </form>
      </CardContent>

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        title="Permanently Delete Journal Entry"
        description="Are you sure you want to delete this reflection? This action is irreversible."
        confirmLabel="Delete Permanently"
        cancelLabel="Keep Entry"
        variant="danger"
        onConfirm={handleDelete}
        onClose={() => setIsDeleteDialogOpen(false)}
      />
    </Card>
  );
};
