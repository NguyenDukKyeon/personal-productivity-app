import { describe, it, expect } from 'vitest';
import { calculateCourseForecast } from './forecast';
import { WorkItem, Project } from '@/types';

describe('Course Forecast & What-If Engine Edge Cases', () => {
  const projects: Project[] = [
    {
      id: 'proj-1',
      title: 'Lập trình Fullstack React 19',
      color: '#6366f1',
      status: 'active',
      orderIndex: 0,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
  ];

  it('handles 100% completed courses gracefully', () => {
    const workItems: WorkItem[] = [
      {
        id: 'l-1',
        projectId: 'proj-1',
        title: 'Bài 1',
        type: 'lesson',
        estimatedMinutes: 60,
        actualMinutes: 60,
        priority: 'p2_high',
        status: 'completed',
        completedAt: '2026-08-25T00:00:00.000Z',
        orderIndex: 0,
        createdAt: '',
        updatedAt: '',
      },
    ];

    const forecast = calculateCourseForecast('proj-1', projects, workItems, 4);
    expect(forecast.isComplete).toBe(true);
    expect(forecast.progressPercent).toBe(100);
    expect(forecast.remainingLessons).toBe(0);
    expect(forecast.remainingHours).toBe(0);
  });

  it('handles 0 lessons course without error or division by zero', () => {
    const forecast = calculateCourseForecast('proj-1', projects, [], 4);
    expect(forecast.totalLessons).toBe(0);
    expect(forecast.progressPercent).toBe(0);
    expect(forecast.confidence).toBe('insufficient');
  });

  it('calculates realistic finish date and days needed with What-If hours and confidence stages', () => {
    // 5 completed lessons + 10 backlog lessons
    const completedItems: WorkItem[] = Array.from({ length: 5 }).map((_, i) => ({
      id: `l-done-${i}`,
      projectId: 'proj-1',
      title: `Bài đã học ${i + 1}`,
      type: 'lesson',
      estimatedMinutes: 60,
      actualMinutes: 60,
      priority: 'p2_high',
      status: 'completed',
      completedAt: '2026-08-25T00:00:00.000Z',
      orderIndex: i,
      createdAt: '',
      updatedAt: '',
    }));

    const remainingItems: WorkItem[] = Array.from({ length: 10 }).map((_, i) => ({
      id: `l-${i}`,
      projectId: 'proj-1',
      title: `Bài học ${i + 1}`,
      type: 'lesson',
      estimatedMinutes: 60, // 1 hour each -> 10 hours total
      actualMinutes: 0,
      priority: 'p2_high',
      status: 'backlog',
      orderIndex: 5 + i,
      createdAt: '',
      updatedAt: '',
    }));

    const workItems = [...completedItems, ...remainingItems];

    // With 2 hours/day -> 10 hours / 2h = 5 days needed
    const forecast = calculateCourseForecast('proj-1', projects, workItems, 2, '2026-08-30');
    expect(forecast.totalLessons).toBe(15);
    expect(forecast.completedLessons).toBe(5);
    expect(forecast.remainingLessons).toBe(10);
    expect(forecast.remainingHours).toBe(10);
    expect(forecast.daysNeeded).toBe(5);
    expect(forecast.finishDateISO).toBeDefined();
    expect(forecast.confidence).toBe('high');
  });

  it('handles high daily hours simulation (e.g. 10 hours/day)', () => {
    const workItems: WorkItem[] = Array.from({ length: 10 }).map((_, i) => ({
      id: `l-${i}`,
      projectId: 'proj-1',
      title: `Bài học ${i + 1}`,
      type: 'lesson',
      estimatedMinutes: 60,
      actualMinutes: 0,
      priority: 'p2_high',
      status: 'backlog',
      orderIndex: i,
      createdAt: '',
      updatedAt: '',
    }));

    const forecast = calculateCourseForecast('proj-1', projects, workItems, 10, '2026-08-30');
    expect(forecast.daysNeeded).toBe(1);
  });
});
