import { describe, expect, it } from 'vitest';
import type { DailyPlan } from '@/domain/daily-plans/daily-plan';
import type { TimeBlock } from '@/domain/time-blocks/time-block';
import type { WorkItem } from '@/domain/work-items/work-item';
import {
  buildPlannerDay,
  buildPlannerView,
  validateWorkItemTimeBlockOverlap,
} from './planner-day';

describe('Planner Day and 7-day View domain logic', () => {
  it('builds a planner day view with explicit daily plan capacity', () => {
    const dailyPlan: DailyPlan = {
      id: 'dp-1',
      date: '2026-09-01',
      capacityMinutes: 360, // 6 hours
      morningIntention: 'Focus on chemistry',
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
    };

    const blocks: TimeBlock[] = [
      {
        id: 'tb-1',
        date: '2026-09-01',
        workItemId: 'w-1',
        habitId: null,
        startMinute: 480, // 08:00
        endMinute: 600, // 10:00 (120 min)
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-09-01T08:00:00.000Z',
      },
      {
        id: 'tb-2',
        date: '2026-09-01',
        workItemId: 'w-2',
        habitId: null,
        startMinute: 660, // 11:00
        endMinute: 780, // 13:00 (120 min)
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-09-01T08:00:00.000Z',
      },
    ];

    const dayView = buildPlannerDay({
      date: '2026-09-01',
      dailyPlan,
      timeBlocks: blocks,
    });

    expect(dayView).toEqual({
      date: '2026-09-01',
      dayOfWeek: 'Tue',
      capacityMinutes: 360,
      hasExplicitCapacity: true,
      scheduledMinutes: 240,
      remainingMinutes: 120,
      overbookedMinutes: 0,
      isOverbooked: false,
      timeBlocks: blocks,
    });
  });

  it('builds a planner day view with default 480m capacity when no explicit plan exists', () => {
    const dayView = buildPlannerDay({
      date: '2026-09-02',
      dailyPlan: null,
      timeBlocks: [],
    });

    expect(dayView).toEqual({
      date: '2026-09-02',
      dayOfWeek: 'Wed',
      capacityMinutes: 480,
      hasExplicitCapacity: false,
      scheduledMinutes: 0,
      remainingMinutes: 480,
      overbookedMinutes: 0,
      isOverbooked: false,
      timeBlocks: [],
    });
  });

  it('correctly calculates overbooking when scheduled minutes exceed capacity', () => {
    const dailyPlan: DailyPlan = {
      id: 'dp-1',
      date: '2026-09-01',
      capacityMinutes: 120, // 2 hours
      morningIntention: '',
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
    };

    const blocks: TimeBlock[] = [
      {
        id: 'tb-1',
        date: '2026-09-01',
        workItemId: 'w-1',
        habitId: null,
        startMinute: 480,
        endMinute: 660, // 180 min
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-09-01T08:00:00.000Z',
      },
    ];

    const dayView = buildPlannerDay({
      date: '2026-09-01',
      dailyPlan,
      timeBlocks: blocks,
    });

    expect(dayView.scheduledMinutes).toBe(180);
    expect(dayView.capacityMinutes).toBe(120);
    expect(dayView.remainingMinutes).toBe(0);
    expect(dayView.overbookedMinutes).toBe(60);
    expect(dayView.isOverbooked).toBe(true);
  });

  it('validates and detects overlapping work item time blocks', () => {
    const existingBlocks: TimeBlock[] = [
      {
        id: 'tb-1',
        date: '2026-09-01',
        workItemId: 'w-1',
        habitId: null,
        startMinute: 500,
        endMinute: 600,
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-09-01T08:00:00.000Z',
      },
    ];

    // Overlapping: 550..650
    const overlapping = validateWorkItemTimeBlockOverlap({
      candidate: {
        id: 'tb-2',
        date: '2026-09-01',
        workItemId: 'w-2',
        habitId: null,
        startMinute: 550,
        endMinute: 650,
      },
      existingBlocks,
    });
    expect(overlapping.ok).toBe(false);
    if (!overlapping.ok) {
      expect(overlapping.code).toBe('time_block_overlap');
    }

    // Non-overlapping: 600..700 (adjacent allowed)
    const nonOverlapping = validateWorkItemTimeBlockOverlap({
      candidate: {
        id: 'tb-2',
        date: '2026-09-01',
        workItemId: 'w-2',
        habitId: null,
        startMinute: 600,
        endMinute: 700,
      },
      existingBlocks,
    });
    expect(nonOverlapping.ok).toBe(true);
  });

  it('builds a 7-day planner view aggregating daily views and backlog items', () => {
    const workItems: WorkItem[] = [
      {
        id: 'w-1',
        projectId: 'p-1',
        title: 'Scheduled Task',
        notes: '',
        type: 'task',
        estimatedMinutes: 60,
        actualMinutes: 0,
        priority: 'p1_urgent',
        status: 'scheduled',
        completedAt: null,
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-09-01T08:00:00.000Z',
      },
      {
        id: 'w-2',
        projectId: 'p-1',
        title: 'Backlog Task',
        notes: '',
        type: 'task',
        estimatedMinutes: 90,
        actualMinutes: 0,
        priority: 'p2_high',
        status: 'backlog',
        completedAt: null,
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-09-01T08:00:00.000Z',
      },
      {
        id: 'w-3',
        projectId: 'p-1',
        title: 'Completed Task',
        notes: '',
        type: 'task',
        estimatedMinutes: 45,
        actualMinutes: 45,
        priority: 'p3_medium',
        status: 'completed',
        completedAt: '2026-09-01T09:00:00.000Z',
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-09-01T09:00:00.000Z',
      },
    ];

    const timeBlocks: TimeBlock[] = [
      {
        id: 'tb-1',
        date: '2026-09-01',
        workItemId: 'w-1',
        habitId: null,
        startMinute: 480,
        endMinute: 540,
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-09-01T08:00:00.000Z',
      },
    ];

    const view = buildPlannerView({
      startDate: '2026-09-01',
      daysCount: 7,
      dailyPlans: [],
      timeBlocks,
      workItems,
    });

    expect(view.startDate).toBe('2026-09-01');
    expect(view.days.length).toBe(7);
    expect(view.days[0].date).toBe('2026-09-01');
    expect(view.days[6].date).toBe('2026-09-07');
    expect(view.days[0].timeBlocks.length).toBe(1);

    // Backlog items should only include incomplete items that have no upcoming schedule
    expect(view.backlogItems.map((item) => item.id)).toEqual(['w-2']);
  });
});
