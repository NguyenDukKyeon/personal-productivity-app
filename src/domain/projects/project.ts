import { parseLocalDateKey } from '@/domain/shared/local-date';
import { err, ok, type Result } from '@/domain/shared/result';

export type ProjectStatus = 'active' | 'completed' | 'archived';

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface CreateProjectInput {
  id: string;
  title: string;
  description?: string;
  targetDate?: string | null;
  now: string;
}

export interface UpdateProjectInput {
  title?: string;
  description?: string;
  targetDate?: string | null;
  now: string;
}

export function validateProject(project: Project): Result<void> {
  if (!project.id || !project.id.trim()) {
    return err('invalid_id', 'Project ID is required.');
  }

  const trimmedTitle = project.title.trim();
  if (!trimmedTitle || trimmedTitle.length > 140) {
    return err('invalid_title', 'Project title must be between 1 and 140 characters.');
  }

  if (project.description && project.description.length > 1000) {
    return err('invalid_description', 'Project description must not exceed 1000 characters.');
  }

  if (project.targetDate !== null) {
    if (!parseLocalDateKey(project.targetDate)) {
      return err('invalid_target_date', 'Project target date must be a valid YYYY-MM-DD local date or null.');
    }
  }

  if (project.status === 'completed' && !project.completedAt) {
    return err('invalid_completed_at', 'Completed project must have completedAt timestamp.');
  }

  if (project.status === 'active' && project.completedAt !== null) {
    return err('invalid_completed_at', 'Active project must not have completedAt timestamp.');
  }

  if (new Date(project.updatedAt).getTime() < new Date(project.createdAt).getTime()) {
    return err('invalid_timestamp', 'Project updatedAt cannot precede createdAt.');
  }

  return ok(undefined);
}

export function createProject(input: CreateProjectInput): Result<Project> {
  const trimmedTitle = input.title.trim();
  if (!trimmedTitle || trimmedTitle.length > 140) {
    return err('invalid_title', 'Project title must be between 1 and 140 characters.');
  }

  const description = (input.description ?? '').trim();
  if (description.length > 1000) {
    return err('invalid_description', 'Project description must not exceed 1000 characters.');
  }

  const targetDate = input.targetDate ?? null;
  if (targetDate !== null && !parseLocalDateKey(targetDate)) {
    return err('invalid_target_date', 'Project target date must be a valid YYYY-MM-DD local date or null.');
  }

  const project: Project = {
    id: input.id.trim(),
    title: trimmedTitle,
    description,
    status: 'active',
    targetDate,
    createdAt: input.now,
    updatedAt: input.now,
    completedAt: null,
  };

  const validation = validateProject(project);
  if (!validation.ok) return validation;

  return ok(project);
}

export function updateProject(project: Project, input: UpdateProjectInput): Result<Project> {
  const nextTitle = input.title !== undefined ? input.title.trim() : project.title;
  if (!nextTitle || nextTitle.length > 140) {
    return err('invalid_title', 'Project title must be between 1 and 140 characters.');
  }

  const nextDescription =
    input.description !== undefined ? input.description.trim() : project.description;
  if (nextDescription.length > 1000) {
    return err('invalid_description', 'Project description must not exceed 1000 characters.');
  }

  const nextTargetDate = input.targetDate !== undefined ? input.targetDate : project.targetDate;
  if (nextTargetDate !== null && !parseLocalDateKey(nextTargetDate)) {
    return err('invalid_target_date', 'Project target date must be a valid YYYY-MM-DD local date or null.');
  }

  const updated: Project = {
    ...project,
    title: nextTitle,
    description: nextDescription,
    targetDate: nextTargetDate,
    updatedAt: input.now,
  };

  const validation = validateProject(updated);
  if (!validation.ok) return validation;

  return ok(updated);
}

export function completeProject(project: Project, now: string): Project {
  return {
    ...project,
    status: 'completed',
    completedAt: now,
    updatedAt: now,
  };
}

export function archiveProject(project: Project, now: string): Project {
  return {
    ...project,
    status: 'archived',
    updatedAt: now,
  };
}

export function unarchiveProject(project: Project, now: string): Project {
  return {
    ...project,
    status: 'active',
    completedAt: null,
    updatedAt: now,
  };
}
