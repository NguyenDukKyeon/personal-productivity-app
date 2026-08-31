import { openDB } from 'idb';
import { describe, expect, it } from 'vitest';
import type { FocusSession } from '@/domain/focus/focus-session';
import type { Habit } from '@/domain/habits/habit';
import type { HabitCheckIn } from '@/domain/habits/habit-check-in';
import type { Routine } from '@/domain/habits/routine';
import type { WorkItem } from '@/domain/work-items/work-item';
import { GUEST_DB_VERSION } from './guest-db';
import { createGuestFocusRepository } from './guest-focus-repository';
import { createGuestHabitRepository } from './guest-habit-repository';
import { createGuestTodayRepository } from './guest-today-repository';

function dbName(): string {
  return `personal-productivity-habit-test-${crypto.randomUUID()}`;
}

const timestamp = '2026-08-31T08:00:00.000Z';

const habitSample: Habit = {
  id: 'h_math',
  title: 'Math Study',
  description: 'Calculus problems',
  cue: 'After lunch',
  minimumVersion: 'Solve 1 integral',
  schedule: { kind: 'weekdays', weekdays: [1, 3, 5] },
  routineId: 'r_study',
  status: 'active',
  createdAt: timestamp,
  updatedAt: timestamp,
};

const checkInSample: HabitCheckIn = {
  id: 'chk_h_math_2026-08-31',
  habitId: 'h_math',
  date: '2026-08-31',
  kind: 'minimum',
  note: 'Solved 1 problem',
  createdAt: timestamp,
  updatedAt: timestamp,
};

const routineSample: Routine = {
  id: 'r_study',
  name: 'Study Session Reset',
  contextLabel: '14:00',
  habitIds: ['h_math'],
  createdAt: timestamp,
  updatedAt: timestamp,
};

