# Personal Productivity OS — Smart Planner Reborn Design

**Date:** 2026-08-30  
**Status:** Design v2 — approved direction, pending final written-spec review  
**Repository:** `NguyenDukKyeon/personal-productivity-app`  
**Behavioral baseline:** `NguyenDukKyeon/smart-planner`

## 1. Product thesis

Build **Smart Planner Reborn** as a **Behavior-Preserving Rebuild + Discipline Upgrade**.

This is not a generic productivity app and not a visual rewrite of Smart Planner. The new product must preserve the behaviors that made Smart Planner useful while replacing implementation debt and adding a discipline system that improves the probability that a plan becomes real work.

The core loop is:

```text
PLAN
  ↓
COMMIT
  ↓
START
  ↓
FOCUS / EXECUTE
  ↓
RECORD REALITY
  ↓
RECOVER FROM MISSES
  ↓
REVIEW
  ↓
ADAPT THE NEXT PLAN
```

The product cannot guarantee human discipline. It can, however, guarantee that its design:

- reduces friction to decide what to do next;
- makes commitments explicit;
- makes starting cues concrete;
- records planned versus actual behavior;
- prevents silent rollover and silent plan rewriting;
- treats misses as diagnostic data rather than punishment;
- creates recovery actions after repeated avoidance;
- helps the user protect realistic work blocks;
- gives weekly feedback based on observed behavior rather than motivational filler.

## 2. Product principle: High Discipline, Low Friction

The product optimizes for **real execution**, not engagement with the app itself.

Primary evidence of progress:

- planned minutes versus actual focused minutes;
- commitment completion;
- start reliability;
- task carry-over;
- focus-session completion;
- interruption/distraction evidence;
- habit consistency;
- estimation accuracy;
- recovery after misses;
- progress against projects/roadmaps.

The product must not use XP, loot, virtual currency, shops, arbitrary levels, punishment streaks, or decorative gamification as substitutes for real progress.

A streak may be displayed only when it represents a meaningful repeated behavior and must never imply that one miss erases prior progress.

## 3. Smart Planner is the behavioral baseline

The legacy Smart Planner is not merely a source-code repository to mine for helpers. Its existing product behaviors are the inheritance baseline.

The rebuild must preserve or intentionally supersede the following capability families:

1. **Daily capacity** — realistic available-time budgeting from 0 to 16 hours, with caution above 12 hours rather than a hard block.
2. **Flexible planning and scheduling** — work can be placed into time, moved, forecast, and reconciled with capacity.
3. **Focus sessions** — planned work becomes timed execution evidence.
4. **Habit tracking** — repeated behaviors remain first-class rather than being modeled as ordinary tasks.
5. **Projects, learning roadmaps, and progress** — the system can represent structured work, not only flat todos.
6. **Weekly metrics/review** — historical behavior is summarized and used to adapt future planning.
7. **PWA / reminders / Web Push** — the system can prompt planned behavior even when the app is not actively open.
8. **Backup and migration** — local user data must be preservable and migratable.
9. **Existing domain invariants and regression lessons** — scheduling, capacity, storage safety, date handling, focus-state behavior, progress calculations, and weekly metrics are behavioral evidence.

A capability may be redesigned, split, or renamed, but it must not disappear accidentally during the rebuild.

## 4. Rebuild policy

### 4.1 Preserve behavior, replace implementation

Use legacy tests, domain logic, and user-visible behavior as references.

Reimplement the smallest equivalent behavior behind the new architecture, test-first.

Examples:

- capacity constraints;
- scheduling invariants;
- focus timing semantics;
- date normalization;
- progress calculations;
- safe persistence behavior;
- weekly calculations;
- roadmap/lesson placement rules.

### 4.2 Preserve concepts, improve the product loop

These Smart Planner concepts survive but gain discipline behavior:

- Today planning becomes **Daily Commitment**;
- focus sessions become **Execution Evidence**;
- habit tracking gains **Context + Minimum Version + Recovery**;
- weekly metrics become **Adaptive Weekly Review**;
- rescheduling gains **Miss Reasons + Recovery Flow**;
- reminders become **Commitment-aware prompts**;
- progress becomes **Plan vs Reality**, not only completion counts.

