import { describe, expect, it } from 'vitest';
import { createHabit } from './habit';
import { createHabitCheckIn } from './habit-check-in';
import { deriveHabitRecoveryState } from './habit-recovery';
import { createDailySchedule, createWeekdaySchedule } from './habit-schedule';

describe('habit-recovery domain logic', () => {
  const dailySchedule = createDailySchedule();
  if (!dailySchedule.ok) throw new Error('Daily schedule failed');

  const habit = createHabit({
    id: 'habit_1',
    title: 'Read English',
    minimumVersion: '1 paragraph',
    schedule: dailySchedule.value,
  });
  if (!habit.ok) throw new Error('Habit create failed');

  it('detects recovery mode when previous scheduled day had no check-in', () => {
    // Current date: 2026-08-31 (Monday)
    // Yesterday: 2026-08-30 (Sunday) -> Scheduled, but no check-in
    const checkIns = [
      createHabitCheckIn({
        habitId: 'habit_1',
        date: '2026-08-29',
        kind: 'full',
      }),
    ].map((r) => {
      if (!r.ok) throw new Error('CheckIn error');
      return r.value;
    });

    const recoveryState = deriveHabitRecoveryState({
      habit: habit.value,
      currentDateKey: '2026-08-31',
      checkIns,
      lookbackDays: 14,
    });

    expect(recoveryState.isRecovery).toBe(true);
    expect(recoveryState.lastScheduledDate).toBe('2026-08-30');
    expect(recoveryState.lastCheckIn).toBe(null);
  });

  it('detects no recovery when previous scheduled day was completed', () => {
    const checkIns = [
      createHabitCheckIn({
        habitId: 'habit_1',
        date: '2026-08-30',
        kind: 'minimum',
      }),
    ].map((r) => {
      if (!r.ok) throw new Error('CheckIn error');
      return r.value;
    });

    const recoveryState = deriveHabitRecoveryState({
      habit: habit.value,
      currentDateKey: '2026-08-31',
      checkIns,
      lookbackDays: 14,
    });

    expect(recoveryState.isRecovery).toBe(false);
    expect(recoveryState.lastScheduledDate).toBe('2026-08-30');
    expect(recoveryState.lastCheckIn?.kind).toBe('minimum');
  });

  it('respects weekday schedules when looking up previous scheduled opportunity', () => {
    // Habit scheduled on Mon (1), Wed (3), Fri (5)
    const mwf = createWeekdaySchedule([1, 3, 5]);
    if (!mwf.ok) throw new Error('Schedule error');

    const mwfHabit = createHabit({
      id: 'habit_gym',
      title: 'Gym',
      minimumVersion: '5 pushups',
      schedule: mwf.value,
    });
    if (!mwfHabit.ok) throw new Error('Habit error');

    // Current date: 2026-08-31 (Monday). Previous scheduled day was 2026-08-28 (Friday).
    // If Friday was completed, Monday is NOT in recovery.
    const checkIns = [
      createHabitCheckIn({
        habitId: 'habit_gym',
        date: '2026-08-28',
        kind: 'full',
      }),
    ].map((r) => {
      if (!r.ok) throw new Error('CheckIn error');
      return r.value;
    });

    const recoveryState = deriveHabitRecoveryState({
      habit: mwfHabit.value,
      currentDateKey: '2026-08-31',
      checkIns,
      lookbackDays: 14,
    });

    expect(recoveryState.isRecovery).toBe(false);
    expect(recoveryState.lastScheduledDate).toBe('2026-08-28');
  });
});
