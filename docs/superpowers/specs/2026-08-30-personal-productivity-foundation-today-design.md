# Personal Productivity OS — Foundation + Today Workstation Design

**Date:** 2026-08-30  
**Status:** Proposed implementation design — approved architectural direction, pending written-spec review  
**Repository:** `NguyenDukKyeon/personal-productivity-app`  
**Legacy source:** `NguyenDukKyeon/smart-planner`

## 1. Purpose

Build a clean successor to Smart Planner using **Clean Rebuild + Selective Port**.

The new product keeps valuable domain knowledge and regression lessons from the legacy application, but it does **not** copy the legacy UI/router/storage architecture wholesale. The first implementation slice is deliberately small enough to review and verify end-to-end:

1. project foundation;
2. domain contracts;
3. guest persistence;
4. Today Workstation;
5. production quality gates.

The slice must finish as working software, not as scaffolding for future features.

## 2. Product principle

The product follows **High Discipline, Low Friction**.

The system optimizes for real execution data:

- committed work;
- actual work completed;
- time capacity;
- scheduled time;
- deep-work evidence;
- consistency over time.

It does **not** use XP, levels, shops, fake currency, loot, or other reward mechanics that can become substitutes for real progress.

## 3. Scope of this design

### 3.1 In scope

This spec covers the first vertical slice:

- Next.js App Router foundation;
- TypeScript strict mode;
- Tailwind CSS v4;
- shadcn/ui-compatible component foundation;
- responsive application shell;
- domain types and invariants for Projects, Work Items, Daily Plans, and Time Blocks;
- repository interfaces independent of storage technology;
- local guest persistence with versioned data;
- safe load/write behavior for corrupt or unavailable browser persistence;
- Today Workstation;
- daily capacity from 0 to 16 hours;
- Top 1–3 priorities;
- task creation and completion;
- basic time-block creation/edit/delete for the current day;
- overbooking calculation;
- persistence across reloads;
- test, lint, typecheck, build, and CI gates.

### 3.2 Explicitly out of scope for the first implementation plan

The architecture must leave clean extension points for these features, but this plan does not implement them:

- Supabase Auth and cloud sync;
- Realtime sync;
- full Projects/Roadmaps UI;
- Focus Station and timer;
- Habits and routines;
- Planner multi-day drag-and-drop;
- Daily Shutdown;
- Weekly Review;
- AI task decomposition;
- AI coach;
- PWA install/offline service worker;
- Web Push;
- legacy Smart Planner import;
- charts and analytics.

These become separate sub-project specs/plans after the Foundation + Today slice is stable.

## 4. Why this is a rebuild instead of a port

The legacy Smart Planner is a functioning TanStack Start/Vite application with substantial domain logic and tests. It is useful as behavioral evidence, but the new product has materially different architectural goals:

- Next.js App Router instead of TanStack routing;
- repository boundaries instead of product components talking directly to browser persistence;
- an eventual local/cloud dual persistence model;
- normalized entities for time blocks and daily priorities;
- feature-oriented UI boundaries;
- a future authenticated multi-device model.

Directly porting the legacy route/component tree would preserve coupling that the rebuild is intended to remove.

## 5. Selective-port policy

Legacy code is classified into three categories.

### 5.1 Port behavior, then reimplement behind new interfaces

Use legacy tests and logic as behavioral references where they remain valid:

- daily capacity constraints;
- date normalization lessons;
- scheduling invariants;
- storage corruption/recovery behavior;
- transaction/rollback lessons;
- task/progress calculations.

Do not copy modules blindly. Recreate the smallest equivalent domain function in the new architecture, test-first.

### 5.2 Preserve concepts, redesign implementation

These concepts survive but receive a new implementation:

- Today planning;
- scheduling;
- storage;
- progress recording;
- backup/import boundaries;
- forecasting inputs.

### 5.3 Do not port

Do not carry forward:

