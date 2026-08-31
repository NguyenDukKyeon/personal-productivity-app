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
    expect(reordered.ok).toBe(true);
    if (!reordered.ok) return;
    expect(reordered.value.habitIds).toEqual(['h3', 'h1', 'h2']);

    const removed = removeHabitFromRoutine(reordered.value, 'h1', '2026-08-31T08:15:00.000Z');
    expect(removed.habitIds).toEqual(['h3', 'h2']);
  });

  it('rejects reorder duplicates and membership-set changes', () => {
    const routineRes = createRoutine({
      id: 'r1',
      name: 'Night Routine',
      habitIds: ['h1', 'h2'],
      nowIso: '2026-08-31T07:00:00.000Z',
    });
    if (!routineRes.ok) throw new Error('Create failed');

    const dup = reorderRoutineHabits(routineRes.value, ['h1', 'h1']);
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.code).toBe('duplicate_habit_ids');

    const extra = reorderRoutineHabits(routineRes.value, ['h1', 'h2', 'h3']);
    expect(extra.ok).toBe(false);
    if (!extra.ok) expect(extra.code).toBe('invalid_reorder');
  });

  it('updates name and contextLabel without mutating membership', () => {
    const routineRes = createRoutine({
      id: 'r1',
      name: 'Afternoon Reset',
      habitIds: ['h1'],
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
    expect(updated.value.habitIds).toEqual(['h1']);
    expect(updated.value.updatedAt).toBe('2026-08-31T08:00:00.000Z');
  });
});
