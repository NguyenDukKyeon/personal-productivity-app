# Focus Station — Execution Evidence

**Date:** 2026-08-31  
**Status:** Phase 2 design — authorized from Smart Planner Reborn v2  
**Repository:** `NguyenDukKyeon/personal-productivity-app`  
**Branch:** `feat/focus-station`  
**Baseline:** Phase 1 squash merge `fe318ce4e7823f060e409c0ce2d4a6269930160b`  
**Behavioral inheritance:** `NguyenDukKyeon/smart-planner` Focus timer / study sessions  

## 1. Product job

Focus Station turns a scheduled plan into truthful execution evidence.

It sits in the already-approved loop:

```text
PLAN → COMMIT → START → EXECUTE → RECORD REALITY → REVIEW
```

It is not a decorative Pomodoro timer. Visual chrome, audio, and gamification are not success criteria. Durable, reconstructable focus records are.

The system must distinguish three durations that must never collapse into one another:

| Duration | Source of truth | Not evidence of |
| --- | --- | --- |
| Scheduled time | `TimeBlock` | that focus happened |
| Timer elapsed time | live reconstruction from persisted timestamps | that the session was finished |
| Finalized focused time | `FocusSession.focusedDurationMs` after complete/abandon | planned minutes, TimeBlock length, or task completion |

A 50-minute TimeBlock is not 50 minutes of focus. Completing a task does not write `actualMinutes`.

## 2. Inherited Smart Planner behavior

Audited from `NguyenDukKyeon/smart-planner` (`src/lib/focus-timer-store.ts`, `focus-timer-store.test.ts`, `focus-timer-transitions.ts`, `focus-preferences.ts`, `study-sessions.ts`, `study-sessions.test.ts`, `study-duration-evidence.ts`).

### 2.1 Preserve

- Timestamp reconstruction: `accumulated` duration plus current `startTimestamp` while running.
- Pause excludes paused wall-clock time from focused duration.
- Reload/sleep recovery from persisted timestamps, not from a React interval.
- Clamp impossible negative elapsed to zero.
- Immutable study/focus records with `startedAt`, `endedAt`, `durationSeconds`, and a work association.
- Planned duration is an intention, not the recorded result.
- Invalid stored timer/session bytes are left untouched; persistence failure is not empty state.
- Completing a session that also updates other records must be atomic. Legacy used a verified multi-key write with rollback (`recordFocusSessionAndTimerStateAtomically`). Phase 2 uses one IndexedDB `readwrite` transaction covering the stores that must stay consistent.
- One active timer owner at a time (legacy tab lock). Phase 2 enforces at most one `running` or `paused` session in guest storage.

### 2.2 Replace

- Zustand + `localStorage` timer store → pure domain + repository contract + IndexedDB guest adapter.
- Monolithic `FocusTimerModal` (~92 KB) with UI-owned timing → application service owns transitions; UI interval is presentation only.
- Pomodoro/break/warmup/studio/mini modes as canonical state → `countdown` and `flow` focus modes only.
- `StudySession` inferred from timer expiry + XP/coins → `FocusSession` is the execution record; no XP, coins, confetti, or chimes.
- Task/lesson completion inferred from a finished timer → finishing focus never mutates `TimeBlock` and never marks a WorkItem complete.

### 2.3 Defer

- Ambient soundscapes, binaural beats, clock ticks, completion chimes.
- Auto-start break / auto-start next focus / 2-minute warmup continuation UI.
- Header mini-timer, Studio mode, desktop notifications, multi-tab lock UI.
- Focus preferences panel, preset library beyond a planned-minute field.
- Browser/OS distraction blocker, PWA, Web Push.
- Charts, Weekly Review aggregation UI, Discipline Score, AI Coach.

## 3. Redesigned domain

### 3.1 FocusSession

```ts
type FocusSessionStatus = 'running' | 'paused' | 'completed' | 'abandoned';
type FocusMode = 'countdown' | 'flow';
type FocusQuality = 1 | 2 | 3 | 4 | 5;

interface FocusSession {
  id: string;
  workItemId: string | null;
  timeBlockId: string | null;
  status: FocusSessionStatus;
  mode: FocusMode;
  plannedDurationMinutes: number | null;
  startedAt: string;
  runningSince: string | null;
  endedAt: string | null;
  accumulatedFocusMs: number;
  focusedDurationMs: number | null;
  startLatencyMinutes: number | null;
  note: string;
  qualityRating: FocusQuality | null;
  createdAt: string;
  updatedAt: string;
}
```

Rules:

- `countdown` requires integer `plannedDurationMinutes > 0`.
- `flow` requires `plannedDurationMinutes === null`. Remaining time is not shown.
- `workItemId`, when set, must refer to an existing WorkItem at start time. Unknown WorkItem is rejected. The session stores the id; it does not copy the TimeBlock.
- `timeBlockId` is an optional association for later Plan-vs-Reality. Starting focus never writes to `timeBlocks`.
- `accumulatedFocusMs` is the sum of completed running segments. It does not include the open running segment.
- `focusedDurationMs` is null until the session is finalized (`completed` or `abandoned`).
- `startLatencyMinutes` is stored when a TimeBlock association exists: actual local start minute minus `TimeBlock.startMinute`. Positive means started late. It is diagnostic, not a score.

