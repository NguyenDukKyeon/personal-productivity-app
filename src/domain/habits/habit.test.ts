import { describe, expect, it } from 'vitest';
import {
  archiveHabit,
  createHabit,
  getEffectiveScheduleForDate,
  isHabitActiveOnDate,
  isHabitScheduledOnDate,
  unarchiveHabit,
  updateHabit,
  validateHabitPreWrite,
  type Habit,
} from './habit';
import { createDailySchedule } from './habit-schedule';

describe('habit domain entity', () => {
  const defaultSchedule = createDailySchedule();
  if (!defaultSchedule.ok) throw new Error('Schedule error');

  it('creates a valid active habit with lifecycle interval and initial schedule revision', () => {
    const res = createHabit({
      id: 'habit_123',
      title: '  Read English  ',
      description: '  Read 20 pages of fiction  ',
      cue: '  After breakfast  ',
      minimumVersion: '  Read 1 paragraph  ',
      schedule: defaultSchedule.value,
      nowIso: '2026-08-31T07:30:00.000Z',
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.value).toEqual({
      id: 'habit_123',
      title: 'Read English',
      description: 'Read 20 pages of fiction',
      cue: 'After breakfast',
      minimumVersion: 'Read 1 paragraph',
      schedule: { kind: 'daily' },
      scheduleRevisions: [
        {
          effectiveFromDate: '2026-08-31',
          schedule: { kind: 'daily' },
        },
      ],
      activeIntervals: [
        {
          startDate: '2026-08-31',
          endDate: null,
        },
      ],
      status: 'active',
      createdAt: '2026-08-31T07:30:00.000Z',
      updatedAt: '2026-08-31T07:30:00.000Z',
    });
  });

  it('rejects empty title, empty minimumVersion, or invalid pre-write fields', () => {
    expect(
      createHabit({
        id: 'h1',
        title: '   ',
        minimumVersion: 'Read 1 page',
        schedule: defaultSchedule.value,
      }).ok,
    ).toBe(false);

    expect(
      createHabit({
        id: 'h2',
        title: 'Exercise',
        minimumVersion: '   ',
        schedule: defaultSchedule.value,
      }).ok,
    ).toBe(false);

    const badHabit: Habit = {
      id: 'h3',
      title: 'Valid Title',
      description: '',
      cue: '',
      minimumVersion: '1 rep',
      schedule: { kind: 'daily' },
      scheduleRevisions: [],
      activeIntervals: [],
      status: 'active',
      createdAt: 'not-an-iso-date',
      updatedAt: '2026-08-31T07:00:00.000Z',
    };
    expect(validateHabitPreWrite(badHabit).ok).toBe(false);
  });

  it('records schedule revisions when schedule is updated on subsequent days', () => {
    const habitRes = createHabit({
      id: 'h1',
      title: 'Workout',
      minimumVersion: '5 pushups',
      schedule: { kind: 'weekdays', weekdays: [1, 3, 5] },
      nowIso: '2026-08-20T07:00:00.000Z',
    });
    if (!habitRes.ok) throw new Error('Create failed');

    const updated = updateHabit(
      habitRes.value,
      {
        schedule: { kind: 'daily' },
      },
      '2026-08-31T08:00:00.000Z',
    );
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;

    expect(updated.value.scheduleRevisions).toHaveLength(2);
    expect(updated.value.scheduleRevisions[0]).toEqual({
      effectiveFromDate: '2026-08-20',
      schedule: { kind: 'weekdays', weekdays: [1, 3, 5] },
    });
    expect(updated.value.scheduleRevisions[1]).toEqual({
      effectiveFromDate: '2026-08-31',
      schedule: { kind: 'daily' },
    });

    // Check effective schedule queries
    expect(getEffectiveScheduleForDate(updated.value, '2026-08-19')).toBe(null);
    expect(getEffectiveScheduleForDate(updated.value, '2026-08-25')).toEqual({
      kind: 'weekdays',
      weekdays: [1, 3, 5],
    });
    expect(getEffectiveScheduleForDate(updated.value, '2026-08-31')).toEqual({ kind: 'daily' });
    expect(getEffectiveScheduleForDate(updated.value, '2026-09-01')).toEqual({ kind: 'daily' });
  });

  it('handles archive and unarchive lifecycle intervals correctly', () => {
    const habitRes = createHabit({
      id: 'h1',
      title: 'Meditation',
      minimumVersion: '1 deep breath',
      schedule: defaultSchedule.value,
      nowIso: '2026-08-10T07:00:00.000Z',
    });
    if (!habitRes.ok) throw new Error('Create failed');

    // Active since 2026-08-10
    expect(isHabitActiveOnDate(habitRes.value, '2026-08-09')).toBe(false);
    expect(isHabitActiveOnDate(habitRes.value, '2026-08-10')).toBe(true);
    expect(isHabitActiveOnDate(habitRes.value, '2026-08-15')).toBe(true);

    // Archive on 2026-08-20
    const archived = archiveHabit(habitRes.value, '2026-08-20T09:00:00.000Z');
    expect(archived.status).toBe('archived');
    expect(archived.activeIntervals).toEqual([
      { startDate: '2026-08-10', endDate: '2026-08-20' },
    ]);
    expect(isHabitActiveOnDate(archived, '2026-08-19')).toBe(true);
    expect(isHabitActiveOnDate(archived, '2026-08-20')).toBe(false);
    expect(isHabitActiveOnDate(archived, '2026-08-25')).toBe(false);

    // Unarchive on 2026-08-28
    const unarchived = unarchiveHabit(archived, '2026-08-28T10:00:00.000Z');
    expect(unarchived.status).toBe('active');
    expect(unarchived.activeIntervals).toEqual([
      { startDate: '2026-08-10', endDate: '2026-08-20' },
      { startDate: '2026-08-28', endDate: null },
    ]);
    expect(isHabitActiveOnDate(unarchived, '2026-08-25')).toBe(false); // during archive gap
    expect(isHabitActiveOnDate(unarchived, '2026-08-28')).toBe(true); // new active period
    expect(isHabitActiveOnDate(unarchived, '2026-08-31')).toBe(true);
  });

  it('computes isHabitScheduledOnDate truthfully combining lifecycle and effective schedules', () => {
    // Mon/Wed/Fri habit created Aug 20, schedule changed to daily on Aug 31
    const h = createHabit({
      id: 'h_run',
      title: 'Run',
      minimumVersion: 'Put on running shoes',
      schedule: { kind: 'weekdays', weekdays: [1, 3, 5] },
      nowIso: '2026-08-20T07:00:00.000Z',
    });
    if (!h.ok) throw new Error('Create failed');

    const updated = updateHabit(
      h.value,
      { schedule: { kind: 'daily' } },
      '2026-08-31T07:00:00.000Z',
    );
    if (!updated.ok) throw new Error('Update failed');

    // 2026-08-19 (Wed before creation) -> false
    expect(isHabitScheduledOnDate(updated.value, '2026-08-19')).toBe(false);
    // 2026-08-21 (Friday, active under MWF) -> true
    expect(isHabitScheduledOnDate(updated.value, '2026-08-21')).toBe(true);
    // 2026-08-22 (Saturday under MWF) -> false
    expect(isHabitScheduledOnDate(updated.value, '2026-08-22')).toBe(false);
    // 2026-08-30 (Sunday before daily revision) -> false
    expect(isHabitScheduledOnDate(updated.value, '2026-08-30')).toBe(false);
    // 2026-08-31 (Monday under daily revision) -> true
    expect(isHabitScheduledOnDate(updated.value, '2026-08-31')).toBe(true);
    // 2026-09-01 (Tuesday under daily revision) -> true
    expect(isHabitScheduledOnDate(updated.value, '2026-09-01')).toBe(true);
  });
});
