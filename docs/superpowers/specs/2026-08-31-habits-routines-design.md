# Habits & Routines — Consistency + Recovery Design Specification

**Phase:** Phase 3  
**Status:** Approved Architecture & Specification (Remediated)  
**Author:** NguyenDukKyeon  
**Date:** 2026-08-31  

---

## 1. Executive Summary & Core Objective

The purpose of Phase 3 is to build a high-discipline, low-friction behavior system that makes useful routines easy to start and repeat, records execution reality truthfully, and guides the user to recover immediately after missed days without punitive gamification or streak anxiety.

### Core Product Thesis
**HIGH DISCIPLINE, LOW FRICTION**

The behavioral loop is:
```
CUE / CONTEXT
     ↓
START SMALL (Minimum Viable Version when friction is high)
     ↓
DO THE HABIT
     ↓
CHECK IN TRUTHFULLY (Full / Minimum / Explicit Skip)
     ↓
RECOVER QUICKLY IF MISSED
     ↓
ADAPT & SUSTAIN
```

This phase is explicitly **NOT**:
- A streak game or XP grind
- A punishment / guilt system
- A fake discipline score
- A generic todo checklist

---

## 2. Legacy Smart Planner Behavior Inheritance Audit

Audited against `NguyenDukKyeon/smart-planner` (`src/lib/mock-data.ts`, `src/lib/progress-store.ts`, `src/lib/progress-analytics.ts`, `src/lib/weekly-metrics.ts`, `src/components/HabitSidebar.tsx`):

| Legacy Capability | Legacy Mechanism | Phase 3 Decision | Rationale & Successor Architecture |
|---|---|---|---|
| Habit definitions & schedule | `HabitDef` with `dailyTargets` 7-element array (Mon–Sun) | **PRESERVED & STREAMLINED** | Canonical `HabitSchedule` with explicit `daily` or `weekdays` (1=Mon..7=Sun), paired with effective-dated `scheduleRevisions`. |
| Habit check-in | `habitLog[dateISO][habitId]` boolean/number | **SUPERSEDED** | Replaced with explicit `HabitCheckIn` entities distinguishing `full`, `minimum`, and `skipped` with immutable creation audit timestamps. |
| Minimum Viable Version (MVV) | *None* (all-or-nothing completion) | **SUPERSEDED / DISCIPLINE UPGRADE** | First-class `minimumVersion` property on every habit. When friction is high, reduce the action, not the identity of the habit. |
| Streaks & Gamification | `computeStudyStreak`, XP, coins, levels, fire emojis 🔥 | **INTENTIONALLY REMOVED** | Punitive streak resets cause abandonment. Replaced with factual consistency metrics and immediate Recovery-after-Miss prompts. |
| Recovery after Misses | *None* (streak reset to 0 upon 1 missed day) | **SUPERSEDED / DISCIPLINE UPGRADE** | Schedule-derived recovery state detecting missed scheduled days and offering immediate resume + low-friction minimum version. |
| Habit History & Archiving | Mutating `habitLog` in localStorage; soft delete / archive in store | **PRESERVED & HARDENED** | Soft archive (`status: "archived"`) tracks `activeIntervals` ({startDate, endDate}) so dates before creation or during archive intervals are never marked as missed. |
| Routines (Grouping/Context) | *None* (flat list in sidebar) | **SUPERSEDED** | Lightweight single-source `Routine` entity (`id`, `name`, `contextLabel`, `habitIds`) providing structured routine context without duplicating `routineId` on Habit. |
| Reminders & Web Push | `reminders` map + QStash Web Push | **DEFERRED** | Deferred to subsequent Notifications phase to keep Phase 3 focused on core habit execution and recovery truth. |

---

## 3. Entity Boundaries & Domain Semantics

### 3.1 Habit vs. WorkItem Semantics
- **WorkItem** represents **finite work** (e.g. *"Finish Chemistry Chapter 3 exercises"*). It has an estimate, actual focus minutes, priority, and binary completion.
- **Habit** represents a **repeatable behavior** (e.g. *"Study Chemistry for at least 15 minutes after breakfast"*). It recurs according to a schedule and has daily check-in states.
- **Strict Boundary**: A Habit is **never** collapsed into a WorkItem. Completing a WorkItem does not automatically check in a Habit, and checking in a Habit does not complete a WorkItem.

### 3.2 Habit vs. FocusSession Semantics
- **FocusSession** owns stopwatch/countdown focused-time evidence with pause records and distraction logs.
- **Habit check-in** is the sole canonical habit execution evidence.
- A 45-minute FocusSession on a related task does **not** automatically fabricate a Habit check-in. Habit execution evidence must be recorded directly by the user.

---

## 4. Domain Models & Invariants

