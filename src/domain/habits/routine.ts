import { err, ok, type Result } from '../shared/result';

export interface Routine {
  id: string;
  name: string;
  contextLabel: string;
  habitIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type RoutineError =
  | 'invalid_routine_id'
  | 'empty_name'
  | 'name_too_long'
  | 'context_label_too_long';

export interface CreateRoutineDomainInput {
  id: string;
  name: string;
  contextLabel?: string;
  habitIds?: string[];
  nowIso?: string;
}

export interface UpdateRoutineDomainPatch {
  name?: string;
  contextLabel?: string;
  habitIds?: string[];
}

const MAX_NAME_LENGTH = 60;
const MAX_CONTEXT_LABEL_LENGTH = 60;

function deduplicateHabitIds(ids?: string[]): string[] {
  if (!Array.isArray(ids)) return [];
  const set = new Set<string>();
  const result: string[] = [];
  for (const item of ids) {
    const trimmed = typeof item === 'string' ? item.trim() : '';
    if (trimmed && !set.has(trimmed)) {
      set.add(trimmed);
      result.push(trimmed);
    }
  }
  return result;
}

export function createRoutine(
  input: CreateRoutineDomainInput,
): Result<Routine, RoutineError> {
  const id = input.id.trim();
  if (!id) return err('invalid_routine_id');

  const name = input.name.trim();
  if (!name) return err('empty_name');
  if (name.length > MAX_NAME_LENGTH) return err('name_too_long');

  const contextLabel = (input.contextLabel ?? '').trim();
  if (contextLabel.length > MAX_CONTEXT_LABEL_LENGTH)
    return err('context_label_too_long');

  const habitIds = deduplicateHabitIds(input.habitIds);
  const now = input.nowIso ?? new Date().toISOString();

  return ok({
    id,
    name,
    contextLabel,
    habitIds,
    createdAt: now,
    updatedAt: now,
  });
}

export function updateRoutine(
  routine: Routine,
  patch: UpdateRoutineDomainPatch,
  nowIso?: string,
): Result<Routine, RoutineError> {
  const name = patch.name !== undefined ? patch.name.trim() : routine.name;
  if (!name) return err('empty_name');
  if (name.length > MAX_NAME_LENGTH) return err('name_too_long');

  const contextLabel =
    patch.contextLabel !== undefined
      ? patch.contextLabel.trim()
      : routine.contextLabel;
  if (contextLabel.length > MAX_CONTEXT_LABEL_LENGTH)
    return err('context_label_too_long');

  const habitIds =
    patch.habitIds !== undefined
      ? deduplicateHabitIds(patch.habitIds)
      : routine.habitIds;

  const now = nowIso ?? new Date().toISOString();

  return ok({
    ...routine,
    name,
    contextLabel,
    habitIds,
    updatedAt: now,
  });
}

export function addHabitToRoutine(
  routine: Routine,
  habitId: string,
  nowIso?: string,
): Routine {
  const trimmedId = habitId.trim();
  if (!trimmedId || routine.habitIds.includes(trimmedId)) {
    return routine;
  }
  const now = nowIso ?? new Date().toISOString();
  return {
    ...routine,
    habitIds: [...routine.habitIds, trimmedId],
    updatedAt: now,
  };
}

export function removeHabitFromRoutine(
  routine: Routine,
  habitId: string,
  nowIso?: string,
): Routine {
  const trimmedId = habitId.trim();
  if (!routine.habitIds.includes(trimmedId)) {
    return routine;
  }
  const now = nowIso ?? new Date().toISOString();
  return {
    ...routine,
    habitIds: routine.habitIds.filter((id) => id !== trimmedId),
    updatedAt: now,
  };
}

export function reorderRoutineHabits(
  routine: Routine,
  orderedHabitIds: string[],
  nowIso?: string,
): Routine {
  const habitIds = deduplicateHabitIds(orderedHabitIds);
  const now = nowIso ?? new Date().toISOString();
  return {
    ...routine,
    habitIds,
    updatedAt: now,
  };
}
