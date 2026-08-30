import { openDB } from 'idb';
import { expect, it } from 'vitest';
import type { Distraction } from '@/domain/focus/distraction';
import type { FocusSession } from '@/domain/focus/focus-session';
import type { WorkItem } from '@/domain/work-items/work-item';
import { GUEST_DB_VERSION } from './guest-db';
import { createGuestFocusRepository, GuestFocusRepository } from './guest-focus-repository';
import { createGuestTodayRepository } from './guest-today-repository';
import { openGuestTodayDb } from './guest-db';

function dbName(): string {
  return `personal-productivity-focus-test-${crypto.randomUUID()}`;
}

const timestamp = '2026-08-31T08:00:00.000Z';

const runningSession: FocusSession = {
  id: 's1',
  workItemId: 'w1',
  timeBlockId: 'tb1',
  status: 'running',
  mode: 'countdown',
  plannedDurationMinutes: 50,
  startedAt: timestamp,
  runningSince: timestamp,
  endedAt: null,
  accumulatedFocusMs: 0,
  focusedDurationMs: null,
  startLatencyMinutes: 12,
  note: '',
  qualityRating: null,
  createdAt: timestamp,
  updatedAt: timestamp,
};

const workItem: WorkItem = {
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

async function putRaw(name: string, store: string, value: unknown): Promise<void> {
  const rawDb = await openDB(name, GUEST_DB_VERSION);
  await rawDb.put(store, value);
  rawDb.close();
}

async function getRaw(name: string, store: string, key: string): Promise<unknown> {
  const rawDb = await openDB(name, GUEST_DB_VERSION);
  const row = await rawDb.get(store, key);
  rawDb.close();
  return row;
}

it('persists a running session across repository re-instantiation', async () => {
  const name = dbName();
  const first = await createGuestFocusRepository({ databaseName: name });
  expect(await first.saveSession(runningSession)).toEqual({ ok: true, value: undefined });

  const second = await createGuestFocusRepository({ databaseName: name });
  expect(await second.getSession(runningSession.id)).toEqual({ ok: true, value: runningSession });
  expect(await second.getActiveSession()).toEqual({ ok: true, value: runningSession });
});

it('reloads completed focused duration and associated distractions', async () => {
  const name = dbName();
  const repository = await createGuestFocusRepository({ databaseName: name });
  const completed: FocusSession = {
    ...runningSession,
    status: 'completed',
    runningSince: null,
    endedAt: '2026-08-31T08:12:00.000Z',
    accumulatedFocusMs: 12 * 60_000,
    focusedDurationMs: 12 * 60_000,
    updatedAt: '2026-08-31T08:12:00.000Z',
  };
  const distraction: Distraction = {
    id: 'd1',
    focusSessionId: completed.id,
    text: 'TikTok',
    capturedAt: '2026-08-31T08:04:00.000Z',
  };

  expect(await repository.saveSession(completed)).toEqual({ ok: true, value: undefined });
  expect(await repository.saveDistraction(distraction)).toEqual({ ok: true, value: undefined });

  const reloaded = await createGuestFocusRepository({ databaseName: name });
  expect(await reloaded.getSession(completed.id)).toEqual({ ok: true, value: completed });
  expect(await reloaded.getActiveSession()).toEqual({ ok: true, value: null });
  expect(await reloaded.listDistractions(completed.id)).toEqual({ ok: true, value: [distraction] });
});

it('returns corrupt_record and leaves malformed session bytes untouched', async () => {
  const name = dbName();
  const repository = await createGuestFocusRepository({ databaseName: name });
  const raw = { id: 'bad-session' };
  await putRaw(name, 'focusSessions', raw);

  const result = await repository.getSession('bad-session');
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.code).toBe('corrupt_record');
  expect(await getRaw(name, 'focusSessions', 'bad-session')).toEqual(raw);
});

it('returns corrupt_record and leaves malformed distraction bytes untouched', async () => {
  const name = dbName();
  const repository = await createGuestFocusRepository({ databaseName: name });
  const raw = { id: 'bad-d', focusSessionId: 's1', text: '   ' };
  await putRaw(name, 'distractions', raw);

  const result = await repository.listDistractions('s1');
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.code).toBe('corrupt_record');
  expect(await getRaw(name, 'distractions', 'bad-d')).toEqual(raw);
});

