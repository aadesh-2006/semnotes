# Changelog

All notable changes to **SEMNÓTĒS** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-11-18 (SEMNÓTĒS v1.0 Production Release & M10 Final Hardening)

### Accessibility (`AUDIT-A11Y-01`)
- **WCAG 2.1 AA Keyboard Navigation & Focus Management:**
  - Added visible, high-contrast Skip-to-Content link as the first focusable DOM element, targeting `<main id="main-content" tabIndex={-1}>`.
  - Implemented keyboard focus trap inside `Modal` and mobile navigation drawer, cycling focus seamlessly with Tab/Shift+Tab and restoring focus to the trigger element upon dismissal.
  - Implemented Escape key listeners across all modals and side-drawer navigation overlays.
- **Form Controls & ARIA Associations:**
  - Explicitly paired all form inputs, textareas, and selects with accessible `<label>` elements via `htmlFor` and unique element IDs.
  - Added `aria-required`, `aria-invalid`, and `aria-describedby` error bindings across `HabitFormModal`, `CheckInModal`, `MilestoneFormModal`, `ClaimRewardModal`, `FocusSessionSetup`, and `JournalView`.
  - Transformed habit tracking type selectors, habit category pickers, check-in status options, and backup restore modes into standard accessible radio groups (`role="radiogroup"`, `role="radio"`, `aria-checked`).
- **Screen Reader Announcements & Status Regions:**
  - Added `role="timer"` and `role="progressbar"` semantics with `aria-valuenow` / `aria-valuemax` to `FocusTimer`.
  - Added polite live announcement regions (`aria-live="polite"`, `role="status"`) for timer phase changes (Focus/Break transitions) and file dropzone state feedback.
  - Added assertive error alerts (`role="alert"`) for validation failures and backup parsing issues.
- **Visual Focus & Vestibular Sensitivity:**
  - Enforced high-contrast gold focus indicators (`:focus-visible` with 2px solid `#C5A869` and 2px offset) across buttons, links, inputs, and custom controls in `globals.css`.
  - Added universal `@media (prefers-reduced-motion: reduce)` overrides silencing all CSS transitions, pulse animations, and transform delays.
- **Automated Accessibility Verification (`src/test/accessibilityAutomatedWCAG.test.tsx`):**
  - Integrated `vitest-axe` and `axe-core` to verify all 15 core views and modals. Zero automated accessibility violations across all subsystems.

### Cryptography & Security (`AUDIT-SEC-02`, `AUDIT-SEC-01`)
- **600,000 PBKDF2 Iteration Hardening:**
  - Upgraded default key derivation work factor from 100,000 to 600,000 PBKDF2 iterations using SHA-256 and Web Crypto API, aligning with current OWASP password storage and key derivation standards.
  - Introduced versioned cryptographic container envelopes (`formatVersion: '2.0'`) specifying algorithm, key derivation function, iterations, and 128-bit salt.
- **Zero-Regret Backward Compatibility:**
  - Decryption engine detects legacy `1.0` envelopes and automatically derives keys using 100,000 iterations, guaranteeing users can restore older encrypted backups without manual migration.
- **Production Supply-Chain Audit:**
  - Verified `npm audit --omit=dev` reports exactly 0 vulnerabilities in the production runtime.

### Data Integrity & Reliability (`AUDIT-DATA-01`, `AUDIT-DATA-02`)
- **Unified Release Verification Suite (`src/test/dataIntegrityReleaseVerification.test.ts`):**
  - Added end-to-end regression tests verifying all 17 critical data scenarios: soft deletion tombstones, restoration to active status, explicit permanent purge with reflection/focus foreign key decoupling, complete 11-table export coverage with valid SHA-256 signatures, unencrypted/100k/600k restore compatibility, atomic Replace restore, safe Merge restore with conflict resolution, and invalid payload pre-rejection.
- **Single Page Application Fallback:**
  - Added `public/_redirects` and `vercel.json` rewrite configurations ensuring static production hosts (Netlify, Vercel, Cloudflare Pages, Nginx) route all deep links to `index.html`.

### Testing Infrastructure & Metrics (`AUDIT-DEP-01`, `AUDIT-TEST-02`)
- **Test Coverage Tooling:**
  - Configured `@vitest/coverage-v8` with `npm run test:coverage` generating comprehensive file-by-file coverage reports.
  - Achieved **354/354 passing tests across 36 test files (100% pass rate)**.
- **TypeScript Strict Compliance:**
  - Resolved all strict type definitions across tests and production components; `npx tsc -b` passes with 0 errors.

---

## [1.0.0-rc.4] — 2026-11-18 (Milestone 10 Phase 2, Batch 3B: Performance Optimization, Bundle Reduction & Runtime Efficiency)

### Performance & Bundle Optimizations (`AUDIT-PERF-01`)
- **Route-Level Code Splitting (`src/App.tsx`):**
  - Converted secondary module views (`StreaksView`, `CalendarView`, `JournalView`, `AnalyticsView`, `FocusView`, `MilestonesView`, `SettingsView`, and `NotFoundView`) into on-demand dynamic imports (`React.lazy()`).
  - Preserved eager loading for `CommandCenter` to guarantee immediate zero-delay first paint for the application landing route (`/`).
  - Reduced main entry script size from **1,373.49 kB down to 125.72 kB** (a **90.8% raw payload reduction**; 36.94 kB gzipped).
- **Obsidian & Gold Suspense Loading Fallback (`src/components/feedback/RouteLoadingFallback.tsx`):**
  - Implemented an accessible, zero-layout-shift loading indicator featuring ambient gold glowing compass insignia and polite status messaging (`role="status"`, `aria-live="polite"`).
  - Respects user accessibility preferences (`motion-reduce:animate-none`).