### 4.3 Do not port technical debt

Do not carry forward:

- the legacy TanStack route/component tree;
- oversized route/controller components;
- feature code coupled directly to localStorage keys;
- monolithic global application stores;
- redundant UI-only domain fields;
- Lovable-specific dependencies that are not product requirements;
- mutation patterns that cannot report or recover from persistence failure;
- tests that only preserve obsolete presentation quirks.

## 5. Evidence-informed behavior design

The discipline layer is informed by research, but the product must not overstate what any single intervention can accomplish.

### 5.1 Progress monitoring

Research synthesis has found that monitoring goal progress improves goal attainment, with stronger effects when progress is physically or visibly recorded.

Product translation:

- planned vs actual is always visible;
- important actions produce durable records;
- weekly review uses observed data;
- metrics are decomposable rather than opaque.

### 5.2 Implementation intentions

“If situation X occurs, I will perform behavior Y” planning has substantial evidence for improving goal attainment across contexts.

Product translation:

- optional start cues;
- explicit first action;
- optional obstacle-response plans;
- habit anchors;
- rescue plans for repeatedly postponed work.

The app must not force long forms for every task. Friction would undermine the intervention.

### 5.3 Stable context and habit automaticity

Repeated behavior in stable contexts is associated with stronger automaticity and goal attainment.

Product translation:

- habits can record cue/context;
- repeated successful contexts become visible;
- the product can later suggest stable times/contexts based on the user's own history.

### 5.4 Time management

Useful time-management systems require more than listing tasks. They must structure, protect, and adapt the use of time.

Product translation:

- capacity planning;
- time blocks;
- protected focus;
- buffers;
- replanning based on actual evidence.

### 5.5 Commitment and precommitment

Commitment mechanisms can reduce opportunistic plan changes, but rigid constraints can also become counterproductive.

Product translation:

- Normal Mode remains editable;
- Commitment Mode adds friction and records overrides;
- Emergency Override always exists;
- the product does not trap the user in an impossible plan.

### 5.6 Procrastination interventions

Evidence for reducing procrastination is more mixed than evidence for generic goal progress monitoring. No single timer, SMART-goal form, streak, or if/then statement should be treated as a cure.

Product translation:

- combine planning, start cues, execution evidence, recovery, and review;
- detect repeated avoidance;
- shrink ambiguous work;
- surface likely obstacles;
- avoid shame-based feedback.

## 6. Discipline Engine

The new subsystem surrounding Smart Planner's inherited capabilities is the **Discipline Engine**.

```text
SMART PLANNER DNA
       │
       ├── Capacity / Planner / Forecast
       ├── Focus
       ├── Habits
       ├── Projects / Roadmaps / Progress
       ├── Weekly Metrics
       └── Reminders / Backup
                    │
                    ▼
             DISCIPLINE ENGINE
                    │
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
  Commitment     Execution      Recovery
      │             │             │
      └─────────────┼─────────────┘
                    ▼
                Reflection
                    ▼
               Weekly Review
                    ▼
              Adaptive Planning
```

The Discipline Engine owns cross-feature behavioral concepts such as commitments, overrides, miss reasons, start latency, rescue triggers, and derived discipline metrics.

It must not become one giant store or service. Domain concepts remain separated by responsibility.

## 7. Daily operating loop

### 7.1 Capture

The user can quickly create work without completing a large planning form.

Minimum task capture:

- title;
- estimated duration;
- priority.

Optional detail can be added later.

### 7.2 Capacity

The user declares realistic available work time for the local calendar day.

Rules:

- 0–960 minutes;
- UI step 30 minutes;
- >720 minutes allowed with non-blocking caution;
- persisted invalid values fail validation rather than silently clamp.

### 7.3 Select commitments

The Today flow highlights **Top 1–3** priorities.

The user can still have more tasks, but Top 1–3 defines what must receive the clearest execution path.

### 7.4 Time-block important work

At least important commitments should be placeable into a local-day timeline.

The product continuously shows:

```text
capacityMinutes
scheduledMinutes
remainingMinutes
isOverbooked
bufferMinutes
```

Overbooking is visible but not blocked.

### 7.5 Commit Today

A user may explicitly commit the day's plan.

