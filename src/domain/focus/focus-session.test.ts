import { expect, it } from 'vitest';
import {
  abandonFocusSession,
  completeFocusSession,
  computeStartLatencyMinutes,
  createRunningFocusSession,
  localMinuteOfDay,
  pauseFocusSession,
  resumeFocusSession,
  validateFocusSession,
  type FocusSession,
} from './focus-session';
import { elapsedFocusMs } from './focus-timing';

const T0 = '2026-08-31T08:00:00.000Z';
const T10 = '2026-08-31T08:10:00.000Z';
const T15 = '2026-08-31T08:15:00.000Z';
const T20 = '2026-08-31T08:20:00.000Z';
const T30 = '2026-08-31T08:30:00.000Z';

function unwrap<T>(result: { ok: boolean; value?: T; message?: string }): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.message);
  return result.value as T;
}

function start(partial: Partial<Parameters<typeof createRunningFocusSession>[0]> = {}) {
  return unwrap(
    createRunningFocusSession({
      id: 's1',
      nowIso: T0,
      workItemId: 'w1',
      timeBlockId: 'tb1',
      mode: 'countdown',
      plannedDurationMinutes: 50,
      startLatencyMinutes: 12,
      ...partial,
    }),
  );
}

it('starts a running session with an open segment and no finalized duration', () => {
  const session = start();
  expect(session.status).toBe('running');
  expect(session.startedAt).toBe(T0);
  expect(session.runningSince).toBe(T0);
  expect(session.accumulatedFocusMs).toBe(0);
  expect(session.focusedDurationMs).toBeNull();
  expect(session.endedAt).toBeNull();
  expect(session.plannedDurationMinutes).toBe(50);
});

it('rejects countdown without a positive integer planned duration', () => {
  const missing = createRunningFocusSession({
    id: 's1',
    nowIso: T0,
    workItemId: null,
    timeBlockId: null,
    mode: 'countdown',
    plannedDurationMinutes: null,
    startLatencyMinutes: null,
  });
  expect(missing.ok).toBe(false);
  if (!missing.ok) expect(missing.code).toBe('invalid_planned_duration');

  const zero = createRunningFocusSession({
    id: 's1',
    nowIso: T0,
    workItemId: null,
    timeBlockId: null,
    mode: 'countdown',
    plannedDurationMinutes: 0,
    startLatencyMinutes: null,
  });
  expect(zero.ok).toBe(false);
  if (!zero.ok) expect(zero.code).toBe('invalid_planned_duration');
});

it('requires flow mode to omit planned duration', () => {
  const invalid = createRunningFocusSession({
    id: 's1',
    nowIso: T0,
    workItemId: null,
    timeBlockId: null,
    mode: 'flow',
    plannedDurationMinutes: 25,
    startLatencyMinutes: null,
  });
  expect(invalid.ok).toBe(false);
  if (!invalid.ok) expect(invalid.code).toBe('invalid_planned_duration');

  const valid = unwrap(
    createRunningFocusSession({
      id: 's1',
      nowIso: T0,
      workItemId: null,
      timeBlockId: null,
      mode: 'flow',
      plannedDurationMinutes: null,
      startLatencyMinutes: null,
    }),
  );
  expect(valid.mode).toBe('flow');
  expect(valid.plannedDurationMinutes).toBeNull();
});

it('pauses by folding the open segment into accumulated focus', () => {
  const paused = unwrap(pauseFocusSession(start(), T10));
  expect(paused.status).toBe('paused');
  expect(paused.runningSince).toBeNull();
  expect(paused.accumulatedFocusMs).toBe(10 * 60_000);
  expect(paused.focusedDurationMs).toBeNull();
  expect(elapsedFocusMs(paused, Date.parse(T15))).toBe(10 * 60_000);
});

it('resumes without changing accumulated focus', () => {
  const paused = unwrap(pauseFocusSession(start(), T10));
  const resumed = unwrap(resumeFocusSession(paused, T15));
  expect(resumed.status).toBe('running');
  expect(resumed.runningSince).toBe(T15);
  expect(resumed.accumulatedFocusMs).toBe(10 * 60_000);
});

it('finalizes completed duration from timestamps, not planned minutes', () => {
  const paused = unwrap(pauseFocusSession(start(), T10));
  const resumed = unwrap(resumeFocusSession(paused, T15));
  const completed = unwrap(completeFocusSession(resumed, T20, { note: '  deep work  ', qualityRating: 4 }));
  expect(completed.status).toBe('completed');
  expect(completed.endedAt).toBe(T20);
  expect(completed.runningSince).toBeNull();
  expect(completed.focusedDurationMs).toBe(15 * 60_000);
  expect(completed.note).toBe('deep work');
  expect(completed.qualityRating).toBe(4);
  expect(completed.plannedDurationMinutes).toBe(50);
});

