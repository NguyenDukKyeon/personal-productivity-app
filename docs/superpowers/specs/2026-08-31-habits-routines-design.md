# Habits & Routines — Consistency + Recovery Design Specification

**Phase:** Phase 3  
**Status:** Approved Architecture & Specification  
**Author:** NguyenDukKyeon  
**Date:** 2026-08-31  

---

## 1. Executive Summary & Core Objective

The purpose of Phase 3 is to build a high-discipline, low-friction behavior system that makes useful routines easy to start and repeat, records execution reality truthfully, and guides the user to recover immediately after missed days without punitive gamification or streak anxiety.

### Core Product Thesis
**HIGH DISCIPLINE, LOW FRICTION**

Habits exist to support disciplined behavior with minimum friction. The behavioral loop is:
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
| Habit definitions & schedule | `HabitDef` with `dailyTargets` 7-element array (Mon–Sun) | **PRESERVED & STREAMLINED** | Canonical `HabitSchedule` with explicit `daily` or `weekdays` (1=Mon..7=Sun). Clean, typed recurrence without arbitrary magic numbers. |
| Habit check-in | `habitLog[dateISO][habitId]` boolean/number | **SUPERSEDED** | Replaced with explicit `HabitCheckIn` entities distinguishing `full`, `minimum`, and `skipped` with audit timestamps. |
| Minimum Viable Version (MVV) | *None* (all-or-nothing completion) | **SUPERSEDED / DISCIPLINE UPGRADE** | First-class `minimumVersion` property on every habit. When friction is high, reduce the action, not the identity of the habit. |
| Streaks & Gamification | `computeStudyStreak`, XP, coins, levels, fire emojis 🔥 | **INTENTIONALLY REMOVED** | Punitive streak resets cause abandonment. Replaced with factual consistency metrics and immediate Recovery-after-Miss prompts. |
| Recovery after Misses | *None* (streak reset to 0 upon 1 missed day) | **SUPERSEDED / DISCIPLINE UPGRADE** | Schedule-derived recovery state detecting missed scheduled days and offering immediate resume + low-friction minimum version. |
| Habit History & Archiving | Mutating `habitLog` in localStorage; soft delete / archive in store | **PRESERVED & HARDENED** | Soft archive (`status: "archived"`) excludes habits from active today view while preserving all historical check-in records in IndexedDB. |
| Routines (Grouping/Context) | *None* (flat list in sidebar) | **SUPERSEDED** | Lightweight `Routine` grouping entity (`id`, `name`, `contextLabel`, `habitIds`) providing structured morning/after-school/evening context without conflicting with habit recurrence. |
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

### 4.1 Habit Schedule
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
```

**Schedule Invariants**:
1. `daily`: Eligible every calendar day.
2. `weekdays`: Must contain at least one weekday number in `[1..7]`. Duplicate or out-of-range numbers are rejected with `invalid_schedule`.
3. Date eligibility: Deterministically evaluated via local calendar date key `YYYY-MM-DD` and ISO weekday calculation.

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
  routineId: string | null;
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
6. `routineId`: String or `null`.

### 4.3 Habit Check-In Model
```typescript
export type HabitCheckInKind = 'full' | 'minimum' | 'skipped';

