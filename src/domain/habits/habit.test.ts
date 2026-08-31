import { describe, expect, it } from 'vitest';
import {
  archiveHabit,
  createHabit,
  unarchiveHabit,
  updateHabit,
} from './habit';
import { createDailySchedule, createWeekdaySchedule } from './habit-schedule';

describe('habit domain entity', () => {
  const defaultSchedule = createDailySchedule();
  if (!defaultSchedule.ok) throw new Error('Schedule error');

  it('creates a valid active habit with trimmed strings', () => {
    const res = createHabit({
      id: 'habit_123',
      title: '  Read English  ',
      description: '  Read 20 pages of fiction  ',
      cue: '  After breakfast  ',
      minimumVersion: '  Read 1 paragraph  ',
      schedule: defaultSchedule.value,
      routineId: 'routine_morning',
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
      routineId: 'routine_morning',
      status: 'active',
      createdAt: '2026-08-31T07:30:00.000Z',
      updatedAt: '2026-08-31T07:30:00.000Z',
    });
  });

  it('rejects empty title or empty minimumVersion', () => {
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
  });

  it('updates title, cue, minimumVersion and schedule correctly', () => {
    const habitRes = createHabit({
      id: 'h1',
      title: 'Exercise',
      minimumVersion: '5 pushups',
      schedule: defaultSchedule.value,
      nowIso: '2026-08-31T07:00:00.000Z',
    });
    if (!habitRes.ok) throw new Error('Create failed');

    const weekdaySched = createWeekdaySchedule([1, 3, 5]);
    if (!weekdaySched.ok) throw new Error('Weekday schedule failed');

    const updated = updateHabit(
      habitRes.value,
      {
        title: 'Morning Yoga',
        minimumVersion: '1 sun salutation',
        cue: 'Right after waking up',
        schedule: weekdaySched.value,
      },
      '2026-08-31T08:00:00.000Z',
    );

    expect(updated.ok).toBe(true);
    if (!updated.ok) return;

    expect(updated.value.title).toBe('Morning Yoga');
    expect(updated.value.minimumVersion).toBe('1 sun salutation');
    expect(updated.value.cue).toBe('Right after waking up');
    expect(updated.value.schedule).toEqual({ kind: 'weekdays', weekdays: [1, 3, 5] });
    expect(updated.value.updatedAt).toBe('2026-08-31T08:00:00.000Z');
  });

  it('archives and unarchives while preserving id and history attributes', () => {
    const habitRes = createHabit({
      id: 'h1',
      title: 'Meditation',
      minimumVersion: '1 deep breath',
      schedule: defaultSchedule.value,
      nowIso: '2026-08-31T07:00:00.000Z',
    });
    if (!habitRes.ok) throw new Error('Create failed');

    const archived = archiveHabit(habitRes.value, '2026-08-31T09:00:00.000Z');
    expect(archived.status).toBe('archived');
    expect(archived.updatedAt).toBe('2026-08-31T09:00:00.000Z');

    const unarchived = unarchiveHabit(archived, '2026-08-31T10:00:00.000Z');
    expect(unarchived.status).toBe('active');
    expect(unarchived.updatedAt).toBe('2026-08-31T10:00:00.000Z');
  });
});
