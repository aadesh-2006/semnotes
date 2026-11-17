# SEMNÓTĒS — System Architecture

**Product Name:** SEMNÓTĒS  
**Tagline:** *Dignity. Self-respect. Discipline.*  
**Status:** M1 (Foundation), M2 (Habit Management), M3 (Strict Streak Engine), & M4 (Custom Milestone & Reward Engine) Complete

---

## 1. Architectural Principles

SEMNÓTĒS is architected with strict separation of concerns across four key layers:

```
┌────────────────────────────────────────────────────────┐
│                   Presentation Layer                   │
│   (React 19, Tailwind CSS, Lucide, AppShell, Views)    │
│   - CommandCenter (Live active streak & milestone cards│
│   - StreaksView (Independent streak cards)             │
│   - MilestonesView (Reward Center, 3 tab ledger)       │
│   - HabitDetailView (Timeline, Milestones & Rewards)   │
│   - MilestoneFormModal & ClaimRewardModal              │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    Application Layer                   │
│    (StreakEngine, MilestoneService, RewardService,     │
│     AchievementEngine, HabitService, HabitLogService)  │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                   Domain Engine Layer                  │
│    (StreakCalculator: Pure deterministic math,         │
│     detectAchievementsForHabit, extractStreakSegments, │
│     StreakUtils, Zod Entities, Invariant Rules)        │
│             * Zero React / UI Dependencies *           │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                  Persistence Layer                     │
│  (Dexie.js IndexedDB: semnotes_db v3, Audit Trails)    │
│   - habits, habitLogs, auditRecords,                   │
│   - milestones, achievements                           │
└────────────────────────────────────────────────────────┘
```

---

## 2. Independent Strict Streak Engine (Formal Rules & Math)

### A. Mathematical Formulation
Let $H$ be a habit with schedule $S$, start date $D_0$, and evaluation date $D_{\text{eval}}$.

For every local calendar date $d \in [D_0, D_{\text{eval}}]$:
1. **Unscheduled Exclusion:**
   If $d$ is not a scheduled day in $S$:
   $$\text{status}(d) = \text{skipped} \implies \text{does not increment}, \quad \text{does not break streak}$$
2. **Paused Interval Exclusion:**
   If $d$ falls within any recorded pause interval:
   $$\text{status}(d) = \text{skipped} \implies \text{does not increment}, \quad \text{does not break streak}$$
3. **Scheduled Adherence:**
   For any scheduled, unpaused day $d$:
   - If log exists and is successful: $\text{status}(d) = \text{completed} \implies \text{contributes to streak}$
   - If log exists and is failed: $\text{status}(d) = \text{failed} \implies \text{breaks streak}$
   - If NO log exists and $d < D_{\text{eval}}$: $\text{status}(d) = \text{missed} \implies \text{breaks streak}$
   - If NO log exists and $d = D_{\text{eval}}$: $\text{status}(d) = \text{pending} \implies \text{does not break streak yet}$

### B. Current Streak Formula
Let $\{s_1, s_2, \dots, s_k\}$ be the ordered sequence of scheduled, unpaused days up to $D_{\text{eval}}$.
- If $s_k = D_{\text{eval}}$ and $\text{status}(s_k) = \text{pending}$: the active streak is evaluated starting from $s_{k-1}$ (the latest completed scheduled day).
- If $\text{status}(s_k) = \text{failed}$: $\text{CurrentStreak} = 0$.
- Otherwise:
  $$\text{CurrentStreak} = \max \{ n \ge 0 \mid \forall i \in [k - n + 1, k], \, \text{status}(s_i) = \text{completed} \}$$

### C. Longest Streak Formula
Across all contiguous sequences of completed scheduled days:
$$\text{LongestStreak} = \max \left( \text{cachedLongest}, \max_{i \le j} \left\{ j - i + 1 \mid \forall m \in [i, j], \, \text{status}(s_m) = \text{completed} \right\} \right)$$
The historical longest streak is monotonic non-decreasing ($L_{t+1} \ge L_t$) and is preserved permanently across setbacks.

### D. True Streak Independence
$$\forall H_a, H_b \quad (a \ne b) \implies \text{Streak}(H_a) \perp \text{Streak}(H_b)$$
Resetting or failing $H_a$ has zero effect on the streak calculations of $H_b$.

### E. Timezone and Calendar Date Safety
- All dates are evaluated as local ISO date strings (`YYYY-MM-DD`).
- Date navigation and additions use local date components (`new Date(y, m - 1, d + delta)`), completely avoiding UTC offset flips or daylight-saving anomalies.

---

## 3. Custom Milestone & Reward Engine (Formal Specification)

### A. Core Mathematical & Data Invariants
1. **Threshold Formulation:**
   Every milestone threshold $T \in \mathbb{Z}^+$ must be a strictly positive integer ($T > 0$).
2. **Per-Habit Threshold Uniqueness:**
   $$\forall M_1, M_2 \in \text{Milestones}(H) \quad (M_1 \ne M_2 \implies T_1 \ne T_2)$$
   Duplicate thresholds are strictly prohibited within the same habit, but identical thresholds are permitted across distinct habits.
3. **Streak Segments & Achievement Identity:**
   A timeline is partitioned into disjoint contiguous streak segments:
   $$\text{Segment}_k = \left( D_{\text{start}}^{(k)}, \, [d_1, d_2, \dots, d_{L_k}] \right)$$
   An achievement record is uniquely and immutably identified by the compound triple:
   $$\text{AchievementKey} = ( \text{habitId}, \, \text{milestoneId}, \, D_{\text{start}}^{(k)} )$$
