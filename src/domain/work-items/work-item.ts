import { err, ok, type Result } from '@/domain/shared/result';

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

export function validateWorkItem(
  item: Pick<WorkItem, 'title' | 'estimatedMinutes' | 'actualMinutes'>,
): Result<void> {
  if (!item.title.trim()) {
    return err('invalid_title', 'Task title is required.');
  }
  if (!Number.isInteger(item.estimatedMinutes) || item.estimatedMinutes <= 0) {
    return err('invalid_estimate', 'Estimated minutes must be a positive integer.');
  }
  if (!Number.isInteger(item.actualMinutes) || item.actualMinutes < 0) {
    return err('invalid_actual_minutes', 'Actual minutes must be a non-negative integer.');
  }
  return ok(undefined);
}

export function completeWorkItem(item: WorkItem, completedAt: string): WorkItem {
  return {
    ...item,
    status: 'completed',
    completedAt,
    updatedAt: completedAt,
  };
}

export function reopenWorkItem(item: WorkItem, hasRelevantBlock: boolean, updatedAt: string): WorkItem {
  return {
    ...item,
    status: hasRelevantBlock ? 'scheduled' : 'backlog',
    completedAt: null,
    updatedAt,
  };
}
