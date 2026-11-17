# Changelog

All notable changes to **SEMNÓTĒS** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