There is no persisted `idle` row. UI idle means “no active session”. Start creates a `running` session.

### 3.2 Distraction

```ts
interface Distraction {
  id: string;
  focusSessionId: string;
  text: string;
  capturedAt: string;
}
```

- Trimmed text is required and max 200 characters.
- Capture is allowed only while the session is `running` or `paused`.
- Capture does not change session status and does not pause a running timer.
- Interruption count is `distractions.length` for that session. It is never fabricated.

### 3.3 State machine

Allowed transitions:

```text
(start)     → running
running     → paused
paused      → running
running     → completed
paused      → completed
running     → abandoned
paused      → abandoned
```

Rejected examples:

- pause when not running
- resume when not paused
- finish/abandon a completed or abandoned session
- start a second session while one is `running` or `paused`
- any transition into `running` that does not set `runningSince`

`completed` and `abandoned` are terminal. Historical rows are not rewritten except for the single finalizing write that sets status, `endedAt`, `focusedDurationMs`, and optional note/rating.

### 3.4 Timing semantics

Canonical clock is injected (`now: () => Date`). Domain math uses epoch milliseconds.

```text
openRunningMs(session, nowMs) =
  session.status === 'running' && session.runningSince
    ? max(0, nowMs - Date.parse(runningSince))
    : 0

elapsedFocusMs(session, nowMs) =
  session.focusedDurationMs ?? (session.accumulatedFocusMs + openRunningMs(session, nowMs))
```

- Pause: add `openRunningMs` into `accumulatedFocusMs`, clear `runningSince`, set status `paused`.
- Resume: set `runningSince = now`, status `running`. Do not change `accumulatedFocusMs`.
- Finish/abandon: `focusedDurationMs = elapsedFocusMs(now)`, `endedAt = now`, `runningSince = null`.
- `Date.parse` failure, inverted timestamps, or non-finite values yield `0` elapsed and `corrupt_record` on load.
- UI may tick every 250 ms. That interval is not stored and is not used to compute finalized duration.

Reload reconstruction uses the same formula. A running session whose `runningSince` is 12 minutes ago reconstructs ~12 minutes plus `accumulatedFocusMs`, including across browser sleep, because wall-clock timestamps are persisted.

### 3.5 WorkItem actual minutes

`WorkItem.actualMinutes` is optional derived evidence in this phase.

- Only `completed` sessions contribute.
- Aggregation is the rounded-down total: `floor(sum(focusedDurationMs) / 60000)`.
- Recompute from all completed sessions for that WorkItem on each completion, so retries are idempotent.
- Abandoned sessions keep their `focusedDurationMs` as session evidence but do not change `actualMinutes`.
- Task completion from Today still does not write `actualMinutes`.

If completion updates both `focusSessions` and `workItems`, both writes occur in one IndexedDB transaction. Failure returns `persistence_write_failed` and leaves both stores unchanged.

### 3.6 TimeBlock separation

- Start may pass `timeBlockId`.
- Service loads the TimeBlock only to compute `startLatencyMinutes` and to confirm it still exists.
- No TimeBlock field is updated by Focus operations.
- Tests must assert the TimeBlock row is byte-equal after start/pause/resume/finish.

## 4. Persistence model

Same guest IndexedDB database as Phase 1 (`personal-productivity-guest`), schema version 2.

New stores:

| Store | Key | Indexes |
| --- | --- | --- |
| `focusSessions` | `id` | `workItemId`, `status` |
| `distractions` | `id` | `focusSessionId` |

Upgrade must create the new stores without deleting or rewriting v1 stores.

Read path:

- Zod structural parse, then semantic validators.
- Invalid records return `corrupt_record` and are left untouched.
- Read failure returns `persistence_read_failed`, never an empty array that would look like “no sessions”.

Write path:

- Create/pause/resume/abandon of a session that does not touch WorkItem may use a single-store transaction.
- Completing a session that updates `actualMinutes` uses one `readwrite` transaction on `focusSessions` + `workItems`.
- Distraction capture uses `distractions` only.
- Failed writes return `persistence_write_failed` and must not surface as success in the UI.

Active session lookup: the unique session whose status is `running` or `paused`. If more than one is found, return `corrupt_record` rather than picking one.

## 5. Application service

`FocusService` is storage-agnostic. It consumes `FocusRepository` and `TodayRepository` (WorkItem/TimeBlock reads only).

Operations:

- `getFocusView()`
- `startSession({ workItemId, timeBlockId, mode, plannedDurationMinutes })`
- `pauseSession(id)`
- `resumeSession(id)`
- `finishSession(id, { note?, qualityRating? })`
- `abandonSession(id)`
- `captureDistraction(id, text)`
- `listCompletedSessions()`

