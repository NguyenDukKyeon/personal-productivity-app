# Foundation + Today + Minimal Commitment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the first production slice of Smart Planner Reborn so a guest can realistically plan today, commit the plan, execute task state changes, see divergence from the commitment, and reload without losing or silently corrupting data.

**Architecture:** Keep the current Next.js 15 shell only as temporary scaffolding while new code is introduced behind pure domain modules, a storage-independent application service, and an IndexedDB guest repository. The existing Gemini-generated Zustand/localStorage application is treated as a prototype: it remains in place only until the replacement Today flow is green, then is removed from the canonical runtime while its product ideas remain represented in the Smart Planner behavior-parity register.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict mode, Tailwind CSS v4, Lucide, Zod, IndexedDB via `idb`, Vitest, React Testing Library, fake-indexeddb, Playwright, ESLint.

**Spec:** `docs/superpowers/specs/2026-08-30-personal-productivity-foundation-today-design.md`

## Global Constraints

- Product direction is **Behavior-Preserving Rebuild + Discipline Upgrade**.
- Smart Planner is the behavioral baseline; inherited capabilities may not disappear silently.
- First implementation scope is **Foundation + Today + Minimal Commitment** only.
- Canonical duration unit is integer minutes.
- Daily date keys are local calendar dates; do not use `new Date().toISOString().slice(0, 10)` for a local day.
- Capacity range is 0–960 minutes with 30-minute UI steps; values above 720 minutes show a non-blocking caution.
- Top priorities are normalized and limited to ranks 1–3.
- Scheduling uses `TimeBlock`; do not reintroduce `scheduledDate` / `scheduledTimeStart` as the canonical scheduling model.
- Scheduled work, committed work, task completion, and actual focused work are distinct concepts.
- Product components must not call localStorage, IndexedDB, or Supabase directly.
- Guest entity persistence uses IndexedDB with validation at the boundary.
- Persistence failure is never interpreted as an empty dataset and corrupt data is never auto-reset.
- Significant changes after `Commit Today` must be visible as divergence; commitment history is immutable.
- No Supabase, AI provider SDK, audio engine, charting library, or drag-and-drop dependency is required for this slice.
- No XP, virtual currency, punishment streaks, confetti-as-progress, or opaque discipline score.
- No production feature behavior is written before its failing test, except configuration/generated files where TDD is not meaningful.
- Quality gates are `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`, `bun run e2e`. This plan uses `bun run test` rather than the spec's shorthand `bun test` so the configured Vitest package script is unambiguous.

---

## Current Repository Reality

The branch starts from a Gemini-generated prototype. Important facts the implementer must respect:

- `src/lib/store/useAppStore.ts` is a large persisted Zustand store that owns tasks, projects, habits, focus, plans, settings, migration and timers.
- `src/app/(dashboard)/today/page.tsx` directly reads that store and composes capacity, Top 3, spaced reviews, habits and audio-backed interactions.
- `src/types/index.ts` still embeds `scheduledDate`, `scheduledTimeStart`, `capacityHours`, and `top3ItemIds` in the old data model.
- Out-of-scope routes already exist for Focus, Habits, Planner, Projects, Review, Roadmap, Settings and AI APIs. Their presence does **not** mean those implementations satisfy Smart Planner parity.
- Existing prototype code must remain available in Git history, but it must not dictate the new domain or persistence architecture.

## Target File Map

