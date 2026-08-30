# Foundation + Today + Minimal Commitment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the first production slice of Smart Planner Reborn so a guest can plan today realistically, commit the plan, change/complete work truthfully, see divergence from the commitment, and reload without losing or silently corrupting data.

**Architecture:** Introduce the replacement alongside the current Gemini-generated prototype: pure domain modules → storage-independent Today application service → validated IndexedDB guest repository → focused Today UI. Do not delete the prototype until the replacement Today flow passes its unit/component/build gates. Then remove prototype runtime code while preserving Smart Planner requirements in a behavior-parity register.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict mode, Tailwind CSS v4, Lucide, Zod, `idb`, Vitest, React Testing Library, fake-indexeddb, Playwright, ESLint.

**Spec:** `docs/superpowers/specs/2026-08-30-personal-productivity-foundation-today-design.md`

## Global Constraints

- Product direction is **Behavior-Preserving Rebuild + Discipline Upgrade**.
- Smart Planner is the behavioral baseline; inherited capability families may not disappear silently.
- First implementation scope is **Foundation + Today + Minimal Commitment** only.
- Canonical duration unit is integer minutes.
- Daily date keys are local calendar dates; never use `new Date().toISOString().slice(0, 10)` as a local-day helper.
- Capacity is 0–960 minutes in 30-minute increments; capacity >720 minutes shows a non-blocking caution.
- Top priorities are normalized, unique, ordered and limited to ranks 1–3.
- Scheduling uses `TimeBlock`; do not make `scheduledDate` / `scheduledTimeStart` canonical again.
- Scheduled work, committed work, completed tasks and actual focused work are distinct concepts.
- Product components do not call localStorage, IndexedDB or Supabase directly.
- Guest entity persistence uses IndexedDB and validates every loaded record.
- Persistence failure is never interpreted as an empty dataset; corrupt records are left untouched.
- `Commit Today` writes one immutable snapshot for a date. Later plan edits are allowed but must surface divergence.
- No Supabase, AI provider SDK, audio engine, charting library or drag-and-drop library is needed by the final first-slice runtime.
- No XP, virtual currency, punishment streaks, completion confetti or opaque discipline score.
- No production feature behavior before a failing test, except config/generated files where TDD is not meaningful.
- Quality gates: `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`, `bun run e2e`. Use `bun run test` so Vitest is invoked explicitly.

---

## Current Repository Reality

The implementation branch starts from a prototype that is useful only as visual/product evidence:

- `src/lib/store/useAppStore.ts` is a ~30 KB persisted Zustand store owning tasks, projects, habits, focus, plans, settings, migration and timer behavior.
- `src/app/(dashboard)/today/page.tsx` directly consumes that store plus audio and out-of-scope habit/review components.
- `src/types/index.ts` embeds obsolete canonical fields such as `scheduledDate`, `scheduledTimeStart`, `capacityHours` and `top3ItemIds`.
- Prototype routes already exist for Focus, Habits, Planner, Projects, Review, Roadmap, Settings and AI APIs. Their existence is not parity evidence.
- Git history preserves prototype code; the new runtime does not need to preserve its technical structure.

## Target File Map

```text
src/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── today/page.tsx
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── shell/
│   │   ├── AppShell.tsx
│   │   └── Sidebar.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Input.tsx
│       └── Select.tsx
├── domain/
│   ├── shared/result.ts
│   ├── shared/local-date.ts
│   ├── shared/local-date.test.ts
│   ├── capacity/capacity.ts
│   ├── capacity/capacity.test.ts
│   ├── work-items/work-item.ts
│   ├── work-items/work-item.test.ts
│   ├── daily-plans/daily-plan.ts
│   ├── daily-plans/priorities.ts
│   ├── daily-plans/priorities.test.ts
│   ├── time-blocks/time-block.ts
│   ├── time-blocks/time-block.test.ts
│   ├── commitments/commitment.ts
│   └── commitments/commitment.test.ts
├── features/today/
│   ├── application/today-service.ts
│   ├── application/today-service.test.ts
│   ├── application/client-today-service.ts
│   ├── components/TodayScreen.tsx
│   ├── components/CapacityPanel.tsx
│   ├── components/QuickCaptureForm.tsx
│   ├── components/PriorityList.tsx
│   ├── components/TaskList.tsx
│   ├── components/TimeBlockList.tsx
│   ├── components/CommitmentPanel.tsx
│   ├── hooks/useTodayController.ts
│   └── today-ui.test.tsx
├── infrastructure/persistence/
│   ├── contracts/today-repository.ts
│   └── guest/
│       ├── guest-db.ts
│       ├── guest-today-repository.ts
│       └── guest-today-repository.test.ts
└── test/setup.ts

e2e/today.spec.ts
docs/superpowers/parity/smart-planner-behavior-parity.md
.github/workflows/quality.yml
```

---

### Task 1: Establish the test/tooling baseline and parity register

**Files:**
- Modify: `package.json`
- Remove lock format: `package-lock.json`
- Create from install: `bun.lock`
- Modify: `vitest.config.ts`
- Create: `eslint.config.mjs`
- Create: `playwright.config.ts`
- Create: `src/test/setup.ts`
- Create: `docs/superpowers/parity/smart-planner-behavior-parity.md`

**Interfaces:**
- Produces scripts `typecheck`, `lint`, `test`, `build`, `e2e`
- Produces jsdom + fake IndexedDB test environment
- Produces parity register that constrains every later deletion

