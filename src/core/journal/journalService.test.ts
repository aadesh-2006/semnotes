import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../storage/db';
import { JournalService } from './journalService';

describe('JournalService', () => {
  beforeEach(async () => {
    await db.journalEntries.clear();
  });

  describe('CRUD Operations', () => {
    it('creates and reads a journal entry with valid metadata', async () => {
      const entry = await JournalService.createEntry({
        date: '2026-11-17',
        title: 'Morning Clarity',
        content: 'Maintained total discipline during deep work today.',
        tags: ['focus', 'deep-work'],
        mood: 5,
        emotionalState: 'victorious'
      });

      expect(entry.id).toBeDefined();
      expect(entry.date).toBe('2026-11-17');
      expect(entry.title).toBe('Morning Clarity');
      expect(entry.tags).toEqual(['focus', 'deep-work']);
      expect(entry.isArchived).toBe(false);

      const fetched = await JournalService.getEntryById(entry.id);
      expect(fetched).toBeDefined();
      expect(fetched?.content).toBe(entry.content);
    });

    it('rejects creation when content is empty', async () => {
      await expect(
        JournalService.createEntry({
          date: '2026-11-17',
          title: 'Empty',
          content: ''
        })
      ).rejects.toThrow('Journal content cannot be empty');
    });

    it('updates an existing journal entry cleanly', async () => {
      const entry = await JournalService.createEntry({
        date: '2026-11-17',
        title: 'Initial Title',
        content: 'Original content',
        tags: ['draft']
      });

      const updated = await JournalService.updateEntry(entry.id, {
        title: 'Refined Title',
        content: 'Refined content with deeper insight.',
        tags: ['draft', 'refined']
      });

      expect(updated.title).toBe('Refined Title');
      expect(updated.content).toBe('Refined content with deeper insight.');
      expect(updated.tags).toEqual(['draft', 'refined']);
    });

    it('toggles archive status and excludes archived entries by default in queries', async () => {
      const entry = await JournalService.createEntry({
        date: '2026-11-17',
        title: 'To Be Archived',
        content: 'Archival test entry'
      });

      await JournalService.setArchiveState(entry.id, true);

      // Default query excludes archived
      const activeResults = await JournalService.queryEntries();
      expect(activeResults.entries.some((e) => e.id === entry.id)).toBe(false);

      // Explicitly including archived returns it
      const allResults = await JournalService.queryEntries({ includeArchived: true });
      expect(allResults.entries.some((e) => e.id === entry.id)).toBe(true);
    });

    it('deletes an entry and removes it from storage', async () => {
      const entry = await JournalService.createEntry({
        date: '2026-11-17',
        title: 'Temporary',
        content: 'Will be deleted'
      });

      await JournalService.deleteEntry(entry.id);
      const fetched = await JournalService.getEntryById(entry.id);
      expect(fetched).toBeUndefined();
    });
  });

  describe('Search, Tagging & Pagination', () => {
    beforeEach(async () => {
      await JournalService.createEntry({
        date: '2026-11-15',
        title: 'Cold Exposure Practice',
        content: 'Embraced physical resistance and stoic endurance.',
        tags: ['stoicism', 'body']
      });

      await JournalService.createEntry({
        date: '2026-11-16',
        title: 'Algorithms & Architecture',
        content: 'Completed graph traversal problems and design patterns.',
        tags: ['craft', 'dsa']
      });

      await JournalService.createEntry({
        date: '2026-11-17',
        title: 'Evening Debrief on Boundaries',
        content: 'Protected sovereign focus against digital distractions.',
        tags: ['stoicism', 'discipline']
      });
    });

    it('searches by keyword in title and content (case-insensitive)', async () => {
      // Matches title
      const titleMatches = await JournalService.queryEntries({ searchQuery: 'exposure' });
      expect(titleMatches.total).toBe(1);
      expect(titleMatches.entries[0].title).toBe('Cold Exposure Practice');

      // Matches content
      const contentMatches = await JournalService.queryEntries({ searchQuery: 'sovereign' });
      expect(contentMatches.total).toBe(1);
      expect(contentMatches.entries[0].title).toBe('Evening Debrief on Boundaries');
    });

    it('filters by single tag and multiple tags', async () => {
      const stoicEntries = await JournalService.queryEntries({ tags: ['stoicism'] });
      expect(stoicEntries.total).toBe(2);

      const multiTagMatches = await JournalService.queryEntries({ tags: ['stoicism', 'discipline'] });
      expect(multiTagMatches.total).toBe(1);
      expect(multiTagMatches.entries[0].title).toBe('Evening Debrief on Boundaries');
    });

    it('filters by calendar date ranges', async () => {
      const rangeEntries = await JournalService.queryEntries({
        startDate: '2026-11-16',
        endDate: '2026-11-17'
      });
      expect(rangeEntries.total).toBe(2);
      expect(rangeEntries.entries.map((e) => e.date)).toEqual(['2026-11-17', '2026-11-16']);
    });

    it('paginates results accurately with limit and offset', async () => {
      const page1 = await JournalService.queryEntries({ limit: 2, offset: 0 });
      expect(page1.entries).toHaveLength(2);
      expect(page1.total).toBe(3);

      const page2 = await JournalService.queryEntries({ limit: 2, offset: 2 });
      expect(page2.entries).toHaveLength(1);
      expect(page2.total).toBe(3);
    });

    it('collects all unique tags across entries in alphabetical order', async () => {
      const tags = await JournalService.getAllTags();
      expect(tags).toEqual(['body', 'craft', 'discipline', 'dsa', 'stoicism']);
    });
  });
});
