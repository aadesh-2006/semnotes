import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../storage/db';
import { MilestoneService } from './milestoneService';
import { AchievementEngine, detectAchievementsForHabit, extractStreakSegments } from './achievementEngine';
import { RewardService } from './rewardService';
import { StreakCalculator } from '../streak/streakCalculator';
import type { Habit, HabitLog, Milestone, Achievement } from '../domain/types';

describe('Milestone 4: Custom Milestone & Reward Engine Test Suite', () => {
  const HABIT_ID_1 = '11111111-1111-4111-a111-111111111111';
  const HABIT_ID_2 = '22222222-2222-4222-a222-222222222222';
  const NONEXISTENT_UUID = '99999999-9999-4999-a999-999999999999';

  beforeEach(async () => {
    await db.habits.clear();
    await db.habitLogs.clear();
    await db.auditRecords.clear();
    await db.milestones.clear();
    await db.achievements.clear();
  });

  const createDummyHabit = (overrides?: Partial<Habit>): Habit => ({
    id: HABIT_ID_1,
    title: 'Digital Purity',
    description: 'Sovereign discipline',
    category: 'abstinence',
    type: 'abstinence',
    schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
    startDate: '2026-11-01',
    status: 'active',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    sortOrder: 0,
    ...overrides
  });

  const createDummyLog = (date: string, status: 'completed' | 'failed', habitId = HABIT_ID_1): HabitLog => ({
    id: `log-${date}-${habitId}`,
    habitId,
    date,
    status,
    createdAt: `${date}T10:00:00.000Z`,
    updatedAt: `${date}T10:00:00.000Z`
  });

  // =========================================================================
  // 1. Milestone Configuration & Validation
  // =========================================================================
  describe('Milestone Configuration & Validation', () => {
    it('1. creates a milestone with valid positive integer threshold', async () => {
      const milestone = await MilestoneService.createMilestone({
        habitId: HABIT_ID_1,
        thresholdDays: 7,
        rewardTitle: 'Espresso Tasting',
        rewardDescription: 'Artisan single-origin coffee celebration',
        rewardCategory: 'treat',
        personalNote: 'Discipline tastes sweet'
      });

      expect(milestone.id).toBeDefined();
      expect(milestone.thresholdDays).toBe(7);
      expect(milestone.rewardTitle).toBe('Espresso Tasting');
      expect(milestone.isEnabled).toBe(true);

      const inDb = await db.milestones.get(milestone.id);
      expect(inDb).toBeDefined();
      expect(inDb?.thresholdDays).toBe(7);
    });

    it('2. rejects milestone with zero or negative threshold', async () => {
      await expect(
        MilestoneService.createMilestone({
          habitId: HABIT_ID_1,
          thresholdDays: 0,
          rewardTitle: 'Invalid Zero'
        })
      ).rejects.toThrow();

      await expect(
        MilestoneService.createMilestone({
          habitId: HABIT_ID_1,
          thresholdDays: -5,
          rewardTitle: 'Invalid Negative'
        })
      ).rejects.toThrow();
    });

    it('3. rejects non-integer threshold', async () => {
      await expect(
        MilestoneService.createMilestone({
          habitId: HABIT_ID_1,
          thresholdDays: 7.5,
          rewardTitle: 'Invalid Decimal'
        })
      ).rejects.toThrow();
    });

    it('4. rejects duplicate threshold within the same habit', async () => {
      await MilestoneService.createMilestone({
        habitId: HABIT_ID_1,
        thresholdDays: 7,
        rewardTitle: 'Reward 1'
      });

      await expect(
        MilestoneService.createMilestone({
          habitId: HABIT_ID_1,
          thresholdDays: 7,
          rewardTitle: 'Reward 2 with Duplicate Threshold'
        })
      ).rejects.toThrow(/already exists/i);
    });

    it('5. allows identical thresholds across different independent habits', async () => {
      const m1 = await MilestoneService.createMilestone({
        habitId: HABIT_ID_1,
        thresholdDays: 7,
        rewardTitle: 'Purity 7d Treat'
      });

      const m2 = await MilestoneService.createMilestone({
        habitId: HABIT_ID_2,
        thresholdDays: 7,
        rewardTitle: 'DSA 7d Treat'
      });

      expect(m1.thresholdDays).toBe(7);
      expect(m2.thresholdDays).toBe(7);
      expect(m1.habitId).toBe(HABIT_ID_1);
      expect(m2.habitId).toBe(HABIT_ID_2);
    });

    it('6. updates milestone threshold successfully', async () => {
      const created = await MilestoneService.createMilestone({
        habitId: HABIT_ID_1,
        thresholdDays: 7,
        rewardTitle: 'Initial Reward'
      });

      const updated = await MilestoneService.updateMilestone(created.id, {
        thresholdDays: 10,
        rewardTitle: 'Updated Reward'
      });

      expect(updated.thresholdDays).toBe(10);
      expect(updated.rewardTitle).toBe('Updated Reward');
    });

    it('7. rejects updating milestone threshold to an existing threshold in same habit', async () => {
      await MilestoneService.createMilestone({
        habitId: HABIT_ID_1,
        thresholdDays: 7,
        rewardTitle: 'Reward 7'
      });

      const second = await MilestoneService.createMilestone({
        habitId: HABIT_ID_1,
        thresholdDays: 14,
        rewardTitle: 'Reward 14'
      });

      await expect(
        MilestoneService.updateMilestone(second.id, {
          thresholdDays: 7
        })
      ).rejects.toThrow(/already exists/i);
    });

    it('8. allows updating non-threshold details cleanly', async () => {
      const created = await MilestoneService.createMilestone({
        habitId: HABIT_ID_1,
        thresholdDays: 30,
        rewardTitle: 'Old Title',
        rewardDescription: 'Old Desc'
      });

      const updated = await MilestoneService.updateMilestone(created.id, {
        rewardTitle: 'New Title',
        rewardDescription: 'New Desc',
        personalNote: 'Self-respect reinforced'
      });

      expect(updated.thresholdDays).toBe(30);
      expect(updated.rewardTitle).toBe('New Title');
      expect(updated.personalNote).toBe('Self-respect reinforced');
    });

    it('9. toggles enabled/disabled state correctly', async () => {
      const created = await MilestoneService.createMilestone({
        habitId: HABIT_ID_1,
        thresholdDays: 21,
        rewardTitle: 'Habit Formation'
      });
      expect(created.isEnabled).toBe(true);

      const toggledOff = await MilestoneService.toggleMilestone(created.id);
      expect(toggledOff.isEnabled).toBe(false);

      const toggledOn = await MilestoneService.toggleMilestone(created.id, true);
      expect(toggledOn.isEnabled).toBe(true);
    });

    it('10. deletes milestone definition from database', async () => {
      const created = await MilestoneService.createMilestone({
        habitId: HABIT_ID_1,
        thresholdDays: 45,
        rewardTitle: 'Conqueror Reward'
      });

      await MilestoneService.deleteMilestone(created.id);
      const fetched = await db.milestones.get(created.id);
      expect(fetched).toBeUndefined();
    });
  });

  // =========================================================================
  // 2. Pure Achievement Detection & Streak Invariants
  // =========================================================================
  describe('Achievement Detection & Idempotency', () => {
    it('11. extracts contiguous streak segments correctly', () => {
      const habit = createDummyHabit({ startDate: '2026-11-01' });
      const logs = [
        createDummyLog('2026-11-01', 'completed'),
        createDummyLog('2026-11-02', 'completed'),
        createDummyLog('2026-11-03', 'completed'),
        createDummyLog('2026-11-04', 'failed'), // break
        createDummyLog('2026-11-05', 'completed'),
        createDummyLog('2026-11-06', 'completed')
      ];

      const streakResult = StreakCalculator.calculateStreak(habit, logs, {
        evaluationDate: '2026-11-06'
      });

      const segments = extractStreakSegments(streakResult.timeline);
      expect(segments).toHaveLength(2);
      expect(segments[0].startDate).toBe('2026-11-01');
      expect(segments[0].length).toBe(3);
      expect(segments[1].startDate).toBe('2026-11-05');
      expect(segments[1].length).toBe(2);
    });

    it('12. detects milestone achievement when streak reaches threshold', () => {
      const habit = createDummyHabit({ startDate: '2026-11-01' });
      const logs = [
        createDummyLog('2026-11-01', 'completed'),
        createDummyLog('2026-11-02', 'completed'),
        createDummyLog('2026-11-03', 'completed')
      ];

      const streakResult = StreakCalculator.calculateStreak(habit, logs, {
        evaluationDate: '2026-11-03'
      });

      const milestone: Milestone = {
        id: '33333333-3333-4333-a333-333333333333',
        habitId: habit.id,
        thresholdDays: 3,
        rewardTitle: '3-Day Victory',
        rewardDescription: 'Initial momentum reward',
        isEnabled: true,
        sortOrder: 3,
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z'
      };

      const detected = detectAchievementsForHabit(habit, [milestone], streakResult, []);
      expect(detected).toHaveLength(1);
      expect(detected[0].thresholdDays).toBe(3);
      expect(detected[0].achievedDate).toBe('2026-11-03');
      expect(detected[0].streakStartDate).toBe('2026-11-01');
      expect(detected[0].rewardTitle).toBe('3-Day Victory');
      expect(detected[0].isClaimed).toBe(false);
    });

    it('13. does NOT detect achievement if streak is below threshold', () => {
      const habit = createDummyHabit({ startDate: '2026-11-01' });
      const logs = [
        createDummyLog('2026-11-01', 'completed'),
        createDummyLog('2026-11-02', 'completed')
      ];

      const streakResult = StreakCalculator.calculateStreak(habit, logs, {
        evaluationDate: '2026-11-02'
      });

      const milestone: Milestone = {
        id: '33333333-3333-4333-a333-333333333333',
        habitId: habit.id,
        thresholdDays: 3,
        rewardTitle: '3-Day Victory',
        isEnabled: true,
        sortOrder: 3,
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z'
      };

      const detected = detectAchievementsForHabit(habit, [milestone], streakResult, []);
      expect(detected).toHaveLength(0);
    });

    it('14. is completely idempotent when evaluated multiple times', () => {
      const habit = createDummyHabit({ startDate: '2026-11-01' });
      const logs = [
        createDummyLog('2026-11-01', 'completed'),
        createDummyLog('2026-11-02', 'completed'),
        createDummyLog('2026-11-03', 'completed')
      ];

      const streakResult = StreakCalculator.calculateStreak(habit, logs, {
        evaluationDate: '2026-11-03'
      });

      const milestone: Milestone = {
        id: '33333333-3333-4333-a333-333333333333',
        habitId: habit.id,
        thresholdDays: 3,
        rewardTitle: '3-Day Victory',
        isEnabled: true,
        sortOrder: 3,
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z'
      };

      // First run: detects 1 achievement
      const firstRun = detectAchievementsForHabit(habit, [milestone], streakResult, []);
      expect(firstRun).toHaveLength(1);

      // Second run passing the previously detected achievements: detects 0 new items
      const secondRun = detectAchievementsForHabit(habit, [milestone], streakResult, firstRun);
      expect(secondRun).toHaveLength(0);
    });

    it('15. unlocks multiple milestones (3d and 7d) on the same streak run without duplicates', () => {
      const habit = createDummyHabit({ startDate: '2026-11-01' });
      const logs: HabitLog[] = [];
      for (let i = 1; i <= 7; i++) {
        logs.push(createDummyLog(`2026-11-0${i}`, 'completed'));
      }

      const streakResult = StreakCalculator.calculateStreak(habit, logs, {
        evaluationDate: '2026-11-07'
      });

      const milestones: Milestone[] = [
        {
          id: '44444444-4444-4444-a444-444444444444',
          habitId: habit.id,
          thresholdDays: 3,
          rewardTitle: '3-Day Mark',
          isEnabled: true,
          sortOrder: 3,
          createdAt: '2026-11-01T00:00:00.000Z',
          updatedAt: '2026-11-01T00:00:00.000Z'
        },
        {
          id: '55555555-5555-4555-a555-555555555555',
          habitId: habit.id,
          thresholdDays: 7,
          rewardTitle: '7-Day Milestone',
          isEnabled: true,
          sortOrder: 7,
          createdAt: '2026-11-01T00:00:00.000Z',
          updatedAt: '2026-11-01T00:00:00.000Z'
        },
        {
          id: '66666666-6666-4666-a666-666666666666',
          habitId: habit.id,
          thresholdDays: 14,
          rewardTitle: '14-Day Milestone',
          isEnabled: true,
          sortOrder: 14,
          createdAt: '2026-11-01T00:00:00.000Z',
          updatedAt: '2026-11-01T00:00:00.000Z'
        }
      ];

      const detected = detectAchievementsForHabit(habit, milestones, streakResult, []);
      expect(detected).toHaveLength(2); // 3d and 7d unlocked, 14d locked
      expect(detected.map((d) => d.thresholdDays)).toEqual([3, 7]);
      expect(detected.find((d) => d.thresholdDays === 3)?.achievedDate).toBe('2026-11-03');
      expect(detected.find((d) => d.thresholdDays === 7)?.achievedDate).toBe('2026-11-07');
    });

    it('16. skips unscheduled days properly when calculating milestone achievement dates', () => {
      // Habit scheduled Monday (1), Wednesday (3), Friday (5)
      // November 2026: Nov 2 is Mon, Nov 4 is Wed, Nov 6 is Fri
      const habit = createDummyHabit({
        startDate: '2026-11-02',
        schedule: { frequency: 'selected_days', selectedDays: [1, 3, 5] }
      });

      const logs = [
        createDummyLog('2026-11-02', 'completed'), // Day 1
        createDummyLog('2026-11-04', 'completed'), // Day 2
        createDummyLog('2026-11-06', 'completed')  // Day 3
      ];

      const streakResult = StreakCalculator.calculateStreak(habit, logs, {
        evaluationDate: '2026-11-06'
      });

      const milestone: Milestone = {
        id: '77777777-7777-4777-a777-777777777777',
        habitId: habit.id,
        thresholdDays: 3,
        rewardTitle: '3 Scheduled Sessions',
        isEnabled: true,
        sortOrder: 3,
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z'
      };

      const detected = detectAchievementsForHabit(habit, [milestone], streakResult, []);
      expect(detected).toHaveLength(1);
      expect(detected[0].achievedDate).toBe('2026-11-06');
      expect(detected[0].streakStartDate).toBe('2026-11-02');
    });

    it('17. ignores disabled milestones during achievement detection', () => {
      const habit = createDummyHabit({ startDate: '2026-11-01' });
      const logs = [
        createDummyLog('2026-11-01', 'completed'),
        createDummyLog('2026-11-02', 'completed'),
        createDummyLog('2026-11-03', 'completed')
      ];

      const streakResult = StreakCalculator.calculateStreak(habit, logs, {
        evaluationDate: '2026-11-03'
      });

      const milestone: Milestone = {
        id: '88888888-8888-4888-a888-888888888888',
        habitId: habit.id,
        thresholdDays: 3,
        rewardTitle: 'Disabled 3d',
        isEnabled: false, // Disabled
        sortOrder: 3,
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z'
      };

      const detected = detectAchievementsForHabit(habit, [milestone], streakResult, []);
      expect(detected).toHaveLength(0);
    });
  });

  // =========================================================================
  // 3. Strict Resets and Repeat Achievements
  // =========================================================================
  describe('Strict Resets & Repeat Achievements', () => {
    it('18. preserves historical achievement when a streak later resets to 0', async () => {
      const habit = createDummyHabit({ id: HABIT_ID_1, startDate: '2026-11-01' });
      await db.habits.add(habit);

      const milestone = await MilestoneService.createMilestone({
        habitId: habit.id,
        thresholdDays: 3,
        rewardTitle: '3-Day Discipline'
      });

      // Day 1, 2, 3 completed
      await db.habitLogs.bulkAdd([
        createDummyLog('2026-11-01', 'completed', habit.id),
        createDummyLog('2026-11-02', 'completed', habit.id),
        createDummyLog('2026-11-03', 'completed', habit.id)
      ]);

      const earnedFirst = await AchievementEngine.evaluateAndRecordAchievements(habit.id, {
        evaluationDate: '2026-11-03'
      });
      expect(earnedFirst).toHaveLength(1);

      // Day 4: Setback! Strict streak resets to 0!
      await db.habitLogs.add(createDummyLog('2026-11-04', 'failed', habit.id));

      const streakAfterFail = await StreakCalculator.calculateStreak(
        habit,
        await db.habitLogs.where('habitId').equals(habit.id).toArray(),
        { evaluationDate: '2026-11-04' }
      );
      expect(streakAfterFail.currentStreak).toBe(0);

      // Re-evaluate: Historical achievement is preserved permanently in Dexie
      const achievementsInDb = await db.achievements.where('habitId').equals(habit.id).toArray();
      expect(achievementsInDb).toHaveLength(1);
      expect(achievementsInDb[0].milestoneId).toBe(milestone.id);
      expect(achievementsInDb[0].streakStartDate).toBe('2026-11-01');
    });

    it('19. earns a second legitimate achievement when a new streak reaches threshold again', async () => {
      const habit = createDummyHabit({ id: HABIT_ID_1, startDate: '2026-11-01' });
      await db.habits.add(habit);

      await MilestoneService.createMilestone({
        habitId: habit.id,
        thresholdDays: 3,
        rewardTitle: '3-Day Rebirth'
      });

      // Streak 1: Nov 1, 2, 3
      await db.habitLogs.bulkAdd([
        createDummyLog('2026-11-01', 'completed', habit.id),
        createDummyLog('2026-11-02', 'completed', habit.id),
        createDummyLog('2026-11-03', 'completed', habit.id)
      ]);
      await AchievementEngine.evaluateAndRecordAchievements(habit.id, { evaluationDate: '2026-11-03' });

      // Streak 1 breaks on Nov 4
      await db.habitLogs.add(createDummyLog('2026-11-04', 'failed', habit.id));

      // Streak 2: Nov 5, 6, 7
      await db.habitLogs.bulkAdd([
        createDummyLog('2026-11-05', 'completed', habit.id),
        createDummyLog('2026-11-06', 'completed', habit.id),
        createDummyLog('2026-11-07', 'completed', habit.id)
      ]);

      const earnedSecond = await AchievementEngine.evaluateAndRecordAchievements(habit.id, {
        evaluationDate: '2026-11-07'
      });

      expect(earnedSecond).toHaveLength(1);
      expect(earnedSecond[0].streakStartDate).toBe('2026-11-05'); // Brand new streak instance!
      expect(earnedSecond[0].achievedDate).toBe('2026-11-07');

      // Check all achievements for habit: exactly 2 distinct historical achievements
      const allAchievements = await db.achievements.where('habitId').equals(habit.id).toArray();
      allAchievements.sort((a, b) => a.streakStartDate.localeCompare(b.streakStartDate));
      expect(allAchievements).toHaveLength(2);
      expect(allAchievements[0].streakStartDate).toBe('2026-11-01');
      expect(allAchievements[1].streakStartDate).toBe('2026-11-05');

      // Idempotency: re-evaluating returns 0 new achievements
      const recheck = await AchievementEngine.evaluateAndRecordAchievements(habit.id, {
        evaluationDate: '2026-11-07'
      });
      expect(recheck).toHaveLength(0);
    });
  });

  // =========================================================================
  // 4. Historical Immutability (Snapshot Protection)
  // =========================================================================
  describe('Historical Immutability & Snapshot Protection', () => {
    it('20. preserves snapshot fields when milestone is updated in the future', async () => {
      const habit = createDummyHabit({ id: HABIT_ID_1, startDate: '2026-11-01' });
      await db.habits.add(habit);

      const milestone = await MilestoneService.createMilestone({
        habitId: habit.id,
        thresholdDays: 3,
        rewardTitle: 'Original Reward Title',
        rewardDescription: 'Original description'
      });

      await db.habitLogs.bulkAdd([
        createDummyLog('2026-11-01', 'completed', habit.id),
        createDummyLog('2026-11-02', 'completed', habit.id),
        createDummyLog('2026-11-03', 'completed', habit.id)
      ]);
      await AchievementEngine.evaluateAndRecordAchievements(habit.id, { evaluationDate: '2026-11-03' });

      // Later, user changes the milestone definition
      await MilestoneService.updateMilestone(milestone.id, {
        thresholdDays: 5,
        rewardTitle: 'Changed Title',
        rewardDescription: 'Changed description'
      });

      // Historical achievement snapshot MUST NOT be mutated!
      const achievement = (await db.achievements.where('habitId').equals(habit.id).toArray())[0];
      expect(achievement.thresholdDays).toBe(3);
      expect(achievement.rewardTitle).toBe('Original Reward Title');
      expect(achievement.rewardDescription).toBe('Original description');
    });

    it('21. preserves earned achievement in database when milestone is deleted', async () => {
      const habit = createDummyHabit({ id: HABIT_ID_1, startDate: '2026-11-01' });
      await db.habits.add(habit);

      const milestone = await MilestoneService.createMilestone({
        habitId: habit.id,
        thresholdDays: 3,
        rewardTitle: 'To-Be-Deleted Milestone'
      });

      await db.habitLogs.bulkAdd([
        createDummyLog('2026-11-01', 'completed', habit.id),
        createDummyLog('2026-11-02', 'completed', habit.id),
        createDummyLog('2026-11-03', 'completed', habit.id)
      ]);
      await AchievementEngine.evaluateAndRecordAchievements(habit.id, { evaluationDate: '2026-11-03' });

      // Delete milestone
      await MilestoneService.deleteMilestone(milestone.id);
      const milestoneInDb = await db.milestones.get(milestone.id);
      expect(milestoneInDb).toBeUndefined();

      // Achievement record remains permanently in database
      const achievements = await db.achievements.where('habitId').equals(habit.id).toArray();
      expect(achievements).toHaveLength(1);
      expect(achievements[0].rewardTitle).toBe('To-Be-Deleted Milestone');
    });
  });

  // =========================================================================
  // 5. Reward Claim Workflow
  // =========================================================================
  describe('Reward Claim Workflow', () => {
    it('22. successfully claims an earned reward with date and reflection notes', async () => {
      const achievement: Achievement = {
        id: '12121212-1212-4212-a212-121212121212',
        habitId: HABIT_ID_1,
        milestoneId: '34343434-3434-4434-a434-343434343434',
        thresholdDays: 7,
        streakStartDate: '2026-11-01',
        achievedDate: '2026-11-07',
        achievedStreakLength: 7,
        rewardTitle: 'Hardcover Book',
        rewardDescription: 'Meditations by Marcus Aurelius',
        isClaimed: false,
        createdAt: '2026-11-07T10:00:00.000Z',
        updatedAt: '2026-11-07T10:00:00.000Z'
      };
      await db.achievements.add(achievement);

      const claimed = await RewardService.claimReward(achievement.id, {
        claimNotes: 'Ordered book online. Felt a deep sense of dignity.',
        claimedAt: '2026-11-08T15:00:00.000Z'
      });

      expect(claimed.isClaimed).toBe(true);
      expect(claimed.claimNotes).toBe('Ordered book online. Felt a deep sense of dignity.');
      expect(claimed.claimedAt).toBe('2026-11-08T15:00:00.000Z');

      const inDb = await db.achievements.get(achievement.id);
      expect(inDb?.isClaimed).toBe(true);
    });

    it('23. rejects claiming an already claimed reward', async () => {
      const achievement: Achievement = {
        id: '56565656-5656-4656-a656-565656565656',
        habitId: HABIT_ID_1,
        milestoneId: '78787878-7878-4878-a878-787878787878',
        thresholdDays: 7,
        streakStartDate: '2026-11-01',
        achievedDate: '2026-11-07',
        achievedStreakLength: 7,
        rewardTitle: 'Hardcover Book',
        rewardDescription: 'Book',
        isClaimed: true,
        claimedAt: '2026-11-08T15:00:00.000Z',
        createdAt: '2026-11-07T10:00:00.000Z',
        updatedAt: '2026-11-08T15:00:00.000Z'
      };
      await db.achievements.add(achievement);

      await expect(RewardService.claimReward(achievement.id)).rejects.toThrow(
        /already been claimed/i
      );
    });

    it('24. rejects claiming a nonexistent achievement ID', async () => {
      await expect(RewardService.claimReward(NONEXISTENT_UUID)).rejects.toThrow(
        /not found/i
      );
    });

    it('25. claiming a reward NEVER alters habit streaks, logs, or schedules', async () => {
      const habit = createDummyHabit({ id: HABIT_ID_1, startDate: '2026-11-01' });
      await db.habits.add(habit);

      await db.habitLogs.bulkAdd([
        createDummyLog('2026-11-01', 'completed', habit.id),
        createDummyLog('2026-11-02', 'completed', habit.id),
        createDummyLog('2026-11-03', 'completed', habit.id)
      ]);

      await MilestoneService.createMilestone({
        habitId: habit.id,
        thresholdDays: 3,
        rewardTitle: 'Strict Separation Reward'
      });

      const [earned] = await AchievementEngine.evaluateAndRecordAchievements(habit.id, {
        evaluationDate: '2026-11-03'
      });

      const streakBefore = await StreakCalculator.calculateStreak(
        habit,
        await db.habitLogs.where('habitId').equals(habit.id).toArray(),
        { evaluationDate: '2026-11-03' }
      );

      // Claim reward
      await RewardService.claimReward(earned.id, { claimNotes: 'Celebrated' });

      const streakAfter = await StreakCalculator.calculateStreak(
        habit,
        await db.habitLogs.where('habitId').equals(habit.id).toArray(),
        { evaluationDate: '2026-11-03' }
      );

      // Streak values are 100% identical
      expect(streakAfter.currentStreak).toBe(streakBefore.currentStreak);
      expect(streakAfter.longestStreak).toBe(streakBefore.longestStreak);
      expect(streakAfter.totalSuccessfulDays).toBe(streakBefore.totalSuccessfulDays);
      expect(streakAfter.timeline).toHaveLength(streakBefore.timeline.length);
    });

    it('26. returns correct partitions for unclaimed and claimed achievements', async () => {
      await db.achievements.bulkAdd([
        {
          id: '13131313-1313-4313-a313-131313131313',
          habitId: HABIT_ID_1,
          milestoneId: '23232323-2323-4323-a323-232323232323',
          thresholdDays: 7,
          streakStartDate: '2026-11-01',
          achievedDate: '2026-11-07',
          achievedStreakLength: 7,
          rewardTitle: 'Reward 1',
          rewardDescription: '',
          isClaimed: false,
          createdAt: '2026-11-07T00:00:00.000Z',
          updatedAt: '2026-11-07T00:00:00.000Z'
        },
        {
          id: '24242424-2424-4424-a424-242424242424',
          habitId: HABIT_ID_1,
          milestoneId: '35353535-3535-4535-a535-353535353535',
          thresholdDays: 14,
          streakStartDate: '2026-11-01',
          achievedDate: '2026-11-14',
          achievedStreakLength: 14,
          rewardTitle: 'Reward 2',
          rewardDescription: '',
          isClaimed: true,
          claimedAt: '2026-11-15T00:00:00.000Z',
          createdAt: '2026-11-14T00:00:00.000Z',
          updatedAt: '2026-11-15T00:00:00.000Z'
        }
      ]);

      const unclaimed = await RewardService.getUnclaimedAchievements();
      const claimed = await RewardService.getClaimedAchievements();

      expect(unclaimed).toHaveLength(1);
      expect(unclaimed[0].id).toBe('13131313-1313-4313-a313-131313131313');

      expect(claimed).toHaveLength(1);
      expect(claimed[0].id).toBe('24242424-2424-4424-a424-242424242424');
    });
  });

  // =========================================================================
  // 6. Audit Trail Compliance
  // =========================================================================
  describe('Audit Trail Compliance', () => {
    it('27. records audit records for milestone creation, updates, unlocks, and claims', async () => {
      const habit = createDummyHabit({ id: HABIT_ID_1, startDate: '2026-11-01' });
      await db.habits.add(habit);

      // Create milestone -> audit record
      const milestone = await MilestoneService.createMilestone({
        habitId: habit.id,
        thresholdDays: 3,
        rewardTitle: 'Audit Test'
      });

      // Update milestone -> audit record
      await MilestoneService.updateMilestone(milestone.id, {
        rewardTitle: 'Audit Test Renamed'
      });

      // Unlock milestone -> audit record
      await db.habitLogs.bulkAdd([
        createDummyLog('2026-11-01', 'completed', habit.id),
        createDummyLog('2026-11-02', 'completed', habit.id),
        createDummyLog('2026-11-03', 'completed', habit.id)
      ]);

      const [earned] = await AchievementEngine.evaluateAndRecordAchievements(habit.id, {
        evaluationDate: '2026-11-03'
      });

      // Claim reward -> audit record
      await RewardService.claimReward(earned.id);

      const audits = await db.auditRecords.where('habitId').equals(habit.id).toArray();
      expect(audits.length).toBeGreaterThanOrEqual(4);

      const reasons = audits.map((a) => a.reason || '');
      expect(reasons.some((r) => r.includes('Created milestone'))).toBe(true);
      expect(reasons.some((r) => r.includes('Updated milestone'))).toBe(true);
      expect(reasons.some((r) => r.includes('Unlocked milestone reward'))).toBe(true);
      expect(reasons.some((r) => r.includes('Claimed reward'))).toBe(true);
    });

    it('28. calculates milestone progress items accurately', async () => {
      const habit = createDummyHabit({ id: HABIT_ID_1, startDate: '2026-11-01' });
      await db.habits.add(habit);

      await MilestoneService.createMilestone({
        habitId: habit.id,
        thresholdDays: 5,
        rewardTitle: '5-Day Milestone'
      });

      await MilestoneService.createMilestone({
        habitId: habit.id,
        thresholdDays: 10,
        rewardTitle: '10-Day Milestone'
      });

      // 3 days completed
      await db.habitLogs.bulkAdd([
        createDummyLog('2026-11-01', 'completed', habit.id),
        createDummyLog('2026-11-02', 'completed', habit.id),
        createDummyLog('2026-11-03', 'completed', habit.id)
      ]);

      const progressItems = await AchievementEngine.getMilestoneProgressForHabit(habit.id, {
        evaluationDate: '2026-11-03'
      });

      expect(progressItems).toHaveLength(2);
      expect(progressItems[0].milestone.thresholdDays).toBe(5);
      expect(progressItems[0].currentStreakDays).toBe(3);
      expect(progressItems[0].daysRemaining).toBe(2);
      expect(progressItems[0].percentage).toBe(60);
      expect(progressItems[0].isUnlocked).toBe(false);

      expect(progressItems[1].milestone.thresholdDays).toBe(10);
      expect(progressItems[1].daysRemaining).toBe(7);
      expect(progressItems[1].percentage).toBe(30);
    });

    it('29. evaluates all active habits in a single batch pass', async () => {
      const habit1 = createDummyHabit({ id: HABIT_ID_1, title: 'Habit 1', startDate: '2026-11-01' });
      const habit2 = createDummyHabit({ id: HABIT_ID_2, title: 'Habit 2', startDate: '2026-11-01' });
      await db.habits.bulkAdd([habit1, habit2]);

      await MilestoneService.createMilestone({ habitId: habit1.id, thresholdDays: 2, rewardTitle: 'H1 2d' });
      await MilestoneService.createMilestone({ habitId: habit2.id, thresholdDays: 2, rewardTitle: 'H2 2d' });

      await db.habitLogs.bulkAdd([
        createDummyLog('2026-11-01', 'completed', habit1.id),
        createDummyLog('2026-11-02', 'completed', habit1.id),
        createDummyLog('2026-11-01', 'completed', habit2.id),
        createDummyLog('2026-11-02', 'completed', habit2.id)
      ]);

      const newlyEarned = await AchievementEngine.evaluateAllActiveHabits({ evaluationDate: '2026-11-02' });
      expect(newlyEarned).toHaveLength(2);
      expect(newlyEarned.some((a) => a.habitId === habit1.id)).toBe(true);
      expect(newlyEarned.some((a) => a.habitId === habit2.id)).toBe(true);
    });

    it('30. works seamlessly with quantitative habit target fulfillment', async () => {
      const quantHabit = createDummyHabit({
        id: HABIT_ID_1,
        title: 'Daily Coding Steps',
        type: 'quantitative',
        targetValue: 5000,
        targetConstraint: 'at_least',
        startDate: '2026-11-01'
      });
      await db.habits.add(quantHabit);

      await MilestoneService.createMilestone({
        habitId: quantHabit.id,
        thresholdDays: 2,
        rewardTitle: '2 Days of 5k Steps'
      });

      // 2 days with fulfilled quantitative values
      await db.habitLogs.bulkAdd([
        { ...createDummyLog('2026-11-01', 'completed', quantHabit.id), numericValue: 6000 },
        { ...createDummyLog('2026-11-02', 'completed', quantHabit.id), numericValue: 5200 }
      ]);

      const earned = await AchievementEngine.evaluateAndRecordAchievements(quantHabit.id, {
        evaluationDate: '2026-11-02'
      });

      expect(earned).toHaveLength(1);
      expect(earned[0].thresholdDays).toBe(2);
      expect(earned[0].rewardTitle).toBe('2 Days of 5k Steps');
    });

    it('31. getAchievementById returns the correct achievement or undefined', async () => {
      const ach: Achievement = {
        id: '98989898-9898-4898-a898-989898989898',
        habitId: HABIT_ID_1,
        milestoneId: '47474747-4747-4747-a747-474747474747',
        thresholdDays: 3,
        streakStartDate: '2026-11-01',
        achievedDate: '2026-11-03',
        achievedStreakLength: 3,
        rewardTitle: 'Single Lookup Test',
        rewardDescription: '',
        isClaimed: false,
        createdAt: '2026-11-03T00:00:00.000Z',
        updatedAt: '2026-11-03T00:00:00.000Z'
      };
      await db.achievements.add(ach);

      const found = await RewardService.getAchievementById(ach.id);
      expect(found).toBeDefined();
      expect(found?.rewardTitle).toBe('Single Lookup Test');

      const notFound = await RewardService.getAchievementById(NONEXISTENT_UUID);
      expect(notFound).toBeUndefined();
    });

    it('32. getMilestonesByHabit returns milestones sorted by thresholdDays ascending', async () => {
      await MilestoneService.createMilestone({ habitId: HABIT_ID_1, thresholdDays: 30, rewardTitle: '30d' });
      await MilestoneService.createMilestone({ habitId: HABIT_ID_1, thresholdDays: 7, rewardTitle: '7d' });
      await MilestoneService.createMilestone({ habitId: HABIT_ID_1, thresholdDays: 14, rewardTitle: '14d' });

      const sorted = await MilestoneService.getMilestonesByHabit(HABIT_ID_1);
      expect(sorted.map((m) => m.thresholdDays)).toEqual([7, 14, 30]);
    });
  });
});
