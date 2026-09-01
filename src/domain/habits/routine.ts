import { err, ok, type Result } from '../shared/result';

export interface Routine {
  id: string;
  name: string;
  contextLabel: string;
  habitIds: string[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface CreateRoutineDomainInput {
  id: string;
  name: string;
  contextLabel?: string;
  nowIso?: string;
}

export interface UpdateRoutineDomainPatch {
  name?: string;
  contextLabel?: string;
}

const MAX_NAME_LENGTH = 60;
const MAX_CONTEXT_LABEL_LENGTH = 60;

function isValidIsoString(val: string): boolean {
  if (typeof val !== 'string' || !val) return false;
  const d = new Date(val);
  return !Number.isNaN(d.getTime()) && val.includes('T');
}

export function validateRoutinePreWrite(routine: Routine): Result<void> {
  const id = (routine.id ?? '').trim();
  if (!id) return err('invalid_routine_id', 'Routine ID cannot be empty.');

  const name = (routine.name ?? '').trim();
  if (!name) return err('empty_name', 'Routine name cannot be empty.');
  if (name.length > MAX_NAME_LENGTH)
    return err('name_too_long', `Routine name cannot exceed ${MAX_NAME_LENGTH} characters.`);

  const contextLabel = (routine.contextLabel ?? '').trim();
  if (contextLabel.length > MAX_CONTEXT_LABEL_LENGTH)
    return err(
      'context_label_too_long',
      `Context label cannot exceed ${MAX_CONTEXT_LABEL_LENGTH} characters.`,
    );

  if (!Array.isArray(routine.habitIds)) {
    return err('invalid_habit_ids', 'Routine habitIds must be an array.');
  }
  const uniqueSet = new Set(routine.habitIds);
  if (uniqueSet.size !== routine.habitIds.length) {
    return err('duplicate_habit_ids', 'Routine habitIds cannot contain duplicates.');
  }
  for (const hId of routine.habitIds) {
    if (typeof hId !== 'string' || !hId.trim()) {
      return err('invalid_habit_id', 'Habit IDs in routine must be non-empty strings.');
    }
  }

  if (!isValidIsoString(routine.createdAt)) {
    return err('invalid_created_at', 'Routine createdAt must be a valid ISO 8601 timestamp.');
  }
  if (!isValidIsoString(routine.updatedAt)) {
    return err('invalid_updated_at', 'Routine updatedAt must be a valid ISO 8601 timestamp.');
  }
  if (new Date(routine.updatedAt).getTime() < new Date(routine.createdAt).getTime()) {
    return err('updated_at_before_created_at', 'Routine updatedAt cannot precede createdAt.');
  }

  return ok(undefined);
}

export function createRoutine(
  input: CreateRoutineDomainInput,
): Result<Routine> {
  const id = input.id.trim();
  if (!id) return err('invalid_routine_id', 'Routine ID cannot be empty.');

  const name = input.name.trim();
  if (!name) return err('empty_name', 'Routine name cannot be empty.');
  if (name.length > MAX_NAME_LENGTH)
    return err('name_too_long', `Routine name cannot exceed ${MAX_NAME_LENGTH} characters.`);

  const contextLabel = (input.contextLabel ?? '').trim();
  if (contextLabel.length > MAX_CONTEXT_LABEL_LENGTH)
    return err(
      'context_label_too_long',
      `Context label cannot exceed ${MAX_CONTEXT_LABEL_LENGTH} characters.`,
    );

  const now = input.nowIso ?? new Date().toISOString();

  const routine: Routine = {
    id,
    name,
    contextLabel,
    habitIds: [],
    createdAt: now,
    updatedAt: now,
  };

  const validation = validateRoutinePreWrite(routine);
  if (!validation.ok) {
    return validation;
  }

  return ok(routine);
}

export function updateRoutine(
  routine: Routine,
  patch: UpdateRoutineDomainPatch,
  nowIso?: string,
): Result<Routine> {
  const name = patch.name !== undefined ? patch.name.trim() : routine.name;
  if (!name) return err('empty_name', 'Routine name cannot be empty.');
  if (name.length > MAX_NAME_LENGTH)
    return err('name_too_long', `Routine name cannot exceed ${MAX_NAME_LENGTH} characters.`);

  const contextLabel =
    patch.contextLabel !== undefined
      ? patch.contextLabel.trim()
      : routine.contextLabel;
  if (contextLabel.length > MAX_CONTEXT_LABEL_LENGTH)
    return err(
      'context_label_too_long',
      `Context label cannot exceed ${MAX_CONTEXT_LABEL_LENGTH} characters.`,
    );

  const now = nowIso ?? new Date().toISOString();

  const updated: Routine = {
    ...routine,
    name,
    contextLabel,
    updatedAt: now,
  };

  const validation = validateRoutinePreWrite(updated);
  if (!validation.ok) {
    return validation;
  }

  return ok(updated);
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
): Result<Routine> {
  if (!Array.isArray(orderedHabitIds)) {
    return err('invalid_habit_ids', 'Ordered habit IDs must be an array.');
  }
  const trimmedIds = orderedHabitIds.map((id) => (typeof id === 'string' ? id.trim() : ''));
  const uniqueSet = new Set(trimmedIds);
  if (uniqueSet.size !== trimmedIds.length) {
    return err('duplicate_habit_ids', 'Reorder list contains duplicate habit IDs.');
  }

  const currentSet = new Set(routine.habitIds);
  if (
    trimmedIds.length !== routine.habitIds.length ||
    !trimmedIds.every((id) => currentSet.has(id))
  ) {
    return err(
      'invalid_reorder_set',
      'Reorder must preserve the exact existing routine membership set.',
    );
  }

  const now = nowIso ?? new Date().toISOString();
  const updated: Routine = {
    ...routine,
    habitIds: trimmedIds,
    updatedAt: now,
  };

  const validation = validateRoutinePreWrite(updated);
  if (!validation.ok) {
    return validation;
  }

  return ok(updated);
}
