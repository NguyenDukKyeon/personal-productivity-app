# Smart Planner Behavior Parity Register

**Baseline:** `NguyenDukKyeon/smart-planner`

This register prevents the rebuild from silently losing useful Smart Planner behavior. Each capability must remain one of `PRESERVED`, `SUPERSEDED`, `INTENTIONALLY REMOVED`, or `NOT YET IMPLEMENTED`. `SUPERSEDED` and `INTENTIONALLY REMOVED` require a rationale and evidence.

| Capability | Status | Evidence / destination |
| --- | --- | --- |
| Daily capacity 0–16h | PRESERVED | `src/domain/capacity` + Today UI |
| Flexible planning / scheduling | PRESERVED | Single-day `TimeBlock`; multi-day planner remains NOT YET IMPLEMENTED |
| Schedule forecasting | NOT YET IMPLEMENTED | Projects/Planner |
| Focus timer / preferences / transitions | NOT YET IMPLEMENTED | Focus Station |
| Habit tracking | NOT YET IMPLEMENTED | Habits & Routines |
| Projects / roadmaps / lesson placement | NOT YET IMPLEMENTED | Projects/Planner |
| Progress analytics | NOT YET IMPLEMENTED | Review/Analytics |
| Weekly metrics / review | NOT YET IMPLEMENTED | Shutdown + Weekly Review |
| PWA / reminders / Web Push | NOT YET IMPLEMENTED | PWA/Push |
| Backup / storage safety / migration | SUPERSEDED | Validated IndexedDB guest persistence now; legacy import/export remains NOT YET IMPLEMENTED |
| Daily commitment snapshot | SUPERSEDED | Immutable snapshot + divergence |

## Rules

1. A prototype route or component is not parity evidence by itself.
2. A capability becomes `PRESERVED` only after its acceptance behavior is covered by tests or E2E evidence.
3. A capability becomes `SUPERSEDED` only when the replacement preserves the original useful outcome and the rationale is documented.
4. Nothing becomes `INTENTIONALLY REMOVED` without an explicit product decision.
5. Git history is not a substitute for a working successor behavior.