it('abandons from running or paused and still records focused duration', () => {
  const abandonedRunning = unwrap(abandonFocusSession(start(), T10));
  expect(abandonedRunning.status).toBe('abandoned');
  expect(abandonedRunning.focusedDurationMs).toBe(10 * 60_000);
  expect(abandonedRunning.endedAt).toBe(T10);

  const paused = unwrap(pauseFocusSession(start({ id: 's2' }), T10));
  const abandonedPaused = unwrap(abandonFocusSession(paused, T30));
  expect(abandonedPaused.status).toBe('abandoned');
  expect(abandonedPaused.focusedDurationMs).toBe(10 * 60_000);

  const abandonedWithReflection = unwrap(
    abandonFocusSession(start({ id: 's3' }), T10, { note: '  got distracted  ', qualityRating: 2 }),
  );
  expect(abandonedWithReflection.status).toBe('abandoned');
  expect(abandonedWithReflection.note).toBe('got distracted');
  expect(abandonedWithReflection.qualityRating).toBe(2);
});

it('rejects invalid quality rating when abandoning', () => {
  const running = start();
  // @ts-expect-error invalid rating test
  const invalid = abandonFocusSession(running, T10, { qualityRating: 6 });
  expect(invalid.ok).toBe(false);
  if (!invalid.ok) expect(invalid.code).toBe('invalid_transition');
});

it('rejects impossible transitions', () => {
  const running = start();
  expect(resumeFocusSession(running, T10).ok).toBe(false);
  const paused = unwrap(pauseFocusSession(running, T10));
  expect(pauseFocusSession(paused, T15).ok).toBe(false);
  const completed = unwrap(completeFocusSession(paused, T20));
  expect(pauseFocusSession(completed, T30).ok).toBe(false);
  expect(resumeFocusSession(completed, T30).ok).toBe(false);
  expect(completeFocusSession(completed, T30).ok).toBe(false);
  expect(abandonFocusSession(completed, T30).ok).toBe(false);
  for (const result of [
    resumeFocusSession(running, T10),
    pauseFocusSession(paused, T15),
    completeFocusSession(completed, T30),
  ]) {
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('invalid_transition');
  }
});

it('computes start latency from local minute versus TimeBlock start', () => {
  const startedAt = new Date(2026, 7, 31, 17, 12, 0);
  expect(localMinuteOfDay(startedAt)).toBe(17 * 60 + 12);
  expect(computeStartLatencyMinutes(17 * 60, startedAt)).toBe(12);
  expect(computeStartLatencyMinutes(18 * 60, startedAt)).toBe(-48);
});

