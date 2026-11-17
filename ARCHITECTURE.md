# SEMNÓTĒS — System Architecture

**Product Name:** SEMNÓTĒS  
**Tagline:** *Dignity. Self-respect. Discipline.*  
**Status:** M1 (Foundation), M2 (Habit Management), & M3 (Strict Streak Engine) Complete

---

## 1. Architectural Principles

SEMNÓTĒS is architected with strict separation of concerns across four key layers:

```
┌────────────────────────────────────────────────────────┐
│                   Presentation Layer                   │
│   (React 19, Tailwind CSS, Lucide, AppShell, Views)    │
│   - CommandCenter (Live active streak metrics)         │
│   - StreaksView (Independent streak cards)             │
│   - HabitDetailView (Timeline, Forensic streak data)   │
│   - HabitFormModal & CheckInModal                      │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    Application Layer                   │
│    (StreakEngine, HabitService, HabitLogService,       │
│     ScheduleService, HabitDashboardService)            │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                   Domain Engine Layer                  │
│    (StreakCalculator: Pure deterministic math,         │
│     StreakUtils, Zod Entities, Invariant Rules)        │
│             * Zero React / UI Dependencies *           │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                  Persistence Layer                     │
│  (Dexie.js IndexedDB: semnotes_db v2, Audit Trails)    │
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

## 2. Habit Management Domain Specifications

### A. Tracking Types
1. **Abstinence Tracking:**
   - Daily outcomes: *Maintained Standard* (`status: 'completed'`) vs *Setback / Relapse* (`status: 'failed'`).
   - Purpose: Breaking negative loops (pornography, smoking, dopamine binging) where success is defined by avoiding the trigger.
2. **Binary Completion Tracking:**
   - Daily outcomes: *Completed* (`status: 'completed'`) vs *Missed* (`status: 'failed'`).
   - Purpose: Daily habits requiring positive action (DSA problem solving, deep reading, calisthenics).
3. **Quantitative Tracking:**
   - Target configuration: `targetValue: number`, `unit: string`, `targetConstraint: 'at_least' | 'at_most'`.
   - Determination: Evaluated on log entry. If `at_least`, `numericValue >= targetValue ? 'completed' : 'failed'`. If `at_most`, `numericValue <= targetValue ? 'completed' : 'failed'`.

### B. Scheduling Engine
- `frequency: 'daily' | 'selected_days'`.
- Selected days use `selectedDays: number[]` (0=Sun, 1=Mon, ..., 6=Sat).
- Unscheduled days are strictly categorized as `rest_day` or `skipped`; **unscheduled days are never marked as missed**.
- Bound check against `startDate` and optional `endDate`.

---

## 3. Data Schema & Persistence (IndexedDB v2)

The schema is defined in `src/core/domain/types.ts` and indexed via Dexie in `src/storage/db/index.ts`:

- `habits`: `id, category, type, status, startDate, createdAt`
- `habitLogs`: `id, habitId, date, status, [habitId+date]`
- `auditRecords`: `id, habitId, habitLogId, date, action, timestamp`
- `milestones`: `id, habitId, thresholdDays, isUnlocked, isClaimed`
- `journalEntries`: `id, date, mood, createdAt`
- `urgeLogs`: `id, habitId, timestamp, intensity, response`
- `focusSessions`: `id, habitId, startedAt, status`
- `userSettings`: `id`

### Calendar Dates vs Timestamps
- Calendar dates are recorded as ISO local strings (`YYYY-MM-DD`). This prevents timezone crossing bugs where check-ins made at 11:30 PM shift to the next day upon export or browser timezone switch.
- Event audit times use UTC ISO8601 strings (`2026-11-17T15:30:00.000Z`).

---

## 4. Milestone & Reward Engine

- **Idempotency:** Milestones are evaluated on log creation. Once `isUnlocked = true`, subsequent evaluations will not emit redundant unlock events or rewards.
- **Customization:** Users define threshold day targets (e.g. 7, 14, 30, 90 days) independently per habit.
- **Reward Claims:** Unlocked rewards transition to `isClaimed = true` with a timestamp, preserving the celebration history.

---

## 5. Security & Privacy Blueprint

- **Zero Telemetry:** No third-party analytical SDKs or tracking cookies.
- **Client-Side Encryption (Roadmap M8):** Web Crypto API AES-GCM 256-bit encryption for journal and urge logs before optional Supabase synchronization.
