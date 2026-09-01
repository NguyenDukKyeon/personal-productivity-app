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

  it('handles archive and unarchive lifecycle intervals correctly with next-day effective archive', () => {
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

    // Archive on 2026-08-20 (takes effect on 2026-08-21)
    const archiveRes = archiveHabit(habitRes.value, '2026-08-20T09:00:00.000Z');
    expect(archiveRes.ok).toBe(true);
    if (!archiveRes.ok) return;

    const archived = archiveRes.value;
    expect(archived.status).toBe('archived');
    expect(archived.activeIntervals).toEqual([
      { startDate: '2026-08-10', endDate: '2026-08-21' },
    ]);
    expect(isHabitActiveOnDate(archived, '2026-08-19')).toBe(true);
    expect(isHabitActiveOnDate(archived, '2026-08-20')).toBe(true); // Active on same day archived!
    expect(isHabitActiveOnDate(archived, '2026-08-21')).toBe(false); // Inactive next day
    expect(isHabitActiveOnDate(archived, '2026-08-25')).toBe(false);

    // Archiving an already archived habit returns invalid_transition
    const reArchiveRes = archiveHabit(archived, '2026-08-22T09:00:00.000Z');
    expect(reArchiveRes.ok).toBe(false);
    if (!reArchiveRes.ok) {
      expect(reArchiveRes.code).toBe('invalid_transition');
    }

    // Unarchive on 2026-08-28
    const unarchiveRes = unarchiveHabit(archived, '2026-08-28T10:00:00.000Z');
    expect(unarchiveRes.ok).toBe(true);
    if (!unarchiveRes.ok) return;

    const unarchived = unarchiveRes.value;
    expect(unarchived.status).toBe('active');
    expect(unarchived.activeIntervals).toEqual([
      { startDate: '2026-08-10', endDate: '2026-08-21' },
      { startDate: '2026-08-28', endDate: null },
    ]);
    expect(isHabitActiveOnDate(unarchived, '2026-08-25')).toBe(false); // during archive gap
    expect(isHabitActiveOnDate(unarchived, '2026-08-28')).toBe(true); // new active period
    expect(isHabitActiveOnDate(unarchived, '2026-08-31')).toBe(true);

    // Unarchiving an already active habit returns invalid_transition
    const reUnarchiveRes = unarchiveHabit(unarchived, '2026-08-29T10:00:00.000Z');
    expect(reUnarchiveRes.ok).toBe(false);
    if (!reUnarchiveRes.ok) {
      expect(reUnarchiveRes.code).toBe('invalid_transition');
    }
  });

  it('validates comprehensive relational invariants across status, activeIntervals, revisions, schedule, and createdAt', () => {
    const validHabit: Habit = {
      id: 'h_test',
      title: 'Valid Habit',
      description: 'Desc',
      cue: 'Cue',
      minimumVersion: 'Min',
      schedule: { kind: 'daily' },
      scheduleRevisions: [{ effectiveFromDate: '2026-08-15', schedule: { kind: 'daily' } }],
      activeIntervals: [{ startDate: '2026-08-15', endDate: null }],
      status: 'active',
      createdAt: '2026-08-15T08:00:00.000Z',
      updatedAt: '2026-08-15T08:00:00.000Z',
    };

    // 1. Valid habit passes
    expect(validateHabitPreWrite(validHabit).ok).toBe(true);

    // 2. Active status with no open interval -> invalid
    expect(
      validateHabitPreWrite({
        ...validHabit,
        status: 'active',
        activeIntervals: [{ startDate: '2026-08-15', endDate: '2026-08-20' }],
      }).ok,
    ).toBe(false);

    // 3. Archived status with an open interval -> invalid
    expect(
      validateHabitPreWrite({
        ...validHabit,
        status: 'archived',
        activeIntervals: [{ startDate: '2026-08-15', endDate: null }],
      }).ok,
    ).toBe(false);

    // 4. Interval start preceding habit createdAt local date -> invalid
    expect(
      validateHabitPreWrite({
        ...validHabit,
        activeIntervals: [{ startDate: '2026-08-10', endDate: null }],
      }).ok,
    ).toBe(false);

    // 5. Closed interval with endDate <= startDate -> invalid
    expect(
      validateHabitPreWrite({
        ...validHabit,
        status: 'archived',
        activeIntervals: [{ startDate: '2026-08-15', endDate: '2026-08-15' }],
      }).ok,
    ).toBe(false);

    // 6. Overlapping intervals -> invalid
    expect(
      validateHabitPreWrite({
        ...validHabit,
        activeIntervals: [
          { startDate: '2026-08-15', endDate: '2026-08-20' },
          { startDate: '2026-08-18', endDate: null },
        ],
      }).ok,
    ).toBe(false);

    // 7. Schedule revision preceding createdAt local date -> invalid
    expect(
      validateHabitPreWrite({
        ...validHabit,
        scheduleRevisions: [{ effectiveFromDate: '2026-08-10', schedule: { kind: 'daily' } }],
      }).ok,
    ).toBe(false);

    // 8. Latest schedule revision mismatch with habit.schedule -> invalid
    expect(
      validateHabitPreWrite({
        ...validHabit,
        schedule: { kind: 'weekdays', weekdays: [1, 2] },
        scheduleRevisions: [{ effectiveFromDate: '2026-08-15', schedule: { kind: 'daily' } }],
      }).ok,
    ).toBe(false);

    // 9. Non-chronological schedule revisions -> invalid
    expect(
      validateHabitPreWrite({
        ...validHabit,
        scheduleRevisions: [
          { effectiveFromDate: '2026-08-20', schedule: { kind: 'weekdays', weekdays: [1, 2] } },
          { effectiveFromDate: '2026-08-15', schedule: { kind: 'daily' } },
        ],
      }).ok,
    ).toBe(false);
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
