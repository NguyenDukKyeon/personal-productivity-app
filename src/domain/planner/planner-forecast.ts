import { shiftLocalDateKey } from '@/domain/shared/local-date';
import type { DailyPlan } from '@/domain/daily-plans/daily-plan';
import type { TimeBlock } from '@/domain/time-blocks/time-block';
import type { WorkItem } from '@/domain/work-items/work-item';
import { DEFAULT_DAILY_CAPACITY_MINUTES } from './planner-day';

export type ForecastStatus = 'on_track' | 'at_risk' | 'insufficient_data';

export interface ProjectForecast {
  projectId: string;
  totalWorkItems: number;
  completedWorkItems: number;
  remainingEstimatedMinutes: number;
  scheduledMinutesWithinHorizon: number;
  unscheduledEstimatedMinutes: number;
  projectedCompletionDate: string | null;
  targetDate: string | null;
  status: ForecastStatus;
  riskReason?: string;
}

export function calculateProjectForecast(params: {
  projectId: string;
  targetDate: string | null;
  fromDate: string;
  workItems: WorkItem[];
  timeBlocks: TimeBlock[];
  dailyPlans: DailyPlan[];
  defaultDailyCapacityMinutes?: number;
  maxHorizonDays?: number;
}): ProjectForecast {
  const projectItems = params.workItems.filter((item) => item.projectId === params.projectId);
  const totalWorkItems = projectItems.length;
  const completedWorkItems = projectItems.filter((item) => item.status === 'completed').length;
  const incompleteItems = projectItems.filter((item) => item.status !== 'completed');

  if (totalWorkItems === 0) {
    return {
      projectId: params.projectId,
      totalWorkItems: 0,
      completedWorkItems: 0,
      remainingEstimatedMinutes: 0,
      scheduledMinutesWithinHorizon: 0,
      unscheduledEstimatedMinutes: 0,
      projectedCompletionDate: null,
      targetDate: params.targetDate,
      status: 'insufficient_data',
      riskReason: 'No work items found for project.',
    };
  }

  const remainingEstimatedMinutes = incompleteItems.reduce(
    (sum, item) => sum + Math.max(0, item.estimatedMinutes - item.actualMinutes),
    0,
  );

  // If all items are completed, project is done on fromDate
  if (incompleteItems.length === 0) {
    return {
      projectId: params.projectId,
      totalWorkItems,
      completedWorkItems,
      remainingEstimatedMinutes: 0,
      scheduledMinutesWithinHorizon: 0,
      unscheduledEstimatedMinutes: 0,
      projectedCompletionDate: params.fromDate,
      targetDate: params.targetDate,
      status: 'on_track',
    };
  }

  // If there are incomplete items but 0 estimated minutes, we have insufficient estimate data
  if (remainingEstimatedMinutes === 0) {
    return {
      projectId: params.projectId,
      totalWorkItems,
      completedWorkItems,
      remainingEstimatedMinutes: 0,
      scheduledMinutesWithinHorizon: 0,
      unscheduledEstimatedMinutes: 0,
      projectedCompletionDate: null,
      targetDate: params.targetDate,
      status: 'insufficient_data',
      riskReason: 'Incomplete tasks have no remaining estimate.',
    };
  }

  const projectItemIds = new Set(projectItems.map((item) => item.id));
  const scheduledMinutesWithinHorizon = params.timeBlocks
    .filter(
      (b) =>
        b.workItemId !== null &&
        projectItemIds.has(b.workItemId) &&
        b.date >= params.fromDate,
    )
    .reduce((sum, b) => sum + (b.endMinute - b.startMinute), 0);

  const unscheduledEstimatedMinutes = Math.max(
    0,
    remainingEstimatedMinutes - scheduledMinutesWithinHorizon,
  );

  const defaultCapacity =
    params.defaultDailyCapacityMinutes ?? DEFAULT_DAILY_CAPACITY_MINUTES;
  const maxDays = params.maxHorizonDays ?? 365;

  const plansByDate = new Map(params.dailyPlans.map((p) => [p.date, p]));
  const blocksByDate = new Map<string, TimeBlock[]>();
  for (const block of params.timeBlocks) {
    const list = blocksByDate.get(block.date) ?? [];
    list.push(block);
    blocksByDate.set(block.date, list);
  }

  let simulatedRemaining = remainingEstimatedMinutes;
  let projectedCompletionDate: string | null = null;

  for (let offset = 0; offset < maxDays; offset++) {
    const currentDate = shiftLocalDateKey(params.fromDate, offset);
    if (!currentDate) break;

    const plan = plansByDate.get(currentDate);
    const dayCapacity = plan ? plan.capacityMinutes : defaultCapacity;
    const dayBlocks = blocksByDate.get(currentDate) ?? [];
    const dayScheduled = dayBlocks.reduce(
      (sum, b) => sum + (b.endMinute - b.startMinute),
      0,
    );

    const freeCapacity = Math.max(0, dayCapacity - dayScheduled);
    simulatedRemaining -= freeCapacity;

    if (simulatedRemaining <= 0) {
      projectedCompletionDate = currentDate;
      break;
    }
  }

  let status: ForecastStatus = 'on_track';
  let riskReason: string | undefined;

  if (projectedCompletionDate === null) {
    if (params.targetDate) {
      status = 'at_risk';
      riskReason = `Insufficient capacity within ${maxDays}-day horizon to complete estimated work.`;
    } else {
      status = 'insufficient_data';
      riskReason = `Insufficient capacity within ${maxDays}-day horizon to project completion.`;
    }
  } else if (params.targetDate !== null) {
    if (projectedCompletionDate > params.targetDate) {
      status = 'at_risk';
      riskReason = `Projected completion date (${projectedCompletionDate}) exceeds target date (${params.targetDate}).`;
    } else {
      status = 'on_track';
    }
  } else {
    status = 'on_track';
  }

  return {
    projectId: params.projectId,
    totalWorkItems,
    completedWorkItems,
    remainingEstimatedMinutes,
    scheduledMinutesWithinHorizon,
    unscheduledEstimatedMinutes,
    projectedCompletionDate,
    targetDate: params.targetDate,
    status,
    riskReason,
  };
}