A commitment snapshot records what the user intended at the time of commitment. Later edits do not erase the original plan.

This enables honest plan-vs-reality measurement.

## 8. Commitment model

### 8.1 Modes

Two product modes exist:

**Normal Mode**

- planning remains freely editable;
- useful during exploration and unstable days.

**Commitment Mode**

- the user explicitly commits a plan/session;
- destructive or meaning-changing edits gain friction;
- significant overrides require a reason;
- the old committed state remains available for comparison;
- the user can always use Emergency Override.

### 8.2 No fake lock

A web application cannot reliably block arbitrary external apps or websites by itself.

V1 Commitment Mode therefore governs product behavior only.

True distraction blocking is a separate future companion/extension subsystem and must never be falsely represented as active if the browser/OS cannot enforce it.

### 8.3 Commitment snapshots

Use immutable snapshots/events rather than rewriting history.

A future-compatible model:

```ts
export interface DailyCommitment {
  id: string;
  dailyPlanId: string;
  committedAt: string;
  capacityMinutes: number;
  note: string;
}

export interface DailyCommitmentItem {
  id: string;
  commitmentId: string;
  workItemId: string;
  priorityRank: 1 | 2 | 3 | null;
  plannedMinutes: number;
}
```

Committed time blocks may later be snapshotted by IDs plus immutable planned values.

## 9. Plan vs Reality

Plan-vs-reality is a central product view, not an analytics afterthought.

Primary metrics include:

- committed planned minutes;
- actual focused minutes;
- commitment completion rate;
- completed priority count;
- median start latency;
- number/rate of carried-over commitments;
- estimation error;
- focus completion rate;
- interruption count;
- override count;
- recovery success after misses.

Do not equate scheduled time with actual focused time.

Do not infer `actualMinutes` merely because a task is marked complete.

## 10. Discipline Score policy

A Discipline Score is optional and must not be implemented in the first slice unless its components already exist.

If introduced later:

- it must be decomposable;
- its formula must be documented;
- raw component metrics must be visible;
- it must not reward app usage for its own sake;
- it must not punish legitimate rest or a consciously reduced capacity day;
- it must not create perverse incentives to make tiny easy commitments.

Possible components:

```text
commitment reliability
start reliability
focus completion
habit consistency
recovery reliability
```

The formula is explicitly deferred to the Weekly Review subsystem spec.

## 11. Miss handling

A missed commitment must not silently roll over forever.

### 11.1 Miss reasons

When a meaningful committed item is missed or explicitly abandoned, the system can record one lightweight reason:

- underestimated time;
- started too late;
- distracted;
- task too difficult;
- task too vague;
- unexpected obligation;
- energy/recovery constraint;
- consciously deprioritized;
- other.

The taxonomy must stay short enough to use.

### 11.2 Preserve agency

The system records what happened; it does not shame the user.

Copy should describe behavior, not character.

Bad:

> You were lazy again.

Good:

> This task has been moved three times. The most common recorded reason is “task too vague”.

## 12. Anti-Procrastination Rescue

Repeated avoidance triggers a rescue flow instead of another silent rollover.

Initial trigger candidate:

- a committed work item missed/rescheduled at least 3 times within a bounded recent period.

Final threshold belongs to the subsystem implementation spec and should be easy to tune.

Rescue flow:

```text
What outcome matters?
        ↓
What is the real obstacle?
        ↓
Can the task be shrunk?
        ↓
What is the first physical action?
        ↓
When/where will it start?
        ↓
If the obstacle appears, what will you do?
```

The rescue must produce an executable next action, not a motivational essay.

## 13. Start Ritual

Important work can optionally include:

```ts
export interface StartPlan {
  workItemId: string;
  localStartTime: string | null;
  contextLabel: string | null;
  firstAction: string | null;
  obstacle: string | null;
  obstacleResponse: string | null;
}
```

Example:

```text
17:00
Desk
Open exercise sheet and solve question 1
If I want to open short-form video → capture the urge and continue 5 minutes
```

Start Ritual fields must be progressively disclosed. Quick Capture remains quick.

## 14. Focus Station inheritance + upgrade

Focus is a required Smart Planner inheritance capability.

The new Focus Station eventually supports:

