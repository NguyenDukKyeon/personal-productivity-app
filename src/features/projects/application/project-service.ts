import {
  calculateProjectForecast,
  type ProjectForecast,
} from '@/domain/planner/planner-forecast';
import {
  archiveProject,
  completeProject,
  createProject,
  unarchiveProject,
  updateProject,
  type Project,
} from '@/domain/projects/project';
import {
  completeMilestone,
  createMilestone,
  reorderMilestones,
  updateMilestone,
  type ProjectMilestone,
} from '@/domain/projects/project-milestone';
import {
  calculateProjectProgress,
  type ProjectProgress,
} from '@/domain/projects/project-progress';
import { toLocalDateKey } from '@/domain/shared/local-date';
import { err, ok, type Result } from '@/domain/shared/result';
import { validateWorkItem, type WorkItem, type WorkItemPriority, type WorkItemType } from '@/domain/work-items/work-item';
import type { PlannerRepository } from '@/infrastructure/persistence/contracts/planner-repository';
import type { ProjectRepository } from '@/infrastructure/persistence/contracts/project-repository';
import type { TodayRepository } from '@/infrastructure/persistence/contracts/today-repository';

export interface ProjectDetail {
  project: Project;
  milestones: ProjectMilestone[];
  workItems: WorkItem[];
  progress: ProjectProgress;
  forecast: ProjectForecast;
}

export interface CreateProjectParams {
  id?: string;
  title: string;
  description?: string;
  targetDate?: string | null;
}

export interface UpdateProjectParams {
  title?: string;
  description?: string;
  targetDate?: string | null;
}

export interface CreateMilestoneParams {
  id?: string;
  projectId: string;
  title: string;
  targetDate?: string | null;
  order?: number;
}

export interface UpdateMilestoneParams {
  title?: string;
  targetDate?: string | null;
  order?: number;
}

export interface CreateWorkItemForProjectParams {
  id?: string;
  projectId: string;
  title: string;
  notes?: string;
  estimatedMinutes?: number;
  priority?: WorkItemPriority;
  type?: WorkItemType;
}

