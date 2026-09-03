import type { TimeBlock } from '@/domain/time-blocks/time-block';
import type { WorkItem } from '@/domain/work-items/work-item';

export interface ProjectProgress {
  projectId: string;
  totalWorkItems: number;
  completedWorkItems: number;
  completionRate: number;
  remainingEstimatedMinutes: number;
  actualFocusedMinutes: number;
  scheduledMinutes: number;
  unscheduledEstimatedMinutes: number;
}

export function calculateProjectProgress(params: {
  projectId: string;
  workItems: WorkItem[];
  timeBlocks: TimeBlock[];
}): ProjectProgress {
  const projectItems = params.workItems.filter((item) => item.projectId === params.projectId);
  const totalWorkItems = projectItems.length;
  const completedWorkItems = projectItems.filter((item) => item.status === 'completed').length;
  const completionRate = totalWorkItems > 0 ? completedWorkItems / totalWorkItems : 0;

  const actualFocusedMinutes = projectItems.reduce(
    (sum, item) => sum + (Number.isFinite(item.actualMinutes) && item.actualMinutes > 0 ? item.actualMinutes : 0),
    0,
  );

  const remainingEstimatedMinutes = projectItems
    .filter((item) => item.status !== 'completed')
    .reduce((sum, item) => {
      const remaining = Math.max(0, item.estimatedMinutes - item.actualMinutes);
      return sum + remaining;
    }, 0);

  const projectItemIds = new Set(projectItems.map((item) => item.id));
  const scheduledMinutes = params.timeBlocks
    .filter((block) => block.workItemId !== null && projectItemIds.has(block.workItemId))
    .reduce((sum, block) => sum + (block.endMinute - block.startMinute), 0);

  const unscheduledEstimatedMinutes = Math.max(0, remainingEstimatedMinutes - scheduledMinutes);

  return {
    projectId: params.projectId,
    totalWorkItems,
    completedWorkItems,
    completionRate,
    remainingEstimatedMinutes,
    actualFocusedMinutes,
    scheduledMinutes,
    unscheduledEstimatedMinutes,
  };
}
