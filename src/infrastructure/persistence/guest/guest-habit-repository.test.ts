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
    expect(await habitRepo.saveRoutine(routineSample)).toEqual({ ok: true, value: undefined });
    expect(await habitRepo.getRoutine('r_study')).toEqual({ ok: true, value: routineSample });
    expect(await habitRepo.saveCheckIn(checkInSample)).toEqual({ ok: true, value: undefined });
    expect(await habitRepo.getCheckIn('h_math', '2026-08-31')).toEqual({ ok: true, value: checkInSample });
  });
});
