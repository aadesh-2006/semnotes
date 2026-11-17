import { db } from '../../storage/db';
import type { Habit, Milestone, Achievement } from '../domain/types';
import type { HabitStreakResult, DayStreakRecord } from '../streak/streakTypes';
import { StreakEngine } from '../streak/streakEngine';
import { generateUUID } from '../utils';
import type { MilestoneProgressItem } from './milestoneTypes';

export interface StreakSegment {
  startDate: string;       // Date of first completed day in segment
  endDate: string;         // Date of latest completed day in segment
  completedDays: string[]; // Chronological list of completed calendar dates
  length: number;          // Number of completed scheduled days
}

/**
 * Extracts contiguous completed streak segments from a habit timeline.
 * Skips unscheduled days and paused periods without breaking the segment.
 * Breaks on failed or missed scheduled days.
 */
export function extractStreakSegments(timeline: DayStreakRecord[]): StreakSegment[] {
  const segments: StreakSegment[] = [];
  let currentSegment: string[] = [];
  let currentStartDate: string | null = null;

  for (const day of timeline) {
    if (day.status === 'completed') {
      if (currentSegment.length === 0) {
        currentStartDate = day.date;
      }
      currentSegment.push(day.date);
    } else if (day.breaksStreak) {
      if (currentSegment.length > 0 && currentStartDate) {
        segments.push({
          startDate: currentStartDate,
          endDate: currentSegment[currentSegment.length - 1],
          completedDays: [...currentSegment],
          length: currentSegment.length
        });
        currentSegment = [];
        currentStartDate = null;
      }
    }
    // Skipped days (unscheduled/paused) or pending today keep the segment open
  }

  // Final open segment (including current active streak)
  if (currentSegment.length > 0 && currentStartDate) {
    segments.push({
      startDate: currentStartDate,
      endDate: currentSegment[currentSegment.length - 1],
      completedDays: [...currentSegment],
      length: currentSegment.length
    });
  }

  return segments;
}

/**
 * Pure function: Detects newly earned achievements for a habit.
 * Completely deterministic, zero database calls.
 * Idempotent: checks against existing achievements by [habitId, milestoneId, streakStartDate].
 */
export function detectAchievementsForHabit(
  habit: Habit,
  milestones: Milestone[],
  streakResult: HabitStreakResult,
  existingAchievements: Achievement[]
): Achievement[] {
  const segments = extractStreakSegments(streakResult.timeline);
  const now = new Date().toISOString();

  // Create fast lookup set for existing achievements: `${habitId}:${milestoneId}:${streakStartDate}`
  const existingSet = new Set(
    existingAchievements.map((a) => `${a.habitId}:${a.milestoneId}:${a.streakStartDate}`)
  );

  const newAchievements: Achievement[] = [];

  // Filter to active milestones only for new detections
  const activeMilestones = milestones.filter((m) => m.habitId === habit.id && m.isEnabled);

  for (const milestone of activeMilestones) {
    for (const segment of segments) {
      if (segment.length >= milestone.thresholdDays) {
        const key = `${habit.id}:${milestone.id}:${segment.startDate}`;
        if (!existingSet.has(key)) {
          // Achieved on the exact calendar date of the threshold-th completed day
          const achievedDate = segment.completedDays[milestone.thresholdDays - 1];

          const achievement: Achievement = {
            id: generateUUID(),
            habitId: habit.id,
            milestoneId: milestone.id,
            thresholdDays: milestone.thresholdDays,
            streakStartDate: segment.startDate,
            achievedDate,
            achievedStreakLength: milestone.thresholdDays,
            rewardTitle: milestone.rewardTitle,
            rewardDescription: milestone.rewardDescription || '',
            rewardCategory: milestone.rewardCategory,
            personalNote: milestone.personalNote,
            isClaimed: false,
            createdAt: now,
            updatedAt: now
          };

          newAchievements.push(achievement);
          existingSet.add(key); // prevent duplicate additions within the same call
        }
      }
    }
  }

  return newAchievements;
}