it('returns persistence_read_failed and persistence_write_failed on a closed connection', async () => {
  const name = dbName();
  const db = await openGuestTodayDb(name);
  db.close();
  const repository = new GuestFocusRepository(db, {});

  const read = await repository.getSession('s1');
  expect(read.ok).toBe(false);
  if (!read.ok) expect(read.code).toBe('persistence_read_failed');

  const write = await repository.saveSession(runningSession);
  expect(write.ok).toBe(false);
  if (!write.ok) expect(write.code).toBe('persistence_write_failed');
});

it('returns corrupt_record when more than one active session exists', async () => {
  const name = dbName();
  const repository = await createGuestFocusRepository({ databaseName: name });
  await repository.saveSession(runningSession);
  await repository.saveSession({ ...runningSession, id: 's2', workItemId: null, timeBlockId: null });

  const active = await repository.getActiveSession();
  expect(active.ok).toBe(false);
  if (!active.ok) expect(active.code).toBe('corrupt_record');
});

it('upgrades a v1 guest database without deleting today stores', async () => {
  const name = dbName();
  const v1 = await openDB(name, 1, {
    upgrade(db) {
      db.createObjectStore('workItems', { keyPath: 'id' });
      db.createObjectStore('dailyPlans', { keyPath: 'id' });
      db.createObjectStore('dailyPriorities', { keyPath: 'id' });
      db.createObjectStore('timeBlocks', { keyPath: 'id' });
      db.createObjectStore('dailyCommitments', { keyPath: 'id' });
      db.createObjectStore('meta', { keyPath: 'key' });
    },
  });
  await v1.put('workItems', workItem);
  v1.close();

  const today = await createGuestTodayRepository({ databaseName: name });
  expect(await today.getWorkItem(workItem.id)).toEqual({ ok: true, value: workItem });
  const focus = await createGuestFocusRepository({ databaseName: name });
  expect(await focus.saveSession(runningSession)).toEqual({ ok: true, value: undefined });
  expect(await focus.getSession(runningSession.id)).toEqual({ ok: true, value: runningSession });
});

it('writes session and work item actual minutes in one transaction', async () => {
  const name = dbName();
  const today = await createGuestTodayRepository({ databaseName: name });
  expect(await today.saveWorkItem(workItem)).toEqual({ ok: true, value: undefined });

  const focus = await createGuestFocusRepository({ databaseName: name });
  const completed: FocusSession = {
    ...runningSession,
    status: 'completed',
    runningSince: null,
    endedAt: '2026-08-31T08:12:00.000Z',
    focusedDurationMs: 12 * 60_000,
    updatedAt: '2026-08-31T08:12:00.000Z',
  };
  const updatedWorkItem = { ...workItem, actualMinutes: 12, updatedAt: completed.endedAt! };

  expect(await focus.completeSessionWithWorkItem(completed, updatedWorkItem)).toEqual({
    ok: true,
    value: undefined,
  });

  const verifyFocus = await createGuestFocusRepository({ databaseName: name });
  const verifyToday = await createGuestTodayRepository({ databaseName: name });
  expect(await verifyFocus.getSession(completed.id)).toEqual({ ok: true, value: completed });
  expect(await verifyToday.getWorkItem(workItem.id)).toEqual({ ok: true, value: updatedWorkItem });
});

it('rolls back session completion when the work item write fails', async () => {
  const name = dbName();
  const today = await createGuestTodayRepository({ databaseName: name });
  expect(await today.saveWorkItem(workItem)).toEqual({ ok: true, value: undefined });
  const focus = await createGuestFocusRepository({ databaseName: name });
  expect(await focus.saveSession(runningSession)).toEqual({ ok: true, value: undefined });

  const failing = await createGuestFocusRepository({
    databaseName: name,
    beforeWorkItemWrite: () => {
      throw new Error('forced work item write failure');
    },
  });
  const completed: FocusSession = {
    ...runningSession,
    status: 'completed',
    runningSince: null,
    endedAt: '2026-08-31T08:12:00.000Z',
    focusedDurationMs: 12 * 60_000,
    updatedAt: '2026-08-31T08:12:00.000Z',
  };
  const write = await failing.completeSessionWithWorkItem(completed, {
    ...workItem,
    actualMinutes: 12,
  });
  expect(write.ok).toBe(false);
  if (!write.ok) expect(write.code).toBe('persistence_write_failed');

  const verifyFocus = await createGuestFocusRepository({ databaseName: name });
  const verifyToday = await createGuestTodayRepository({ databaseName: name });
  expect(await verifyFocus.getSession(runningSession.id)).toEqual({ ok: true, value: runningSession });
  expect(await verifyToday.getWorkItem(workItem.id)).toEqual({ ok: true, value: workItem });
});
