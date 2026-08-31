import { describe, expect, it } from 'vitest';
import {
  createHabitCheckIn,
  generateCheckInId,
  updateHabitCheckIn,
} from './habit-check-in';

describe('habit-check-in domain entity', () => {
  it('creates a full check-in with canonical deterministic ID', () => {
    const res = createHabitCheckIn({
      habitId: 'habit_math',
      date: '2026-08-31',
      kind: 'full',
      note: 'Solved 10 problems',
      nowIso: '2026-08-31T08:00:00.000Z',
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.value).toEqual({
      id: generateCheckInId('habit_math', '2026-08-31'),
      habitId: 'habit_math',
      date: '2026-08-31',
      kind: 'full',
      note: 'Solved 10 problems',
      createdAt: '2026-08-31T08:00:00.000Z',
      updatedAt: '2026-08-31T08:00:00.000Z',
    });
  });

  it('creates minimum and skipped check-ins accurately', () => {
    const minRes = createHabitCheckIn({
      habitId: 'habit_math',
      date: '2026-08-31',
      kind: 'minimum',
    });
    expect(minRes.ok).toBe(true);
    if (minRes.ok) {
      expect(minRes.value.kind).toBe('minimum');
      expect(minRes.value.note).toBe('');
    }

    const skipRes = createHabitCheckIn({
      habitId: 'habit_math',
      date: '2026-08-31',
      kind: 'skipped',
      note: 'Sick today',
    });
    expect(skipRes.ok).toBe(true);
    if (skipRes.ok) {
      expect(skipRes.value.kind).toBe('skipped');
      expect(skipRes.value.note).toBe('Sick today');
    }
  });

  it('rejects invalid dates or empty habit IDs', () => {
    expect(
      createHabitCheckIn({
        habitId: ' ',
        date: '2026-08-31',
        kind: 'full',
      }).ok,
    ).toBe(false);

    expect(
      createHabitCheckIn({
        habitId: 'habit_1',
        date: '2026-02-30', // Invalid calendar date
        kind: 'full',
      }).ok,
    ).toBe(false);

    expect(
      createHabitCheckIn({
        habitId: 'habit_1',
        date: 'not-a-date',
        kind: 'full',
      }).ok,
    ).toBe(false);
  });

  it('updates an existing check-in kind and note', () => {
    const initial = createHabitCheckIn({
      habitId: 'h1',
      date: '2026-08-31',
      kind: 'minimum',
      nowIso: '2026-08-31T08:00:00.000Z',
    });
    if (!initial.ok) throw new Error('Create failed');

    const updated = updateHabitCheckIn(
      initial.value,
      { kind: 'full', note: 'Managed to finish full session after all' },
      '2026-08-31T10:00:00.000Z',
    );

    expect(updated.ok).toBe(true);
    if (!updated.ok) return;

    expect(updated.value.kind).toBe('full');
    expect(updated.value.note).toBe('Managed to finish full session after all');
    expect(updated.value.createdAt).toBe('2026-08-31T08:00:00.000Z');
    expect(updated.value.updatedAt).toBe('2026-08-31T10:00:00.000Z');
  });
});