- [ ] **Step 1: Record Smart Planner capability obligations before cleanup**

Create:

```markdown
# Smart Planner Behavior Parity Register

| Capability family | Status | Evidence / replacement target |
| --- | --- | --- |
| Daily capacity 0–16h | NOT YET IMPLEMENTED | Foundation + Today |
| Flexible planning / scheduling | NOT YET IMPLEMENTED | TimeBlock first; multi-day planner later |
| Schedule forecasting | NOT YET IMPLEMENTED | Projects/Planner |
| Focus timer / preferences / transitions | NOT YET IMPLEMENTED | Focus Station |
| Habit tracking | NOT YET IMPLEMENTED | Habits & Routines |
| Projects / roadmaps / lesson placement | NOT YET IMPLEMENTED | Projects/Planner |
| Progress analytics | NOT YET IMPLEMENTED | Review/Analytics |
| Weekly metrics / review | NOT YET IMPLEMENTED | Shutdown + Weekly Review |
| PWA / reminders / Web Push | NOT YET IMPLEMENTED | PWA/Push |
| Backup / storage safety / migration | NOT YET IMPLEMENTED | Safe guest store begins now; migration later |
| Daily commitment snapshot | SUPERSEDED | New Discipline Engine: immutable snapshot + divergence |
```

- [ ] **Step 2: Switch to Bun lockfile and add new-slice dependencies without removing prototype dependencies yet**

Run:

```bash
rm -f package-lock.json
bun add zod idb
bun add -d @testing-library/react @testing-library/jest-dom jsdom fake-indexeddb @playwright/test eslint eslint-config-next @eslint/eslintrc
bun install
```

Do **not** remove Supabase, Zustand, confetti, motion or audio-related prototype dependencies in this task; current prototype files still import them.

Set scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test"
  }
}
```

- [ ] **Step 3: Configure Vitest**

`vitest.config.ts`:

```ts
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
  },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});
```

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
```

- [ ] **Step 4: Configure ESLint and Playwright**

`eslint.config.mjs`:

```js
import { FlatCompat } from '@eslint/eslintrc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  { ignores: ['.next/**', 'playwright-report/**', 'test-results/**'] },
];
```

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: 'http://127.0.0.1:3000', trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'bun run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 5: Verify the toolchain before feature work**

Run:

```bash
bun run typecheck
bun run test
bun run build
bun run lint
```

Expected: typecheck/test/build remain green. Lint must execute against the repository; fix existing lint violations without changing product behavior rather than weakening rules.

- [ ] **Step 6: Commit**

```bash
git add package.json bun.lock vitest.config.ts eslint.config.mjs playwright.config.ts src/test/setup.ts docs/superpowers/parity/smart-planner-behavior-parity.md
git rm package-lock.json
git commit -m "chore: establish rebuild quality baseline"
```

---

### Task 2: Build the pure domain core test-first

**Files:**
- Create: `src/domain/shared/result.ts`
- Create: `src/domain/shared/local-date.ts`
- Create: `src/domain/shared/local-date.test.ts`
- Create: `src/domain/capacity/capacity.ts`
- Create: `src/domain/capacity/capacity.test.ts`
- Create: `src/domain/work-items/work-item.ts`
- Create: `src/domain/work-items/work-item.test.ts`
- Create: `src/domain/daily-plans/daily-plan.ts`
- Create: `src/domain/daily-plans/priorities.ts`
- Create: `src/domain/daily-plans/priorities.test.ts`
- Create: `src/domain/time-blocks/time-block.ts`
- Create: `src/domain/time-blocks/time-block.test.ts`
- Create: `src/domain/commitments/commitment.ts`
- Create: `src/domain/commitments/commitment.test.ts`

**Interfaces:**
- Produces `Result<T>`, `WorkItem`, `DailyPlan`, `DailyPriority`, `TimeBlock`, `DailyCommitmentSnapshot`
- Domain imports no React, Next.js or persistence API

- [ ] **Step 1: Write failing local-date and capacity tests**

```ts
// local-date.test.ts
import { describe, expect, it } from 'vitest';
import { parseLocalDateKey, toLocalDateKey } from './local-date';

describe('local date keys', () => {
  it('uses the requested local offset near midnight', () => {
    const date = new Date('2026-08-30T17:30:00.000Z');
    expect(toLocalDateKey(date, 420)).toBe('2026-08-31');
  });
  it('rejects impossible dates', () => expect(parseLocalDateKey('2026-02-30')).toBeNull());
});

// capacity.test.ts
import { expect, it } from 'vitest';
import { analyzeCapacity, validateCapacityMinutes } from './capacity';

it('accepts 0..960 only in 30-minute increments', () => {
  expect(validateCapacityMinutes(0).ok).toBe(true);
  expect(validateCapacityMinutes(960).ok).toBe(true);
  expect(validateCapacityMinutes(301).ok).toBe(false);
  expect(validateCapacityMinutes(990).ok).toBe(false);
});

it('reports overbooking without blocking it', () => {
  expect(analyzeCapacity(300, 360)).toEqual({
    capacityMinutes: 300,
    scheduledMinutes: 360,
    remainingMinutes: -60,
    isOverbooked: true,
    showHighCapacityCaution: false,
  });
});
```

Run and verify RED:

```bash
bun run test src/domain/shared/local-date.test.ts src/domain/capacity/capacity.test.ts
```

- [ ] **Step 2: Implement `Result`, local-date helpers and capacity**