export interface HabitCheckIn {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD local calendar date
  kind: HabitCheckInKind;
  note: string; // Optional context or skip reason (max 280 chars)
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
}
```

**Check-In Invariants**:
1. `id`: Non-empty string (format: `checkin_${habitId}_${date}` or unique UUID).
2. `habitId`: Must reference an existing Habit.
3. `date`: Valid local calendar date `YYYY-MM-DD` (verified via `parseLocalDateKey`).
4. At most **one** check-in record exists per `(habitId, date)`.
5. `kind`: Exactly one of `'full'`, `'minimum'`, or `'skipped'`.
6. Changing check-in updates the existing record atomically rather than creating duplicate history.
7. Absence of a check-in is **not** stored as a fake "missed" row; missed opportunities are derived from `(schedule eligibility - existing check-in)`.

### 4.4 Routine Model
```typescript
export interface Routine {
  id: string;
  name: string;
  contextLabel: string; // e.g. "Morning 07:00", "After School 16:30", "Night 21:00"
  habitIds: string[]; // Ordered list of habit IDs
  createdAt: string;
  updatedAt: string;
}
```

**Routine Invariants**:
1. `name`: Non-empty trimmed string (max 60 chars).
2. `habitIds`: Ordered list of habit IDs; habits preserve their own canonical recurrence schedules. A Routine groups and orders habits for execution context without creating a conflicting secondary scheduling engine.

---

## 5. Recovery & Consistency Metrics

### 5.1 Factual Status Derivation
For any active habit on a given local date `D`:
1. **Eligible Today**: `isHabitScheduledForDate(habit.schedule, D)`
2. **Current State on D**:
   - Check-in exists: `Full`, `Minimum`, or `Skipped`
   - No check-in: `Pending` (if today) or `Missed` (if in the past)
3. **Recovery State**:
   - Evaluated by looking backwards from `D` to the *most recent previous scheduled opportunity* `D_prev`.
   - If `D_prev` was scheduled and had **no check-in** (or was skipped), the habit enters **Recovery Mode** for today `D`.
   - Recovery Prompt: *"Missed last occurrence on [date]. Resume today."* with a prominent one-click **Minimum Viable Version** action.

### 5.2 Truthful Consistency Metrics (Window-based, e.g. Last 7 Days / 30 Days)
- `scheduledDays`: Number of calendar days in the window where the habit was scheduled.
- `fullCompletions`: Count of check-ins with `kind === 'full'`.
- `minimumCompletions`: Count of check-ins with `kind === 'minimum'`.
- `explicitSkips`: Count of check-ins with `kind === 'skipped'`.
- `missedOpportunities`: `scheduledDays - (fullCompletions + minimumCompletions + explicitSkips)`.
- `consistencyRate`: `(fullCompletions + minimumCompletions) / scheduledDays * 100` (or 0% if 0 scheduled days).
- `recoveredCount`: Number of times the user successfully completed (full or minimum) immediately after a missed opportunity.

---

## 6. Persistence & Storage Architecture

### 6.1 IndexedDB Schema Version 3
Upgrade database `personal-productivity-guest` from `GUEST_DB_VERSION = 2` to `GUEST_DB_VERSION = 3`.

```typescript
export interface GuestTodayDB extends DBSchema {
  // Existing Phase 1 stores:
  workItems: { key: string; value: unknown };
  dailyPlans: { key: string; value: unknown; indexes: { date: string } };
  dailyPriorities: { key: string; value: unknown; indexes: { dailyPlanId: string } };
  timeBlocks: { key: string; value: unknown; indexes: { date: string; workItemId: string } };
  dailyCommitments: { key: string; value: unknown; indexes: { date: string } };
  meta: { key: string; value: unknown };
  // Existing Phase 2 stores:
  focusSessions: { key: string; value: unknown; indexes: { workItemId: string; status: string } };
  distractions: { key: string; value: unknown; indexes: { focusSessionId: string } };
  // New Phase 3 stores:
  habits: {
    key: string;
    value: unknown;
    indexes: { status: string; routineId: string };
  };
  habitCheckIns: {
    key: string;
    value: unknown;
    indexes: { habitId: string; date: string; habitId_date: [string, string] };
  };
  routines: {
    key: string;
    value: unknown;
  };
}
```

### 6.2 Concurrency & Uniqueness Guarantees
- Compound unique index `habitId_date` on `['habitId', 'date']` in `habitCheckIns`.
- Atomic read-modify-write transactions in IndexedDB when inserting/updating check-ins or reordering routine habit IDs.
- Corrupt row quarantine: invalid stored JSON or unparseable records are quarantined as `corrupt_record` and never destroy adjacent valid history.

---

## 7. Application Service Interface

```typescript
export interface HabitTodayItem {
  habit: Habit;
  isScheduledToday: boolean;
  checkIn: HabitCheckIn | null;
  isRecovery: boolean;
  lastScheduledDate: string | null;
  lastCheckIn: HabitCheckIn | null;
}

export interface HabitsView {
  date: string;
  items: HabitTodayItem[];
  routines: Array<{
    routine: Routine;
    items: HabitTodayItem[];
  }>;
  unassignedItems: HabitTodayItem[];
  archivedHabits: Habit[];
  metricsSummary: {
    totalScheduledToday: number;
    completedToday: number;
    minimumToday: number;
    pendingToday: number;
  };
}