```text
src/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx
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
│   ├── shared/
│   │   ├── result.ts
│   │   └── local-date.ts
│   ├── capacity/
│   │   ├── capacity.ts
│   │   └── capacity.test.ts
│   ├── work-items/
│   │   ├── work-item.ts
│   │   └── work-item.test.ts
│   ├── daily-plans/
│   │   ├── daily-plan.ts
│   │   ├── priorities.ts
│   │   └── priorities.test.ts
│   ├── time-blocks/
│   │   ├── time-block.ts
│   │   └── time-block.test.ts
│   └── commitments/
│       ├── commitment.ts
│       └── commitment.test.ts
├── features/
│   └── today/
│       ├── application/
│       │   ├── today-service.ts
│       │   └── today-service.test.ts
│       ├── components/
│       │   ├── TodayScreen.tsx
│       │   ├── CapacityPanel.tsx
│       │   ├── QuickCaptureForm.tsx
│       │   ├── PriorityList.tsx
│       │   ├── TaskList.tsx
│       │   ├── TimeBlockList.tsx
│       │   └── CommitmentPanel.tsx
│       ├── hooks/
│       │   └── useTodayController.ts
│       └── today-ui.test.tsx
├── infrastructure/
│   └── persistence/
│       ├── contracts/
│       │   └── today-repository.ts
│       └── guest/
│           ├── guest-db.ts
│           ├── guest-today-repository.ts
│           └── guest-today-repository.test.ts
└── test/
    └── setup.ts

e2e/
└── today.spec.ts

docs/superpowers/parity/
└── smart-planner-behavior-parity.md

.github/workflows/
└── quality.yml
```

---

### Task 1: Establish a trustworthy toolchain and behavior-parity safety net

**Files:**
- Modify: `package.json`
- Replace generated lock choice: remove `package-lock.json`, create and commit `bun.lock`
- Modify: `vitest.config.ts`
- Create: `eslint.config.mjs`
- Create: `playwright.config.ts`
- Create: `src/test/setup.ts`
- Create: `docs/superpowers/parity/smart-planner-behavior-parity.md`

**Interfaces:**
- Produces scripts: `typecheck`, `lint`, `test`, `build`, `e2e`
- Produces browser-test environment with Testing Library + fake IndexedDB
- Produces parity register that later cleanup tasks must update instead of silently deleting behavior

- [ ] **Step 1: Record the inherited capability register before deleting any prototype code**

Create `docs/superpowers/parity/smart-planner-behavior-parity.md` with this exact initial table:

```markdown
# Smart Planner Behavior Parity Register

| Capability family | Status | Evidence / replacement target |
| --- | --- | --- |
| Daily capacity 0–16h | NOT YET IMPLEMENTED | Foundation + Today slice |
| Flexible planning / scheduling | NOT YET IMPLEMENTED | TimeBlock in Foundation + Today; multi-day planner later |
| Schedule forecasting | NOT YET IMPLEMENTED | Projects/Planner slice |
| Focus timer / preferences / transitions | NOT YET IMPLEMENTED | Focus Station slice |
| Habit tracking | NOT YET IMPLEMENTED | Habits & Routines slice |
| Projects / roadmaps / lesson placement | NOT YET IMPLEMENTED | Projects/Planner slice |
| Progress analytics | NOT YET IMPLEMENTED | Review/Analytics slice |
| Weekly metrics / review | NOT YET IMPLEMENTED | Shutdown + Weekly Review slice |
| PWA / reminders / Web Push | NOT YET IMPLEMENTED | PWA/Push slice |
| Backup / storage safety / migration | NOT YET IMPLEMENTED | Guest persistence begins in Foundation; migration later |
| Daily commitment snapshot | SUPERSEDED | New Discipline Engine capability; immutable snapshot + divergence |
```

- [ ] **Step 2: Normalize the package manager and add only first-slice dependencies**

Run:

```bash
rm -f package-lock.json
bun remove @supabase/ssr @supabase/supabase-js canvas-confetti framer-motion zustand
bun add zod idb
bun add -d @testing-library/react @testing-library/jest-dom jsdom fake-indexeddb @playwright/test eslint eslint-config-next
bun install
```

Keep `next`, `react`, `react-dom`, `tailwindcss`, `lucide-react`, `clsx`, `tailwind-merge`, `next-themes`, `sonner` unless later tasks prove one unused.

Set scripts to:

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

