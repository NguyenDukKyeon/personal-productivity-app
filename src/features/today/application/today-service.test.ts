import { expect, it } from 'vitest';
import type { DailyCommitmentSnapshot } from '@/domain/commitments/commitment';
import type { DailyPlan, DailyPriority } from '@/domain/daily-plans/daily-plan';
import { err, ok, type Result } from '@/domain/shared/result';
import type { TimeBlock } from '@/domain/time-blocks/time-block';
import type { WorkItem } from '@/domain/work-items/work-item';
import type { TodayRepository } from '@/infrastructure/persistence/contracts/today-repository';
import { createTodayService } from './today-service';

const DATE = '2026-08-30';
const NOW = new Date('2026-08-30T08:00:00.000Z');
const NOW_ISO = NOW.toISOString();

class InMemoryTodayRepository implements TodayRepository {
  workItems = new Map<string, WorkItem>();
  plansByDate = new Map<string, DailyPlan>();
  prioritiesByPlanId = new Map<string, DailyPriority[]>();
  timeBlocks = new Map<string, TimeBlock>();
  commitmentsByDate = new Map<string, DailyCommitmentSnapshot>();

  async listWorkItems(): Promise<Result<WorkItem[]>> {
    return ok([...this.workItems.values()]);
  }

  async getWorkItem(id: string): Promise<Result<WorkItem | null>> {
    return ok(this.workItems.get(id) ?? null);
  }

  async saveWorkItem(item: WorkItem): Promise<Result<void>> {
    this.workItems.set(item.id, item);
    return ok(undefined);
  }

  async getDailyPlan(date: string): Promise<Result<DailyPlan | null>> {
    return ok(this.plansByDate.get(date) ?? null);
  }

  async saveDailyPlan(plan: DailyPlan): Promise<Result<void>> {
    this.plansByDate.set(plan.date, plan);
    return ok(undefined);
  }

  async listPriorities(planId: string): Promise<Result<DailyPriority[]>> {
    return ok([...(this.prioritiesByPlanId.get(planId) ?? [])].sort((a, b) => a.rank - b.rank));
  }

  async replacePriorities(planId: string, priorities: DailyPriority[]): Promise<Result<void>> {
    this.prioritiesByPlanId.set(planId, [...priorities]);
    return ok(undefined);
  }

  async listTimeBlocks(date: string): Promise<Result<TimeBlock[]>> {
    return ok([...this.timeBlocks.values()].filter((block) => block.date === date));
  }

  async getTimeBlock(id: string): Promise<Result<TimeBlock | null>> {
    return ok(this.timeBlocks.get(id) ?? null);
  }

  async listTimeBlocksForWorkItem(workItemId: string): Promise<Result<TimeBlock[]>> {
    return ok([...this.timeBlocks.values()].filter((block) => block.workItemId === workItemId));
  }

  async saveTimeBlock(block: TimeBlock): Promise<Result<void>> {
    this.timeBlocks.set(block.id, block);
    return ok(undefined);
  }

  async removeTimeBlock(id: string): Promise<Result<void>> {
    this.timeBlocks.delete(id);
    return ok(undefined);
  }

  async getCommitment(date: string): Promise<Result<DailyCommitmentSnapshot | null>> {
    return ok(this.commitmentsByDate.get(date) ?? null);
  }

  async saveCommitment(snapshot: DailyCommitmentSnapshot): Promise<Result<void>> {
    if (this.commitmentsByDate.has(snapshot.date)) {
      return err('commitment_exists', 'A commitment for this date already exists.');
    }
    this.commitmentsByDate.set(snapshot.date, snapshot);
    return ok(undefined);
  }
}

function unwrap<T>(result: Result<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.message);
  return result.value;
}

function createHarness() {
  const repository = new InMemoryTodayRepository();
  let seq = 0;
  const service = createTodayService({
    repository,
    now: () => NOW,
    newId: () => `id-${++seq}`,
  });
  return { repository, service };
}

it('creates task with task/backlog/actualMinutes=0 defaults', async () => {
  const { service, repository } = createHarness();
  const created = unwrap(
    await service.createTask({ title: '  Algebra  ', estimatedMinutes: 60, priority: 'p1_urgent' }),
  );

  expect(created).toEqual({
    id: 'id-1',
    projectId: null,
    title: 'Algebra',
    notes: '',
    type: 'task',
    estimatedMinutes: 60,
    actualMinutes: 0,
    priority: 'p1_urgent',
    status: 'backlog',
    completedAt: null,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  });
  expect(await repository.getWorkItem(created.id)).toEqual({ ok: true, value: created });
});