- **Heavy Visualization Vendor Isolation (`vite.config.ts`):**
  - Isolated `recharts`, D3 formatting/scaling utilities, and vendor libraries into a dedicated on-demand `vendor-charts` chunk (417.79 kB raw / 112.94 kB gzip).
  - Heavy charting libraries are completely eliminated from initial application download and fetched strictly when `/analytics` is navigated to.
- **Granular Vendor Chunking (`vite.config.ts`):**
  - Configured Rollup `manualChunks` isolating `vendor-react` (React 19 / DOM runtime), `vendor-router` (React Router v7), `vendor-db` (Dexie.js), `vendor-validation` (Zod), and `vendor-icons` (Lucide React).
  - Completely eliminated Rollup `>500 kB` chunk size warning across the entire production build (largest single chunk is 417 kB on-demand).
  - Accelerated production build duration from 22.69s down to 15.72s (30.7% faster build).
- **Sub-Route & Modal On-Demand Isolation:**
  - `JournalView`: Isolated `JournalEditor` (markdown editor) and `JournalHistory` (archive) into lazy sub-chunks, speeding up default reflection tab rendering.
  - `CommandCenter`: Converted `HabitFormModal` and `CheckInModal` to lazy on-demand components, preventing modal code from polluting the landing view.
- **Runtime Memoization:**
  - Memoized today's discipline metrics, active streak aggregates, and scheduled habit counts in `CommandCenter.tsx`, eliminating redundant array iterations across re-renders.
- **Automated Performance Test Suite (`src/test/lazyRouteLoading.test.tsx`):**
  - Added 11 automated tests covering Suspense fallback rendering, immediate root route resolution, on-demand secondary view resolution, and error recovery.
  - Platform-wide test count expanded to 281/281 passing tests across 31 test suites.

---

## [1.0.0-rc.3] — 2026-11-18 (Milestone 10 Phase 2, Batch 3A: URL-Based Routing & Navigation Reliability)

### Added
- **Centralized Application Route Configuration (`src/app/routes.ts`):**
  - Integrated `react-router-dom` (v7) establishing the browser URL as the immutable single source of truth for application view state.
  - Defined centralized `APP_ROUTES` dictionary and enriched `RouteConfig` with standard root paths:
    - `/` -> Command Center (`dashboard`)
    - `/streaks` -> My Streaks & Habit Architecture (`streaks`)
    - `/habits` -> Alias redirecting to `/streaks`
    - `/streaks/:habitId` -> Direct deep link to individual habit detail timeline and milestones
    - `/habits/:habitId` -> Alias redirecting to `/streaks/:habitId`
    - `/calendar` -> Consistency Calendar & Heatmap (`calendar`)
    - `/journal` -> Sovereign Journal & Reflection Subsystem (`journal`)
    - `/analytics` -> 30-Day Rolling Discipline Score & Metrics (`analytics`)
    - `/focus` -> Timestamp Focus Timer & Pomodoro Engine (`focus`)
    - `/milestones` -> Milestones & Reward Center (`milestones`)
    - `/settings` -> Settings & Sovereign Data Management (`settings`)
    - `/data` -> Alias redirecting to `/settings`
  - Added pure route resolution utilities: `getRouteIdFromPathname`, `getPathForRoute`, and `isKnownRoutePath`.
- **Obsidian & Gold 404 Not Found Experience (`src/features/not-found/NotFoundView.tsx`):**
  - Dedicated solemn fallback view catching all unrecognized URL coordinates (`path="*"`) without blank screens or unhandled exceptions.
  - Displays unrecognized path string, compass insignia, and direct return actions to Command Center (`/`) and My Streaks (`/streaks`).
- **Synchronized Navigation Primitives (`src/app/Sidebar.tsx` & `src/app/AppShell.tsx`):**
  - Desktop Sidebar and Mobile Navigation derive active highlighting dynamically from `useLocation().pathname`.
  - Upgraded navigation elements to semantic `<nav>` containers with `<NavLink>` components providing standard `href` anchors, keyboard accessibility, and `aria-current="page"` attributes.
  - Seamless support for browser Back and Forward history navigation.
  - Complete route preservation on browser refresh or direct URL entry.
- **Deep-Linked Habit Detail Timeline (`src/features/streaks/StreaksView.tsx`):**
  - Reads `:habitId` from URL parameters, rendering the forensic timeline directly on deep navigation or page refresh.
  - Calendar Day Detail panel seamlessly opens `/streaks/:habitId`.
- **Automated Routing Test Suite (`src/test/navigationRouting.test.tsx`):**
  - 19 automated tests verifying route mappings, direct URL rendering, alias redirects, parameter extraction, 404 error rendering, browser history, and IndexedDB state preservation across navigation.
  - Platform-wide test count expanded to 270/270 passing tests across 30 test suites.

---

## [1.0.0-rc.2] — 2026-11-18 (Milestone 10 Phase 2, Batch 2: Database Integrity, Historical Preservation & Restore Safety)

### Added
- **Dexie Schema v6 Migration (`src/storage/db/index.ts`):**
  - Upgraded IndexedDB schema to Version 6 adding the `deletedAt` index on the `habits` table (`id, name, trackingType, status, deletedAt, createdAt, updatedAt`).
  - Added deterministic schema upgrade migrating existing habits to include `deletedAt: undefined`.
  - Updated `CURRENT_DB_VERSION = 6` in `backupTypes.ts`.
