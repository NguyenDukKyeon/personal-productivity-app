# Smart Planner Reborn — Foundation + Today + Focus Station + Habits & Routines

Guest-only **Today workstation**, **Focus Station**, and **Habits & Routines** workstation for a high-discipline personal productivity rebuild. This repository implements three vertical slices:
1. Plan one local day and commit that plan with divergence tracking (`/today`).
2. Turn scheduled work into truthful focus execution evidence (`/focus`).
3. Build repeatable consistency with low-friction habits, minimum viable versions, and fast recovery (`/habits`).

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

### Safe Guest Persistence
- **IndexedDB persistence** (`GuestHabitRepository`, `GuestTodayRepository`, `GuestFocusRepository`) that validates schemas pre-write and pre-read, refusing to silently repair or drop corrupt data (`err('corrupt_record', ...)`).

Reload preserves all saved plans, focus sessions, habits, routines, and check-in history.

## What is not yet implemented

These remain roadmap inheritances and are not available in this slice:

- Focus preferences, auto-break, ambient audio, mini/studio timer, notifications
- Multi-day Flexible Planner
- Projects / Roadmaps / lesson placement
- Weekly Review / analytics
- AI Coach
- PWA / reminders / Web Push
- Backup, import/export, and legacy Smart Planner migration
- Natural-language capture, command palette, spaced repetition, confetti

Sidebar entries for Planner, Projects, and Review are placeholders.

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

The app is accessible at `http://localhost:3000/today`, `http://localhost:3000/focus`, and `http://localhost:3000/habits`.

## License

Developed by **NguyenDukKyeon**. MIT.
