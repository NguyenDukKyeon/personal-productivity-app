import { describe, expect, it } from 'vitest';
import {
  addHabitToRoutine,
  createRoutine,
  removeHabitFromRoutine,
  reorderRoutineHabits,
  updateRoutine,
  validateRoutinePreWrite,
  type Routine,
} from './routine';

describe('routine domain entity', () => {
  it('creates a routine with trimmed fields and empty habit list', () => {
    const res = createRoutine({
      id: 'routine_morning',
      name: '  Morning Routine  ',
      contextLabel: '  07:00 - Wakeup  ',
      nowIso: '2026-08-31T07:00:00.000Z',
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.value).toEqual({
      id: 'routine_morning',
      name: 'Morning Routine',
      contextLabel: '07:00 - Wakeup',
      habitIds: [],
      createdAt: '2026-08-31T07:00:00.000Z',
      updatedAt: '2026-08-31T07:00:00.000Z',
    });
  });

  it('rejects empty name or invalid pre-write properties', () => {
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

    const badRoutine: Routine = {
      id: 'r2',
      name: 'Valid Name',
      contextLabel: '',
      habitIds: ['h1', 'h1'], // duplicate
      createdAt: '2026-08-31T07:00:00.000Z',
      updatedAt: '2026-08-31T07:00:00.000Z',
    };
    expect(validateRoutinePreWrite(badRoutine).ok).toBe(false);
  });

  it('adds, removes, and strictly reorders habit IDs within a routine', () => {
    const routineRes = createRoutine({
      id: 'r1',
      name: 'Night Routine',
      nowIso: '2026-08-31T07:00:00.000Z',
    });
    if (!routineRes.ok) throw new Error('Create failed');

    const withAdded1 = addHabitToRoutine(routineRes.value, 'h1', '2026-08-31T07:10:00.000Z');
    const withAdded2 = addHabitToRoutine(withAdded1, 'h2', '2026-08-31T07:20:00.000Z');
    const withAdded3 = addHabitToRoutine(withAdded2, 'h3', '2026-08-31T08:00:00.000Z');
    expect(withAdded3.habitIds).toEqual(['h1', 'h2', 'h3']);

    // Adding existing habit does not duplicate
    const noDup = addHabitToRoutine(withAdded3, 'h2', '2026-08-31T08:05:00.000Z');
    expect(noDup.habitIds).toEqual(['h1', 'h2', 'h3']);

    // Reorder with exact set
    const reorderedRes = reorderRoutineHabits(withAdded3, ['h3', 'h1', 'h2'], '2026-08-31T08:10:00.000Z');
    expect(reorderedRes.ok).toBe(true);
    if (!reorderedRes.ok) throw new Error('Reorder failed');
    expect(reorderedRes.value.habitIds).toEqual(['h3', 'h1', 'h2']);

    // Reorder with duplicates is rejected
    const dupReorder = reorderRoutineHabits(withAdded3, ['h3', 'h3', 'h1'], '2026-08-31T08:10:00.000Z');
    expect(dupReorder.ok).toBe(false);

    // Reorder with unknown/extra or missing IDs is rejected
    const unknownReorder = reorderRoutineHabits(withAdded3, ['h3', 'h1', 'unknown'], '2026-08-31T08:10:00.000Z');
    expect(unknownReorder.ok).toBe(false);

    const removed = removeHabitFromRoutine(reorderedRes.value, 'h1', '2026-08-31T08:15:00.000Z');
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
