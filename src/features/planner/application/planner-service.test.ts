import { describe, expect, it } from 'vitest';
import type { TimeBlock } from '@/domain/time-blocks/time-block';
import type { WorkItem } from '@/domain/work-items/work-item';
import { createGuestPlannerRepository } from '@/infrastructure/persistence/guest/guest-planner-repository';
import { createGuestProjectRepository } from '@/infrastructure/persistence/guest/guest-project-repository';
import { createGuestTodayRepository } from '@/infrastructure/persistence/guest/guest-today-repository';
import { PlannerService } from './planner-service';

function dbName(): string {
  return `personal-productivity-plan-svc-test-${crypto.randomUUID()}`;
}

const timestamp = '2026-09-01T08:00:00.000Z';

async function createTestService(name: string) {
  const plannerRepo = await createGuestPlannerRepository({ databaseName: name });
  const todayRepo = await createGuestTodayRepository({ databaseName: name });
  const projectRepo = await createGuestProjectRepository({ databaseName: name });
  const service = new PlannerService(plannerRepo, todayRepo, projectRepo, () => timestamp);
  return { service, plannerRepo, todayRepo, projectRepo };
}

describe('PlannerService application service', () => {
  it('returns 7-day planner view with fallback capacity without persisting phantom records', async () => {
    const { service, plannerRepo } = await createTestService(dbName());

    const viewRes = await service.getPlannerView('2026-09-01', 7);
    expect(viewRes.ok).toBe(true);
    if (!viewRes.ok) return;

    expect(viewRes.value.days.length).toBe(7);
    expect(viewRes.value.days[0].date).toBe('2026-09-01');
    expect(viewRes.value.days[0].capacityMinutes).toBe(480);
    expect(viewRes.value.days[0].hasExplicitCapacity).toBe(false);

    // Verify viewing planner did NOT create a DailyPlan row in database
    const savedPlan = await plannerRepo.getDailyPlan('2026-09-01');
    expect(savedPlan).toEqual({ ok: true, value: null });
  });

  it('schedules a work item from backlog and updates work item status to scheduled', async () => {
    const { service, todayRepo, plannerRepo } = await createTestService(dbName());

    const workItem: WorkItem = {
      id: 'w-1',
      projectId: null,
      title: 'Math worksheet',
      notes: '',
      type: 'task',
      estimatedMinutes: 60,
      actualMinutes: 0,
      priority: 'p1_urgent',
      status: 'backlog',
      completedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await todayRepo.saveWorkItem(workItem);

    const scheduleRes = await service.scheduleWorkItem({
      workItemId: 'w-1',
      date: '2026-09-01',
      startMinute: 480,
      endMinute: 540,
    });
    expect(scheduleRes.ok).toBe(true);
    if (!scheduleRes.ok) return;

    expect(scheduleRes.value.date).toBe('2026-09-01');
    expect(scheduleRes.value.startMinute).toBe(480);
    expect(scheduleRes.value.endMinute).toBe(540);

    // Verify WorkItem status became scheduled
    const itemAfter = await todayRepo.getWorkItem('w-1');
    expect(itemAfter.ok).toBe(true);
    if (!itemAfter.ok || !itemAfter.value) return;
    expect(itemAfter.value.status).toBe('scheduled');

    // Verify TimeBlock in planner
    const blockAfter = await plannerRepo.getTimeBlock(scheduleRes.value.id);
    expect(blockAfter.ok).toBe(true);
    if (!blockAfter.ok || !blockAfter.value) return;
    expect(blockAfter.value.date).toBe('2026-09-01');
  });

  it('rejects scheduling overlapping blocks on the same date', async () => {
    const { service, todayRepo } = await createTestService(dbName());

    const w1: WorkItem = {
      id: 'w-1',
      projectId: null,
      title: 'Task 1',
      notes: '',
      type: 'task',
      estimatedMinutes: 60,
      actualMinutes: 0,
      priority: 'p1_urgent',
      status: 'backlog',
      completedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const w2: WorkItem = {
      ...w1,
      id: 'w-2',
      title: 'Task 2',
    };
    await todayRepo.saveWorkItem(w1);
    await todayRepo.saveWorkItem(w2);

    await service.scheduleWorkItem({
      workItemId: 'w-1',
      date: '2026-09-01',
      startMinute: 480,
      endMinute: 540,
    });

    const overlapRes = await service.scheduleWorkItem({
      workItemId: 'w-2',
      date: '2026-09-01',
      startMinute: 500,
      endMinute: 560,
    });
    expect(overlapRes.ok).toBe(false);
    if (overlapRes.ok) return;
    expect(overlapRes.code).toBe('time_block_overlap');
  });

  it('moves a time block to another date and preserves schedule status', async () => {
    const { service, todayRepo, plannerRepo } = await createTestService(dbName());

    const workItem: WorkItem = {
      id: 'w-1',
      projectId: null,
      title: 'Task 1',
      notes: '',
      type: 'task',
      estimatedMinutes: 60,
      actualMinutes: 0,
      priority: 'p1_urgent',
      status: 'backlog',
      completedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await todayRepo.saveWorkItem(workItem);

    const scheduled = await service.scheduleWorkItem({
      workItemId: 'w-1',
      date: '2026-09-01',
      startMinute: 480,
      endMinute: 540,
    });
    if (!scheduled.ok) throw new Error('Schedule failed');

    const moveRes = await service.moveTimeBlock({
      timeBlockId: scheduled.value.id,
      targetDate: '2026-09-02',
      startMinute: 600,
      endMinute: 660,
    });
    expect(moveRes.ok).toBe(true);
    if (!moveRes.ok) return;

    expect(moveRes.value.date).toBe('2026-09-02');
    expect(moveRes.value.startMinute).toBe(600);
    expect(moveRes.value.endMinute).toBe(660);

    const reloaded = await plannerRepo.getTimeBlock(scheduled.value.id);
    expect(reloaded.ok).toBe(true);
    if (!reloaded.ok || !reloaded.value) return;
    expect(reloaded.value.date).toBe('2026-09-02');
  });

  it('removes a time block and reverts WorkItem status to backlog when no other blocks remain', async () => {
    const { service, todayRepo, plannerRepo } = await createTestService(dbName());

    const workItem: WorkItem = {
      id: 'w-1',
      projectId: null,
      title: 'Task 1',
      notes: '',
      type: 'task',
      estimatedMinutes: 60,
      actualMinutes: 0,
      priority: 'p1_urgent',
      status: 'backlog',
      completedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await todayRepo.saveWorkItem(workItem);

    const scheduled = await service.scheduleWorkItem({
      workItemId: 'w-1',
      date: '2026-09-01',
      startMinute: 480,
      endMinute: 540,
    });
    if (!scheduled.ok) throw new Error('Schedule failed');

    const removeRes = await service.removeTimeBlock(scheduled.value.id);
    expect(removeRes.ok).toBe(true);

    const blockAfter = await plannerRepo.getTimeBlock(scheduled.value.id);
    expect(blockAfter).toEqual({ ok: true, value: null });

    const itemAfter = await todayRepo.getWorkItem('w-1');
    expect(itemAfter.ok).toBe(true);
    if (!itemAfter.ok || !itemAfter.value) return;
    expect(itemAfter.value.status).toBe('backlog');
  });

  it('sets daily capacity explicitly and reflects in planner view', async () => {
    const { service } = await createTestService(dbName());

    const setRes = await service.setDayCapacity('2026-09-02', 360, 'Focused study day');
    expect(setRes.ok).toBe(true);
    if (!setRes.ok) return;

    expect(setRes.value.date).toBe('2026-09-02');
    expect(setRes.value.capacityMinutes).toBe(360);

    const viewRes = await service.getPlannerView('2026-09-01', 7);
    expect(viewRes.ok).toBe(true);
    if (!viewRes.ok) return;

    const day2 = viewRes.value.days.find((d) => d.date === '2026-09-02');
    expect(day2?.capacityMinutes).toBe(360);
    expect(day2?.hasExplicitCapacity).toBe(true);
  });
});
