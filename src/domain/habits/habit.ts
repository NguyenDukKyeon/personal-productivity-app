import { err, ok, type Result } from '../shared/result';
import type { HabitSchedule } from './habit-schedule';

export type HabitStatus = 'active' | 'archived';

export interface Habit {
  id: string;
  title: string;
  description: string;
  cue: string;
  minimumVersion: string;
  schedule: HabitSchedule;
  routineId: string | null;
  status: HabitStatus;
  createdAt: string;
  updatedAt: string;
}

export type HabitError =
  | 'invalid_habit_id'
  | 'empty_title'
  | 'title_too_long'
  | 'empty_minimum_version'
  | 'minimum_version_too_long'
  | 'cue_too_long'
  | 'description_too_long';

export interface CreateHabitDomainInput {
  id: string;
  title: string;
  description?: string;
  cue?: string;
  minimumVersion: string;
  schedule: HabitSchedule;
  routineId?: string | null;
  status?: HabitStatus;
  nowIso?: string;
}

export interface UpdateHabitDomainPatch {
  title?: string;
  description?: string;
  cue?: string;
  minimumVersion?: string;
  schedule?: HabitSchedule;
  routineId?: string | null;
}

const MAX_TITLE_LENGTH = 120;
const MAX_MINIMUM_VERSION_LENGTH = 160;
const MAX_CUE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 500;

export function createHabit(
  input: CreateHabitDomainInput,
): Result<Habit, HabitError> {
  const id = input.id.trim();
  if (!id) return err('invalid_habit_id');

  const title = input.title.trim();
  if (!title) return err('empty_title');
  if (title.length > MAX_TITLE_LENGTH) return err('title_too_long');

  const minimumVersion = input.minimumVersion.trim();
  if (!minimumVersion) return err('empty_minimum_version');
  if (minimumVersion.length > MAX_MINIMUM_VERSION_LENGTH)
    return err('minimum_version_too_long');

  const cue = (input.cue ?? '').trim();
  if (cue.length > MAX_CUE_LENGTH) return err('cue_too_long');

  const description = (input.description ?? '').trim();
  if (description.length > MAX_DESCRIPTION_LENGTH)
    return err('description_too_long');

  const now = input.nowIso ?? new Date().toISOString();

  return ok({
    id,
    title,
    description,
    cue,
    minimumVersion,
    schedule: input.schedule,
    routineId: input.routineId ? input.routineId.trim() : null,
    status: input.status ?? 'active',
    createdAt: now,
    updatedAt: now,
  });
}

export function updateHabit(
  habit: Habit,
  patch: UpdateHabitDomainPatch,
  nowIso?: string,
): Result<Habit, HabitError> {
  const title = patch.title !== undefined ? patch.title.trim() : habit.title;
  if (!title) return err('empty_title');
  if (title.length > MAX_TITLE_LENGTH) return err('title_too_long');

  const minimumVersion =
    patch.minimumVersion !== undefined
      ? patch.minimumVersion.trim()
      : habit.minimumVersion;
  if (!minimumVersion) return err('empty_minimum_version');
  if (minimumVersion.length > MAX_MINIMUM_VERSION_LENGTH)
    return err('minimum_version_too_long');

  const cue = patch.cue !== undefined ? patch.cue.trim() : habit.cue;
  if (cue.length > MAX_CUE_LENGTH) return err('cue_too_long');

  const description =
    patch.description !== undefined
      ? patch.description.trim()
      : habit.description;
  if (description.length > MAX_DESCRIPTION_LENGTH)
    return err('description_too_long');

  const schedule = patch.schedule ?? habit.schedule;
  const routineId =
    patch.routineId !== undefined
      ? patch.routineId
        ? patch.routineId.trim()
        : null
      : habit.routineId;

  const now = nowIso ?? new Date().toISOString();

  return ok({
    ...habit,
    title,
    description,
    cue,
    minimumVersion,
    schedule,
    routineId,
    updatedAt: now,
  });
}

export function archiveHabit(habit: Habit, nowIso?: string): Habit {
  const now = nowIso ?? new Date().toISOString();
  return {
    ...habit,
    status: 'archived',
    updatedAt: now,
  };
}

export function unarchiveHabit(habit: Habit, nowIso?: string): Habit {
  const now = nowIso ?? new Date().toISOString();
  return {
    ...habit,
    status: 'active',
    updatedAt: now,
  };
}