`result.ts`:

```ts
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const err = (code: string, message: string): Result<never> => ({ ok: false, code, message });
```

`local-date.ts` exports:

```ts
export type LocalDateParts = { year: number; month: number; day: number };
export function toLocalDateKey(date: Date, explicitOffsetMinutes?: number): string;
export function parseLocalDateKey(value: string): LocalDateParts | null;
```

When an explicit offset is supplied, shift the timestamp by that offset and read UTC fields from the shifted value. Without it, read environment-local fields. Validate parsed dates by reconstructing year/month/day and comparing fields.

`capacity.ts` exports:

```ts
export function validateCapacityMinutes(minutes: number): Result<number>;
export function analyzeCapacity(capacityMinutes: number, scheduledMinutes: number): {
  capacityMinutes: number;
  scheduledMinutes: number;
  remainingMinutes: number;
  isOverbooked: boolean;
  showHighCapacityCaution: boolean;
};
```

Rules: integer; 0–960; divisible by 30; caution >720.

Run tests and verify GREEN.

- [ ] **Step 3: Write failing work-item lifecycle tests**

```ts
import { expect, it } from 'vitest';
import { completeWorkItem, reopenWorkItem, type WorkItem } from './work-item';

const item: WorkItem = {
  id: 'w1', projectId: null, title: 'Math', notes: '', type: 'task',
  estimatedMinutes: 60, actualMinutes: 0, priority: 'p2_high',
  status: 'backlog', completedAt: null,
  createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z',
};

it('completes without fabricating actual minutes', () => {
  const done = completeWorkItem(item, '2026-08-30T10:00:00.000Z');
  expect(done.status).toBe('completed');
  expect(done.actualMinutes).toBe(0);
  expect(done.completedAt).toBe('2026-08-30T10:00:00.000Z');
});

it('reopens according to scheduling evidence', () => {
  expect(reopenWorkItem({ ...item, status: 'completed' }, false, '2026-08-30T11:00:00.000Z').status).toBe('backlog');
  expect(reopenWorkItem({ ...item, status: 'completed' }, true, '2026-08-30T11:00:00.000Z').status).toBe('scheduled');
});
```

Run and verify RED.

- [ ] **Step 4: Implement `WorkItem` and lifecycle functions**

Define:

```ts
export type WorkItemType = 'task' | 'lesson' | 'milestone';
export type WorkItemPriority = 'p1_urgent' | 'p2_high' | 'p3_medium' | 'p4_low';
export type WorkItemStatus = 'backlog' | 'scheduled' | 'in_progress' | 'completed';

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

export function completeWorkItem(item: WorkItem, completedAt: string): WorkItem;
export function reopenWorkItem(item: WorkItem, hasRelevantBlock: boolean, reopenedAt: string): WorkItem;
```

Both return new objects; neither changes `actualMinutes`.

Run and verify GREEN.

- [ ] **Step 5: Write failing priorities/time-block tests**

```ts
// priorities.test.ts
import { expect, it } from 'vitest';
import { buildPriorities } from './priorities';

it('deduplicates, limits to three and creates contiguous ranks', () => {
  let n = 0;
  const result = buildPriorities('plan-1', ['a', 'b', 'a', 'c', 'd'], () => `p${++n}`);
  expect(result.map((p) => [p.workItemId, p.rank])).toEqual([['a', 1], ['b', 2], ['c', 3]]);
});

// time-block.test.ts
import { expect, it } from 'vitest';
import { detectOverlaps, validateTimeBlock, type TimeBlock } from './time-block';

it('rejects inverted, out-of-day and targetless blocks', () => {
  expect(validateTimeBlock({ workItemId: 'w1', habitId: null, startMinute: 600, endMinute: 600 }).ok).toBe(false);
  expect(validateTimeBlock({ workItemId: 'w1', habitId: null, startMinute: -1, endMinute: 30 }).ok).toBe(false);
  expect(validateTimeBlock({ workItemId: 'w1', habitId: null, startMinute: 1400, endMinute: 1441 }).ok).toBe(false);
  expect(validateTimeBlock({ workItemId: null, habitId: null, startMinute: 600, endMinute: 660 }).ok).toBe(false);
});

it('detects overlap without declaring the blocks invalid', () => {
  const blocks = [
    { id: 'a', date: '2026-08-30', workItemId: 'w1', habitId: null, startMinute: 600, endMinute: 660, createdAt: '', updatedAt: '' },
    { id: 'b', date: '2026-08-30', workItemId: 'w2', habitId: null, startMinute: 650, endMinute: 700, createdAt: '', updatedAt: '' },
  ] satisfies TimeBlock[];
  expect(detectOverlaps(blocks)).toEqual([['a', 'b']]);
});
```

Run and verify RED.

- [ ] **Step 6: Implement `DailyPlan`, priorities and `TimeBlock`**

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

`buildPriorities(planId, ids, newId)` removes duplicates preserving first appearance, keeps the first three and ranks 1..N. `validateTimeBlock` enforces target XOR and bounds. `detectOverlaps` treats intervals as `[startMinute,endMinute)`.

Run and verify GREEN.

- [ ] **Step 7: Write failing commitment comparison test**

