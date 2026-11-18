# SEMNÓTĒS — System Architecture

**Product Name:** SEMNÓTĒS  
**Tagline:** *Dignity. Self-respect. Discipline.*  
**Status:** Complete v1.0.0 Production Ready; M1–M10 Fully Implemented & Verified

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
│  (Dexie.js IndexedDB: semnotes_db v6, Audit Trails)    │
│   - habits (with deletedAt tombstone index), habitLogs │
│   - auditRecords, milestones, achievements             │
│   - focusSessions, journalEntries, urgeLogs            │
│   - morningIntentions, eveningDebriefs, userSettings   │
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
- **Client-Side Zero-Knowledge Encryption (M9):** Web Crypto API AES-256-GCM authenticated encryption with PBKDF2 key derivation (100,000 iterations, SHA-256, 16-byte cryptographically random salt, 12-byte random IV). Plaintext and passwords never touch storage or logs.

---

## 10. Data Management, Backup & Synchronization Architecture (M9)

### A. Backup Envelope & Canonical Checksum
Backups are structured versioned JSON documents (`app: 'semnotes'`, `backupVersion: '1.0'`, `dbVersion: 5`).
Data integrity is verified using key-canonicalized recursive JSON serialization and SHA-256 cryptographic digests computed via `crypto.subtle.digest`.

### B. Pre-Import Validation Pipeline
Before any restore write operation is permitted, `BackupValidationService` executes an exhaustive validation pipeline:
1. Syntax checking & object structure.
2. Manifest header & version compatibility.
3. Cryptographic SHA-256 data checksum verification.
4. Table-by-table schema validation via Zod schemas.
5. Primary key ID uniqueness verification.
6. Foreign-key reference integrity auditing across related tables.

### C. Safe Restore Transaction Engine
1. **Pre-Transaction Validation & Preparation:**
   Before any table write begins, `validateAndPrepare` validates all payloads with Zod schemas and prepares in-memory records outside any transaction. Any payload corruption or schema failure aborts immediately before touching IndexedDB.
2. **Native Atomic Single-Transaction Replace:**
   Executes inside a single native Dexie IndexedDB read-write transaction (`db.transaction('rw', allTables, ...)`) covering all 11 tables. Clears existing tables and atomically commits backup records. Any write failure triggers browser-native ACID rollback, eliminating reliance on fragile in-memory safety snapshot rollback.
3. **Conflict-Safe Merge Restore:**
   Executes inside an atomic transaction adding backup records while preserving local records on compound key collisions (`[habitId+date]`, `[habitId+thresholdDays]`) and unique dates (`morningIntentions`, `eveningDebriefs`). Returns detailed conflict diagnostics (`MergeConflictDetail[]`).

### D. Category-Specific CSV Exports
Strict RFC 4180 compliant CSV generator with UTF-8 Byte Order Mark (`\uFEFF`) to prevent character encoding issues in spreadsheet applications. Specialized exports for Habits, Check-Ins, Focus Sessions, Milestones/Rewards, and Intentions & Reflections.

### E. Zero-Knowledge Synchronization & Conflict Resolution
- Abstract `SyncProvider` contract decoupling synchronization coordination from cloud transport.
- Encrypted envelope transmission (`AES-256-GCM`, base64 encoded salt, IV, and ciphertext with embedded auth tag).
- Version-based conflict detection (`remoteVersion > localVersion`).
- Three deterministic conflict resolution modes:
  - `useRemote`: Decrypts and replaces local DB with remote version.
  - `useLocal`: Forces local state to remote with incremented version.
  - `merge`: Decrypts remote, merges into local DB, and re-uploads unified dataset.

---

## 11. Application Resilience & Root Error Boundary (M10 Batch 1)

### A. Root Error Interception Architecture
The entire React component hierarchy (`<App />`) is enclosed in a sovereign root-level React Error Boundary (`RootErrorBoundary.tsx`) in `src/main.tsx`:

```
┌────────────────────────────────────────────────────────┐
│                   Browser Viewport                     │
├────────────────────────────────────────────────────────┤
│ <RootErrorBoundary>                                    │
│   ┌──────────────────────────────────────────────────┐ │
│   │ <App>                                            │ │
│   │   ├── Navigation & AppShell                      │ │
│   │   └── View Rendering (8 Modules)                 │ │
│   │       └── Component Subtrees                     │ │
│   └──────────────────────────────────────────────────┘ │
│   │ (On Unhandled Render Exception)                    │
│   ▼                                                    │
│   ┌──────────────────────────────────────────────────┐ │
│   │ Resilient Obsidian & Gold Fallback UI            │ │
│   │ ├── Calm disturbance explanation & integrity note│ │
│   │ ├── "Reload Application" action                  │ │
│   │ ├── "Export Emergency Database Backup" button     │ │
│   │ └── Collapsible sanitized technical stack trace  │ │
│   └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### B. Non-Destructive Emergency Database Backup
Unlike generic error screens that trap user data in an unrecoverable state, `RootErrorBoundary` integrates directly with `BackupExportService`:
- Generates a fully validated JSON database backup directly from Dexie IndexedDB in-memory without requiring application reload or navigation.
- Preserves user records even if unexpected presentation layer bugs prevent components from rendering.
- Handles database access failures gracefully with non-technical, compassionate guidance.

### C. Privacy Firewall in Error Diagnostics
- Error boundary diagnostics expose strictly technical error metadata (ISO timestamp, error name, error message, and component stack trace).
- Private journal entries, user reflections, intentions, and habit notes are strictly excluded and never rendered in error boundary traces or logged to tracking services.

---

## 12. Database Integrity, Historical Preservation & Deletion Semantics (M10 Batch 2)

### A. Schema Version 6 Upgrade
The Dexie schema was upgraded to Version 6 with the addition of the `deletedAt` index on the `habits` table (`id, name, trackingType, status, deletedAt, createdAt, updatedAt`).

### B. Dual Deletion Semantics (`AUDIT-DATA-01`)
1. **Normal Habit Deletion (Soft Deletion — Default):**
   - Executed via `HabitService.deleteHabit(id, { purgeHistory: false })`.
   - Sets `status = 'deleted'` and records ISO timestamp `deletedAt`.
   - Excluded from active habit lists and check-in rosters (`HabitService.getAllHabits`, `StreaksView`, `CommandCenter`).
   - **Zero Historical Data Loss:** Preserves all `habitLogs`, `auditRecords`, `milestones`, `achievements`, `focusSessions`, `journalEntries`, and `urgeLogs`.
   - **Consistency Calendar Integrity:** Historical evaluation dates up to `deletedAt` evaluate completed commitments accurately.
   - **Reversibility:** Fully recoverable via `HabitService.restoreDeletedHabit(id)`.
2. **Explicit History Purge (Hard Purge):**
   - Executed via `HabitService.purgeHabitHistory(id)` or `deleteHabit(id, { purgeHistory: true })`.
   - Transactionally removes the habit and strictly habit-dependent entities (`habits`, `habitLogs`, `auditRecords`, `milestones`, `achievements`).
   - **Foreign-Key Decoupling Invariant:** Personal writings, reflection debriefs, and focused study hours are NEVER deleted. Associated `focusSessions`, `journalEntries`, `urgeLogs`, and `morningIntentions` have their `linkedHabitId` / `habitId` decoupled to `undefined` within the same transaction.

### C. Native Crash-Resilient Restore Engine (`AUDIT-DATA-02`)
- Replaces in-memory rollback snapshots with single native IndexedDB transactions (`db.transaction('rw', allTables, ...)`).
- Pre-transaction payload validation and preparation outside the transaction guarantees zero writes on malformed inputs.
- Single atomic replace transaction with browser-enforced ACID rollback.
- Conflict-safe merge transaction preserving existing records on compound key collisions with structured conflict diagnostics.

---

## 13. URL-Based Routing & Navigation Reliability (M10 Batch 3A)

### A. Routing Architecture (`AUDIT-ROUT-01`)
SEMNÓTĒS utilizes React Router v7 (`react-router-dom`) configured at the root level (`<BrowserRouter>` in `App.tsx`) to establish the browser URL as the immutable, authoritative single source of truth for all navigable application state:

```
┌────────────────────────────────────────────────────────┐
│                   Browser Viewport                     │
├────────────────────────────────────────────────────────┤
│ <RootErrorBoundary>                                    │
│   <BrowserRouter>                                      │
│     <AppContent>                                       │
│       ├── <AppShell> (Synchronized to useLocation())   │
│       │     ├── <Sidebar> (Desktop NavLink anchors)    │
│       │     ├── Header (Dynamic view title)            │
│       │     └── Mobile Nav (Drawer & bottom bar)       │
│       └── <Routes>                                     │
│             ├── /                 -> <CommandCenter>   │
│             ├── /streaks          -> <StreaksView>     │
│             ├── /streaks/:habitId -> <HabitDetailView> │
│             ├── /habits           -> Redirect /streaks │
│             ├── /calendar         -> <CalendarView>    │
│             ├── /journal          -> <JournalView>     │
│             ├── /analytics        -> <AnalyticsView>   │
│             ├── /focus            -> <FocusView>       │
│             ├── /milestones       -> <MilestonesView>  │
│             ├── /settings         -> <SettingsView>    │
│             ├── /data             -> Redirect /settings│
│             └── *                 -> <NotFoundView>    │
└────────────────────────────────────────────────────────┘
```

### B. Route Table & Resolution
Centralized in `src/app/routes.ts`:

| View | Primary Route | Aliases / Redirects | Description |
| :--- | :--- | :--- | :--- |
| **Command Center** | `/` | — | Sovereign overview, daily checklist, active streaks preview |
| **My Streaks** | `/streaks` | `/habits` | Independent trackers for completion, quantitative, and abstinence habits |
| **Habit Detail** | `/streaks/:habitId` | `/habits/:habitId` | Direct deep link to forensic timeline, milestones, and audit history |
| **Consistency Calendar** | `/calendar` | — | 7-column monthly grid, 52-week heatmap, day detail inspector |
| **Journal & Reflections**| `/journal` | — | Morning intentions, evening debriefs, urge diagnostics, private entries |
| **Discipline Analytics** | `/analytics` | — | Rolling 30-day algorithmic Discipline Score and trend curves |
| **Focus Mode** | `/focus` | — | Timestamp focus timer (1m–12h) and configurable Pomodoro cycles |
| **Milestones & Rewards** | `/milestones` | — | Idempotent threshold rules and reward claim ledger |
| **Settings & Storage** | `/settings` | `/data` | JSON backup/restore with ACID transactions, CSV exports, encrypted sync |
| **Path Not Found** | `*` | Any unrecognized | 404 recovery view with return actions to `/` and `/streaks` |

### C. Deep Linking & State Preservation
1. **Refresh Preservation:** Reloading any view or habit detail timeline preserves the exact view without resetting to default dashboard state.
2. **Browser Back / Forward:** Full compatibility with standard browser navigation and history stack.
3. **Database Independence:** Routing transitions and URL changes never trigger database resets or table re-instantiations.
4. **Transient Modals:** Transient creation/check-in modals remain lightweight overlays that do not pollute browser history.

### D. Static Hosting & Production SPA Fallback Configuration
Because SEMNÓTĒS is a Single Page Application (SPA) using HTML5 History API, production static hosts must rewrite all non-file asset requests to `/index.html`:
- **Vercel:** Configure `vercel.json`:
  ```json
  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
  ```
- **Netlify:** Include a `_redirects` file in `public/`:
  ```
  /*    /index.html   200
  ```
- **Nginx:** Configure `nginx.conf`:
  ```nginx
  location / {
    try_files $uri $uri/ /index.html;
  }
  ```
- **Cloudflare Pages / GitHub Pages:** Standard SPA rewrite rule or `404.html` fallback.
- **Vite Dev Server:** HTML5 history API fallback is natively built-in for local development.

---

## 14. Performance Optimization, Bundle Splitting & Runtime Efficiency (M10 Batch 3B)

### A. Architectural Code Splitting Model (`AUDIT-PERF-01`)
To ensure rapid first paint and avoid downloading the entire 1.37 MB application bundle on initial landing, SEMNÓTĒS applies a hierarchical code-splitting architecture:

1. **Eager Initial Surface:**
   - `CommandCenter` (Landing View `/`): Statically loaded for immediate zero-delay first paint.
   - Core Layout: `AppShell`, `Sidebar`, and Navigation tokens.
2. **On-Demand Secondary Views (`React.lazy` + `Suspense`):**
   - `StreaksView` (`/streaks` & `/streaks/:habitId`)
   - `CalendarView` (`/calendar`)
   - `JournalView` (`/journal`)
   - `AnalyticsView` (`/analytics`)
   - `FocusView` (`/focus`)
   - `MilestonesView` (`/milestones`)
   - `SettingsView` (`/settings`)
   - `NotFoundView` (`*`)
3. **Modal & Component-Level Deferral:**
   - `HabitFormModal`: Heavy creation form and date configuration loaded only on trigger.
   - `CheckInModal`: Check-in modal loaded only when fulfilling a habit.
   - `JournalEditor` & `JournalHistory`: Sub-tabs in Journal isolated to prevent markdown parsing from bloating the default reflection view.

### B. Vendor Chunking & Heavy Dependency Isolation
Configured via `build.rollupOptions.output.manualChunks` in `vite.config.ts`:
- **`vendor-charts` (417.79 kB raw / 112.94 kB gzip):**
  - Completely isolates `recharts`, D3 packages (`d3-shape`, `d3-scale`, `d3-interpolate`, etc.), and `victory-vendor`.
  - **100% deferred** from initial payload; loaded strictly when navigating to `/analytics`.
- **`vendor-react` (223.35 kB):** React 19 core, `react-dom`, and `scheduler`.
- **`vendor-db` (100.98 kB):** Dexie.js IndexedDB persistence layer.
- **`vendor-validation` (94.22 kB):** Zod runtime validation schema engine.
- **`vendor-icons` (44.07 kB):** Lucide React icons.
- **`vendor-router` (38.64 kB):** React Router v7 navigation engine.

### C. Measured Bundle Improvements
- **Initial Entry Script (`index.js`):** Reduced from **1,373.49 kB to 125.72 kB** (a **90.8% raw payload reduction**; 36.94 kB gzip).
- **Rollup Warnings:** Eliminated the `>500 kB` chunk warning completely. Zero production chunks exceed 420 kB.
- **Build Speed:** Production build duration improved from 22.69s to 15.72s (30.7% faster).
- **Runtime Calculations:** Memoized discipline metrics, active streak tallies, and scheduled habit maps in `CommandCenter`, preventing repetitive array filtering across tick renders.

---

## 15. Cryptographic Hardening & Envelope Architecture (M10 Batch 3C)

### A. Envelope Specification & Parameters (`AUDIT-SEC-02`)
SEMNÓTĒS utilizes client-side zero-knowledge encryption powered by the standard browser Web Crypto API (`crypto.subtle`). Backups exported with password encryption are wrapped in an authenticated cryptographic container:

```json
{
  "formatVersion": "2.0",
  "cipherAlgorithm": "AES-GCM",
  "keyLength": 256,
  "kdf": "PBKDF2",
  "kdfParams": {
    "hash": "SHA-256",
    "iterations": 600000,
    "saltLength": 16
  },
  "salt": "<base64-16-bytes>",
  "iv": "<base64-12-bytes>",
  "authTag": "<base64-16-bytes>",
  "ciphertext": "<base64-encrypted-payload>"
}
```

1. **OWASP Recommended Iterations:** The default key derivation work factor is configured to **600,000 PBKDF2 iterations** (upgraded from 100,000 in legacy v1.0).
2. **Cryptographic Primitives:**
   - Key derivation: `PBKDF2` with `HMAC-SHA-256`.
   - Symmetric cipher: `AES-GCM` with a 256-bit derived key.
   - Nonce / IV: 96-bit (12-byte) cryptographically secure pseudorandom initialization vector regenerated for every encryption run.
   - Authentication Tag: 128-bit authentication tag validating ciphertext integrity and preventing bit-flipping attacks.

### B. Backward Compatibility Matrix
- When decrypting an envelope with `formatVersion === "1.0"`, `EncryptionService.decryptPayload` automatically Derives the key using 100,000 PBKDF2 iterations.
- When decrypting an envelope with `formatVersion === "2.0"`, itDerives the key using 600,000 PBKDF2 iterations (or the exact iteration count specified in `kdfParams.iterations`).
- Any tampering with ciphertext, authentication tag, or IV triggers immediate rejection via `CryptoDecryptionError`.

---

## 16. Accessibility Architecture & Assistive Technology (M10 Final Phase)

### A. WCAG 2.1 AA Compliance Strategy (`AUDIT-A11Y-01`)
SEMNÓTĒS guarantees full parity for keyboard navigation, screen reader users, and motion-sensitive individuals across all 15 core subsystems:

1. **Semantic Landmarks & Skip Navigation:**
   - Every primary view is encapsulated in a semantic landmark (`<main id="main-content" tabIndex={-1}>`, `<nav aria-label="Application sidebar">`, `<aside aria-label="Mobile navigation">`).
   - A visible Skip-to-Content link appears at the very top of the tab order, allowing keyboard users to bypass navigation sidebars directly into main content.
2. **Accessible Dialogs & Focus Traps:**
   - `Modal.tsx` implements strict focus confinement (`aria-modal="true"`, `role="dialog"`).
   - Automatically focuses the first interactive element or close button upon opening.
   - Intercepts Tab and Shift+Tab to keep focus within the dialog.
   - Listens for Escape key presses to dismiss modals.
   - Restores keyboard focus to the opening trigger button upon dismissal.
3. **Form Association & Live Validation:**
   - All text inputs, textareas, number inputs, and selects have explicit `<label htmlFor="...">` associations.
   - Form fields include `aria-required`, `aria-invalid`, and `aria-describedby` pointing to dynamic error message containers.
   - Habit tracking types, categories, check-in options, and restore modes utilize standard `role="radiogroup"` and `role="radio"` with `aria-checked` states.
4. **Live Regions & Status Semantics:**
   - `FocusTimer` employs `role="timer"` and `role="progressbar"` with live numeric percentages (`aria-valuenow`, `aria-valuemax`).
   - Phase changes (e.g., Focus session completed -> Break started) are announced via polite live regions (`aria-live="polite"`, `role="status"`).
   - Validation failures and fatal errors are announced via assertive live regions (`role="alert"`).
5. **High-Contrast Focus Indicators & Reduced Motion:**
   - Interactive elements define a standardized, high-contrast `:focus-visible` ring (`outline: 2px solid #C5A869; outline-offset: 2px;`).
   - Global CSS respects `@media (prefers-reduced-motion: reduce)` by halting all transitions and animations, providing a calm, static experience for users with vestibular or seizure sensitivities.
6. **Automated Verification:**
   - Integrated `axe-core` and `vitest-axe` across 15 subsystem automated tests, guaranteeing 0 automated accessibility violations across all views and modals.