it('rejects corrupt session combinations during validation', () => {
  const running = start();
  const withoutClock: FocusSession = { ...running, runningSince: null };
  expect(validateFocusSession(withoutClock).ok).toBe(false);

  const inverted: FocusSession = {
    ...running,
    status: 'completed',
    runningSince: null,
    endedAt: '2026-08-31T07:00:00.000Z',
    focusedDurationMs: 1000,
  };
  expect(validateFocusSession(inverted).ok).toBe(false);

  const negative: FocusSession = { ...running, accumulatedFocusMs: -1 };
  expect(validateFocusSession(negative).ok).toBe(false);

  const runningSinceBeforeStartedAt: FocusSession = {
    ...running,
    startedAt: '2026-08-31T08:00:00.000Z',
    runningSince: '2026-08-31T07:59:59.999Z',
  };
  const runningSinceRes = validateFocusSession(runningSinceBeforeStartedAt);
  expect(runningSinceRes.ok).toBe(false);
  if (!runningSinceRes.ok) expect(runningSinceRes.code).toBe('corrupt_record');

  const invalidTimestamps: FocusSession = {
    ...running,
    createdAt: 'not-a-date',
  };
  expect(validateFocusSession(invalidTimestamps).ok).toBe(false);

  const invertedCreatedUpdated: FocusSession = {
    ...running,
    createdAt: '2026-08-31T08:00:00.000Z',
    updatedAt: '2026-08-31T07:00:00.000Z',
  };
  expect(validateFocusSession(invertedCreatedUpdated).ok).toBe(false);

  const durationExceedsWallClock: FocusSession = {
    ...running,
    status: 'completed',
    runningSince: null,
    startedAt: '2026-08-31T08:00:00.000Z',
    endedAt: '2026-08-31T08:10:00.000Z', // 10 minutes = 600,000 ms
    accumulatedFocusMs: 0,
    focusedDurationMs: 600_001, // 10 min 1 ms -> impossible
  };
  expect(validateFocusSession(durationExceedsWallClock).ok).toBe(false);

  const accumulatedExceedsFinalized: FocusSession = {
    ...running,
    status: 'completed',
    runningSince: null,
    startedAt: '2026-08-31T08:00:00.000Z',
    endedAt: '2026-08-31T08:10:00.000Z',
    accumulatedFocusMs: 500_000,
    focusedDurationMs: 400_000,
  };
  expect(validateFocusSession(accumulatedExceedsFinalized).ok).toBe(false);

  const runningImpossibleAccumulated: FocusSession = {
    ...running,
    startedAt: '2026-08-31T08:00:00.000Z',
    updatedAt: '2026-08-31T08:10:00.000Z', // 10 min window = 600,000 ms
    runningSince: '2026-08-31T08:10:00.000Z',
    accumulatedFocusMs: 5 * 3600_000, // 5 hours -> impossible
    status: 'running',
  };
  const resRunning = validateFocusSession(runningImpossibleAccumulated);
  expect(resRunning.ok).toBe(false);
  if (!resRunning.ok) expect(resRunning.code).toBe('corrupt_record');

  const pausedImpossibleAccumulated: FocusSession = {
    ...running,
    startedAt: '2026-08-31T08:00:00.000Z',
    updatedAt: '2026-08-31T08:10:00.000Z', // 10 min window = 600,000 ms
    runningSince: null,
    accumulatedFocusMs: 5 * 3600_000, // 5 hours -> impossible
    status: 'paused',
  };
  const resPaused = validateFocusSession(pausedImpossibleAccumulated);
  expect(resPaused.ok).toBe(false);
  if (!resPaused.ok) expect(resPaused.code).toBe('corrupt_record');

  const updatedAtBeforeStartedAt: FocusSession = {
    ...running,
    startedAt: '2026-08-31T08:00:00.000Z',
    updatedAt: '2026-08-31T07:50:00.000Z',
    createdAt: '2026-08-31T07:50:00.000Z',
    runningSince: '2026-08-31T08:00:00.000Z',
  };
  expect(validateFocusSession(updatedAtBeforeStartedAt).ok).toBe(false);
});

it('rejects live clock rollback during pause, resume, finish and abandon transitions', () => {
  const running = start(); // startedAt = T0 (08:00), runningSince = T0, updatedAt = T0

  // Pause with clock moved backward before runningSince (07:59 < 08:00)
  const pausePast = pauseFocusSession(running, '2026-08-31T07:59:00.000Z');
  expect(pausePast.ok).toBe(false);
  if (!pausePast.ok) expect(pausePast.code).toBe('invalid_transition');

  // Pause at 08:10 (valid), now updatedAt is 08:10
  const paused = unwrap(pauseFocusSession(running, T10));

  // Resume with clock moved backward before updatedAt (08:05 < 08:10)
  const resumePast = resumeFocusSession(paused, '2026-08-31T08:05:00.000Z');
  expect(resumePast.ok).toBe(false);
  if (!resumePast.ok) expect(resumePast.code).toBe('invalid_transition');

  // Finish running session with clock before runningSince
  const finishRunningPast = completeFocusSession(running, '2026-08-31T07:59:00.000Z');
  expect(finishRunningPast.ok).toBe(false);
  if (!finishRunningPast.ok) expect(finishRunningPast.code).toBe('invalid_transition');

  // Abandon running session with clock before runningSince
  const abandonRunningPast = abandonFocusSession(running, '2026-08-31T07:59:00.000Z');
  expect(abandonRunningPast.ok).toBe(false);
  if (!abandonRunningPast.ok) expect(abandonRunningPast.code).toBe('invalid_transition');

  // Finish paused session with clock before updatedAt
  const finishPausedPast = completeFocusSession(paused, '2026-08-31T08:05:00.000Z');
  expect(finishPausedPast.ok).toBe(false);
  if (!finishPausedPast.ok) expect(finishPausedPast.code).toBe('invalid_transition');

  // Abandon paused session with clock before updatedAt
  const abandonPausedPast = abandonFocusSession(paused, '2026-08-31T08:05:00.000Z');
  expect(abandonPausedPast.ok).toBe(false);
  if (!abandonPausedPast.ok) expect(abandonPausedPast.code).toBe('invalid_transition');
});
