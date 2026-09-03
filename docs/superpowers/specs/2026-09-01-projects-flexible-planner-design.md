# Projects & Flexible Planner — Multi-Day Planning & Scheduling Forecast Design Specification

**Phase:** Phase 4  
**Status:** Approved Architecture & Specification  
**Author:** NguyenDukKyeon  
**Date:** 2026-09-01  

---

## 1. Executive Summary & Core Purpose

The purpose of Phase 4 is to extend the Personal Productivity App from immediate daily execution into structured, medium-to-long term planning and forecasting without sacrificing historical truth or discipline invariants established in Phases 1–3.

### 1.1 The Planning & Execution Hierarchy
```text
LONGER-TERM INTENT
     ↓
PROJECTS / ROADMAP (Outcomes & Milestones)
     ↓
BACKLOG (Existing actionable WorkItems without active schedule)
     ↓
7-DAY FLEXIBLE PLAN (Capacity-aware multi-day scheduling & overbooking visibility)
     ↓
DAILY PLAN / TIMEBLOCKS (Today's planned slots)
     ↓
FOCUS & HABIT EXECUTION (Stopwatch evidence & check-ins)
     ↓
REALITY (Derived historical metrics & immutable commitment records)
```

### 1.2 Core Product Thesis
**HIGH DISCIPLINE, LOW FRICTION**

The Flexible Planner and Projects module answers key questions for the user:
- **What am I trying to achieve?** (Projects & Milestones)
- **What work remains?** (WorkItems & Backlog)
- **What should happen this week?** (7-day Flexible Plan)
- **Do I actually have capacity for it?** (Daily capacity vs. scheduled minutes)
- **Where is my plan overloaded?** (Explicit overbooking warnings, e.g. *Overbooked by 60 min*)
- **What can move vs. what is fixed?** (Flexible rescheduling without destroying commitments)
- **What is only a forecast?** (Deterministic completion projection based on estimates and available capacity, not a promised date)

---

## 2. Legacy Smart Planner Inheritance Audit

Audited against `NguyenDukKyeon/smart-planner` (`src/lib/planner.ts`, `src/lib/forecast-view-model.ts`, `src/lib/flexible-schedule-workspace.ts`, `src/lib/roadmap-views.ts`, `src/lib/schedule-projection.ts`, `src/components/FlexiblePlanner.tsx`, `src/components/course-manager/*`):

| Legacy Capability | Legacy Mechanism | Phase 4 Decision | Rationale & Successor Architecture |
|---|---|---|---|
| Project & Subject Definitions | `Subject` with hardcoded/mocked courses & topic hierarchy | **PRESERVED & GENERALIZED** | General-purpose first-class `Project` entity (`id`, `title`, `description`, `status`, `targetDate`, `createdAt`, `updatedAt`, `completedAt`). |
| Milestone / Roadmap Ordering | `Subject.milestones` containing nested `Lesson[]` | **SUPERSEDED** | Canonical `ProjectMilestone` entity (`id`, `projectId`, `title`, `targetDate`, `order`, `status`) providing milestone ordering without duplicating array storage on Project. |
| WorkItem Project Association | `Lesson.sourceSubject` string match | **PRESERVED & HARDENED** | Canonical `WorkItem.projectId: string | null` with strict referential integrity. Creating or updating a WorkItem with an unknown `projectId` is rejected. |
| 7-Day Flexible Planner View | `FlexiblePlanner.tsx` multi-week collapsible views | **PRESERVED & STREAMLINED** | Primary `/planner` route with a focused 7-day rolling window, day cards with capacity vs scheduled time, and responsive backlog column. |
| Multi-Day TimeBlock Scheduling | Fixed date strings on lessons + implicit daily queue | **SUPERSEDED** | Canonical `TimeBlock` entity (`date`, `workItemId`, `startMinute`, `endMinute`). TimeBlock remains the single source of truth for all calendar scheduling across all dates. |
| Unscheduled Backlog | `summarizeUnscheduledWork` derived from lessons with no date | **PRESERVED** | Backlog is derived from `WorkItem` records (status `backlog` or no upcoming TimeBlock). No redundant backlog storage table. |
| Daily Capacity & Default Strategy | `defaultDailyHours` (e.g. 2h) fallback + `dailyHours` overrides | **PRESERVED** | `DailyPlan.capacityMinutes` (0–960 min). If no record exists for a future date, default capacity (480 min / 8h) is used for calculations **without** silently persisting a phantom record. |
| Overbooking Visibility | `overloadMinutes = max(0, scheduled - capacity)` | **PRESERVED** | Planner displays factual overbooking (e.g. `Overbooked by 90 min`). No automated destructive edits or silent block deletions. |
| TimeBlock Overlap Policy | Drag-and-drop allowed arbitrary slot overlapping | **SUPERSEDED / HARDENED** | WorkItem TimeBlocks on the same date **strictly prohibit overlap**. Attempting to schedule an overlapping block returns an error and preserves existing schedule. |
| Schedule Projection & Forecast | Simulation over subjects, fallback minutes, and study sessions | **SUPERSEDED & SIMPLIFIED** | Deterministic `ProjectForecast` simulating unscheduled remaining estimates into future free capacity per day. Explicit status: `on_track`, `at_risk`, or `insufficient_data`. |
| Project Analytics & Charts | Complex velocity charts, review ratios, topic trees | **DEFERRED** | Deferred to subsequent Review & Analytics phases. Phase 4 provides clear factual counters (completed tasks, remaining estimate, scheduled minutes, forecast). |
| Advanced Drag & Drop | HTML5 drag-and-drop with custom drag image | **SUPERSEDED & ACCESSIBLE** | Keyboard-accessible modal and button controls for Move, Schedule, and Unschedule. Drag-and-drop is an enhancement, never a single point of failure. |

