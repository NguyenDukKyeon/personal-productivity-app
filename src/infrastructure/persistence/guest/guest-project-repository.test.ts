import { openDB } from 'idb';
import { describe, expect, it } from 'vitest';
import type { DailyCommitmentSnapshot } from '@/domain/commitments/commitment';
import type { DailyPlan, DailyPriority } from '@/domain/daily-plans/daily-plan';
import type { Distraction } from '@/domain/focus/distraction';
import type { FocusSession } from '@/domain/focus/focus-session';
import type { Habit } from '@/domain/habits/habit';
import type { HabitCheckIn } from '@/domain/habits/habit-check-in';
import type { Routine } from '@/domain/habits/routine';
import type { Project } from '@/domain/projects/project';
import type { ProjectMilestone } from '@/domain/projects/project-milestone';
import type { TimeBlock } from '@/domain/time-blocks/time-block';
import type { WorkItem } from '@/domain/work-items/work-item';
import { GUEST_DB_VERSION } from './guest-db';
import { createGuestFocusRepository } from './guest-focus-repository';
import { createGuestHabitRepository } from './guest-habit-repository';
import { createGuestProjectRepository } from './guest-project-repository';
import { createGuestTodayRepository } from './guest-today-repository';

function dbName(): string {
  return `personal-productivity-project-test-${crypto.randomUUID()}`;
}

const timestamp = '2026-09-01T08:00:00.000Z';

const projectSample: Project = {
  id: 'proj-1',
  title: 'Grade 11 Chemistry Semester 1',
  description: 'Study all units and exercises',
  status: 'active',
  targetDate: '2026-10-15',
  createdAt: timestamp,
  updatedAt: timestamp,
  completedAt: null,
};

const milestoneSample: ProjectMilestone = {
  id: 'ms-1',
  projectId: 'proj-1',
  title: 'Unit 1: Atomic Structure',
  targetDate: '2026-09-15',
  order: 0,
  status: 'active',
  createdAt: timestamp,
  updatedAt: timestamp,
  completedAt: null,
};

