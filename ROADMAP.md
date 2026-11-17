# SEMNÓTĒS — Engineering Roadmap

## Milestone Progress Overview

| Milestone | Scope | Status | Notes |
| :--- | :--- | :---: | :--- |
| **M1** | **Project Foundation** | **DONE** | Scaffolding, Obsidian & Gold design system, shell, Command Center, documentation. |
| **M2** | **Habit Management** | **DONE** | Full CRUD, Abstinence/Completion/Quantitative types, schedules, live IndexedDB. |
| **M3** | **Strict Streak Engine** | **DONE** | Deterministic calculations, strict reset logic, audit records, timezone safety. |
| **M4** | **Milestones & Rewards** | **DONE** | Custom milestone schedules, idempotent achievement detection, claim ledger. |
| **M5** | **Consistency Calendar** | **DONE** | 7-column monthly grid, 52-week heatmap, slide-over detail panel, pure aggregation engine. |
| **M6** | **Journal & Reflection** | **DONE** | Privacy-first journal, morning intention, evening debrief, urge diagnostics, prompt rotation engine. |
| **M7** | **Discipline Analytics** | Planned | Algorithmic Rolling 30-day Discipline Score, multi-series graphs, drop-off analysis. |
| **M7** | **Focus & Recovery** | Planned | Audited focus timer, session stats, setback forensics checklist. |
| **M8** | **Storage & Sync** | Planned | Dexie IndexedDB sync, JSON/CSV exports, Supabase optional sync. |
| **M9** | **Quality Assurance** | Planned | Comprehensive E2E tests, accessibility pass, production polish. |

---

## Detailed Milestone Breakdown

