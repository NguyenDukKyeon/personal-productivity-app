import { describe, expect, it } from 'vitest';
import { archiveHabit, createHabit, updateHabit } from './habit';
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

  it('6. TODAY IS PENDING, NOT MISSED: distinguishes pending today from missed past days without penalizing consistency rate at 08:00', () => {
    // Habit scheduled daily, created 2 days ago (Aug 29)
    const habit = createHabit({
      id: 'h_daily',
      title: 'Morning Water',
      minimumVersion: '1 glass',
      schedule: { kind: 'daily' },
      nowIso: '2026-08-29T07:00:00.000Z',
    });
    if (!habit.ok) throw new Error('Habit error');

    // Case A: Aug 29 done (Full), Aug 30 missed, Aug 31 (today) has no check-in yet
    const checkIns = [
      createHabitCheckIn({ habitId: 'h_daily', date: '2026-08-29', kind: 'full' }),
    ].map((r) => {
      if (!r.ok) throw new Error('CheckIn error');
      return r.value;
    });

    const dateKeys = ['2026-08-29', '2026-08-30', '2026-08-31'];

    const metricsBeforeTodayDone = calculateHabitMetrics({
      habit: habit.value,
      dateKeys,
      checkIns,
      currentDateKey: '2026-08-31',
    });

    // Scheduled days = 3 (Aug 29, 30, 31)
    expect(metricsBeforeTodayDone.scheduledDays).toBe(3);
    expect(metricsBeforeTodayDone.fullCount).toBe(1);
    expect(metricsBeforeTodayDone.missedCount).toBe(1); // Aug 30 is missed
    expect(metricsBeforeTodayDone.pendingCount).toBe(1); // Aug 31 is pending, NOT missed!
    // Consistency rate evaluated on completed historical denominator (Aug 29, 30): 1 full / 2 days = 50%
    // NOT penalized to 33% at 08:00!
    expect(metricsBeforeTodayDone.consistencyRate).toBe(50);

    // Case B: User completes today (Aug 31) with Full
    const todayCheckIn = createHabitCheckIn({ habitId: 'h_daily', date: '2026-08-31', kind: 'full' });
    if (!todayCheckIn.ok) throw new Error(todayCheckIn.message);
    const checkInsAfterToday = [
      ...checkIns,
      todayCheckIn.value,
    ];

    const metricsAfterTodayDone = calculateHabitMetrics({
      habit: habit.value,
      dateKeys,
      checkIns: checkInsAfterToday,
      currentDateKey: '2026-08-31',
    });

    expect(metricsAfterTodayDone.scheduledDays).toBe(3);
    expect(metricsAfterTodayDone.fullCount).toBe(2);
    expect(metricsAfterTodayDone.missedCount).toBe(1);
    expect(metricsAfterTodayDone.pendingCount).toBe(0);
    // Evaluated on 3 days: 2 full / 3 days = 67%
    expect(metricsAfterTodayDone.consistencyRate).toBe(67);
  });

  it('5. DEFINE SAME-DAY ARCHIVE TRUTH: habit scheduled today, checked in Full, archived later today retains scheduled opportunity and Full evidence in metrics', () => {
    // Habit created and active today (Aug 31)
    const habitRes = createHabit({
      id: 'h_temp',
      title: 'Temporary Goal',
      minimumVersion: '1 rep',
      schedule: { kind: 'daily' },
      nowIso: '2026-08-31T07:00:00.000Z',
    });
    if (!habitRes.ok) throw new Error('Create error');

    // User checks in Full earlier today
    const checkInRes = createHabitCheckIn({
      habitId: 'h_temp',
      date: '2026-08-31',
      kind: 'full',
    });
    if (!checkInRes.ok) throw new Error('Checkin error');

    // User archives the habit later today (e.g. 18:00)
    const archived = archiveHabit(habitRes.value, '2026-08-31T18:00:00.000Z');
    if (!archived.ok) throw new Error('Archive error');

    const metrics = calculateHabitMetrics({
      habit: archived.value,
      dateKeys: ['2026-08-31'],
      checkIns: [checkInRes.value],
      currentDateKey: '2026-08-31',
    });

    // Today's scheduled opportunity and Full check-in MUST be preserved in metrics!
    expect(metrics.scheduledDays).toBe(1);
    expect(metrics.fullCount).toBe(1);
    expect(metrics.missedCount).toBe(0);
    expect(metrics.pendingCount).toBe(0);
    expect(metrics.consistencyRate).toBe(100);
  });
});
