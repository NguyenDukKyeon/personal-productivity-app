import { describe, it, expect } from 'vitest';
import {
  calculateDailyDisciplineScore,
  calculateHabitStreak,
  calculateHabitConsistencyRate,
} from './productivity';
import { Habit, HabitLog, WorkItem, DailyPlan, FocusSession } from '@/types';

describe('Productivity & Discipline Scoring Edge Cases', () => {
  const date = '2026-08-30';

  it('handles empty day (0 tasks, 0 sessions, 0 habits) without NaN', () => {
    const metrics = calculateDailyDisciplineScore(
      date,
      undefined,
      [],
      [],
      [],
      []
    );

    expect(metrics.disciplineScore).toBeGreaterThanOrEqual(0);
    expect(metrics.disciplineScore).toBeLessThanOrEqual(100);
    expect(Number.isNaN(metrics.disciplineScore)).toBe(false);
    expect(metrics.isOverbooked).toBe(false);
    expect(metrics.overbookedMinutes).toBe(0);
  });

  it('accurately computes 100% discipline score when all components are completed', () => {
    const plan: DailyPlan = {
      id: 'plan-1',
      date,
      capacityHours: 2, // 120 mins
      top3ItemIds: ['task-1', 'task-2'],
      createdAt: '2026-08-30T00:00:00.000Z',
      updatedAt: '2026-08-30T00:00:00.000Z',
    };

    const items: WorkItem[] = [
      {
        id: 'task-1',
        title: 'Task 1',
        type: 'task',
        estimatedMinutes: 60,
        actualMinutes: 60,
        priority: 'p1_urgent',
        status: 'completed',
        scheduledDate: date,
        orderIndex: 0,
        createdAt: '2026-08-30T00:00:00.000Z',
        updatedAt: '2026-08-30T00:00:00.000Z',
      },
      {
        id: 'task-2',
        title: 'Task 2',
        type: 'task',
        estimatedMinutes: 60,
        actualMinutes: 60,
        priority: 'p2_high',
        status: 'completed',
        scheduledDate: date,
        orderIndex: 1,
        createdAt: '2026-08-30T00:00:00.000Z',
        updatedAt: '2026-08-30T00:00:00.000Z',
      },
    ];

    const habits: Habit[] = [
      {
        id: 'h-1',
        name: 'Đọc sách',
        routine: 'morning',
        frequencyType: 'daily',
        frequencyDays: [1, 2, 3, 4, 5, 6, 7],
        targetValue: 1,
        targetUnit: 'times',
        color: '#6366f1',
        icon: 'check',
        archived: false,
        createdAt: '2026-08-01T00:00:00.000Z',
      },
    ];

    const habitLogs: HabitLog[] = [
      {
        id: 'hl-1',
        habitId: 'h-1',
        date,
        completedValue: 1,
        isCompleted: true,
        createdAt: '2026-08-30T00:00:00.000Z',
      },
    ];

    const focusSessions: FocusSession[] = [
      {
        id: 'fs-1',
        durationMinutes: 120,
        mode: 'pomodoro',
        distractionNotes: [],
        startedAt: `${date}T09:00:00.000Z`,
        endedAt: `${date}T11:00:00.000Z`,
        createdAt: '2026-08-30T00:00:00.000Z',
      },
    ];

    const metrics = calculateDailyDisciplineScore(
      date,
      plan,
      items,
      habits,
      habitLogs,
      focusSessions
    );

    expect(metrics.disciplineScore).toBe(100);
    expect(metrics.isOverbooked).toBe(false);
  });

  it('detects overbooking when planned minutes exceed capacity quota', () => {
    const plan: DailyPlan = {
      id: 'plan-1',
      date,
      capacityHours: 4, // 240 mins
      top3ItemIds: [],
      createdAt: '2026-08-30T00:00:00.000Z',
      updatedAt: '2026-08-30T00:00:00.000Z',
    };

    const items: WorkItem[] = [
      {
        id: 'task-heavy',
        title: 'Task quá tải',
        type: 'task',
        estimatedMinutes: 360, // 6h > 4h
        actualMinutes: 0,
        priority: 'p1_urgent',
        status: 'scheduled',
        scheduledDate: date,
        orderIndex: 0,
        createdAt: '2026-08-30T00:00:00.000Z',
        updatedAt: '2026-08-30T00:00:00.000Z',
      },
    ];

    const metrics = calculateDailyDisciplineScore(
      date,
      plan,
      items,
      [],
      [],
      []
    );

    expect(metrics.isOverbooked).toBe(true);
    expect(metrics.overbookedMinutes).toBe(120); // 360 - 240 = 120
  });

  it('calculates habit streak and Never Miss Twice correctly', () => {
    const habitLogs: HabitLog[] = [
      { id: '1', habitId: 'h-1', date: '2026-08-28', isCompleted: true, completedValue: 1, createdAt: '' },
      { id: '2', habitId: 'h-1', date: '2026-08-29', isCompleted: true, completedValue: 1, createdAt: '' },
      { id: '3', habitId: 'h-1', date: '2026-08-30', isCompleted: true, completedValue: 1, createdAt: '' },
    ];

    const streak = calculateHabitStreak('h-1', habitLogs, '2026-08-30');
    expect(streak.currentStreak).toBe(3);
    expect(streak.missedYesterday).toBe(false);
  });

  it('triggers missedYesterday when yesterday log is missing and today is not completed yet', () => {
    const habitLogs: HabitLog[] = [
      { id: '1', habitId: 'h-1', date: '2026-08-27', isCompleted: true, completedValue: 1, createdAt: '' },
      { id: '2', habitId: 'h-1', date: '2026-08-28', isCompleted: true, completedValue: 1, createdAt: '' },
      // 2026-08-29 (yesterday) is missed
    ];

    const streak = calculateHabitStreak('h-1', habitLogs, '2026-08-30');
    expect(streak.missedYesterday).toBe(true);
  });

  it('computes 30-day consistency rate percentage', () => {
    const logs: HabitLog[] = Array.from({ length: 15 }).map((_, i) => ({
      id: `l-${i}`,
      habitId: 'h-1',
      date: `2026-08-${String(i + 1).padStart(2, '0')}`,
      isCompleted: true,
      completedValue: 1,
      createdAt: '',
    }));

    const rate = calculateHabitConsistencyRate('h-1', logs, 30);
    expect(rate).toBe(50); // 15/30 = 50%
  });
});
