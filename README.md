# SEMNÓTĒS

> **Dignity. Self-respect. Discipline.**

[![Status](https://img.shields.io/badge/Release-V1.0--M4%20Complete-C5A869.svg)](https://github.com/aadesh-2006/semnotes)
[![License](https://img.shields.io/badge/License-MIT-0D0E12.svg)](LICENSE)
[![Theme](https://img.shields.io/badge/Theme-Obsidian%20%26%20Gold-282937.svg)](#design-system)
[![Engine](https://img.shields.io/badge/Streak%20Engine-Strict%20%26%20Deterministic-3E885B.svg)](#strict-streak-engine)
[![Engine](https://img.shields.io/badge/Reward%20Engine-Idempotent%20%26%20Custom-C5A869.svg)](#milestones--rewards)

SEMNÓTĒS is a local-first, sovereign personal discipline operating system engineered for uncompromising self-mastery.

Unlike casual gamified habit trackers designed for dopamine loops or superficial streaks, SEMNÓTĒS enforces strict adherence, auditable integrity, and constructive recovery without shame or toxic guilt.

---

## 🏛️ Core Principles

1. **Unforgiving Truth & Objective Auditing:** Missed scheduled commitments reset current streaks deterministically to zero. Historical milestones, total successful days, and longest streak records are preserved permanently.
2. **True Streak Independence:** Abstinence tracking (e.g., digital purity, sobriety), completion habits (e.g., algorithm practice, reading), and quantitative targets (e.g., distance, hydration) run in complete isolation. Breaking one commitment never compromises another.
3. **Idempotent Milestones & Meaningful Rewards:** Independent threshold day schedules per habit with immutable historical snapshots and isolated claim workflows that celebrate discipline without corrupting streak counters.
4. **Local-First Privacy:** All habit entities, daily logs, check-ins, milestones, and audit records reside on-device in IndexedDB (`semnotes_db` via Dexie.js).
5. **Obsidian & Gold Aesthetics:** A solemn, high-contrast palette reflecting gravitas and focus: deep charcoals, ink blacks, and muted brushed gold accents.

---

## ⚡ Tech Stack

- **Frontend:** React 19, TypeScript 5.7, Vite 6
- **Styling:** Tailwind CSS (Obsidian & Gold Design System), Lucide React
- **Persistence:** Dexie.js (IndexedDB v3) with reactive `useLiveQuery`
- **Validation:** Zod Schema Validation
- **Engine:** Deterministic Strict Streak Engine (`StreakCalculator` & `StreakEngine`) + Custom Milestone Engine (`MilestoneService`, `AchievementEngine`, `RewardService`)
- **Testing:** Vitest & React Testing Library (70/70 automated tests passing)

---

## 🧭 Navigation & Modules

| Module | Purpose | Status |
| :--- | :--- | :---: |
| **Command Center** | High-level discipline overview, today's protocol checklist, active streak metrics, and unclaimed reward alerts. | **Active (Live Engine)** |
| **Streak Architect** | Full CRUD for independent abstinence, completion, and quantitative habits. | **Active (Live Engine)** |
| **Streak History & Details** | Deep-dive forensic streak timeline, invariants grid, milestones section, and status management. | **Active (Live Engine)** |
| **Milestones & Rewards** | Idempotent custom threshold rewards configured individually per streak with claim ledger. | **Active (Live Engine)** |
| **Consistency Calendar** | Activity heatmaps, monthly schedules, and habit filters. | M5 |
| **Journal & Reflections** | Client-side encrypted journaling, urge logs, trigger diagnostics, and evening prompts. | M5 |
| **Discipline Analytics** | Rolling 30-day algorithmic Discipline Score (no vanity metrics) and variance trends. | M6 |
| **Focus Mode** | Audited deep work timer (Pomodoro & sprints) with session logs. | M8 |
| **Recovery Center** | Constructive setback protocols, trigger forensics, and return-to-routine checklists. | M7 |
| **Settings & Storage** | Local-first database management, JSON/CSV exports, and privacy toggles. | M8 |

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

### Running Test Suite

```bash
npm run test
```

### Production Build

```bash
npm run build
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
