import type { Result } from '@/domain/shared/result';
import type { Project } from '@/domain/projects/project';
import type { ProjectMilestone } from '@/domain/projects/project-milestone';

export interface ProjectRepository {
  listProjects(includeArchived?: boolean): Promise<Result<Project[]>>;
  getProject(id: string): Promise<Result<Project | null>>;
  saveProject(project: Project): Promise<Result<void>>;
  listMilestones(projectId: string): Promise<Result<ProjectMilestone[]>>;
  getMilestone(id: string): Promise<Result<ProjectMilestone | null>>;
  saveMilestone(milestone: ProjectMilestone): Promise<Result<void>>;
  replaceMilestones(projectId: string, milestones: ProjectMilestone[]): Promise<Result<void>>;
  deleteMilestone(id: string): Promise<Result<void>>;
}
