import { calculateCapacity, validateCapacityMinutes } from '@/domain/capacity/capacity';
import {
  compareCommitment,
  type DailyCommitmentSnapshot,
} from '@/domain/commitments/commitment';
import { buildPriorities } from '@/domain/daily-plans/priorities';
import type { DailyPlan, DailyPriority } from '@/domain/daily-plans/daily-plan';
import { toLocalDateKey } from '@/domain/shared/local-date';
import { err, ok, type Result } from '@/domain/shared/result';
import { detectOverlaps, validateTimeBlock, type TimeBlock } from '@/domain/time-blocks/time-block';
import {
  completeWorkItem,
  reopenWorkItem,
  validateWorkItem,
  type WorkItem,
  type WorkItemPriority,
} from '@/domain/work-items/work-item';
import type { TodayRepository } from '@/infrastructure/persistence/contracts/today-repository';

export interface TodayViewModel {
  date: string;
  plan: DailyPlan;
  workItems: WorkItem[];
  priorities: Array<{ rank: 1 | 2 | 3; item: WorkItem }>;
  timeBlocks: TimeBlock[];
  scheduledMinutes: number;
  remainingMinutes: number;
  isOverbooked: boolean;
  showHighCapacityCaution: boolean;
  overlapPairs: Array<[string, string]>;
  commitment: DailyCommitmentSnapshot | null;
  divergence: {
    capacityChanged: boolean;
    prioritiesChanged: boolean;
    timeBlocksChanged: boolean;
    hasDivergence: boolean;
  } | null;
}

export interface TodayService {
  getTodayView(date: string): Promise<Result<TodayViewModel>>;
  createTask(input: {
    title: string;
    estimatedMinutes: number;
    priority: WorkItemPriority;
  }): Promise<Result<WorkItem>>;
  setDailyCapacity(date: string, minutes: number): Promise<Result<DailyPlan>>;
  setDailyPriorities(date: string, workItemIds: string[]): Promise<Result<DailyPriority[]>>;
  createTimeBlock(input: {
    date: string;
    workItemId: string;
    startMinute: number;
    endMinute: number;
  }): Promise<Result<TimeBlock>>;
  updateTimeBlock(
    id: string,
    patch: { startMinute: number; endMinute: number },
  ): Promise<Result<TimeBlock>>;
  deleteTimeBlock(id: string): Promise<Result<void>>;
  completeTask(workItemId: string): Promise<Result<WorkItem>>;
  reopenTask(workItemId: string, date: string): Promise<Result<WorkItem>>;
  commitToday(date: string): Promise<Result<DailyCommitmentSnapshot>>;
}