```ts
import { expect, it } from 'vitest';
import { compareCommitment, type DailyCommitmentSnapshot } from './commitment';

it('reports exact categories changed after commitment', () => {
  const committed: DailyCommitmentSnapshot = {
    id: 'c1', date: '2026-08-30', committedAt: '2026-08-30T08:00:00.000Z',
    capacityMinutes: 300, priorityWorkItemIds: ['a', 'b'],
    timeBlocks: [{ workItemId: 'a', startMinute: 600, endMinute: 660 }],
  };
  expect(compareCommitment(committed, {
    capacityMinutes: 240, priorityWorkItemIds: ['a', 'b'],
    timeBlocks: [{ workItemId: 'a', startMinute: 600, endMinute: 690 }],
  })).toEqual({ capacityChanged: true, prioritiesChanged: false, timeBlocksChanged: true, hasDivergence: true });
});
```

Run and verify RED.

- [ ] **Step 8: Implement immutable commitment model**

```ts
export interface DailyCommitmentSnapshot {
  id: string;
  date: string;
  committedAt: string;
  capacityMinutes: number;
  priorityWorkItemIds: string[];
  timeBlocks: Array<{ workItemId: string | null; startMinute: number; endMinute: number }>;
}

export interface CommitmentComparablePlan {
  capacityMinutes: number;
  priorityWorkItemIds: string[];
  timeBlocks: Array<{ workItemId: string | null; startMinute: number; endMinute: number }>;
}

export function compareCommitment(snapshot: DailyCommitmentSnapshot, current: CommitmentComparablePlan): {
  capacityChanged: boolean;
  prioritiesChanged: boolean;
  timeBlocksChanged: boolean;
  hasDivergence: boolean;
};
```

Sort both time-block arrays by `startMinute`, `endMinute`, then `workItemId ?? ''` before comparison.

Run all Task 2 tests and verify GREEN.

- [ ] **Step 9: Commit**

```bash
git add src/domain
git commit -m "feat: add pure today domain core"
```

---

### Task 3: Add validated IndexedDB guest persistence

**Files:**
- Create: `src/infrastructure/persistence/contracts/today-repository.ts`
- Create: `src/infrastructure/persistence/guest/guest-db.ts`
- Create: `src/infrastructure/persistence/guest/guest-today-repository.ts`
- Create: `src/infrastructure/persistence/guest/guest-today-repository.test.ts`

**Interfaces:**
- Consumes Task 2 domain types
- Produces `TodayRepository`
- Produces `createGuestTodayRepository(options?): Promise<TodayRepository>`

`TodayRepository`:

```ts
export interface TodayRepository {
  listWorkItems(): Promise<Result<WorkItem[]>>;
  getWorkItem(id: string): Promise<Result<WorkItem | null>>;
  saveWorkItem(item: WorkItem): Promise<Result<void>>;
  getDailyPlan(date: string): Promise<Result<DailyPlan | null>>;
  saveDailyPlan(plan: DailyPlan): Promise<Result<void>>;
  listPriorities(planId: string): Promise<Result<DailyPriority[]>>;
  replacePriorities(planId: string, priorities: DailyPriority[]): Promise<Result<void>>;
  listTimeBlocks(date: string): Promise<Result<TimeBlock[]>>;
  getTimeBlock(id: string): Promise<Result<TimeBlock | null>>;
  listTimeBlocksForWorkItem(workItemId: string): Promise<Result<TimeBlock[]>>;
  saveTimeBlock(block: TimeBlock): Promise<Result<void>>;
  removeTimeBlock(id: string): Promise<Result<void>>;
  getCommitment(date: string): Promise<Result<DailyCommitmentSnapshot | null>>;
  saveCommitment(snapshot: DailyCommitmentSnapshot): Promise<Result<void>>;
}
```

Testable factory options:

```ts
export interface GuestTodayRepositoryOptions {
  databaseName?: string;
  beforePriorityCommit?: () => void;
}
```

`beforePriorityCommit` exists only to deterministically abort a test transaction; production calls omit it.

- [ ] **Step 1: Write persistence tests first**

Write real tests with these assertions:

```ts
it('persists a work item across repository re-instantiation', async () => {
  const name = `guest-${crypto.randomUUID()}`;
  const first = await createGuestTodayRepository({ databaseName: name });
  expect((await first.saveWorkItem(workItem)).ok).toBe(true);
  const second = await createGuestTodayRepository({ databaseName: name });
  expect(await second.getWorkItem(workItem.id)).toEqual({ ok: true, value: workItem });
});

it('returns corrupt_record and leaves malformed storage untouched', async () => {
  // Open the same database with idb, write { id: 'bad' } into workItems,
  // call getWorkItem('bad'), assert code === 'corrupt_record',
  // then read raw row again and assert it still equals { id: 'bad' }.
});

it('replaces daily priorities atomically', async () => {
  // Save original priorities, replace them, assert only replacement rows exist in rank order.
});

it('aborts priority replacement without partial writes', async () => {
  // Create repository with beforePriorityCommit: () => { throw new Error('forced abort'); }.
  // Start from existing priorities, call replacePriorities, assert error,
  // reopen repository without the hook and assert originals remain exactly.
});

it('refuses a second commitment for the same local date', async () => {
  // First save succeeds; second save returns code commitment_exists; first snapshot remains unchanged.
});
```

Replace the explanatory comments with concrete test setup/assertions in the committed test file.

Run and verify RED:

```bash
bun run test src/infrastructure/persistence/guest/guest-today-repository.test.ts
```

- [ ] **Step 2: Implement typed database and Zod schemas**

Database: `personal-productivity-guest`, version `1`.

Stores/indexes:

```text
workItems            keyPath id
dailyPlans           keyPath id; unique index date
dailyPriorities      keyPath id; index dailyPlanId
timeBlocks           keyPath id; index date; index workItemId
dailyCommitments     keyPath id; unique index date
meta                 keyPath key
```

Every returned record is parsed by Zod. On parse failure return:

```ts
{ ok: false, code: 'corrupt_record', message: 'Stored data is invalid and was left untouched.' }
```

Never delete/rewrite invalid rows during reads.

- [ ] **Step 3: Implement repository methods and atomic priority replacement**

`replacePriorities` opens one readwrite transaction on `dailyPriorities`, deletes rows for `planId`, inserts replacements, invokes `beforePriorityCommit?.()`, then awaits `tx.done`. If the hook or IDB fails, abort and return `persistence_write_failed`.

`saveCommitment` checks the unique date index first. Existing date → `commitment_exists`; it never updates the old snapshot.

- [ ] **Step 4: Run persistence tests**

```bash
bun run test src/infrastructure/persistence/guest/guest-today-repository.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure
git commit -m "feat: add safe indexeddb guest repository"
```

---

### Task 4: Build Today application service and commitment loop

**Files:**
- Create: `src/features/today/application/today-service.ts`
- Create: `src/features/today/application/today-service.test.ts`

**Interfaces:**
- Consumes `TodayRepository`
- Produces `TodayService` and `TodayViewModel`

```ts
export interface TodayService {
  getTodayView(date: string): Promise<Result<TodayViewModel>>;
  createTask(input: { title: string; estimatedMinutes: number; priority: WorkItemPriority }): Promise<Result<WorkItem>>;
  setDailyCapacity(date: string, minutes: number): Promise<Result<DailyPlan>>;
  setDailyPriorities(date: string, workItemIds: string[]): Promise<Result<DailyPriority[]>>;
  createTimeBlock(input: { date: string; workItemId: string; startMinute: number; endMinute: number }): Promise<Result<TimeBlock>>;
  updateTimeBlock(id: string, patch: { startMinute: number; endMinute: number }): Promise<Result<TimeBlock>>;
  deleteTimeBlock(id: string): Promise<Result<void>>;
  completeTask(workItemId: string): Promise<Result<WorkItem>>;
  reopenTask(workItemId: string, date: string): Promise<Result<WorkItem>>;
  commitToday(date: string): Promise<Result<DailyCommitmentSnapshot>>;
}

export function createTodayService(deps: {
  repository: TodayRepository;
  now: () => Date;
  newId: () => string;
}): TodayService;
```

`TodayViewModel`:

```ts
export interface TodayViewModel {
  date: string;
  plan: DailyPlan;
  workItems: WorkItem[];
  priorities: Array<{ rank: 1 | 2 | 3; item: WorkItem }>;
  timeBlocks: TimeBlock[];
  scheduledMinutes: number;
  remainingMinutes: number;
  isOverbooked: boolean;
  showHighCapacityCaution: boolean;
  overlapPairs: Array<[string, string]>;
  commitment: DailyCommitmentSnapshot | null;
  divergence: {
    capacityChanged: boolean;
    prioritiesChanged: boolean;
    timeBlocksChanged: boolean;
    hasDivergence: boolean;
  } | null;
}
```

- [ ] **Step 1: Write failing service tests**

Implement concrete in-memory `TodayRepository` test double and tests for:

```ts
it('creates task with task/backlog/actualMinutes=0 defaults', async () => { /* assert full saved item */ });
it('rejects capacity 301 without repository write', async () => { /* invalid_capacity */ });
it('rejects unknown priority IDs', async () => { /* unknown_entity */ });
it('rejects time block for unknown work item', async () => { /* unknown_entity */ });
it('derives scheduled=360 remaining=-60 overbooked=true for capacity=300', async () => { /* getTodayView */ });
it('commits capacity, ordered priorities and sorted blocks exactly once', async () => { /* immutable snapshot */ });
it('reports divergence after capacity changes post-commit', async () => { /* capacityChanged */ });
it('updates a time block by repository ID lookup', async () => { /* getTimeBlock -> validate -> save */ });
it('reopens as scheduled when task has a block on requested date or later', async () => { /* listTimeBlocksForWorkItem */ });
it('reopens as backlog when no relevant block exists', async () => { /* no future/today block */ });
```

Replace all comments with concrete fixtures/assertions before commit.

Run and verify RED.

- [ ] **Step 2: Implement default-plan and mutation rules**

If no plan exists for `date`, `getTodayView` returns an in-memory default:

```ts
{
  id: `plan-${date}`,
  date,
  capacityMinutes: 360,
  morningIntention: '',
  createdAt: nowIso,
  updatedAt: nowIso,
}
```

Do not persist that default until a mutation requires it. `setDailyCapacity` and `setDailyPriorities` create/save the plan when absent.

`createTask`: trim non-empty title; positive integer estimate; defaults `task`, `backlog`, `projectId:null`, `notes:''`, `actualMinutes:0`, `completedAt:null`.

`setDailyPriorities`: verify every ID resolves to a work item, then call `buildPriorities` and `replacePriorities`.

`createTimeBlock`: verify item exists, validate bounds/XOR, save generated block.

`updateTimeBlock`: `getTimeBlock(id)`; unknown → `unknown_entity`; validate patched bounds; preserve date/target/id/timestamps appropriately.

`reopenTask`: fetch `listTimeBlocksForWorkItem`; `hasRelevantBlock = blocks.some(block => block.date >= date)` because YYYY-MM-DD keys sort chronologically.