describe('guest-project-repository', () => {
  it('persists and reloads a project across instances', async () => {
    const name = dbName();
    const repo1 = await createGuestProjectRepository({ databaseName: name });
    expect(await repo1.saveProject(projectSample)).toEqual({ ok: true, value: undefined });

    const repo2 = await createGuestProjectRepository({ databaseName: name });
    expect(await repo2.getProject('proj-1')).toEqual({ ok: true, value: projectSample });
    expect(await repo2.listProjects(false)).toEqual({ ok: true, value: [projectSample] });
  });

  it('filters out archived projects when includeArchived is false', async () => {
    const name = dbName();
    const repo = await createGuestProjectRepository({ databaseName: name });
    await repo.saveProject(projectSample);

    const archivedProject: Project = {
      id: 'proj-archived',
      title: 'Archived Project',
      description: '',
      status: 'archived',
      targetDate: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: null,
    };
    await repo.saveProject(archivedProject);

    const activeList = await repo.listProjects(false);
    expect(activeList).toEqual({ ok: true, value: [projectSample] });

    const allList = await repo.listProjects(true);
    expect(allList.ok).toBe(true);
    if (!allList.ok) return;
    expect(allList.value.length).toBe(2);
  });

  it('returns ok(null) for non-existent project or milestone', async () => {
    const name = dbName();
    const repo = await createGuestProjectRepository({ databaseName: name });
    expect(await repo.getProject('non-existent')).toEqual({ ok: true, value: null });
    expect(await repo.getMilestone('non-existent')).toEqual({ ok: true, value: null });
  });

  it('persists and lists milestones sorted by order', async () => {
    const name = dbName();
    const repo = await createGuestProjectRepository({ databaseName: name });
    await repo.saveMilestone(milestoneSample);

    const milestone2: ProjectMilestone = {
      id: 'ms-2',
      projectId: 'proj-1',
      title: 'Unit 2: Chemical Bonding',
      targetDate: '2026-09-30',
      order: 1,
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: null,
    };
    await repo.saveMilestone(milestone2);

    const list = await repo.listMilestones('proj-1');
    expect(list).toEqual({ ok: true, value: [milestoneSample, milestone2] });
  });

  it('replaces milestones for a project atomically', async () => {
    const name = dbName();
    const repo = await createGuestProjectRepository({ databaseName: name });
    await repo.saveMilestone(milestoneSample);

    const newMilestone: ProjectMilestone = {
      id: 'ms-new',
      projectId: 'proj-1',
      title: 'Unit 1 Reorganized',
      targetDate: null,
      order: 0,
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: null,
    };

    const replaceRes = await repo.replaceMilestones('proj-1', [newMilestone]);
    expect(replaceRes.ok).toBe(true);

    const list = await repo.listMilestones('proj-1');
    expect(list).toEqual({ ok: true, value: [newMilestone] });
  });

  it('deletes a milestone', async () => {
    const name = dbName();
    const repo = await createGuestProjectRepository({ databaseName: name });
    await repo.saveMilestone(milestoneSample);

    expect(await repo.deleteMilestone('ms-1')).toEqual({ ok: true, value: undefined });
    expect(await repo.getMilestone('ms-1')).toEqual({ ok: true, value: null });
  });

  it('quarantines corrupt project record and returns corrupt_record error without touching raw data', async () => {
    const name = dbName();
    const rawDb = await openDB(name, GUEST_DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
      },
    });

    // Write malformed project record directly into IDB
    await rawDb.put('projects', { id: 'corrupt-1', title: '' });
    rawDb.close();

    const repo = await createGuestProjectRepository({ databaseName: name });
    const listRes = await repo.listProjects(true);
    expect(listRes.ok).toBe(false);
    if (listRes.ok) return;
    expect(listRes.code).toBe('corrupt_record');

    // Verify raw data remains untouched
    const verifyDb = await openDB(name, GUEST_DB_VERSION);
    const raw = await verifyDb.get('projects', 'corrupt-1');
    expect(raw).toEqual({ id: 'corrupt-1', title: '' });
    verifyDb.close();
  });

  it('quarantines corrupt milestone record and returns corrupt_record error', async () => {
    const name = dbName();
    const rawDb = await openDB(name, GUEST_DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('projectMilestones')) {
          const s = db.createObjectStore('projectMilestones', { keyPath: 'id' });
          s.createIndex('projectId', 'projectId');
        }
      },
    });

    await rawDb.put('projectMilestones', { id: 'corrupt-ms', projectId: 'proj-1', title: 'A'.repeat(200) });
    rawDb.close();

    const repo = await createGuestProjectRepository({ databaseName: name });
    const listRes = await repo.listMilestones('proj-1');
    expect(listRes.ok).toBe(false);
    if (listRes.ok) return;
    expect(listRes.code).toBe('corrupt_record');
  });

  it('migrates DB from v3 to v4: seeds Phase 1, 2, and 3 records and asserts 100% semantic survival', async () => {
    const name = dbName();
    // 1. Setup v3 DB with Phase 1, Phase 2, and Phase 3 object stores
    const v3 = await openDB(name, 3, {
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
        const hStore = db.createObjectStore('habits', { keyPath: 'id' });
        hStore.createIndex('status', 'status');
        const hcStore = db.createObjectStore('habitCheckIns', { keyPath: 'id' });
        hcStore.createIndex('habitId', 'habitId');
        hcStore.createIndex('date', 'date');
        hcStore.createIndex('habitId_date', ['habitId', 'date'], { unique: true });
        db.createObjectStore('routines', { keyPath: 'id' });
      },
    });

    // 2. Seed Phase 1 records
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
      date: '2026-09-01',
      capacityMinutes: 240,
      morningIntention: 'Finish early',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const samplePriority: DailyPriority = {
      id: 'dpr1',
      dailyPlanId: 'dp1',
      workItemId: 'w1',
      rank: 1,
    };
    const sampleTimeBlock: TimeBlock = {
      id: 'tb1',
      date: '2026-09-01',
      workItemId: 'w1',
      habitId: null,
      startMinute: 540,
      endMinute: 600,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const sampleCommitment: DailyCommitmentSnapshot = {
      id: 'dc1',
      date: '2026-09-01',
      committedAt: timestamp,
      capacityMinutes: 240,
      priorityWorkItemIds: ['w1'],
      timeBlocks: [{ workItemId: 'w1', startMinute: 540, endMinute: 600 }],
    };

    // 3. Seed Phase 2 records
    const sampleFocusSession: FocusSession = {
      id: 'fs1',
      workItemId: 'w1',
      timeBlockId: 'tb1',
      status: 'completed',
      mode: 'countdown',
      plannedDurationMinutes: 25,
      startedAt: timestamp,
      runningSince: null,
      endedAt: '2026-09-01T08:25:00.000Z',
      accumulatedFocusMs: 25 * 60_000,
      focusedDurationMs: 25 * 60_000,
      startLatencyMinutes: 0,
      note: 'Done',
      qualityRating: 5,
      createdAt: timestamp,
      updatedAt: '2026-09-01T08:25:00.000Z',
    };
    const sampleDistraction: Distraction = {
      id: 'd1',
      focusSessionId: 'fs1',
      text: 'Phone beep',
      capturedAt: timestamp,
    };

    // 4. Seed Phase 3 records
    const sampleHabit: Habit = {
      id: 'h1',
      title: 'Daily Reading',
      description: 'Read 10 pages',
      cue: 'Morning coffee',
      minimumVersion: 'Read 1 page',
      schedule: { kind: 'daily' },
      scheduleRevisions: [{ effectiveFromDate: '2026-09-01', schedule: { kind: 'daily' } }],
      activeIntervals: [{ startDate: '2026-09-01', endDate: null }],
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const sampleCheckIn: HabitCheckIn = {
      id: 'chk_h1_2026-09-01',
      habitId: 'h1',
      date: '2026-09-01',
      kind: 'full',
      note: 'Read 12 pages',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const sampleRoutine: Routine = {
      id: 'r1',
      name: 'Morning Routine',
      contextLabel: '07:00',
      habitIds: ['h1'],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await v3.put('workItems', sampleWorkItem);
    await v3.put('dailyPlans', sampleDailyPlan);
    await v3.put('dailyPriorities', samplePriority);
    await v3.put('timeBlocks', sampleTimeBlock);
    await v3.put('dailyCommitments', sampleCommitment);
    await v3.put('focusSessions', sampleFocusSession);
    await v3.put('distractions', sampleDistraction);
    await v3.put('habits', sampleHabit);
    await v3.put('habitCheckIns', sampleCheckIn);
    await v3.put('routines', sampleRoutine);
    v3.close();

    // 5. Open with v4 repositories
    const projectRepo = await createGuestProjectRepository({ databaseName: name });
    const todayRepo = await createGuestTodayRepository({ databaseName: name });
    const focusRepo = await createGuestFocusRepository({ databaseName: name });
    const habitRepo = await createGuestHabitRepository({ databaseName: name });

    // Assert Phase 1 survival
    expect(await todayRepo.getWorkItem('w1')).toEqual({ ok: true, value: sampleWorkItem });
    expect(await todayRepo.getDailyPlan('2026-09-01')).toEqual({ ok: true, value: sampleDailyPlan });
    expect(await todayRepo.listPriorities('dp1')).toEqual({ ok: true, value: [samplePriority] });
    expect(await todayRepo.getTimeBlock('tb1')).toEqual({ ok: true, value: sampleTimeBlock });
    expect(await todayRepo.getCommitment('2026-09-01')).toEqual({ ok: true, value: sampleCommitment });

    // Assert Phase 2 survival
    expect(await focusRepo.getSession('fs1')).toEqual({ ok: true, value: sampleFocusSession });
    expect(await focusRepo.listDistractions('fs1')).toEqual({ ok: true, value: [sampleDistraction] });

    // Assert Phase 3 survival
    expect(await habitRepo.getHabit('h1')).toEqual({ ok: true, value: sampleHabit });
    expect(await habitRepo.getCheckIn('h1', '2026-09-01')).toEqual({ ok: true, value: sampleCheckIn });
    expect(await habitRepo.getRoutine('r1')).toEqual({ ok: true, value: sampleRoutine });

    // Assert Phase 4 new stores operational
    expect(await projectRepo.saveProject(projectSample)).toEqual({ ok: true, value: undefined });
    expect(await projectRepo.getProject('proj-1')).toEqual({ ok: true, value: projectSample });
    expect(await projectRepo.saveMilestone(milestoneSample)).toEqual({ ok: true, value: undefined });
    expect(await projectRepo.getMilestone('ms-1')).toEqual({ ok: true, value: milestoneSample });
  });
});