it('rejects capacity 301 without repository write', async () => {
  const { service, repository } = createHarness();
  const result = await service.setDailyCapacity(DATE, 301);

  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.code).toBe('invalid_capacity');
  expect(await repository.getDailyPlan(DATE)).toEqual({ ok: true, value: null });
});

it('rejects unknown priority IDs', async () => {
  const { service } = createHarness();
  unwrap(await service.createTask({ title: 'Algebra', estimatedMinutes: 60, priority: 'p1_urgent' }));

  const result = await service.setDailyPriorities(DATE, ['missing']);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.code).toBe('unknown_entity');
});

it('rejects time block for unknown work item', async () => {
  const { service } = createHarness();
  const result = await service.createTimeBlock({
    date: DATE,
    workItemId: 'missing',
    startMinute: 600,
    endMinute: 660,
  });

  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.code).toBe('unknown_entity');
});

it('derives scheduled=360 remaining=-60 overbooked=true for capacity=300', async () => {
  const { service } = createHarness();
  const task = unwrap(await service.createTask({ title: 'Algebra', estimatedMinutes: 60, priority: 'p1_urgent' }));
  unwrap(await service.setDailyCapacity(DATE, 300));
  unwrap(await service.createTimeBlock({
    date: DATE,
    workItemId: task.id,
    startMinute: 600,
    endMinute: 960,
  }));

  const view = unwrap(await service.getTodayView(DATE));
  expect(view.scheduledMinutes).toBe(360);
  expect(view.remainingMinutes).toBe(-60);
  expect(view.isOverbooked).toBe(true);
  expect(view.showHighCapacityCaution).toBe(false);
});

it('commits capacity, ordered priorities and sorted blocks exactly once', async () => {
  const { service } = createHarness();
  const algebra = unwrap(await service.createTask({ title: 'Algebra', estimatedMinutes: 60, priority: 'p1_urgent' }));
  const writing = unwrap(await service.createTask({ title: 'Writing', estimatedMinutes: 45, priority: 'p2_high' }));
  unwrap(await service.setDailyCapacity(DATE, 300));
  unwrap(await service.setDailyPriorities(DATE, [writing.id, algebra.id]));
  unwrap(await service.createTimeBlock({
    date: DATE,
    workItemId: algebra.id,
    startMinute: 700,
    endMinute: 760,
  }));
  unwrap(await service.createTimeBlock({
    date: DATE,
    workItemId: writing.id,
    startMinute: 600,
    endMinute: 660,
  }));

  const committed = unwrap(await service.commitToday(DATE));
  expect(committed).toMatchObject({
    date: DATE,
    committedAt: NOW_ISO,
    capacityMinutes: 300,
    priorityWorkItemIds: [writing.id, algebra.id],
    timeBlocks: [
      { workItemId: writing.id, startMinute: 600, endMinute: 660 },
      { workItemId: algebra.id, startMinute: 700, endMinute: 760 },
    ],
  });

  const second = await service.commitToday(DATE);
  expect(second.ok).toBe(false);
  if (!second.ok) expect(second.code).toBe('commitment_exists');
  expect(unwrap(await service.getTodayView(DATE)).commitment).toEqual(committed);
});

it('reports divergence after capacity changes post-commit', async () => {
  const { service } = createHarness();
  unwrap(await service.setDailyCapacity(DATE, 300));
  unwrap(await service.commitToday(DATE));
  unwrap(await service.setDailyCapacity(DATE, 240));

  const view = unwrap(await service.getTodayView(DATE));
  expect(view.divergence).toEqual({
    capacityChanged: true,
    prioritiesChanged: false,
    timeBlocksChanged: false,
    hasDivergence: true,
  });
});

it('updates a time block by repository ID lookup', async () => {
  const { service, repository } = createHarness();
  const task = unwrap(await service.createTask({ title: 'Algebra', estimatedMinutes: 60, priority: 'p1_urgent' }));
  const created = unwrap(await service.createTimeBlock({
    date: DATE,
    workItemId: task.id,
    startMinute: 600,
    endMinute: 660,
  }));

  const updated = unwrap(await service.updateTimeBlock(created.id, { startMinute: 630, endMinute: 720 }));
  expect(updated).toMatchObject({
    id: created.id,
    date: DATE,
    workItemId: task.id,
    habitId: null,
    startMinute: 630,
    endMinute: 720,
  });
  expect(await repository.getTimeBlock(created.id)).toEqual({ ok: true, value: updated });
});

