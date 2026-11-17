import type { PromptCategory, ReflectionPrompt } from './reflectionTypes';

// Original SEMNÓTĒS prompt bank (Dignity. Self-respect. Discipline.)
export const REFLECTION_PROMPTS: ReflectionPrompt[] = [
  // Discipline
  {
    id: 'disc-1',
    category: 'discipline',
    prompt: 'What commitment is easiest to compromise on today, and why will you refuse to break it?',
    subtext: 'Discipline is remembering what you want most over what you want now.'
  },
  {
    id: 'disc-2',
    category: 'discipline',
    prompt: 'Where did you feel internal resistance today, and did you act in spite of it?',
    subtext: 'Action dissolves the friction that anticipation creates.'
  },
  {
    id: 'disc-3',
    category: 'discipline',
    prompt: 'How did keeping your word to yourself today reinforce your self-respect?',
    subtext: 'Every maintained standard is a vote of confidence in your sovereignty.'
  },
  {
    id: 'disc-4',
    category: 'discipline',
    prompt: 'What standard did you hold firm when nobody was watching?',
    subtext: 'Private discipline determines public character.'
  },

  // Self-Respect
  {
    id: 'self-1',
    category: 'self_respect',
    prompt: 'In what moment today did you treat yourself with genuine dignity?',
    subtext: 'Self-respect is built by treating your future self as someone worthy of care.'
  },
  {
    id: 'self-2',
    category: 'self_respect',
    prompt: 'Did any action today feel beneath your chosen standards? How will you correct course?',
    subtext: 'Do not punish yourself; elevate your conduct with quiet resolve.'
  },
  {
    id: 'self-3',
    category: 'self_respect',
    prompt: 'What boundaries did you protect today against external chaos or impulse?',
    subtext: 'Protecting your focus is an act of sovereign self-respect.'
  },

  // Gratitude
  {
    id: 'grat-1',
    category: 'gratitude',
    prompt: 'What unearned gift or quiet privilege supported your discipline today?',
    subtext: 'Gratitude grounds strength in perspective.'
  },
  {
    id: 'grat-2',
    category: 'gratitude',
    prompt: 'Who or what made your work possible today, even in a small way?',
    subtext: 'Acknowledge the quiet contributions that underpin your daily life.'
  },
  {
    id: 'grat-3',
    category: 'gratitude',
    prompt: 'What physical capacity or clarity of mind did you benefit from today?',
    subtext: 'Recognize health and lucidity as resources to be stewarded wisely.'
  },

  // Focus
  {
    id: 'foc-1',
    category: 'focus',
    prompt: 'What distraction attempted to hijack your attention, and how did you dismiss it?',
    subtext: 'Attention is your most finite, sovereign asset.'
  },
  {
    id: 'foc-2',
    category: 'focus',
    prompt: 'Did your primary work today receive your sharpest energy, or merely leftovers?',
    subtext: 'First things first. Secondary matters must take their place in line.'
  },
  {
    id: 'foc-3',
    category: 'focus',
    prompt: 'What one task, if completed with undivided attention, would make today a success?',
    subtext: 'Single-pointed concentration cuts through superficial busyness.'
  },

  // Growth
  {
    id: 'grow-1',
    category: 'growth',
    prompt: 'What did you attempt today that stretched beyond your current comfort zone?',
    subtext: 'Competence expands only at the edge of slight discomfort.'
  },
  {
    id: 'grow-2',
    category: 'growth',
    prompt: 'What feedback or mistake delivered an uncomfortable but necessary truth today?',
    subtext: 'Listen to reality without defensiveness.'
  },
  {
    id: 'grow-3',
    category: 'growth',
    prompt: 'In what domain are you practicing deliberate, slow craftsmanship over quick gratification?',
    subtext: 'True mastery is quiet and accumulates compounding interest.'
  },

  // Resilience
  {
    id: 'res-1',
    category: 'resilience',
    prompt: 'When plans derailed or friction arose today, how quickly did you regain composure?',
    subtext: 'The test of resilience is not the absence of storms, but the speed of return to center.'
  },
  {
    id: 'res-2',
    category: 'resilience',
    prompt: 'What discomfort did you endure without complaining or seeking an escape?',
    subtext: 'Quiet endurance refines emotional composure.'
  },
  {
    id: 'res-3',
    category: 'resilience',
    prompt: 'What difficult truth did you face directly instead of rationalizing away?',
    subtext: 'Courage begins with total honesty with oneself.'
  },

  // Accountability
  {
    id: 'acc-1',
    category: 'accountability',
    prompt: 'Did you make any excuses today? If so, state the unvarnished reality.',
    subtext: 'Excuses comfort weakness; accountability generates strength.'
  },
  {
    id: 'acc-2',
    category: 'accountability',
    prompt: 'Did you leave any debt to your future self that you will have to pay tomorrow?',
    subtext: 'Do not borrow comfort from tomorrow at extortionate rates.'
  },
  {
    id: 'acc-3',
    category: 'accountability',
    prompt: 'Are your actions today aligned with the person you claim you are becoming?',
    subtext: 'Audit yourself by your calendar and commitments, not your intentions.'
  },

  // Recovery
  {
    id: 'rec-1',
    category: 'recovery',
    prompt: 'If you faced a setback or slip, did you accept responsibility with dignity and without shame?',
    subtext: 'A slip is data for adjustment, never an excuse to surrender.'
  },
  {
    id: 'rec-2',
    category: 'recovery',
    prompt: 'What trigger or vulnerability preceded your fatigue today, and how can you safeguard against it?',
    subtext: 'Fortify the environment rather than relying purely on willpower.'
  },
  {
    id: 'rec-3',
    category: 'recovery',
    prompt: 'What constructive, restorative action will you take right now to reset your state?',
    subtext: 'Clean sleep, stillness, and order restore sovereign control.'
  }
];

