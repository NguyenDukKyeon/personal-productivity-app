import { expect, it } from 'vitest';
import { compareCommitment, type DailyCommitmentSnapshot } from './commitment';

it('reports capacity and schedule divergence after commitment', () => {
  const committed: DailyCommitmentSnapshot = {
    id: 'c1',
    date: '2026-08-30',
    committedAt: '2026-08-30T08:00:00.000Z',
    capacityMinutes: 300,
    priorityWorkItemIds: ['a', 'b'],
    timeBlocks: [{ workItemId: 'a', startMinute: 600, endMinute: 660 }],
  };

  expect(compareCommitment(committed, {
    capacityMinutes: 240,
    priorityWorkItemIds: ['a', 'b'],
    timeBlocks: [{ workItemId: 'a', startMinute: 600, endMinute: 690 }],
  })).toEqual({
    capacityChanged: true,
    prioritiesChanged: false,
    timeBlocksChanged: true,
    hasDivergence: true,
  });
});

it('compares schedules deterministically rather than by storage order', () => {
  const committed: DailyCommitmentSnapshot = {
    id: 'c1', date: '2026-08-30', committedAt: '', capacityMinutes: 300,
    priorityWorkItemIds: ['a'],
    timeBlocks: [
      { workItemId: 'b', startMinute: 700, endMinute: 760 },
      { workItemId: 'a', startMinute: 600, endMinute: 660 },
    ],
  };
  expect(compareCommitment(committed, {
    capacityMinutes: 300,
    priorityWorkItemIds: ['a'],
    timeBlocks: [
      { workItemId: 'a', startMinute: 600, endMinute: 660 },
      { workItemId: 'b', startMinute: 700, endMinute: 760 },
    ],
  }).hasDivergence).toBe(false);
});