export class AchievementEngine {
  /**
   * Evaluates and records any newly achieved milestones for a single habit.
   * Atomic Dexie transaction to ensure zero duplicate records.
   */
  static async evaluateAndRecordAchievements(
    habitId: string,
    options?: { evaluationDate?: string }
  ): Promise<Achievement[]> {
    const habit = await db.habits.get(habitId);
    if (!habit) return [];

    const [milestones, streakResult, existingAchievements] = await Promise.all([
      db.milestones.where('habitId').equals(habitId).toArray(),
      StreakEngine.calculateHabitStreak(habitId, options),
      db.achievements.where('habitId').equals(habitId).toArray()
    ]);

    if (!streakResult) return [];

    const newAchievements = detectAchievementsForHabit(
      habit,
      milestones,
      streakResult,
      existingAchievements
    );

    if (newAchievements.length > 0) {
      await db.transaction('rw', db.achievements, db.auditRecords, async () => {
        for (const item of newAchievements) {
          await db.achievements.add(item);
          await db.auditRecords.add({
            id: generateUUID(),
            habitId: habit.id,
            date: item.achievedDate,
            action: 'status_change',
            timestamp: item.createdAt,
            reason: `Unlocked milestone reward "${item.rewardTitle}" (${item.thresholdDays}d streak achieved)`
          });
        }
      });
    }

    return newAchievements;
  }

  /**
   * Evaluates all active habits and persists any newly earned achievements.
   */
  static async evaluateAllActiveHabits(options?: { evaluationDate?: string }): Promise<Achievement[]> {
    const habits = await db.habits.where('status').equals('active').toArray();
    const newlyEarned: Achievement[] = [];

    for (const habit of habits) {
      const earned = await this.evaluateAndRecordAchievements(habit.id, options);
      newlyEarned.push(...earned);
    }

    return newlyEarned;
  }

  /**
   * Calculates progress for all milestones of a habit against its current streak.
   */
  static async getMilestoneProgressForHabit(
    habitId: string,
    options?: { evaluationDate?: string }
  ): Promise<MilestoneProgressItem[]> {
    const [milestones, streakResult, achievements] = await Promise.all([
      db.milestones.where('habitId').equals(habitId).toArray(),
      StreakEngine.calculateHabitStreak(habitId, options),
      db.achievements.where('habitId').equals(habitId).toArray()
    ]);

    const sortedMilestones = [...milestones].sort((a, b) => a.thresholdDays - b.thresholdDays);
    const currentStreak = streakResult?.currentStreak || 0;
    const longestStreak = streakResult?.longestStreak || 0;
    const currentStreakStart = streakResult?.currentStreakStartDate;

    return sortedMilestones.map((milestone) => {
      // Find matching achievement for current streak instance if any
      const currentStreakAchievement = achievements.find(
        (a) => a.milestoneId === milestone.id && a.streakStartDate === currentStreakStart
      );

      // Latest achievement across all time for this milestone
      const latestAchievement = achievements
        .filter((a) => a.milestoneId === milestone.id)
        .sort((a, b) => b.achievedDate.localeCompare(a.achievedDate))[0];

      const isUnlockedInCurrentStreak = Boolean(currentStreakAchievement);
      const isClaimed = Boolean(currentStreakAchievement?.isClaimed || latestAchievement?.isClaimed);

      const daysRemaining = Math.max(0, milestone.thresholdDays - currentStreak);
      const percentage = Math.min(100, Math.round((currentStreak / milestone.thresholdDays) * 100));

      return {
        milestone,
        currentStreakDays: currentStreak,
        longestStreakDays: longestStreak,
        isUnlocked: isUnlockedInCurrentStreak || currentStreak >= milestone.thresholdDays,
        isClaimed,
        daysRemaining,
        percentage,
        latestAchievement: currentStreakAchievement || latestAchievement
      };
    });
  }

  /**
   * Retrieves all achievements for a habit.
   */
  static async getAchievementsForHabit(habitId: string): Promise<Achievement[]> {
    const items = await db.achievements.where('habitId').equals(habitId).toArray();
    return items.sort((a, b) => b.achievedDate.localeCompare(a.achievedDate));
  }

  /**
   * Retrieves all achievements across all habits.
   */
  static async getAllAchievements(): Promise<Achievement[]> {
    const items = await db.achievements.toArray();
    return items.sort((a, b) => b.achievedDate.localeCompare(a.achievedDate));
  }
}
