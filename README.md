# Smart Planner Reborn — Foundation + Today + Focus Station + Habits & Routines + Projects & Flexible Planner

Guest-only **Today workstation**, **Focus Station**, **Habits & Routines**, **Projects & Roadmaps**, and **Flexible Planner** workstation for a high-discipline personal productivity rebuild. This repository implements four vertical slices:
1. Plan one local day and commit that plan with divergence tracking (`/today`).
2. Turn scheduled work into truthful focus execution evidence (`/focus`).
3. Build repeatable consistency with low-friction habits, minimum viable versions, and fast recovery (`/habits`).
4. Define outcomes, milestones, and multi-day schedules with deterministic forecast simulation (`/projects`, `/planner`).

It is not the full Smart Planner product yet.

## What this slice does

### Today Workstation (`/today`, `/`)
- **Daily capacity** of 0–960 minutes in 30-minute steps, with remaining time, overbooking, and a caution above 720 minutes
- **Quick capture** of a task title, estimate, and priority into the backlog
- **Top 1–3 priorities** for the day
- **Single-day TimeBlocks** as the canonical schedule
- **Complete / reopen** using TimeBlock evidence for today or later
- **Commit Today** as an immutable snapshot, with later plan-vs-commitment divergence

### Focus Station (`/focus`)
- **Countdown and flow** sessions reconstructed from timestamps after reload or sleep
- **Pause / resume / finish / abandon** with paused time excluded from focused duration
- **Distraction Inbox** that records interruptions without stopping the timer
- **Actual minutes** derived only from completed `FocusSession` records, never from TimeBlock length or task completion

### Habits & Routines (`/habits`)
- **Repeatable behaviors with Cues**: Define cue/context, habit title, description, and daily or weekday recurrence
- **Minimum Viable Version (MVV)**: Low-friction version to do when resistance/friction is high
- **Truthful Check-In States**: Distinguish Full, Minimum, and explicit Skipped states with audit timestamps
- **Recovery Mode**: Instant, shame-free recovery guidance on the next scheduled day after a miss without streak anxiety or gamified XP resets
- **Effective-Dated Lifecycle & History**: Active lifecycle intervals (`activeIntervals`) and schedule revisions (`scheduleRevisions`) prevent false historical misses for dates before creation or during archive intervals
- **Routines**: Group habits into named daily contexts (e.g. "Morning Startup", "Night Reset") with single-source canonical membership (`Routine.habitIds`)

### Projects & Roadmaps (`/projects`)
- **Outcome Management**: Active, archived, and completed lifecycle states with target completion dates
- **Milestone Sequencing**: Ordered milestones representing the project's roadmap
- **WorkItem Project Association**: Connect tasks to projects with strict referential validation
- **Schedule Forecasting**: Deterministic, read-only simulation projecting completion dates from remaining estimated work and future daily capacity without auto-planning or hidden writes

### Flexible Planner (`/planner`)
- **7-Day Rolling View**: Dynamic multi-day planning horizon showing per-day capacity and scheduled allocations
- **Unscheduled Backlog**: Automatically derives unplaced work items with project filter
- **Explicit Scheduling & Move**: Place tasks into time blocks with exact date/start/end times; moving preserves singular identity without duplicate creation
- **Factual Overbooking**: Highlights days exceeding planned capacity without destructive auto-rescheduling
- **Overlap Prohibition**: Enforces non-overlapping TimeBlocks at domain and persistence boundaries

### Safe Guest Persistence
- **IndexedDB v4 persistence** (`GuestProjectRepository`, `GuestPlannerRepository`, `GuestHabitRepository`, `GuestTodayRepository`, `GuestFocusRepository`) that validates schemas pre-write and pre-read, refusing to silently repair or drop corrupt data (`err('corrupt_record', ...)`). Seamless schema migration from v1/v2/v3 preserving all existing records.

Reload preserves all saved plans, focus sessions, habits, routines, projects, milestones, and multi-day time blocks.

## What is not yet implemented

These remain roadmap inheritances and are not available in this slice:

- Drag and drop time block rearrangement
- External calendar integrations (Google, Outlook, iCal)
- Focus preferences, auto-break, ambient audio, mini/studio timer, notifications
- Weekly Review / analytics
- AI Coach
- PWA / reminders / Web Push
- Backup, import/export, and legacy Smart Planner migration
- Natural-language capture, command palette, spaced repetition, confetti

Sidebar entry for Review is a placeholder.

## Stack

- Next.js 15 App Router, React 19, TypeScript
- Tailwind CSS v4 and Lucide icons
- IndexedDB via `idb`, with Zod plus domain invariant checks on read
- Vitest (jsdom + fake-indexeddb) and Playwright

No Zustand store, Framer Motion, or Web Audio in this slice.

## Local commands

```bash
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm run e2e
```

The app is accessible at `http://localhost:3000/today`, `http://localhost:3000/focus`, `http://localhost:3000/habits`, `http://localhost:3000/projects`, and `http://localhost:3000/planner`.

## License

Developed by **NguyenDukKyeon**. MIT.
