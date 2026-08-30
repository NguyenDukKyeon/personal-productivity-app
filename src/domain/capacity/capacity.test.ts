import { expect, it } from 'vitest';
import { calculateCapacity, validateCapacityMinutes } from './capacity';

it('accepts the Smart Planner 0-16 hour capacity range in 30 minute steps', () => {
  expect(validateCapacityMinutes(0)).toEqual({ ok: true, value: 0 });
  expect(validateCapacityMinutes(960)).toEqual({ ok: true, value: 960 });
  expect(validateCapacityMinutes(301).ok).toBe(false);
  expect(validateCapacityMinutes(-30).ok).toBe(false);
  expect(validateCapacityMinutes(990).ok).toBe(false);
});

it('derives remaining time, overbooking and the high-capacity caution', () => {
  expect(calculateCapacity(300, 360)).toEqual({
    capacityMinutes: 300,
    scheduledMinutes: 360,
    remainingMinutes: -60,
    isOverbooked: true,
    showHighCapacityCaution: false,
  });
  expect(calculateCapacity(750, 0).showHighCapacityCaution).toBe(true);
});
