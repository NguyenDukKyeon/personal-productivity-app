import { expect, it } from 'vitest';
import { detectOverlaps, validateTimeBlock, type TimeBlock } from './time-block';

it('rejects invalid bounds and invalid target cardinality', () => {
  expect(validateTimeBlock({ workItemId: 'w1', habitId: null, startMinute: 600, endMinute: 600 }).ok).toBe(false);
  expect(validateTimeBlock({ workItemId: 'w1', habitId: null, startMinute: -1, endMinute: 30 }).ok).toBe(false);
  expect(validateTimeBlock({ workItemId: 'w1', habitId: null, startMinute: 1400, endMinute: 1441 }).ok).toBe(false);
  expect(validateTimeBlock({ workItemId: null, habitId: null, startMinute: 600, endMinute: 660 }).ok).toBe(false);
  expect(validateTimeBlock({ workItemId: 'w1', habitId: 'h1', startMinute: 600, endMinute: 660 }).ok).toBe(false);
});

it('detects overlaps without forbidding them', () => {
  const blocks = [
    { id: 'a', date: '2026-08-30', workItemId: 'w1', habitId: null, startMinute: 600, endMinute: 660, createdAt: '', updatedAt: '' },
    { id: 'b', date: '2026-08-30', workItemId: 'w2', habitId: null, startMinute: 650, endMinute: 700, createdAt: '', updatedAt: '' },
    { id: 'c', date: '2026-08-30', workItemId: 'w3', habitId: null, startMinute: 700, endMinute: 730, createdAt: '', updatedAt: '' },
  ] satisfies TimeBlock[];
  expect(detectOverlaps(blocks)).toEqual([['a', 'b']]);
});