- **Historical Data Preservation on Habit Deletion (`AUDIT-DATA-01`):**
  - **Normal Habit Deletion (Default):** `HabitService.deleteHabit(id, { purgeHistory: false })` marks the habit with `status = 'deleted'` and `deletedAt = timestamp`.
  - Soft-deleted habits are filtered out of active habit listings (`HabitService.getAllHabits`, `StreaksView`, `CommandCenter`) while preserving all historical records: `habitLogs`, `auditRecords`, `milestones`, `achievements`, `focusSessions`, `journalEntries`, and `urgeLogs`.
  - Consistency Calendar preserves past evaluation dates prior to `deletedAt` via `calendarAggregationService.ts`.
  - Added `HabitService.restoreDeletedHabit(id)` to restore soft-deleted habits back to active or paused state.
- **Explicit Transactional History Purge (`AUDIT-DATA-01`):**
  - `HabitService.purgeHabitHistory(id)` enables explicit, permanent removal of a habit and its strictly habit-dependent records (`habits`, `habitLogs`, `auditRecords`, `milestones`, `achievements`) within a single ACID transaction.
  - **Data Invariant Protection (Decoupling):** User-authored personal reflections and focused work hours (`focusSessions`, `journalEntries`, `urgeLogs`, `morningIntentions`) are strictly preserved by decoupling their foreign keys (`linkedHabitId = undefined`, `habitId = undefined`), ensuring personal history and user hours are never deleted.
- **Native Atomic IndexedDB Restore Transactions (`AUDIT-DATA-02`):**
  - Completely redesigned `RestoreTransactionService` to eliminate volatile in-memory safety snapshot rollbacks.
  - **Pre-Transaction Validation & Preparation:** `validateAndPrepare` validates all payloads against Zod schemas and prepares in-memory records outside any transaction, failing fast on malformed data before touching tables.
  - **Single Atomic Transaction for Replace:** Executes `db.transaction('rw', allTables, ...)` clearing existing records and populating all 11 tables atomically. Any unexpected write fault triggers browser-native IndexedDB ACID rollback.
  - **Conflict-Safe Merge Restore:** Single atomic transaction merging backup records with local data, preserving local records on compound key collisions (`[habitId+date]`, `[habitId+thresholdDays]`) and reporting detailed conflict diagnostics via `MergeConflictDetail[]`.
- **Comprehensive Automated Test Suites:**
  - `src/test/habitDeletionIntegrity.test.ts`: 9 comprehensive tests covering normal deletion, restoration, explicit purge, decoupling of focus/journal/urges, independent habit isolation, idempotent deletion, analytics consistency, restore of deleted habit backup, and transaction rollback.
  - `src/test/restoreSafety.test.ts`: 8 tests covering invalid payload pre-rejection, atomic rollback on write error, empty database restore, 1,000+ record high-volume restore, merge deduplication, conflict reporting, and complete 11-table coverage.
  - Platform test suite now passes 100% with 251 tests across 29 test suites.

---

## [1.0.0-rc.1] — 2026-11-18 (Milestone 10 Phase 2, Batch 1: Security Hardening, Root Error Boundary & Product Alignment)

### Added
- **Resilient Root-Level React Error Boundary (`src/components/errors/RootErrorBoundary.tsx`):**
  - Robust React class component error boundary implementing `getDerivedStateFromError` and `componentDidCatch`.
  - Wraps root `<App />` component in `src/main.tsx` to prevent unrecoverable blank screen disruptions during rendering faults.
  - Custom Obsidian & Gold fallback UI with ambient gold gradient bar, alert insignia, clear disturbance explanation, and zero data-loss reassurance.
  - **Sovereign Emergency Database Export**: Embedded non-destructive export button directly generating and downloading a full database backup via `BackupExportService` without requiring user reload or navigation.
  - Collapsible sanitized technical disturbance details exposing ISO timestamp, error name, message, stack trace, and component stack trace while strictly guaranteeing zero leakage of private reflections or journal notes.
  - Unit and integration test suite (`src/components/errors/RootErrorBoundary.test.tsx`) covering normal child rendering, error catching, fallback display, reload triggers, technical details toggling, successful emergency export, and graceful error handling.

### Security & Dependency Hardening
- **Resolved Runtime & Tooling Vulnerabilities (`AUDIT-SEC-01`):**
  - Upgraded runtime schema validation dependency `zod` to `^4.6.7`, completely resolving high-severity advisory GHSA-mrhx-c7xc-m3w5 (uncontrolled resource consumption via unconstrained collections).
  - Enforced `tinypool: ^2.2.0` dependency override in `package.json`, completely eliminating two critical-severity remote execution vulnerabilities (GHSA-5gmw-xhrv-c9v3 and GHSA-85c8-ppgw-ccpr).
  - Reduced total reported dependency vulnerabilities from 15 to 13 (0 critical, remaining 12 high in `picomatch` are build/dev tooling without upstream fix available, 1 moderate in dev `@vitest/mocker`).

### Changed & Removed (Product Alignment)
- **Universal Discipline Architecture Alignment (`AUDIT-PROD-01`):**
  - Completely purged obsolete Recovery Protocol route (`recovery`) from `src/app/routes.ts` and view rendering switch in `src/App.tsx`.
  - Deleted legacy recovery interface `src/features/recovery/RecoveryView.tsx`.
  - Cleaned up navigation bar down to the 8 approved general-purpose discipline routes (`dashboard`, `streaks`, `calendar`, `journal`, `analytics`, `focus`, `milestones`, `settings`).
  - Added dedicated regression test suite (`src/test/productAlignmentBatch1.test.ts`) affirming route structure, general-purpose discipline positioning, and preservation of all 3 habit types (`completion`, `abstinence`, `quantitative`) and urge diagnostics.

