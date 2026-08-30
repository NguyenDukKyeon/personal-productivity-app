import { describe, it, expect } from 'vitest';
import {
  getDueReviewItems,
  calculateReviewBudget,
  generateReviewTaskId,
} from './spacedRepetition';
import { WorkItem, Project } from '@/types';

describe('Spaced Repetition Review Engine (Ebbinghaus Intervals)', () => {
  const mockProjects: Project[] = [
    {
      id: 'proj-1',
      title: 'Toán Cao Cấp',
      color: '#6366f1',
      status: 'active',
      orderIndex: 0,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
  ];

  const currentDate = '2026-08-30';

  it('generates deterministic review task IDs', () => {
    const taskId = generateReviewTaskId('lesson-1', '2026-08-30');
    expect(taskId).toBe('review:lesson-1:2026-08-30');
  });

  it('correctly detects review stage 1 (1 day after completion)', () => {
    const workItems: WorkItem[] = [
      {
        id: 'lesson-1',
        projectId: 'proj-1',
        title: 'Bài 1: Ma trận & Định thức',
        type: 'lesson',
        estimatedMinutes: 60,
        actualMinutes: 60,
        priority: 'p2_high',
        status: 'completed',
        completedAt: '2026-08-29T10:00:00.000Z', // 1 day ago
        orderIndex: 0,
        createdAt: '2026-08-29T00:00:00.000Z',
        updatedAt: '2026-08-29T10:00:00.000Z',
      },
    ];

    const due = getDueReviewItems(workItems, mockProjects, currentDate, {});
    expect(due).toHaveLength(1);
    expect(due[0].lessonId).toBe('lesson-1');
    expect(due[0].ageDays).toBe(1);
    expect(due[0].intervalStage).toBe(1);
    expect(due[0].intervalLabel).toContain('Ôn lần 1');
    expect(due[0].isCompleted).toBe(false);
  });

  it('correctly detects review stage 2 (3 days after completion)', () => {
    const workItems: WorkItem[] = [
      {
        id: 'lesson-2',
        projectId: 'proj-1',
        title: 'Bài 2: Không gian Vector',
        type: 'lesson',
        estimatedMinutes: 60,
        actualMinutes: 60,
        priority: 'p2_high',
        status: 'completed',
        completedAt: '2026-08-27T14:00:00.000Z', // 3 days ago
        orderIndex: 1,
        createdAt: '2026-08-27T00:00:00.000Z',
        updatedAt: '2026-08-27T14:00:00.000Z',
      },
    ];

    const due = getDueReviewItems(workItems, mockProjects, currentDate, {});
    expect(due).toHaveLength(1);
    expect(due[0].intervalStage).toBe(3);
    expect(due[0].ageDays).toBe(3);
    expect(due[0].intervalLabel).toContain('Ôn lần 2');
  });

  it('correctly detects review stage 3 (7 days after completion)', () => {
    const workItems: WorkItem[] = [
      {
        id: 'lesson-3',
        projectId: 'proj-1',
        title: 'Bài 3: Ánh xạ tuyến tính',
        type: 'lesson',
        estimatedMinutes: 60,
        actualMinutes: 60,
        priority: 'p2_high',
        status: 'completed',
        completedAt: '2026-08-23T14:00:00.000Z', // 7 days ago
        orderIndex: 2,
        createdAt: '2026-08-23T00:00:00.000Z',
        updatedAt: '2026-08-23T14:00:00.000Z',
      },
    ];

    const due = getDueReviewItems(workItems, mockProjects, currentDate, {});
    expect(due).toHaveLength(1);
    expect(due[0].intervalStage).toBe(7);
    expect(due[0].ageDays).toBe(7);
  });

  it('correctly flags overdue review stages (e.g. 2 days ago = overdue stage 1)', () => {
    const workItems: WorkItem[] = [
      {
        id: 'lesson-overdue',
        projectId: 'proj-1',
        title: 'Bài quá hạn ôn',
        type: 'lesson',
        estimatedMinutes: 60,
        actualMinutes: 60,
        priority: 'p1_urgent',
        status: 'completed',
        completedAt: '2026-08-28T10:00:00.000Z', // 2 days ago
        orderIndex: 3,
        createdAt: '2026-08-28T00:00:00.000Z',
        updatedAt: '2026-08-28T10:00:00.000Z',
      },
    ];

    const due = getDueReviewItems(workItems, mockProjects, currentDate, {});
    expect(due).toHaveLength(1);
    expect(due[0].intervalStage).toBe('overdue');
    expect(due[0].intervalLabel).toContain('Quá hạn');
  });

  it('marks isCompleted when taskId exists in reviewCompletions map', () => {
    const workItems: WorkItem[] = [
      {
        id: 'lesson-1',
        projectId: 'proj-1',
        title: 'Bài 1: Ma trận',
        type: 'lesson',
        estimatedMinutes: 60,
        actualMinutes: 60,
        priority: 'p2_high',
        status: 'completed',
        completedAt: '2026-08-29T10:00:00.000Z',
        orderIndex: 0,
        createdAt: '2026-08-29T00:00:00.000Z',
        updatedAt: '2026-08-29T10:00:00.000Z',
      },
    ];

    const reviewCompletions = {
      'review:lesson-1:2026-08-30': '2026-08-30T09:00:00.000Z',
    };

    const due = getDueReviewItems(workItems, mockProjects, currentDate, reviewCompletions);
    expect(due).toHaveLength(1);
    expect(due[0].isCompleted).toBe(true);
  });

  it('ignores lessons completed today (0 days ago)', () => {
    const workItems: WorkItem[] = [
      {
        id: 'lesson-today',
        projectId: 'proj-1',
        title: 'Bài học hôm nay',
        type: 'lesson',
        estimatedMinutes: 60,
        actualMinutes: 60,
        priority: 'p2_high',
        status: 'completed',
        completedAt: '2026-08-30T08:00:00.000Z',
        orderIndex: 0,
        createdAt: '2026-08-30T00:00:00.000Z',
        updatedAt: '2026-08-30T08:00:00.000Z',
      },
    ];

    const due = getDueReviewItems(workItems, mockProjects, currentDate, {});
    expect(due).toHaveLength(0);
  });

  it('calculates review budget properly without overflow', () => {
    expect(calculateReviewBudget(6, 0.2, 60)).toBe(60); // 6h = 360m -> 20% = 72m, capped at 60m
    expect(calculateReviewBudget(2, 0.2, 60)).toBe(24); // 2h = 120m -> 20% = 24m
    expect(calculateReviewBudget(0, 0.2, 60)).toBe(0);
    expect(calculateReviewBudget(-1, 0.2, 60)).toBe(0);
  });
});
