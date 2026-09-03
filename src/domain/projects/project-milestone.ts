import { parseLocalDateKey } from '@/domain/shared/local-date';
import { err, ok, type Result } from '@/domain/shared/result';

export interface ProjectMilestone {
  id: string;
  projectId: string;
  title: string;
  targetDate: string | null;
  order: number;
  status: 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface CreateMilestoneInput {
  id: string;
  projectId: string;
  title: string;
  targetDate?: string | null;
  order?: number;
  now: string;
}

export interface UpdateMilestoneInput {
  title?: string;
  targetDate?: string | null;
  order?: number;
  now: string;
}

export function validateMilestone(milestone: ProjectMilestone): Result<void> {
  if (!milestone.id || !milestone.id.trim()) {
    return err('invalid_id', 'Milestone ID is required.');
  }

  if (!milestone.projectId || !milestone.projectId.trim()) {
    return err('invalid_project_id', 'Milestone projectId is required.');
  }

  const trimmedTitle = milestone.title.trim();
  if (!trimmedTitle || trimmedTitle.length > 140) {
    return err('invalid_title', 'Milestone title must be between 1 and 140 characters.');
  }

  if (!Number.isInteger(milestone.order) || milestone.order < 0) {
    return err('invalid_order', 'Milestone order must be a non-negative integer.');
  }

  if (milestone.targetDate !== null) {
    if (!parseLocalDateKey(milestone.targetDate)) {
      return err('invalid_target_date', 'Milestone target date must be a valid YYYY-MM-DD local date or null.');
    }
  }

  if (milestone.status === 'completed' && !milestone.completedAt) {
    return err('invalid_completed_at', 'Completed milestone must have completedAt timestamp.');
  }

  if (milestone.status === 'active' && milestone.completedAt !== null) {
    return err('invalid_completed_at', 'Active milestone must not have completedAt timestamp.');
  }

  if (new Date(milestone.updatedAt).getTime() < new Date(milestone.createdAt).getTime()) {
    return err('invalid_timestamp', 'Milestone updatedAt cannot precede createdAt.');
  }

  return ok(undefined);
}

export function createMilestone(input: CreateMilestoneInput): Result<ProjectMilestone> {
  const trimmedProjectId = input.projectId.trim();
  if (!trimmedProjectId) {
    return err('invalid_project_id', 'Milestone projectId is required.');
  }

  const trimmedTitle = input.title.trim();
  if (!trimmedTitle || trimmedTitle.length > 140) {
    return err('invalid_title', 'Milestone title must be between 1 and 140 characters.');
  }

  const order = input.order ?? 0;
  if (!Number.isInteger(order) || order < 0) {
    return err('invalid_order', 'Milestone order must be a non-negative integer.');
  }

  const targetDate = input.targetDate ?? null;
  if (targetDate !== null && !parseLocalDateKey(targetDate)) {
    return err('invalid_target_date', 'Milestone target date must be a valid YYYY-MM-DD local date or null.');
  }

  const milestone: ProjectMilestone = {
    id: input.id.trim(),
    projectId: trimmedProjectId,
    title: trimmedTitle,
    targetDate,
    order,
    status: 'active',
    createdAt: input.now,
    updatedAt: input.now,
    completedAt: null,
  };

  const validation = validateMilestone(milestone);
  if (!validation.ok) return validation;

  return ok(milestone);
}

export function updateMilestone(
  milestone: ProjectMilestone,
  input: UpdateMilestoneInput,
): Result<ProjectMilestone> {
  const nextTitle = input.title !== undefined ? input.title.trim() : milestone.title;
  if (!nextTitle || nextTitle.length > 140) {
    return err('invalid_title', 'Milestone title must be between 1 and 140 characters.');
  }

  const nextOrder = input.order !== undefined ? input.order : milestone.order;
  if (!Number.isInteger(nextOrder) || nextOrder < 0) {
    return err('invalid_order', 'Milestone order must be a non-negative integer.');
  }

  const nextTargetDate =
    input.targetDate !== undefined ? input.targetDate : milestone.targetDate;
  if (nextTargetDate !== null && !parseLocalDateKey(nextTargetDate)) {
    return err('invalid_target_date', 'Milestone target date must be a valid YYYY-MM-DD local date or null.');
  }

  const updated: ProjectMilestone = {
    ...milestone,
    title: nextTitle,
    order: nextOrder,
    targetDate: nextTargetDate,
    updatedAt: input.now,
  };

  const validation = validateMilestone(updated);
  if (!validation.ok) return validation;

  return ok(updated);
}

export function completeMilestone(milestone: ProjectMilestone, now: string): ProjectMilestone {
  return {
    ...milestone,
    status: 'completed',
    completedAt: now,
    updatedAt: now,
  };
}

export function reorderMilestones(
  milestones: ProjectMilestone[],
  now: string,
): ProjectMilestone[] {
  return milestones.map((ms, index) => ({
    ...ms,
    order: index,
    updatedAt: now,
  }));
}
