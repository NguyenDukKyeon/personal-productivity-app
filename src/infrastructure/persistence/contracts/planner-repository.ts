import type { Result } from '@/domain/shared/result';
import type { DailyPlan } from '@/domain/daily-plans/daily-plan';
import type { TimeBlock } from '@/domain/time-blocks/time-block';
import type { WorkItem } from '@/domain/work-items/work-item';

export interface PlannerRepository {
  listTimeBlocksInRange(startDate: string, endDate: string): Promise<Result<TimeBlock[]>>;
  listDailyPlansInRange(startDate: string, endDate: string): Promise<Result<DailyPlan[]>>;
  getDailyPlan(date: string): Promise<Result<DailyPlan | null>>;
  saveDailyPlan(plan: DailyPlan): Promise<Result<void>>;
  getTimeBlock(id: string): Promise<Result<TimeBlock | null>>;
  scheduleWorkItem(timeBlock: TimeBlock, updatedWorkItem: WorkItem): Promise<Result<void>>;
  removeTimeBlock(id: string, updatedWorkItem?: WorkItem | null): Promise<Result<void>>;
  moveTimeBlock(timeBlock: TimeBlock): Promise<Result<void>>;
}
