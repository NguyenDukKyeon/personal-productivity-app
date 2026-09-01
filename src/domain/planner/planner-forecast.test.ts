import { describe, expect, it } from 'vitest';
import type { DailyPlan } from '@/domain/daily-plans/daily-plan';
import type { TimeBlock } from '@/domain/time-blocks/time-block';
import type { WorkItem } from '@/domain/work-items/work-item';
import { calculateProjectForecast } from './planner-forecast';

describe('Deterministic Project Forecast domain logic', () => {
  it('returns on_track with today as completion date when project has 0 remaining work', () => {
    const workItems: WorkItem[] = [
      {
        id: 'w-1',
        projectId: 'proj-1',
        title: 'Task 1',
        notes: '',
        type: 'task',
        estimatedMinutes: 60,
        actualMinutes: 60,
        priority: 'p1_urgent',
        status: 'completed',
        completedAt: '2026-09-01T10:00:00.000Z',
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-09-01T10:00:00.000Z',
      },
    ];

    const forecast = calculateProjectForecast({
      projectId: 'proj-1',
      targetDate: '2026-09-10',
      fromDate: '2026-09-01',
      workItems,
      timeBlocks: [],
      dailyPlans: [],
      defaultDailyCapacityMinutes: 480,
    });

    expect(forecast).toEqual({
      projectId: 'proj-1',
      totalWorkItems: 1,
      completedWorkItems: 1,
      remainingEstimatedMinutes: 0,
      scheduledMinutesWithinHorizon: 0,
      unscheduledEstimatedMinutes: 0,
      projectedCompletionDate: '2026-09-01',
      targetDate: '2026-09-10',
      status: 'on_track',
    });
  });

  it('returns insufficient_data when incomplete tasks have zero or missing estimates', () => {
    const workItems: WorkItem[] = [];

    const forecast = calculateProjectForecast({
      projectId: 'proj-1',
      targetDate: '2026-09-10',
      fromDate: '2026-09-01',
      workItems,
      timeBlocks: [],
      dailyPlans: [],
      defaultDailyCapacityMinutes: 480,
    });

    expect(forecast.status).toBe('insufficient_data');
    expect(forecast.projectedCompletionDate).toBeNull();
  });

  it('correctly simulates completion date when remaining work fits within single day free capacity', () => {
    const workItems: WorkItem[] = [
      {
        id: 'w-1',
        projectId: 'proj-1',
        title: 'Task 1',
        notes: '',
        type: 'task',
        estimatedMinutes: 180, // 3 hours
        actualMinutes: 0,
        priority: 'p1_urgent',
        status: 'backlog',
        completedAt: null,
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-09-01T08:00:00.000Z',
      },
    ];

    // Day 1 has 480m default capacity, no blocks => 180m fits on Day 1 (2026-09-01)
    const forecast = calculateProjectForecast({
      projectId: 'proj-1',
      targetDate: '2026-09-05',
      fromDate: '2026-09-01',
      workItems,
      timeBlocks: [],
      dailyPlans: [],
      defaultDailyCapacityMinutes: 480,
    });

    expect(forecast.remainingEstimatedMinutes).toBe(180);
    expect(forecast.projectedCompletionDate).toBe('2026-09-01');
    expect(forecast.status).toBe('on_track');
  });

  it('spills simulation across days when daily capacity is constrained by existing blocks and explicit plans', () => {
    const workItems: WorkItem[] = [
      {
        id: 'w-1',
        projectId: 'proj-1',
        title: 'Big Task',
        notes: '',
        type: 'task',
        estimatedMinutes: 300, // 5 hours remaining
        actualMinutes: 0,
        priority: 'p1_urgent',
        status: 'backlog',
        completedAt: null,
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-09-01T08:00:00.000Z',
      },
    ];

    // Day 1 (2026-09-01): explicit capacity 120m, but 60m already scheduled -> 60m free capacity. (Remaining: 240m)
    // Day 2 (2026-09-02): explicit capacity 120m, 0m scheduled -> 120m free capacity. (Remaining: 120m)
    // Day 3 (2026-09-03): explicit capacity 180m -> 180m free capacity covers remaining 120m! Projected date = 2026-09-03.
    const dailyPlans: DailyPlan[] = [
      {
        id: 'dp-1',
        date: '2026-09-01',
        capacityMinutes: 120,
        morningIntention: '',
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-09-01T08:00:00.000Z',
      },
      {
        id: 'dp-2',
        date: '2026-09-02',
        capacityMinutes: 120,
        morningIntention: '',
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-09-01T08:00:00.000Z',
      },
      {
        id: 'dp-3',
        date: '2026-09-03',
        capacityMinutes: 180,
        morningIntention: '',
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-09-01T08:00:00.000Z',
      },
    ];

    const timeBlocks: TimeBlock[] = [
      {
        id: 'tb-other',
        date: '2026-09-01',
        workItemId: 'other-task',
        habitId: null,
        startMinute: 480,
        endMinute: 540, // 60 min scheduled on day 1
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-09-01T08:00:00.000Z',
      },
    ];

    const forecast = calculateProjectForecast({
      projectId: 'proj-1',
      targetDate: '2026-09-05',
      fromDate: '2026-09-01',
      workItems,
      timeBlocks,
      dailyPlans,
      defaultDailyCapacityMinutes: 480,
    });

    expect(forecast.remainingEstimatedMinutes).toBe(300);
    expect(forecast.projectedCompletionDate).toBe('2026-09-03');
    expect(forecast.status).toBe('on_track');
  });

  it('marks forecast at_risk when projected completion date exceeds target date', () => {
    const workItems: WorkItem[] = [
      {
        id: 'w-1',
        projectId: 'proj-1',
        title: 'Huge Task',
        notes: '',
        type: 'task',
        estimatedMinutes: 600, // 10 hours
        actualMinutes: 0,
        priority: 'p1_urgent',
        status: 'backlog',
        completedAt: null,
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-09-01T08:00:00.000Z',
      },
    ];

    // Default capacity is 240m (4h) per day.
    // Day 1 (Sep 01): 240m (rem 360)
    // Day 2 (Sep 02): 240m (rem 120)
    // Day 3 (Sep 03): 240m (rem 0) -> Projected Sep 03
    // Target is Sep 02 => at_risk!
    const forecast = calculateProjectForecast({
      projectId: 'proj-1',
      targetDate: '2026-09-02',
      fromDate: '2026-09-01',
      workItems,
      timeBlocks: [],
      dailyPlans: [],
      defaultDailyCapacityMinutes: 240,
    });

    expect(forecast.projectedCompletionDate).toBe('2026-09-03');
    expect(forecast.status).toBe('at_risk');
    expect(forecast.riskReason).toContain('exceeds target date');
  });

  it('does not mutate work items or timeblocks during forecasting', () => {
    const workItems: WorkItem[] = [
      {
        id: 'w-1',
        projectId: 'proj-1',
        title: 'Immutable Check',
        notes: '',
        type: 'task',
        estimatedMinutes: 100,
        actualMinutes: 0,
        priority: 'p1_urgent',
        status: 'backlog',
        completedAt: null,
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-09-01T08:00:00.000Z',
      },
    ];
    const initialSnapshot = JSON.stringify(workItems);

    calculateProjectForecast({
      projectId: 'proj-1',
      targetDate: '2026-09-05',
      fromDate: '2026-09-01',
      workItems,
      timeBlocks: [],
      dailyPlans: [],
      defaultDailyCapacityMinutes: 480,
    });

    expect(JSON.stringify(workItems)).toBe(initialSnapshot);
  });
});