---

## [1.0.0-alpha.9] — 2026-11-18 (Milestone 9: Data Management, Backup, Restore & Optional Encrypted Sync)

### Added
- **Complete Database Backup Export System:**
  - `BackupExportService`: Extracts records from all 11 Dexie IndexedDB v5 tables (`habits`, `habitLogs`, `auditRecords`, `milestones`, `achievements`, `journalEntries`, `urgeLogs`, `morningIntentions`, `eveningDebriefs`, `focusSessions`, `userSettings`) and Focus preferences.
  - `BackupIntegrityService`: Deterministic key-canonicalized JSON serialization and SHA-256 cryptographic checksum calculation using native Web Crypto API.
  - Manifest includes `app: 'semnotes'`, `backupVersion: '1.0'`, `dbVersion: 5`, ISO 8601 timestamps, table record counts, and data checksum.
- **Pre-Import Backup Validation Service:**
  - `BackupValidationService`: Multi-stage pre-import verification ensuring corrupted or invalid data never touches IndexedDB:
    1. Syntax checking and JSON structure.
    2. Application identifier and major version compatibility.
    3. Cryptographic SHA-256 data checksum verification.
    4. Table-by-table schema validation using Zod.
    5. Primary key ID uniqueness enforcement.
    6. Foreign-key-like reference integrity auditing (e.g. `habitId` references in logs, focus sessions, journal entries, and milestones).
  - Produces structured `BackupValidationReport` detailing validity, errors, warnings, and issue counts.
- **Safe Transactional Restore Engine:**
  - `RestoreTransactionService`:
    - **In-Memory Safety Snapshot**: Captures a complete database snapshot before any restore operation, guaranteeing zero data loss via atomic rollback if write operations fail.
    - **Mode 1: Replace**: Atomically purges existing tables and restores backup records with rollback protection.
    - **Mode 2: Merge**: Additive restoration preserving existing local records. Deduplicates by ID, compound keys (`[habitId+date]`, `[habitId+thresholdDays]`), and unique dates (intentions/debriefs).
- **RFC 4180 Compliant Category-Specific CSV Exports:**
  - `CsvExportService`: Export clean spreadsheets for Habits, Check-Ins, Focus Sessions, Milestones/Rewards, and Intentions & Reflections.
  - Standard RFC 4180 quote escaping (`""`), newline handling, and UTF-8 Byte Order Mark (`\uFEFF`) for seamless display in Microsoft Excel, Google Sheets, and Apple Numbers.
- **Client-Side Zero-Knowledge Encryption:**
  - `EncryptionService`: Military-grade Web Crypto API AES-256-GCM authenticated encryption paired with PBKDF2 key derivation (100,000 iterations of SHA-256, 16-byte cryptographically random salt, 12-byte random IV).
  - Plaintext and passwords never touch storage or logs. Strict rejection on wrong passwords (`CryptoDecryptionError`) or tampered ciphertexts.
- **Synchronization Provider Abstraction & Conflict Engine:**
  - `SyncProvider` interface decoupling sync logic from cloud storage implementations.
  - `MockCloudSyncProvider`: In-memory remote simulation provider supporting multi-device emulation, latency simulation, and network failure testing.
  - `SupabaseSyncProvider`: Production adapter skeleton for cloud databases or buckets.
  - `SyncService`: Manages encrypted sync cycles, version tracking, conflict detection (`remoteVersion > localVersion`), and three interactive resolution strategies: `useRemote`, `useLocal`, and `merge`.
- **Sovereign Data Management Workspace in Settings:**
  - `DataManagementView`: Tabbed layout hosting `BackupExportPanel`, `BackupRestorePanel`, `BackupValidationModal`, `CSVExportPanel`, and `SyncSettingsPanel`.
  - Live table record counters, password-protected export options, drag-and-drop file upload, interactive validation reports, mode selection, and conflict resolution dialogs.
- **Automated Test Suite Expansion:**
  - Added 35 comprehensive unit and workflow integration tests across `backupExportValidation.test.ts`, `restoreService.test.ts`, `csvExportService.test.ts`, `encryptionService.test.ts`, `syncService.test.ts`, and `dataManagementWorkflow.test.ts`.
  - Platform-wide test suite passes 100% (222/222 tests passing across 25 test suites).

---

## [1.0.0-alpha.8] — 2026-11-18 (Milestone 8: Focus Mode & Custom Pomodoro Engine)

### Added
- **Deterministic Timestamp-Based Focus Timer Engine:**
  - `FocusTimerEngine`: Absolute source-of-truth mathematical timekeeping using `(now - startTimestamp - accumulatedPausedMs)`, completely eliminating reliance on JavaScript `setInterval` counter ticks.
  - Complete accuracy across inactive browser tabs, device sleep, background throttling, and page refreshes.
  - Full timer controls: Start, Pause, Resume, Reset, Finish, End Early (Interrupted), and Cancel with confirmation modal.
  - Digital monospace clock formatter and human-readable duration strings.
- **Unrestricted Custom Focus Durations:**
  - `DurationSelector`: Precise custom duration input supporting 1 minute to 12 hours (720 minutes).
  - Built-in shortcuts for 15m, 25m, 50m, 90m, 120m, and 180m marathon sessions.
  - Guaranteed single uninterrupted continuous focus sessions without forced breaks or automatic cycle splitting.
