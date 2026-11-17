# SEMNÓTĒS — System Architecture

**Product Name:** SEMNÓTĒS  
**Tagline:** *Dignity. Self-respect. Discipline.*  
**Status:** M1 (Foundation), M2 (Habit Management), M3 (Strict Streak Engine), M4 (Milestones & Rewards), M5 (Consistency Calendar), M6 (Journal & Daily Reflection), M7 (Discipline Analytics), M7.1 (Product Alignment), & M8 (Focus Mode & Custom Pomodoro) Complete

---

## 1. Architectural Principles

SEMNÓTĒS is a universal, local-first personal discipline and habit tracking platform designed for anyone seeking to build consistency across academic study, fitness, coding, reading, sleep, morning routines, and personal commitments. It is architected with strict separation of concerns across four key layers:

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

## 5. Journal & Reflection Subsystem (M6)

### A. Daily Reflection Architecture
The reflection subsystem bifurcates daily introspection into two distinct temporal practices:
1. **Morning Intention (`MorningIntention`):**
   - Framing orientation: `primaryIntention`, `keyCommitment`, `potentialObstacle`, `plannedResponse`, and `personalNote`.
   - Idempotency & History: Enforces one canonical morning intention per calendar date, allowing continuous refinement throughout the morning without overwriting historical audit logs.
2. **Evening Debrief (`EveningDebrief`):**
   - Retrospective evaluation: `wentWell`, `difficultiesFaced`, `lessonsLearned`, `tomorrowImprovements`, and `gratitude`.
   - Supports partial saves and progressive closure before sleep.

### B. Deterministic Philosophical Prompt Rotation Engine
- **Zero Clock/Network Dependency:** Prompts are generated from pure date string hashes ($h(\text{YYYY-MM-DD})$) via `hashDateString`.
- **Categories:** 24+ curated prompts across 8 philosophical domains (`discipline`, `self_respect`, `gratitude`, `focus`, `growth`, `resilience`, `accountability`, `recovery`).
- **Paired Generation:** Morning prompts emphasize proactive intention and focus; evening prompts emphasize accountability, resilience, and gratitude.
- **Skip Coprime Stepping:** Skipping a prompt applies coprime indexing ($(h + 7 \cdot \text{skip}) \pmod N$), guaranteeing non-repetitive cycling.

### C. Urge Tracking & Trigger Diagnostics (Strict Isolation Invariant)
- **Descriptive Diagnostics:** Quantifies friction on a 1–10 intensity scale with 10 trigger categories (`boredom`, `stress`, `loneliness`, `fatigue`, `anxiety`, `procrastination`, `environmental`, `social_media`, `habitual_routine`, `other`), response strategies (`resisted`, `diverted`, `delayed`, `succumbed`, `unresolved`), and custom situation notes.
- **Strict Separation Invariant:**
  $$\text{UrgeLog} \not\in \text{HabitLog} \quad \text{and} \quad \Delta \text{UrgeLog} \implies \Delta \text{Streak} = 0$$
  Recording an urge (even with outcome `succumbed` or `unresolved`) is purely diagnostic and never generates a failed check-in or resets a habit streak.

### D. Sovereign Private Journal & History
- **Lightweight Markdown:** Support for headings, lists, blockquotes, and emphasis without heavy rich-text editor bloat.
- **Full-Text Multi-Dimensional Queries:** Indexed queries supporting keyword text matching, date ranges, multi-tag filtering, linked habit filtering, and archival toggling with pagination.

---

## 6. Discipline Analytics Subsystem (Mathematical Formulation & Architecture)

### A. Core Mathematical Formula
The central metric of SEMNÓTĒS is the **Rolling 30-Day Discipline Score**:

$$\text{Discipline Score} = \left( \frac{\sum \text{Completed Scheduled Commitments}}{\sum \text{Evaluated Scheduled Commitments}} \right) \times 100$$

where:
$$\text{Evaluated Scheduled Commitments} = \text{Completed} + \text{Failed} + \text{Missed}$$

### B. Denominator Exclusion Invariants (Zero Vanity Inflation)
1. **Pending Commitments Exclusion:** On $D_{\text{eval}}$, an unlogged commitment is marked `pending`. It is strictly excluded from `Evaluated` and does not penalize the user prematurely.
2. **Paused Days Exclusion:** Days falling within verified pause intervals ($\text{status} = \text{paused}$) are completely excluded from `Evaluated`.
3. **Unscheduled Rest Days Exclusion:** Days not configured in a habit's custom schedule (e.g. Tue/Thu for MWF schedule) are excluded from `Evaluated`.
4. **Future Dates Exclusion:** Days $d > D_{\text{eval}}$ are strictly excluded.
5. **Insufficient Data Invariant:**
   $$\text{Evaluated} = 0 \implies \text{score: null}, \quad \text{hasSufficientData: false}, \quad \text{adherenceGrade: 'insufficient_data'}$$
   The engine never manufactures arbitrary 0% or 100% scores when no evaluated data exists.

### C. Sovereign Adherence Tier Brackets
Scores with sufficient data ($\ge 1$ evaluated commitment) map deterministically to adherence tiers:
- **Sovereign Tier:** $\text{Score} \ge 90\%$
- **Disciplined Tier:** $75\% \le \text{Score} < 90\%$
- **Stable Tier:** $60\% \le \text{Score} < 75\%$
- **Vulnerable Tier:** $\text{Score} < 60\%$