- legacy route architecture;
- oversized route/page components;
- product state coupled directly to localStorage keys;
- Lovable-specific runtime/error-reporting dependencies;
- UI-specific regression contracts that conflict with the new design system;
- redundant fields created only to satisfy the old presentation layer.

## 6. Target stack

### Required for this slice

- Next.js 15+ App Router
- React 19
- TypeScript strict mode
- Tailwind CSS v4
- shadcn/ui-compatible primitives
- Lucide icons
- Zod for runtime validation
- Zustand only for short-lived client UI state when local component state is insufficient
- Vitest for domain/unit tests
- React Testing Library for focused component behavior
- Playwright for the critical Today user journey

### Deferred

- Supabase
- Vercel AI SDK
- provider SDKs
- Framer Motion
- Howler/Web Audio
- PWA tooling

Deferred dependencies must not be installed just because they appear in the long-term product vision.

## 7. Architectural rules

1. **Domain logic must not import React, Next.js, browser storage, or Supabase.**
2. **Pages compose features; pages do not own business rules.**
3. **Features do not call localStorage directly.**
4. **Persistence is accessed through repository interfaces.**
5. **Runtime persistence data is validated at the boundary.**
6. **Mutation functions return explicit success/failure results where data loss is possible.**
7. **A storage failure must never be interpreted as an empty dataset.**
8. **Dates used for daily planning are local calendar dates, not UTC-day shortcuts.**
9. **Time accounting has one canonical unit internally: integer minutes.**
10. **No production feature code is written before its failing test, except generated/config-only files where TDD is not meaningful.**

## 8. Recommended project structure

```text
personal-productivity-app/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   └── today/page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── features/
│   │   └── today/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── application/
│   │       └── index.ts
│   ├── domain/
│   │   ├── work-items/
│   │   ├── daily-plans/
│   │   ├── time-blocks/
│   │   ├── capacity/
│   │   └── shared/
│   ├── infrastructure/
│   │   └── persistence/
│   │       ├── contracts/
│   │       └── guest/
│   ├── components/
│   │   ├── ui/
│   │   └── shell/
│   └── test/
│       └── fixtures/
├── e2e/
├── docs/
│   └── superpowers/
│       ├── specs/
│       └── plans/
└── .github/workflows/
```

### File-size guidance

There is no hard line-count rule, but files should have one clear responsibility. A feature page that grows into a multi-thousand-line controller is a design failure. Split by behavior boundary, not by arbitrary component count.

## 9. Domain model

### 9.1 Identifier strategy

Use string UUIDs generated by `crypto.randomUUID()` at creation time.

All entities have stable IDs before persistence. This allows guest data to migrate to cloud storage later without changing identity semantics.

### 9.2 Project

```ts
export type ProjectStatus = "active" | "archived" | "completed";

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}
```

Project UI is deferred, but `projectId` is part of the work-item model from the beginning so the data model does not require a destructive rewrite later.

### 9.3 Work Item

