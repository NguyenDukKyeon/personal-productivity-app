import { expect, it } from 'vitest';
import {
  actualMinutesFromCompletedSessions,
  elapsedFocusMs,
  openRunningMs,
  remainingFocusMs,
  type FocusTimingInput,
} from './focus-timing';

const T0 = Date.parse('2026-08-31T08:00:00.000Z');

function session(partial: Partial<FocusTimingInput> = {}): FocusTimingInput {
  return {
    status: 'running',
    mode: 'countdown',
    plannedDurationMinutes: 50,
    runningSince: '2026-08-31T08:00:00.000Z',
    accumulatedFocusMs: 0,
    focusedDurationMs: null,
    ...partial,
  };
}

it('reconstructs running elapsed as accumulated plus open segment', () => {
  const nowMs = T0 + 12 * 60_000;
  expect(openRunningMs(session(), nowMs)).toBe(12 * 60_000);
  expect(elapsedFocusMs(session({ accumulatedFocusMs: 180_000 }), nowMs)).toBe(180_000 + 12 * 60_000);
});

it('excludes paused wall-clock time from elapsed focus', () => {
  const paused = session({
    status: 'paused',
    runningSince: null,
    accumulatedFocusMs: 10 * 60_000,
  });
  expect(openRunningMs(paused, T0 + 40 * 60_000)).toBe(0);
  expect(elapsedFocusMs(paused, T0 + 40 * 60_000)).toBe(10 * 60_000);
});

it('uses finalized focusedDurationMs even if now advances', () => {
  const completed = session({
    status: 'completed',
    runningSince: null,
    accumulatedFocusMs: 12 * 60_000,
    focusedDurationMs: 12 * 60_000,
  });
  expect(elapsedFocusMs(completed, T0 + 90 * 60_000)).toBe(12 * 60_000);
});

it('excludes paused gaps across multiple pause/resume cycles', () => {
  // run 10, pause 5, run 5, pause 2, run 8 → 23 minutes focused
  const afterFirstPause = session({
    status: 'paused',
    runningSince: null,
    accumulatedFocusMs: 10 * 60_000,
  });
  expect(elapsedFocusMs(afterFirstPause, T0 + 15 * 60_000)).toBe(10 * 60_000);

  const secondRun = session({
    status: 'running',
    runningSince: '2026-08-31T08:15:00.000Z',
    accumulatedFocusMs: 10 * 60_000,
  });
  expect(elapsedFocusMs(secondRun, T0 + 20 * 60_000)).toBe(15 * 60_000);

  const afterSecondPause = session({
    status: 'paused',
    runningSince: null,
    accumulatedFocusMs: 15 * 60_000,
  });
  expect(elapsedFocusMs(afterSecondPause, T0 + 22 * 60_000)).toBe(15 * 60_000);

  const thirdRun = session({
    status: 'running',
    runningSince: '2026-08-31T08:22:00.000Z',
    accumulatedFocusMs: 15 * 60_000,
  });
  expect(elapsedFocusMs(thirdRun, T0 + 30 * 60_000)).toBe(23 * 60_000);
});

it('clamps future runningSince and invalid timestamps to zero open time', () => {
  expect(openRunningMs(session({ runningSince: '2026-08-31T09:00:00.000Z' }), T0)).toBe(0);
  expect(openRunningMs(session({ runningSince: 'not-a-date' }), T0 + 60_000)).toBe(0);
  expect(openRunningMs(session({ runningSince: '2026-08-31T08:00:00.000Z' }), Number.NaN)).toBe(0);
  expect(elapsedFocusMs(session({ accumulatedFocusMs: Number.NaN }), T0 + 60_000)).toBe(60_000);
  expect(elapsedFocusMs(session({ focusedDurationMs: -12 }), T0)).toBe(0);
});

it('returns remaining time only for countdown mode', () => {
  const nowMs = T0 + 12 * 60_000;
  expect(remainingFocusMs(session({ plannedDurationMinutes: 50 }), nowMs)).toBe(38 * 60_000);
  expect(remainingFocusMs(session({ plannedDurationMinutes: 10 }), nowMs)).toBe(0);
  expect(
    remainingFocusMs(
      session({ mode: 'flow', plannedDurationMinutes: null }),
      nowMs,
    ),
  ).toBeNull();
});

it('aggregates actual minutes from completed sessions only, rounding down', () => {
  expect(
    actualMinutesFromCompletedSessions([
      { status: 'completed', focusedDurationMs: 90_000 },
      { status: 'completed', focusedDurationMs: 75_000 },
      { status: 'abandoned', focusedDurationMs: 600_000 },
      { status: 'running', focusedDurationMs: null },
    ]),
  ).toBe(2);
  expect(actualMinutesFromCompletedSessions([])).toBe(0);
});