- **Configurable Pomodoro Cycle State Machine:**
  - `PomodoroEngine`: State machine supporting configurable focus duration, short break duration, long break duration, and cycles before long break.
  - Supports automatic or manual phase transitions, plus break skipping capability.
  - **Break Time Isolation Guarantee:** Break time is strictly isolated in `breakDurationSeconds` and is NEVER credited towards focused work duration.
- **Persistent Timer State & Background Recovery:**
  - `FocusPersistenceService`: Automatically serializes live timer state to `localStorage`. Reconciles time against wall-clock time on page reload, window focus, or visibility change.
  - Automatically identifies abandoned sessions left unattended for over 24 hours.
- **Offline Audio Chimes & Browser Notifications:**
  - `FocusNotificationService`: Web Audio API synthesized soothing 3-tone harmonic chime (C5-E5-G5 with exponential decay) requiring zero external audio assets.
  - HTML5 Desktop Notifications with graceful permission checks and fallbacks.
- **Focus Session History & IndexedDB v5 Migration:**
  - Upgraded Dexie `semnotes_db` to version 5, adding indexed fields: `'id, habitId, linkedHabitId, startedAt, status, sessionMode, date, createdAt'`.
  - `FocusSessionService`: Full persistence CRUD supporting `completed`, `interrupted`, `cancelled`, and `abandoned` statuses.
  - **Zero Habit & Streak Mutation Guarantee:** Completing a focus session NEVER creates habit logs, checks in habits, or modifies streaks/discipline scores.
- **Focus Analytics Dashboard:**
  - `FocusAnalyticsService` & `FocusAnalytics`: Pure deterministic calculations for total focused hours, completed sessions count, average session duration, longest session, daily focus outputs, habit focus distribution, and activity title breakdown.
- **Command Center Live Integration:**
  - Added dedicated *Focus & Deep Work* card to the Command Center overview with active timer status indicator, remaining time display, "Return to Active Session" shortcut, and today's focused time metrics.
- **Comprehensive Automated Test Suite:**
  - Added 31 unit and end-to-end integration tests across `focusTimerEngine.test.ts`, `pomodoroEngine.test.ts`, `focusSessionService.test.ts`, `focusAnalyticsService.test.ts`, and `focusWorkflow.test.ts`.
  - Total passing automated test suite platform-wide: 187/187 tests passing across 19 test suites.

---

## [1.0.0-alpha.7.1] — 2026-11-18 (Milestone 7.1: Product Alignment & Analytics Cleanup)

### Changed
- **Universal Product Positioning:** Aligned product documentation and copy across SEMNÓTĒS as a general-purpose discipline and habit tracking platform (academics, fitness, reading, coding, sleep, routines).
- **Generalized Analytics Terminology:**
  - Replaced recovery-oriented titles with factual, neutral commitment terminology.
  - "Lowest Adherence Day" replacing "Highest Resistance Day".
  - "Most Consistent Habit" replacing "Anchor Habit".
  - "Completed vs Missed Commitments" replacing "Fulfillment vs Friction".
  - Clarified analytics empty states and privacy disclaimers: *"All analytics calculations run locally in your browser. Private journal entries and personal reflections are never included in analytics calculations."*
- **Date-Independent Weekday Calculations:**
  - Replaced arbitrary date generation in weekday aggregation with a static `WEEKDAY_NAMES` table mapped to JavaScript `getDay()` indexes (0–6), preventing calendar drift across years and leap years.

### Removed
- **Recovery Analytics Subsystem:**
  - Removed `RecoveryAnalytics.tsx` component and associated metrics (`SetbackRecoveryMetric`, `calculateSetbackRecovery`).
  - Removed recovery center from project roadmap to maintain universal discipline scope.

### Fixed
- **Empty & Insufficient Data State Handling:**
  - Guaranteed no artificial 0% or 100% percentages appear when evaluated denominators are zero across all analytics panels.

### Tested
- Added multi-year and leap-year regression tests (2024, 2025, 2026, 2027) and zero-denominator safety tests. 156/156 Vitest tests passing across 14 test suites.

---

## [1.0.0-alpha.7] — 2026-11-17 (Milestone 7: Discipline Analytics & Rolling 30-Day Score)

### Added
- **Rolling 30-Day Discipline Score Engine:**
  - Dedicated analytical engine in `src/core/analytics/disciplineScoreEngine.ts`:
    - Pure mathematical formula: $\text{Discipline Score} = \frac{\text{Completed}}{\text{Evaluated}} \times 100$ where $\text{Evaluated} = \text{Completed} + \text{Failed} + \text{Missed}$.
    - Zero vanity metric guarantee: strictly excludes pending commitments on evaluation date, paused intervals, unscheduled rest days, and future dates from denominator.
    - Deterministic handling of insufficient data: returns explicit `score: null` and `hasSufficientData: false` when evaluated count is zero, preventing fabricated percentages.
    - Preceding 30-day window comparison with delta indicator ($\Delta \text{score}$).
    - Adherence tier classifications: *Sovereign* ($\ge 90\%$), *Disciplined* ($75\% - 89\%$), *Stable* ($60\% - 74\%$), *Vulnerable* ($< 60\%$).
- **Habit & Category Performance Analytics:**
  - `HabitPerformanceService`: Calculates scheduled count, evaluated count, fulfillment %, current and longest streaks, and period delta per habit, respecting individual schedules (e.g. MWF vs daily).
  - Categorical adherence breakdown aggregating fulfillment rates and period changes across life domains.
