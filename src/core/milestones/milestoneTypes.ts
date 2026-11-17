export type {
  Milestone,
  CreateMilestoneInput,
  UpdateMilestoneInput,
  Achievement,
  ClaimRewardInput
} from '../domain/types';

export interface MilestoneProgressItem {
  milestone: import('../domain/types').Milestone;
  currentStreakDays: number;
  longestStreakDays: number;
  isUnlocked: boolean;
  isClaimed: boolean;
  daysRemaining: number;
  percentage: number;
  latestAchievement?: import('../domain/types').Achievement;
}
