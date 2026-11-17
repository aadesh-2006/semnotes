# SEMNÓTĒS

> **Dignity. Self-respect. Discipline.**

[![Status](https://img.shields.io/badge/Release-V1.0--Alpha-C5A869.svg)](https://github.com/aadesh-2006/semnotes)
[![License](https://img.shields.io/badge/License-MIT-0D0E12.svg)](LICENSE)
[![Theme](https://img.shields.io/badge/Theme-Obsidian%20%26%20Gold-282937.svg)](#design-system)
[![Engine](https://img.shields.io/badge/Streak%20Engine-Deterministic-3E885B.svg)](#strict-streak-engine)

SEMNÓTĒS is a local-first, sovereign personal discipline operating system engineered for uncompromising self-mastery.

Unlike casual gamified habit trackers designed for dopamine loops or superficial streaks, SEMNÓTĒS enforces strict adherence, auditable integrity, and constructive recovery without shame or toxic guilt.

---

## 🏛️ Core Principles

1. **Unforgiving Truth & Objective Auditing:** Missed scheduled commitments reset current streaks deterministically to zero. Historical milestones, total successful days, and longest streak records are preserved permanently.
2. **True Streak Independence:** Abstinence tracking (e.g., digital purity, sobriety), completion habits (e.g., algorithm practice, reading), and quantitative targets (e.g., distance, hydration) run in complete isolation. Breaking one streak never compromises another.
3. **Local-First Privacy:** All journal reflections, urge diagnostic entries, and metric logs are persisted on-device in IndexedDB (Dexie.js).
4. **Obsidian & Gold Aesthetics:** A solemn, high-contrast palette reflecting gravitas and focus: deep charcoals, ink blacks, and muted brushed gold accents.

---

## ⚡ Tech Stack

- **Frontend:** React 19, TypeScript, Vite 6
- **Styling:** Tailwind CSS (Obsidian & Gold Design System), Lucide React
- **Persistence:** Dexie.js (IndexedDB)
- **Validation:** Zod Schema Validation
- **Visualizations:** Recharts & SVG Activity Heatmaps
- **Testing:** Vitest & React Testing Library

---

## 🧭 Navigation & Modules

| Module | Purpose |
| :--- | :--- |
| **Command Center** | High-level discipline overview, today's protocol checklist, and active streak metrics. |
| **Streak Architect** | Configure independent abstinence, binary completion, and quantitative commitments. |
| **Consistency Calendar** | GitHub-style contribution heatmaps, monthly schedules, and habit filters. |
| **Journal & Reflections** | Client-side encrypted journaling, urge logs, trigger diagnostics, and evening prompts. |
| **Discipline Analytics** | Rolling 30-day algorithmic Discipline Score (no vanity metrics) and variance trends. |
| **Focus Mode** | Audited deep work timer (Pomodoro & sprints) with session logs. |
| **Milestones & Rewards** | Idempotent custom threshold rewards configured individually per streak. |
| **Recovery Center** | Constructive setback protocols, trigger forensics, and return-to-routine checklists. |
| **Settings & Storage** | Local-first database management, JSON/CSV exports, and privacy toggles. |

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