- **Historical Trends & Visualizations:**
  - `TrendAnalysisService`: Linear sliding-window algorithm aggregating daily, weekly, and monthly adherence series for Recharts without $O(N \times 30)$ nested array allocations.
  - `DisciplineTrendChart`: Dual-curve area and line visualization in Obsidian & Gold with interactive daily/weekly/monthly granularity toggling.
  - `CompletedVsMissedChart`: Visual bar chart comparing fulfilled commitments against friction points (failed/missed).
- **Consistency Patterns & Setback Recovery:**
  - `ConsistencyInsightsService`: Sample-size bounded observations ($N \ge 5$) detecting strongest/weakest weekdays, anchor habits, and momentum habits without psychological jargon.
  - `RecoveryAnalytics`: Next-day recovery rate metric measuring resilience following slips, reinforcing that a slip is data rather than defeat.
- **Interactive Analytics Filter Bar:**
  - `AnalyticsFilters`: Time presets (7D, 30D, 90D, 6M, 12M, Custom), date range pickers, habit selector, category selector, and reset controls.
- **Command Center Live Integration:**
  - 5th metric card displaying the live 30-day Discipline Score, adherence tier badge, and period delta, linking directly to the full analytics dashboard.
- **Automated Test Suite:**
  - Added 25 unit and end-to-end integration tests (`disciplineScoreEngine.test.ts`, `habitPerformanceService.test.ts`, `trendAndInsights.test.ts`, `analyticsWorkflow.test.ts`), bringing total passing tests to 154/154 across 14 test suites.

---

## [1.0.0-alpha.6] — 2026-11-17 (Milestone 6: Journal & Daily Reflection)

### Added
- **Privacy-First Reflection Subsystem:**
  - Dedicated architecture spanning `src/core/reflection/`, `src/core/journal/`, and `src/core/urges/`:
    - `ReflectionService`: Enforces one primary morning intention and evening debrief per calendar date, allowing updates and partial saves while maintaining data integrity.
    - `JournalService`: Complete CRUD, search, and filtering service for private sovereign reflections with tags, linked habit associations, and self-reported emotional states.
    - `UrgeDiagnosticService`: Pure descriptive diagnostic calculations (average intensity, highest/lowest, top triggers, response strategies, time-of-day slots) strictly isolated from habit streaks.
- **Deterministic Prompt Rotation Engine:**
  - `reflectionPromptEngine.ts` containing 24+ original SEMNÓTĒS prompts across 8 philosophical categories (`discipline`, `self_respect`, `gratitude`, `focus`, `growth`, `resilience`, `accountability`, `recovery`).
  - Pure date hashing (`hashDateString`) and deterministic skip offsets without system-clock dependencies or external network requirements.
  - Paired morning orientation and evening debrief prompt generation.
- **Urge Tracking & Trigger Diagnostics:**
  - Obsidian & Gold `UrgeSlider` (1–10 scale) with dynamic color ramps and tension labels.
  - Interactive `TriggerSelector` with preset categories (`boredom`, `stress`, `loneliness`, `fatigue`, `anxiety`, `procrastination`, `environmental`, `social_media`, `habitual_routine`, `other`) and custom trigger context.
  - Response strategies (`resisted`, `diverted`, `delayed`, `succumbed`, `unresolved`) and optional linked habit correlation.
  - Strict domain invariant: Urges never create habit logs, alter streaks, or generate setbacks.
- **Sovereign Journal Editor & Archives UI:**
  - `JournalEditor`: Dual Write / Preview tabs with lightweight Markdown parsing, title, calendar date selection, tag management, linked habit dropdown, self-reported mood (1-5), and emotional state selector (`calm`, `focused`, `energized`, `victorious`, `reflective`, `neutral`, `anxious`, `fatigued`, `frustrated`).
  - `JournalHistory`: Chronological timeline with full-text search, date ranges, multi-tag filter pills, linked habit filter, archive toggling, and pagination.
  - `JournalView`: Tabbed reflection workspace with Daily Reflection, Private Journal, Urge Diagnostics, and Archives tabs.
- **Command Center Integration:**
  - Live reactive reflection status indicator (AM / PM completion badges).
  - Authentic rotating philosophical prompt banner.
  - Quick action links for setting morning intentions, completing evening debriefs, and emergency urge logging.
  - Zero private text or sensitive urge logs exposed on the Command Center overview.
- **Database Schema v4 Migration:**
  - Added indexes in Dexie `semnotes_db` v4:
    - `journalEntries`: `'id, date, isArchived, linkedHabitId, createdAt, updatedAt, *tags'`
    - `urgeLogs`: `'id, date, timestamp, intensity, responseOutcome, linkedHabitId, createdAt, *triggerCategories'`
    - `morningIntentions`: `'id, date, createdAt, updatedAt'`
    - `eveningDebriefs`: `'id, date, createdAt, updatedAt'`
  - Full preservation of existing M1–M5 habits, logs, audits, milestones, and achievements.
- **Automated Test Suite:**
  - Added 33 unit and workflow integration tests (`reflectionPromptEngine.test.ts`, `urgeDiagnosticService.test.ts`, `journalService.test.ts`, `reflectionService.test.ts`, `journalWorkflow.test.ts`), bringing total passing tests to 129/129 across 10 test suites.

---

## [1.0.0-alpha.5] — 2026-11-17 (Milestone 5: Consistency Calendar & Discipline Heatmap)

### Added
- **Consistency Calendar Aggregation Engine:**
  - Dedicated aggregation engine in `src/core/calendar/`:
    - `CalendarAggregationService`: Pure deterministic daily and date-range adherence calculator evaluating actual historical `HabitLog` records against habit schedules and pause intervals.
    - Daily completion percentage formula: $\text{Daily Completion \%} = \frac{\text{Completed Scheduled Habits}}{\text{Evaluated Scheduled Habits}} \times 100$.
    - Evaluated scheduled denominator excludes pending check-ins, paused days, and unscheduled rest days.
    - Semantic day states: `complete`, `partial`, `failed`, `pending`, `rest`, `paused`, `future`.
    - Zero division-by-zero errors; days with zero scheduled commitments return `null` completion and are represented as `rest` or `paused`.