### 4.1 Habit Schedule & Revisions
```typescript
export type WeekdayNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1 = Monday, 7 = Sunday (ISO standard)

export interface DailySchedule {
  kind: 'daily';
}

export interface WeekdaySchedule {
  kind: 'weekdays';
  weekdays: WeekdayNumber[]; // Non-empty, unique, sorted 1..7
}

export type HabitSchedule = DailySchedule | WeekdaySchedule;

export interface HabitScheduleRevision {
  effectiveFromDate: string; // YYYY-MM-DD local calendar date
  schedule: HabitSchedule;
}

export interface HabitLifecycleInterval {
  startDate: string; // YYYY-MM-DD local calendar date
  endDate: string | null; // null if open-ended active interval
}
```

### 4.2 Habit Model
```typescript
export type HabitStatus = 'active' | 'archived';

export interface Habit {
  id: string;
  title: string;
  description: string;
  cue: string; // Context trigger, e.g. "After breakfast", "After school"
  minimumVersion: string; // Small fallback version, e.g. "Read 1 paragraph"
  schedule: HabitSchedule;
  scheduleRevisions: HabitScheduleRevision[]; // Chronologically sorted, non-empty
  activeIntervals: HabitLifecycleInterval[]; // Non-empty active periods
  status: HabitStatus;
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
}
```

**Habit Invariants**:
1. `id`: Non-empty trimmed string.
2. `title`: Non-empty trimmed string, 1 to 120 characters.
3. `minimumVersion`: Non-empty trimmed string, 1 to 160 characters.
4. `cue`: Trimmed string, up to 120 characters.
5. `status`: Must be `'active'` or `'archived'`.
6. `activeIntervals`: At least one interval. Open interval (`endDate === null`) only allowed when `status === 'active'`.
7. `scheduleRevisions`: At least one revision. Chronologically ordered `effectiveFromDate`.

### 4.3 Habit Check-In Model
```typescript
export type HabitCheckInKind = 'full' | 'minimum' | 'skipped';

export interface HabitCheckIn {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD local calendar date
  kind: HabitCheckInKind;
  note: string; // Optional context or skip reason (max 280 chars)
  createdAt: string; // ISO 8601 UTC (Audit timestamp preserved on correction)
  updatedAt: string; // ISO 8601 UTC
}
```

**Check-In Invariants**:
1. `id`: Non-empty string.
2. `habitId`: Must reference an existing, active Habit on the check-in date.
3. `date`: Valid local calendar date `YYYY-MM-DD` that falls within an active interval, matches effective schedule recurrence, and is $\le$ current local date.
4. At most **one** check-in record exists per `(habitId, date)`.
5. `kind`: Exactly one of `'full'`, `'minimum'`, or `'skipped'`.
6. Updating same-day check-in preserves `createdAt` immutable creation evidence.

### 4.4 Routine Model
```typescript
export interface Routine {
  id: string;
  name: string;
  contextLabel: string; // e.g. "Morning 07:00", "After School 16:30", "Night 21:00"
  habitIds: string[]; // Ordered list of habit IDs (single source of truth)
  createdAt: string;
  updatedAt: string;
}
```

---

## 5. Persistence & Integrity Rules

1. **Never Silently Omit Corrupt Records**: `GuestHabitRepository` validates records on read. If any row in `habits`, `habitCheckIns`, or `routines` is corrupt or invalid, list operations immediately return `err('corrupt_record', ...)` while leaving the raw stored bytes untouched in IndexedDB.
2. **Schema Upgrade Safety**: Version 3 migration cleanly adds `habits`, `habitCheckIns`, and `routines` stores without modifying or deleting Phase 1 (`workItems`, `dailyPlans`, `timeBlocks`, `dailyCommitments`) or Phase 2 (`focusSessions`, `distractions`) object stores.
3. **Atomic Routine Membership**: `Routine.habitIds` is the single canonical source of routine membership and ordering. Moving a habit across routines or reordering habits executes inside an atomic IndexedDB transaction.

### 5.1 Same-Day Archive Truth
Canonical rule:
- `HabitLifecycleInterval.endDate` is exclusive.
- Archiving on local calendar date D takes effect starting on D+1 (`endDate = shiftLocalDate(archiveDate, 1)`).
- The Habit remains historically active for date D.
- A scheduled opportunity or valid check-in recorded on D must never disappear because the user archives later that day.
- Same-day unarchive must reopen the current interval rather than creating overlapping lifecycle intervals.

Example:
```text
08:00 — Habit scheduled
09:00 — Full check-in
18:00 — Archive Habit

Result:
Today's scheduled opportunity + Full evidence remain in history.
Archive becomes effective tomorrow.
```

### 5.2 Today is Pending, Not Missed
Canonical rule:
```text
past scheduled date + no check-in
= missed

current local date + no check-in
= pending
```
- The current local date must NOT reduce historical consistency before the day has been evaluated.
- Current pending dates are excluded from the evaluated consistency denominator.
- When a Full / Minimum / Skip is recorded for today, today's evidence enters the relevant metrics according to existing semantics.
