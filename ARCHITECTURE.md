# SEMNÓTĒS — System Architecture

**Product Name:** SEMNÓTĒS  
**Tagline:** *Dignity. Self-respect. Discipline.*  
**Status:** M1 (Foundation) & M2 (Habit Management Engine) Complete

---

## 1. Architectural Principles

SEMNÓTĒS is architected with strict separation of concerns across four key layers:

```
┌────────────────────────────────────────────────────────┐
│                   Presentation Layer                   │
│   (React 19, Tailwind CSS, Lucide, AppShell, Views)    │
│   - CommandCenter (Reactive live dashboard)            │
│   - StreaksView (Habits management & filtering)        │
│   - HabitDetailView (Historical logs & stats)          │
│   - HabitFormModal & CheckInModal                      │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    Application Layer                   │
│    (HabitService, HabitLogService, ScheduleService,    │
│     HabitDashboardService, Dexie Live Queries)         │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                   Domain Engine Layer                  │
│  (Streak Engine [M3], Zod Entities, Validation Rules)  │
│             * Zero React / UI Dependencies *           │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                  Persistence Layer                     │
│  (Dexie.js IndexedDB: semnotes_db v2, Audit Trails)    │
└────────────────────────────────────────────────────────┘
```

### Key Decisions:
1. **Decoupled Business Logic:** All operations (`createHabit`, `updateHabit`, `recordCheckIn`, `correctCheckIn`, `isScheduledDay`, `getDashboardMetrics`) are standalone services in `src/core/services/` with strict Zod runtime verification and zero React dependencies.
2. **Local-First Sovereign Storage:** Browser IndexedDB (via Dexie.js v4) is the canonical source of truth. The application operates 100% offline.
3. **Auditability & Safe Corrections:** Accidental check-ins or schedule modifications create immutable historical audit entries in `db.auditRecords` (`action`, `previousStatus`, `newStatus`, `previousValue`, `newValue`, `reason`, `timestamp`).
4. **Duplicate Prevention:** Daily logs use atomic Dexie transactions on compound index `[habitId+date]`, guaranteeing exactly one canonical log per habit per local date while permitting auditable in-place modifications.

---

## 2. Habit Management Domain Specifications

### A. Tracking Types
1. **Abstinence Tracking:**
   - Daily outcomes: *Maintained Standard* (`status: 'completed'`) vs *Setback / Relapse* (`status: 'failed'`).
   - Purpose: Breaking negative loops (pornography, smoking, dopamine binging) where success is defined by avoiding the trigger.
2. **Binary Completion Tracking:**
   - Daily outcomes: *Completed* (`status: 'completed'`) vs *Missed* (`status: 'failed'`).
   - Purpose: Daily habits requiring positive action (DSA problem solving, deep reading, calisthenics).
3. **Quantitative Tracking:**
   - Target configuration: `targetValue: number`, `unit: string`, `targetConstraint: 'at_least' | 'at_most'`.
   - Determination: Evaluated on log entry. If `at_least`, `numericValue >= targetValue ? 'completed' : 'failed'`. If `at_most`, `numericValue <= targetValue ? 'completed' : 'failed'`.

### B. Scheduling Engine
- `frequency: 'daily' | 'selected_days'`.
- Selected days use `selectedDays: number[]` (0=Sun, 1=Mon, ..., 6=Sat).
- Unscheduled days are strictly categorized as `rest_day` or `skipped`; **unscheduled days are never marked as missed**.
- Bound check against `startDate` and optional `endDate`.

---

## 3. Data Schema & Persistence (IndexedDB v2)

The schema is defined in `src/core/domain/types.ts` and indexed via Dexie in `src/storage/db/index.ts`:

- `habits`: `id, category, type, status, startDate, createdAt`
- `habitLogs`: `id, habitId, date, status, [habitId+date]`
- `auditRecords`: `id, habitId, habitLogId, date, action, timestamp`
- `milestones`: `id, habitId, thresholdDays, isUnlocked, isClaimed`
- `journalEntries`: `id, date, mood, createdAt`
- `urgeLogs`: `id, habitId, timestamp, intensity, response`
- `focusSessions`: `id, habitId, startedAt, status`
- `userSettings`: `id`

### Calendar Dates vs Timestamps
- Calendar dates are recorded as ISO local strings (`YYYY-MM-DD`). This prevents timezone crossing bugs where check-ins made at 11:30 PM shift to the next day upon export or browser timezone switch.
- Event audit times use UTC ISO8601 strings (`2026-11-17T15:30:00.000Z`).

---

## 4. Milestone & Reward Engine

- **Idempotency:** Milestones are evaluated on log creation. Once `isUnlocked = true`, subsequent evaluations will not emit redundant unlock events or rewards.
- **Customization:** Users define threshold day targets (e.g. 7, 14, 30, 90 days) independently per habit.
- **Reward Claims:** Unlocked rewards transition to `isClaimed = true` with a timestamp, preserving the celebration history.

---

## 5. Security & Privacy Blueprint

- **Zero Telemetry:** No third-party analytical SDKs or tracking cookies.
- **Client-Side Encryption (Roadmap M8):** Web Crypto API AES-GCM 256-bit encryption for journal and urge logs before optional Supabase synchronization.
