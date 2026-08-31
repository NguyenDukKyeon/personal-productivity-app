import { describe, expect, it } from 'vitest';
import {
  createDailySchedule,
  createWeekdaySchedule,
  getIsoWeekdayFromDateKey,
  isHabitScheduledForDate,
} from './habit-schedule';

describe('habit-schedule', () => {
  it('creates a valid daily schedule', () => {
    const scheduleResult = createDailySchedule();
    expect(scheduleResult.ok).toBe(true);
    if (!scheduleResult.ok) return;
    expect(scheduleResult.value).toEqual({ kind: 'daily' });
  });

  it('creates a valid weekday schedule and normalizes sorted unique weekdays', () => {
    const scheduleResult = createWeekdaySchedule([5, 1, 3, 1]);
    expect(scheduleResult.ok).toBe(true);
    if (!scheduleResult.ok) return;
    expect(scheduleResult.value).toEqual({
      kind: 'weekdays',
      weekdays: [1, 3, 5],
    });
  });

  it('rejects invalid or empty weekdays', () => {
    expect(createWeekdaySchedule([]).ok).toBe(false);
    expect(createWeekdaySchedule([0, 8]).ok).toBe(false);
    expect(createWeekdaySchedule([1.5]).ok).toBe(false);
  });

  it('evaluates ISO weekday accurately without UTC day drift', () => {
    // 2026-08-31 is a Monday -> ISO weekday 1
    expect(getIsoWeekdayFromDateKey('2026-08-31')).toBe(1);
    // 2026-09-06 is a Sunday -> ISO weekday 7
    expect(getIsoWeekdayFromDateKey('2026-09-06')).toBe(7);
    // Invalid date returns null
    expect(getIsoWeekdayFromDateKey('invalid-date')).toBe(null);
  });

  it('correctly determines habit eligibility on a specific calendar date', () => {
    const daily = createDailySchedule();
    if (!daily.ok) throw new Error('Daily schedule creation failed');

    const monWedFri = createWeekdaySchedule([1, 3, 5]);
    if (!monWedFri.ok) throw new Error('Weekday schedule creation failed');

    // 2026-08-31 is Monday (1)
    expect(isHabitScheduledForDate(daily.value, '2026-08-31')).toBe(true);
    expect(isHabitScheduledForDate(monWedFri.value, '2026-08-31')).toBe(true);

    // 2026-09-01 is Tuesday (2)
    expect(isHabitScheduledForDate(daily.value, '2026-09-01')).toBe(true);
    expect(isHabitScheduledForDate(monWedFri.value, '2026-09-01')).toBe(false);

    // 2026-09-02 is Wednesday (3)
    expect(isHabitScheduledForDate(monWedFri.value, '2026-09-02')).toBe(true);
  });
});
