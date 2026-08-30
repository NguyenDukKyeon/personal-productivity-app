import { openDB } from 'idb';
import { expect, it } from 'vitest';
import type { DailyCommitmentSnapshot } from '@/domain/commitments/commitment';
import type { DailyPlan, DailyPriority } from '@/domain/daily-plans/daily-plan';
import type { TimeBlock } from '@/domain/time-blocks/time-block';
import type { WorkItem } from '@/domain/work-items/work-item';
import { createGuestTodayRepository } from './guest-today-repository';

function dbName(): string {
  return `personal-productivity-test-${crypto.randomUUID()}`;
}

const workItem: WorkItem = {
  id: 'w1',
  projectId: null,
  title: 'Algebra',
  notes: '',
  type: 'task',
  estimatedMinutes: 60,
  actualMinutes: 0,
  priority: 'p1_urgent',
  status: 'backlog',
  completedAt: null,
  createdAt: '2026-08-30T08:00:00.000Z',
  updatedAt: '2026-08-30T08:00:00.000Z',
};

function priorities(prefix: string): DailyPriority[] {
  return [
    { id: `${prefix}-1`, dailyPlanId: 'plan-1', workItemId: `${prefix}-w1`, rank: 1 },
    { id: `${prefix}-2`, dailyPlanId: 'plan-1', workItemId: `${prefix}-w2`, rank: 2 },
  ];
}

const commitment: DailyCommitmentSnapshot = {
  id: 'commit-1',
  date: '2026-08-30',
  committedAt: '2026-08-30T08:00:00.000Z',
  capacityMinutes: 300,
  priorityWorkItemIds: ['w1'],
  timeBlocks: [{ workItemId: 'w1', startMinute: 600, endMinute: 660 }],
};

async function putRaw(name: string, store: string, value: unknown): Promise<void> {
  const rawDb = await openDB(name, 1);
  await rawDb.put(store, value);
  rawDb.close();
}

async function getRaw(name: string, store: string, key: string): Promise<unknown> {
  const rawDb = await openDB(name, 1);
  const row = await rawDb.get(store, key);
  rawDb.close();
  return row;
}

async function expectCorruptAndUntouched(
  read: Promise<{ ok: boolean; code?: string }>,
  name: string,
  store: string,
  key: string,
  rawValue: unknown,
): Promise<void> {
  const result = await read;
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.code).toBe('corrupt_record');
  expect(await getRaw(name, store, key)).toEqual(rawValue);
}

it('persists a work item across repository re-instantiation', async () => {
  const name = dbName();
  const first = await createGuestTodayRepository({ databaseName: name });
  expect(await first.saveWorkItem(workItem)).toEqual({ ok: true, value: undefined });

  const second = await createGuestTodayRepository({ databaseName: name });
  expect(await second.getWorkItem(workItem.id)).toEqual({ ok: true, value: workItem });
});

it('returns corrupt_record and leaves malformed storage untouched', async () => {
  const name = dbName();
  const repository = await createGuestTodayRepository({ databaseName: name });
  expect(await repository.saveWorkItem(workItem)).toEqual({ ok: true, value: undefined });

  const raw = { id: 'bad' };
  await putRaw(name, 'workItems', raw);
  await expectCorruptAndUntouched(repository.getWorkItem('bad'), name, 'workItems', 'bad', raw);
});

it('returns corrupt_record for semantically invalid daily plan capacity and leaves the row untouched', async () => {
  const name = dbName();
  const repository = await createGuestTodayRepository({ databaseName: name });
  const raw: DailyPlan = {
    id: 'plan-bad-capacity',
    date: '2026-08-30',
    capacityMinutes: 301,
    morningIntention: '',
    createdAt: '2026-08-30T08:00:00.000Z',
    updatedAt: '2026-08-30T08:00:00.000Z',
  };

  await putRaw(name, 'dailyPlans', raw);
  await expectCorruptAndUntouched(
    repository.getDailyPlan(raw.date),
    name,
    'dailyPlans',
    raw.id,
    raw,
  );
});