### M1 — Project Foundation (Completed)
- [x] Repository setup & clean folder architecture (`src/app`, `src/core`, `src/features`, `src/components`, `src/storage`).
- [x] Obsidian & Gold design tokens in Tailwind configuration (`tailwind.config.js`, `globals.css`).
- [x] Reusable design primitives (`Button`, `Card`, `Badge`, `MetricCard`, `Progress`, `Modal`).
- [x] Responsive desktop collapsible sidebar + mobile drawer + top bar.
- [x] Complete navigation routing for all 9 platform modules.
- [x] Command Center (Dashboard) with interactive preview, key metrics, and daily motto.
- [x] Foundation test suite passing via Vitest.
- [x] Technical documentation (`README.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `CHANGELOG.md`).

### M2 — Habit Management (Completed)
- [x] Habit creation and edit modal with Zod validation (`HabitFormModal`).
- [x] Support for 3 tracking types: Abstinence, Binary Completion, Quantitative (with target & constraints).
- [x] Flexible scheduling: Every day vs Selected weekdays (with bounds checking on start/end dates).
- [x] Complete habit CRUD: Create, View all, Detail view, Edit, Pause/Resume, Archive/Restore.
- [x] Confirmation dialogs for destructive/state transitions.
- [x] Real-time reactive Dexie IndexedDB live queries across Dashboard and Habit views.
- [x] Dedicated Habit Detail View with historical records table, statistics cards, and audit tracking.
- [x] Duplicate check-in prevention via compound index transactions (`[habitId+date]`).
- [x] Automated test suite covering 15 scenarios (20/20 Vitest tests passing).

### M3 — Strict Streak Engine (Completed)
- [x] Pure functional streak calculation algorithm (`StreakCalculator`).
- [x] Zero-compromise reset policy on failed or past missed days.
- [x] Permanent longest streak preservation (`longestStreakRange`).
- [x] Unscheduled day exclusion (MWF habits calculate unbroken sequences across non-scheduled days).
- [x] Paused day exclusion (scheduled days during paused intervals do not count as failures).
- [x] Today's pending check-in handling (preserves unbroken streak from yesterday without premature reset).
- [x] Forensic timeline with `Streak Impact` indicators (`+1 Increment`, `Resets to 0`, `Neutral`).
- [x] Automated test suite covering 20 streak scenarios (38/38 Vitest tests passing).

### M4 — Custom Milestones & Rewards (Completed)
- [x] Independent milestone configuration per habit (`MilestoneService`).
- [x] Unlimited positive whole-number thresholds ($T > 0$) with duplicate validation.
- [x] Custom reward title, description, category, and personal reflection note.
- [x] Pure deterministic achievement detection engine (`AchievementEngine.detectAchievementsForHabit`).
- [x] Compound achievement identity `[habitId + milestoneId + streakStartDate]` guaranteeing complete idempotency.
- [x] Strict streak reset & repeat unlock invariant: restarting a streak earns a second legitimate achievement record for the new run.
- [x] Permanent preservation of historical achievements when streaks reset or milestone definitions are modified/deleted.
- [x] Isolated reward claim workflow with notes and timestamps (`RewardService.claimReward`), never mutating streak state.
- [x] Dedicated Reward Center (`MilestonesView`) with 3 tabs: *Ready to Claim*, *Upcoming Milestones*, and *Reward Ledger*.
- [x] Habit Detail View integration with dedicated *Streak Milestones & Celebratory Rewards* card and live progress tracking.
- [x] Command Center integration with alert banner for unclaimed rewards and *Upcoming Milestones* quick preview.
- [x] Automated test suite covering 32 milestone, achievement, claim, and immutability scenarios (70/70 passing Vitest tests).

### M5 — Consistency Calendar & Discipline Heatmap (Completed)
- [x] Pure calendar aggregation engine (`CalendarAggregationService`) calculating daily adherence percentage.
- [x] Strict semantic day states (`complete`, `partial`, `failed`, `pending`, `rest`, `paused`, `future`).
- [x] Pending commitment isolation (pending check-ins on evaluation date never counted as failures).
- [x] Paused and unscheduled day exclusion from evaluated denominator.
- [x] Monthly calendar matrix with previous/next month navigation, jump to today, and micro-metrics.
- [x] 52-week contribution-style discipline heatmap in Obsidian & Gold palette with clear intensity legend.
- [x] Interactive day detail slide-over panel with adherence meter and habit-by-habit breakdown cards.
- [x] In-place check-in and audit correction modal triggers directly from calendar day details.
- [x] Multi-dimensional filters (Specific habits, Category dropdown, Tracking type, Lifecycle status pills: Active, Paused, Archived).
- [x] Monthly summary analytics cards (Total Scheduled, Completed, Missed/Failed, Average Consistency %, Best Consistency Day/Week).
- [x] Batched, indexed queries avoiding repeated cell-by-cell database access.
- [x] Automated test suite covering 26 aggregation, leap-year, filter, boundary, and audit correction scenarios (96/96 Vitest tests passing).

### M6 — Journal & Daily Reflection (Completed)
- [x] Dedicated sovereign reflection subsystem in `src/core/reflection/`, `src/core/journal/`, and `src/core/urges/`.
- [x] Daily Morning Intention Card with primary intention, key commitment, obstacle framing, and planned response.
- [x] Evening Debrief Card with wins, difficulties, lessons learned, gratitude, and tomorrow's improvements.
- [x] Pure deterministic philosophical prompt rotation engine (`reflectionPromptEngine.ts`) with 8 categories and original SEMNÓTĒS prompts.
- [x] Urge Diagnostic & Trigger Classification Service (`urgeDiagnosticService.ts`) with 1-10 intensity scale, 10 trigger categories, custom triggers, and response outcomes (`resisted`, `diverted`, `delayed`, `succumbed`, `unresolved`).
- [x] Descriptive diagnostic statistics (average intensity, top trigger percentages, response distribution, time of day slots, zero habit/streak mutation).
- [x] Private Journal Editor with Markdown support, live preview, tags, linked habit association, and self-reported emotional states.
- [x] Searchable Journal History & Archives with full-text keyword search, date-range picker, tag pills, habit filters, and pagination.
- [x] Local-first sovereign storage using Dexie IndexedDB schema v4, zero external telemetry or console leaks.
- [x] Command Center integration with reactive reflection status badges, daily quote prompt, and quick urge logger.
- [x] Automated test suite covering 33 new reflection, prompt, urge, journal, and workflow scenarios (129/129 Vitest tests passing).

### M7 — Discipline Analytics
- [ ] Algorithmic Rolling 30-day Discipline Score calculation.
- [ ] Multi-series consistency graphs.
- [ ] Habit comparison matrix and drop-off analysis.

### M8 — Focus & Recovery Protocol
- [ ] Audited focus timer with Pomodoro and custom durations.
- [ ] Session tagging linked to habits.
- [ ] Constructive Setback Forensic workflow.
- [ ] Return-to-routine somatic checklist.

### M9 — Storage & Synchronisation
- [ ] Complete database backup export (JSON) and restore (import).
- [ ] Optional client-side encrypted synchronization.

### M10 — Quality Assurance & Release Polish
- [ ] Playwright E2E verification of critical check-in and recovery flows.
- [ ] WCAG AA accessibility compliance.
- [ ] Lighthouse 95+ performance optimization.
