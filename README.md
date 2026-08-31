# Smart Planner Reborn — Foundation + Today + Focus Station

Guest-only **Today workstation** and **Focus Station** for a high-discipline personal productivity rebuild. This repository currently implements two vertical slices: plan one local day and commit that plan, then turn scheduled work into truthful execution evidence.

It is not the full Smart Planner product yet.

## What this slice does

- **Today workstation** at `/today` (also `/`)
- **Daily capacity** of 0–960 minutes in 30-minute steps, with remaining time, overbooking, and a caution above 720 minutes
- **Quick capture** of a task title, estimate, and priority into the backlog
- **Top 1–3 priorities** for the day
- **Single-day TimeBlocks** as the canonical schedule (no `scheduledDate` / `scheduledTimeStart`)
- **Complete / reopen** using TimeBlock evidence for today or later
- **Commit Today** as an immutable snapshot, with later plan-vs-commitment divergence
- **Focus Station** at `/focus`, reachable from Today via **Start focus**
- **Countdown and flow** sessions reconstructed from timestamps after reload or sleep
- **Pause / resume / finish / abandon** with paused time excluded from focused duration
- **Distraction Inbox** that records interruptions without stopping the timer
- **Actual minutes** derived only from completed `FocusSession` records, never from TimeBlock length or task completion
- **Guest IndexedDB persistence** that validates records and refuses to silently repair corrupt data

Reload keeps the saved guest plan and any running or completed focus evidence.

## What is not yet implemented

These remain roadmap inheritances and are not available in this slice:

- Focus preferences, auto-break, ambient audio, mini/studio timer, notifications
- Habits & Routines
- Multi-day Flexible Planner
- Projects / Roadmaps / lesson placement
- Weekly Review / analytics
- AI Coach
- PWA / reminders / Web Push
- Backup, import/export, and legacy Smart Planner migration
- Natural-language capture, command palette, spaced repetition, confetti

Sidebar entries for Habits, Planner, Projects, and Review are placeholders.

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

The app is at `http://localhost:3000/today` and `http://localhost:3000/focus`.

## License

Developed by **NguyenDukKyeon**. MIT.