### D. Rolling Window Semantics & Linear Sliding Window
- **Current Rolling Window:** A 30-day inclusive period: $[D_{\text{eval}} - 29, D_{\text{eval}}]$.
- **Preceding Rolling Window:** The immediately preceding 30-day period: $[D_{\text{eval}} - 59, D_{\text{eval}} - 30]$.
- **Period Delta:** $\Delta \text{score} = \text{score}_{\text{current}} - \text{score}_{\text{preceding}}$.
- **Linear Sliding Window Algorithm ($O(N)$):** For multi-month trend series, rolling 30-day scores are computed using an incremental sliding window rather than $O(N \times 30)$ nested array allocations.

### E. Analytics Privacy Firewall
- All calculations run 100% client-side in the browser via Dexie IndexedDB.
- All analytics calculations run locally in your browser. Private journal entries and personal reflections are never included in analytics calculations. Sensitive journal text, morning intentions, and urge descriptions are strictly shielded from analytics aggregation. Only audited habit fulfillment statuses are aggregated.

---

## 7. Data Schema & Persistence (IndexedDB v5)

The schema is defined in `src/core/domain/types.ts` and indexed via Dexie in `src/storage/db/index.ts`:

- `habits`: `id, category, type, status, startDate, createdAt`
- `habitLogs`: `id, habitId, date, status, [habitId+date]`
- `auditRecords`: `id, habitId, habitLogId, date, action, timestamp`
- `milestones`: `id, habitId, thresholdDays, isEnabled, [habitId+thresholdDays], createdAt`
- `achievements`: `id, habitId, milestoneId, thresholdDays, streakStartDate, isClaimed, achievedDate, [habitId+milestoneId+streakStartDate]`
- `journalEntries`: `id, date, isArchived, linkedHabitId, createdAt, updatedAt, *tags` (v4)
- `urgeLogs`: `id, date, timestamp, intensity, responseOutcome, linkedHabitId, createdAt, *triggerCategories` (v4)
- `morningIntentions`: `id, date, createdAt, updatedAt` (v4)
- `eveningDebriefs`: `id, date, createdAt, updatedAt` (v4)
- `focusSessions`: `id, habitId, linkedHabitId, startedAt, status, sessionMode, date, createdAt` (v5)
- `userSettings`: `id`

---

## 8. Focus Mode & Custom Pomodoro Engine (Formal Rules & Architecture)

### A. Mathematical Formulation & Timestamp Source of Truth
Let $T_{\text{start}}$ be the session or phase start timestamp in milliseconds.
Let $D$ be the planned duration in seconds ($D_{\text{ms}} = D \times 1000$).
Let $T_{\text{accumPaused}}$ be the total accumulated pause duration in milliseconds.

For any evaluation timestamp $T_{\text{now}}$:
1. **Running State:**
   $$\text{elapsedSeconds} = \min\left(D, \, \max\left(0, \, \left\lfloor \frac{T_{\text{now}} - T_{\text{start}} - T_{\text{accumPaused}}}{1000} \right\rfloor\right)\right)$$
   $$\text{remainingSeconds} = \max(0, \, D - \text{elapsedSeconds})$$
2. **Paused State (at $T_{\text{pause}}$):**
   $$\text{elapsedSeconds} = \min\left(D, \, \max\left(0, \, \left\lfloor \frac{T_{\text{pause}} - T_{\text{start}} - T_{\text{accumPaused}}}{1000} \right\rfloor\right)\right)$$
3. **Resumption (at $T_{\text{resume}}$):**
   $$T_{\text{accumPaused}} \leftarrow T_{\text{accumPaused}} + (T_{\text{resume}} - T_{\text{pause}})$$
   $$T_{\text{targetEnd}} \leftarrow T_{\text{targetEnd}} + (T_{\text{resume}} - T_{\text{pause}})$$

### B. True Unrestricted Custom Durations
- Focus sessions support practically any duration from 1 minute to 720 minutes (12 hours).
- Continuous custom sessions are never split into Pomodoro cycles or forced breaks. A 3-hour marathon session produces exactly one continuous 180-minute focus block.

### C. Break Time Isolation Invariant
- Break time (short breaks and long breaks) is strictly recorded in `breakDurationSeconds`.
- Focused duration (`actualDurationSeconds`) strictly measures active focus phases. Break duration is NEVER credited towards focus time.

### D. Zero Habit & Streak Mutation Guarantee
- Focus sessions are analytical and temporal tools. Completing, interrupting, or cancelling a focus session NEVER creates a `HabitLog`, never checks in a habit, and never mutates streaks or rolling 30-day discipline scores.

---

## 9. Security & Privacy Blueprint

- **100% Local-First Storage:** All personal reflections, intentions, urges, and journal entries are persisted exclusively in local browser IndexedDB (`semnotes_db`).
- **Zero Telemetry / Zero External AI Transmission:** No third-party analytical SDKs, cookies, or remote LLM transcription APIs. Private reflections never leave the user's device.
- **Zero Console Data Leaks:** Sensitive journal text, intentions, and urge logs are never output to browser debugging consoles.
- **Command Center Privacy Firewall:** Overview dashboards display only abstract completion badges (e.g. `AM Done`, `PM Done`) and anonymized action triggers; private text is never exposed on common screens.
- **Client-Side Encryption Roadmap (M9):** Web Crypto API AES-GCM 256-bit encryption with PBKDF2/Argon2 password-derived keys will be implemented before optional multi-device cloud synchronization. Current storage is local client storage; no false security claims are made.
