# SEMNÓTĒS

> **Dignity. Self-respect. Discipline.**

[![Status](https://img.shields.io/badge/Release-v1.0.0%20Production%20Ready-C5A869.svg)](https://github.com/aadesh-2006/semnotes)
[![License](https://img.shields.io/badge/License-MIT-0D0E12.svg)](LICENSE)
[![Theme](https://img.shields.io/badge/Theme-Obsidian%20%26%20Gold-282937.svg)](#design-system)
[![Accessibility](https://img.shields.io/badge/A11y-WCAG%202.1%20AA%20Compliant-3E885B.svg)](#accessibility)
[![Tests](https://img.shields.io/badge/Tests-354%2F354%20Passing-3E885B.svg)](#running-test-suite)
[![Security](https://img.shields.io/badge/Vulnerabilities-0%20Production-3E885B.svg)](#sovereign-storage)
[![Encryption](https://img.shields.io/badge/Crypto-PBKDF2%20600k%20%2B%20AES--256--GCM-C5A869.svg)](#sovereign-storage)
[![Routing](https://img.shields.io/badge/Routing-URL--Based%20History-C5A869.svg)](#url-routing)

SEMNÓTĒS is a universal, local-first personal discipline and habit tracking platform designed for anyone seeking to build consistency, fulfill commitments, and cultivate self-mastery across academics, fitness, reading, coding, routines, and personal commitments.

Unlike casual gamified habit trackers with vanity metrics and superficial streaks, SEMNÓTĒS enforces strict adherence, auditable integrity, and factual tracking without artificial multipliers or guilt-based messaging.

---

## 🏛️ Core Principles

1. **Unforgiving Truth & Objective Auditing:** Missed scheduled commitments reset current streaks deterministically to zero. Historical milestones, total successful days, and longest streak records are preserved permanently.
2. **True Streak Independence:** Habit commitments—whether completion tasks (e.g. algorithmic practice, reading), quantitative targets (e.g. workout volume, distance, hydration), or abstinence commitments (e.g. screen time reduction)—run in complete isolation. An interruption in one routine never compromises another.
3. **Idempotent Milestones & Meaningful Rewards:** Independent threshold day schedules per habit with immutable historical snapshots and isolated claim workflows that celebrate discipline without corrupting streak counters.
4. **Forensic Consistency Calendar & Heatmap:** Monthly matrix and 52-week contribution heatmap calculating actual daily completion percentages with pending commitment isolation and day-by-day inspection.
5. **Local-First Privacy & Integrity:** All habit entities, daily logs, check-ins, milestones, focus records, and reflections reside on-device in IndexedDB (`semnotes_db` v6 via Dexie.js). Habit deletions preserve historical audit records by default, and database restorations execute inside native browser ACID transactions.
6. **Obsidian & Gold Aesthetics:** A solemn, high-contrast palette reflecting gravitas and focus: deep charcoals, ink blacks, and muted brushed gold accents.

---

## ⚡ Tech Stack

- **Frontend:** React 19, TypeScript 5.7, Vite 6
- **Styling:** Tailwind CSS (Obsidian & Gold Design System), Lucide React
- **Accessibility:** WCAG 2.1 AA Compliant (Skip-link, focus traps, ARIA semantics, live regions, `vitest-axe` verified)
- **Persistence:** Dexie.js (IndexedDB v6 with soft tombstone indices) with reactive `useLiveQuery`
- **Validation:** Zod Schema Validation
- **Cryptography:** Web Crypto API AES-256-GCM + PBKDF2 (600,000 iterations v2.0 envelope, 100% v1.0 backward-compatible)
- **Engine:** Deterministic Strict Streak Engine (`StreakCalculator` & `StreakEngine`), Custom Milestone Engine (`MilestoneService`, `AchievementEngine`), Consistency Calendar Engine (`CalendarAggregationService`), Sovereign Reflection Engine (`ReflectionService`, `JournalService`, `UrgeDiagnosticService`), and Timestamp Focus Timer Engine (`FocusTimerEngine`, `PomodoroEngine`, `FocusSessionService`, `FocusAnalyticsService`)
- **Routing:** React Router v7 (`react-router-dom`) with HTML5 History, deep linking, and 404 recovery
- **Performance:** Route-level code splitting (`React.lazy`), vendor chunk isolation, deferred charting (`recharts`), and runtime memoization
- **Testing:** Vitest, React Testing Library, Axe-Core & `@vitest/coverage-v8` (354/354 automated tests passing across 36 test suites)

---

## 🧭 Navigation & Modules

| Module | URL Path | Purpose | Status |
| :--- | :--- | :--- | :---: |
| **Command Center** | `/` | High-level discipline overview, today's protocol checklist, active streak metrics, live 30D score, active focus preview, and reflection shortcuts. | **Active (Live Engine)** |
| **Streak Architect** | `/streaks` (`/habits`) | Full CRUD for independent completion, quantitative, and abstinence habits. | **Active (Live Engine)** |
| **Streak History & Details** | `/streaks/:habitId` | Deep-dive forensic streak timeline, invariants grid, milestones section, and status management. | **Active (Live Engine)** |
| **Milestones & Rewards** | `/milestones` | Idempotent custom threshold rewards configured individually per streak with claim ledger. | **Active (Live Engine)** |
| **Consistency Calendar** | `/calendar` | Contribution heatmap, monthly calendar grid, day-by-day detail panel, and multi-dimensional filters. | **Active (Live Engine)** |
| **Journal & Reflections** | `/journal` | Sovereign local-first journal, morning intentions, evening debriefs, routine diagnostics, and prompt rotation. | **Active (Live Subsystem)** |
| **Discipline Analytics** | `/analytics` | Rolling 30-day algorithmic Discipline Score (no vanity metrics), trend curves, habit performance breakdowns, and consistency patterns. | **Active (Live Engine)** |
| **Focus Mode** | `/focus` | Timestamp-driven custom focus (1m–12h), Pomodoro cycles, session history, and focus analytics. | **Active (Live Engine)** |
| **Settings & Storage** | `/settings` (`/data`) | Local-first sovereign data management, validated JSON backup/restore with native ACID transactions, RFC 4180 CSV exports, and client-side AES-256 encrypted sync. | **Active (Live Engine)** |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ or v24+)
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/aadesh-2006/semnotes.git
cd semnotes

# Install dependencies
npm install

# Start development server
npm run dev
```

### Running Test Suite & Coverage

```bash
# Run full automated test suite (354 tests)
npm run test

# Run tests with V8 coverage analysis
npm run test:coverage

# Run TypeScript compiler strict validation
npx tsc -b
```

### Production Build & Preview

```bash
# Compile and bundle for production
npm run build

# Preview production build locally
npm run preview
```

---

## 🎨 Design System: Obsidian & Gold

- **Abyss Background:** `#070709`
- **Surface Elevation:** `#0D0E12` / `#171821` / `#1F202B`
- **Brushed Gold Primary:** `#C5A869`
- **Muted Gold Border:** `#685327` / `#8F7538`
- **Highlight Text:** `#F4F4F6` (Inter & Plus Jakarta Sans)
- **Precision Figures:** Tabular JetBrains Mono

---

## 📄 License

MIT © [Aadesh](https://github.com/aadesh-2006)
