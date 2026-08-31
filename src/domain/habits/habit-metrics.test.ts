import { describe, expect, it } from 'vitest';
import { createHabit, updateHabit } from './habit';
import { createHabitCheckIn } from './habit-check-in';
import { calculateHabitMetrics } from './habit-metrics';

describe('habit-metrics domain logic (lifecycle aware)', () => {
  it('E: 14-day metrics denominator includes only dates when habit existed and was active', () => {
    // Habit created today (2026-08-31)
    const habit = createHabit({
      id: 'h_read',
      title: 'Read English',
      minimumVersion: '1 paragraph',
      schedule: { kind: 'daily' },
      nowIso: '2026-08-31T07:00:00.000Z',
    });
    if (!habit.ok) throw new Error('Habit create failed');

    // 14-day window: 2026-08-18 to 2026-08-31
    const past14Days = [
      '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21', '2026-08-22',
      '2026-08-23', '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27',
      '2026-08-28', '2026-08-29', '2026-08-30', '2026-08-31',
    ];

    const checkIns = [
      createHabitCheckIn({
        habitId: 'h_read',
        date: '2026-08-31',
        kind: 'minimum',
      }),
    ].map((r) => {
      if (!r.ok) throw new Error('CheckIn error');
      return r.value;
    });

    const metrics = calculateHabitMetrics({
      habit: habit.value,
      dateKeys: past14Days,
      checkIns,
    });

    // Scheduled days should be ONLY 1 (Aug 31), not 14!
    expect(metrics.scheduledDays).toBe(1);
    expect(metrics.minimumCount).toBe(1);
    expect(metrics.fullCount).toBe(0);
    expect(metrics.missedCount).toBe(0);
    expect(metrics.consistencyRate).toBe(100);
    expect(metrics.recoveriesCompleted).toBe(0);
  });

  it('calculates metrics truthfully across schedule revisions and archive gaps', () => {
    // Habit created Aug 20 (MWF: Aug 21 Fri, Aug 24 Mon, Aug 26 Wed, Aug 28 Fri = 4 days)
    const habit = createHabit({
      id: 'h_run',
      title: 'Run',
      minimumVersion: '1 km',
      schedule: { kind: 'weekdays', weekdays: [1, 3, 5] },
      nowIso: '2026-08-20T07:00:00.000Z',
    });
    if (!habit.ok) throw new Error('Habit error');

    // On Aug 29, change to Daily (Aug 29 Sat, Aug 30 Sun, Aug 31 Mon = 3 days)
    const updated = updateHabit(
      habit.value,
      { schedule: { kind: 'daily' } },
      '2026-08-29T07:00:00.000Z',
    );
    if (!updated.ok) throw new Error('Update error');

    const dateKeys = [
      '2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23', '2026-08-24',
      '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29',
      '2026-08-30', '2026-08-31',
    ];

    // Check-ins for Aug 21 (Full), Aug 24 (Min), Aug 28 (Full), Aug 31 (Full)
    const checkIns = [
      createHabitCheckIn({ habitId: 'h_run', date: '2026-08-21', kind: 'full' }),
      createHabitCheckIn({ habitId: 'h_run', date: '2026-08-24', kind: 'minimum' }),
      createHabitCheckIn({ habitId: 'h_run', date: '2026-08-28', kind: 'full' }),
      createHabitCheckIn({ habitId: 'h_run', date: '2026-08-31', kind: 'full' }),
    ].map((r) => {
      if (!r.ok) throw new Error('CheckIn error');
      return r.value;
    });

    const metrics = calculateHabitMetrics({
      habit: updated.value,
      dateKeys,
      checkIns,
    });

    // Scheduled days:
    // MWF period (Aug 20..28): Aug 21 (Fri), Aug 24 (Mon), Aug 26 (Wed), Aug 28 (Fri) -> 4 days
    // Daily period (Aug 29..31): Aug 29 (Sat), Aug 30 (Sun), Aug 31 (Mon) -> 3 days
    // Total scheduled = 7 days
    // Completed = 4 (Aug 21, 24, 28, 31)
    // Missed = 3 (Aug 26, Aug 29, Aug 30)
    expect(metrics.scheduledDays).toBe(7);
    expect(metrics.fullCount).toBe(3);
    expect(metrics.minimumCount).toBe(1);
    expect(metrics.missedCount).toBe(3);
    expect(metrics.consistencyRate).toBe(Math.round((4 / 7) * 100)); // 57%
  });
});