- [ ] **Step 3: Configure Vitest for both pure-domain and React tests**

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
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
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
  { ignores: ['.next/**', 'coverage/**', 'playwright-report/**', 'test-results/**'] },
];
```

If installed `eslint-config-next` exposes native flat config in the resolved version, use its documented flat export instead of `FlatCompat`; the observable requirement is that `bun run lint` lint-checks the repository without `next lint`.

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'bun run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 5: Run the repository gates and record the baseline**

Run:

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

Expected: failures caused by removing prototype-only dependencies are allowed at this point only if they are listed in the commit message/body and are resolved by Task 6 when prototype runtime code is removed. Test infrastructure itself must load successfully.

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
- Produces `Result<T>`, `LocalDateKey`, `WorkItem`, `DailyPlan`, `DailyPriority`, `TimeBlock`, `DailyCommitmentSnapshot`
- Produces domain functions used by persistence and application tasks

- [ ] **Step 1: Write failing tests for local dates and capacity**

`src/domain/shared/local-date.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { toLocalDateKey, parseLocalDateKey } from './local-date';

describe('local date keys', () => {
  it('uses the local calendar date rather than UTC date', () => {
    const date = new Date('2026-08-30T17:30:00.000Z'); // 00:30 next day at UTC+7
    expect(toLocalDateKey(date, 7 * 60)).toBe('2026-08-31');
  });

  it('rejects impossible dates', () => {
    expect(parseLocalDateKey('2026-02-30')).toBeNull();
  });
});
```

`src/domain/capacity/capacity.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { analyzeCapacity, validateCapacityMinutes } from './capacity';

describe('capacity', () => {
  it('accepts 0 and 960 and rejects values outside the range', () => {
    expect(validateCapacityMinutes(0).ok).toBe(true);
    expect(validateCapacityMinutes(960).ok).toBe(true);
    expect(validateCapacityMinutes(-30).ok).toBe(false);
    expect(validateCapacityMinutes(990).ok).toBe(false);
  });

  it('requires 30-minute increments', () => {
    expect(validateCapacityMinutes(301).ok).toBe(false);
  });

  it('reports overbooking without rejecting the plan', () => {
    expect(analyzeCapacity(300, 360)).toEqual({
      capacityMinutes: 300,
      scheduledMinutes: 360,
      remainingMinutes: -60,
      isOverbooked: true,
      showHighCapacityCaution: false,
    });
  });
});
```

Run:

```bash
bun run test src/domain/shared/local-date.test.ts src/domain/capacity/capacity.test.ts
```

Expected: FAIL because modules do not exist.

- [ ] **Step 2: Implement shared result, date helpers and capacity logic**

`src/domain/shared/result.ts`:

```ts
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const err = (code: string, message: string): Result<never> => ({ ok: false, code, message });
```

`src/domain/shared/local-date.ts` must expose:

```ts
export type LocalDateKey = `${number}-${number}-${number}`;
export type LocalDateParts = { year: number; month: number; day: number };

export function toLocalDateKey(date: Date, explicitOffsetMinutes?: number): LocalDateKey;
export function parseLocalDateKey(value: string): LocalDateParts | null;
```

Implementation rule: when `explicitOffsetMinutes` is supplied, shift the UTC timestamp by that many minutes and read UTC fields from the shifted date; otherwise use the environment's local `getFullYear/getMonth/getDate` fields.

`src/domain/capacity/capacity.ts` must expose:

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

Rules: integer, 0–960 inclusive, divisible by 30; caution when capacity > 720.

Run the two tests again. Expected: PASS.

- [ ] **Step 3: Write failing tests for work-item completion/reopen**

`src/domain/work-items/work-item.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
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

it('reopens to scheduled only when a relevant block exists', () => {
  expect(reopenWorkItem({ ...item, status: 'completed' }, false).status).toBe('backlog');
  expect(reopenWorkItem({ ...item, status: 'completed' }, true).status).toBe('scheduled');
});
```

Run and verify RED.

- [ ] **Step 4: Implement the work-item model**

`src/domain/work-items/work-item.ts` defines the spec-v2 `WorkItem` model and:

```ts
export function completeWorkItem(item: WorkItem, completedAt: string): WorkItem;
export function reopenWorkItem(item: WorkItem, hasRelevantBlock: boolean): WorkItem;
```

Both functions return new objects and update `updatedAt`; neither mutates `actualMinutes`.

Run and verify GREEN.

- [ ] **Step 5: Write failing tests for priority ranking and time blocks**

`src/domain/daily-plans/priorities.test.ts`:

```ts
import { expect, it } from 'vitest';
import { buildPriorities } from './priorities';

