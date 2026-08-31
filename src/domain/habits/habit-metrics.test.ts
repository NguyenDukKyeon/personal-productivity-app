import { describe, expect, it } from 'vitest';
import { createHabit } from './habit';
import { createHabitCheckIn } from './habit-check-in';
import { calculateHabitMetrics } from './habit-metrics';
import { createDailySchedule, createWeekdaySchedule } from './habit-schedule';

describe('habit-metrics domain calculation', () => {
  const daily = createDailySchedule();
  if (!daily.ok) throw new Error('Schedule error');

  const habit = createHabit({
    id: 'h1',
    title: 'Math',
    minimumVersion: '1 problem',
    schedule: daily.value,
  });
  if (!habit.ok) throw new Error('Habit error');

  it('calculates full, minimum, skipped, missed, and consistency rate accurately', () => {
    // 7-day window: 2026-08-25 to 2026-08-31 (7 days)
    const dateRange = [
      '2026-08-25',
      '2026-08-26',
      '2026-08-27',
      '2026-08-28',
      '2026-08-29',
      '2026-08-30',
      '2026-08-31',
    ];

    // Precede window with full on 2026-08-24 so 2026-08-25 is not a recovery
    // Window has: 2 full, 2 minimum, 1 skipped, 2 missed
    const checkIns = [
      createHabitCheckIn({ habitId: 'h1', date: '2026-08-24', kind: 'full' }),
      createHabitCheckIn({ habitId: 'h1', date: '2026-08-25', kind: 'full' }),
      createHabitCheckIn({ habitId: 'h1', date: '2026-08-26', kind: 'minimum' }),
      createHabitCheckIn({ habitId: 'h1', date: '2026-08-27', kind: 'full' }),
      createHabitCheckIn({ habitId: 'h1', date: '2026-08-28', kind: 'skipped' }),
      createHabitCheckIn({ habitId: 'h1', date: '2026-08-31', kind: 'minimum' }),
    ].map((r) => {
      if (!r.ok) throw new Error('Checkin error');
      return r.value;
    });

    const metrics = calculateHabitMetrics({
      habit: habit.value,
      dateKeys: dateRange,
      checkIns,
    });

    expect(metrics.scheduledDays).toBe(7);
    expect(metrics.fullCount).toBe(2);
    expect(metrics.minimumCount).toBe(2);
    expect(metrics.skippedCount).toBe(1);
    expect(metrics.missedCount).toBe(2); // 2026-08-29 and 2026-08-30 had no check-in
    // Consistency rate: (2 + 2) / 7 = 4 / 7 = 57%
    expect(metrics.consistencyRate).toBe(57);
    // On 2026-08-31, completed minimum immediately following missed 2026-08-30 -> 1 recovery completed
    expect(metrics.recoveriesCompleted).toBe(1);
  });

  it('respects non-daily schedules in metrics calculation', () => {
    // Weekdays Mon, Wed, Fri
    const mwf = createWeekdaySchedule([1, 3, 5]);
    if (!mwf.ok) throw new Error('Schedule error');

    const mwfHabit = createHabit({
      id: 'h2',
      title: 'Run',
      minimumVersion: '100m',
      schedule: mwf.value,
    });
    if (!mwfHabit.ok) throw new Error('Habit error');

    // Dates: Mon 2026-08-24 to Sun 2026-08-30
    // Scheduled days: Mon 24, Wed 26, Fri 28 (3 days)
    const dateRange = [
      '2026-08-24', // Mon (scheduled)
      '2026-08-25', // Tue
      '2026-08-26', // Wed (scheduled)
      '2026-08-27', // Thu
      '2026-08-28', // Fri (scheduled)
      '2026-08-29', // Sat
      '2026-08-30', // Sun
    ];

    const checkIns = [
      createHabitCheckIn({ habitId: 'h2', date: '2026-08-24', kind: 'full' }),
      createHabitCheckIn({ habitId: 'h2', date: '2026-08-26', kind: 'minimum' }),
    ].map((r) => {
      if (!r.ok) throw new Error('CheckIn error');
      return r.value;
    });

    const metrics = calculateHabitMetrics({
      habit: mwfHabit.value,
      dateKeys: dateRange,
      checkIns,
    });

    expect(metrics.scheduledDays).toBe(3);
    expect(metrics.fullCount).toBe(1);
    expect(metrics.minimumCount).toBe(1);
    expect(metrics.missedCount).toBe(1); // Fri 28 was missed
    expect(metrics.consistencyRate).toBe(67); // 2 / 3 = 67%
  });
});
