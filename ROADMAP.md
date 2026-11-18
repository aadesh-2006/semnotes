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
| **M7** | **Discipline Analytics** | **DONE** | Algorithmic Rolling 30-day Discipline Score, Recharts visualizations, habit performance, consistency patterns. |
| **M7.1** | **Product Alignment & Cleanup** | **DONE** | Universal discipline tracking, removed recovery analytics, date-independent weekday calculation. |
| **M8** | **Focus Mode & Custom Pomodoro** | **DONE** | Timestamp-driven focus timer (1m–12h), Pomodoro cycles, session history, analytics, Command Center. |
| **M9** | **Storage & Sync** | **DONE** | Complete JSON backup/restore, SHA-256 checksums, CSV exports, AES-256-GCM encryption, sync provider. |
| **M10** | **Quality Assurance & Polish** | **IN PROGRESS** | Phase 1 Audit done; Phase 2 Batch 1 (Security, Error Boundary, Product Alignment) completed. |

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

### M7 — Discipline Analytics (Completed)
- [x] Pure deterministic Rolling 30-Day Discipline Score engine (`DisciplineScoreEngine`).
- [x] Strict mathematical formula: $\frac{\text{Completed}}{\text{Evaluated}} \times 100$, where $\text{Evaluated} = \text{Completed} + \text{Failed} + \text{Missed}$.
- [x] Absolute exclusion of pending, paused, unscheduled rest days, and future dates from denominator.
- [x] Explicit handling of insufficient data ($0 \text{ evaluated} \implies \text{score: null}, \text{insufficient\_data}$ grade).
- [x] Adherence tier classifications: Sovereign ($\ge 90\%$), Disciplined ($75\% - 89\%$), Stable ($60\% - 74\%$), Vulnerable ($< 60\%$).
- [x] Preceding 30-day window comparison and delta calculation ($\Delta \text{score}$).
- [x] Pure local date range and rolling window utilities (`analyticsDateUtils.ts`).
- [x] Individual habit performance service respecting schedule differences (MWF vs daily) and streaks (`HabitPerformanceService`).
- [x] Category adherence performance breakdown with period deltas.
- [x] Linear sliding-window trend series aggregation for daily, weekly, and monthly intervals (`TrendAnalysisService`).
- [x] Sample-size bounded consistency patterns (strongest/weakest weekday, anchor habit, momentum/declining habit with $N \ge 5$).
- [x] Factual commitment completion and missed commitment trend tracking (`CompletedVsMissedChart`).
- [x] Obsidian & Gold Recharts visualizations (`DisciplineTrendChart`, `CompletedVsMissedChart`).
- [x] Interactive analytics filter bar with 7D, 30D, 90D, 6M, 12M presets, custom date pickers, habit and category selectors (`AnalyticsFilters`).
- [x] Command Center 5-column metrics integration with clickable 30D Discipline Score card navigating to analytics dashboard.
- [x] Automated test suite covering 25 analytics scenarios.

### M7.1 — Product Alignment & Analytics Cleanup (Completed)
- [x] Product positioning aligned as universal personal discipline & habit tracking application (academics, fitness, reading, coding, sleep, routines).
- [x] Removed recovery-specific analytics domain (`RecoveryAnalytics.tsx`, `calculateSetbackRecovery`, `SetbackRecoveryMetric`).
- [x] Generalized consistency insight and chart terminology ("Lowest Adherence Day", "Most Consistent Habit", "Completed vs Missed Commitments").
- [x] Date-independent deterministic weekday calculation across all years and leap years (`WEEKDAY_NAMES`).
- [x] Consistent empty/insufficient data states without artificial 0% or 100% inflation.
- [x] Multi-year regression tests (156/156 Vitest tests passing across 14 test suites).

### M8 — Focus Mode & Custom Pomodoro (Completed)
- [x] Pure deterministic timestamp-based focus timer engine (`FocusTimerEngine`).
- [x] Unrestricted custom focus durations (1 minute to 12 hours / 720 minutes) without forced breaks.
- [x] Support for uninterrupted 3-hour marathon sessions and customizable presets (15m, 25m, 50m, 90m, 120m, 180m).
- [x] Configurable Pomodoro cycles with short/long break state machine (`PomodoroEngine`).
- [x] Manual and automatic phase transitions, plus break skipping capability.
- [x] Persistent timer state and background reconciliation across tab switches, sleep, and refreshes (`FocusPersistenceService`).
- [x] Offline synthesized Web Audio API 3-tone harmonic completion chime and desktop notifications (`FocusNotificationService`).
- [x] Persistent focus session history and query service in Dexie IndexedDB v5 (`FocusSessionService`).
- [x] Optional habit linking and intention notes with complete data isolation.
- [x] Strict invariant: Focus sessions NEVER automatically complete habits or mutate streaks/scores.
- [x] Pure focus time analytics engine calculating total focused hours, daily output, and habit distributions (`FocusAnalyticsService`).
- [x] Command Center integration with active timer preview and daily focus output metrics.
- [x] Full test suite (187/187 tests passing across 19 test suites).

