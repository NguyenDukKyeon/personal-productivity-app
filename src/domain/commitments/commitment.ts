export interface CommitmentTimeBlock {
  workItemId: string | null;
  startMinute: number;
  endMinute: number;
}

export interface DailyCommitmentSnapshot {
  id: string;
  date: string;
  committedAt: string;
  capacityMinutes: number;
  priorityWorkItemIds: string[];
  timeBlocks: CommitmentTimeBlock[];
}

export interface CommitmentComparablePlan {
  capacityMinutes: number;
  priorityWorkItemIds: string[];
  timeBlocks: CommitmentTimeBlock[];
}

export interface CommitmentDivergence {
  capacityChanged: boolean;
  prioritiesChanged: boolean;
  timeBlocksChanged: boolean;
  hasDivergence: boolean;
}

function sortTimeBlocks(blocks: CommitmentTimeBlock[]): CommitmentTimeBlock[] {
  return [...blocks].sort(
    (a, b) =>
      a.startMinute - b.startMinute ||
      a.endMinute - b.endMinute ||
      (a.workItemId ?? '').localeCompare(b.workItemId ?? ''),
  );
}

export function compareCommitment(
  snapshot: DailyCommitmentSnapshot,
  current: CommitmentComparablePlan,
): CommitmentDivergence {
  const capacityChanged = snapshot.capacityMinutes !== current.capacityMinutes;
  const prioritiesChanged = JSON.stringify(snapshot.priorityWorkItemIds) !== JSON.stringify(current.priorityWorkItemIds);
  const timeBlocksChanged = JSON.stringify(sortTimeBlocks(snapshot.timeBlocks)) !== JSON.stringify(sortTimeBlocks(current.timeBlocks));
  return {
    capacityChanged,
    prioritiesChanged,
    timeBlocksChanged,
    hasDivergence: capacityChanged || prioritiesChanged || timeBlocksChanged,
  };
}
