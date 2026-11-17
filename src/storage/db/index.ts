import Dexie, { type Table } from 'dexie';
import type {
  Habit,
  HabitLog,
  Milestone,
  JournalEntry,
  UrgeLog,
  FocusSession,
  UserSettings
} from '../../core/domain/types';

export class SemnotesDatabase extends Dexie {
  habits!: Table<Habit, string>;
  habitLogs!: Table<HabitLog, string>;
  milestones!: Table<Milestone, string>;
  journalEntries!: Table<JournalEntry, string>;
  urgeLogs!: Table<UrgeLog, string>;
  focusSessions!: Table<FocusSession, string>;
  userSettings!: Table<UserSettings & { id: string }, string>;

  constructor() {
    super('semnotes_db');

    this.version(1).stores({
      habits: 'id, category, type, status, startDate, createdAt',
      habitLogs: 'id, habitId, date, status, [habitId+date]',
      milestones: 'id, habitId, thresholdDays, isUnlocked, isClaimed',
      journalEntries: 'id, date, mood, createdAt',
      urgeLogs: 'id, habitId, timestamp, intensity, response',
      focusSessions: 'id, habitId, startedAt, status',
      userSettings: 'id'
    });
  }
}

export const db = new SemnotesDatabase();
