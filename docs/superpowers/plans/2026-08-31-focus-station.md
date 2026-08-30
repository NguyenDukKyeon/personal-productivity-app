# Focus Station — Execution Evidence Implementation Plan

> **For agentic workers:** Execute task-by-task with strict RED → GREEN → REFACTOR. Each task names the exact files, the failing command, and the green command. Do not skip a RED run.

**Goal:** Deliver Focus Station as the execution layer between a scheduled Today plan and truthful focused-time evidence, without treating TimeBlocks as proof that focus happened.

**Architecture:** Pure domain (`focus-session`, `focus-timing`, `distraction`) → storage-independent `FocusService` → `FocusRepository` contract + IndexedDB guest adapter on shared guest DB v2 → Focus feature UI. Reuse `TodayRepository` for WorkItem/TimeBlock reads only. No Zustand. No localStorage product path. UI intervals are presentation only.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Tailwind CSS v4, Lucide, Zod, `idb`, Vitest, React Testing Library, fake-indexeddb, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-31-focus-station-design.md`

**Baseline:** `feat/focus-station` from merged `main` `fe318ce4e7823f060e409c0ce2d4a6269930160b`.

## Global Constraints

- Timestamp reconstruction is canonical: `accumulatedFocusMs + openRunningMs`.
- Pause must exclude paused wall-clock time from focused duration.
- `focusedDurationMs` is written only on complete/abandon.
- Planned minutes, TimeBlock length, and task completion must never become `actualMinutes`.
- Completing a session that updates `WorkItem.actualMinutes` uses one IndexedDB `readwrite` transaction on `focusSessions` + `workItems`.
- Starting focus never mutates a TimeBlock. Tests assert the TimeBlock row is byte-equal after the journey.
- At most one `running` or `paused` session. A second start returns `session_active`.
- Corrupt records return `corrupt_record` and stay in place. Read/write failures are not empty success.
- Abandoned sessions keep `focusedDurationMs` but do not change `actualMinutes`.
- Distraction capture does not pause the timer.
- No Pomodoro auto-break, ambient audio, XP, confetti, PWA, Weekly Review, Habits, Planner, Projects, or AI.
- Quality gates: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, `npm run e2e`.

## Target File Map

```text
src/domain/focus/
  focus-timing.ts
  focus-timing.test.ts
  focus-session.ts
  focus-session.test.ts
  distraction.ts
  distraction.test.ts
src/infrastructure/persistence/contracts/focus-repository.ts
src/infrastructure/persistence/guest/
  guest-db.ts                          (modify: v2 + stores)
  guest-today-repository.test.ts       (modify: putRaw uses GUEST_DB_VERSION)
  guest-focus-repository.ts
  guest-focus-repository.test.ts
src/features/focus/application/
  focus-service.ts
  focus-service.test.ts
  client-focus-service.ts
src/features/focus/components/
  FocusScreen.tsx
  FocusTimer.tsx
  FocusControls.tsx
  DistractionInbox.tsx
  SessionSummary.tsx
  StartFocusForm.tsx
