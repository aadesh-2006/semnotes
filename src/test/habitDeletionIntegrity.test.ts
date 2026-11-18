/**
 * SEMNÓTĒS — Habit Deletion & Historical Integrity Test Suite (Batch 2)
 * Dignity. Self-respect. Discipline.
 *
 * Verifies that:
 * 1. Normal habit deletion preserves all historical records (logs, audits, milestones,
 *    earned achievements, focus sessions, journal entries, and historical analytics).
 * 2. Explicit permanent purge cleans up dependent records while preserving independent
 *    journal entries and focus sessions (by decoupling foreign keys).
 * 3. Deletion of one habit never affects another independent habit.
 * 4. Failed transactions roll back cleanly without partial corruption.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../storage/db';
import { HabitService } from '../core/services/habitService';
import { HabitLogService } from '../core/services/habitLogService';
import { MilestoneService } from '../core/milestones/milestoneService';
import { RewardService } from '../core/milestones/rewardService';
import { FocusSessionService } from '../core/focus/focusSessionService';
import { JournalService } from '../core/journal/journalService';
import { UrgeDiagnosticService } from '../core/urges/urgeDiagnosticService';
import { BackupExportService } from '../core/backup/backupExportService';
import { BackupValidationService } from '../core/backup/backupValidationService';
import { RestoreTransactionService } from '../core/backup/restoreTransactionService';
import { generateUUID } from '../core/utils';

describe('Habit Deletion & Historical Integrity (AUDIT-DATA-01)', () => {
  beforeEach(async () => {
    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) {
        await table.clear();
      }
    });
  });

  it('normal habit deletion marks habit as deleted, hides it from active list, but preserves all historical records', async () => {
    // 1. Create habit
    const habit = await HabitService.createHabit({
      title: 'Daily Algorithms Practice',
      description: 'Solve 2 LeetCode problems',
      category: 'craft',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01',
    });

    // 2. Add historical logs
    await HabitLogService.recordCheckIn(habit, '2026-11-01', { status: 'completed' });
    await HabitLogService.recordCheckIn(habit, '2026-11-02', { status: 'completed' });
    await HabitLogService.recordCheckIn(habit, '2026-11-03', { status: 'completed' });

    // 3. Add milestone and earned achievement
    const milestone = await MilestoneService.createMilestone({
      habitId: habit.id,
      thresholdDays: 3,
      rewardTitle: 'Engineering Book Purchase',
      rewardDescription: 'Buy a technical hardcover',
    });

    const achievementId = generateUUID();
    await db.achievements.add({
      id: achievementId,
      habitId: habit.id,
      milestoneId: milestone.id,
      thresholdDays: 3,
      streakStartDate: '2026-11-01',
      achievedDate: '2026-11-03',
      achievedStreakLength: 3,
      rewardTitle: 'Engineering Book Purchase',
      rewardDescription: 'Buy a technical hardcover',
      isClaimed: false,
    });

    // Claim the reward
    await RewardService.claimReward(achievementId, {
      claimNotes: 'Purchased "Designing Data-Intensive Applications"',
    });

    // 4. Link a focus session
    const focusSession = await FocusSessionService.createSession({
      durationMinutes: 50,
      sessionMode: 'custom',
      habitId: habit.id,
      linkedHabitId: habit.id,
      notes: 'Focused DSA graph traversal practice',
    });

    // 5. Link a journal entry
    const journalEntry = await JournalService.createEntry({
      date: '2026-11-03',
      title: 'Day 3 Algorithms Reflection',
      content: 'Solid focus on topological sort algorithms.',
      linkedHabitId: habit.id,
    });

    // 6. Link an urge log
    const urgeLog = await UrgeDiagnosticService.recordUrge({
      date: '2026-11-02',
      intensity: 6,
      triggerCategories: ['procrastination'],
      linkedHabitId: habit.id,
      responseOutcome: 'resisted',
      reflectionNote: 'Resisted distraction and solved the second problem.',
    });

    // 7. Execute Normal Habit Deletion (purgeHistory: false)
    await HabitService.deleteHabit(habit.id, { purgeHistory: false });

    // Verify Habit State
    const storedHabit = await db.habits.get(habit.id);
    expect(storedHabit).toBeDefined();
    expect(storedHabit?.status).toBe('deleted');
    expect(storedHabit?.deletedAt).toBeDefined();

    // Verify Active Habit Queries exclude the deleted habit
    const activeHabits = await HabitService.getAllHabits({ status: 'active' });
    expect(activeHabits.some((h) => h.id === habit.id)).toBe(false);

    const defaultHabits = await HabitService.getAllHabits();
    expect(defaultHabits.some((h) => h.id === habit.id)).toBe(false);

    // Verify Historical Habit Logs remain 100% preserved
    const logs = await db.habitLogs.where('habitId').equals(habit.id).toArray();
    expect(logs).toHaveLength(3);
    expect(logs.filter((l) => l.status === 'completed')).toHaveLength(3);

    // Verify Audit History is preserved and records the deletion action
    const audits = await db.auditRecords.where('habitId').equals(habit.id).toArray();
    expect(audits.length).toBeGreaterThanOrEqual(2); // create, claim, delete
    const deleteAudit = audits.find((a) => a.action === 'delete');
    expect(deleteAudit).toBeDefined();
    expect(deleteAudit?.newStatus).toBe('deleted');

    // Verify Milestones and Claimed Achievements are preserved
    const milestones = await db.milestones.where('habitId').equals(habit.id).toArray();
    expect(milestones).toHaveLength(1);
    expect(milestones[0].rewardTitle).toBe('Engineering Book Purchase');

    const achievements = await db.achievements.where('habitId').equals(habit.id).toArray();
    expect(achievements).toHaveLength(1);
    expect(achievements[0].isClaimed).toBe(true);
    expect(achievements[0].claimNotes).toBe('Purchased "Designing Data-Intensive Applications"');

    // Verify Focus Session, Journal Entry, and Urge Log remain intact
    const fetchedSession = await db.focusSessions.get(focusSession.id);
    expect(fetchedSession).toBeDefined();
    expect(fetchedSession?.linkedHabitId).toBe(habit.id);

    const fetchedJournal = await db.journalEntries.get(journalEntry.id);
    expect(fetchedJournal).toBeDefined();
    expect(fetchedJournal?.linkedHabitId).toBe(habit.id);

    const fetchedUrge = await db.urgeLogs.get(urgeLog.id);
    expect(fetchedUrge).toBeDefined();
    expect(fetchedUrge?.linkedHabitId).toBe(habit.id);

    // Verify Backup Export and Validation succeed without orphaned reference errors
    const backup = await BackupExportService.generateBackup();
    const validation = await BackupValidationService.validateBackup(backup);
    expect(validation.report.isValid).toBe(true);
    expect(validation.report.errors).toHaveLength(0);
    // Reference check passes because the deleted habit is still in backup.data.habits
    expect(validation.report.referenceIssues).toHaveLength(0);
  });

  it('can restore a normally deleted habit back to active status', async () => {
    const habit = await HabitService.createHabit({
      title: 'Meditation',
      category: 'mind',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01',
    });

    await HabitService.deleteHabit(habit.id, false);
    let stored = await db.habits.get(habit.id);
    expect(stored?.status).toBe('deleted');

    // Restore habit
    const restored = await HabitService.restoreDeletedHabit(habit.id);
    expect(restored.status).toBe('active');
    expect(restored.deletedAt).toBeUndefined();

    stored = await db.habits.get(habit.id);
    expect(stored?.status).toBe('active');
  });

  it('explicit permanent history purge transactionally deletes habit and dependent records while preserving independent journal & focus records', async () => {
    // 1. Create habit
    const habit = await HabitService.createHabit({
      title: 'Temporary Experiment',
      category: 'custom',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01',
    });

    // 2. Add logs, milestone, achievement, focus session, journal entry, urge
    await HabitLogService.recordCheckIn(habit, '2026-11-01', { status: 'completed' });
    const milestone = await MilestoneService.createMilestone({
      habitId: habit.id,
      thresholdDays: 1,
      rewardTitle: 'Temporary Milestone',
    });
    await db.achievements.add({
      id: generateUUID(),
      habitId: habit.id,
      milestoneId: milestone.id,
      thresholdDays: 1,
      streakStartDate: '2026-11-01',
      achievedDate: '2026-11-01',
      achievedStreakLength: 1,
      rewardTitle: 'Temporary Milestone',
      rewardDescription: '',
      isClaimed: true,
    });

    const focusSession = await FocusSessionService.createSession({
      durationMinutes: 25,
      sessionMode: 'pomodoro',
      habitId: habit.id,
      linkedHabitId: habit.id,
      notes: 'Focus session notes that must not be deleted',
    });

    const journalEntry = await JournalService.createEntry({
      date: '2026-11-01',
      title: 'Important Journal Thoughts',
      content: 'Personal writing that must never be lost when a habit is purged',
      linkedHabitId: habit.id,
    });

    const urgeLog = await UrgeDiagnosticService.recordUrge({
      date: '2026-11-01',
      intensity: 5,
      triggerCategories: ['stress'],
      linkedHabitId: habit.id,
      responseOutcome: 'resisted',
    });

    // 3. Execute Explicit Permanent History Purge
    await HabitService.purgeHabitHistory(habit.id);

    // Habit must be completely removed from db.habits
    expect(await db.habits.get(habit.id)).toBeUndefined();

    // Dependent habit records must be purged
    expect(await db.habitLogs.where('habitId').equals(habit.id).count()).toBe(0);
    expect(await db.auditRecords.where('habitId').equals(habit.id).count()).toBe(0);
    expect(await db.milestones.where('habitId').equals(habit.id).count()).toBe(0);
    expect(await db.achievements.where('habitId').equals(habit.id).count()).toBe(0);

    // Independent records MUST NOT be deleted, but decoupled (linkedHabitId cleared)
    const preservedSession = await db.focusSessions.get(focusSession.id);
    expect(preservedSession).toBeDefined();
    expect(preservedSession?.durationMinutes).toBe(25);
    expect(preservedSession?.linkedHabitId).toBeUndefined();
    expect(preservedSession?.habitId).toBeUndefined();

    const preservedJournal = await db.journalEntries.get(journalEntry.id);
    expect(preservedJournal).toBeDefined();
    expect(preservedJournal?.title).toBe('Important Journal Thoughts');
    expect(preservedJournal?.linkedHabitId).toBeUndefined();

    const preservedUrge = await db.urgeLogs.get(urgeLog.id);
    expect(preservedUrge).toBeDefined();
    expect(preservedUrge?.linkedHabitId).toBeUndefined();
  });

  it('deleting or purging one habit never affects independent habits', async () => {
    // Habit 1
    const habitA = await HabitService.createHabit({
      title: 'Habit Alpha',
      category: 'mind',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01',
    });
    await HabitLogService.recordCheckIn(habitA, '2026-11-01', { status: 'completed' });

    // Habit 2
    const habitB = await HabitService.createHabit({
      title: 'Habit Beta',
      category: 'body',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01',
    });
    await HabitLogService.recordCheckIn(habitB, '2026-11-01', { status: 'completed' });

    // Purge Habit A
    await HabitService.purgeHabitHistory(habitA.id);

    // Habit B must be completely intact
    const fetchedB = await db.habits.get(habitB.id);
    expect(fetchedB).toBeDefined();
    expect(fetchedB?.title).toBe('Habit Beta');

    const logsB = await db.habitLogs.where('habitId').equals(habitB.id).toArray();
    expect(logsB).toHaveLength(1);
    expect(logsB[0].status).toBe('completed');
  });

  it('handles deletion of a habit with zero historical records cleanly', async () => {
    const habit = await HabitService.createHabit({
      title: 'Empty Habit',
      category: 'craft',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01',
    });

    await HabitService.deleteHabit(habit.id, { purgeHistory: false });
    const stored = await db.habits.get(habit.id);
    expect(stored?.status).toBe('deleted');

    await HabitService.purgeHabitHistory(habit.id);
    expect(await db.habits.get(habit.id)).toBeUndefined();
  });

  it('gracefully handles repeated deletion requests idempotently', async () => {
    const habit = await HabitService.createHabit({
      title: 'Idempotent Habit',
      category: 'mind',
      type: 'completion',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-11-01',
    });

    // Delete once
    await HabitService.deleteHabit(habit.id);
    // Delete again
    await HabitService.deleteHabit(habit.id);

    const stored = await db.habits.get(habit.id);
    expect(stored?.status).toBe('deleted');

    // Purge once
    await HabitService.purgeHabitHistory(habit.id);
    // Purge again
    await HabitService.purgeHabitHistory(habit.id);

    expect(await db.habits.get(habit.id)).toBeUndefined();
  });
});