function createDefaultId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export class ProjectService {
  constructor(
    private readonly projectRepo: ProjectRepository,
    private readonly todayRepo: TodayRepository,
    private readonly plannerRepo: PlannerRepository,
    private readonly nowFactory: () => string = () => new Date().toISOString(),
  ) {}

  async listProjects(includeArchived = false): Promise<Result<Project[]>> {
    return this.projectRepo.listProjects(includeArchived);
  }

  async getProject(id: string): Promise<Result<Project | null>> {
    return this.projectRepo.getProject(id);
  }

  async createProject(params: CreateProjectParams): Promise<Result<Project>> {
    const now = this.nowFactory();
    const id = params.id ?? createDefaultId('proj');
    const created = createProject({
      id,
      title: params.title,
      description: params.description,
      targetDate: params.targetDate,
      now,
    });
    if (!created.ok) return created;

    const saveRes = await this.projectRepo.saveProject(created.value);
    if (!saveRes.ok) return saveRes;

    return ok(created.value);
  }

  async updateProject(id: string, params: UpdateProjectParams): Promise<Result<Project>> {
    const projectRes = await this.projectRepo.getProject(id);
    if (!projectRes.ok) return projectRes;
    if (!projectRes.value) {
      return err('project_not_found', `Project with ID ${id} was not found.`);
    }

    const now = this.nowFactory();
    const updated = updateProject(projectRes.value, {
      title: params.title,
      description: params.description,
      targetDate: params.targetDate,
      now,
    });
    if (!updated.ok) return updated;

    const saveRes = await this.projectRepo.saveProject(updated.value);
    if (!saveRes.ok) return saveRes;

    return ok(updated.value);
  }

  async completeProject(id: string): Promise<Result<Project>> {
    const projectRes = await this.projectRepo.getProject(id);
    if (!projectRes.ok) return projectRes;
    if (!projectRes.value) {
      return err('project_not_found', `Project with ID ${id} was not found.`);
    }

    const now = this.nowFactory();
    const completed = completeProject(projectRes.value, now);
    const saveRes = await this.projectRepo.saveProject(completed);
    if (!saveRes.ok) return saveRes;

    return ok(completed);
  }

  async archiveProject(id: string): Promise<Result<Project>> {
    const projectRes = await this.projectRepo.getProject(id);
    if (!projectRes.ok) return projectRes;
    if (!projectRes.value) {
      return err('project_not_found', `Project with ID ${id} was not found.`);
    }

    const now = this.nowFactory();
    const archived = archiveProject(projectRes.value, now);
    const saveRes = await this.projectRepo.saveProject(archived);
    if (!saveRes.ok) return saveRes;

    return ok(archived);
  }

  async unarchiveProject(id: string): Promise<Result<Project>> {
    const projectRes = await this.projectRepo.getProject(id);
    if (!projectRes.ok) return projectRes;
    if (!projectRes.value) {
      return err('project_not_found', `Project with ID ${id} was not found.`);
    }

    const now = this.nowFactory();
    const unarchived = unarchiveProject(projectRes.value, now);
    const saveRes = await this.projectRepo.saveProject(unarchived);
    if (!saveRes.ok) return saveRes;

    return ok(unarchived);
  }

  async getProjectDetail(id: string, fromDate?: string): Promise<Result<ProjectDetail>> {
    const projectRes = await this.projectRepo.getProject(id);
    if (!projectRes.ok) return projectRes;
    if (!projectRes.value) {
      return err('project_not_found', `Project with ID ${id} was not found.`);
    }
    const project = projectRes.value;

    const milestonesRes = await this.projectRepo.listMilestones(id);
    if (!milestonesRes.ok) return milestonesRes;
    const milestones = milestonesRes.value;

    const allWorkItemsRes = await this.todayRepo.listWorkItems();
    if (!allWorkItemsRes.ok) return allWorkItemsRes;
    const workItems = allWorkItemsRes.value.filter((item) => item.projectId === id);

    const now = this.nowFactory();
    const calculationDate = fromDate ?? toLocalDateKey(new Date(now));

    // Get timeblocks and daily plans for 365 days horizon from calculationDate
    const blocksRes = await this.plannerRepo.listTimeBlocksInRange(calculationDate, '2099-12-31');
    if (!blocksRes.ok) return blocksRes;
    const timeBlocks = blocksRes.value;

    const plansRes = await this.plannerRepo.listDailyPlansInRange(calculationDate, '2099-12-31');
    if (!plansRes.ok) return plansRes;
    const dailyPlans = plansRes.value;

    const progress = calculateProjectProgress({
      projectId: id,
      workItems,
      timeBlocks,
    });

    const forecast = calculateProjectForecast({
      projectId: id,
      targetDate: project.targetDate,
      fromDate: calculationDate,
      workItems,
      timeBlocks,
      dailyPlans,
    });

    return ok({
      project,
      milestones,
      workItems,
      progress,
      forecast,
    });
  }

  // Milestone methods
  async createMilestone(params: CreateMilestoneParams): Promise<Result<ProjectMilestone>> {
    const projectRes = await this.projectRepo.getProject(params.projectId);
    if (!projectRes.ok) return projectRes;
    if (!projectRes.value) {
      return err('project_not_found', `Project with ID ${params.projectId} was not found.`);
    }

    const existingMilestonesRes = await this.projectRepo.listMilestones(params.projectId);
    if (!existingMilestonesRes.ok) return existingMilestonesRes;

    const now = this.nowFactory();
    const order = params.order ?? existingMilestonesRes.value.length;
    const id = params.id ?? createDefaultId('ms');

    const created = createMilestone({
      id,
      projectId: params.projectId,
      title: params.title,
      targetDate: params.targetDate,
      order,
      now,
    });
    if (!created.ok) return created;

    const saveRes = await this.projectRepo.saveMilestone(created.value);
    if (!saveRes.ok) return saveRes;

    return ok(created.value);
  }

  async updateMilestone(id: string, params: UpdateMilestoneParams): Promise<Result<ProjectMilestone>> {
    const msRes = await this.projectRepo.getMilestone(id);
    if (!msRes.ok) return msRes;
    if (!msRes.value) {
      return err('milestone_not_found', `Milestone with ID ${id} was not found.`);
    }

    const now = this.nowFactory();
    const updated = updateMilestone(msRes.value, {
      title: params.title,
      targetDate: params.targetDate,
      order: params.order,
      now,
    });
    if (!updated.ok) return updated;

    const saveRes = await this.projectRepo.saveMilestone(updated.value);
    if (!saveRes.ok) return saveRes;

    return ok(updated.value);
  }

  async completeMilestone(id: string): Promise<Result<ProjectMilestone>> {
    const msRes = await this.projectRepo.getMilestone(id);
    if (!msRes.ok) return msRes;
    if (!msRes.value) {
      return err('milestone_not_found', `Milestone with ID ${id} was not found.`);
    }

    const now = this.nowFactory();
    const completed = completeMilestone(msRes.value, now);
    const saveRes = await this.projectRepo.saveMilestone(completed);
    if (!saveRes.ok) return saveRes;

    return ok(completed);
  }

  async reorderMilestones(projectId: string, milestoneIds: string[]): Promise<Result<ProjectMilestone[]>> {
    const msRes = await this.projectRepo.listMilestones(projectId);
    if (!msRes.ok) return msRes;

    const msMap = new Map(msRes.value.map((m) => [m.id, m]));
    const ordered: ProjectMilestone[] = [];

    for (const id of milestoneIds) {
      const ms = msMap.get(id);
      if (!ms) {
        return err('milestone_not_found', `Milestone with ID ${id} was not found in project.`);
      }
      ordered.push(ms);
    }

    const now = this.nowFactory();
    const reordered = reorderMilestones(ordered, now);
    const replaceRes = await this.projectRepo.replaceMilestones(projectId, reordered);
    if (!replaceRes.ok) return replaceRes;

    return ok(reordered);
  }

  async deleteMilestone(id: string): Promise<Result<void>> {
    return this.projectRepo.deleteMilestone(id);
  }

  // WorkItem project association methods
  async createWorkItemForProject(params: CreateWorkItemForProjectParams): Promise<Result<WorkItem>> {
    const projectRes = await this.projectRepo.getProject(params.projectId);
    if (!projectRes.ok) return projectRes;
    if (!projectRes.value) {
      return err('project_not_found', `Project with ID ${params.projectId} was not found.`);
    }

    const now = this.nowFactory();
    const workItem: WorkItem = {
      id: params.id ?? createDefaultId('work'),
      projectId: params.projectId,
      title: params.title.trim(),
      notes: (params.notes ?? '').trim(),
      type: params.type ?? 'task',
      estimatedMinutes: params.estimatedMinutes ?? 30,
      actualMinutes: 0,
      priority: params.priority ?? 'p3_medium',
      status: 'backlog',
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const valid = validateWorkItem(workItem);
    if (!valid.ok) return valid;

    const saveRes = await this.todayRepo.saveWorkItem(workItem);
    if (!saveRes.ok) return saveRes;

    return ok(workItem);
  }

  async assignWorkItemToProject(workItemId: string, projectId: string): Promise<Result<WorkItem>> {
    const projectRes = await this.projectRepo.getProject(projectId);
    if (!projectRes.ok) return projectRes;
    if (!projectRes.value) {
      return err('project_not_found', `Project with ID ${projectId} was not found.`);
    }

    const itemRes = await this.todayRepo.getWorkItem(workItemId);
    if (!itemRes.ok) return itemRes;
    if (!itemRes.value) {
      return err('work_item_not_found', `Work item with ID ${workItemId} was not found.`);
    }

    const now = this.nowFactory();
    const updated: WorkItem = {
      ...itemRes.value,
      projectId,
      updatedAt: now,
    };

    const saveRes = await this.todayRepo.saveWorkItem(updated);
    if (!saveRes.ok) return saveRes;

    return ok(updated);
  }

  async removeWorkItemFromProject(workItemId: string): Promise<Result<WorkItem>> {
    const itemRes = await this.todayRepo.getWorkItem(workItemId);
    if (!itemRes.ok) return itemRes;
    if (!itemRes.value) {
      return err('work_item_not_found', `Work item with ID ${workItemId} was not found.`);
    }

    const now = this.nowFactory();
    const updated: WorkItem = {
      ...itemRes.value,
      projectId: null,
      updatedAt: now,
    };

    const saveRes = await this.todayRepo.saveWorkItem(updated);
    if (!saveRes.ok) return saveRes;

    return ok(updated);
  }
}