`commitToday`: call `getTodayView`, snapshot capacity, ordered priority IDs and sorted blocks, then `saveCommitment`. Never derive actual work from the snapshot.

- [ ] **Step 3: Implement aggregation**

`getTodayView`:

```ts
scheduledMinutes = timeBlocks.reduce((sum, block) => sum + block.endMinute - block.startMinute, 0)
```

Use `analyzeCapacity`, `detectOverlaps`, and `compareCommitment`. Sort priorities by rank and blocks by start/end/ID.

- [ ] **Step 4: Run service tests and commit**

```bash
bun run test src/features/today/application/today-service.test.ts
git add src/features/today/application
git commit -m "feat: add today application service and commitment loop"
```

---

### Task 5: Build service-backed Today UI test-first

**Files:**
- Create: `src/features/today/components/TodayScreen.tsx`
- Create: `src/features/today/components/CapacityPanel.tsx`
- Create: `src/features/today/components/QuickCaptureForm.tsx`
- Create: `src/features/today/components/PriorityList.tsx`
- Create: `src/features/today/components/TaskList.tsx`
- Create: `src/features/today/components/TimeBlockList.tsx`
- Create: `src/features/today/components/CommitmentPanel.tsx`
- Create: `src/features/today/hooks/useTodayController.ts`
- Create: `src/features/today/today-ui.test.tsx`
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/Input.tsx`
- Create: `src/components/ui/Select.tsx`

**Interfaces:**
- UI consumes `TodayService`; it imports no repository, storage primitive or Zustand store
- Stable accessible names below become the Playwright contract

Accessible-control contract:

```text
Daily capacity minutes
Save capacity
Task title
Estimated minutes
Priority
Add task
Add <task title> to Top 3
Move <task title> up
Move <task title> down
Remove <task title> from Top 3
Time block task
Time block start
Time block end
Add time block
Edit time block <task title>
Delete time block <task title>
Complete <task title>
Reopen <task title>
Commit Today
```

- [ ] **Step 1: Write failing UI tests with a fake TodayService**

Concrete cases:

```ts
it('submits title, estimate and priority to createTask and refreshes the view', async () => { /* use labels above */ });
it('prevents adding a fourth Top 3 item in the UI', async () => { /* three selected -> fourth add disabled */ });
it('renders Available, Scheduled and Remaining values from the view model', async () => { /* text assertions */ });
it('renders Overbooked by 60 min and still enables Commit Today', async () => { /* isOverbooked */ });
it('renders high-capacity caution above 720 without disabling commit', async () => { /* caution text */ });
it('renders Committed at after commit succeeds', async () => { /* commitment exists */ });
it('renders Plan changed after commitment and changed categories', async () => { /* divergence */ });
it('keeps previous view and shows error when persistence mutation fails', async () => { /* service err */ });
```

Replace comments with complete fake-service setup/assertions before commit. Run and verify RED.

- [ ] **Step 2: Implement `useTodayController`**

`useTodayController(service, date)` owns `view`, `isLoading`, `error`. On successful mutation, reload `getTodayView(date)`. On failure, retain previous `view` and expose the failure message.

- [ ] **Step 3: Implement focused components**

Screen order:

1. local date/status header;
2. Capacity;
3. Quick Capture;
4. Top 3;
5. Task list;
6. Time blocks;
7. Commitment status/action.

Visible rules:

- Capacity shows `Available X min`, `Scheduled Y min`, `Remaining Z min`.
- Negative remaining shows `Overbooked by N min` but does not disable save/commit.
- >720 capacity shows `High capacity: protect sleep, meals and recovery.`
- Before commitment: button `Commit Today`.
- After commitment: show `Committed at HH:mm`; no second-commit button.
- Divergence: show `Plan changed after commitment` plus `Capacity changed`, `Priorities changed`, and/or `Schedule changed`.
- Completed tasks remain visible and show `Reopen <title>`.
- No score/confetti on completion.
- Time blocks use explicit HTML time inputs converted to integer minutes.

- [ ] **Step 4: Run UI tests and commit**

```bash
bun run test src/features/today/today-ui.test.tsx
git add src/features/today src/components/ui
git commit -m "feat: build disciplined today workstation"
```

---

### Task 6: Wire the guest runtime, then remove the prototype

**Files:**
- Create: `src/features/today/application/client-today-service.ts`
- Replace: `src/app/(dashboard)/today/page.tsx`
- Replace: `src/app/(dashboard)/layout.tsx`
- Replace: `src/app/(dashboard)/page.tsx`
- Replace: `src/app/layout.tsx`
- Create: `src/components/shell/AppShell.tsx`
- Create: `src/components/shell/Sidebar.tsx`
- Delete after replacement tests/build are green: `src/lib/store/useAppStore.ts`
- Delete after replacement tests/build are green: `src/components/workstation/`
- Delete after replacement tests/build are green: `src/components/shared/`
- Delete after replacement tests/build are green: `src/components/courses/`
- Delete after replacement tests/build are green: `src/lib/audio/`
- Delete after replacement tests/build are green: `src/lib/algorithms/`
- Delete after replacement tests/build are green: `src/lib/parser/`
- Delete after replacement tests/build are green: `src/types/`
- Delete after replacement tests/build are green: prototype route directories `focus`, `habits`, `planner`, `projects`, `review`, `roadmap`, `settings`
- Delete after replacement tests/build are green: `src/app/api/ai/`
- Modify: `package.json`
- Modify: `docs/superpowers/parity/smart-planner-behavior-parity.md`

**Interfaces:**
- `/` redirects to `/today`
- `/today` is the only canonical working product route for slice 1
- Future capability names may appear disabled in navigation; they must not pretend to be implemented

- [ ] **Step 1: Implement a stable client-service singleton**

`client-today-service.ts`:

```ts
import { createTodayService, type TodayService } from './today-service';
import { createGuestTodayRepository } from '@/infrastructure/persistence/guest/guest-today-repository';