---

## 3. Mandatory Domain Boundaries

1. **PROJECT ≠ WORKITEM**:
   - A `Project` is a longer-term container or goal (e.g., *"Grade 11 Chemistry Semester 1"*).
   - A `WorkItem` is a specific unit of executable work (e.g., *"Practice Chapter 3 Exercises"*).
   - Completing a WorkItem does not complete the Project.
   - Completing a Project does not auto-complete its WorkItems.
   - A Project can exist with zero WorkItems.

2. **WORKITEM ≠ TIMEBLOCK**:
   - A `WorkItem` represents actionable work that exists.
   - A `TimeBlock` represents a planned scheduling allocation on a specific local date and time interval.
   - A WorkItem can have zero, one, or multiple TimeBlocks over time.
   - Elapsed TimeBlocks do not mark a WorkItem as completed.

3. **TIMEBLOCK ≠ EXECUTION**:
   - `TimeBlock` represents *planning intention*.
   - `FocusSession` represents *actual focused evidence*.
   - Never infer `WorkItem.actualMinutes` or task completion from scheduled TimeBlocks.

4. **FLEXIBLE PLAN ≠ COMMITMENT SNAPSHOT**:
   - Future plans and today's current plan are flexible and editable.
   - `DailyCommitment` snapshot is immutable historical truth captured when the user commits their day on `/today`.
   - Modifying today's or future TimeBlocks in `/planner` updates the current plan, but **never** mutates or overwrites past or today's committed snapshots. Divergence between current plan and commitment snapshot is made transparent.

5. **FORECAST ≠ PROMISE**:
   - Forecasts are derived mathematical estimations from estimates and available capacity.
   - Language used in UI is always: *"Projected completion"*, *"Estimated remaining"*, *"At current planned capacity"*.
   - UI never guarantees: *"You will finish on..."*.

---

## 4. Domain Models & Invariants

### 4.1 Project Model
```typescript
export type ProjectStatus = 'active' | 'completed' | 'archived';

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  targetDate: string | null; // YYYY-MM-DD local calendar date or null
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
  completedAt: string | null; // ISO 8601 UTC when status is completed
}
```

**Project Invariants**:
1. `id`: Non-empty trimmed string.
2. `title`: Non-empty trimmed string (1 to 140 characters).
3. `description`: Trimmed string (up to 1000 characters).
4. `status`: Must be `'active'`, `'completed'`, or `'archived'`.
5. `targetDate`: Must be null or a valid `YYYY-MM-DD` local calendar date. If target date is in the past and project is active, the project remains active (with UI notice *"Target date passed"*).
6. `completedAt`: Must be a valid ISO 8601 UTC timestamp if `status === 'completed'`, otherwise `null`.
7. `updatedAt >= createdAt`.
8. Archiving a Project is non-destructive: it preserves all linked WorkItems, TimeBlocks, and historical FocusSessions.

