import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Gift, Check, Clock, Plus } from 'lucide-react';

interface MilestoneReward {
  id: string;
  habitTitle: string;
  thresholdDays: number;
  currentDays: number;
  rewardTitle: string;
  rewardDescription: string;
  isUnlocked: boolean;
  isClaimed: boolean;
}

export function MilestonesView() {
  const [rewards, setRewards] = useState<MilestoneReward[]>([
    {
      id: 'r1',
      habitTitle: 'Digital Purity & Abstinence',
      thresholdDays: 7,
      currentDays: 24,
      rewardTitle: 'Artisan Espresso & Book Afternoon',
      rewardDescription: 'A solo afternoon in a quiet coffeehouse reading Marcus Aurelius.',
      isUnlocked: true,
      isClaimed: true,
    },
    {
      id: 'r2',
      habitTitle: 'Digital Purity & Abstinence',
      thresholdDays: 30,
      currentDays: 24,
      rewardTitle: 'Premium Leather Bound Journal',
      rewardDescription: 'Custom gold-embossed notebook for daily discipline reflections.',
      isUnlocked: false,
      isClaimed: false,
    },
    {
      id: 'r3',
      habitTitle: 'DSA & Algorithmic Practice',
      thresholdDays: 14,
      currentDays: 12,
      rewardTitle: 'Mechanical Keyboard Artisan Keycap',
      rewardDescription: 'A physical reminder of coding consistency for the workstation.',
      isUnlocked: false,
      isClaimed: false,
    },
    {
      id: 'r4',
      habitTitle: 'Digital Purity & Abstinence',
      thresholdDays: 14,
      currentDays: 24,
      rewardTitle: 'Noise Cancelling Headphones Upgrade',
      rewardDescription: 'High fidelity audio for distraction-free deep work.',
      isUnlocked: true,
      isClaimed: false,
    }
  ]);

  const handleClaim = (id: string) => {
    setRewards((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isClaimed: true } : r))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-100">
              Custom Milestones & Rewards
            </h2>
            <Badge variant="gold" size="sm">M4 Domain</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Independent reward thresholds for every streak. Idempotent milestone detection.
          </p>
        </div>

        <Button variant="primary" size="sm" className="gap-2">
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Custom Threshold</span>
        </Button>
      </div>

      {/* Rewards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rewards.map((reward) => (
          <Card
            key={reward.id}
            className={`border transition-all duration-200 ${
              reward.isUnlocked && !reward.isClaimed
                ? 'border-gold-500/60 bg-gradient-to-br from-obsidian-800 to-obsidian-850 shadow-gold-sm'
                : 'border-obsidian-750 bg-obsidian-850'
            }`}
          >
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gold-400">
                    {reward.habitTitle}
                  </span>
                </div>
                <CardTitle className="text-base font-bold text-slate-100">
                  {reward.rewardTitle}
                </CardTitle>
              </div>

              <Badge
                variant={
                  reward.isClaimed
                    ? 'neutral'
                    : reward.isUnlocked
                    ? 'gold'
                    : 'outline'
                }
                size="sm"
                className="font-mono"
              >
                {reward.thresholdDays} Days
              </Badge>
            </CardHeader>

            <CardContent className="space-y-3 pt-1">
              <CardDescription>{reward.rewardDescription}</CardDescription>

              <div className="flex items-center justify-between pt-3 border-t border-obsidian-750 text-xs">
                <span className="text-slate-400 font-mono">
                  {reward.currentDays} / {reward.thresholdDays} days fulfilled
                </span>

                {reward.isClaimed ? (
                  <span className="text-slate-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Claimed & Honored
                  </span>
                ) : reward.isUnlocked ? (
                  <Button
                    variant="gold-glow"
                    size="sm"
                    onClick={() => handleClaim(reward.id)}
                    className="text-xs h-7 px-3 text-obsidian-950 font-bold"
                  >
                    <Gift className="w-3.5 h-3.5 mr-1" />
                    Claim Reward
                  </Button>
                ) : (
                  <span className="text-slate-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    {reward.thresholdDays - reward.currentDays} days remaining
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