describe('guest-habit-repository', () => {
  it('persists and reloads a habit across instances', async () => {
    const name = dbName();
    const repo1 = await createGuestHabitRepository({ databaseName: name });
    expect(await repo1.saveHabit(habitSample)).toEqual({ ok: true, value: undefined });

    const repo2 = await createGuestHabitRepository({ databaseName: name });
    expect(await repo2.getHabit('h_math')).toEqual({ ok: true, value: habitSample });
    expect(await repo2.listHabits(false)).toEqual({ ok: true, value: [habitSample] });
  });

  it('filters out archived habits unless includeArchived is requested', async () => {
    const name = dbName();
    const repo = await createGuestHabitRepository({ databaseName: name });
    const archivedHabit: Habit = {
      ...habitSample,
      id: 'h_archived',
      status: 'archived',
    };

    await repo.saveHabit(habitSample);
    await repo.saveHabit(archivedHabit);

    const activeOnly = await repo.listHabits(false);
    expect(activeOnly.ok).toBe(true);
    if (activeOnly.ok) {
      expect(activeOnly.value.map((h) => h.id)).toEqual(['h_math']);
    }

    const all = await repo.listHabits(true);
    expect(all.ok).toBe(true);
    if (all.ok) {
      expect(all.value.map((h) => h.id).sort()).toEqual(['h_archived', 'h_math']);
    }
  });

  it('persists check-ins and enforces unique compound constraint per habit and date', async () => {
    const name = dbName();
    const repo = await createGuestHabitRepository({ databaseName: name });
    await repo.saveHabit(habitSample);

    expect(await repo.saveCheckIn(checkInSample)).toEqual({ ok: true, value: undefined });
    expect(await repo.getCheckIn('h_math', '2026-08-31')).toEqual({
      ok: true,
      value: checkInSample,
    });

    // Updating existing day's check-in
    const updatedCheckIn: HabitCheckIn = {
      ...checkInSample,
      kind: 'full',
      note: 'Did full session',
      updatedAt: '2026-08-31T09:00:00.000Z',
    };
    expect(await repo.saveCheckIn(updatedCheckIn)).toEqual({ ok: true, value: undefined });

    const reloaded = await repo.getCheckIn('h_math', '2026-08-31');
    expect(reloaded).toEqual({ ok: true, value: updatedCheckIn });

    const listForHabit = await repo.listCheckInsForHabit('h_math');
    expect(listForHabit.ok).toBe(true);
    if (listForHabit.ok) {
      expect(listForHabit.value.length).toBe(1);
    }
  });

  it('deletes a check-in cleanly', async () => {
    const name = dbName();
    const repo = await createGuestHabitRepository({ databaseName: name });
    await repo.saveCheckIn(checkInSample);
    expect(await repo.deleteCheckIn('h_math', '2026-08-31')).toEqual({
      ok: true,
      value: undefined,
    });
    expect(await repo.getCheckIn('h_math', '2026-08-31')).toEqual({
      ok: true,
      value: null,
    });
  });

  it('persists, lists, and deletes routines', async () => {
    const name = dbName();
    const repo = await createGuestHabitRepository({ databaseName: name });
    expect(await repo.saveRoutine(routineSample)).toEqual({ ok: true, value: undefined });

    const reloaded = await repo.getRoutine(routineSample.id);
    expect(reloaded).toEqual({ ok: true, value: routineSample });

    const routines = await repo.listRoutines();
    expect(routines.ok).toBe(true);
    if (routines.ok) {
      expect(routines.value).toEqual([routineSample]);
    }

    expect(await repo.deleteRoutine(routineSample.id)).toEqual({ ok: true, value: undefined });
    expect(await repo.getRoutine(routineSample.id)).toEqual({ ok: true, value: null });
  });

  it('preserves Phase 1 (today) and Phase 2 (focus) data when upgrading DB to v3', async () => {
    const name = dbName();
    // Simulate v2 DB
    const v2 = await openDB(name, 2, {
      upgrade(db) {
        db.createObjectStore('workItems', { keyPath: 'id' });
        db.createObjectStore('dailyPlans', { keyPath: 'id' });
        db.createObjectStore('dailyPriorities', { keyPath: 'id' });
        db.createObjectStore('timeBlocks', { keyPath: 'id' });
        db.createObjectStore('dailyCommitments', { keyPath: 'id' });
        db.createObjectStore('meta', { keyPath: 'key' });
        db.createObjectStore('focusSessions', { keyPath: 'id' });
        db.createObjectStore('distractions', { keyPath: 'id' });
      },
    });

    const sampleWorkItem: WorkItem = {
      id: 'w1',
      projectId: null,
      title: 'Algebra',
      notes: '',
      type: 'task',
      estimatedMinutes: 60,
      actualMinutes: 0,
      priority: 'p1_urgent',
      status: 'scheduled',
      completedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const sampleFocusSession: FocusSession = {
      id: 's1',
      workItemId: 'w1',
      timeBlockId: null,
      status: 'completed',
      mode: 'countdown',
      plannedDurationMinutes: 25,
      startedAt: timestamp,
      runningSince: null,
      endedAt: '2026-08-31T08:25:00.000Z',
      accumulatedFocusMs: 25 * 60_000,
      focusedDurationMs: 25 * 60_000,
      startLatencyMinutes: 0,
      note: 'Focus done',
      qualityRating: 5,
      createdAt: timestamp,
      updatedAt: '2026-08-31T08:25:00.000Z',
    };

    await v2.put('workItems', sampleWorkItem);
    await v2.put('focusSessions', sampleFocusSession);
    v2.close();

    // Now open via Phase 3 repository (triggers upgrade to v3)
    const habitRepo = await createGuestHabitRepository({ databaseName: name });
    const todayRepo = await createGuestTodayRepository({ databaseName: name });
    const focusRepo = await createGuestFocusRepository({ databaseName: name });

    expect(await todayRepo.getWorkItem('w1')).toEqual({ ok: true, value: sampleWorkItem });
    expect(await focusRepo.getSession('s1')).toEqual({ ok: true, value: sampleFocusSession });

    expect(await habitRepo.saveHabit(habitSample)).toEqual({ ok: true, value: undefined });
    expect(await habitRepo.getHabit('h_math')).toEqual({ ok: true, value: habitSample });
  });

  it('quarantines corrupt habit or check-in records without crashing list queries', async () => {
    const name = dbName();
    const repo = await createGuestHabitRepository({ databaseName: name });
    await repo.saveHabit(habitSample);

    // Write malformed row into habits store
    const rawDb = await openDB(name, GUEST_DB_VERSION);
    await rawDb.put('habits', { id: 'corrupt_habit', title: 12345 }); // invalid title type
    await rawDb.put('habitCheckIns', { id: 'corrupt_checkin', kind: 'invalid_kind' });
    rawDb.close();

    // List valid habits succeeds, skipping/isolating corrupt record
    const habitsRes = await repo.listHabits(true);
    expect(habitsRes.ok).toBe(true);
    if (habitsRes.ok) {
      expect(habitsRes.value).toEqual([habitSample]);
    }

    // Direct get of corrupt record returns corrupt_record error
    const corruptGet = await repo.getHabit('corrupt_habit');
    expect(corruptGet.ok).toBe(false);
    if (!corruptGet.ok) {
      expect(corruptGet.code).toBe('corrupt_record');
    }
  });
});
