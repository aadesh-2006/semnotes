# SEMNÓTĒS — Engineering Roadmap

## Milestone Progress Overview

| Milestone | Scope | Status | Notes |
| :--- | :--- | :---: | :--- |
| **M1** | **Project Foundation** | **DONE** | Scaffolding, Obsidian & Gold design system, shell, Command Center, documentation. |
| **M2** | **Habit Management** | Planned | Habit CRUD, multi-schedule engine, category schemas, target values. |
| **M3** | **Strict Streak Engine** | Planned | Deterministic calculations, strict reset logic, audit records, timezone safety. |
| **M4** | **Milestones & Rewards** | Planned | Custom milestone schedules, reward claims, celebration triggers. |
| **M5** | **Journal & Reflection** | Planned | Private journal, urge diagnostic logger, mood & prompt tracking. |
| **M6** | **Discipline Analytics** | Planned | Rolling 30-day score, Recharts visualizations, habit breakdown. |
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

### M2 — Habit Management (Next Phase)
- [ ] Habit creation modal with Zod validation.
- [ ] Support for 3 habit types: Abstinence, Binary Completion, Quantitative.
- [ ] Flexible scheduling: Daily vs Selected days of the week.
- [ ] Habit status management: Active, Paused, Archived.
- [ ] Habit duplicate and edit flows.

### M3 — Strict Streak Engine
- [ ] Pure functional streak calculation algorithm.
- [ ] Zero-compromise reset policy on failed or missed days.
- [ ] Permanent longest streak preservation.
- [ ] Audit log trail for accidental check-in corrections.
- [ ] Full Vitest suite for timezone boundaries and calendar edge cases.

### M4 — Custom Milestones & Rewards
- [ ] Unlimited custom threshold day targets per habit.
- [ ] Reward name and description configuration.
- [ ] Idempotent unlock trigger detection.
- [ ] Reward claim status and claimed history log.

### M5 — Journal & Reflection
- [ ] Daily sovereign reflection editor.
- [ ] 1-10 Urge Diagnostic slider with trigger tagging.
- [ ] Morning and evening reflective prompts.
- [ ] Searchable private history.

### M6 — Discipline Analytics
- [ ] Algorithmic Rolling 30-day Discipline Score calculation.
- [ ] Multi-series Recharts consistency graphs.
- [ ] Habit comparison matrix and drop-off analysis.

### M7 — Focus & Recovery
- [ ] Audited focus timer with Pomodoro and custom durations.
- [ ] Session tagging linked to habits.
- [ ] Constructive Setback Forensic workflow.
- [ ] Return-to-routine somatic checklist.

### M8 — Storage & Synchronisation
- [ ] Reactive Dexie IndexedDB live queries.
- [ ] Complete database backup export (JSON) and restore (import).
- [ ] Optional client-side encrypted Supabase synchronization.

### M9 — Quality Assurance & Release Polish
- [ ] Playwright E2E verification of critical check-in and recovery flows.
- [ ] WCAG AA accessibility compliance.
- [ ] Lighthouse 95+ performance optimization.
