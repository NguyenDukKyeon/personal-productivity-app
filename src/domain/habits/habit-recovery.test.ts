import { describe, expect, it } from 'vitest';
import { archiveHabit, createHabit, unarchiveHabit, updateHabit } from './habit';
import { createHabitCheckIn } from './habit-check-in';
import { deriveHabitRecoveryState } from './habit-recovery';

describe('habit-recovery domain logic (lifecycle aware)', () => {
  it('A: Habit created today is NOT in recovery for yesterday', () => {
    // Habit created on Aug 31
    const habit = createHabit({
      id: 'h_today',
      title: 'Read English',
      minimumVersion: '1 paragraph',
      schedule: { kind: 'daily' },
      nowIso: '2026-08-31T07:00:00.000Z',
    });
    if (!habit.ok) throw new Error('Habit create failed');

    // No check-ins exist
    const recoveryState = deriveHabitRecoveryState({
      habit: habit.value,
      currentDateKey: '2026-08-31',
      checkIns: [],
      lookbackDays: 14,
    });

    // August 30 occurred before habit creation, so it was NOT a scheduled opportunity
    expect(recoveryState.isRecovery).toBe(false);
    expect(recoveryState.lastScheduledDate).toBe(null);
    expect(recoveryState.lastCheckIn).toBe(null);
  });

  it('B: Habit created earlier with missed scheduled occurrence is in recovery', () => {
    // Habit created on Aug 28
    const habit = createHabit({
      id: 'h_earlier',
      title: 'Read English',
      minimumVersion: '1 paragraph',
      schedule: { kind: 'daily' },
      nowIso: '2026-08-28T07:00:00.000Z',
    });
    if (!habit.ok) throw new Error('Habit create failed');

    // Check-in on Aug 29, but missed Aug 30
    const checkIns = [
      createHabitCheckIn({
        habitId: 'h_earlier',
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

  it('C: Changing schedule revision does not turn non-scheduled past days into misses', () => {
    // Habit was Mon/Wed/Fri starting Aug 20
    const habit = createHabit({
      id: 'h_mwf',
      title: 'Gym',
      minimumVersion: '5 pushups',
      schedule: { kind: 'weekdays', weekdays: [1, 3, 5] },
      nowIso: '2026-08-20T07:00:00.000Z',
    });
    if (!habit.ok) throw new Error('Habit error');

    // Friday Aug 28 was completed
    const checkIns = [
      createHabitCheckIn({
        habitId: 'h_mwf',
        date: '2026-08-28',
        kind: 'full',
      }),
    ].map((r) => {
      if (!r.ok) throw new Error('CheckIn error');
      return r.value;
    });

    // On Monday Aug 31, schedule is changed to Daily
    const updated = updateHabit(
      habit.value,
      { schedule: { kind: 'daily' } },
      '2026-08-31T07:00:00.000Z',
    );
    if (!updated.ok) throw new Error('Update error');

    const recoveryState = deriveHabitRecoveryState({
      habit: updated.value,
      currentDateKey: '2026-08-31',
      checkIns,
      lookbackDays: 14,
    });

    // Prior scheduled occurrence was Friday Aug 28 (completed).
    // Saturday Aug 29 and Sunday Aug 30 were NOT scheduled under the MWF revision effective then.
    expect(recoveryState.isRecovery).toBe(false);
    expect(recoveryState.lastScheduledDate).toBe('2026-08-28');
    expect(recoveryState.lastCheckIn?.kind).toBe('full');
  });

  it('D: Archived gap is not treated as missed scheduled opportunity', () => {
    // Habit created Aug 10, archived Aug 20, unarchived Aug 28
    const habit = createHabit({
      id: 'h_arch',
      title: 'Floss',
      minimumVersion: '1 tooth',
      schedule: { kind: 'daily' },
      nowIso: '2026-08-10T07:00:00.000Z',
    });
    if (!habit.ok) throw new Error('Habit error');

    const archivedRes = archiveHabit(habit.value, '2026-08-20T07:00:00.000Z');
    if (!archivedRes.ok) throw new Error('Archive failed');
    const unarchivedRes = unarchiveHabit(archivedRes.value, '2026-08-28T07:00:00.000Z');
    if (!unarchivedRes.ok) throw new Error('Unarchive failed');
    const unarchived = unarchivedRes.value;

    // Completed Aug 28 and Aug 29
    const checkIns = [
      createHabitCheckIn({
        habitId: 'h_arch',
        date: '2026-08-28',
        kind: 'full',
      }),
      createHabitCheckIn({
        habitId: 'h_arch',
        date: '2026-08-29',
        kind: 'minimum',
      }),
    ].map((r) => {
      if (!r.ok) throw new Error('CheckIn error');
      return r.value;
    });

    const recoveryState = deriveHabitRecoveryState({
      habit: unarchived,
      currentDateKey: '2026-08-30',
      checkIns,
      lookbackDays: 14,
    });

    expect(recoveryState.isRecovery).toBe(false);
    expect(recoveryState.lastScheduledDate).toBe('2026-08-29');
  });
});
