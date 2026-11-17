import { db } from '../../storage/db';
import type { Achievement, ClaimRewardInput } from '../domain/types';
import { ClaimRewardInputSchema } from '../domain/types';
import { generateUUID } from '../utils';

export class RewardService {
  /**
   * Manually claim an earned reward milestone.
   * Throws if achievement is not found or already claimed.
   * Strictly isolated from streak data: claiming never affects habit streaks or logs.
   */
  static async claimReward(
    achievementId: string,
    input?: ClaimRewardInput
  ): Promise<Achievement> {
    const validatedInput = input ? ClaimRewardInputSchema.parse(input) : {};
    const achievement = await db.achievements.get(achievementId);

    if (!achievement) {
      throw new Error(`Achievement with ID ${achievementId} was not found.`);
    }

    if (achievement.isClaimed) {
      throw new Error(`Reward "${achievement.rewardTitle}" has already been claimed.`);
    }

    const now = new Date().toISOString();
    const claimedDate = validatedInput.claimedAt || now;

    const updated: Achievement = {
      ...achievement,
      isClaimed: true,
      claimedAt: claimedDate,
      claimNotes: validatedInput.claimNotes?.trim() || undefined,
      updatedAt: now
    };

    await db.transaction('rw', db.achievements, db.auditRecords, async () => {
      await db.achievements.put(updated);
      await db.auditRecords.add({
        id: generateUUID(),
        habitId: updated.habitId,
        date: claimedDate.split('T')[0],
        action: 'status_change',
        timestamp: now,
        reason: `Claimed reward "${updated.rewardTitle}" for achieving ${updated.thresholdDays}d streak`
      });
    });

    return updated;
  }

  /**
   * Retrieves all unclaimed achievements waiting for redemption, sorted most recent first.
   */
  static async getUnclaimedAchievements(): Promise<Achievement[]> {
    const achievements = await db.achievements
      .filter((a) => !a.isClaimed)
      .toArray();

    return achievements.sort((a, b) => b.achievedDate.localeCompare(a.achievedDate));
  }

  /**
   * Retrieves all claimed rewards history, sorted by claim date desc.
   */
  static async getClaimedAchievements(): Promise<Achievement[]> {
    const achievements = await db.achievements
      .filter((a) => Boolean(a.isClaimed))
      .toArray();

    return achievements.sort((a, b) => {
      const dateA = a.claimedAt || a.achievedDate;
      const dateB = b.claimedAt || b.achievedDate;
      return dateB.localeCompare(dateA);
    });
  }

  /**
   * Get an achievement by ID.
   */
  static async getAchievementById(id: string): Promise<Achievement | undefined> {
    return db.achievements.get(id);
  }
}
