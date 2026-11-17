import Dexie, { type Table } from 'dexie';
import type {
  Habit,
  HabitLog,
  AuditRecord,
  Milestone,
  Achievement,
  JournalEntry,
  UrgeLog,
  FocusSession,
  UserSettings
} from '../../core/domain/types';

export class SemnotesDatabase extends Dexie {
  habits!: Table<Habit, string>;
  habitLogs!: Table<HabitLog, string>;
  auditRecords!: Table<AuditRecord, string>;
  milestones!: Table<Milestone, string>;
  achievements!: Table<Achievement, string>;
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

    this.version(2).stores({
      auditRecords: 'id, habitId, habitLogId, date, action, timestamp'
    });

    this.version(3).stores({
      milestones: 'id, habitId, thresholdDays, isEnabled, [habitId+thresholdDays], createdAt',
      achievements: 'id, habitId, milestoneId, thresholdDays, streakStartDate, isClaimed, achievedDate, [habitId+milestoneId+streakStartDate]'
    });
  }
}

export const db = new SemnotesDatabase();