src/features/focus/hooks/useFocusController.ts
src/features/focus/focus-ui.test.tsx
src/app/(dashboard)/focus/page.tsx
src/features/today/components/TaskList.tsx          (modify: Start focus link)
src/features/today/components/TodayScreen.tsx       (modify: pass date/blocks)
src/features/today/today-ui.test.tsx                (modify: Start focus)
src/components/shell/Sidebar.tsx                    (modify: Focus is a real route)
e2e/focus.spec.ts
docs/superpowers/parity/smart-planner-behavior-parity.md
README.md
```

## Interfaces Produced

`FocusSession`, `FocusMode`, `FocusSessionStatus`, `FocusQuality` from `src/domain/focus/focus-session.ts`.

`elapsedFocusMs`, `openRunningMs`, `remainingFocusMs`, `actualMinutesFromCompletedSessions` from `src/domain/focus/focus-timing.ts`.

`Distraction` from `src/domain/focus/distraction.ts`.

`FocusRepository` from `src/infrastructure/persistence/contracts/focus-repository.ts`:

```ts
getSession(id)
listSessions()
listSessionsForWorkItem(workItemId)
getActiveSession()
saveSession(session)
completeSessionWithWorkItem(session, workItem)
listDistractions(focusSessionId)
saveDistraction(distraction)
```

`FocusService` from `src/features/focus/application/focus-service.ts`:

```ts
getFocusView()
startSession({ workItemId, timeBlockId, mode, plannedDurationMinutes })
pauseSession(id)
resumeSession(id)
finishSession(id, { note?, qualityRating? })
abandonSession(id)
captureDistraction(id, text)
listCompletedSessions()
```

Consumed: `TodayRepository` (WorkItem and TimeBlock reads only), `Result<T>`, guest DB `personal-productivity-guest`.

---

### Task 1: Domain timing math

**Files:**
- Create: `src/domain/focus/focus-timing.ts`
- Create: `src/domain/focus/focus-timing.test.ts`

**RED:** Write tests first. Command:

```bash
npx vitest run src/domain/focus/focus-timing.test.ts
```

Expected failure: module not found or functions missing.

Cover:

- running elapsed = accumulated + max(0, nowMs - runningSince)
- paused elapsed = accumulated only
- finalized elapsed = focusedDurationMs even if now advances
- multiple pause/resume cycles exclude paused gaps
- Date.parse failure, inverted timestamps, and non-finite values yield 0
- remaining ms is null in flow mode and max(0, plannedMs - elapsed) in countdown
- actualMinutesFromCompletedSessions floors the sum of completed focusedDurationMs and ignores abandoned sessions

**GREEN:** Implement the functions. Re-run the same command. Expect pass.

**Commit:** `test: define focus timing reconstruction` then `feat: implement focus timing domain`.

---

### Task 2: Focus session state machine

**Files:**
- Create: `src/domain/focus/focus-session.ts`
- Create: `src/domain/focus/focus-session.test.ts`

**RED:**

```bash
npx vitest run src/domain/focus/focus-session.test.ts
```

Cover:

- start creates `running` with `runningSince = now`, `accumulatedFocusMs = 0`, `focusedDurationMs = null`
- countdown requires integer `plannedDurationMinutes > 0`
- flow requires `plannedDurationMinutes === null`
- pause from running folds openRunningMs into accumulated and clears runningSince
- resume from paused sets runningSince and does not change accumulated
- complete and abandon from running or paused write focusedDurationMs and endedAt
- pause when not running, resume when not paused, finalize of a terminal session → `invalid_transition`
- start latency is actual local minute minus TimeBlock.startMinute
- validateFocusSession rejects impossible combinations (running without runningSince, inverted timestamps, negative accumulated)

**GREEN:** Implement create/pause/resume/complete/abandon/validate. Re-run. Expect pass.

**Commit:** `test: define focus session state machine` then `feat: implement focus session domain`.

---

### Task 3: Distraction domain

**Files:**
- Create: `src/domain/focus/distraction.ts`
- Create: `src/domain/focus/distraction.test.ts`

**RED:**

```bash
npx vitest run src/domain/focus/distraction.test.ts
```

Cover: trimmed required text, max 200 chars, capture allowed only on running/paused, interruption count is `distractions.length`.

**GREEN:** Implement. Re-run. Expect pass.

**Commit:** `test: define distraction capture rules` then `feat: implement distraction domain`.

---

### Task 4: Guest DB v2 and focus persistence

**Files:**
- Modify: `src/infrastructure/persistence/guest/guest-db.ts` — `GUEST_DB_VERSION = 2`; add `focusSessions` (indexes `workItemId`, `status`) and `distractions` (index `focusSessionId`). Upgrade must create new stores without deleting v1 stores.
- Modify: `src/infrastructure/persistence/guest/guest-today-repository.test.ts` — `putRaw`/`getRaw` open with `GUEST_DB_VERSION`.
- Create: `src/infrastructure/persistence/contracts/focus-repository.ts`
- Create: `src/infrastructure/persistence/guest/guest-focus-repository.ts`
- Create: `src/infrastructure/persistence/guest/guest-focus-repository.test.ts`

**RED:** Write persistence tests against the contract. Command:

```bash
npx vitest run src/infrastructure/persistence/guest/guest-focus-repository.test.ts src/infrastructure/persistence/guest/guest-today-repository.test.ts
```

Expected failure: missing adapter / version 1 putRaw mismatch.

Cover:

- session persists across repository re-instantiation
- running session reloads with same timestamps
- completed session persists focusedDurationMs
- corrupt session record → `corrupt_record`, raw bytes unchanged
- corrupt distraction record → `corrupt_record`, raw bytes unchanged
- closed-connection read → `persistence_read_failed`
- closed-connection write → `persistence_write_failed`
- two active sessions → `corrupt_record` from `getActiveSession`
- `completeSessionWithWorkItem` writes both stores; `beforeWorkItemWrite` throw aborts so session stays previous status and WorkItem.actualMinutes is unchanged

**GREEN:** Implement guest adapter and bump DB version. Re-run. Expect pass, including existing today persistence tests.

**Commit:** `test: define guest focus persistence` then `feat: implement guest focus persistence`.

---

### Task 5: Focus application service

**Files:**
- Create: `src/features/focus/application/focus-service.ts`
- Create: `src/features/focus/application/focus-service.test.ts`

**RED:**

```bash
npx vitest run src/features/focus/application/focus-service.test.ts
```

Use in-memory FocusRepository + TodayRepository (or guest adapters with unique DB names for atomic cases). Inject `now` and `newId`.

Cover:

- start for known WorkItem
- unknown WorkItem / unknown TimeBlock → `unknown_entity`, no session written
- second start while active → `session_active`
- pause, resume, finish, abandon
- distraction capture does not change session status or accumulatedFocusMs
- interruption count equals saved distractions
- reload active session reconstructs elapsed from frozen now
- TimeBlock row is byte-equal after start→pause→resume→finish
- scheduled/planned duration ≠ focusedDurationMs
- finish updates WorkItem.actualMinutes from completed sessions only
- abandon does not change actualMinutes
- atomic complete failure leaves session running/paused and actualMinutes unchanged
- finish does not copy TimeBlock length or planned minutes into actualMinutes
- invalid planned duration → `invalid_planned_duration`

**GREEN:** Implement FocusService. Re-run. Expect pass.

**Commit:** `test: define focus application service` then `feat: implement focus application service`.

---

### Task 6: Focus Station UI

**Files:**
- Create: `src/features/focus/hooks/useFocusController.ts`
- Create: `src/features/focus/components/FocusScreen.tsx`
- Create: `src/features/focus/components/FocusTimer.tsx`
- Create: `src/features/focus/components/FocusControls.tsx`
- Create: `src/features/focus/components/DistractionInbox.tsx`
- Create: `src/features/focus/components/SessionSummary.tsx`
- Create: `src/features/focus/components/StartFocusForm.tsx`
- Create: `src/features/focus/focus-ui.test.tsx`
- Create: `src/features/focus/application/client-focus-service.ts`
- Create: `src/app/(dashboard)/focus/page.tsx`
- Modify: `src/components/shell/Sidebar.tsx` — Focus links to `/focus`, other Later items stay placeholders
- Modify: `src/features/today/components/TaskList.tsx` — “Start focus” control
- Modify: `src/features/today/components/TodayScreen.tsx` if the link needs today’s TimeBlock id
- Modify: `src/features/today/today-ui.test.tsx` — Start focus link includes workItemId and optional timeBlockId

**RED:**

```bash
npx vitest run src/features/focus/focus-ui.test.tsx src/features/today/today-ui.test.tsx
```

Cover:

- Start, Pause, Resume, Finish, Abandon
- elapsed and remaining display (countdown)
- active task title
- distraction quick capture
- persistence error shown without losing distraction/note input
- reconstructed running display from a loaded active session

Match existing Today visual language (indigo, slate, Card/Button/Input). Timer uses `font-tabular`. No emoji, no confetti, no audio.

Query params: `/focus?workItemId=&timeBlockId=` preselect the form and do not auto-start.

**GREEN:** Implement UI, hook, page, sidebar, Today link. Re-run. Expect pass.

**Commit:** `test: define Focus Station UI behavior` then `feat: implement Focus Station UI`.

---

### Task 7: E2E journeys, parity, README

**Files:**
- Create: `e2e/focus.spec.ts`
- Modify: `docs/superpowers/parity/smart-planner-behavior-parity.md`
- Modify: `README.md`

**RED:**

```bash
npx playwright test e2e/focus.spec.ts
```

Journey 1: Today → create/schedule task → Start focus → Focus page → record distraction → pause → resume → finish → evidence visible → reload → evidence remains.

Journey 2: running session → reload → still running → elapsed reconstructed (assert status and a non-zero reconstructed display after a deterministic clock advance or a short real wait of at least 1s before reload).

Parity split (do not mark the whole Focus family PRESERVED):

| Capability | Status |
| --- | --- |
| Focus session timing / state machine / reload reconstruction | PRESERVED |
| Distraction Inbox | SUPERSEDED |
| Execution evidence vs scheduled time | PRESERVED |
| Focus preferences, auto-break, ambient soundscapes, mini/studio timer, notifications | NOT YET IMPLEMENTED |

**GREEN:** Implement e2e, update parity and README. Re-run journeys. Expect pass.

**Commit:** `test: cover Focus Station journeys` then `chore: finalize Focus Station quality gates`.

---

### Task 8: Full quality gates and PR

Commands (all must pass, working tree clean):

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
npm run e2e
git diff --exit-code
```

Push `feat/focus-station`. Open a **draft** PR against `main` titled `Focus Station — Execution Evidence`. Independently audit diff and CI. If green and acceptance criteria hold, mark ready for review. **Do not merge.**

---

## Execution Notes

- IndexedDB v2 upgrade is additive. Existing Today tests must keep passing.
- `putRaw` in Today persistence tests currently hardcodes version `1`; updating it is required in Task 4, not optional.
- Domain modules must not import React, `idb`, or Next.js.
- Feature components must not import `idb` or IndexedDB APIs.
- `actualMinutes` aggregation is `Math.floor(sum(completed.focusedDurationMs) / 60000)` recomputed from all completed sessions for that WorkItem.
- No TODO, TBD, or placeholder production behavior.
