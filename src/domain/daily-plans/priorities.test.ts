import { expect, it } from 'vitest';
import { buildPriorities } from './priorities';

it('deduplicates, limits to three and creates contiguous ranks', () => {
  let id = 0;
  const result = buildPriorities('plan-1', ['a', 'b', 'a', 'c', 'd'], () => `p${++id}`);
  expect(result.map((p) => [p.workItemId, p.rank])).toEqual([
    ['a', 1],
    ['b', 2],
    ['c', 3],
  ]);
});

it('compacts ranks after a selected item is removed', () => {
  let id = 0;
  const result = buildPriorities('plan-1', ['a', 'c'], () => `p${++id}`);
  expect(result.map((p) => p.rank)).toEqual([1, 2]);
});