export interface HabitService {
  getHabitsView(dateKey: string): Promise<Result<HabitsView, HabitError>>;
  createHabit(input: CreateHabitInput): Promise<Result<Habit, HabitError>>;
  updateHabit(id: string, patch: UpdateHabitInput): Promise<Result<Habit, HabitError>>;
  archiveHabit(id: string): Promise<Result<Habit, HabitError>>;
  unarchiveHabit(id: string): Promise<Result<Habit, HabitError>>;
  recordCheckIn(input: RecordCheckInInput): Promise<Result<HabitCheckIn, HabitError>>;
  clearCheckIn(habitId: string, dateKey: string): Promise<Result<void, HabitError>>;
  getHabitHistory(habitId: string, limitDays?: number): Promise<Result<HabitCheckIn[], HabitError>>;
  createRoutine(input: CreateRoutineInput): Promise<Result<Routine, HabitError>>;
  updateRoutine(id: string, patch: UpdateRoutineInput): Promise<Result<Routine, HabitError>>;
  deleteRoutine(id: string): Promise<Result<void, HabitError>>;
}
```

---

## 8. User Interface & Experience Architecture

### 8.1 Navigation & Screen Structure
- Route: `/habits`
- Navigation in `Sidebar.tsx`:
  - `Today` (`/today`)
  - `Focus` (`/focus`)
  - `Habits` (`/habits`)

### 8.2 Habit Screen Sections
1. **Habits Today Header**: Date selector, summary badges (`X/Y Completed Today`, `Z in Recovery`).
2. **Routine Groups**: Collapsible cards for Morning, After School, Night routines containing their ordered habits.
3. **Stand-alone Habits**: Habits not attached to a routine.
4. **Habit Card**:
   - Title & Cue context badge (e.g. 📍 *After breakfast*)
   - Target vs Minimum description:
     - **Normal**: Full habit description
     - **Low Friction**: Minimum viable version (e.g. ⚡ *Read 1 paragraph*)
   - Check-in Buttons:
     - `[✓ Full]` (Emerald button)
     - `[⚡ Minimum]` (Amber button)
     - `[Skip]` (Muted dropdown/button with optional reason)
     - If checked in: Shows current status badge with `[Undo]` button.
   - Recovery Banner (if missed last time):
     - *"Missed on [Day]. Resume today with a small start."*
5. **Habit Creation & Management Modal**: Quick title, cue, minimum viable version, schedule picker (Daily or Weekdays), routine assignment.
6. **Habit History Drawer/Section**: Factual timeline of past check-in evidence without punitive streaks.

---

## 9. Verification & Acceptance Criteria

1. **Domain Test Suite**:
   - Habit creation, title trimming, non-empty minimum version validation.
   - Recurrence calculation across local calendar dates (positive UTC offsets like Vietnam UTC+7).
   - Check-in state transitions (`full`, `minimum`, `skipped`, undo).
   - Recovery state derivation based on schedule and past execution truth.
   - Soft archive preserving historical check-ins.
2. **Persistence Suite**:
   - DB upgrade from version 2 to 3 preserves all Phase 1 (`dailyPlans`, `workItems`, `timeBlocks`) and Phase 2 (`focusSessions`, `distractions`) records.
   - Atomic check-in updates prevent duplicate records for same `(habitId, date)`.
   - Corrupt record isolation.
3. **Application & UI Suite**:
   - Render habits scheduled today with cue and minimum viable version.
   - Check in as `Full` and `Minimum` updating UI state and metrics.
   - Display supportive recovery banner when previous occurrence was missed.
   - Form persistence errors preserve entered input.
4. **Playwright E2E**:
   - Journey 1: Create daily habit with cue and minimum version -> check in Full -> reload -> check-in persists.
   - Journey 2: Create habit -> check in Minimum -> reload -> UI displays Minimum (truthful, not fake Full).
   - Journey 3: Weekday habit with missed past day -> loads today showing Recovery message -> check in Minimum -> recovered state reflected.
   - Journey 4: Create routine -> group habits -> reorder/view -> reload preserves routine configuration.

---

## 10. Self-Review Checklist

- [x] **No duplicated source of truth**: Habit owns recurrence; Routine only groups.
- [x] **No fake completions**: Minimum check-in is strictly distinguished from Full check-in.
- [x] **No punitive streak mechanics**: Replaced with factual consistency and recovery speed.
- [x] **Safe local dates**: All calendar date logic uses `LocalDate` YYYY-MM-DD without UTC day drift.
- [x] **No ambiguous missing vs skipped**: Absence of record = missed opportunity; `skipped` = explicit user intent.
- [x] **Immutable past evidence**: Archiving a habit preserves its historical check-ins.
- [x] **No duplicate same-day check-ins**: Compound index and atomic transaction enforce at most one check-in per habit per day.
- [x] **Decoupled from WorkItem and FocusSession**: Independent execution evidence.