### 4.2 Milestone / Roadmap Model
```typescript
export interface ProjectMilestone {
  id: string;
  projectId: string;
  title: string;
  targetDate: string | null; // YYYY-MM-DD local calendar date or null
  order: number; // Non-negative integer for visual roadmap ordering
  status: 'active' | 'completed';
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
  completedAt: string | null; // ISO 8601 UTC
}
```

**Milestone Invariants**:
1. `id`: Non-empty trimmed string.
2. `projectId`: Must reference an existing valid `Project`.
3. `title`: Non-empty trimmed string (1 to 140 characters).
4. `order`: Integer >= 0.
5. `status`: Must be `'active'` or `'completed'`.
6. `completedAt`: Valid ISO string if `status === 'completed'`, else `null`.

### 4.3 WorkItem Relationship & Backlog Semantics
- `WorkItem.projectId`: Canonical link from `WorkItem` to `Project`.
  - When set, it must match an existing `Project.id`.
  - An unknown `projectId` on write returns `err('project_not_found', ...)`.
  - If a stored record contains an unknown `projectId`, it is considered a referential integrity violation and flagged as `corrupt_record`.
- **Backlog Derivation**:
  - `WorkItem.status` values: `'backlog'`, `'scheduled'`, `'in_progress'`, `'completed'`.
  - An uncompleted WorkItem (`status !== 'completed'`) with no upcoming TimeBlocks is in the Backlog.
  - When the first future TimeBlock is added: status moves `backlog` -> `scheduled`.
  - When the last future TimeBlock is removed: status moves `scheduled` -> `backlog`.
  - Existing status `'in_progress'` is preserved when scheduling or unscheduling.

---

## 5. Multi-Day TimeBlock & Capacity Rules

### 5.1 TimeBlock Interval Rules
- Every `TimeBlock` belongs to exactly one local calendar date `YYYY-MM-DD`.
- Bounds: `0 <= startMinute < endMinute <= 1440`.
- Blocks crossing midnight (e.g. 23:00 to 01:00) are **strictly rejected**.
- WorkItem TimeBlocks on the same date **must not overlap**. Overlap detection:
  $$startMinute_A < endMinute_B \land startMinute_B < endMinute_A$$
  Attempting to save an overlapping block returns `err('time_block_overlap', ...)`.

### 5.2 7-Day Flexible Planner View Structure
```typescript
export interface PlannerDayView {
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // e.g. "Mon", "Tue"
  capacityMinutes: number; // Explicit DailyPlan capacity or default 480
  hasExplicitCapacity: boolean; // True if a DailyPlan row exists
  scheduledMinutes: number; // Sum of TimeBlock durations on this date
  remainingMinutes: number; // max(0, capacityMinutes - scheduledMinutes)
  overbookedMinutes: number; // max(0, scheduledMinutes - capacityMinutes)
  isOverbooked: boolean; // scheduledMinutes > capacityMinutes
  timeBlocks: TimeBlock[]; // Sorted by startMinute
}

export interface PlannerView {
  startDate: string; // YYYY-MM-DD
  days: PlannerDayView[]; // 7 consecutive local calendar days
  backlogItems: WorkItem[]; // Uncompleted items with no future blocks
}
```

### 5.3 Capacity Default Strategy
- Canonical rule: Default daily capacity is **480 minutes (8 hours)**.
- Viewing a future day in `/planner` calculates effective capacity as `explicitDailyPlan.capacityMinutes ?? 480`.
- **Zero Phantom Writes**: Merely viewing the planner does **not** persist a `DailyPlan` to IndexedDB. A `DailyPlan` record is only created/updated when the user explicitly changes the day's capacity.

---

## 6. Deterministic Forecast Foundation

### 6.1 Objective & Guarantees
- Estimate whether currently available planning capacity can plausibly cover remaining estimated work.
- **Strictly deterministic**: pure function, no probabilistic simulation, no LLMs, zero random seeds.
- **Zero schedule mutations**: virtual calculation only. The algorithm never creates, alters, or moves actual TimeBlocks.

