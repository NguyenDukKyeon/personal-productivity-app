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

it('returns corrupt_record when stored session has semantically inverted timing (runningSince < startedAt) leaving raw row untouched', async () => {
  const name = dbName();
  const repository = await createGuestFocusRepository({ databaseName: name });
  const semanticallyCorruptRow = {
    ...runningSession,
    id: 'corrupt-timing-session',
    startedAt: '2026-08-31T08:00:00.000Z',
    runningSince: '2026-08-31T07:50:00.000Z', // 10 minutes before startedAt
  };
  await putRaw(name, 'focusSessions', semanticallyCorruptRow);

  const getResult = await repository.getSession('corrupt-timing-session');
  expect(getResult.ok).toBe(false);
  if (!getResult.ok) expect(getResult.code).toBe('corrupt_record');

  const activeResult = await repository.getActiveSession();
  expect(activeResult.ok).toBe(false);
  if (!activeResult.ok) expect(activeResult.code).toBe('corrupt_record');

  expect(await getRaw(name, 'focusSessions', 'corrupt-timing-session')).toEqual(semanticallyCorruptRow);
});

it('returns corrupt_record when stored running session has impossible accumulatedFocusMs leaving raw row untouched', async () => {
  const name = dbName();
  const repository = await createGuestFocusRepository({ databaseName: name });
  const rawRunning = {
    ...runningSession,
    id: 'corrupt-accum-running',
    startedAt: '2026-08-31T08:00:00.000Z',
    updatedAt: '2026-08-31T08:10:00.000Z', // 10 minutes interval
    runningSince: '2026-08-31T08:10:00.000Z',
    accumulatedFocusMs: 5 * 3600_000, // 5 hours (impossible for 10 min interval)
    status: 'running',
  };
  await putRaw(name, 'focusSessions', rawRunning);

  const getResult = await repository.getSession('corrupt-accum-running');
  expect(getResult.ok).toBe(false);
  if (!getResult.ok) expect(getResult.code).toBe('corrupt_record');

  const activeResult = await repository.getActiveSession();
  expect(activeResult.ok).toBe(false);
  if (!activeResult.ok) expect(activeResult.code).toBe('corrupt_record');

  expect(await getRaw(name, 'focusSessions', 'corrupt-accum-running')).toEqual(rawRunning);
});

it('returns corrupt_record when stored paused session has impossible accumulatedFocusMs leaving raw row untouched', async () => {
  const name = dbName();
  const repository = await createGuestFocusRepository({ databaseName: name });
  const rawPaused = {
    ...runningSession,
    id: 'corrupt-accum-paused',
    startedAt: '2026-08-31T08:00:00.000Z',
    updatedAt: '2026-08-31T08:10:00.000Z', // 10 minutes interval
    runningSince: null,
    accumulatedFocusMs: 5 * 3600_000, // 5 hours
    status: 'paused',
  };
  await putRaw(name, 'focusSessions', rawPaused);

  const getResult = await repository.getSession('corrupt-accum-paused');
  expect(getResult.ok).toBe(false);
  if (!getResult.ok) expect(getResult.code).toBe('corrupt_record');

  const activeResult = await repository.getActiveSession();
  expect(activeResult.ok).toBe(false);
  if (!activeResult.ok) expect(activeResult.code).toBe('corrupt_record');

  expect(await getRaw(name, 'focusSessions', 'corrupt-accum-paused')).toEqual(rawPaused);
});

it('rejects direct saveSession when session is semantically invalid and does not write to IndexedDB', async () => {
  const name = dbName();
  const repository = await createGuestFocusRepository({ databaseName: name });
  const invalidSession: FocusSession = {
    ...runningSession,
    id: 'invalid-session-save',
    startedAt: '2026-08-31T08:00:00.000Z',
    updatedAt: '2026-08-31T08:10:00.000Z',
    runningSince: '2026-08-31T07:50:00.000Z', // inverted runningSince < startedAt
  };

  const result = await repository.saveSession(invalidSession);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.code).toBe('corrupt_record');

  expect(await getRaw(name, 'focusSessions', 'invalid-session-save')).toBeUndefined();
});

