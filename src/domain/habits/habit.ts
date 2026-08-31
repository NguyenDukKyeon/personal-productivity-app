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
