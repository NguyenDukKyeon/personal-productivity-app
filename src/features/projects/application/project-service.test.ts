import { describe, expect, it } from 'vitest';
import { createGuestPlannerRepository } from '@/infrastructure/persistence/guest/guest-planner-repository';
import { createGuestProjectRepository } from '@/infrastructure/persistence/guest/guest-project-repository';
import { createGuestTodayRepository } from '@/infrastructure/persistence/guest/guest-today-repository';
import { ProjectService } from './project-service';

function dbName(): string {
  return `personal-productivity-proj-svc-test-${crypto.randomUUID()}`;
}

const timestamp = '2026-09-01T08:00:00.000Z';

async function createTestService(name: string) {
  const projectRepo = await createGuestProjectRepository({ databaseName: name });
  const todayRepo = await createGuestTodayRepository({ databaseName: name });
  const plannerRepo = await createGuestPlannerRepository({ databaseName: name });
  const service = new ProjectService(projectRepo, todayRepo, plannerRepo, () => timestamp);
  return { service, projectRepo, todayRepo, plannerRepo };
}

describe('ProjectService application service', () => {
  it('creates, updates, completes, archives, and unarchives a project', async () => {
    const { service } = await createTestService(dbName());

    const created = await service.createProject({
      title: 'Chemistry 11',
      description: 'First semester',
      targetDate: '2026-10-15',
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const projectId = created.value.id;
    expect(created.value.title).toBe('Chemistry 11');
    expect(created.value.status).toBe('active');

    const updated = await service.updateProject(projectId, {
      title: 'Chemistry 11 - Honours',
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.value.title).toBe('Chemistry 11 - Honours');

    const completed = await service.completeProject(projectId);
    expect(completed.ok).toBe(true);
    if (!completed.ok) return;
    expect(completed.value.status).toBe('completed');
    expect(completed.value.completedAt).toBe(timestamp);

    const archived = await service.archiveProject(projectId);
    expect(archived.ok).toBe(true);
    if (!archived.ok) return;
    expect(archived.value.status).toBe('archived');

    const unarchived = await service.unarchiveProject(projectId);
    expect(unarchived.ok).toBe(true);
    if (!unarchived.ok) return;
    expect(unarchived.value.status).toBe('active');
  });

  it('aggregates project detail with milestones, work items, progress, and forecast', async () => {
    const { service, todayRepo, plannerRepo } = await createTestService(dbName());

    const created = await service.createProject({
      title: 'Math Calculus',
      targetDate: '2026-09-20',
    });
    if (!created.ok) throw new Error('Failed to create project');
    const projectId = created.value.id;

    // Add milestone
    await service.createMilestone({
      projectId,
      title: 'Limits and Derivatives',
      targetDate: '2026-09-10',
    });

    // Add work item for project
    const itemRes = await service.createWorkItemForProject({
      projectId,
      title: 'Practice limit exercises',
      estimatedMinutes: 120,
      priority: 'p1_urgent',
      type: 'task',
    });
    expect(itemRes.ok).toBe(true);

    const detail = await service.getProjectDetail(projectId, '2026-09-01');
    expect(detail.ok).toBe(true);
    if (!detail.ok) return;

    expect(detail.value.project.id).toBe(projectId);
    expect(detail.value.milestones.length).toBe(1);
    expect(detail.value.milestones[0].title).toBe('Limits and Derivatives');
    expect(detail.value.workItems.length).toBe(1);
    expect(detail.value.workItems[0].title).toBe('Practice limit exercises');
    expect(detail.value.progress.totalWorkItems).toBe(1);
    expect(detail.value.progress.remainingEstimatedMinutes).toBe(120);
    expect(detail.value.forecast.status).toBe('on_track');
    expect(detail.value.forecast.projectedCompletionDate).toBe('2026-09-01');
  });

  it('reorders milestones for a project', async () => {
    const { service } = await createTestService(dbName());

    const proj = await service.createProject({ title: 'Physics' });
    if (!proj.ok) throw new Error('Create project failed');
    const projectId = proj.value.id;

    const ms1 = await service.createMilestone({ projectId, title: 'Kinematics' });
    const ms2 = await service.createMilestone({ projectId, title: 'Dynamics' });
    if (!ms1.ok || !ms2.ok) throw new Error('Create milestones failed');

    const reordered = await service.reorderMilestones(projectId, [ms2.value.id, ms1.value.id]);
    expect(reordered.ok).toBe(true);
    if (!reordered.ok) return;

    expect(reordered.value[0].id).toBe(ms2.value.id);
    expect(reordered.value[0].order).toBe(0);
    expect(reordered.value[1].id).toBe(ms1.value.id);
    expect(reordered.value[1].order).toBe(1);
  });

  it('assigns and removes work item from project with referential integrity', async () => {
    const { service, todayRepo } = await createTestService(dbName());

    const proj = await service.createProject({ title: 'Biology' });
    if (!proj.ok) throw new Error('Create project failed');
    const projectId = proj.value.id;

    // Create a standalone work item
    const standalone: WorkItem = {
      id: 'w-standalone',
      projectId: null,
      title: 'Read cells chapter',
      notes: '',
      type: 'task',
      estimatedMinutes: 60,
      actualMinutes: 0,
      priority: 'p2_high',
      status: 'backlog',
      completedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await todayRepo.saveWorkItem(standalone);

    // Assign to unknown project should fail
    const invalidAssign = await service.assignWorkItemToProject('w-standalone', 'unknown-proj');
    expect(invalidAssign.ok).toBe(false);
    if (invalidAssign.ok) return;
    expect(invalidAssign.code).toBe('project_not_found');

    // Assign to valid project
    const assignRes = await service.assignWorkItemToProject('w-standalone', projectId);
    expect(assignRes.ok).toBe(true);
    if (!assignRes.ok) return;
    expect(assignRes.value.projectId).toBe(projectId);

    // Remove from project
    const removeRes = await service.removeWorkItemFromProject('w-standalone');
    expect(removeRes.ok).toBe(true);
    if (!removeRes.ok) return;
    expect(removeRes.value.projectId).toBeNull();
  });
});