it('rejects completeSessionWithWorkItem when FocusSession is invalid before opening transaction', async () => {
  const name = dbName();
  const repository = await createGuestFocusRepository({ databaseName: name });
  const item: WorkItem = {
    id: 'w1',
    title: 'Algebra',
    notes: '',
    type: 'task',
    estimatedMinutes: 60,
    actualMinutes: 0,
    priority: 'p1_urgent',
    status: 'backlog',
    completedAt: null,
    createdAt: '2026-08-31T08:00:00.000Z',
    updatedAt: '2026-08-31T08:00:00.000Z',
    projectId: null,
  };
  await putRaw(name, 'workItems', item);

  const invalidCompletedSession: FocusSession = {
    ...runningSession,
    id: 'invalid-complete-session',
    status: 'completed',
    runningSince: null,
    startedAt: '2026-08-31T08:00:00.000Z',
    endedAt: '2026-08-31T08:10:00.000Z',
    focusedDurationMs: 3600_000, // 60 min > 10 min wall clock
  };

  const result = await repository.completeSessionWithWorkItem(invalidCompletedSession, {
    ...item,
    actualMinutes: 60,
  });
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.code).toBe('corrupt_record');

  expect(await getRaw(name, 'focusSessions', 'invalid-complete-session')).toBeUndefined();
  expect(await getRaw(name, 'workItems', 'w1')).toEqual(item);
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

it('returns corrupt_record when stored distraction has invalid capturedAt timestamp leaving raw row untouched', async () => {
  const name = dbName();
  const repository = await createGuestFocusRepository({ databaseName: name });
  const raw = { id: 'bad-timestamp-d', focusSessionId: 's1', text: 'valid text', capturedAt: 'invalid-date' };
  await putRaw(name, 'distractions', raw);

  const result = await repository.listDistractions('s1');
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.code).toBe('corrupt_record');
  expect(await getRaw(name, 'distractions', 'bad-timestamp-d')).toEqual(raw);
});

it('returns distractions in deterministic chronological order with id tie-breaker', async () => {
  const name = dbName();
  const repository = await createGuestFocusRepository({ databaseName: name });
  const d3: Distraction = { id: 'd-3', focusSessionId: 's1', text: 'third', capturedAt: '2026-08-31T08:15:00.000Z' };
  const d1b: Distraction = { id: 'd-1b', focusSessionId: 's1', text: 'first b', capturedAt: '2026-08-31T08:05:00.000Z' };
  const d1a: Distraction = { id: 'd-1a', focusSessionId: 's1', text: 'first a', capturedAt: '2026-08-31T08:05:00.000Z' };
  const d2: Distraction = { id: 'd-2', focusSessionId: 's1', text: 'second', capturedAt: '2026-08-31T08:10:00.000Z' };

  // Save in non-chronological order
  await repository.saveDistraction(d3);
  await repository.saveDistraction(d1b);
  await repository.saveDistraction(d2);
  await repository.saveDistraction(d1a);

  const result = await repository.listDistractions('s1');
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.map((d) => d.id)).toEqual(['d-1a', 'd-1b', 'd-2', 'd-3']);
  }
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

it('atomically starts session if none active and rejects concurrent starts across repository instances', async () => {
  const name = dbName();
  const repo1 = await createGuestFocusRepository({ databaseName: name });
  const repo2 = await createGuestFocusRepository({ databaseName: name });

  const sessionA: FocusSession = { ...runningSession, id: 's-a' };
  const sessionB: FocusSession = { ...runningSession, id: 's-b' };

  // Concurrent start requests
  const [resA, resB] = await Promise.all([
    repo1.startSessionIfNoneActive(sessionA),
    repo2.startSessionIfNoneActive(sessionB),
  ]);

  const results = [resA, resB];
  const okResults = results.filter((r) => r.ok);
  const sessionActiveErrors = results.filter((r) => !r.ok && r.code === 'session_active');

  expect(okResults.length).toBe(1);
  expect(sessionActiveErrors.length).toBe(1);

  // Exactly one active session in DB
  const active = await repo1.getActiveSession();
  expect(active.ok).toBe(true);
  if (active.ok) {
    expect(active.value).not.toBeNull();
    expect(['s-a', 's-b']).toContain(active.value?.id);
  }
});

it('rejects startSessionIfNoneActive when a paused session exists', async () => {
  const name = dbName();
  const repo = await createGuestFocusRepository({ databaseName: name });
  const pausedSession: FocusSession = {
    ...runningSession,
    id: 's-paused',
    status: 'paused',
    runningSince: null,
  };
  await repo.saveSession(pausedSession);

  const startRes = await repo.startSessionIfNoneActive(runningSession);
  expect(startRes.ok).toBe(false);
  if (!startRes.ok) {
    expect(startRes.code).toBe('session_active');
  }
});