- **Interactive Consistency Calendar UI (`src/features/calendar/`):**
  - Upgraded `/calendar` route to a comprehensive personal discipline dashboard:
    - *Monthly Calendar Grid*: 7-column monthly grid with previous/next month navigation, jump to today, day cells with status badges, and micro-adherence metrics.
    - *Discipline Heatmap*: 52-week contribution-style annual matrix in Obsidian & Gold with 5-level intensity ramp, month/weekday labels, and interactive tooltips.
    - *Day Detail Panel*: Slide-over inspection panel displaying formatted date, semantic status badge, daily adherence meter, and habit-by-habit breakdown cards with streak impact badges (`+1 Increment`, `Resets to 0`, `No Impact`).
    - *Live In-place Check-in & Audit Correction*: Embedded modal launcher allowing immediate check-in or retroactive audit correction directly from any calendar day cell.
    - *Multi-dimensional Filters*: Filter by specific habit, category (`abstinence`, `craft`, `body`, `mind`, `discipline`, `custom`), tracking type, and lifecycle state (`active`, `paused`, `archived`).
    - *Monthly Summary Analytics*: 5-card top bar calculating total scheduled commitments, completed count, missed/failed count, average adherence percentage, and best consistency day.
- **Automated Test Suite:**
  - Added 26 tests in `src/core/calendar/calendarAggregationService.test.ts` covering all aggregation semantics, leap years, pending isolation, paused exclusions, filters, and audit corrections. Total passing tests platform-wide: 96/96.

---

## [1.0.0-alpha.4] — 2026-11-17 (Milestone 4: Custom Milestone & Reward Engine)

### Added
- **Custom Milestone & Reward Engine:**
  - Dedicated domain calculation and persistence module (`src/core/milestones/`):
    - `MilestoneService`: Full CRUD for independent habit milestone thresholds, validation for positive integers ($T > 0$), duplicate rejection within the same habit, enable/disable toggling, and audited deletion.
    - `AchievementEngine`: Pure deterministic streak segment extraction (`extractStreakSegments`) and achievement detection (`detectAchievementsForHabit`), identifying milestones earned on the exact calendar date of the threshold day.
    - `RewardService`: Isolated claim ledger management (`claimReward`), recording celebration timestamps and reflection notes without ever mutating habit logs, schedules, or streaks.
  - Strict mathematical invariants:
    - Achievement identity: Compound key `[habitId + milestoneId + streakStartDate]` guaranteeing complete idempotency across evaluations.
    - Repeat achievements: When a streak resets to 0 and a new streak reaches the threshold, a brand new achievement record is generated for the new streak instance, preserving all past achievements permanently.
    - Historical immutability: Snapshots of `rewardTitle`, `rewardDescription`, and `thresholdDays` are frozen on unlock; editing or deleting milestone definitions never alters or deletes past earned achievements.
- **Reward Center (`MilestonesView`):**
  - Upgraded `/milestones` route into a dedicated 3-tab Reward Center:
    - *Ready to Claim*: Displays unlocked milestone rewards waiting for manual claim with celebratory cards and claim triggers.
    - *Upcoming Milestones*: Live progress tracking across active habits with visual progress bars (`X / Y days`), remaining days, and milestone management actions.
    - *Reward Ledger*: Historical celebration archive recording claimed rewards, claim timestamps, and celebration reflection notes.
    - Habit filter dropdown to isolate milestones and achievements per habit.
- **Habit Detail Integration:**
  - Integrated *Streak Milestones & Celebratory Rewards* card into `HabitDetailView`:
    - Shows all configured milestones for the habit with live progress bars and status badges (*Claimed*, *Unlocked & Ready*, *In Progress*).
    - Inline claim button launching `ClaimRewardModal`.
    - "+ Add Milestone" button launching `MilestoneFormModal`.
- **Command Center Integration:**
  - Celebratory alert banner when unclaimed rewards are ready to claim.
  - *Upcoming Milestones* preview card showing nearest rewards across active habits.
- **Automated Test Suite:**
  - Added 32 unit and integration tests (`src/core/milestones/milestoneEngine.test.ts`), bringing total passing tests to 70/70.

---

## [1.0.0-alpha.3] — 2026-11-17 (Milestone 3: Independent Strict Streak Engine)

### Added
- **Independent Strict Streak Engine:**
  - Dedicated domain calculation module (`src/core/streak/`) featuring:
    - `StreakCalculator`: Pure functional, deterministic calculation engine accepting explicit evaluation dates.
    - `StreakEngine`: Database orchestration service for loading logs, deriving pause intervals, and batch calculations.
    - `StreakUtils`: Timezone-safe calendar sequence generator, range probes, and leap-year boundaries.
  - Strict mathematical rules:
    - Current streak increments consecutively on successful scheduled days.
    - Fails or unrecorded past scheduled days reset current streak immediately to 0.
    - Longest streak is preserved permanently and monotonically non-decreasing.
    - Unscheduled days are strictly excluded and never break a streak sequence.
    - Paused intervals are excluded from failure penalties and preserve continuity upon resumption.
    - Today's pending check-in preserves active streak from yesterday without premature reset.
