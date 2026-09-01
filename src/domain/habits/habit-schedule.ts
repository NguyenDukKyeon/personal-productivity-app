import { parseLocalDateKey } from '../shared/local-date';
import { err, ok, type Result } from '../shared/result';

export type WeekdayNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1 = Monday, 7 = Sunday

export interface DailySchedule {
  kind: 'daily';
}

export interface WeekdaySchedule {
  kind: 'weekdays';
  weekdays: WeekdayNumber[];
}

export type HabitSchedule = DailySchedule | WeekdaySchedule;

export function createDailySchedule(): Result<DailySchedule> {
  return ok({ kind: 'daily' });
}

export function createWeekdaySchedule(
  weekdays: number[],
): Result<WeekdaySchedule> {
  if (!Array.isArray(weekdays) || weekdays.length === 0) {
    return err('empty_weekdays', 'At least one weekday must be selected.');
  }

  const validSet = new Set<WeekdayNumber>();
  for (const day of weekdays) {
    if (!Number.isInteger(day) || day < 1 || day > 7) {
      return err('invalid_weekday_number', 'Weekday must be an integer between 1 and 7.');
    }
    validSet.add(day as WeekdayNumber);
  }

  if (validSet.size === 0) {
    return err('empty_weekdays', 'At least one valid weekday must be selected.');
  }

  const sorted = Array.from(validSet).sort((a, b) => a - b);
  return ok({
    kind: 'weekdays',
    weekdays: sorted,
  });
}

/**
 * Deterministically computes ISO 8601 weekday number (1 = Monday ... 7 = Sunday)
 * from a calendar date key YYYY-MM-DD.
 */
export function getIsoWeekdayFromDateKey(dateKey: string): WeekdayNumber | null {
  const parts = parseLocalDateKey(dateKey);
  if (!parts) return null;

  // UTC Date avoids local daylight saving shifts while evaluating calendar math
  const utcDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const jsDay = utcDate.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const isoDay = jsDay === 0 ? 7 : (jsDay as WeekdayNumber);
  return isoDay;
}

export function isHabitScheduledForDate(
  schedule: HabitSchedule,
  dateKey: string,
): boolean {
  if (schedule.kind === 'daily') {
    const parts = parseLocalDateKey(dateKey);
    return parts !== null;
  }

  if (schedule.kind === 'weekdays') {
    const isoWeekday = getIsoWeekdayFromDateKey(dateKey);
    if (!isoWeekday) return false;
    return schedule.weekdays.includes(isoWeekday);
  }

  return false;
}
