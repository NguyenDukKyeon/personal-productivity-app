import { parseLocalDateKey, shiftLocalDateKey } from '@/domain/shared/local-date';
import { err, ok, type Result } from '@/domain/shared/result';
import type { TimeBlock } from '@/domain/time-blocks/time-block';
import type { DailyPlan } from '@/domain/daily-plans/daily-plan';
import type { WorkItem } from '@/domain/work-items/work-item';

export const DEFAULT_DAILY_CAPACITY_MINUTES = 480; // 8 hours

export interface PlannerScheduledBlock {
  timeBlock: TimeBlock;
  workItem: WorkItem | null;
  durationMinutes: number;
}

export interface PlannerDayView {
  date: string;
  dayOfWeek: string;
  capacityMinutes: number;
  hasExplicitCapacity: boolean;
  scheduledMinutes: number;
  remainingMinutes: number;
  overbookedMinutes: number;
  isOverbooked: boolean;
  timeBlocks: TimeBlock[];
  dailyPlan?: DailyPlan | null;
  freeCapacityMinutes?: number;
  isOverCapacity?: boolean;
  scheduledBlocks?: PlannerScheduledBlock[];
}

export type PlannerDay = PlannerDayView;

export interface PlannerView {
  startDate: string;
  daysCount?: number;
  days: PlannerDayView[];
  backlogItems: WorkItem[];
}

export function getDayOfWeekFromDateKey(dateKey: string): string {
  const parts = parseLocalDateKey(dateKey);
  if (!parts) return '';
  const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[utc.getUTCDay()];
}

export function buildPlannerDay(params: {
  date: string;
  dailyPlan: DailyPlan | null;
  timeBlocks: TimeBlock[];
  defaultCapacityMinutes?: number;
}): PlannerDayView {
  const defaultCapacity = params.defaultCapacityMinutes ?? DEFAULT_DAILY_CAPACITY_MINUTES;
  const capacityMinutes = params.dailyPlan ? params.dailyPlan.capacityMinutes : defaultCapacity;
  const hasExplicitCapacity = params.dailyPlan !== null;

  const dateBlocks = params.timeBlocks
    .filter((b) => b.date === params.date)
    .sort((a, b) => a.startMinute - b.startMinute);

  const scheduledMinutes = dateBlocks.reduce(
    (sum, b) => sum + (b.endMinute - b.startMinute),
    0,
  );

  const remainingMinutes = Math.max(0, capacityMinutes - scheduledMinutes);
  const overbookedMinutes = Math.max(0, scheduledMinutes - capacityMinutes);
  const isOverbooked = scheduledMinutes > capacityMinutes;

  return {
    date: params.date,
    dayOfWeek: getDayOfWeekFromDateKey(params.date),
    capacityMinutes,
    hasExplicitCapacity,
    scheduledMinutes,
    remainingMinutes,
    overbookedMinutes,
    isOverbooked,
    timeBlocks: dateBlocks,
  };
}

export function validateWorkItemTimeBlockOverlap(params: {
  candidate: Pick<TimeBlock, 'id' | 'date' | 'startMinute' | 'endMinute'> &
    Partial<Pick<TimeBlock, 'workItemId' | 'habitId'>>;
  existingBlocks: TimeBlock[];
}): Result<void> {
  const sameDateBlocks = params.existingBlocks.filter(
    (b) => b.date === params.candidate.date && b.id !== params.candidate.id,
  );

  for (const block of sameDateBlocks) {
    if (
      params.candidate.startMinute < block.endMinute &&
      block.startMinute < params.candidate.endMinute
    ) {
      return err(
        'time_block_overlap',
        `Time block (${params.candidate.startMinute}..${params.candidate.endMinute}) overlaps with existing block (${block.startMinute}..${block.endMinute}).`,
      );
    }
  }

  return ok(undefined);
}

export function buildPlannerView(params: {
  startDate: string;
  daysCount?: number;
  dailyPlans: DailyPlan[];
  timeBlocks: TimeBlock[];
  workItems: WorkItem[];
  defaultCapacityMinutes?: number;
}): PlannerView {
  const daysCount = params.daysCount ?? 7;
  const plansByDate = new Map(params.dailyPlans.map((p) => [p.date, p]));
  const workItemsMap = new Map(params.workItems.map((w) => [w.id, w]));
  const days: PlannerDayView[] = [];

  for (let i = 0; i < daysCount; i++) {
    const date = shiftLocalDateKey(params.startDate, i);
    if (!date) continue;

    const dailyPlan = plansByDate.get(date) ?? null;
    const day = buildPlannerDay({
      date,
      dailyPlan,
      timeBlocks: params.timeBlocks,
      defaultCapacityMinutes: params.defaultCapacityMinutes,
    });

    const scheduledBlocks: PlannerScheduledBlock[] = day.timeBlocks.map((b) => ({
      timeBlock: b,
      workItem: b.workItemId ? (workItemsMap.get(b.workItemId) ?? null) : null,
      durationMinutes: b.endMinute - b.startMinute,
    }));

    days.push({
      ...day,
      dailyPlan,
      freeCapacityMinutes: day.remainingMinutes,
      isOverCapacity: day.isOverbooked,
      scheduledBlocks,
    });
  }

  // Backlog items are uncompleted items that have no upcoming TimeBlocks
  // scheduled from startDate onwards
  const scheduledWorkItemIds = new Set(
    params.timeBlocks
      .filter((b) => b.workItemId !== null && b.date >= params.startDate)
      .map((b) => b.workItemId as string),
  );

  const backlogItems = params.workItems.filter(
    (item) => item.status !== 'completed' && !scheduledWorkItemIds.has(item.id),
  );

  return {
    startDate: params.startDate,
    daysCount,
    days,
    backlogItems,
  };
}