- start/pause/resume/finish state machine;
- planned duration;
- real elapsed focus duration derived robustly from timestamps;
- persistence through reload/sleep where feasible;
- association with work item/project;
- distraction inbox;
- interruption count;
- optional focus quality rating;
- end-of-session reflection;
- actualMinutes evidence;
- commitment override recording.

### 14.1 Distraction inbox

During a session the user can capture an urge/thought without leaving the execution context.

Example:

```text
TikTok
reply to message
look up laptop
```

Capturing a distraction must take only a few seconds and must not stop the timer by default.

### 14.2 Focus truthfulness

The system must distinguish:

- scheduled duration;
- timer elapsed duration;
- finalized focused duration.

A 50-minute time block is not evidence of 50 minutes of focus.

## 15. Habit system inheritance + upgrade

Habits remain first-class entities.

Future habit model should support:

- schedule/frequency;
- cue/anchor;
- context;
- minimum version;
- normal version;
- completion logs;
- consistency;
- missed opportunities;
- recovery behavior.

Example:

```text
Habit: Review vocabulary
Cue: after breakfast
Context: desk
Minimum version: 5 minutes
Normal version: 20 minutes
Target: 6 opportunities/week
```

### 15.1 Never Miss Twice as recovery heuristic

“Never Miss Twice” is a product recovery heuristic, not a scientific guarantee.

After a miss, the next planned opportunity should emphasize a small restart rather than punishment or compensatory overload.

The system must preserve prior history even when a streak breaks.

## 16. Weekly Review is the adaptation engine

Weekly Review is required, not decorative analytics.

It should eventually answer:

- What did I commit to?
- What did I actually do?
- When did I reliably start?
- Which time windows produced the best completion/focus?
- Which task types were systematically underestimated?
- What caused misses?
- Which habits recovered after misses?
- What work keeps rolling over?
- What one or two changes should be tested next week?

Example metrics:

```text
Committed focus        18h
Actual focus           14h 40m
Commitment reliability 81%
Median start delay     14m
Carry-over rate        12%
Most common miss       underestimated duration
Best focus window      17:10–19:20
```

Recommendations must reference observable data and explain the evidence behind the recommendation.

## 17. AI Coach boundary

AI is not the source of truth for discipline metrics.

AI receives structured observed data and produces explanations/options.

AI must not fabricate behavior history.

Good AI roles:

- decompose a vague work item;
- summarize weekly behavioral patterns;
- propose one experiment for next week;
- help create an obstacle-response plan;
- help turn a repeatedly avoided task into a smaller action;
- explain why a plan is overcommitted.

Bad AI roles:

- generic motivational chat as the primary value;
- silently changing the user's plan;
- assigning an unexplained discipline score;
- inventing causes for misses with no supporting data.

Provider/model selection and BYOK remain deferred.

## 18. Domain model baseline

### 18.1 Identifier strategy

Use string UUIDs created at entity creation time.

Guest-created IDs remain stable when migrating to cloud storage later.

### 18.2 Project

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

### 18.3 Work Item

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

### 18.4 Daily Plan

```ts
export interface DailyPlan {
  id: string;
  date: string;
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

Top priorities are normalized rather than stored as an array in relational persistence.

### 18.5 Time Block

```ts
export interface TimeBlock {
  id: string;
  date: string;
  workItemId: string | null;
  habitId: string | null;
  startMinute: number;
  endMinute: number;
  createdAt: string;
  updatedAt: string;
}
```

Rules:

- exactly one target eventually exists (`workItemId` xor `habitId`);
- `startMinute < endMinute`;
- bounds stay in one local day;
- overlaps are allowed but visibly flagged;
- work items may have multiple blocks.

## 19. Local date and time policy

Internal duration unit: **integer minutes**.

Daily planning uses local calendar dates.

Never derive a daily key using:

```ts
new Date().toISOString().slice(0, 10)
```

because it uses UTC and can represent the wrong local date.

Provide explicit local-date helpers with tests around midnight and positive UTC offsets such as Vietnam/Asia-Bangkok.

## 20. Architectural rules

1. Domain logic must not import React, Next.js, IndexedDB, localStorage, or Supabase.
2. Pages compose features; pages do not own business rules.
3. Product components do not access persistence primitives directly.
4. Persistence is accessed through repository/application boundaries.
5. Runtime persistence data is validated before becoming domain data.
6. Storage failure is never interpreted as an empty dataset.
7. Multi-entity mutations that require atomicity use real transactions.
8. Significant commitment edits preserve history rather than rewrite it.
9. Scheduling data and actual execution evidence remain separate.
10. Dates are local-calendar aware.
11. Time accounting uses integer minutes internally.
12. No monolithic global application store.
13. No production feature behavior before its failing test, except config/generated files where TDD is not meaningful.
14. Smart Planner behavioral capabilities cannot be removed without an explicit design decision and replacement rationale.

## 21. Persistence architecture

### 21.1 Repository boundary

Feature/application code talks to interfaces, not storage technology.

Representative contracts:

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

export interface TimeBlockRepository {
  listByDate(date: string): Promise<Result<TimeBlock[]>>;
  save(block: TimeBlock): Promise<Result<void>>;
  remove(id: string): Promise<Result<void>>;
}
```