let servicePromise: Promise<TodayService> | null = null;

export function getGuestTodayService(): Promise<TodayService> {
  if (!servicePromise) {
    servicePromise = createGuestTodayRepository().then((repository) =>
      createTodayService({
        repository,
        now: () => new Date(),
        newId: () => crypto.randomUUID(),
      }),
    );
  }
  return servicePromise;
}
```

- [ ] **Step 2: Replace Today route with a thin client boundary**

`today/page.tsx` loads the singleton once in `useEffect`, renders a loading state until service exists, computes the current local key with `toLocalDateKey(new Date())`, then renders:

```tsx
<TodayScreen service={service} date={todayKey} />
```

No direct repository/storage import is allowed in `TodayScreen` or its child components.

- [ ] **Step 3: Replace app/dashboard shell**

`src/app/(dashboard)/page.tsx`:

```ts
import { redirect } from 'next/navigation';
export default function DashboardPage() { redirect('/today'); }
```

`AppShell` + `Sidebar` provide responsive navigation. `Today` is active. Future items (`Focus`, `Habits`, `Planner`, `Projects`, `Review`) are visibly disabled with `Later`; no links to deleted prototype routes.

Replace `src/app/layout.tsx` so it no longer imports prototype `ThemeProvider` or shared components. Preserve metadata and globals; theme switching may be deferred rather than keeping old store coupling.

- [ ] **Step 4: Verify replacement before deletion**

```bash
bun run typecheck
bun run test
bun run build
```

Expected: new Today domain/application/UI tests pass. Prototype files may still compile because their dependencies have not yet been removed.

- [ ] **Step 5: Delete obsolete prototype runtime and remove its unused dependencies**

Delete the exact directories/files listed in this task. Then run:

```bash
bun remove @supabase/ssr @supabase/supabase-js canvas-confetti framer-motion zustand date-fns
```

Run `bun pm ls` and remove `sonner` / `next-themes` only if the replacement source has no imports for them. Do not remove `lucide-react`, `clsx`, `tailwind-merge`, `zod`, `idb`, React/Next/Tailwind or test dependencies.

- [ ] **Step 6: Update parity register truthfully**

Use these statuses:

```markdown
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
```

- [ ] **Step 7: Run all non-E2E gates and commit**

```bash
bun run typecheck
bun run lint
bun run test
bun run build
git add -A
git commit -m "refactor: replace prototype runtime with today vertical slice"
```

All four commands must PASS before commit.

---

### Task 7: Prove the critical journey with Playwright and CI

**Files:**
- Create: `e2e/today.spec.ts`
- Create: `.github/workflows/quality.yml`
- Modify only if required by observed failure: `playwright.config.ts`

**Interfaces:**
- E2E uses the accessible-control contract from Task 5
- CI proves clean-checkout quality gates

- [ ] **Step 1: Write the first concrete failing E2E**

`e2e/today.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('guest plans, commits, diverges and reloads without losing truth', async ({ page }) => {
  await page.goto('/today');

  await page.getByLabel('Daily capacity minutes').fill('300');
  await page.getByRole('button', { name: 'Save capacity' }).click();

  for (const [title, minutes, priority] of [
    ['Algebra', '60', 'p1_urgent'],
    ['IELTS Writing', '45', 'p2_high'],
    ['Chemistry', '90', 'p2_high'],
  ] as const) {
    await page.getByLabel('Task title').fill(title);
    await page.getByLabel('Estimated minutes').fill(minutes);
    await page.getByLabel('Priority').selectOption(priority);
    await page.getByRole('button', { name: 'Add task' }).click();
  }

  await page.getByRole('button', { name: 'Add Algebra to Top 3' }).click();
  await page.getByRole('button', { name: 'Add IELTS Writing to Top 3' }).click();
  await page.getByRole('button', { name: 'Add Chemistry to Top 3' }).click();

  await page.getByLabel('Time block task').selectOption({ label: 'Algebra' });
  await page.getByLabel('Time block start').fill('17:00');
  await page.getByLabel('Time block end').fill('18:00');
  await page.getByRole('button', { name: 'Add time block' }).click();

  await expect(page.getByText('Scheduled 60 min')).toBeVisible();
  await expect(page.getByText('Remaining 240 min')).toBeVisible();

  await page.getByRole('button', { name: 'Commit Today' }).click();
  await expect(page.getByText(/Committed at/)).toBeVisible();

  await page.getByLabel('Daily capacity minutes').fill('240');
  await page.getByRole('button', { name: 'Save capacity' }).click();
  await expect(page.getByText('Plan changed after commitment')).toBeVisible();
  await expect(page.getByText('Capacity changed')).toBeVisible();

  await page.getByRole('button', { name: 'Complete Algebra' }).click();
  await expect(page.getByRole('button', { name: 'Reopen Algebra' })).toBeVisible();

  await page.reload();

  await expect(page.getByText(/Committed at/)).toBeVisible();
  await expect(page.getByText('Plan changed after commitment')).toBeVisible();
  await expect(page.getByText('Capacity changed')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reopen Algebra' })).toBeVisible();
  await expect(page.getByText('17:00–18:00')).toBeVisible();
  await expect(page.getByText('Algebra')).toBeVisible();
});
```

Run:

```bash
bunx playwright install chromium
bun run e2e
```

Expected initially: RED on any missing behavior/accessibility contract. Fix product behavior/labels rather than weakening selectors.

- [ ] **Step 2: Write the overbooking E2E**

Append:

```ts
test('overbooking is visible but does not block commitment', async ({ page }) => {
  await page.goto('/today');
  await page.getByLabel('Daily capacity minutes').fill('60');
  await page.getByRole('button', { name: 'Save capacity' }).click();

  await page.getByLabel('Task title').fill('Long Study Block');
  await page.getByLabel('Estimated minutes').fill('90');
  await page.getByLabel('Priority').selectOption('p1_urgent');
  await page.getByRole('button', { name: 'Add task' }).click();

  await page.getByLabel('Time block task').selectOption({ label: 'Long Study Block' });
  await page.getByLabel('Time block start').fill('09:00');
  await page.getByLabel('Time block end').fill('10:30');
  await page.getByRole('button', { name: 'Add time block' }).click();

  await expect(page.getByText('Overbooked by 30 min')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Commit Today' })).toBeEnabled();
  await page.getByRole('button', { name: 'Commit Today' }).click();
  await expect(page.getByText(/Committed at/)).toBeVisible();
});
```

Run `bun run e2e`; expected: PASS for both tests.

- [ ] **Step 3: Add CI**

`.github/workflows/quality.yml`:

```yaml
name: quality
on:
  pull_request:
  push:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run typecheck
      - run: bun run lint
      - run: bun run test
      - run: bun run build
      - run: bunx playwright install --with-deps chromium
      - run: bun run e2e
```

- [ ] **Step 4: Run final verification**

```bash
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun run test
bun run build
bun run e2e
git diff --exit-code
```

Every command exits 0; verification does not mutate committed source.

- [ ] **Step 5: Commit**

```bash
git add e2e/today.spec.ts .github/workflows/quality.yml playwright.config.ts
git commit -m "test: verify today commitment journey end to end"
```

---

## Final Acceptance Checklist

- [ ] `/today` is the primary working route and `/` redirects to it.
- [ ] Guest creates tasks with title, estimate and priority.
- [ ] Capacity accepts 0–16h in 30-minute steps and warns above 12h without blocking.
- [ ] Top priorities are unique, ordered and limited to three.
- [ ] Time blocks are first-class entities; overlaps are visible warnings, not rejected plans.
- [ ] Scheduled/remaining minutes derive from blocks.
- [ ] Completion never fabricates actual focused time.
- [ ] Completed tasks can be reopened according to scheduling evidence.
- [ ] `Commit Today` writes one immutable snapshot per local date.
- [ ] Post-commit edits remain possible and surface precise divergence categories.
- [ ] Reload preserves tasks, priority order, blocks, completion, commitment and divergence.
- [ ] Corrupt IndexedDB data is reported and left untouched.
- [ ] UI imports no localStorage/IndexedDB/Supabase primitive.
- [ ] Old persisted Zustand store is absent from final runtime.
- [ ] Prototype Focus/Habits/Planner/etc. are not misrepresented as completed parity.
- [ ] Parity register reflects implementation truth.
- [ ] `bun run typecheck` PASS.
- [ ] `bun run lint` PASS.
- [ ] `bun run test` PASS.
- [ ] `bun run build` PASS.
- [ ] `bun run e2e` PASS.
- [ ] Clean-checkout CI PASS.

## Self-Review Outcome

### Spec coverage

- Foundation/toolchain: Tasks 1 and 7.
- Pure domain boundaries and local-date truth: Task 2.
- IndexedDB validation, immutable commitment storage and atomic priorities: Task 3.
- Today capacity/Top3/task/time-block/commitment business behavior: Task 4.
- Low-friction UI plus persistence-error truthfulness: Task 5.
- Prototype replacement without silent Smart Planner regression: Task 6 + parity register.
- Acceptance journey and clean-checkout proof: Task 7.

### Placeholder scan

No implementation task contains `TBD`, `TODO`, `implement later` or a mandatory behavior delegated to unspecified error handling. Test steps prescribe exact cases; explanatory setup comments in the plan must be replaced by real test code before each test commit.

### Type consistency

Canonical names are consistent across tasks: `capacityMinutes`, `DailyPriority`, `TimeBlock`, `DailyCommitmentSnapshot`, `TodayRepository`, `TodayService`, `TodayViewModel`, `Result<T>`. Obsolete prototype names `capacityHours`, `top3ItemIds`, `scheduledDate` and `scheduledTimeStart` are not reused.

### Dependency-order consistency

Prototype dependencies remain installed until Task 6, after the new Today route passes typecheck/test/build. Cleanup therefore cannot break the prototype before the replacement exists.

### Repository-interface consistency

`getTimeBlock` supports updates by ID. `listTimeBlocksForWorkItem` supports truthful reopen behavior for today/future scheduling evidence. Persistence tests have a deterministic transaction-abort hook instead of an unspecified fault injection.

### Data-truth consistency

Scheduled minutes never become actual focus minutes, commitment snapshots are never rewritten, and read/write failures never become empty-data success states.