it('deduplicates, limits to three and creates contiguous ranks', () => {
  const result = buildPriorities('plan-1', ['a', 'b', 'a', 'c', 'd'], () => 'id');
  expect(result.map((p) => [p.workItemId, p.rank])).toEqual([
    ['a', 1], ['b', 2], ['c', 3],
  ]);
});
```

`src/domain/time-blocks/time-block.test.ts`:

```ts
import { expect, it } from 'vitest';
import { detectOverlaps, validateTimeBlock, type TimeBlock } from './time-block';

it('rejects inverted and out-of-day blocks', () => {
  expect(validateTimeBlock({ startMinute: 600, endMinute: 600 }).ok).toBe(false);
  expect(validateTimeBlock({ startMinute: -1, endMinute: 30 }).ok).toBe(false);
  expect(validateTimeBlock({ startMinute: 1400, endMinute: 1441 }).ok).toBe(false);
});

it('detects but does not forbid overlaps', () => {
  const blocks = [
    { id: 'a', date: '2026-08-30', workItemId: 'w1', habitId: null, startMinute: 600, endMinute: 660, createdAt: '', updatedAt: '' },
    { id: 'b', date: '2026-08-30', workItemId: 'w2', habitId: null, startMinute: 650, endMinute: 700, createdAt: '', updatedAt: '' },
  ] satisfies TimeBlock[];
  expect(detectOverlaps(blocks)).toEqual([['a', 'b']]);
});
```

Run and verify RED.

- [ ] **Step 6: Implement daily plan, priorities and time-block domain**

Required models:

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

`buildPriorities` must remove duplicate IDs while preserving first occurrence, slice to three, and rank 1..N. `validateTimeBlock` validates bounds and target XOR; `detectOverlaps` returns sorted ID pairs for blocks whose half-open intervals intersect.

Run and verify GREEN.

- [ ] **Step 7: Write failing commitment snapshot tests**

`src/domain/commitments/commitment.test.ts`:

```ts
import { expect, it } from 'vitest';
import { compareCommitment, type DailyCommitmentSnapshot } from './commitment';

it('reports capacity and schedule divergence after commitment', () => {
  const committed: DailyCommitmentSnapshot = {
    id: 'c1', date: '2026-08-30', committedAt: '2026-08-30T08:00:00.000Z',
    capacityMinutes: 300,
    priorityWorkItemIds: ['a', 'b'],
    timeBlocks: [{ workItemId: 'a', startMinute: 600, endMinute: 660 }],
  };

  expect(compareCommitment(committed, {
    capacityMinutes: 240,
    priorityWorkItemIds: ['a', 'b'],
    timeBlocks: [{ workItemId: 'a', startMinute: 600, endMinute: 690 }],
  })).toEqual({ capacityChanged: true, prioritiesChanged: false, timeBlocksChanged: true, hasDivergence: true });
});
```

Run and verify RED.

- [ ] **Step 8: Implement immutable commitment snapshots**

`src/domain/commitments/commitment.ts`:

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

Comparison must be deterministic: compare priority order and compare time blocks after sorting by `startMinute`, then `endMinute`, then `workItemId ?? ''`.

Run all Task 2 tests. Expected: PASS.

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
- Consumes domain models from Task 2
- Produces `TodayRepository`
- Produces `createGuestTodayRepository(databaseName?: string): Promise<TodayRepository>`

`TodayRepository` must expose:

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
  saveTimeBlock(block: TimeBlock): Promise<Result<void>>;
  removeTimeBlock(id: string): Promise<Result<void>>;
  getCommitment(date: string): Promise<Result<DailyCommitmentSnapshot | null>>;
  saveCommitment(snapshot: DailyCommitmentSnapshot): Promise<Result<void>>;
}
```

- [ ] **Step 1: Write persistence tests first**

`guest-today-repository.test.ts` must include these behaviors:

```ts
it('persists entities across repository re-instantiation', async () => { /* create db name, save task, reopen, read */ });
it('returns corrupt_record instead of treating invalid persisted data as missing', async () => { /* write malformed row through raw IDB, then query */ });
it('replaces priorities atomically', async () => { /* old priorities -> replacement -> only replacement remains */ });
it('does not partially replace priorities when transaction aborts', async () => { /* inject transaction failure hook and verify originals remain */ });
it('keeps commitment snapshots immutable by date', async () => { /* second save for same date returns commitment_exists */ });
```

Use a unique database name per test and delete it in `afterEach`.

Run:

```bash
bun run test src/infrastructure/persistence/guest/guest-today-repository.test.ts
```

Expected: RED because repository modules do not exist.

- [ ] **Step 2: Implement typed database schema and Zod validators**

`guest-db.ts` defines stores:

```text
workItems
  keyPath: id

dailyPlans
  keyPath: id
  index: date unique

dailyPriorities
  keyPath: id
  index: dailyPlanId non-unique

timeBlocks
  keyPath: id
  index: date non-unique

dailyCommitments
  keyPath: id
  index: date unique

meta
  keyPath: key
```

Database name default: `personal-productivity-guest`; version: `1`.

Create Zod schemas that mirror the Task 2 models exactly. Every read parses records before returning them. A parse failure returns:

```ts
{ ok: false, code: 'corrupt_record', message: 'Stored data is invalid and was left untouched.' }
```

Do not delete or rewrite the bad row.

- [ ] **Step 3: Implement repository methods and atomic priority replacement**

`replacePriorities` must open one `readwrite` transaction spanning `dailyPriorities`, delete all rows for `planId`, insert the replacement list, and await `tx.done`. Any error returns `persistence_write_failed` and the aborted transaction must preserve original state.

`saveCommitment` must query the unique `date` index first and return `commitment_exists` when a snapshot already exists for that date.

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

### Task 4: Build the Today application service and commitment loop

**Files:**
- Create: `src/features/today/application/today-service.ts`
- Create: `src/features/today/application/today-service.test.ts`

**Interfaces:**
- Consumes `TodayRepository`
- Produces `TodayService`
- Produces `TodayViewModel`
- This is the only layer React needs for first-slice business mutations

Required interface:

```ts
export interface TodayService {
  getTodayView(date: string): Promise<Result<TodayViewModel>>;
  createTask(input: { title: string; estimatedMinutes: number; priority: WorkItemPriority }): Promise<Result<WorkItem>>;
  setDailyCapacity(date: string, minutes: number): Promise<Result<DailyPlan>>;
  setDailyPriorities(date: string, workItemIds: string[]): Promise<Result<DailyPriority[]>>;
  createTimeBlock(input: { date: string; workItemId: string; startMinute: number; endMinute: number }): Promise<Result<TimeBlock>>;
  updateTimeBlock(id: string, patch: { startMinute: number; endMinute: number }): Promise<Result<TimeBlock>>;
  deleteTimeBlock(id: string, date: string): Promise<Result<void>>;
  completeTask(workItemId: string): Promise<Result<WorkItem>>;
  reopenTask(workItemId: string, date: string): Promise<Result<WorkItem>>;
  commitToday(date: string): Promise<Result<DailyCommitmentSnapshot>>;
}
```

Constructor:

```ts
export function createTodayService(deps: {
  repository: TodayRepository;
  now: () => Date;
  newId: () => string;
}): TodayService;
```

- [ ] **Step 1: Write failing service tests**

At minimum:

```ts
it('creates a task with truthful defaults', async () => { /* type task, backlog, actualMinutes 0 */ });
it('rejects capacity outside the domain rule before writing', async () => { /* 301 or 990 */ });
it('rejects unknown priority work item IDs', async () => { /* no dangling reference */ });
it('rejects a time block for an unknown work item', async () => { /* unknown_entity */ });
it('aggregates scheduled minutes and overbooking into TodayViewModel', async () => { /* capacity 300, blocks 360 */ });
it('commits capacity, ordered priorities and time blocks exactly once', async () => { /* immutable snapshot */ });
it('shows divergence after capacity or time-block edits', async () => { /* compare snapshot/current */ });
it('reopening chooses scheduled only when today/future block evidence exists', async () => { /* scheduled vs backlog */ });
```

Run and verify RED.

- [ ] **Step 2: Define `TodayViewModel`**

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