A shared explicit result type:

```ts
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string };
```

### 21.2 Guest storage

Use IndexedDB as the primary normalized guest store.

Initial logical stores may include:

- `workItems`;
- `dailyPlans`;
- `dailyPriorities`;
- `timeBlocks`;
- `dailyCommitments`;
- `dailyCommitmentItems`;
- `meta`.

Only stores actually required by an implemented slice should be created. Do not prebuild the entire future schema without behavior.

Every loaded record is schema-validated.

Invalid data:

- is not silently dropped;
- is not automatically overwritten;
- produces a structured persistence error;
- remains recoverable/exportable.

### 21.3 Future cloud mapping

Supabase remains behind the same behavioral/application boundaries.

Expected future relational entities include:

- profiles;
- projects;
- work_items;
- daily_plans;
- daily_priorities;
- time_blocks;
- daily_commitments;
- commitment_items;
- focus_sessions;
- habits;
- habit_logs;
- miss_events;
- daily_reflections.

Cloud sync, conflict resolution, and guest-account merging require a separate spec.

## 22. UI/UX direction

The app should feel like an **execution workstation**, not a card museum.

Visual hierarchy:

1. what matters now;
2. whether today's plan is realistic;
3. next start time/action;
4. current execution state;
5. what changed from the committed plan;
6. secondary analytics/settings.

Interaction principles:

- Quick Capture must remain fast;
- advanced discipline fields use progressive disclosure;
- primary actions remain visible;
- keyboard interaction is first-class;
- mobile has its own compact navigation pattern;
- destructive actions have undo/confirmation when appropriate;
- commitment overrides clearly explain consequences;
- errors state whether data was preserved;
- no color-only status communication;
- visible keyboard focus and reduced-motion compatibility.

## 23. First implementation slice

The first implementation slice remains deliberately narrow:

### Foundation + Today + Minimal Commitment

It includes:

- Next.js App Router foundation;
- TypeScript strict mode;
- Tailwind CSS v4;
- shadcn/ui-compatible primitives;
- responsive shell;
- Work Item, Daily Plan, Daily Priority, Time Block domain rules;
- guest IndexedDB persistence;
- Today Workstation;
- 0–16h capacity;
- task capture;
- Top 1–3 priorities;
- explicit time blocks;
- overbooking visibility;
- task completion/reopen;
- **Commit Today snapshot**;
- simple Plan vs Reality baseline using data available in this slice;
- reload persistence;
- test/lint/typecheck/build/e2e/CI.

### Explicitly not in first slice

- full Focus Station;
- Habits;
- full Projects/Roadmaps UI;
- multi-day Planner;
- forecasting;
- Weekly Review;
- Rescue Flow;
- AI Coach;
- Supabase;
- PWA/Push;
- legacy migration.

Those features remain mandatory roadmap inheritances, but are separate testable subprojects.

## 24. Today Workstation behavior

Required visible sections:

1. **Today Header** — local date, current commitment state, next meaningful action.
2. **Capacity** — available, scheduled, remaining/buffer, overbooking.
3. **Top Priorities** — ranked Top 1–3.
4. **Today Tasks** — work relevant to today.
5. **Timeline** — today's time blocks.
6. **Quick Capture** — title, estimate, priority.
7. **Commitment Summary** — before/after commit state.

