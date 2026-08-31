import { describe, expect, it } from 'vitest';
import {
  addHabitToRoutine,
  createRoutine,
  removeHabitFromRoutine,
  reorderRoutineHabits,
  updateRoutine,
} from './routine';

describe('routine domain entity', () => {
  it('creates a routine with trimmed fields and unique habit order', () => {
    const res = createRoutine({
      id: 'routine_morning',
      name: '  Morning Routine  ',
      contextLabel: '  07:00 - Wakeup  ',
      habitIds: ['habit_1', 'habit_2', 'habit_1'],
      nowIso: '2026-08-31T07:00:00.000Z',
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.value).toEqual({
      id: 'routine_morning',
      name: 'Morning Routine',
      contextLabel: '07:00 - Wakeup',
      habitIds: ['habit_1', 'habit_2'],
      createdAt: '2026-08-31T07:00:00.000Z',
      updatedAt: '2026-08-31T07:00:00.000Z',
    });
  });

  it('rejects empty name or invalid id', () => {
    expect(
      createRoutine({
        id: ' ',
        name: 'Morning',
      }).ok,
    ).toBe(false);

    expect(
      createRoutine({
        id: 'r1',
        name: '   ',
      }).ok,
    ).toBe(false);
  });

  it('adds, removes, and reorders habit IDs within a routine', () => {
    const routineRes = createRoutine({
      id: 'r1',
      name: 'Night Routine',
      habitIds: ['h1', 'h2'],
      nowIso: '2026-08-31T07:00:00.000Z',
    });
    if (!routineRes.ok) throw new Error('Create failed');

    const withAdded = addHabitToRoutine(routineRes.value, 'h3', '2026-08-31T08:00:00.000Z');
    expect(withAdded.habitIds).toEqual(['h1', 'h2', 'h3']);

    // Adding existing habit does not duplicate
    const noDup = addHabitToRoutine(withAdded, 'h2', '2026-08-31T08:05:00.000Z');
    expect(noDup.habitIds).toEqual(['h1', 'h2', 'h3']);

    const reordered = reorderRoutineHabits(withAdded, ['h3', 'h1', 'h2'], '2026-08-31T08:10:00.000Z');
    expect(reordered.habitIds).toEqual(['h3', 'h1', 'h2']);

    const removed = removeHabitFromRoutine(reordered, 'h1', '2026-08-31T08:15:00.000Z');
    expect(removed.habitIds).toEqual(['h3', 'h2']);
  });

  it('updates name and contextLabel correctly', () => {
    const routineRes = createRoutine({
      id: 'r1',
      name: 'Afternoon Reset',
      nowIso: '2026-08-31T07:00:00.000Z',
    });
    if (!routineRes.ok) throw new Error('Create failed');

    const updated = updateRoutine(
      routineRes.value,
      { name: 'After School Reset', contextLabel: '16:30' },
      '2026-08-31T08:00:00.000Z',
    );

    expect(updated.ok).toBe(true);
    if (!updated.ok) return;

    expect(updated.value.name).toBe('After School Reset');
    expect(updated.value.contextLabel).toBe('16:30');
    expect(updated.value.updatedAt).toBe('2026-08-31T08:00:00.000Z');
  });
});