export function createTodayService(deps: {
  repository: TodayRepository;
  now: () => Date;
  newId: () => string;
}): TodayService {
  const { repository, now, newId } = deps;

  function nowIso(): string {
    return now().toISOString();
  }

  function defaultPlan(date: string): DailyPlan {
    const timestamp = nowIso();
    return {
      id: `plan-${date}`,
      date,
      capacityMinutes: 360,
      morningIntention: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  async function loadPlan(date: string): Promise<Result<DailyPlan>> {
    const existing = await repository.getDailyPlan(date);
    if (!existing.ok) return existing;
    return ok(existing.value ?? defaultPlan(date));
  }

  async function persistPlan(plan: DailyPlan): Promise<Result<DailyPlan>> {
    const saved = await repository.saveDailyPlan(plan);
    if (!saved.ok) return saved;
    return ok(plan);
  }

  async function getOrCreatePlan(date: string): Promise<Result<DailyPlan>> {
    const existing = await repository.getDailyPlan(date);
    if (!existing.ok) return existing;
    if (existing.value) return ok(existing.value);
    return persistPlan(defaultPlan(date));
  }

  async function requireWorkItem(id: string): Promise<Result<WorkItem>> {
    const result = await repository.getWorkItem(id);
    if (!result.ok) return result;
    if (!result.value) return err('unknown_entity', 'Work item was not found.');
    return ok(result.value);
  }

  function sortTimeBlocks(blocks: TimeBlock[]): TimeBlock[] {
    return [...blocks].sort(
      (a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute || a.id.localeCompare(b.id),
    );
  }

  function hasRelevantBlock(blocks: TimeBlock[], date: string): boolean {
    return blocks.some((block) => block.date >= date);
  }

  function nextScheduleStatus(item: WorkItem, blocks: TimeBlock[]): WorkItem['status'] {
    if (item.status === 'completed' || item.status === 'in_progress') {
      return item.status;
    }
    return hasRelevantBlock(blocks, toLocalDateKey(now())) ? 'scheduled' : 'backlog';
  }

  function withScheduleStatus(item: WorkItem, blocks: TimeBlock[]): WorkItem {
    const nextStatus = nextScheduleStatus(item, blocks);
    if (item.status === nextStatus) return item;
    return {
      ...item,
      status: nextStatus,
      updatedAt: nowIso(),
    };
  }

  const service: TodayService = {
    async getTodayView(date) {
      const planResult = await loadPlan(date);
      if (!planResult.ok) return planResult;

      const workItemsResult = await repository.listWorkItems();
      if (!workItemsResult.ok) return workItemsResult;

      const prioritiesResult = await repository.listPriorities(planResult.value.id);
      if (!prioritiesResult.ok) return prioritiesResult;

      const timeBlocksResult = await repository.listTimeBlocks(date);
      if (!timeBlocksResult.ok) return timeBlocksResult;

      const commitmentResult = await repository.getCommitment(date);
      if (!commitmentResult.ok) return commitmentResult;

      const workItemsById = new Map(workItemsResult.value.map((item) => [item.id, item]));
      const timeBlocks = sortTimeBlocks(timeBlocksResult.value);

      for (const block of timeBlocks) {
        if (block.workItemId && !workItemsById.has(block.workItemId)) {
          return err('unknown_entity', 'A time block refers to an unknown work item.');
        }
      }

      const scheduledWorkItemIds = new Set(
        timeBlocks.flatMap((block) => (block.workItemId ? [block.workItemId] : [])),
      );
      const workItems = workItemsResult.value.map((item) => {
        if (item.status === 'backlog' && scheduledWorkItemIds.has(item.id)) {
          return { ...item, status: 'scheduled' as const };
        }
        return item;
      });
      const displayedById = new Map(workItems.map((item) => [item.id, item]));

      const priorities: TodayViewModel['priorities'] = [];
      for (const priority of [...prioritiesResult.value].sort((a, b) => a.rank - b.rank)) {
        const item = displayedById.get(priority.workItemId);
        if (!item) return err('unknown_entity', 'A priority refers to an unknown work item.');
        priorities.push({ rank: priority.rank, item });
      }

      const scheduledMinutes = timeBlocks.reduce(
        (sum, block) => sum + block.endMinute - block.startMinute,
        0,
      );
      const capacity = calculateCapacity(planResult.value.capacityMinutes, scheduledMinutes);
      const commitment = commitmentResult.value;
      const divergence = commitment
        ? compareCommitment(commitment, {
            capacityMinutes: planResult.value.capacityMinutes,
            priorityWorkItemIds: priorities.map((priority) => priority.item.id),
            timeBlocks: timeBlocks.map((block) => ({
              workItemId: block.workItemId,
              startMinute: block.startMinute,
              endMinute: block.endMinute,
            })),
          })
        : null;

      return ok({
        date,
        plan: planResult.value,
        workItems,
        priorities,
        timeBlocks,
        scheduledMinutes: capacity.scheduledMinutes,
        remainingMinutes: capacity.remainingMinutes,
        isOverbooked: capacity.isOverbooked,
        showHighCapacityCaution: capacity.showHighCapacityCaution,
        overlapPairs: detectOverlaps(timeBlocks),
        commitment,
        divergence,
      });
    },

    async createTask(input) {
      const title = input.title.trim();
      const validated = validateWorkItem({
        title,
        estimatedMinutes: input.estimatedMinutes,
        actualMinutes: 0,
      });
      if (!validated.ok) return validated;

      const timestamp = nowIso();
      const item: WorkItem = {
        id: newId(),
        projectId: null,
        title,
        notes: '',
        type: 'task',
        estimatedMinutes: input.estimatedMinutes,
        actualMinutes: 0,
        priority: input.priority,
        status: 'backlog',
        completedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const saved = await repository.saveWorkItem(item);
      if (!saved.ok) return saved;
      return ok(item);
    },

    async setDailyCapacity(date, minutes) {
      const validated = validateCapacityMinutes(minutes);
      if (!validated.ok) return validated;

      const planResult = await getOrCreatePlan(date);
      if (!planResult.ok) return planResult;

      return persistPlan({
        ...planResult.value,
        capacityMinutes: minutes,
        updatedAt: nowIso(),
      });
    },

    async setDailyPriorities(date, workItemIds) {
      for (const workItemId of workItemIds) {
        const item = await requireWorkItem(workItemId);
        if (!item.ok) return item;
      }

      const planResult = await getOrCreatePlan(date);
      if (!planResult.ok) return planResult;

      const priorities = buildPriorities(planResult.value.id, workItemIds, newId);
      const replaced = await repository.replacePriorities(planResult.value.id, priorities);
      if (!replaced.ok) return replaced;
      return ok(priorities);
    },

    async createTimeBlock(input) {
      const item = await requireWorkItem(input.workItemId);
      if (!item.ok) return item;

      const validated = validateTimeBlock({
        workItemId: input.workItemId,
        habitId: null,
        startMinute: input.startMinute,
        endMinute: input.endMinute,
      });
      if (!validated.ok) return validated;

      const timestamp = nowIso();
      const block: TimeBlock = {
        id: newId(),
        date: input.date,
        workItemId: input.workItemId,
        habitId: null,
        startMinute: input.startMinute,
        endMinute: input.endMinute,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      if (item.value.status === 'completed' || item.value.status === 'in_progress') {
        const saved = await repository.saveTimeBlock(block);
        if (!saved.ok) return saved;
        return ok(block);
      }

      const blocks = await repository.listTimeBlocksForWorkItem(item.value.id);
      if (!blocks.ok) return blocks;

      const scheduledItem = withScheduleStatus(item.value, [...blocks.value, block]);
      if (scheduledItem === item.value) {
        const saved = await repository.saveTimeBlock(block);
        if (!saved.ok) return saved;
        return ok(block);
      }

      const saved = await repository.saveTimeBlockWithWorkItem(block, scheduledItem);
      if (!saved.ok) return saved;
      return ok(block);
    },

    async updateTimeBlock(id, patch) {
      const existing = await repository.getTimeBlock(id);
      if (!existing.ok) return existing;
      if (!existing.value) return err('unknown_entity', 'Time block was not found.');

      const validated = validateTimeBlock({
        workItemId: existing.value.workItemId,
        habitId: existing.value.habitId,
        startMinute: patch.startMinute,
        endMinute: patch.endMinute,
      });
      if (!validated.ok) return validated;

      const updated: TimeBlock = {
        ...existing.value,
        startMinute: patch.startMinute,
        endMinute: patch.endMinute,
        updatedAt: nowIso(),
      };
      const saved = await repository.saveTimeBlock(updated);
      if (!saved.ok) return saved;
      return ok(updated);
    },

    async deleteTimeBlock(id) {
      const existing = await repository.getTimeBlock(id);
      if (!existing.ok) return existing;
      if (!existing.value) return ok(undefined);

      if (!existing.value.workItemId) {
        return repository.removeTimeBlock(id);
      }

      const item = await repository.getWorkItem(existing.value.workItemId);
      if (!item.ok) return item;
      if (!item.value || item.value.status === 'completed' || item.value.status === 'in_progress') {
        return repository.removeTimeBlock(id);
      }

      const blocks = await repository.listTimeBlocksForWorkItem(item.value.id);
      if (!blocks.ok) return blocks;

      const remaining = blocks.value.filter((block) => block.id !== id);
      const scheduledItem = withScheduleStatus(item.value, remaining);
      if (scheduledItem === item.value) {
        return repository.removeTimeBlock(id);
      }

      return repository.removeTimeBlockWithWorkItem(id, scheduledItem);
    },

    async completeTask(workItemId) {
      const item = await requireWorkItem(workItemId);
      if (!item.ok) return item;
      const completed = completeWorkItem(item.value, nowIso());
      const saved = await repository.saveWorkItem(completed);
      if (!saved.ok) return saved;
      return ok(completed);
    },

    async reopenTask(workItemId, date) {
      const item = await requireWorkItem(workItemId);
      if (!item.ok) return item;
      const blocks = await repository.listTimeBlocksForWorkItem(workItemId);
      if (!blocks.ok) return blocks;
      const reopened = reopenWorkItem(item.value, hasRelevantBlock(blocks.value, date), nowIso());
      const saved = await repository.saveWorkItem(reopened);
      if (!saved.ok) return saved;
      return ok(reopened);
    },

    async commitToday(date) {
      const view = await service.getTodayView(date);
      if (!view.ok) return view;

      const snapshot: DailyCommitmentSnapshot = {
        id: newId(),
        date,
        committedAt: nowIso(),
        capacityMinutes: view.value.plan.capacityMinutes,
        priorityWorkItemIds: view.value.priorities.map((priority) => priority.item.id),
        timeBlocks: sortTimeBlocks(view.value.timeBlocks).map((block) => ({
          workItemId: block.workItemId,
          startMinute: block.startMinute,
          endMinute: block.endMinute,
        })),
      };
      const saved = await repository.saveCommitment(snapshot);
      if (!saved.ok) return saved;
      return ok(snapshot);
    },
  };

  return service;
}