### 6.2 Forecast Output Model
```typescript
export type ForecastStatus = 'on_track' | 'at_risk' | 'insufficient_data';

export interface ProjectForecast {
  projectId: string;
  totalWorkItems: number;
  completedWorkItems: number;
  remainingEstimatedMinutes: number;
  scheduledMinutesWithinHorizon: number;
  unscheduledEstimatedMinutes: number;
  projectedCompletionDate: string | null; // YYYY-MM-DD or null
  targetDate: string | null;
  status: ForecastStatus;
  riskReason?: string;
}
```

### 6.3 Forecast Algorithm
1. **Calculate Remaining Work**:
   - For all active WorkItems in the project:
     $$itemRemaining = \max(0, item.estimatedMinutes - item.actualMinutes)$$
   - Project remaining estimated minutes = $\sum itemRemaining$.
2. **Handle Edge Cases**:
   - If all items completed or remaining work is 0: `status = 'on_track'`, `projectedCompletionDate = fromDate`.
   - If remaining work has zero estimates or no active items: `status = 'insufficient_data'`, `projectedCompletionDate = null`.
3. **Horizon Simulation**:
   - For each day $d$ starting from `fromDate` up to 365 days:
     - $capacity_d = explicitCapacity_d \text{ ?? } 480$
     - $existingScheduled_d = \sum \text{duration of all TimeBlocks on day } d$
     - $availableFreeCapacity_d = \max(0, capacity_d - existingScheduled_d)$
     - Subtract $availableFreeCapacity_d$ from remaining work.
     - If remaining work reaches $\le 0$, $d$ is the `projectedCompletionDate`. Terminate loop.
4. **Target Date & Risk Evaluation**:
   - If `targetDate` exists:
     - If `projectedCompletionDate` exists and $\le targetDate$: `status = 'on_track'`.
     - If `projectedCompletionDate` exists and $> targetDate$: `status = 'at_risk'`, `riskReason = 'Projected completion exceeds target date'`.
     - If projected completion could not be found within horizon: `status = 'at_risk'`, `riskReason = 'Insufficient capacity within 365-day horizon'`.
   - If `targetDate` is null:
     - If `projectedCompletionDate` exists: `status = 'on_track'`.
     - Otherwise: `status = 'insufficient_data'`.

---

## 7. Multi-Entity Atomicity & Concurrency

### 7.1 IndexedDB Schema Upgrade to Version 4
Guest database is upgraded to version 4 with new object stores:
- `projects`: `{ keyPath: 'id' }`
- `projectMilestones`: `{ keyPath: 'id' }` with index `projectId` on `projectId`.

**Migration Invariant**:
- v3 -> v4 migration must preserve all existing Phase 1, Phase 2, and Phase 3 object stores (`workItems`, `dailyPlans`, `dailyPriorities`, `timeBlocks`, `dailyCommitments`, `meta`, `focusSessions`, `distractions`, `habits`, `habitCheckIns`, `routines`) 100% intact.

### 7.2 Atomic Operations Contract
All multi-entity mutations must occur within a single `readwrite` transaction:
1. **Schedule WorkItem**:
   - Transaction stores: `['timeBlocks', 'workItems']`
   - Action: Add `TimeBlock` + Update `WorkItem.status` from `backlog` to `scheduled` (if currently backlog).
   - If any step fails: entire transaction aborts, neither record is updated.
2. **Remove TimeBlock**:
   - Transaction stores: `['timeBlocks', 'workItems']`
   - Action: Delete `TimeBlock` + check remaining TimeBlocks for the WorkItem; if none, update `WorkItem.status` to `backlog`.
   - If any step fails: entire transaction aborts.
3. **Move TimeBlock**:
   - Transaction store: `['timeBlocks']`
   - Action: Update `TimeBlock` date and time atomically.

---

## 8. Strict Persistence & Corrupt Record Quarantine

1. **Pre-Write Validation**:
   - `saveProject(project)`: validates title, timestamps, targetDate, status.
   - `saveMilestone(milestone)`: validates title, projectId, timestamps, targetDate.
2. **Read-Time Schema Validation**:
   - `listProjects()`, `getProject(id)`, `listMilestones(projectId)` validate every retrieved record against Zod schemas and domain invariants.
   - If any record is corrupt: immediately return `err('corrupt_record', ...)` and **never** delete, mutate, or silently skip the corrupted row.