### 24.1 Top priorities

- zero to three;
- unique work items;
- contiguous ranks;
- removing rank 2 from `[1,2,3]` compacts to `[1,2]`;
- completed priorities may remain visible for historical context;
- priority membership does not mutate the work item itself.

### 24.2 Task completion

Completing a task:

- sets status `completed`;
- sets `completedAt`;
- does not delete scheduled blocks;
- does not infer actual focus time.

Reopening:

- clears `completedAt`;
- returns to scheduled if relevant blocks exist, otherwise backlog.

### 24.3 Time-block validation

Reject:

- end <= start;
- start < 0;
- end > 1440;
- missing target;
- unknown work item.

Overlap is warning-only in the first slice.

## 25. First-slice commitment behavior

The user can press **Commit Today** after defining the day.

The app records an immutable commitment snapshot containing at least:

- commitment timestamp;
- capacity at commitment;
- committed Top priorities;
- planned minutes for committed items;
- relevant time-block planning values.

After commit:

- ordinary edits remain possible in V1;
- the UI clearly marks the plan as changed when current state diverges from the committed snapshot;
- the committed snapshot remains preserved;
- no punitive lock is introduced yet.

This creates the data foundation for later Commitment Mode without overbuilding it in slice 1.

## 26. Testing strategy

### 26.1 Domain tests

Required first-slice coverage:

- capacity min/max/step;
- overbooking calculation;
- local-date correctness;
- priority uniqueness/ranking/compaction;
- work-item completion/reopen;
- time-block bounds/duration;
- overlap detection;
- Today aggregation;
- commitment snapshot immutability;
- divergence detection between committed and current plan.

### 26.2 Persistence tests

Use deterministic IndexedDB testing.

Cover:

- CRUD for implemented stores;
- repository re-instantiation/reload;
- corrupt-record handling;
- atomic priority replacement;
- failed transaction leaves no partial state;
- commitment snapshots remain unchanged after later plan edits.

### 26.3 Component tests

Test behavior rather than snapshots:

- create task;
- set capacity;
- enforce max three priorities;
- create/edit/delete time block;
- overbooking warning;
- complete/reopen task;
- commit a plan;
- edit after commitment and show divergence without destroying history.

### 26.4 E2E acceptance journey

```text
open /today as new guest
  ↓
set capacity = 5h
  ↓
create at least 3 tasks
  ↓
choose Top 3
  ↓
create at least one time block
  ↓
Commit Today
  ↓
edit one planned value
  ↓
verify divergence from commitment is visible
  ↓
complete a task
  ↓
reload
  ↓
verify tasks, priorities, capacity, blocks,
commitment snapshot, divergence state and completion persist
```

Second E2E:

- create an overbooked day;
- confirm warning appears;
- scheduling remains allowed;
- commit snapshot preserves the overbooked plan exactly as committed.

## 27. Quality gates

All must pass before the first slice is complete:

```bash
bun run typecheck
bun run lint
bun test
bun run build
bun run e2e
```

CI runs the same gates against committed source.

Build/test scripts must not mutate application source before validation.

The guest-only slice requires no secret environment variables.

## 28. Delivery roadmap

The intended implementation sequence is:

1. **Foundation + Today + Minimal Commitment**
2. **Focus Station + distraction capture + execution evidence**
3. **Habits & Routines + context + minimum version + recovery**
4. **Projects / Roadmaps / Flexible Planner / Forecast**
5. **Miss Events + Anti-Procrastination Rescue**
6. **Legacy Smart Planner Migration + behavior parity audit**
7. **Shutdown + Weekly Review + transparent discipline metrics**
8. **Supabase Auth / cloud sync / guest-account migration**
9. **AI Coach boundary**
10. **PWA / Push / commitment-aware reminders**
11. **Optional enforcement companion / browser distraction blocker**

The exact sequencing of steps 5–7 may change if implementation evidence shows migration should happen earlier, but no inherited Smart Planner capability may be silently omitted.

## 29. Behavior parity register requirement

Before the rebuild is declared a successor to Smart Planner, maintain a parity register with each inherited behavior classified as:

```text
PRESERVED
SUPERSEDED
INTENTIONALLY REMOVED
NOT YET IMPLEMENTED
```