When a date has no plan, `getTodayView` creates the in-memory default representation with `capacityMinutes: 360` and empty priorities/blocks; it must not write until the user makes a mutation.

- [ ] **Step 3: Implement the service minimally**

Rules:

- `createTask` trims title and rejects empty title; estimate must be positive integer minutes.
- `setDailyCapacity` validates with `validateCapacityMinutes`.
- `setDailyPriorities` verifies every item exists and calls `buildPriorities`.
- `createTimeBlock` verifies work item exists, validates time range and stores a generated ID.
- `updateTimeBlock` loads today's blocks through the view/service path, finds the ID, validates patch and saves replacement.
- `completeTask` uses `completeWorkItem` and does not alter time blocks.
- `reopenTask` considers a relevant block present when the task has a block whose date is the requested date or later.
- `commitToday` calls `getTodayView`, snapshots capacity + priority order + sorted time blocks, then stores it once.
- `getTodayView` compares current state with snapshot when one exists.

- [ ] **Step 4: Run the service tests**

```bash
bun run test src/features/today/application/today-service.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/today/application
git commit -m "feat: add today application service and commitment loop"
```

---

### Task 5: Replace the Today UI with a service-backed workstation

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
- Consumes only `TodayService` through `useTodayController`
- UI does not import repository, IndexedDB, Zustand or localStorage

- [ ] **Step 1: Write behavior-first UI tests**

Use an in-memory fake `TodayService` and React Testing Library. Required tests:

```ts
it('creates a task from title, estimate and priority', async () => { /* submit form -> service createTask -> refreshed list */ });
it('allows at most three ranked priorities and preserves order', async () => { /* reorder/select -> setDailyPriorities */ });
it('shows remaining capacity and an overbooked warning', async () => { /* vm isOverbooked */ });
it('shows a high-capacity caution without disabling Commit Today', async () => { /* >720 */ });
it('commits the day and renders committed state', async () => { /* commitToday */ });
it('renders plan-changed status when divergence exists', async () => { /* hasDivergence */ });
it('shows persistence failures as failures rather than optimistic success', async () => { /* mutation returns err -> visible alert */ });
```

Run and verify RED.

- [ ] **Step 2: Implement the controller hook**

`useTodayController(service, date)` owns only view/loading/error UI state. After every successful mutation it reloads `getTodayView(date)`. After a failed mutation it preserves the previous view and exposes the error message.

Return:

```ts
{
  view,
  isLoading,
  error,
  actions: {
    createTask,
    setCapacity,
    setPriorities,
    createTimeBlock,
    updateTimeBlock,
    deleteTimeBlock,
    completeTask,
    reopenTask,
    commitToday,
  }
}
```

- [ ] **Step 3: Implement focused UI components**

`TodayScreen` order:

1. date/status header;
2. `CapacityPanel`;
3. `QuickCaptureForm`;
4. `PriorityList`;
5. `TaskList`;
6. `TimeBlockList`;
7. `CommitmentPanel`.

Required visible language/behavior:

- Capacity displays `Available`, `Scheduled`, `Remaining`.
- Overbooked state says the plan exceeds available capacity but does not block saving/commit.
- Commitment button text is `Commit Today` before snapshot; after snapshot display `Committed at HH:mm` and do not offer a second commit.
- When current plan diverges, display `Plan changed after commitment` and list which categories changed: capacity, priorities, schedule.
- No confetti or score is shown on task completion.
- Completed tasks remain visible and can be reopened.
- Time blocks are created/edited with explicit time controls, not drag-and-drop.

- [ ] **Step 4: Run UI tests**

```bash
bun run test src/features/today/today-ui.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/today src/components/ui
git commit -m "feat: build disciplined today workstation"
```

---

### Task 6: Wire the real guest service, replace prototype runtime, and retire misleading prototype features