### M9 — Data Management, Backup, Restore & Encrypted Sync (Completed)
- [x] Complete database backup export (JSON v1.0) extracting all 11 Dexie tables + user preferences with SHA-256 integrity checksum (`BackupExportService`, `BackupIntegrityService`).
- [x] Pre-import backup validation service checking JSON syntax, application compatibility, version support, checksums, Zod table schemas, ID uniqueness, and foreign-key reference integrity (`BackupValidationService`).
- [x] Safe restore transaction engine with Mode 1 (Replace) featuring in-memory safety snapshot rollback on error, and Mode 2 (Merge) with deduplication across primary and compound keys (`RestoreTransactionService`).
- [x] Category-specific CSV exports compliant with RFC 4180 and UTF-8 BOM for Habits, Check-Ins, Focus Sessions, Milestones/Rewards, and Reflections (`CsvExportService`).
- [x] Client-side zero-knowledge encryption using Web Crypto API PBKDF2 (100,000 iterations, SHA-256, 16-byte salt, 12-byte IV) and AES-256-GCM (`EncryptionService`).
- [x] Synchronization provider abstraction with `MockCloudSyncProvider` (sandbox simulation) and `SupabaseSyncProvider` adapter skeleton (`SyncProvider`).
- [x] Conflict detection and interactive resolution strategies (`useRemote`, `useLocal`, `merge`) in `SyncService`.
- [x] Full-featured Sovereign Data Management workspace in Settings (`BackupExportPanel`, `BackupRestorePanel`, `BackupValidationModal`, `CSVExportPanel`, `SyncSettingsPanel`, `DataManagementView`).
- [x] Comprehensive automated test suite with 35 new tests across 5 test suites (222/222 passing platform-wide).

### M10 — Quality Assurance & Release Polish (In Progress)
#### Phase 1: Comprehensive Engineering Audit (Completed)
- [x] Read-only audit across 12 engineering dimensions documented in `M10_AUDIT_REPORT.md`.
- [x] Identification and risk assessment of findings `AUDIT-SEC-01` through `AUDIT-DEP-01`.

#### Phase 2: Remediation Batches
- [x] **Batch 1: Security Hardening, Root Error Boundary & Product Alignment (Completed)**
  - [x] `AUDIT-SEC-01`: Upgraded runtime Zod dependency to `4.6.7` eliminating high-severity advisory GHSA-mrhx-c7xc-m3w5.
  - [x] `AUDIT-SEC-01`: Enforced `tinypool: ^2.2.0` dependency override eliminating critical vulnerabilities GHSA-5gmw-xhrv-c9v3 and GHSA-85c8-ppgw-ccpr.
  - [x] `AUDIT-ARCH-01`: Implemented resilient root-level React Error Boundary (`RootErrorBoundary.tsx`) wrapping `<App />` with Obsidian & Gold fallback UI, safe application reload, collapsible technical stack trace, and non-destructive emergency database backup export via `BackupExportService`.
  - [x] `AUDIT-PROD-01`: Fully aligned application architecture with universal discipline vision by removing obsolete Recovery Protocol route (`recovery`), navigation entries in `routes.ts` & `App.tsx`, and `RecoveryView.tsx`.
  - [x] Platform test suite expanded to 234 passing tests across 27 test files (100% pass rate).
- [ ] **Batch 2: Integrity & State Remediation (Upcoming)**
  - [ ] `AUDIT-DATA-01`: Transactional cascading deletion for habit references.
  - [ ] `AUDIT-DATA-02`: Streaming / chunked restore for massive JSON backups.
  - [ ] `AUDIT-ROUT-01`: Hash-based SPA routing for refresh stability.
- [ ] **Batch 3: Performance, Cryptography & Tooling (Upcoming)**
  - [ ] `AUDIT-PERF-01`: Route-level dynamic code splitting for bundle optimization.
  - [ ] `AUDIT-SEC-02`: Configurable PBKDF2 iterations for low-spec device safety.
  - [ ] `AUDIT-DEP-01` & `AUDIT-TEST-02`: Vitest v8 coverage tooling setup.
- [ ] **Batch 4: Accessibility, Release Verification & Polish (Upcoming)**
  - [ ] `AUDIT-A11Y-01`: Comprehensive WCAG 2.1 AA keyboard navigation, aria labels, and contrast audit.
  - [ ] End-to-end user journey verification and production release readiness signoff.