Every `SUPERSEDED` or `INTENTIONALLY REMOVED` item requires rationale.

At minimum the register must cover:

- capacity;
- flexible planner;
- schedule forecasting;
- focus timer/preferences/transitions;
- habits;
- projects/roadmaps/lesson placement;
- progress analytics;
- weekly metrics;
- PWA/push;
- backup/storage/migration behavior.

This prevents a clean rewrite from accidentally becoming a feature regression.

## 30. Data preservation rules

1. Never overwrite unreadable persistence during boot.
2. Never auto-reset because validation fails.
3. Never rewrite commitment history when the current plan changes.
4. Never fabricate actual work from scheduled work.
5. Migration previews before replacement.
6. Legacy source exports remain untouched.
7. Multi-store changes that must be atomic use one transaction.
8. Factory reset requires explicit user action and is a later feature.

## 31. Security and privacy baseline

First slice:

- no API keys;
- no analytics SDK by default;
- no network persistence;
- no hidden upload of guest data;
- no secrets in client bundles.

Future AI/BYOK and cloud sync receive separate security design reviews.

## 32. Performance baseline

Today must not load future heavy systems.

First slice must not bundle:

- charting libraries;
- AI/provider SDKs;
- audio engines;
- Supabase client solely for future use;
- drag-and-drop libraries before multi-day planning requires them.

Repository queries should load only data relevant to the current Today view.

## 33. Evidence register

The behavioral design is informed by the following research areas and representative sources. These sources guide product hypotheses; they do not justify claiming that the app can guarantee discipline.

1. **Progress monitoring and goal attainment**  
   Harkin et al. (2016), *Does Monitoring Goal Progress Promote Goal Attainment? A Meta-Analysis of the Experimental Evidence*, Psychological Bulletin. PMID 26479070.

2. **Implementation intentions**  
   Gollwitzer & Sheeran (2006), *Implementation Intentions and Goal Achievement: A Meta-analysis of Effects and Processes*, Advances in Experimental Social Psychology.

3. **Stable context and habit automaticity**  
   Research examining context stability, habit automaticity, and goal attainment in repeated behaviors.

4. **Time-management outcomes**  
   Aeon & Aguinis and related meta-analytic work on time management, performance, and wellbeing.

5. **Self-imposed deadlines / commitment**  
   Ariely & Wertenbroch (2002), *Procrastination, Deadlines, and Performance: Self-Control by Precommitment*.

6. **Procrastination interventions**  
   Meta-analytic evidence indicates small-to-moderate overall effects and does not support treating one lightweight productivity mechanic as a cure.

7. **MCII / obstacle-response planning**  
   Used as inspiration for Rescue Flow where supported, while treating newer/smaller studies as preliminary rather than foundational.

Product decisions should be updated if stronger evidence conflicts with these assumptions.

## 34. Self-review

### Behavioral inheritance check

The new design explicitly treats Smart Planner capabilities as required inheritance families rather than optional future ideas.

### Discipline check

The product now closes the loop from plan → commitment → execution evidence → miss/recovery → review/adaptation.

### Anti-gamification check

No core behavior depends on XP, virtual rewards, punishment streaks, or opaque engagement scoring.

### Data-truth check

Scheduled work, committed work, completed tasks, and actual focused time remain distinct concepts.

### Human-agency check

Commitment adds friction/history, not absolute lock-in. Emergency override remains possible.

### Scope check

The whole product vision remains architectural context, while the first implementation plan is limited to Foundation + Today + Minimal Commitment so it can ship as independently testable software.

### Data-loss check

The design rejects silent resets, silent corruption recovery by deletion, and destructive rewriting of commitment history.

## 35. Final acceptance condition for the product direction

The rebuild is successful only if both are true:

1. it reaches behavioral parity with the useful Smart Planner capability set, except for explicitly documented supersessions/removals; and
2. it measurably improves the execution loop by making commitments, actual behavior, misses, recovery, and adaptation visible and actionable.

A cleaner codebase without those two outcomes is not a successful rebuild.

## 36. Implementation handoff condition

Do not create the implementation plan or production code until the user has reviewed this **written v2 spec** and explicitly approved proceeding from it.