```ts
export type WorkItemType = "task" | "lesson" | "milestone";
export type WorkItemPriority = "p1_urgent" | "p2_high" | "p3_medium" | "p4_low";
export type WorkItemStatus = "backlog" | "scheduled" | "in_progress" | "completed";

export interface WorkItem {
  id: string;
  projectId: string | null;
  title: string;
  notes: string;
  type: WorkItemType;
  estimatedMinutes: number;
  actualMinutes: number;
  priority: WorkItemPriority;
  status: WorkItemStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### 9.4 Daily Plan

`top_3_item_ids uuid[]` is intentionally rejected as the long-term persistence design because arrays do not provide a normalized relationship or stable ordering constraints in relational storage.

Domain representation:

```ts
export interface DailyPlan {
  id: string;
  date: string; // YYYY-MM-DD in the user's local calendar
  capacityMinutes: number;
  morningIntention: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyPriority {
  id: string;
  dailyPlanId: string;
  workItemId: string;
  rank: 1 | 2 | 3;
}
```

In the future Supabase schema, `daily_priorities` becomes a table with uniqueness constraints for `(daily_plan_id, rank)` and `(daily_plan_id, work_item_id)`.

### 9.5 Time Block

Scheduling is normalized into its own entity instead of embedding one start time in a work item.

```ts
export interface TimeBlock {
  id: string;
  date: string;
  workItemId: string | null;
  habitId: string | null;
  startMinute: number; // minute from midnight, 0..1439
  endMinute: number;   // exclusive, 1..1440
  createdAt: string;
  updatedAt: string;
}
```

For this slice only `workItemId` is used; `habitId` remains `null` until Habits is implemented.

Invariants:

- exactly one target must eventually be present (`workItemId` xor `habitId`);
- `startMinute < endMinute`;
- both bounds must remain within one local calendar day;
- overlapping blocks are allowed initially but visibly flagged;
- a work item may have multiple blocks on the same or different days.

## 10. Capacity model

Canonical capacity is integer minutes.

Rules:

- minimum: `0` minutes;
- maximum: `960` minutes (16 hours);
- UI step: `30` minutes;
- values above `720` minutes (12 hours) are allowed but show a non-blocking caution;
- invalid persisted values fail validation rather than silently clamp.

Derived values:

```ts
scheduledMinutes = sum(duration of today's time blocks)
remainingMinutes = capacityMinutes - scheduledMinutes
isOverbooked = remainingMinutes < 0
```

The UI may format values as hours/minutes, but domain functions accept and return minutes.

## 11. Today Workstation behavior

### 11.1 Required page sections

The first production page contains:

1. **Today header** — local date and short daily status;
2. **Capacity card** — capacity, scheduled time, remaining time, overbooking state;
3. **Top Priorities** — ranked Top 1–3 work items;
4. **Today Tasks** — work items relevant to the current day;
5. **Timeline** — time blocks for today;
6. **Quick Capture** — create a simple task with title, estimate, and priority.

### 11.2 Quick task capture

The first slice supports direct fields, not smart command syntax.

Required fields:

- title;
- estimated duration;
- priority.

Defaults:

- type = `task`;
- status = `backlog`;
- projectId = `null`;
- notes = empty string;
- actualMinutes = 0.

Smart syntax (`/project`, `~45m`, `!p1`) is deferred until the base task flow is stable.

### 11.3 Top priorities

Rules:

- zero to three priorities may exist;
- each selected item appears once;
- ranks are contiguous from 1;
- removing rank 2 from `[1,2,3]` compacts the remaining priorities to `[1,2]`;
- completed tasks may remain visible in the priorities list for the current day, clearly marked complete;
- a user may replace/reorder priorities without mutating the work item itself.

### 11.4 Task completion

Completing a task:

- changes status to `completed`;
- sets `completedAt` to the current ISO timestamp;
- keeps time blocks as historical scheduling evidence;
- does not infer actualMinutes from scheduled duration.

Reopening a task:

- returns status to `scheduled` if future/today blocks exist, otherwise `backlog`;
- clears `completedAt`.

Actual focus time will later be recorded by Focus Sessions, not fabricated from task completion.

### 11.5 Time blocks

The first slice supports create, edit, and delete through explicit controls. Drag-and-drop is deferred.

Time-block validation must reject:

- end <= start;
- start < 0;
- end > 1440;
- missing target;
- unknown workItemId.

Overlaps produce a warning, not a failed mutation.

## 12. Application-service boundary

React components call feature application services/hooks, not repositories directly wherever a mutation spans more than one entity.

Example operations:

```ts
createTask(input): Promise<Result<WorkItem>>
setDailyCapacity(date, minutes): Promise<Result<DailyPlan>>
setDailyPriorities(date, workItemIds): Promise<Result<DailyPriority[]>>
completeTask(workItemId, completedAt): Promise<Result<WorkItem>>
reopenTask(workItemId): Promise<Result<WorkItem>>
createTimeBlock(input): Promise<Result<TimeBlock>>
updateTimeBlock(id, patch): Promise<Result<TimeBlock>>
deleteTimeBlock(id): Promise<Result<void>>
getTodayView(date): Promise<Result<TodayViewModel>>
```

A shared result type prevents expected persistence failures from being turned into unhandled exceptions:

```ts
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string };
```

## 13. Repository contracts

The domain/application layer depends on interfaces such as:

```ts
export interface WorkItemRepository {
  list(): Promise<Result<WorkItem[]>>;
  get(id: string): Promise<Result<WorkItem | null>>;
  save(item: WorkItem): Promise<Result<void>>;
  remove(id: string): Promise<Result<void>>;
}

export interface DailyPlanRepository {
  getByDate(date: string): Promise<Result<DailyPlan | null>>;
  save(plan: DailyPlan): Promise<Result<void>>;
}

export interface DailyPriorityRepository {
  listByPlan(planId: string): Promise<Result<DailyPriority[]>>;
  replaceForPlan(planId: string, priorities: DailyPriority[]): Promise<Result<void>>;
}

export interface TimeBlockRepository {
  listByDate(date: string): Promise<Result<TimeBlock[]>>;
  save(block: TimeBlock): Promise<Result<void>>;
  remove(id: string): Promise<Result<void>>;
}
```

The exact method grouping may be simplified during the implementation plan if a smaller interface gives the same isolation. The architectural invariant is that feature/domain code cannot know whether data came from browser persistence or Supabase.

## 14. Guest persistence design

### 14.1 Storage choice

Use **IndexedDB** as the primary guest store for normalized application entities.

Rationale:

- the product will accumulate structured records over time;
- entity-level writes are preferable to rewriting one large JSON blob;
- IndexedDB is a more appropriate long-term local data store than many unrelated localStorage keys;
- future import/export can take a consistent snapshot of normalized stores.

Use localStorage only for tiny non-critical UI preferences if needed later.

### 14.2 Versioned database

Initial database name:

`personal-productivity-guest`

Initial logical stores:

- `workItems`;
- `dailyPlans`;
- `dailyPriorities`;
- `timeBlocks`;
- `meta`.

`meta` includes a schema version and migration metadata.

### 14.3 Validation

Every record loaded from IndexedDB is validated with Zod before it becomes a domain object.

Invalid records:

- are not silently dropped;
- generate a structured persistence error;
- remain untouched in storage so recovery/export remains possible;
- block only the affected query where possible, not the entire application shell.

### 14.4 Safe mutations

A mutation that updates multiple stores must run in one IndexedDB transaction.

Examples:

- replacing all priorities for a day;
- deleting an item in a future feature when dependent relationships also require changes.

The transaction either commits fully or aborts.

This preserves the key lesson from the legacy app's verified-write/snapshot behavior without copying its localStorage implementation.

## 15. Local date policy

Daily planning must never derive a calendar date using `new Date().toISOString().slice(0, 10)` because that is a UTC date and can be wrong for the user's local day.

Provide explicit helpers:

```ts
toLocalDateKey(date: Date): string
parseLocalDateKey(value: string): LocalDateParts | null
```

Tests must cover at least a positive UTC offset representative of Asia/Bangkok/Vietnam and a date near midnight.

## 16. Future Supabase mapping

Cloud implementation is deferred, but local types must map cleanly to the future relational model.

Expected tables:

- `profiles` (`id` references `auth.users.id`);
- `projects`;
- `work_items`;
- `daily_plans`;
- `daily_priorities`;
- `time_blocks`;
- later: `habits`, `habit_logs`, `focus_sessions`, `daily_reflections`.

Important future constraints:

- unique `daily_plans(user_id, date)`;
- unique `daily_priorities(daily_plan_id, rank)`;
- unique `daily_priorities(daily_plan_id, work_item_id)`;
- RLS requires `user_id = auth.uid()` for user-owned rows;
- authenticated sync must not rewrite entity IDs created in guest mode.

## 17. UI/UX direction

The UI should feel like a focused workstation rather than an analytics dashboard full of cards.

### Visual hierarchy

1. what must be done today;
2. whether today's plan fits available time;
3. when work is scheduled;
4. secondary controls/settings.

### Interaction principles

- primary actions remain visible without opening multiple dialogs;
- keyboard use is first-class for quick capture;
- desktop has a persistent sidebar shell;
- mobile uses a compact navigation pattern without shrinking desktop UI mechanically;
- destructive actions require an undo path or confirmation where appropriate;
- errors say what failed and whether data was preserved;
- motion is optional polish, not a dependency for understanding state.

### Accessibility baseline

- semantic labels for controls;
- visible keyboard focus;
- no color-only status communication;
- minimum touch target appropriate for mobile;
- reduced-motion compatibility when motion is introduced later.

## 18. State ownership

Use the smallest state scope possible.

- Form field state: local component state / React Hook Form if justified.
- Remote/local entity data: repository-backed query layer.
- Temporary UI state such as open panels: local state or small Zustand store.
- Business state must not live only in Zustand.

Do not introduce a monolithic global app store.

## 19. Error handling

Expected failure classes:

- validation error;
- persistence unavailable;
- persistence transaction failure;
- corrupt stored record;
- unknown entity reference;
- invalid time block;
- invalid capacity;
- UI/runtime unexpected failure.

The UI should distinguish recoverable user input errors from persistence failures.

A persistence failure message must state that the requested write did not complete. The UI must not optimistically display a successful mutation after a failed transaction.

## 20. Data preservation rules

1. Never overwrite unreadable persisted data during application boot.
2. Never auto-reset the guest database because validation fails.
3. A factory reset feature is deferred and must later require explicit user action.
4. Import/migration must later preview and validate before replacing current data.
5. Legacy migration must preserve the source export untouched.

## 21. Testing strategy

### 21.1 Domain/unit tests

Required first-slice coverage:

- capacity min/max/step validation;
- overbooking calculation;
- local date key correctness;
- priority uniqueness/ranking/compaction;
- work-item completion/reopen behavior;
- time-block bounds and duration;
- overlap detection;
- Today view-model aggregation.

### 21.2 Persistence tests

Use a deterministic IndexedDB test environment.

Cover:

- create/read/update/delete per store;
- persistence across repository re-instantiation;
- invalid record handling;
- failed multi-store transaction does not leave partial state;
- priority replacement is atomic.

### 21.3 Component tests

Test meaningful behaviors, not snapshots:

- creating a task adds it to Today;
- selecting priorities enforces max three;
- changing capacity updates remaining/overbooking state;
- completing a task changes visible status;
- invalid time block is rejected with a useful message.

### 21.4 E2E acceptance flow

The production-critical path is:

1. open `/today` as a new guest;
2. set capacity to 5 hours;
3. create at least three tasks;
4. choose Top 3;
5. schedule at least one task with a time block;
6. observe remaining capacity;
7. complete a task;
8. reload the browser;
9. verify tasks, priorities, capacity, time block, and completion state persisted correctly.

A second E2E test must create an overbooked day and verify the warning appears without blocking the schedule.

## 22. Quality gates

All must pass before the first slice is called complete:

```bash
bun run typecheck
bun run lint
bun test
bun run build
bun run e2e
```

CI runs the same checks from committed source without mutation scripts that rewrite application files before validation.

The build must not depend on secret environment variables for this guest-only slice.

## 23. CI design

Initial GitHub Actions workflow:

- install using the committed lockfile;
- run typecheck;
- run lint;
- run unit/component tests;
- run production build;
- run Playwright critical flow in a browser job.

Avoid a build command that implicitly runs tests if CI already runs tests explicitly; each gate should fail independently with a clear reason.

## 24. Security and privacy baseline

For the first slice:

- no API keys;
- no analytics SDK by default;
- no network persistence;
- no hidden upload of guest data;
- no secrets embedded in the client bundle.

Future BYOK support must not store provider secrets in Supabase by default. Provider integrations require their own security review/spec.

## 25. Performance baseline

The Today page should not require loading future heavy modules.

Requirements:

- feature-level code split where Next.js naturally provides it;
- no charting library in the initial bundle;
- no AI/provider SDK in the initial bundle;
- no audio dependency in the initial bundle;
- repository queries scoped to the data needed for Today.

## 26. Future subsystem boundaries

After this slice, follow-up specs should be implemented in this order unless evidence changes the priority:

1. **Focus Station** — timer state machine, focus sessions, distraction braindump, actual-minute evidence;
2. **Habits & Routines** — habit schedule, logs, consistency, Never Miss Twice;
3. **Projects + Flexible Planner** — roadmap hierarchy, backlog, multi-day planning, forecast;
4. **Legacy Migration** — Smart Planner export parser, preview, atomic import, verification;
5. **Shutdown + Weekly Review** — reflections, metrics, discipline score;
6. **Cloud Sync** — Supabase Auth, RLS, guest-account migration, conflict policy;
7. **AI boundary** — decomposition and coaching with provider abstraction/BYOK;
8. **PWA + Notifications** — offline behavior and push scheduling.

Each subsystem gets a separate design/implementation plan and must produce independently testable software.

## 27. Acceptance criteria for Foundation + Today

The slice is accepted only when all statements are true:

- repository contains a clean Next.js application;
- `/today` is the primary working screen;
- user can create tasks;
- user can set daily capacity from 0 to 16 hours in 30-minute increments;
- user can choose and reorder at most three priorities;
- user can create/edit/delete today's time blocks;
- UI calculates scheduled and remaining time correctly;
- overbooking is visible but non-blocking;
- user can complete and reopen tasks;
- reload preserves all first-slice data;
- corrupt persistence does not silently erase itself;
- no product component calls localStorage directly;
- domain logic is independent of React/Next/persistence;
- tests cover core invariants;
- typecheck passes;
- lint passes;
- unit/component tests pass;
- production build passes;
- critical Playwright flow passes;
- CI passes from a clean checkout.

## 28. Decisions deliberately deferred

The following are not unresolved requirements for this slice; they are explicitly deferred decisions to later subsystem specs:

- exact Supabase conflict-resolution policy;
- detailed guest-to-account merge UX;
- AI provider/model list;
- Discipline Score formula;
- habit streak grace policy beyond the high-level Never Miss Twice concept;
- push provider/scheduler;
- ambient sound catalogue;
- full smart-capture command grammar;
- multi-day drag-and-drop library;
- production analytics/telemetry provider.

Deferral is intentional to avoid designing unused abstractions before their constraints are known.

## 29. Self-review notes

### Placeholder scan

No implementation-critical `TBD`, `TODO`, or unspecified mandatory behavior remains in the Foundation + Today scope.

### Internal consistency

- Internal time values use minutes everywhere.
- Daily scheduling is represented by `TimeBlock`, not by a single field on `WorkItem`.
- Top priorities are normalized as separate `DailyPriority` records.
- Guest persistence is IndexedDB; localStorage is not the entity store.
- Supabase is an extension behind repository interfaces, not a direct dependency of the first slice.

### Scope check

The original product vision contains multiple independent subsystems. This spec intentionally limits implementation to Foundation + Today and names future subsystem boundaries rather than putting them into one mega-plan.

### Data-loss check

The design explicitly rejects silent reset, silent clamping of invalid persisted data, and treating persistence failures as empty data.

## 30. Implementation handoff condition

Do not create the implementation plan or production code until the user has reviewed this written spec and explicitly approved proceeding from it.
