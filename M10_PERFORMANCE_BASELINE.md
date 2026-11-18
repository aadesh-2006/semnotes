# SEMNÓTĒS — Milestone 10 Phase 2, Batch 3B
## Production Performance Baseline (`AUDIT-PERF-01`)

**Repository:** `https://github.com/aadesh-2006/semnotes`  
**Starting Commit:** `9858656`  
**Measured Date:** 2026-11-18  
**Measurement Tooling:** Vite v6.4.6 / Rollup Production Build (`tsc -b && vite build`)

---

## 1. Baseline Measurements (Pre-Optimization)

At commit `9858656`, all application routes and views are eagerly imported in `src/App.tsx`. As a result, Vite builds a single monolithic JavaScript bundle:

### Bundle Assets Summary

| Asset | Type | Raw Size | Gzip Size | Status |
| :--- | :--- | :---: | :---: | :--- |
| `dist/assets/index-Cyjb_n-b.js` | JavaScript (Entry) | **1,373.49 kB** | **370.10 kB** | Exceeds 500 kB budget warning |
| `dist/assets/index-CfcrtbiM.css` | Stylesheet | **57.10 kB** | **9.89 kB** | Healthy |
| `dist/index.html` | HTML Entry | **1.02 kB** | **0.57 kB** | Healthy |

- **Total JavaScript:** 1,373.49 kB (Raw) / 370.10 kB (Gzip)
- **Total CSS:** 57.10 kB (Raw) / 9.89 kB (Gzip)
- **Initial Download Payload (Root `/`):** 1,373.49 kB (100% of application code)
- **Number of Chunks:** 1 monolithic chunk
- **Transformed Modules:** 2,767 modules
- **Build Duration:** 22.69 seconds

---

## 2. Dependency Weight & Architectural Bottlenecks

### A. Eager Feature Module Loading
In `src/App.tsx`, all 8 feature views are statically imported at the top of the file:
- `StreaksView` & `HabitDetailView`
- `CalendarView` (Yearly heatmap + Monthly matrices + DayDetailPanel)
- `JournalView` (Markdown editor + Prompt engine + Urge diagnostics)
- `AnalyticsView` (Discipline score engine + Recharts visualizations)
- `FocusView` (Pomodoro state machine + Timer engine + Audio chimes)
- `MilestonesView` (Reward center + Milestone configuration)
- `SettingsView` & `DataManagementView` (Backup export/validation + Restore engine + AES-256 encryption + Cloud sync provider)

A user opening the Command Center (`/`) immediately downloads the full charting engine, the encryption engine, the calendar aggregation matrix, and the entire journal subsystem before the initial screen can render.

### B. Heavy Third-Party Dependencies
1. **`recharts` (~400–450 kB raw):**
   - Includes D3 sub-dependencies: `d3-shape`, `d3-scale`, `d3-interpolate`, `d3-path`, `d3-color`, `d3-format`, `d3-time`, `d3-time-format`, `victory-vendor`.
   - Used exclusively in `AnalyticsView` (`ResponsiveContainer`, `AreaChart`, `BarChart`, `PieChart`, etc.).
   - Must be isolated to the `/analytics` route chunk.
2. **`lucide-react` (~120–150 kB raw):**
   - Icon library providing visual markers across navigation and cards.
3. **Dexie & React Hooks (~95–105 kB raw):**
   - IndexedDB persistence and live query subscriptions (`useLiveQuery`).
4. **React & React DOM + React Router (~180–200 kB raw):**
   - React 19 core and DOM runtime, plus React Router v7.

---

## 3. Performance Budgets & Optimization Targets

| Metric | Measured Baseline | Target Budget | Expected Strategy |
| :--- | :---: | :---: | :--- |
| **Initial JS Payload (Raw)** | 1,373.49 kB | **< 500 kB** | Route-level lazy loading (`React.lazy`) |
| **Initial JS Payload (Gzip)** | 370.10 kB | **< 170 kB** | Code splitting & vendor chunking |
| **Route Chunks** | 0 chunks | **7 on-demand chunks** | Split Streaks, Calendar, Journal, Analytics, Focus, Milestones, Settings |
| **Analytics (Recharts) Isolation** | In initial bundle | **Deferred to `/analytics`** | Separate chunk loaded only on navigation |
| **Settings (Storage/Sync) Isolation** | In initial bundle | **Deferred to `/settings`** | Separate chunk loaded only on navigation |
| **TypeScript / Build Errors** | 0 | **0** | Strict verification |
| **Automated Tests** | 270 passed | **270+ passed** | Zero functional regression |

---

## 4. Planned Engineering Steps

1. **Route-Level Code Splitting:**
   - Convert `StreaksView`, `CalendarView`, `JournalView`, `AnalyticsView`, `FocusView`, `MilestonesView`, `SettingsView`, and `NotFoundView` into lazy-loaded dynamic imports (`React.lazy()`).
   - Keep `CommandCenter` eagerly or quickly accessible for immediate first paint.
2. **Obsidian & Gold Suspense Loading Fallback:**
   - Design a lightweight, zero-layout-shift `<RouteLoadingFallback />` displaying a subtle gold pulse and skeleton loader within `AppShell`.
3. **Vendor & Heavy Dependency Chunking:**
   - Configure `manualChunks` in `vite.config.ts` so `recharts` is strictly isolated into an analytics vendor chunk, `dexie` into a storage vendor chunk, and React into a core vendor chunk.
4. **Runtime Memoization & Efficiency:**
   - Audit heavy calculations (e.g. calendar aggregation, habit statistics) to prevent redundant re-renders.
5. **Verification & Measurement:**
   - Measure resulting chunk sizes, verify lazy loading on demand via browser DevTools, and ensure 100% test pass rate.
