import { openDB } from 'idb';
import { describe, expect, it } from 'vitest';
import type { DailyCommitmentSnapshot } from '@/domain/commitments/commitment';
import type { DailyPlan, DailyPriority } from '@/domain/daily-plans/daily-plan';
import type { Distraction } from '@/domain/focus/distraction';
import type { FocusSession } from '@/domain/focus/focus-session';
import type { Habit } from '@/domain/habits/habit';
import type { HabitCheckIn } from '@/domain/habits/habit-check-in';
import type { Routine } from '@/domain/habits/routine';
import type { TimeBlock } from '@/domain/time-blocks/time-block';
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
  scheduleRevisions: [
    {
      effectiveFromDate: '2026-08-31',
      schedule: { kind: 'weekdays', weekdays: [1, 3, 5] },
    },
  ],
  activeIntervals: [
    {
      startDate: '2026-08-31',
      endDate: null,
    },
  ],
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
      createdAt: '2026-08-01T08:00:00.000Z',
      updatedAt: '2026-08-20T08:00:00.000Z',
      scheduleRevisions: [
        {
          effectiveFromDate: '2026-08-01',
          schedule: { kind: 'weekdays', weekdays: [1, 3, 5] },
        },
      ],
      activeIntervals: [{ startDate: '2026-08-01', endDate: '2026-08-20' }],
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

  it('preserves original createdAt when updating same-day check-in', async () => {
    const name = dbName();
    const repo = await createGuestHabitRepository({ databaseName: name });
    await repo.saveHabit(habitSample);

    const firstCreatedAt = '2026-08-31T08:00:00.000Z';
    const firstCheckIn: HabitCheckIn = {
      id: 'chk_h_math_2026-08-31',
      habitId: 'h_math',
      date: '2026-08-31',
      kind: 'minimum',
      note: 'Minimum done',
      createdAt: firstCreatedAt,
      updatedAt: firstCreatedAt,
    };
    await repo.saveCheckIn(firstCheckIn);

    // Later correction to Full
    const correctedCheckIn: HabitCheckIn = {
      id: 'chk_h_math_2026-08-31',
      habitId: 'h_math',
      date: '2026-08-31',
      kind: 'full',
      note: 'Upgraded to full study',
      createdAt: '2026-08-31T10:00:00.000Z',
      updatedAt: '2026-08-31T10:00:00.000Z',
    };
    await repo.saveCheckIn(correctedCheckIn);

    const reloaded = await repo.getCheckIn('h_math', '2026-08-31');
    expect(reloaded.ok).toBe(true);
    if (reloaded.ok && reloaded.value) {
      expect(reloaded.value.kind).toBe('full');
      expect(reloaded.value.note).toBe('Upgraded to full study');
      expect(reloaded.value.createdAt).toBe(firstCreatedAt); // Audit timestamp PRESERVED
      expect(reloaded.value.updatedAt).toBe('2026-08-31T10:00:00.000Z');
    }

    const list = await repo.listCheckInsForHabit('h_math');
    expect(list.ok).toBe(true);
    if (list.ok) {
      expect(list.value).toHaveLength(1);
    }
  });

  it('rejects concurrent duplicate check-in creation ensuring only one record survives', async () => {
    const name = dbName();
    const repo = await createGuestHabitRepository({ databaseName: name });
    await repo.saveHabit(habitSample);

    const c1: HabitCheckIn = {
      id: 'chk_h_math_2026-08-31',
      habitId: 'h_math',
      date: '2026-08-31',
      kind: 'minimum',
      note: 'Call 1',
      createdAt: '2026-08-31T08:00:00.000Z',
      updatedAt: '2026-08-31T08:00:00.000Z',
    };
    const c2: HabitCheckIn = {
      id: 'chk_h_math_2026-08-31',
      habitId: 'h_math',
      date: '2026-08-31',
      kind: 'full',
      note: 'Call 2',
      createdAt: '2026-08-31T08:01:00.000Z',
      updatedAt: '2026-08-31T08:01:00.000Z',
    };

    await Promise.all([repo.saveCheckIn(c1), repo.saveCheckIn(c2)]);

    const allCheckIns = await repo.listCheckInsForDate('2026-08-31');
    expect(allCheckIns.ok).toBe(true);
    if (allCheckIns.ok) {
      expect(allCheckIns.value).toHaveLength(1);
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

  it('atomically assigns, moves, removes, and reorders habit routine membership', async () => {
    const name = dbName();
    const repo = await createGuestHabitRepository({ databaseName: name });

    const h1 = { ...habitSample, id: 'h1' };
    const h2 = { ...habitSample, id: 'h2' };
    await repo.saveHabit(h1);
    await repo.saveHabit(h2);

    const rMorning: Routine = {
      id: 'r_morning',
      name: 'Morning Routine',
      contextLabel: '07:00',
      habitIds: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const rEvening: Routine = {
      id: 'r_evening',
      name: 'Evening Routine',
      contextLabel: '21:00',
      habitIds: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await repo.saveRoutine(rMorning);
    await repo.saveRoutine(rEvening);

    // Assign h1 and h2 to rMorning
    expect((await repo.assignHabitToRoutine('h1', 'r_morning')).ok).toBe(true);
    expect((await repo.assignHabitToRoutine('h2', 'r_morning')).ok).toBe(true);

    let morning = await repo.getRoutine('r_morning');
    expect(morning.ok).toBe(true);
    if (morning.ok && morning.value) {
      expect(morning.value.habitIds).toEqual(['h1', 'h2']);
    }

    // Reorder rMorning to ['h2', 'h1']
    expect((await repo.reorderRoutineHabits('r_morning', ['h2', 'h1'])).ok).toBe(true);
    morning = await repo.getRoutine('r_morning');
    expect(morning.ok).toBe(true);
    if (morning.ok && morning.value) {
      expect(morning.value.habitIds).toEqual(['h2', 'h1']);
    }

    // Move h1 from rMorning to rEvening
    expect((await repo.assignHabitToRoutine('h1', 'r_evening')).ok).toBe(true);

    morning = await repo.getRoutine('r_morning');
    const evening = await repo.getRoutine('r_evening');
    expect(morning.ok && morning.value?.habitIds).toEqual(['h2']);
    expect(evening.ok && evening.value?.habitIds).toEqual(['h1']);

    // Remove h2 from all routines
    expect((await repo.removeHabitFromRoutine('h2')).ok).toBe(true);
    morning = await repo.getRoutine('r_morning');
    expect(morning.ok && morning.value?.habitIds).toEqual([]);

    // Reject unknown habit or routine
    expect((await repo.assignHabitToRoutine('non_existent', 'r_evening')).ok).toBe(false);
    expect((await repo.assignHabitToRoutine('h1', 'non_existent')).ok).toBe(false);
  });

  it('1. NEVER SILENTLY OMITS CORRUPT HABIT EVIDENCE: returns corrupt_record and leaves raw bytes untouched', async () => {
    const name = dbName();
    const repo = await createGuestHabitRepository({ databaseName: name });
    await repo.saveHabit(habitSample);

    // Insert 1 corrupt habit row into raw IndexedDB
    const rawDb = await openDB(name, GUEST_DB_VERSION);
    await rawDb.put('habits', { id: 'corrupt_habit', title: 9999 }); // corrupt: number instead of string
    await rawDb.put('habitCheckIns', { id: 'corrupt_checkin', date: 'not-a-date' });
    await rawDb.put('routines', { id: 'corrupt_routine', name: 12345 });
    rawDb.close();

    // All canonical list methods MUST return err('corrupt_record')
    const habitsRes = await repo.listHabits(true);
    expect(habitsRes.ok).toBe(false);
    if (!habitsRes.ok) {
      expect(habitsRes.code).toBe('corrupt_record');
    }

    const checkInsRes = await repo.listCheckInsInRange('2026-08-01', '2026-08-31');
    expect(checkInsRes.ok).toBe(false);
    if (!checkInsRes.ok) {
      expect(checkInsRes.code).toBe('corrupt_record');
    }

    const routinesRes = await repo.listRoutines();
    expect(routinesRes.ok).toBe(false);
    if (!routinesRes.ok) {
      expect(routinesRes.code).toBe('corrupt_record');
    }

    // Verify raw corrupt rows remain completely UNTOUCHED in IndexedDB
    const verifyRawDb = await openDB(name, GUEST_DB_VERSION);
    const rawHabit = await verifyRawDb.get('habits', 'corrupt_habit');
    expect(rawHabit).toEqual({ id: 'corrupt_habit', title: 9999 });
    const rawCheckIn = await verifyRawDb.get('habitCheckIns', 'corrupt_checkin');
    expect(rawCheckIn).toEqual({ id: 'corrupt_checkin', date: 'not-a-date' });
    verifyRawDb.close();
  });

  it('8. STRENGTHEN DB v2 -> v3 MIGRATION: seeds Phase 1 & 2 records and asserts 100% semantic survival', async () => {
    const name = dbName();
    // Simulate v2 DB with all Phase 1 and Phase 2 stores
    const v2 = await openDB(name, 2, {
      upgrade(db) {
        db.createObjectStore('workItems', { keyPath: 'id' });
        const dpStore = db.createObjectStore('dailyPlans', { keyPath: 'id' });
        dpStore.createIndex('date', 'date', { unique: true });
        const dprStore = db.createObjectStore('dailyPriorities', { keyPath: 'id' });
        dprStore.createIndex('dailyPlanId', 'dailyPlanId');
        const tbStore = db.createObjectStore('timeBlocks', { keyPath: 'id' });
        tbStore.createIndex('date', 'date');
        tbStore.createIndex('workItemId', 'workItemId');
        const dcStore = db.createObjectStore('dailyCommitments', { keyPath: 'id' });
        dcStore.createIndex('date', 'date', { unique: true });
        db.createObjectStore('meta', { keyPath: 'key' });
        const fsStore = db.createObjectStore('focusSessions', { keyPath: 'id' });
        fsStore.createIndex('workItemId', 'workItemId');
        fsStore.createIndex('status', 'status');
        const dStore = db.createObjectStore('distractions', { keyPath: 'id' });
        dStore.createIndex('focusSessionId', 'focusSessionId');
      },
    });

    // Seed representative Phase 1 records
    const sampleWorkItem: WorkItem = {
      id: 'w1',
      projectId: null,
      title: 'Algebra homework',
      notes: 'Chapter 4',
      type: 'task',
      estimatedMinutes: 60,
      actualMinutes: 45,
      priority: 'p1_urgent',
      status: 'scheduled',
      completedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const sampleDailyPlan: DailyPlan = {
      id: 'dp1',
      date: '2026-08-31',
      capacityMinutes: 240,
      morningIntention: 'Finish homework early',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const samplePriorities: DailyPriority[] = [
      {
        id: 'dpr1',
        dailyPlanId: 'dp1',
        workItemId: 'w1',
        rank: 1,
      },
    ];
    const sampleTimeBlock: TimeBlock = {
      id: 'tb1',
      date: '2026-08-31',
      workItemId: 'w1',
      habitId: null,
      startMinute: 540,
      endMinute: 600,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const sampleCommitment: DailyCommitmentSnapshot = {
      id: 'dc1',
      date: '2026-08-31',
      committedAt: timestamp,
      capacityMinutes: 240,
      priorityWorkItemIds: ['w1'],
      timeBlocks: [
        {
          workItemId: 'w1',
          startMinute: 540,
          endMinute: 600,
        },
      ],
    };

    // Seed representative Phase 2 records
    const sampleFocusSession: FocusSession = {
      id: 's1',
      workItemId: 'w1',
      timeBlockId: 'tb1',
      status: 'completed',
      mode: 'countdown',
      plannedDurationMinutes: 25,
      startedAt: timestamp,
      runningSince: null,
      endedAt: '2026-08-31T08:25:00.000Z',
      accumulatedFocusMs: 25 * 60_000,
      focusedDurationMs: 25 * 60_000,
      startLatencyMinutes: 0,
      note: 'Focus complete',
      qualityRating: 5,
      createdAt: timestamp,
      updatedAt: '2026-08-31T08:25:00.000Z',
    };
    const sampleDistraction: Distraction = {
      id: 'dist1',
      focusSessionId: 's1',
      text: 'Slack notification',
      capturedAt: '2026-08-31T08:10:00.000Z',
    };

    await v2.put('workItems', sampleWorkItem);
    await v2.put('dailyPlans', sampleDailyPlan);
    for (const p of samplePriorities) {
      await v2.put('dailyPriorities', p);
    }
    await v2.put('timeBlocks', sampleTimeBlock);
    await v2.put('dailyCommitments', sampleCommitment);
    await v2.put('focusSessions', sampleFocusSession);
    await v2.put('distractions', sampleDistraction);
    v2.close();

    // Trigger upgrade to v3 by initializing Phase 3 repository
    const habitRepo = await createGuestHabitRepository({ databaseName: name });
    const todayRepo = await createGuestTodayRepository({ databaseName: name });
    const focusRepo = await createGuestFocusRepository({ databaseName: name });

    // Assert Phase 1 records survive 100%
    expect(await todayRepo.getWorkItem('w1')).toEqual({ ok: true, value: sampleWorkItem });
    expect(await todayRepo.getDailyPlan('2026-08-31')).toEqual({ ok: true, value: sampleDailyPlan });
    expect(await todayRepo.listPriorities('dp1')).toEqual({ ok: true, value: samplePriorities });
    expect(await todayRepo.listTimeBlocks('2026-08-31')).toEqual({ ok: true, value: [sampleTimeBlock] });
    expect(await todayRepo.getCommitment('2026-08-31')).toEqual({ ok: true, value: sampleCommitment });

    // Assert Phase 2 records survive 100%
    expect(await focusRepo.getSession('s1')).toEqual({ ok: true, value: sampleFocusSession });
    expect(await focusRepo.listDistractions('s1')).toEqual({ ok: true, value: [sampleDistraction] });

    // Assert new v3 stores function properly
    expect(await habitRepo.saveHabit(habitSample)).toEqual({ ok: true, value: undefined });
    expect(await habitRepo.getHabit('h_math')).toEqual({ ok: true, value: habitSample });
    const emptyRoutine = { ...routineSample, habitIds: [] };
    expect(await habitRepo.saveRoutine(emptyRoutine)).toEqual({ ok: true, value: undefined });
    expect(await habitRepo.assignHabitToRoutine('h_math', 'r_study')).toEqual({
      ok: true,
      value: undefined,
    });
    const storedRoutine = await habitRepo.getRoutine('r_study');
    expect(storedRoutine.ok).toBe(true);
    if (storedRoutine.ok) {
      expect(storedRoutine.value?.habitIds).toEqual(['h_math']);
      expect(storedRoutine.value?.name).toBe('Study Session Reset');
    }
    expect(await habitRepo.saveCheckIn(checkInSample)).toEqual({ ok: true, value: undefined });
    expect(await habitRepo.getCheckIn('h_math', '2026-08-31')).toEqual({
      ok: true,
      value: checkInSample,
    });
  });

  it('refuses to overwrite a structurally invalid same-day check-in and leaves raw bytes untouched', async () => {
    const name = dbName();
    const repo = await createGuestHabitRepository({ databaseName: name });
    await repo.saveHabit(habitSample);

    const rawCorrupt = {
      id: 'chk_h_math_2026-08-31',
      habitId: 'h_math',
      date: '2026-08-31',
      kind: 999,
      note: 'structurally invalid',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const rawDb = await openDB(name, GUEST_DB_VERSION);
    await rawDb.put('habitCheckIns', rawCorrupt);
    rawDb.close();

    const replacement: HabitCheckIn = {
      ...checkInSample,
      kind: 'full',
      note: 'attempted overwrite',
      updatedAt: '2026-08-31T10:00:00.000Z',
    };
    const saveRes = await repo.saveCheckIn(replacement);
    expect(saveRes.ok).toBe(false);
    if (!saveRes.ok) expect(saveRes.code).toBe('corrupt_record');

    const verifyRaw = await openDB(name, GUEST_DB_VERSION);
    expect(await verifyRaw.get('habitCheckIns', 'chk_h_math_2026-08-31')).toEqual(rawCorrupt);
    verifyRaw.close();
  });

  it('refuses to overwrite a semantically invalid same-day check-in and leaves raw bytes untouched', async () => {
    const name = dbName();
    const repo = await createGuestHabitRepository({ databaseName: name });
    await repo.saveHabit(habitSample);

    const invertedTimestamps: HabitCheckIn = {
      ...checkInSample,
      createdAt: '2026-08-31T10:00:00.000Z',
      updatedAt: '2026-08-31T08:00:00.000Z',
    };
    const rawDb = await openDB(name, GUEST_DB_VERSION);
    await rawDb.put('habitCheckIns', invertedTimestamps);
    rawDb.close();

    const saveRes = await repo.saveCheckIn({
      ...checkInSample,
      kind: 'full',
      createdAt: '2026-08-31T12:00:00.000Z',
      updatedAt: '2026-08-31T12:00:00.000Z',
    });
    expect(saveRes.ok).toBe(false);
    if (!saveRes.ok) expect(saveRes.code).toBe('corrupt_record');

    const verifyRaw = await openDB(name, GUEST_DB_VERSION);
    expect(await verifyRaw.get('habitCheckIns', checkInSample.id)).toEqual(invertedTimestamps);
    verifyRaw.close();
  });

  it('atomically rolls back createHabitWithRoutine when the write is forced to fail', async () => {
    const name = dbName();
    const repo = await createGuestHabitRepository({ databaseName: name });
    const routine: Routine = { ...routineSample, habitIds: [] };
    await repo.saveRoutine(routine);

    repo.failNextWrite = true;
    const createRes = await repo.createHabitWithRoutine(habitSample, 'r_study');
    expect(createRes.ok).toBe(false);
    if (!createRes.ok) expect(createRes.code).toBe('persistence_write_failed');

    expect(await repo.getHabit('h_math')).toEqual({ ok: true, value: null });
    const unchanged = await repo.getRoutine('r_study');
    expect(unchanged.ok && unchanged.value?.habitIds).toEqual([]);

    const retry = await repo.createHabitWithRoutine(habitSample, 'r_study');
    expect(retry.ok).toBe(true);
    const habits = await repo.listHabits(true);
    expect(habits.ok && habits.value).toHaveLength(1);
    const assigned = await repo.getRoutine('r_study');
    expect(assigned.ok && assigned.value?.habitIds).toEqual(['h_math']);
  });

  it('atomically rolls back updateHabitWithRoutine move A → B on forced failure', async () => {
    const name = dbName();
    const repo = await createGuestHabitRepository({ databaseName: name });
    const original: Habit = { ...habitSample, title: 'Original Title' };
    await repo.saveHabit(original);
    await repo.saveRoutine({
      id: 'r_a',
      name: 'Routine A',
      contextLabel: 'A',
      habitIds: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await repo.saveRoutine({
      id: 'r_b',
      name: 'Routine B',
      contextLabel: 'B',
      habitIds: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    expect((await repo.assignHabitToRoutine('h_math', 'r_a')).ok).toBe(true);

    const nextHabit: Habit = {
      ...original,
      title: 'Edited Title',
      updatedAt: '2026-08-31T10:00:00.000Z',
    };
    repo.failNextWrite = true;
    const updateRes = await repo.updateHabitWithRoutine(original, nextHabit, 'r_b');
    expect(updateRes.ok).toBe(false);
    if (!updateRes.ok) expect(updateRes.code).toBe('persistence_write_failed');

    const storedHabit = await repo.getHabit('h_math');
    expect(storedHabit.ok && storedHabit.value?.title).toBe('Original Title');
    const a = await repo.getRoutine('r_a');
    const b = await repo.getRoutine('r_b');
    expect(a.ok && a.value?.habitIds).toEqual(['h_math']);
    expect(b.ok && b.value?.habitIds).toEqual([]);
  });

  it('rejects unknown habit on remove and reorder', async () => {
    const name = dbName();
    const repo = await createGuestHabitRepository({ databaseName: name });
    await repo.saveHabit(habitSample);
    await repo.saveRoutine({ ...routineSample, habitIds: [] });
    await repo.assignHabitToRoutine('h_math', 'r_study');

    const removeUnknown = await repo.removeHabitFromRoutine('missing_habit');
    expect(removeUnknown.ok).toBe(false);
    if (!removeUnknown.ok) expect(removeUnknown.code).toBe('habit_not_found');

    const reorderUnknown = await repo.reorderRoutineHabits('r_study', ['missing_habit']);
    expect(reorderUnknown.ok).toBe(false);
    if (!reorderUnknown.ok) expect(reorderUnknown.code).toBe('invalid_reorder');

    const rawDb = await openDB(name, GUEST_DB_VERSION);
    await rawDb.delete('habits', 'h_math');
    rawDb.close();
    const reorderDeleted = await repo.reorderRoutineHabits('r_study', ['h_math']);
    expect(reorderDeleted.ok).toBe(false);
    if (!reorderDeleted.ok) expect(reorderDeleted.code).toBe('habit_not_found');
  });

  it('rejects duplicate IDs and unknown extra IDs on reorder', async () => {
    const name = dbName();
    const repo = await createGuestHabitRepository({ databaseName: name });
    const h2: Habit = { ...habitSample, id: 'h2', title: 'Second' };
    await repo.saveHabit(habitSample);
    await repo.saveHabit(h2);
    await repo.saveRoutine({ ...routineSample, habitIds: [] });
    await repo.assignHabitToRoutine('h_math', 'r_study');
    await repo.assignHabitToRoutine('h2', 'r_study');

    const dup = await repo.reorderRoutineHabits('r_study', ['h_math', 'h_math']);
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.code).toBe('duplicate_habit_ids');

    const extra = await repo.reorderRoutineHabits('r_study', ['h_math', 'h2', 'ghost']);
    expect(extra.ok).toBe(false);
    if (!extra.ok) expect(extra.code).toBe('invalid_reorder');

    const stored = await repo.getRoutine('r_study');
    expect(stored.ok && stored.value?.habitIds).toEqual(['h_math', 'h2']);
  });

  it('aborts assign when the target or a sibling routine is corrupt', async () => {
    const name = dbName();
    const repo = await createGuestHabitRepository({ databaseName: name });
    await repo.saveHabit(habitSample);
    await repo.saveRoutine({
      id: 'r_ok',
      name: 'OK',
      contextLabel: '',
      habitIds: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const rawDb = await openDB(name, GUEST_DB_VERSION);
    await rawDb.put('routines', { id: 'r_corrupt', name: 12345 });
    rawDb.close();

    const assignCorruptSibling = await repo.assignHabitToRoutine('h_math', 'r_ok');
    expect(assignCorruptSibling.ok).toBe(false);
    if (!assignCorruptSibling.ok) expect(assignCorruptSibling.code).toBe('corrupt_record');
    const okRoutine = await repo.getRoutine('r_ok');
    expect(okRoutine.ok && okRoutine.value?.habitIds).toEqual([]);

    const rawTarget = await openDB(name, GUEST_DB_VERSION);
    await rawTarget.put('routines', { id: 'r_target_corrupt', name: 99, habitIds: [] });
    rawTarget.close();
    const assignCorruptTarget = await repo.assignHabitToRoutine('h_math', 'r_target_corrupt');
    expect(assignCorruptTarget.ok).toBe(false);
    if (!assignCorruptTarget.ok) expect(assignCorruptTarget.code).toBe('corrupt_record');
  });

  it('never leaves one habit in two routines under conflicting concurrent assignments', async () => {
    const name = dbName();
    const repo1 = await createGuestHabitRepository({ databaseName: name });
    const repo2 = await createGuestHabitRepository({ databaseName: name });
    await repo1.saveHabit(habitSample);
    await repo1.saveRoutine({
      id: 'r_morning',
      name: 'Morning',
      contextLabel: '',
      habitIds: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await repo1.saveRoutine({
      id: 'r_evening',
      name: 'Evening',
      contextLabel: '',
      habitIds: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await Promise.all([
      repo1.assignHabitToRoutine('h_math', 'r_morning'),
      repo2.assignHabitToRoutine('h_math', 'r_evening'),
    ]);

    const morning = await repo1.getRoutine('r_morning');
    const evening = await repo1.getRoutine('r_evening');
    const inMorning = morning.ok && morning.value?.habitIds.includes('h_math') ? 1 : 0;
    const inEvening = evening.ok && evening.value?.habitIds.includes('h_math') ? 1 : 0;
    expect(inMorning + inEvening).toBe(1);
  });

  it('leaves a semantically impossible persisted habit untouched as corrupt_record', async () => {
    const name = dbName();
    const repo = await createGuestHabitRepository({ databaseName: name });
    const impossible: Habit = {
      ...habitSample,
      id: 'h_impossible',
      status: 'active',
      activeIntervals: [
        { startDate: '2026-08-31', endDate: '2026-09-10' },
        { startDate: '2026-09-01', endDate: null },
      ],
    };
    const rawDb = await openDB(name, GUEST_DB_VERSION);
    await rawDb.put('habits', impossible);
    rawDb.close();

    const listRes = await repo.listHabits(true);
    expect(listRes.ok).toBe(false);
    if (!listRes.ok) expect(listRes.code).toBe('corrupt_record');

    const verifyRaw = await openDB(name, GUEST_DB_VERSION);
    expect(await verifyRaw.get('habits', 'h_impossible')).toEqual(impossible);
    verifyRaw.close();
  });

  it('does not persist incoming habitIds through generic saveRoutine', async () => {
    const name = dbName();
    const repo = await createGuestHabitRepository({ databaseName: name });
    await repo.saveHabit(habitSample);
    const saveRes = await repo.saveRoutine(routineSample);
    expect(saveRes.ok).toBe(true);
    const stored = await repo.getRoutine('r_study');
    expect(stored.ok && stored.value?.habitIds).toEqual([]);
  });
});