it('returns corrupt_record for semantically invalid time blocks and leaves the row untouched', async () => {
  const name = dbName();
  const repository = await createGuestTodayRepository({ databaseName: name });
  const timestamp = '2026-08-30T08:00:00.000Z';
  const cases: TimeBlock[] = [
    {
      id: 'tb-equal',
      date: '2026-08-30',
      workItemId: 'w1',
      habitId: null,
      startMinute: 600,
      endMinute: 600,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'tb-xor-both',
      date: '2026-08-30',
      workItemId: 'w1',
      habitId: 'h1',
      startMinute: 600,
      endMinute: 660,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'tb-xor-neither',
      date: '2026-08-30',
      workItemId: null,
      habitId: null,
      startMinute: 600,
      endMinute: 660,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'tb-bounds',
      date: '2026-08-30',
      workItemId: 'w1',
      habitId: null,
      startMinute: 0,
      endMinute: 1441,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  for (const raw of cases) {
    await putRaw(name, 'timeBlocks', raw);
    await expectCorruptAndUntouched(
      repository.getTimeBlock(raw.id),
      name,
      'timeBlocks',
      raw.id,
      raw,
    );
  }
});

it('returns corrupt_record for semantically invalid work items and leaves the row untouched', async () => {
  const name = dbName();
  const repository = await createGuestTodayRepository({ databaseName: name });
  const cases: WorkItem[] = [
    { ...workItem, id: 'wi-empty-title', title: '   ' },
    { ...workItem, id: 'wi-zero-estimate', estimatedMinutes: 0 },
    { ...workItem, id: 'wi-negative-actual', actualMinutes: -15 },
  ];

  for (const raw of cases) {
    await putRaw(name, 'workItems', raw);
    await expectCorruptAndUntouched(
      repository.getWorkItem(raw.id),
      name,
      'workItems',
      raw.id,
      raw,
    );
  }
});

it('returns corrupt_record for invalid local date keys and leaves the row untouched', async () => {
  const name = dbName();
  const repository = await createGuestTodayRepository({ databaseName: name });
  const timestamp = '2026-08-30T08:00:00.000Z';
  const plan: DailyPlan = {
    id: 'plan-bad-date',
    date: '2026-02-30',
    capacityMinutes: 300,
    morningIntention: '',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const block: TimeBlock = {
    id: 'tb-bad-date',
    date: '2026-02-30',
    workItemId: 'w1',
    habitId: null,
    startMinute: 600,
    endMinute: 660,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await putRaw(name, 'dailyPlans', plan);
  await putRaw(name, 'timeBlocks', block);
  await expectCorruptAndUntouched(
    repository.getDailyPlan(plan.date),
    name,
    'dailyPlans',
    plan.id,
    plan,
  );
  await expectCorruptAndUntouched(
    repository.getTimeBlock(block.id),
    name,
    'timeBlocks',
    block.id,
    block,
  );
});

it('returns corrupt_record for semantically invalid commitments and leaves the row untouched', async () => {
  const name = dbName();
  const repository = await createGuestTodayRepository({ databaseName: name });
  const invalidCapacity: DailyCommitmentSnapshot = {
    ...commitment,
    id: 'commit-bad-capacity',
    capacityMinutes: 301,
  };
  const invalidBlock: DailyCommitmentSnapshot = {
    ...commitment,
    id: 'commit-bad-block',
    date: '2026-08-31',
    timeBlocks: [{ workItemId: 'w1', startMinute: 700, endMinute: 700 }],
  };
  const invalidDate: DailyCommitmentSnapshot = {
    ...commitment,
    id: 'commit-bad-date',
    date: '2026-02-30',
  };

  await putRaw(name, 'dailyCommitments', invalidCapacity);
  await putRaw(name, 'dailyCommitments', invalidBlock);
  await putRaw(name, 'dailyCommitments', invalidDate);

  await expectCorruptAndUntouched(
    repository.getCommitment(invalidCapacity.date),
    name,
    'dailyCommitments',
    invalidCapacity.id,
    invalidCapacity,
  );
  await expectCorruptAndUntouched(
    repository.getCommitment(invalidBlock.date),
    name,
    'dailyCommitments',
    invalidBlock.id,
    invalidBlock,
  );
  await expectCorruptAndUntouched(
    repository.getCommitment(invalidDate.date),
    name,
    'dailyCommitments',
    invalidDate.id,
    invalidDate,
  );
});

it('replaces daily priorities atomically and keeps rank order', async () => {
  const repository = await createGuestTodayRepository({ databaseName: dbName() });
  expect(await repository.replacePriorities('plan-1', priorities('old'))).toEqual({ ok: true, value: undefined });
  expect(await repository.replacePriorities('plan-1', priorities('new'))).toEqual({ ok: true, value: undefined });

  const result = await repository.listPriorities('plan-1');
  expect(result).toEqual({ ok: true, value: priorities('new') });
});

it('aborts priority replacement without partial writes', async () => {
  const name = dbName();
  const stable = await createGuestTodayRepository({ databaseName: name });
  expect(await stable.replacePriorities('plan-1', priorities('old'))).toEqual({ ok: true, value: undefined });

  const failing = await createGuestTodayRepository({
    databaseName: name,
    beforePriorityCommit: () => {
      throw new Error('forced abort');
    },
  });
  const write = await failing.replacePriorities('plan-1', priorities('new'));
  expect(write.ok).toBe(false);
  if (!write.ok) expect(write.code).toBe('persistence_write_failed');

  const verify = await createGuestTodayRepository({ databaseName: name });
  expect(await verify.listPriorities('plan-1')).toEqual({ ok: true, value: priorities('old') });
});

it('refuses a second commitment for the same local date and keeps the first snapshot', async () => {
  const repository = await createGuestTodayRepository({ databaseName: dbName() });
  expect(await repository.saveCommitment(commitment)).toEqual({ ok: true, value: undefined });

  const replacement: DailyCommitmentSnapshot = {
    ...commitment,
    id: 'commit-2',
    capacityMinutes: 240,
  };
  const second = await repository.saveCommitment(replacement);
  expect(second.ok).toBe(false);
  if (!second.ok) expect(second.code).toBe('commitment_exists');
  expect(await repository.getCommitment(commitment.date)).toEqual({ ok: true, value: commitment });
});