`getFocusView` reconstructs elapsed/remaining from `now()` and includes:

- active session or null
- elapsed ms
- remaining ms (countdown only)
- work item title if associated
- distractions + interruption count
- last finalized session summary when present

Start rejects unknown WorkItem and unknown TimeBlock. Start copies neither scheduled minutes nor estimated minutes into focused duration.

## 6. UI flow

Route: `/focus` (also reachable from Today).

Idle:

- Choose a WorkItem (guest tasks).
- Optional TimeBlock association when the task has blocks today.
- Mode: countdown with planned minutes, or flow.
- Start.

Running:

- Task title.
- Elapsed (and remaining if countdown).
- Pause, Finish, Abandon.
- Distraction inbox: one text field, capture in one submit. Timer keeps running.

Paused:

- Same numbers frozen except they no longer advance.
- Resume, Finish, Abandon.
- Distraction capture still allowed.

Completed/abandoned summary:

- Finalized focused minutes/seconds.
- Planned minutes if countdown.
- Interruption count.
- Optional note + optional 1–5 quality. Neither is required to finish.
- Start another session.

Persistence errors appear in an alert. The distraction input and note fields keep their typed values on failed writes.

Reload on `/focus` restores a running/paused session and reconstructed elapsed time.

Today gains a “Start focus” control on a task that links to `/focus?workItemId=…`. If the task has a TimeBlock today, that id is included as `timeBlockId`. This does not start the timer by itself.

Sidebar Focus becomes a real route. Other Later items stay placeholders.

## 7. Error behavior

| Case | Result |
| --- | --- |
| Unknown WorkItem on start | `unknown_entity`, no session written |
| Unknown TimeBlock on start | `unknown_entity`, no session written |
| Invalid planned duration | `invalid_planned_duration` |
| Invalid transition | `invalid_transition` |
| Second active session | `session_active` |
| Blank distraction | `invalid_distraction` |
| Corrupt stored session/distraction | `corrupt_record`, row untouched |
| IndexedDB read failure | `persistence_read_failed`, UI error, not empty idle |
| IndexedDB write failure | `persistence_write_failed`, prior state remains, input preserved |
| Atomic complete failure | session stays running/paused, WorkItem.actualMinutes unchanged |

## 8. Architecture

```text
pure domain (focus-session, focus-timing, distraction)
        ↓
application service (focus-service)
        ↓
repository contracts (focus-repository) + TodayRepository reads
        ↓
IndexedDB guest adapter (guest-focus-repository, shared DB v2)
        ↓
feature UI (FocusScreen and children)
```

No Zustand. Product components do not call IndexedDB or localStorage. Domain does not import React or `idb`.

## 9. Acceptance criteria

1. User can start countdown or flow focus for a known WorkItem.
2. Pause excludes paused time from focused duration across multiple pause/resume cycles.
3. Finish persists `focusedDurationMs` from timestamps, not from planned minutes or TimeBlock length.
4. Reload of a running session restores status and reconstructed elapsed time.
5. Distraction capture persists, does not pause, and increments interruption count.
6. Unknown WorkItem is rejected.
7. TimeBlock row is unchanged after a full start→finish journey.
8. `WorkItem.actualMinutes` changes only from completed FocusSessions, atomically.
9. Corrupt session/distraction records return `corrupt_record` and remain in place.
10. E2E journeys 1 and 2 in the Phase 2 brief pass.

## 10. Deferred items

- Habits, multi-day planner, projects/roadmaps, Weekly Review, Discipline Score, AI Coach
- Supabase, PWA/Web Push, legacy migration, analytics dashboard
- Ambient audio, binaural beats, animations, confetti, gamification, XP
- Auto-break / auto-next-focus, warmup prompt, mini/studio layouts, multi-tab lock UI
- Browser distraction blocker, notification permission UX, focus preferences screen

## 11. Parity-register implications

Split the current single Focus row rather than marking the whole family PRESERVED:

| Capability | After Phase 2 |
| --- | --- |
| Focus session timing / state machine / reload reconstruction | PRESERVED |
| Distraction Inbox | SUPERSEDED (new first-class capture; Smart Planner had no equivalent inbox) |
| Execution evidence vs scheduled time | PRESERVED (upgraded: TimeBlock remains plan, FocusSession is reality) |
| Focus preferences, auto-break, ambient soundscapes, mini/studio timer, notifications | NOT YET IMPLEMENTED |

XP/coins/chimes stay out of the product and are not restored.

## 12. Spec self-review

- No duplicated source of truth: elapsed is always reconstructed from `accumulatedFocusMs` + `runningSince`; UI ticks do not persist.
- No `scheduled = actual` path: finish cannot copy `plannedDurationMinutes` or TimeBlock length.
- Impossible transitions are rejected in domain functions before persistence.
- Abandoned and completed are distinct terminals; only completed updates `actualMinutes`.
- Data-loss: failed writes abort; corrupt reads do not delete; finishing does not rewrite TimeBlocks.
- Start latency is stored when a TimeBlock id is supplied; Weekly Review is not built here.