4. **Exact Calendar Achievement Date:**
   When a streak segment length $L_k \ge T$, the achievement is unlocked on the exact calendar date of the $T$-th completed day:
   $$D_{\text{achieved}} = d_T$$
5. **Strict Streak Reset & Repeat Unlock Invariant:**
   - If a streak breaks (resets to 0) and the user later starts a new streak segment $k+1$ where $D_{\text{start}}^{(k+1)} > D_{\text{start}}^{(k)}$ and reaches threshold $T$, a **brand new achievement record** is legitimately earned and recorded.
   - Historical achievements from past streak instances are permanently preserved in IndexedDB.
6. **Historical Snapshot Immutability:**
   Achievements store frozen snapshots of reward metadata (`rewardTitle`, `rewardDescription`, `thresholdDays`, `achievedDate`). Editing or deleting a milestone definition never alters or erases past earned achievements.
7. **Streak Isolation Invariant:**
   Claiming an unlocked reward sets `isClaimed = true`, `claimedAt`, and `claimNotes`. Claiming **NEVER** modifies habit logs, active streaks, or streak calculations.

---

## 4. Consistency Calendar & Discipline Heatmap Engine (M5)

The Consistency Calendar subsystem (`src/core/calendar/` and `src/features/calendar/`) transforms raw historical records into an interactive, forensic matrix of personal discipline.

### Mathematical Adherence Semantics

1. **Daily Evaluation Scope:**
   For any calendar date $D$ and habit $H$:
   - **Lifecycle Validity:** A habit is active on date $D$ if and only if:
     $$D \ge H.\text{startDate} \quad \text{and} \quad (H.\text{endDate} = \varnothing \lor D \le H.\text{endDate})$$
     Dates outside this boundary are marked `unscheduled` and excluded from all adherence calculations.
   - **Pause Invariant:** If $D$ falls inside an audited pause interval ($[\text{pauseStart}, \text{pauseEnd}]$), the habit is evaluated as `paused` and excluded from the scheduled denominator.
   - **Schedule Invariant:** If the habit is not scheduled for day of week $w(D)$ according to $H.\text{schedule}$, it is marked `unscheduled` (rest day).
   - **Evaluated Commitments:** A habit is an *applicable scheduled commitment* on date $D$ if and only if it is active, not paused, and scheduled.

2. **Daily Completion Percentage Formula:**
   $$\text{Daily Completion Percentage} = \frac{\text{Completed Scheduled Habits}}{\text{Evaluated Scheduled Habits}} \times 100$$
   where:
   $$\text{Evaluated Scheduled Habits} = \text{CompletedCount} + \text{FailedCount} + \text{MissedCount}$$
   - **Pending Invariant:** Pending commitments on the evaluation date (today) are strictly excluded from the failure count and the evaluated denominator.
   - **Zero Scheduled Commitments:** If $\text{Evaluated Scheduled Habits} = 0$, the day completion percentage is `null` (never displayed as 0% failure).

3. **Semantic Day States:**
   - `complete`: $100\%$ adherence ($\text{CompletedCount} = \text{ScheduledCount}$ and $\text{PendingCount} = 0$).
   - `partial`: Mixed adherence ($0\% < \% < 100\%$, or completed with pending commitments remaining).
   - `failed`: $0\%$ adherence with scheduled commitments ($\text{CompletedCount} = 0$ and $\text{EvaluatedScheduledCount} > 0$).
   - `pending`: Today's scheduled commitments awaiting check-in with zero completed or failed yet.
   - `rest`: Zero commitments were scheduled ($0$ scheduled habits).
   - `paused`: All applicable commitments on date $D$ were excluded due to an official pause.
   - `future`: Date is strictly after the evaluation date ($D > D_{\text{eval}}$).

4. **Batch Query Performance:**
   Calendar adherence calculations execute over indexed date boundaries using `db.habitLogs.where('date').between(...)` and `db.auditRecords.where('habitId').anyOf(...)`. Individual cells are never calculated via repeated database round-trips.

---

## 5. Data Schema & Persistence (IndexedDB v3)

The schema is defined in `src/core/domain/types.ts` and indexed via Dexie in `src/storage/db/index.ts`:

- `habits`: `id, category, type, status, startDate, createdAt`
- `habitLogs`: `id, habitId, date, status, [habitId+date]`
- `auditRecords`: `id, habitId, habitLogId, date, action, timestamp`
- `milestones`: `id, habitId, thresholdDays, isEnabled, [habitId+thresholdDays]`
- `achievements`: `id, habitId, milestoneId, isClaimed, achievedDate, claimedAt, [habitId+streakStartDate], [habitId+milestoneId+streakStartDate]`
- `journalEntries`: `id, date, mood, createdAt`
- `urgeLogs`: `id, habitId, timestamp, intensity, response`
- `focusSessions`: `id, habitId, startedAt, status`
- `userSettings`: `id`

---

## 5. Security & Privacy Blueprint

- **Zero Telemetry:** No third-party analytical SDKs or tracking cookies.
- **Client-Side Encryption (Roadmap M8):** Web Crypto API AES-GCM 256-bit encryption for journal and urge logs before optional Supabase synchronization.

---

## 5. Security & Privacy Blueprint

- **Zero Telemetry:** No third-party analytical SDKs or tracking cookies.
- **Client-Side Encryption (Roadmap M8):** Web Crypto API AES-GCM 256-bit encryption for journal and urge logs before optional Supabase synchronization.