**Files:**
- Replace: `src/app/(dashboard)/today/page.tsx`
- Replace: `src/app/(dashboard)/layout.tsx`
- Create: `src/components/shell/AppShell.tsx`
- Create: `src/components/shell/Sidebar.tsx`
- Modify: `src/app/(dashboard)/page.tsx`
- Delete after replacement is green: `src/lib/store/useAppStore.ts`
- Delete after replacement is green: old `src/components/workstation/*`
- Delete after replacement is green: prototype `src/components/shared/*` that depend on the old store/audio
- Delete after replacement is green: `src/lib/audio/*`
- Delete after replacement is green: old `src/types/index.ts`
- Delete after replacement is green: prototype routes `focus`, `habits`, `planner`, `projects`, `review`, `roadmap`, `settings`, and prototype AI API routes
- Delete after replacement is green: prototype-only algorithms/parser when they depend on the obsolete model
- Modify: `docs/superpowers/parity/smart-planner-behavior-parity.md`

**Interfaces:**
- `/today` becomes the only canonical working product route in slice 1
- `/` redirects to `/today`
- Future capability names may appear as disabled navigation labels but must not pretend to work

- [ ] **Step 1: Write the route wiring before deleting the prototype**

`src/app/(dashboard)/today/page.tsx` becomes a small client boundary that:

```ts
'use client';

import { TodayScreen } from '@/features/today/components/TodayScreen';
import { createTodayService } from '@/features/today/application/today-service';
import { createGuestTodayRepository } from '@/infrastructure/persistence/guest/guest-today-repository';
import { toLocalDateKey } from '@/domain/shared/local-date';
```

Create the repository/service once in a module-level async factory or a stable React initialization path; never recreate the IndexedDB connection on every render.

`src/app/(dashboard)/page.tsx`:

```ts
import { redirect } from 'next/navigation';
export default function DashboardPage() { redirect('/today'); }
```

- [ ] **Step 2: Replace the dashboard shell**

`AppShell` should provide a responsive sidebar/header shell without timer, quick-add, shutdown, command palette or audio dependencies. Navigation for future modules is disabled or labelled `Later` until their slice is implemented.

- [ ] **Step 3: Verify Today behavior before deleting old files**

Run:

```bash
bun run typecheck
bun run test
bun run build
```

Expected: PASS for the replacement flow. If old prototype code causes compile failures because prototype dependencies were removed, delete only the obsolete files listed in Step 4; do not weaken new domain types to make the prototype compile.

- [ ] **Step 4: Remove prototype runtime code and stale model definitions**

Delete the listed obsolete store/components/routes/types. Git history preserves them. Do not copy old scheduled fields or `top3ItemIds` into new models to reduce deletion effort.

- [ ] **Step 5: Update the parity register truthfully**

Change only capabilities actually implemented in this slice:

```markdown
| Daily capacity 0–16h | PRESERVED | `src/domain/capacity` + Today UI |
| Flexible planning / scheduling | PRESERVED | Single-day TimeBlock implemented; multi-day planner remains later |
| Backup / storage safety / migration | SUPERSEDED | Safe validated IndexedDB guest persistence implemented; legacy migration still NOT YET IMPLEMENTED |
| Daily commitment snapshot | SUPERSEDED | Immutable snapshot + divergence implemented |
```

Leave Focus, Habits, Projects/Roadmaps, Forecast, Weekly Review and PWA/Push as `NOT YET IMPLEMENTED`.

- [ ] **Step 6: Run all non-E2E gates**

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: replace prototype runtime with today vertical slice"
```

---

### Task 7: Prove the critical journey with Playwright and CI

**Files:**
- Create: `e2e/today.spec.ts`
- Create: `.github/workflows/quality.yml`
- Modify if needed: `playwright.config.ts`

**Interfaces:**
- Produces regression proof for the complete first slice
- Produces clean-checkout CI gate

- [ ] **Step 1: Write the failing critical E2E flow**

`e2e/today.spec.ts` must perform this exact journey using accessible labels/roles rather than CSS implementation selectors:

```ts
import { test, expect } from '@playwright/test';

test('guest can plan, commit, diverge and reload without losing truth', async ({ page }) => {
  await page.goto('/today');

  // Set capacity = 5h.
  // Create three tasks with distinct titles.
  // Select Top 3 in order.
  // Create a time block for at least one task.
  // Assert Scheduled and Remaining values.
  // Click Commit Today.
  // Change capacity to 4h or edit the time block.
  // Assert "Plan changed after commitment" is visible.
  // Complete one task.
  // Reload.
  // Assert tasks, priority order, time block, completion state,
  // commitment and divergence are all still present.
});

