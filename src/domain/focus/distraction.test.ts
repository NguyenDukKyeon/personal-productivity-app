import { expect, it } from 'vitest';
import { canCaptureDistraction, createDistraction, validateDistraction } from './distraction';

const capturedAt = '2026-08-31T08:05:00.000Z';

it('creates a trimmed distraction with required text', () => {
  const created = createDistraction({
    id: 'd1',
    focusSessionId: 's1',
    text: '  check TikTok  ',
    capturedAt,
  });
  expect(created).toEqual({
    ok: true,
    value: {
      id: 'd1',
      focusSessionId: 's1',
      text: 'check TikTok',
      capturedAt,
    },
  });
});

it('rejects blank and oversized distraction text', () => {
  const blank = createDistraction({ id: 'd1', focusSessionId: 's1', text: '   ', capturedAt });
  expect(blank.ok).toBe(false);
  if (!blank.ok) expect(blank.code).toBe('invalid_distraction');

  const tooLong = createDistraction({
    id: 'd1',
    focusSessionId: 's1',
    text: 'x'.repeat(201),
    capturedAt,
  });
  expect(tooLong.ok).toBe(false);
  if (!tooLong.ok) expect(tooLong.code).toBe('invalid_distraction');
});

it('allows capture only while a session is running or paused', () => {
  expect(canCaptureDistraction('running')).toBe(true);
  expect(canCaptureDistraction('paused')).toBe(true);
  expect(canCaptureDistraction('completed')).toBe(false);
  expect(canCaptureDistraction('abandoned')).toBe(false);
});

it('counts interruptions as the number of recorded distractions', () => {
  const first = createDistraction({ id: 'd1', focusSessionId: 's1', text: 'message', capturedAt });
  const second = createDistraction({ id: 'd2', focusSessionId: 's1', text: 'idea', capturedAt });
  expect(first.ok && second.ok).toBe(true);
  if (first.ok && second.ok) {
    expect([first.value, second.value]).toHaveLength(2);
  }
});

it('leaves invalid stored distractions as validation failures', () => {
  expect(
    validateDistraction({
      id: 'd1',
      focusSessionId: 's1',
      text: '',
      capturedAt,
    }).ok,
  ).toBe(false);

  const invalidTimestamp = validateDistraction({
    id: 'd1',
    focusSessionId: 's1',
    text: 'valid text',
    capturedAt: 'not-a-valid-date',
  });
  expect(invalidTimestamp.ok).toBe(false);
  if (!invalidTimestamp.ok) {
    expect(invalidTimestamp.code).toBe('corrupt_record');
  }
});