3. **Referential Integrity**:
   - WorkItem `projectId` must reference an existing valid Project. Unknown project reference causes `project_not_found` on write and `corrupt_record` on list validation.

---

## 9. User Interface & Accessibility Specifications

### 9.1 Projects Screen (`/projects`)
- **Header**: Title, Active / Archived tabs, "New Project" action button.
- **Active Projects List**:
  - Project card: title, target date badge (or *"Target date passed"* if overdue), description snippet.
  - Progress summary: Tasks completed (e.g. `4/10 tasks`), remaining estimate (`240m remaining`), scheduled next 7 days (`120m scheduled`).
  - Forecast indicator: badge for `On Track`, `At Risk`, or `Insufficient Data`.
  - Actions: Edit, Archive, View Details.
- **Project Detail View / Drawer**:
  - Project metadata and target date editor.
  - Milestones section: list milestones, add milestone, mark milestone complete.
  - WorkItems list: add new task under project, quick toggle status, view estimate vs actual focus time.
  - Forecast card: projected finish date and risk explanation.
- **Archived Projects Tab**:
  - List of archived projects with "Unarchive" action button.

### 9.2 Flexible Planner Screen (`/planner`)
- **Header & Navigation**:
  - Horizon selector / date navigator: `[ < Previous Week ] [ Today ] [ Next Week > ]`.
  - Current range display (e.g. `Sep 1 – Sep 7, 2026`).
  - Project filter dropdown: `All Projects` or specific project.
- **7-Day Layout (Desktop side-by-side, Mobile responsive stack)**:
  - 7 day cards:
    - Day header: Day of week, formatted local date, Today badge if today.
    - Capacity bar: capacity in hours, scheduled hours, remaining hours.
    - Overbooked badge (amber/rose) if `scheduledMinutes > capacityMinutes`.
    - Edit capacity button / dialog.
    - TimeBlock items: time range (e.g. `08:00 - 09:30`), WorkItem title, project tag.
    - TimeBlock actions: Move to another date/time, Remove / Unschedule.
- **Backlog Sidebar / Drawer**:
  - List of uncompleted tasks not scheduled in the horizon.
  - Quick action: "Schedule" button opening the Schedule Modal with date & time picker.
- **Accessibility**:
  - All operations (schedule, move, unschedule, capacity edit) are fully operable via keyboard buttons and standard dialogs. No action requires drag-and-drop exclusively.

---

## 10. Acceptance Criteria & Quality Gates

1. **Project Domain**:
   - Valid Project creation, editing, explicit completion, and soft archiving.
   - Rejection of empty titles, invalid local dates, and inconsistent timestamps.
   - Non-destructive archive: linked WorkItems and TimeBlocks remain intact.
2. **Roadmap / Milestone Domain**:
   - Milestones correctly grouped by project, ordered by `order`, with target date.
3. **Planner Domain**:
   - 7-day view correctly aggregates capacity, scheduled minutes, and overbooking.
   - WorkItem TimeBlocks strictly prohibit midnight-crossing and overlapping intervals.
   - Backlog correctly derived from unscheduled WorkItems.
4. **Deterministic Forecast**:
   - Correctly simulates completion date across daily available capacity.
   - Flags `at_risk` when projected date exceeds target date.
   - Flags `insufficient_data` when estimates are missing.
   - Zero side-effects or schedule mutations during forecasting.
5. **Persistence & v4 Migration**:
   - IDB version 4 migration preserves 100% of Phase 1, 2, and 3 data.
   - Atomic scheduling and unscheduling prevent ghost records on simulated transaction failures.
   - Read paths return `corrupt_record` on malformed rows without silent dropping.
6. **Today & Commitment Integration**:
   - Planner changes to today appear immediately on `/today`.
   - Today changes appear immediately on `/planner`.
   - Modifying today's schedule after committing does **not** alter the immutable `DailyCommitment` snapshot.
7. **E2E Playwright Coverage**:
   - 5 comprehensive journeys testing Project creation -> Backlog -> Scheduling -> Multi-day Move -> Overbooking -> Commitment divergence -> Forecast persistence.
