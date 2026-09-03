import { describe, expect, it } from 'vitest';
import type { TimeBlock } from '@/domain/time-blocks/time-block';
import type { WorkItem } from '@/domain/work-items/work-item';
import { calculateProjectProgress } from './project-progress';

describe('Project Progress calculation', () => {
  it('calculates progress for a project with zero work items', () => {
    const progress = calculateProjectProgress({
      projectId: 'proj-1',
      workItems: [],
      timeBlocks: [],
    });

    expect(progress).toEqual({
      projectId: 'proj-1',
      totalWorkItems: 0,
      completedWorkItems: 0,
      completionRate: 0,
      remainingEstimatedMinutes: 0,
      actualFocusedMinutes: 0,
      scheduledMinutes: 0,
      unscheduledEstimatedMinutes: 0,
    });
  });

  it('calculates factual progress metrics for mixed work items and scheduled timeblocks', () => {
    const items: WorkItem[] = [
      {
        id: 'w1',
        projectId: 'proj-1',
        title: 'Task 1',
        notes: '',
        type: 'task',
        estimatedMinutes: 120,
        actualMinutes: 60,
        priority: 'p1_urgent',
        status: 'completed',
        completedAt: '2026-09-01T10:00:00.000Z',
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-09-01T10:00:00.000Z',
      },
      {
        id: 'w2',
        projectId: 'proj-1',
        title: 'Task 2',
        notes: '',
        type: 'task',
        estimatedMinutes: 90,
        actualMinutes: 30,
        priority: 'p2_high',
        status: 'scheduled',
        completedAt: null,
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-09-01T08:00:00.000Z',
      },
      {
        id: 'w3',
        projectId: 'proj-1',
        title: 'Task 3',
        notes: '',
        type: 'task',
        estimatedMinutes: 60,
        actualMinutes: 0,
        priority: 'p3_medium',
        status: 'backlog',
        completedAt: null,
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-09-01T08:00:00.000Z',
      },
      {
        id: 'w-other',
        projectId: 'proj-2', // different project
        title: 'Other project task',
        notes: '',
        type: 'task',
        estimatedMinutes: 100,
        actualMinutes: 50,
        priority: 'p4_low',
        status: 'scheduled',
        completedAt: null,
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-09-01T08:00:00.000Z',
      },
    ];

    const blocks: TimeBlock[] = [
      {
        id: 'tb-1',
        date: '2026-09-02',
        workItemId: 'w2',
        habitId: null,
        startMinute: 480,
        endMinute: 540, // 60 min
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-09-01T08:00:00.000Z',
      },
      {
        id: 'tb-2',
        date: '2026-09-03',
        workItemId: 'w-other',
        habitId: null,
        startMinute: 600,
        endMinute: 660,
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-09-01T08:00:00.000Z',
      },
    ];

    const progress = calculateProjectProgress({
      projectId: 'proj-1',
      workItems: items,
      timeBlocks: blocks,
    });

    expect(progress).toEqual({
      projectId: 'proj-1',
      totalWorkItems: 3,
      completedWorkItems: 1,
      completionRate: 1 / 3,
      // w2 remaining: 90 - 30 = 60, w3 remaining: 60 - 0 = 60 => total 120
      remainingEstimatedMinutes: 120,
      // actual: w1(60) + w2(30) + w3(0) = 90
      actualFocusedMinutes: 90,
      // scheduled for proj-1 tasks: tb-1 (60 min)
      scheduledMinutes: 60,
      // unscheduled remaining: remainingEstimated (120) - scheduled (60) = 60
      unscheduledEstimatedMinutes: 60,
    });
  });
});
