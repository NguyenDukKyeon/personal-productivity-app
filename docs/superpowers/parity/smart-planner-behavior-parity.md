# Smart Planner Behavior Parity Register

**Baseline:** `NguyenDukKyeon/smart-planner`

This register prevents the rebuild from silently losing useful Smart Planner behavior. Each capability must remain one of `PRESERVED`, `SUPERSEDED`, `INTENTIONALLY REMOVED`, or `NOT YET IMPLEMENTED`. `SUPERSEDED` and `INTENTIONALLY REMOVED` require a rationale and evidence.

| Capability | Status | Evidence / destination |
| --- | --- | --- |
| Daily capacity 0–16h | PRESERVED | `src/domain/capacity` + Today UI |
| Single-day TimeBlock scheduling | PRESERVED | `src/domain/time-blocks` + Today service; `TimeBlock` is canonical |
| Multi-day Flexible Planner | PRESERVED | `src/domain/planner` + Flexible Planner (`/planner`). 7-day rolling window, backlog derivation, multi-day scheduling, day capacity, factual overbooking, move semantics, and overlap prohibition. |
| Schedule forecasting | SUPERSEDED | `src/domain/planner/planner-forecast` + Schedule Forecast in `/projects`. Deterministic read-only simulation derived from remaining estimated work and planned capacity without hidden writes or auto-planning. |
| Focus session timing / state machine / reload reconstruction | PRESERVED | `src/domain/focus` + Focus Station; timestamps reconstruct elapsed time, pause excludes paused wall-clock, at most one active session |
| Distraction Inbox | SUPERSEDED | First-class `Distraction` records during running/paused sessions; Smart Planner had no equivalent inbox. Capture does not pause the timer. |
| Execution evidence vs scheduled time | PRESERVED | TimeBlock remains plan; `FocusSession.focusedDurationMs` is reality; `WorkItem.actualMinutes` is derived only from completed sessions |
| Focus preferences, auto-break, ambient soundscapes, mini/studio timer, notifications | NOT YET IMPLEMENTED | Later Focus chrome; XP/coins/chimes stay out of the product |
| Habit tracking & consistency metrics | PRESERVED | `src/domain/habits` + Habits & Routines (`/habits`). Effective-dated schedule revisions, active lifecycle intervals, and factual consistency rates without gamification/streaks. |
| Minimum Viable Version (MVV) & Low friction fallback | SUPERSEDED | First-class `minimumVersion` property on `Habit` and `minimum` check-in kind. Replaces all-or-nothing completion from legacy Smart Planner. |
| Quick Recovery after Misses | SUPERSEDED | Schedule-derived recovery state detecting missed scheduled days and offering immediate resume with minimum version; replaces legacy streak reset to 0 upon missed day. |
| Routines & Contextual Grouping | SUPERSEDED | Canonical single-source `Routine.habitIds` grouping (`id`, `name`, `contextLabel`, `habitIds`) without duplicating `routineId` in Habit. |
| Projects / roadmaps / milestones | PRESERVED | `src/domain/projects` + Projects (`/projects`). Projects lifecycle, ordered milestones roadmap, and work item association with referential integrity. |
| Progress analytics | NOT YET IMPLEMENTED | Review/Analytics |
| Weekly metrics / review | NOT YET IMPLEMENTED | Shutdown + Weekly Review |
| PWA / reminders / Web Push | NOT YET IMPLEMENTED | PWA/Push |
| Safe guest persistence & Corrupt Record Rejection | PRESERVED | Validated IndexedDB v4 guest repository (`src/infrastructure/persistence/guest`) with strict `corrupt_record` rejection that never silently drops or mutates corrupt stored bytes. |
| Backup / import / export / legacy migration | NOT YET IMPLEMENTED | Backup/Migration |
| Daily commitment snapshot | SUPERSEDED | Immutable snapshot + divergence; replaces implicit same-day overwrite |
| Drag and drop scheduling | NOT YET IMPLEMENTED | Scheduling and move actions use explicit modal controls; drag/drop deferred |
| External calendar integrations | NOT YET IMPLEMENTED | Google/Outlook/iCal calendar sync deferred |

## Rules

1. A prototype route or component is not parity evidence by itself.
2. A capability becomes `PRESERVED` only after its acceptance behavior is covered by tests or E2E evidence.
3. A capability becomes `SUPERSEDED` only when the replacement preserves the original useful outcome and the rationale is documented.
4. Nothing becomes `INTENTIONALLY REMOVED` without an explicit product decision.
5. Git history is not a substitute for a working successor behavior.
