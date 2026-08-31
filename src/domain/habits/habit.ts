import { parseLocalDateKey, toLocalDateKey } from '../shared/local-date';
import { err, ok, type Result } from '../shared/result';
import {
  isHabitScheduledForDate as isScheduleMatchingDate,
  type HabitSchedule,
} from './habit-schedule';

export type HabitStatus = 'active' | 'archived';

export interface HabitLifecycleInterval {
  startDate: string; // YYYY-MM-DD local calendar date (inclusive)
  endDate: string | null; // YYYY-MM-DD local calendar date (exclusive: active for date < endDate), or null if active
}

export interface HabitScheduleRevision {
  effectiveFromDate: string; // YYYY-MM-DD local calendar date from which this schedule applies
  schedule: HabitSchedule;
}

export interface Habit {
  id: string;
  title: string;
  description: string;
  cue: string;
  minimumVersion: string;
  schedule: HabitSchedule; // Current/latest effective schedule
  scheduleRevisions: HabitScheduleRevision[]; // Chronological history of schedules
  activeIntervals: HabitLifecycleInterval[]; // Chronological active intervals
  status: HabitStatus;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface CreateHabitDomainInput {
  id: string;
  title: string;
  description?: string;
  cue?: string;
  minimumVersion: string;
  schedule: HabitSchedule;
  status?: HabitStatus;
  nowIso?: string;
}

export interface UpdateHabitDomainPatch {
  title?: string;
  description?: string;
  cue?: string;
  minimumVersion?: string;
  schedule?: HabitSchedule;
}

const MAX_TITLE_LENGTH = 120;
const MAX_MINIMUM_VERSION_LENGTH = 160;
const MAX_CUE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 500;

function isValidIsoString(val: string): boolean {
  if (typeof val !== 'string' || !val) return false;
  const d = new Date(val);
  return !Number.isNaN(d.getTime()) && val.includes('T');
}

export function isHabitActiveOnDate(habit: Habit, dateKey: string): boolean {
  if (!parseLocalDateKey(dateKey)) return false;
  for (const interval of habit.activeIntervals) {
    if (dateKey >= interval.startDate) {
      if (interval.endDate === null || dateKey < interval.endDate) {
        return true;
      }
    }
  }
  return false;
}

export function getEffectiveScheduleForDate(
  habit: Habit,
  dateKey: string,
): HabitSchedule | null {
  if (!parseLocalDateKey(dateKey)) return null;
  if (!Array.isArray(habit.scheduleRevisions) || habit.scheduleRevisions.length === 0) {
    return habit.schedule;
  }

  // Revisions in chronological order
  const sorted = [...habit.scheduleRevisions].sort((a, b) =>
    a.effectiveFromDate.localeCompare(b.effectiveFromDate),
  );

  let effective: HabitSchedule | null = null;
  for (const rev of sorted) {
    if (rev.effectiveFromDate <= dateKey) {
      effective = rev.schedule;
    } else {
      break;
    }
  }

  return effective;
}

export function isHabitScheduledOnDate(habit: Habit, dateKey: string): boolean {
  if (!isHabitActiveOnDate(habit, dateKey)) {
    return false;
  }
  const schedule = getEffectiveScheduleForDate(habit, dateKey);
  if (!schedule) {
    return false;
  }
  return isScheduleMatchingDate(schedule, dateKey);
}

export function validateHabitPreWrite(habit: Habit): Result<void> {
  const id = (habit.id ?? '').trim();
  if (!id) return err('invalid_habit_id', 'Habit ID cannot be empty.');

  const title = (habit.title ?? '').trim();
  if (!title) return err('empty_title', 'Habit title cannot be empty.');
  if (title.length > MAX_TITLE_LENGTH)
    return err('title_too_long', `Habit title cannot exceed ${MAX_TITLE_LENGTH} characters.`);

  const minimumVersion = (habit.minimumVersion ?? '').trim();
  if (!minimumVersion)
    return err('empty_minimum_version', 'Minimum viable version cannot be empty.');
  if (minimumVersion.length > MAX_MINIMUM_VERSION_LENGTH)
    return err(
      'minimum_version_too_long',
      `Minimum viable version cannot exceed ${MAX_MINIMUM_VERSION_LENGTH} characters.`,
    );

  const cue = (habit.cue ?? '').trim();
  if (cue.length > MAX_CUE_LENGTH)
    return err('cue_too_long', `Cue cannot exceed ${MAX_CUE_LENGTH} characters.`);

  const description = (habit.description ?? '').trim();
  if (description.length > MAX_DESCRIPTION_LENGTH)
    return err(
      'description_too_long',
      `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters.`,
    );

  if (!isValidIsoString(habit.createdAt)) {
    return err('invalid_created_at', 'Habit createdAt must be a valid ISO 8601 timestamp.');
  }
  if (!isValidIsoString(habit.updatedAt)) {
    return err('invalid_updated_at', 'Habit updatedAt must be a valid ISO 8601 timestamp.');
  }
  if (new Date(habit.updatedAt).getTime() < new Date(habit.createdAt).getTime()) {
    return err('updated_at_before_created_at', 'Habit updatedAt cannot precede createdAt.');
  }

  if (!Array.isArray(habit.activeIntervals) || habit.activeIntervals.length === 0) {
    return err('empty_active_intervals', 'Habit activeIntervals cannot be empty.');
  }
  for (const interval of habit.activeIntervals) {
    if (!parseLocalDateKey(interval.startDate)) {
      return err('invalid_interval_start_date', 'Interval startDate must be a valid YYYY-MM-DD date.');
    }
    if (interval.endDate !== null) {
      if (!parseLocalDateKey(interval.endDate)) {
        return err('invalid_interval_end_date', 'Interval endDate must be a valid YYYY-MM-DD date.');
      }
      if (interval.endDate < interval.startDate) {
        return err('invalid_interval_range', 'Interval endDate cannot precede startDate.');
      }
    }
  }

  if (!Array.isArray(habit.scheduleRevisions) || habit.scheduleRevisions.length === 0) {
    return err('empty_schedule_revisions', 'Habit scheduleRevisions cannot be empty.');
  }
  for (const rev of habit.scheduleRevisions) {
    if (!parseLocalDateKey(rev.effectiveFromDate)) {
      return err('invalid_effective_from_date', 'Schedule revision effectiveFromDate must be a valid YYYY-MM-DD date.');
    }
    if (rev.schedule.kind === 'weekdays') {
      if (!Array.isArray(rev.schedule.weekdays) || rev.schedule.weekdays.length === 0) {
        return err('empty_weekdays', 'Weekday schedule must contain at least one day.');
      }
      const uniqueDays = new Set(rev.schedule.weekdays);
      if (uniqueDays.size !== rev.schedule.weekdays.length) {
        return err('duplicate_weekdays', 'Weekday schedule cannot contain duplicates.');
      }
      for (const d of rev.schedule.weekdays) {
        if (!Number.isInteger(d) || d < 1 || d > 7) {
          return err('invalid_weekday_number', 'Weekday number must be an integer between 1 and 7.');
        }
      }
    }
  }

  return ok(undefined);
}

export function createHabit(
  input: CreateHabitDomainInput,
): Result<Habit> {
  const id = input.id.trim();
  if (!id) return err('invalid_habit_id', 'Habit ID cannot be empty.');

  const title = input.title.trim();
  if (!title) return err('empty_title', 'Habit title cannot be empty.');
  if (title.length > MAX_TITLE_LENGTH)
    return err('title_too_long', `Habit title cannot exceed ${MAX_TITLE_LENGTH} characters.`);

  const minimumVersion = input.minimumVersion.trim();
  if (!minimumVersion)
    return err('empty_minimum_version', 'Minimum viable version cannot be empty.');
  if (minimumVersion.length > MAX_MINIMUM_VERSION_LENGTH)
    return err(
      'minimum_version_too_long',
      `Minimum viable version cannot exceed ${MAX_MINIMUM_VERSION_LENGTH} characters.`,
    );

  const cue = (input.cue ?? '').trim();
  if (cue.length > MAX_CUE_LENGTH)
    return err('cue_too_long', `Cue cannot exceed ${MAX_CUE_LENGTH} characters.`);

  const description = (input.description ?? '').trim();
  if (description.length > MAX_DESCRIPTION_LENGTH)
    return err(
      'description_too_long',
      `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters.`,
    );

  const now = input.nowIso ?? new Date().toISOString();
  const createdDateKey = toLocalDateKey(new Date(now));

  const habit: Habit = {
    id,
    title,
    description,
    cue,
    minimumVersion,
    schedule: input.schedule,
    scheduleRevisions: [
      {
        effectiveFromDate: createdDateKey,
        schedule: input.schedule,
      },
    ],
    activeIntervals: [
      {
        startDate: createdDateKey,
        endDate: null,
      },
    ],
    status: input.status ?? 'active',
    createdAt: now,
    updatedAt: now,
  };

  const validation = validateHabitPreWrite(habit);
  if (!validation.ok) {
    return validation;
  }

  return ok(habit);
}

export function updateHabit(
  habit: Habit,
  patch: UpdateHabitDomainPatch,
  nowIso?: string,
): Result<Habit> {
  const title = patch.title !== undefined ? patch.title.trim() : habit.title;
  if (!title) return err('empty_title', 'Habit title cannot be empty.');
  if (title.length > MAX_TITLE_LENGTH)
    return err('title_too_long', `Habit title cannot exceed ${MAX_TITLE_LENGTH} characters.`);

  const minimumVersion =
    patch.minimumVersion !== undefined
      ? patch.minimumVersion.trim()
      : habit.minimumVersion;
  if (!minimumVersion)
    return err('empty_minimum_version', 'Minimum viable version cannot be empty.');
  if (minimumVersion.length > MAX_MINIMUM_VERSION_LENGTH)
    return err(
      'minimum_version_too_long',
      `Minimum viable version cannot exceed ${MAX_MINIMUM_VERSION_LENGTH} characters.`,
    );

  const cue = patch.cue !== undefined ? patch.cue.trim() : habit.cue;
  if (cue.length > MAX_CUE_LENGTH)
    return err('cue_too_long', `Cue cannot exceed ${MAX_CUE_LENGTH} characters.`);

  const description =
    patch.description !== undefined
      ? patch.description.trim()
      : habit.description;
  if (description.length > MAX_DESCRIPTION_LENGTH)
    return err(
      'description_too_long',
      `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters.`,
    );

  const now = nowIso ?? new Date().toISOString();
  const effectiveDate = toLocalDateKey(new Date(now));

  let schedule = habit.schedule;
  const scheduleRevisions = [...habit.scheduleRevisions];

  if (patch.schedule && JSON.stringify(patch.schedule) !== JSON.stringify(habit.schedule)) {
    schedule = patch.schedule;
    const lastRev = scheduleRevisions[scheduleRevisions.length - 1];
    if (lastRev && lastRev.effectiveFromDate === effectiveDate) {
      scheduleRevisions[scheduleRevisions.length - 1] = {
        effectiveFromDate: effectiveDate,
        schedule: patch.schedule,
      };
    } else {
      scheduleRevisions.push({
        effectiveFromDate: effectiveDate,
        schedule: patch.schedule,
      });
    }
  }

  const updatedHabit: Habit = {
    ...habit,
    title,
    description,
    cue,
    minimumVersion,
    schedule,
    scheduleRevisions,
    updatedAt: now,
  };

  const validation = validateHabitPreWrite(updatedHabit);
  if (!validation.ok) {
    return validation;
  }

  return ok(updatedHabit);
}

export function archiveHabit(habit: Habit, nowIso?: string): Habit {
  const now = nowIso ?? new Date().toISOString();
  const archiveDate = toLocalDateKey(new Date(now));

  const activeIntervals = habit.activeIntervals.map((interval, idx) => {
    if (idx === habit.activeIntervals.length - 1 && interval.endDate === null) {
      const endDate = archiveDate >= interval.startDate ? archiveDate : interval.startDate;
      return { ...interval, endDate };
    }
    return interval;
  });

  return {
    ...habit,
    activeIntervals,
    status: 'archived',
    updatedAt: now,
  };
}

export function unarchiveHabit(habit: Habit, nowIso?: string): Habit {
  const now = nowIso ?? new Date().toISOString();
  const unarchiveDate = toLocalDateKey(new Date(now));

  const activeIntervals = [
    ...habit.activeIntervals,
    {
      startDate: unarchiveDate,
      endDate: null,
    },
  ];

  return {
    ...habit,
    activeIntervals,
    status: 'active',
    updatedAt: now,
  };
}
