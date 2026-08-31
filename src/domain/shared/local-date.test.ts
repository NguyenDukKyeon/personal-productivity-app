import { afterEach, expect, it } from 'vitest';
import { parseLocalDateKey, shiftLocalDateKey, toLocalDateKey } from './local-date';

const originalTz = process.env.TZ;

afterEach(() => {
  process.env.TZ = originalTz;
});

it('uses the local calendar date instead of the UTC day', () => {
  process.env.TZ = 'Asia/Bangkok';
  expect(toLocalDateKey(new Date('2026-08-30T17:30:00.000Z'))).toBe('2026-08-31');
});

it('parses only valid YYYY-MM-DD calendar keys', () => {
  expect(parseLocalDateKey('2026-08-30')).toEqual({ year: 2026, month: 8, day: 30 });
  expect(parseLocalDateKey('2026-02-30')).toBeNull();
  expect(parseLocalDateKey('30-08-2026')).toBeNull();
});

it('shifts calendar keys without UTC ISO slicing', () => {
  expect(shiftLocalDateKey('2026-08-31', 1)).toBe('2026-09-01');
  expect(shiftLocalDateKey('2026-08-31', -2)).toBe('2026-08-29');
  expect(shiftLocalDateKey('not-a-date', 1)).toBeNull();
});