- **Forensic Streak Detail View:**
  - Integrated full streak analytics in `HabitDetailView`:
    - 4 primary metric cards: *Current Streak* (with start date), *All-Time Longest* (with historical range), *Success Adherence %*, and *Next Commitment*.
    - Strict Streak Invariants & Status grid: Total successes, total failures, missed days, and last successful date.
    - Chronological timeline table displaying evaluated status and explicit *Streak Impact* indicators (`+1 Increment`, `Resets to 0`, `Neutral`).
- **Dashboard & Card Integration:**
  - `CommandCenter` top metrics row upgraded to real database streak totals: *Active Streaks* and *All-Time Longest*.
  - Protocol checklist and `HabitCard` display prominent streak badges with flame icons (`{streak}d`) and all-time record counters.
- **Automated Test Suite:**
  - Added 18 unit and integration tests covering 20 edge-case scenarios (`src/core/streak/streakEngine.test.ts`), bringing total passing tests to 38/38.

---

## [1.0.0-alpha.2] — 2026-11-17 (Milestone 2: Habit Management Engine)

### Added
- **Habit Management System (CRUD):**
  - Unlimited habit architecture for three tracking modalities:
    - *Abstinence*: Maintained Standard vs Setback/Relapse (e.g., Digital Purity, Sobriety).
    - *Completion*: Binary Completed vs Missed (e.g., DSA Practice, Reading).
    - *Quantitative*: Configurable targets, measured units, and constraints (`at_least` vs `at_most`).
  - Creation and editing modal (`HabitFormModal`) with real-time Zod schema validation.
  - Habit lifecycle management: Active, Paused, and Archived states with confirmation dialogs.
  - Hard deletion safeguards ensuring historical records are never silently erased.
- **Flexible Scheduling Engine:**
  - Support for "Every Day" and "Selected Days" (Sunday–Saturday weekday toggles).
  - Unscheduled day handling: Non-scheduled days are never marked as missed.
  - Strict calendar date boundaries (`startDate` and optional `endDate`).
- **Habit Detail View (`HabitDetailView`):**
  - Dedicated full-page view for every individual habit.
  - Standard of excellence display, real database statistics cards (Total recorded days, Clean days, Setbacks, Adherence rate).
  - Comprehensive historical daily records table with status pills, measured values, and reflection notes.
- **Contextual Daily Check-In (`CheckInModal`):**
  - Intuitive dialog for Abstinence, Completion, and Quantitative check-ins.
  - Live target evaluation for quantitative inputs.
  - Transaction-safe duplicate check-in prevention (`[habitId+date]`).
  - Auditable correction workflow requiring an audit reason when updating previous check-ins.
- **Reactive Command Center Dashboard:**
  - Replaced all M1 demonstration metrics with live Dexie queries via `useLiveQuery`.
  - Real active habits count, today scheduled count, completed today, pending today, and adherence %.
  - One-click daily protocol check-in checklist.
  - Clean empty state with direct action when zero habits are created.
- **Database Schema Upgrades:**
  - Bumped Dexie database to version 2, introducing the `auditRecords` table.
- **Automated Test Suite:**
  - Added 14 comprehensive test cases covering all 15 prompt requirements (`src/test/habitManagement.test.ts`), bringing total passing tests to 20/20.

---

## [1.0.0-alpha.1] — 2026-11-17 (Milestone 1: Project Foundation)

### Added
- **Project Scaffolding:** Initialized Vite 6, React 19, TypeScript 5.7, Tailwind CSS, Lucide React, and Vitest test runner.
- **Design System (Obsidian & Gold):**
  - Full color palette (`obsidian-950` through `obsidian-600`, `gold-50` through `gold-950`).
  - Typography scale with `Cinzel`, `Plus Jakarta Sans`, `Inter`, and `JetBrains Mono`.
  - Reusable UI component library (`Button`, `Card`, `Badge`, `MetricCard`, `Progress`, `Modal`).
- **Responsive Application Shell:**
  - Collapsible desktop sidebar with gold insignia badge and discipline motto.
  - Mobile bottom navigation bar and sliding drawer.
  - Sticky top bar with current date display, local-first database status, and quick action trigger.
- **Platform Navigation:** Routing configuration for all 9 core modules:
  - Command Center
  - My Streaks
  - Consistency Calendar
  - Journal & Reflections
  - Discipline Analytics
  - Focus Mode
  - Milestones & Rewards
  - Recovery Center
  - Settings & Storage
- **Command Center (Module 1):**
  - High-impact daily discipline hero banner.
  - 4-column key metrics display (Active Streaks, Today's Fulfillment, Rolling Discipline Score, Longest Record).
  - Today's Habit Protocol checklist with interactive check-in demonstration.
  - Upcoming Milestones preview card with custom reward countdowns.
  - Daily Reflection prompt teaser card.
  - Urge intervention quick-access banner.
- **Interactive Focus Mode:**
  - Working Pomodoro timer (25m, 50m, 15m presets) with play/pause/reset controls.
  - Session notes input and daily focus stats.
- **Quick Action Modal:**
  - One-click access to daily check-in, urge logging, focus sprint, and reflection.
- **Local-First Database Schema:**
  - Dexie.js (IndexedDB) database initialized (`semnotes_db`) with full tables for habits, logs, milestones, journal, urge logs, and sessions.
  - Zod schemas for all domain entities.
  - JSON backup export engine in Settings.
- **Documentation:**
  - `README.md`
  - `ARCHITECTURE.md`
  - `ROADMAP.md`
  - `CHANGELOG.md`
- **Testing:**
  - Vitest test suite verifying RFC4122 UUID generation, ISO calendar date formatting, and Zod domain validation.
