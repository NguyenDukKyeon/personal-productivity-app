import { validateCapacityMinutes } from '@/domain/capacity/capacity';
import type { DailyPlan } from '@/domain/daily-plans/daily-plan';
import {
  buildPlannerView,
  validateWorkItemTimeBlockOverlap,
  type PlannerView,
} from '@/domain/planner/planner-day';
import type { Project } from '@/domain/projects/project';
import { parseLocalDateKey, shiftLocalDateKey } from '@/domain/shared/local-date';
import { err, ok, type Result } from '@/domain/shared/result';
import { validateTimeBlock, type TimeBlock } from '@/domain/time-blocks/time-block';
import type { WorkItem } from '@/domain/work-items/work-item';
import type { PlannerRepository } from '@/infrastructure/persistence/contracts/planner-repository';
import type { ProjectRepository } from '@/infrastructure/persistence/contracts/project-repository';
import type { TodayRepository } from '@/infrastructure/persistence/contracts/today-repository';

export interface ScheduleWorkItemParams {
  id?: string;
  workItemId: string;
  date: string;
  startMinute: number;
  endMinute: number;
}

export interface MoveTimeBlockParams {
  timeBlockId: string;
  targetDate: string;
  startMinute: number;
  endMinute: number;
}

function createDefaultId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export class PlannerService {
  constructor(
    private readonly plannerRepo: PlannerRepository,
    private readonly todayRepo: TodayRepository,
    private readonly projectRepo: ProjectRepository,
    private readonly nowFactory: () => string = () => new Date().toISOString(),
  ) {}

  async getPlannerView(startDate: string, daysCount = 7): Promise<Result<PlannerView>> {
    if (!parseLocalDateKey(startDate)) {
      return err('invalid_start_date', 'Start date must be a valid YYYY-MM-DD local calendar date.');
    }

    const endDate = shiftLocalDateKey(startDate, daysCount - 1);
    if (!endDate) {
      return err('invalid_start_date', 'Failed to calculate end date for planner view.');
    }

    const [blocksRes, plansRes, itemsRes] = await Promise.all([
      this.plannerRepo.listTimeBlocksInRange(startDate, endDate),
      this.plannerRepo.listDailyPlansInRange(startDate, endDate),
      this.todayRepo.listWorkItems(),
    ]);

    if (!blocksRes.ok) return blocksRes;
    if (!plansRes.ok) return plansRes;
    if (!itemsRes.ok) return itemsRes;

    const view = buildPlannerView({
      startDate,
      daysCount,
      dailyPlans: plansRes.value,
      timeBlocks: blocksRes.value,
      workItems: itemsRes.value,
    });

    return ok(view);
  }

  async listProjects(includeArchived = false): Promise<Result<Project[]>> {
    return this.projectRepo.listProjects(includeArchived);
  }

  async scheduleWorkItem(params: ScheduleWorkItemParams): Promise<Result<TimeBlock>> {
    if (!parseLocalDateKey(params.date)) {
      return err('invalid_date', 'Date must be a valid YYYY-MM-DD calendar date.');
    }

    const itemRes = await this.todayRepo.getWorkItem(params.workItemId);
    if (!itemRes.ok) return itemRes;
    if (!itemRes.value) {
      return err('work_item_not_found', `WorkItem with ID ${params.workItemId} was not found.`);
    }
    const workItem = itemRes.value;

    const now = this.nowFactory();
    const timeBlock: TimeBlock = {
      id: params.id ?? createDefaultId('tb'),
      date: params.date,
      workItemId: params.workItemId,
      habitId: null,
      startMinute: params.startMinute,
      endMinute: params.endMinute,
      createdAt: now,
      updatedAt: now,
    };

    const blockValidation = validateTimeBlock(timeBlock);
    if (!blockValidation.ok) return blockValidation;

    // Check overlap with existing blocks on that date
    const dayBlocksRes = await this.plannerRepo.listTimeBlocksInRange(params.date, params.date);
    if (!dayBlocksRes.ok) return dayBlocksRes;

    const overlapCheck = validateWorkItemTimeBlockOverlap({
      candidate: timeBlock,
      existingBlocks: dayBlocksRes.value,
    });
    if (!overlapCheck.ok) return overlapCheck;

    const updatedWorkItem: WorkItem = {
      ...workItem,
      status: workItem.status === 'backlog' ? 'scheduled' : workItem.status,
      updatedAt: now,
    };

    const scheduleRes = await this.plannerRepo.scheduleWorkItem(timeBlock, updatedWorkItem);
    if (!scheduleRes.ok) return scheduleRes;

    return ok(timeBlock);
  }

  async moveTimeBlock(params: MoveTimeBlockParams): Promise<Result<TimeBlock>> {
    if (!parseLocalDateKey(params.targetDate)) {
      return err('invalid_date', 'Target date must be a valid YYYY-MM-DD calendar date.');
    }

    const blockRes = await this.plannerRepo.getTimeBlock(params.timeBlockId);
    if (!blockRes.ok) return blockRes;
    if (!blockRes.value) {
      return err('time_block_not_found', `TimeBlock with ID ${params.timeBlockId} was not found.`);
    }

    const now = this.nowFactory();
    const updatedBlock: TimeBlock = {
      ...blockRes.value,
      date: params.targetDate,
      startMinute: params.startMinute,
      endMinute: params.endMinute,
      updatedAt: now,
    };

    const blockValidation = validateTimeBlock(updatedBlock);
    if (!blockValidation.ok) return blockValidation;

    // Check overlap on target date
    const targetBlocksRes = await this.plannerRepo.listTimeBlocksInRange(
      params.targetDate,
      params.targetDate,
    );
    if (!targetBlocksRes.ok) return targetBlocksRes;

    const overlapCheck = validateWorkItemTimeBlockOverlap({
      candidate: updatedBlock,
      existingBlocks: targetBlocksRes.value,
    });
    if (!overlapCheck.ok) return overlapCheck;

    const moveRes = await this.plannerRepo.moveTimeBlock(updatedBlock);
    if (!moveRes.ok) return moveRes;

    return ok(updatedBlock);
  }

  async removeTimeBlock(timeBlockId: string): Promise<Result<void>> {
    const blockRes = await this.plannerRepo.getTimeBlock(timeBlockId);
    if (!blockRes.ok) return blockRes;
    if (!blockRes.value) {
      return err('time_block_not_found', `TimeBlock with ID ${timeBlockId} was not found.`);
    }
    const block = blockRes.value;

    let updatedWorkItem: WorkItem | null = null;
    if (block.workItemId) {
      const itemRes = await this.todayRepo.getWorkItem(block.workItemId);
      if (!itemRes.ok) return itemRes;
      if (itemRes.value) {
        const remainingBlocksRes = await this.todayRepo.listTimeBlocksForWorkItem(block.workItemId);
        if (!remainingBlocksRes.ok) return remainingBlocksRes;

        const otherBlocks = remainingBlocksRes.value.filter((b) => b.id !== timeBlockId);
        if (otherBlocks.length === 0 && itemRes.value.status === 'scheduled') {
          const now = this.nowFactory();
          updatedWorkItem = {
            ...itemRes.value,
            status: 'backlog',
            updatedAt: now,
          };
        }
      }
    }

    return this.plannerRepo.removeTimeBlock(timeBlockId, updatedWorkItem);
  }

  async setDayCapacity(
    date: string,
    capacityMinutes: number,
    morningIntention = '',
  ): Promise<Result<DailyPlan>> {
    if (!parseLocalDateKey(date)) {
      return err('invalid_date', 'Date must be a valid YYYY-MM-DD calendar date.');
    }

    const capacityValidation = validateCapacityMinutes(capacityMinutes);
    if (!capacityValidation.ok) return capacityValidation;

    const existingPlanRes = await this.plannerRepo.getDailyPlan(date);
    if (!existingPlanRes.ok) return existingPlanRes;

    const now = this.nowFactory();
    const existing = existingPlanRes.value;

    const dailyPlan: DailyPlan = existing
      ? {
          ...existing,
          capacityMinutes,
          morningIntention: morningIntention || existing.morningIntention,
          updatedAt: now,
        }
      : {
          id: createDefaultId('dp'),
          date,
          capacityMinutes,
          morningIntention,
          createdAt: now,
          updatedAt: now,
        };

    const saveRes = await this.plannerRepo.saveDailyPlan(dailyPlan);
    if (!saveRes.ok) return saveRes;

    return ok(dailyPlan);
  }
}