it('schedules a backlog task when its first TimeBlock is created', async () => {
  const { service, repository } = createHarness();
  const task = unwrap(
    await service.createTask({ title: 'Algebra', estimatedMinutes: 60, priority: 'p1_urgent' }),
  );
  expect(task.status).toBe('backlog');

  unwrap(await service.createTimeBlock({
    date: DATE,
    workItemId: task.id,
    startMinute: 600,
    endMinute: 660,
  }));

  expect(unwrap(await repository.getWorkItem(task.id))?.status).toBe('scheduled');
  expect(unwrap(await service.getTodayView(DATE)).workItems.find((item) => item.id === task.id)?.status).toBe(
    'scheduled',
  );
});

it('returns a scheduled task to backlog when its final relevant TimeBlock is deleted', async () => {
  const { service, repository } = createHarness();
  const task = unwrap(
    await service.createTask({ title: 'Algebra', estimatedMinutes: 60, priority: 'p1_urgent' }),
  );
  const first = unwrap(await service.createTimeBlock({
    date: DATE,
    workItemId: task.id,
    startMinute: 600,
    endMinute: 660,
  }));
  const second = unwrap(await service.createTimeBlock({
    date: DATE,
    workItemId: task.id,
    startMinute: 700,
    endMinute: 760,
  }));

  unwrap(await service.deleteTimeBlock(first.id));
  expect(unwrap(await repository.getWorkItem(task.id))?.status).toBe('scheduled');

  unwrap(await service.deleteTimeBlock(second.id));
  expect(unwrap(await repository.getWorkItem(task.id))?.status).toBe('backlog');
  expect(unwrap(await service.getTodayView(DATE)).workItems.find((item) => item.id === task.id)?.status).toBe(
    'backlog',
  );
});

it('reopens as scheduled when task has a block on requested date or later', async () => {
  const { service } = createHarness();
  const task = unwrap(await service.createTask({ title: 'Algebra', estimatedMinutes: 60, priority: 'p1_urgent' }));
  unwrap(await service.createTimeBlock({
    date: '2026-08-31',
    workItemId: task.id,
    startMinute: 600,
    endMinute: 660,
  }));
  unwrap(await service.completeTask(task.id));

  const reopened = unwrap(await service.reopenTask(task.id, DATE));
  expect(reopened.status).toBe('scheduled');
  expect(reopened.completedAt).toBeNull();
  expect(reopened.actualMinutes).toBe(0);
});

it('reopens as scheduled when task has a block on the requested date', async () => {
  const { service } = createHarness();
  const task = unwrap(await service.createTask({ title: 'Algebra', estimatedMinutes: 60, priority: 'p1_urgent' }));
  unwrap(await service.createTimeBlock({
    date: DATE,
    workItemId: task.id,
    startMinute: 600,
    endMinute: 660,
  }));
  unwrap(await service.completeTask(task.id));

  const reopened = unwrap(await service.reopenTask(task.id, DATE));
  expect(reopened.status).toBe('scheduled');
  expect(reopened.completedAt).toBeNull();
});

it('reopens as backlog when no relevant block exists', async () => {
  const { service } = createHarness();
  const task = unwrap(await service.createTask({ title: 'Algebra', estimatedMinutes: 60, priority: 'p1_urgent' }));
  unwrap(await service.createTimeBlock({
    date: '2026-08-29',
    workItemId: task.id,
    startMinute: 600,
    endMinute: 660,
  }));
  unwrap(await service.completeTask(task.id));

  const reopened = unwrap(await service.reopenTask(task.id, DATE));
  expect(reopened.status).toBe('backlog');
  expect(reopened.completedAt).toBeNull();
  expect(reopened.actualMinutes).toBe(0);
});

it('rejects orphan time blocks instead of counting them as scheduled Untitled work', async () => {
  const { service, repository } = createHarness();
  unwrap(await service.setDailyCapacity(DATE, 300));
  repository.timeBlocks.set('orphan', {
    id: 'orphan',
    date: DATE,
    workItemId: 'missing',
    habitId: null,
    startMinute: 600,
    endMinute: 720,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  });

  const view = await service.getTodayView(DATE);
  expect(view.ok).toBe(false);
  if (!view.ok) {
    expect(view.code).toBe('unknown_entity');
    expect(view.message.toLowerCase()).not.toContain('untitled');
  }
});
