# Changelog

All notable changes to **SEMNÓTĒS** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
