# SEMNÓTĒS — System Architecture

**Product Name:** SEMNÓTĒS  
**Tagline:** *Dignity. Self-respect. Discipline.*  
**Status:** M1 (Foundation) Complete

---

## 1. Architectural Principles

SEMNÓTĒS is architected with strict separation of concerns across four key layers:

```
┌────────────────────────────────────────────────────────┐
│                   Presentation Layer                   │
│   (React 19, Tailwind CSS, Lucide, AppShell, Views)    │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    Application Layer                   │
│    (Use Cases, ViewModels, Hooks, Orchestrators)       │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                   Domain Engine Layer                  │
│  (Streak Engine, Discipline Score Math, Zod Entities)  │
│             * Zero React / UI Dependencies *           │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                  Persistence Layer                     │
│  (Dexie.js IndexedDB, Local-First Repositories, JSON)  │
└────────────────────────────────────────────────────────┘
```

### Key Decisions:
1. **Decoupled Business Logic:** The Streak Engine, Milestone detector, and Discipline Score algorithms are pure TypeScript functions located under `src/core/`. They have **no** React or DOM dependencies and are tested via pure Vitest suites.
2. **Local-First Sovereign Storage:** Browser IndexedDB (via Dexie.js) is the primary source of truth. The application operates 100% offline without external network requirements.
3. **Auditability:** Accidental check-ins or schedule corrections record historical audit entries (`correctedAt`, `notes`) rather than mutating past logs destructively.

---

## 2. Strict Streak Engine (Formal Specification)

### Mathematical Invariants
Let $H$ be a habit with schedule frequency $S \in \{\text{daily}, \text{selected\_days}\}$ and start date $D_0$.

For any calendar date $d \ge D_0$:
- If $d$ is a scheduled day:
  - Fulfill condition met $\implies \text{status}(d) = \text{completed}$
  - Target missed / Relapse $\implies \text{status}(d) = \text{failed}$
  - Day passed with no record $\implies \text{status}(d) = \text{missed}$
- If $d$ is not a scheduled day $\implies \text{status}(d) = \text{skipped}$ (Streak is preserved, counter does not increment or decrement).

### Calculation Rules
1. **Current Streak ($C$):**
   $$C = \text{consecutive completed scheduled days up to today without interruption}$$
   If any scheduled day has status $\in \{\text{failed}, \text{missed}\}$, $C$ immediately resets to $0$.
2. **Longest Streak ($L$):**
   $$L = \max_{t \le \text{today}} \{ C(t) \}$$
   $L$ is monotonic non-decreasing ($L_{t+1} \ge L_t$) and is never reset by a relapse.
3. **Independent Isolation:**
   $$\forall H_i, H_j \quad (i \ne j) \implies \text{Streak}(H_i) \perp \text{Streak}(H_j)$$

---

## 3. Data Schema & Persistence (IndexedDB)

The schema is defined in `src/core/domain/types.ts` and indexed via Dexie in `src/storage/db/index.ts`:

- `habits`: `id, category, type, status, startDate, createdAt`
- `habitLogs`: `id, habitId, date, status, [habitId+date]`
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