test('overbooking is visible but does not block commitment', async ({ page }) => {
  // Set 1h capacity, schedule >1h, assert warning, Commit Today remains enabled.
});
```

Replace every comment with concrete Playwright actions before committing; no commented pseudo-steps remain in the final test.

Run:

```bash
bunx playwright install chromium
bun run e2e
```

Expected before final wiring fixes: RED for missing/incorrect labels or behaviors; fix product code, not selectors, when accessibility labels are missing.

- [ ] **Step 2: Make E2E green**

Run repeatedly until:

```bash
bun run e2e
```

Expected: PASS for both scenarios.

- [ ] **Step 3: Add clean-checkout CI**

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

- [ ] **Step 4: Run final local verification**

```bash
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun run test
bun run build
bun run e2e
git diff --exit-code
```

Expected: every command exits 0 and the tree remains clean after verification.

- [ ] **Step 5: Commit**

```bash
git add e2e/today.spec.ts .github/workflows/quality.yml playwright.config.ts
git commit -m "test: verify today commitment journey end to end"
```

---

## Final Acceptance Checklist

The slice is not complete until every item is true:

- [ ] `/today` is the primary working screen.
- [ ] Guest can create tasks with title, estimate and priority.
- [ ] Capacity accepts 0–16h in 30-minute increments and warns above 12h without blocking.
- [ ] Top priorities are ordered, unique and limited to three.
- [ ] Time blocks are first-class entities and may overlap with a visible warning.
- [ ] Scheduled minutes and remaining minutes are derived from blocks, not duplicated mutable totals.
- [ ] Task completion does not fabricate actual focus time.
- [ ] Guest can reopen a completed task.
- [ ] `Commit Today` writes one immutable snapshot for the date.
- [ ] Post-commit changes remain possible but visible as divergence.
- [ ] Reload preserves plan, tasks, priorities, blocks, commitment and completion state.
- [ ] Invalid/corrupt IndexedDB records are reported and not silently erased.
- [ ] Product UI imports neither localStorage nor IndexedDB primitives.
- [ ] The old monolithic persisted Zustand store is no longer part of the runtime.
- [ ] Out-of-scope prototype features are not presented as completed Smart Planner parity.
- [ ] Behavior-parity register reflects actual implementation truth.
- [ ] `bun run typecheck` passes.
- [ ] `bun run lint` passes.
- [ ] `bun run test` passes.
- [ ] `bun run build` passes.
- [ ] `bun run e2e` passes.
- [ ] CI passes from a clean checkout.

## Self-Review Outcome

### Spec coverage

- Foundation/tooling: Tasks 1 and 7.
- Pure domain boundaries: Task 2.
- IndexedDB guest persistence and data preservation: Task 3.
- Today application service, capacity, Top 3, task lifecycle, time blocks: Task 4.
- Low-friction workstation UI and persistence-error truthfulness: Task 5.
- Minimal Commitment + divergence: Tasks 2, 4, 5 and E2E Task 7.
- Smart Planner inheritance protection: Tasks 1 and 6 parity register.
- No premature Focus/Habits/AI/PWA implementation: Task 6 removes misleading prototype runtime but preserves parity obligations.

### Placeholder scan

The implementation tasks contain no `TBD`, `TODO`, `implement later`, or unspecified mandatory error-handling instruction. The E2E template explicitly requires replacing its explanatory comments with concrete actions before commit.

### Type consistency

The plan uses the same canonical names throughout: `capacityMinutes`, `DailyPriority`, `TimeBlock`, `DailyCommitmentSnapshot`, `TodayRepository`, `TodayService`, `TodayViewModel`, `Result<T>`. Old prototype names `capacityHours`, `top3ItemIds`, `scheduledDate` and `scheduledTimeStart` are intentionally not reused.

### Data-truth consistency

The plan never equates scheduled minutes with actual focus minutes, never rewrites commitment history after a plan edit, and never treats persistence errors as empty data.
