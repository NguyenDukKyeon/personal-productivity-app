import type { DailyPriority } from './daily-plan';

export function buildPriorities(
  dailyPlanId: string,
  workItemIds: string[],
  newId: () => string,
): DailyPriority[] {
  const uniqueIds = [...new Set(workItemIds)].slice(0, 3);
  return uniqueIds.map((workItemId, index) => ({
    id: newId(),
    dailyPlanId,
    workItemId,
    rank: (index + 1) as 1 | 2 | 3,
  }));
}
