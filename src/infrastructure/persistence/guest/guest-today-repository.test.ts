import { openDB } from 'idb';
import { expect, it } from 'vitest';
import type { DailyCommitmentSnapshot } from '@/domain/commitments/commitment';
import type { DailyPriority } from '@/domain/daily-plans/daily-plan';
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

  const rawDb = await openDB(name, 1);
  await rawDb.put('workItems', { id: 'bad' });
  rawDb.close();

  const read = await repository.getWorkItem('bad');
  expect(read.ok).toBe(false);
  if (!read.ok) expect(read.code).toBe('corrupt_record');

  const inspectDb = await openDB(name, 1);
  expect(await inspectDb.get('workItems', 'bad')).toEqual({ id: 'bad' });
  inspectDb.close();
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