/**
 * Computes a deterministic integer hash from a date string (YYYY-MM-DD).
 */
export function hashDateString(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Deterministically retrieves a reflection prompt based on explicit date,
 * optional category filter, and optional skip counter.
 */
export function getPromptForDate(
  dateStr: string,
  options?: { category?: PromptCategory; skipCount?: number }
): ReflectionPrompt {
  const category = options?.category;
  const skipCount = Math.max(0, options?.skipCount ?? 0);

  let pool = REFLECTION_PROMPTS;
  if (category) {
    const filtered = REFLECTION_PROMPTS.filter((p) => p.category === category);
    if (filtered.length > 0) {
      pool = filtered;
    }
  }

  if (pool.length === 0) {
    // Fallback safeguard (guaranteed never empty in practice)
    return {
      id: 'default-prompt',
      category: 'discipline',
      prompt: 'What standard will guide your choices today?',
      subtext: 'Dignity. Self-respect. Discipline.'
    };
  }

  const hash = hashDateString(dateStr);
  // Shift by skipCount with coprime step to avoid sequential duplicates
  const index = (hash + skipCount * 7) % pool.length;
  return pool[index];
}

/**
 * Retrieves paired morning and evening prompts for a specific date.
 * Morning focuses on intention, focus, and discipline.
 * Evening focuses on accountability, gratitude, and resilience.
 */
export function getDailyPrompts(
  dateStr: string,
  options?: { skipCount?: number }
): { morning: ReflectionPrompt; evening: ReflectionPrompt } {
  const skip = options?.skipCount ?? 0;
  const morningPool = REFLECTION_PROMPTS.filter((p) =>
    ['discipline', 'focus', 'self_respect', 'growth'].includes(p.category)
  );
  const eveningPool = REFLECTION_PROMPTS.filter((p) =>
    ['accountability', 'gratitude', 'resilience', 'recovery'].includes(p.category)
  );

  const hash = hashDateString(dateStr);
  const morningIdx = (hash + skip * 3) % morningPool.length;
  // Offset evening by non-zero prime to ensure distinct index and category
  const eveningIdx = (hash + 11 + skip * 5) % eveningPool.length;

  return {
    morning: morningPool[morningIdx],
    evening: eveningPool[eveningIdx]
  };
}

/**
 * Returns all prompts, optionally filtered by category.
 */
export function getAllPrompts(category?: PromptCategory): ReflectionPrompt[] {
  if (!category) return REFLECTION_PROMPTS;
  return REFLECTION_PROMPTS.filter((p) => p.category === category);
}
