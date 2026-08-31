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

  it('rejects overlapping, unsorted, duplicate, and status-mismatched intervals', () => {
    const base: Habit = {
      id: 'h_life',
      title: 'Interval Habit',
      description: '',
      cue: '',
      minimumVersion: '1 min',
      schedule: { kind: 'daily' },
      scheduleRevisions: [{ effectiveFromDate: '2026-08-10', schedule: { kind: 'daily' } }],
      activeIntervals: [{ startDate: '2026-08-10', endDate: null }],
      status: 'active',
      createdAt: '2026-08-10T07:00:00.000Z',
      updatedAt: '2026-08-10T07:00:00.000Z',
    };

    expect(
      validateHabitPreWrite({
        ...base,
        activeIntervals: [
          { startDate: '2026-08-10', endDate: '2026-08-20' },
          { startDate: '2026-08-15', endDate: null },
        ],
      }).ok,
    ).toBe(false);

    expect(
      validateHabitPreWrite({
        ...base,
        activeIntervals: [
          { startDate: '2026-08-20', endDate: '2026-08-25' },
          { startDate: '2026-08-10', endDate: null },
        ],
      }).ok,
    ).toBe(false);

    expect(
      validateHabitPreWrite({
        ...base,
        activeIntervals: [
          { startDate: '2026-08-10', endDate: '2026-08-20' },
          { startDate: '2026-08-10', endDate: '2026-08-20' },
        ],
        status: 'archived',
      }).ok,
    ).toBe(false);

    expect(
      validateHabitPreWrite({
        ...base,
        status: 'archived',
        activeIntervals: [{ startDate: '2026-08-10', endDate: null }],
      }).ok,
    ).toBe(false);

    expect(
      validateHabitPreWrite({
        ...base,
        status: 'active',
        activeIntervals: [{ startDate: '2026-08-10', endDate: '2026-08-20' }],
      }).ok,
    ).toBe(false);

    expect(
      validateHabitPreWrite({
        ...base,
        activeIntervals: [{ startDate: '2026-08-01', endDate: null }],
      }).ok,
    ).toBe(false);

    expect(
      validateHabitPreWrite({
        ...base,
        status: 'archived',
        activeIntervals: [{ startDate: '2026-08-10', endDate: '2026-08-10' }],
      }).ok,
    ).toBe(false);
  });

  it('rejects schedule revisions that are unsorted, duplicated, early, or mismatched', () => {
    const base: Habit = {
      id: 'h_rev',
      title: 'Revision Habit',
      description: '',
      cue: '',
      minimumVersion: '1 min',
      schedule: { kind: 'daily' },
      scheduleRevisions: [{ effectiveFromDate: '2026-08-10', schedule: { kind: 'daily' } }],
      activeIntervals: [{ startDate: '2026-08-10', endDate: null }],
      status: 'active',
      createdAt: '2026-08-10T07:00:00.000Z',
      updatedAt: '2026-08-10T07:00:00.000Z',
    };

    expect(
      validateHabitPreWrite({
        ...base,
        scheduleRevisions: [
          { effectiveFromDate: '2026-08-20', schedule: { kind: 'daily' } },
          { effectiveFromDate: '2026-08-10', schedule: { kind: 'daily' } },
        ],
      }).ok,
    ).toBe(false);

    expect(
      validateHabitPreWrite({
        ...base,
        scheduleRevisions: [
          { effectiveFromDate: '2026-08-10', schedule: { kind: 'daily' } },
          { effectiveFromDate: '2026-08-10', schedule: { kind: 'weekdays', weekdays: [1] } },
        ],
      }).ok,
    ).toBe(false);

    expect(
      validateHabitPreWrite({
        ...base,
        scheduleRevisions: [{ effectiveFromDate: '2026-08-01', schedule: { kind: 'daily' } }],
      }).ok,
    ).toBe(false);

    expect(
      validateHabitPreWrite({
        ...base,
        schedule: { kind: 'weekdays', weekdays: [1, 3, 5] },
        scheduleRevisions: [{ effectiveFromDate: '2026-08-10', schedule: { kind: 'daily' } }],
      }).ok,
    ).toBe(false);

    expect(
      validateHabitPreWrite({
        ...base,
        scheduleRevisions: [
          { effectiveFromDate: '2026-08-10', schedule: { kind: 'weekdays', weekdays: [] } },
        ],
      }).ok,
    ).toBe(false);
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

  it('handles archive and unarchive lifecycle intervals with next-day archive semantics', () => {
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

    // Archive on 2026-08-20 takes effect from the NEXT local day
    const archivedRes = archiveHabit(habitRes.value, '2026-08-20T09:00:00.000Z');
    expect(archivedRes.ok).toBe(true);
    if (!archivedRes.ok) return;
    const archived = archivedRes.value;
    expect(archived.status).toBe('archived');
    expect(archived.activeIntervals).toEqual([
      { startDate: '2026-08-10', endDate: '2026-08-21' },
    ]);
    expect(isHabitActiveOnDate(archived, '2026-08-19')).toBe(true);
    expect(isHabitActiveOnDate(archived, '2026-08-20')).toBe(true);
    expect(isHabitActiveOnDate(archived, '2026-08-21')).toBe(false);
    expect(isHabitActiveOnDate(archived, '2026-08-25')).toBe(false);

    // Unarchive on 2026-08-28
    const unarchivedRes = unarchiveHabit(archived, '2026-08-28T10:00:00.000Z');
    expect(unarchivedRes.ok).toBe(true);
    if (!unarchivedRes.ok) return;
    const unarchived = unarchivedRes.value;
    expect(unarchived.status).toBe('active');
    expect(unarchived.activeIntervals).toEqual([
      { startDate: '2026-08-10', endDate: '2026-08-21' },
      { startDate: '2026-08-28', endDate: null },
    ]);
    expect(isHabitActiveOnDate(unarchived, '2026-08-25')).toBe(false); // during archive gap
    expect(isHabitActiveOnDate(unarchived, '2026-08-28')).toBe(true); // new active period
    expect(isHabitActiveOnDate(unarchived, '2026-08-31')).toBe(true);
  });

  it('rejects archive of an already archived habit and unarchive of an already active habit', () => {
    const habitRes = createHabit({
      id: 'h_trans',
      title: 'Transitions',
      minimumVersion: '1 min',
      schedule: defaultSchedule.value,
      nowIso: '2026-08-10T07:00:00.000Z',
    });
    if (!habitRes.ok) throw new Error('Create failed');

    const alreadyActive = unarchiveHabit(habitRes.value, '2026-08-11T07:00:00.000Z');
    expect(alreadyActive.ok).toBe(false);
    if (!alreadyActive.ok) {
      expect(alreadyActive.code).toBe('invalid_transition');
    }

    const archivedRes = archiveHabit(habitRes.value, '2026-08-20T09:00:00.000Z');
    expect(archivedRes.ok).toBe(true);
    if (!archivedRes.ok) return;

    const alreadyArchived = archiveHabit(archivedRes.value, '2026-08-21T09:00:00.000Z');
    expect(alreadyArchived.ok).toBe(false);
    if (!alreadyArchived.ok) {
      expect(alreadyArchived.code).toBe('invalid_transition');
    }
  });

  it('reopens the current interval when unarchiving on the same local day as archive', () => {
    const habitRes = createHabit({
      id: 'h_same',
      title: 'Same day unarchive',
      minimumVersion: '1 min',
      schedule: defaultSchedule.value,
      nowIso: '2026-08-10T07:00:00.000Z',
    });
    if (!habitRes.ok) throw new Error('Create failed');

    const archivedRes = archiveHabit(habitRes.value, '2026-08-20T09:00:00.000Z');
    expect(archivedRes.ok).toBe(true);
    if (!archivedRes.ok) return;

    const unarchivedRes = unarchiveHabit(archivedRes.value, '2026-08-20T18:00:00.000Z');
    expect(unarchivedRes.ok).toBe(true);
    if (!unarchivedRes.ok) return;
    expect(unarchivedRes.value.status).toBe('active');
    expect(unarchivedRes.value.activeIntervals).toEqual([
      { startDate: '2026-08-10', endDate: null },
    ]);
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
