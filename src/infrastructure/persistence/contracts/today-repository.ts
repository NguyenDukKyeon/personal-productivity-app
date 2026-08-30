import type { DailyCommitmentSnapshot } from '@/domain/commitments/commitment';
import type { DailyPlan, DailyPriority } from '@/domain/daily-plans/daily-plan';
import type { Result } from '@/domain/shared/result';
import type { TimeBlock } from '@/domain/time-blocks/time-block';
import type { WorkItem } from '@/domain/work-items/work-item';

export interface TodayRepository {
  listWorkItems(): Promise<Result<WorkItem[]>>;
  getWorkItem(id: string): Promise<Result<WorkItem | null>>;
  saveWorkItem(item: WorkItem): Promise<Result<void>>;
  getDailyPlan(date: string): Promise<Result<DailyPlan | null>>;
  saveDailyPlan(plan: DailyPlan): Promise<Result<void>>;
  listPriorities(planId: string): Promise<Result<DailyPriority[]>>;
  replacePriorities(planId: string, priorities: DailyPriority[]): Promise<Result<void>>;
  listTimeBlocks(date: string): Promise<Result<TimeBlock[]>>;
  getTimeBlock(id: string): Promise<Result<TimeBlock | null>>;
  listTimeBlocksForWorkItem(workItemId: string): Promise<Result<TimeBlock[]>>;
  saveTimeBlock(block: TimeBlock): Promise<Result<void>>;
  saveTimeBlockWithWorkItem(block: TimeBlock, workItem: WorkItem): Promise<Result<void>>;
  removeTimeBlock(id: string): Promise<Result<void>>;
  removeTimeBlockWithWorkItem(id: string, workItem: WorkItem): Promise<Result<void>>;
  getCommitment(date: string): Promise<Result<DailyCommitmentSnapshot | null>>;
  saveCommitment(snapshot: DailyCommitmentSnapshot): Promise<Result<void>>;
}
