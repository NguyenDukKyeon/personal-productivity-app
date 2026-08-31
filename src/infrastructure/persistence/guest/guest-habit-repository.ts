import type { IDBPDatabase, IDBPObjectStore } from 'idb';
import { z } from 'zod';
import {
  validateHabitPreWrite,
  type Habit,
  type HabitLifecycleInterval,
  type HabitScheduleRevision,
} from '@/domain/habits/habit';
import {
  validateCheckInPreWrite,
  type HabitCheckIn,
} from '@/domain/habits/habit-check-in';
import { type HabitSchedule, type WeekdayNumber } from '@/domain/habits/habit-schedule';
import {
  validateRoutinePreWrite,
  type Routine,
} from '@/domain/habits/routine';
import { parseLocalDateKey } from '@/domain/shared/local-date';
import { err, ok, type Result } from '@/domain/shared/result';
import type { HabitRepository } from '@/infrastructure/persistence/contracts/habit-repository';
import { openGuestTodayDb, type GuestTodayDB } from './guest-db';

export interface GuestHabitRepositoryOptions {
  databaseName?: string;
}

const CORRUPT_RECORD_MESSAGE = 'Stored data is invalid and was left untouched.';
const READ_FAILED_MESSAGE = 'Failed to read guest habit data.';
const WRITE_FAILED_MESSAGE = 'Failed to write guest habit data.';

type HabitStore = IDBPObjectStore<GuestTodayDB, ('habits' | 'routines')[], 'habits', 'readwrite'>;
type RoutineStore = IDBPObjectStore<GuestTodayDB, ('habits' | 'routines')[], 'routines', 'readwrite'>;

const weekdayNumberSchema: z.ZodType<WeekdayNumber> = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
]);

const habitScheduleSchema: z.ZodType<HabitSchedule> = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('daily') }),
  z.object({
    kind: z.literal('weekdays'),
    weekdays: z.array(weekdayNumberSchema).min(1),
  }),
]);

const habitScheduleRevisionSchema: z.ZodType<HabitScheduleRevision> = z.object({
  effectiveFromDate: z.string(),
  schedule: habitScheduleSchema,
});

const habitLifecycleIntervalSchema: z.ZodType<HabitLifecycleInterval> = z.object({
  startDate: z.string(),
  endDate: z.string().nullable(),
});

const habitSchema: z.ZodType<Habit> = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
  description: z.string().max(500),
  cue: z.string().max(120),
  minimumVersion: z.string().min(1).max(160),
  schedule: habitScheduleSchema,
  scheduleRevisions: z.array(habitScheduleRevisionSchema).min(1),
  activeIntervals: z.array(habitLifecycleIntervalSchema).min(1),
  status: z.enum(['active', 'archived']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const habitCheckInSchema: z.ZodType<HabitCheckIn> = z.object({
  id: z.string().min(1),
  habitId: z.string().min(1),
  date: z.string(),
  kind: z.enum(['full', 'minimum', 'skipped']),
  note: z.string().max(280),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const routineSchema: z.ZodType<Routine> = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  contextLabel: z.string().max(60),
  habitIds: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

function computeUpdatedAt(createdAt: string, nowIso?: string): string {
  const now = nowIso ?? new Date().toISOString();
  const createdMs = new Date(createdAt).getTime();
  const nowMs = new Date(now).getTime();
  if (nowMs < createdMs) {
    return createdAt;
  }
  return now;
}

function validateStoredDate(date: string): Result<void> {
  return parseLocalDateKey(date) ? ok(undefined) : err('corrupt_record', CORRUPT_RECORD_MESSAGE);
}

function parseRecord<T>(
  schema: z.ZodType<T>,
  value: unknown,
  validate?: (record: T) => Result<unknown>,
): Result<T> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    return err('corrupt_record', CORRUPT_RECORD_MESSAGE);
  }
  if (validate) {
    const semantic = validate(parsed.data);
    if (!semantic.ok) {
      return err('corrupt_record', CORRUPT_RECORD_MESSAGE);
    }
  }
  return ok(parsed.data);
}

function parseAllRecords<T>(
  schema: z.ZodType<T>,
  values: unknown[],
  validate?: (record: T) => Result<unknown>,
): Result<T[]> {
  const parsed: T[] = [];
  for (const val of values) {
    const res = parseRecord(schema, val, validate);
    if (!res.ok) {
      return err('corrupt_record', CORRUPT_RECORD_MESSAGE);
    }
    parsed.push(res.value);
  }
  return ok(parsed);
}

function readFailed(): Result<never> {
  return err('persistence_read_failed', READ_FAILED_MESSAGE);
}

function writeFailed(): Result<never> {
  return err('persistence_write_failed', WRITE_FAILED_MESSAGE);
}

function abortTx(tx: { abort: () => void }): void {
  try {
    tx.abort();
  } catch {
    // Transaction may already be aborting.
  }
}

async function settleAborted(tx: { abort: () => void; done: Promise<unknown> }): Promise<void> {
  abortTx(tx);
  try {
    await tx.done;
  } catch {
    // Expected: abort rejects the transaction completion promise.
  }
}

export class GuestHabitRepository implements HabitRepository {
  /**
   * Test-only hook. When true, the next atomic write aborts the open
   * IndexedDB transaction after its staged puts and returns
   * persistence_write_failed — no compensation writes.
   */
  failNextWrite = false;

  constructor(private readonly db: IDBPDatabase<GuestTodayDB>) {}

  private async settleForcedFailure(tx: {
    abort: () => void;
    done: Promise<unknown>;
  }): Promise<Result<never> | null> {
    if (!this.failNextWrite) return null;
    this.failNextWrite = false;
    await settleAborted(tx);
    return writeFailed();
  }

  async getHabit(id: string): Promise<Result<Habit | null>> {
    try {
      const raw = await this.db.get('habits', id);
      if (raw === undefined) return ok(null);
      return parseRecord(habitSchema, raw, validateHabitPreWrite);
    } catch {
      return readFailed();
    }
  }

  async listHabits(includeArchived = false): Promise<Result<Habit[]>> {
    try {
      const rawList = await this.db.getAll('habits');
      const allRes = parseAllRecords(habitSchema, rawList, validateHabitPreWrite);
      if (!allRes.ok) {
        return allRes;
      }
      if (includeArchived) {
        return ok(allRes.value);
      }
      return ok(allRes.value.filter((h) => h.status === 'active'));
    } catch {
      return readFailed();
    }
  }

  async saveHabit(habit: Habit): Promise<Result<void>> {
    const validation = validateHabitPreWrite(habit);
    if (!validation.ok) {
      return err('invalid_data', validation.message);
    }
    try {
      const tx = this.db.transaction('habits', 'readwrite');
      const existing = await tx.store.get(habit.id);
      if (existing !== undefined) {
        const parsedExisting = parseRecord(habitSchema, existing, validateHabitPreWrite);
        if (!parsedExisting.ok) {
          await settleAborted(tx);
          return err('corrupt_record', CORRUPT_RECORD_MESSAGE);
        }
      }
      await tx.store.put(habit);
      const forced = await this.settleForcedFailure(tx);
      if (forced) return forced;
      await tx.done;
      return ok(undefined);
    } catch {
      return writeFailed();
    }
  }

  async createHabitWithRoutine(habit: Habit, routineId: string | null): Promise<Result<void>> {
    const validation = validateHabitPreWrite(habit);
    if (!validation.ok) {
      return err('invalid_data', validation.message);
    }
    try {
      const tx = this.db.transaction(['habits', 'routines'], 'readwrite');
      const habitStore = tx.objectStore('habits');
      const routineStore = tx.objectStore('routines');

      await habitStore.put(habit);

      if (routineId) {
        const assignRes = await this.assignWithinTx(habitStore, routineStore, habit.id, routineId);
        if (!assignRes.ok) {
          await settleAborted(tx);
          return assignRes;
        }
      }

      const forced = await this.settleForcedFailure(tx);
      if (forced) return forced;
      await tx.done;
      return ok(undefined);
    } catch {
      return writeFailed();
    }
  }

  async updateHabitWithRoutine(
    previousHabit: Habit,
    nextHabit: Habit,
    routineId?: string | null,
  ): Promise<Result<void>> {
    if (previousHabit.id !== nextHabit.id) {
      return err('invalid_habit_id', 'Habit identity cannot change during update.');
    }
    const validation = validateHabitPreWrite(nextHabit);
    if (!validation.ok) {
      return err('invalid_data', validation.message);
    }
    try {
      const tx = this.db.transaction(['habits', 'routines'], 'readwrite');
      const habitStore = tx.objectStore('habits');
      const routineStore = tx.objectStore('routines');

      const existingRaw = await habitStore.get(nextHabit.id);
      if (existingRaw === undefined) {
        await settleAborted(tx);
        return err('habit_not_found', 'Habit not found.');
      }
      const existing = parseRecord(habitSchema, existingRaw, validateHabitPreWrite);
      if (!existing.ok) {
        await settleAborted(tx);
        return err('corrupt_record', CORRUPT_RECORD_MESSAGE);
      }

      await habitStore.put(nextHabit);

      if (routineId !== undefined) {
        if (routineId === null) {
          const removeRes = await this.removeWithinTx(habitStore, routineStore, nextHabit.id, false);
          if (!removeRes.ok) {
            await settleAborted(tx);
            return removeRes;
          }
        } else {
          const assignRes = await this.assignWithinTx(
            habitStore,
            routineStore,
            nextHabit.id,
            routineId,
          );
          if (!assignRes.ok) {
            await settleAborted(tx);
            return assignRes;
          }
        }
      }

      const forced = await this.settleForcedFailure(tx);
      if (forced) return forced;
      await tx.done;
      return ok(undefined);
    } catch {
      return writeFailed();
    }
  }

  async getCheckIn(habitId: string, dateKey: string): Promise<Result<HabitCheckIn | null>> {
    try {
      const tx = this.db.transaction('habitCheckIns', 'readonly');
      const index = tx.store.index('habitId_date');
      const raw = await index.get([habitId, dateKey]);
      if (raw === undefined) return ok(null);
      return parseRecord(habitCheckInSchema, raw, (c) => {
        const d = validateStoredDate(c.date);
        return d.ok ? validateCheckInPreWrite(c) : d;
      });
    } catch {
      return readFailed();
    }
  }

  async listCheckInsForHabit(habitId: string): Promise<Result<HabitCheckIn[]>> {
    try {
      const tx = this.db.transaction('habitCheckIns', 'readonly');
      const index = tx.store.index('habitId');
      const rawList = await index.getAll(habitId);
      return parseAllRecords(habitCheckInSchema, rawList, (c) => {
        const d = validateStoredDate(c.date);
        return d.ok ? validateCheckInPreWrite(c) : d;
      });
    } catch {
      return readFailed();
    }
  }

  async listCheckInsForDate(dateKey: string): Promise<Result<HabitCheckIn[]>> {
    try {
      const tx = this.db.transaction('habitCheckIns', 'readonly');
      const index = tx.store.index('date');
      const rawList = await index.getAll(dateKey);
      return parseAllRecords(habitCheckInSchema, rawList, (c) => {
        const d = validateStoredDate(c.date);
        return d.ok ? validateCheckInPreWrite(c) : d;
      });
    } catch {
      return readFailed();
    }
  }

  async listCheckInsInRange(startDateKey: string, endDateKey: string): Promise<Result<HabitCheckIn[]>> {
    try {
      const rawList = await this.db.getAll('habitCheckIns');
      const allRes = parseAllRecords(habitCheckInSchema, rawList, (c) => {
        const d = validateStoredDate(c.date);
        return d.ok ? validateCheckInPreWrite(c) : d;
      });
      if (!allRes.ok) {
        return allRes;
      }
      const filtered = allRes.value.filter((c) => c.date >= startDateKey && c.date <= endDateKey);
      return ok(filtered);
    } catch {
      return readFailed();
    }
  }

  async saveCheckIn(checkIn: HabitCheckIn): Promise<Result<void>> {
    const validation = validateCheckInPreWrite(checkIn);
    if (!validation.ok) {
      return err('invalid_data', validation.message);
    }
    try {
      const tx = this.db.transaction('habitCheckIns', 'readwrite');
      const index = tx.store.index('habitId_date');
      const existing = await index.get([checkIn.habitId, checkIn.date]);

      let recordToSave = checkIn;
      if (existing !== undefined) {
        const parsedExisting = parseRecord(habitCheckInSchema, existing, (c) => {
          const d = validateStoredDate(c.date);
          return d.ok ? validateCheckInPreWrite(c) : d;
        });
        if (!parsedExisting.ok) {
          await settleAborted(tx);
          return err('corrupt_record', CORRUPT_RECORD_MESSAGE);
        }

        recordToSave = {
          ...checkIn,
          createdAt: parsedExisting.value.createdAt,
          updatedAt: computeUpdatedAt(parsedExisting.value.createdAt, checkIn.updatedAt),
        };

        if (
          typeof existing === 'object' &&
          existing !== null &&
          'id' in existing &&
          existing.id !== recordToSave.id
        ) {
          await tx.store.delete(existing.id as string);
        }
      }

      const finalValidation = validateCheckInPreWrite(recordToSave);
      if (!finalValidation.ok) {
        await settleAborted(tx);
        return err('invalid_data', finalValidation.message);
      }

      await tx.store.put(recordToSave);
      const forced = await this.settleForcedFailure(tx);
      if (forced) return forced;
      await tx.done;
      return ok(undefined);
    } catch {
      return writeFailed();
    }
  }

  async deleteCheckIn(habitId: string, dateKey: string): Promise<Result<void>> {
    try {
      const tx = this.db.transaction('habitCheckIns', 'readwrite');
      const index = tx.store.index('habitId_date');
      const existing = await index.get([habitId, dateKey]);
      if (existing && typeof existing === 'object' && 'id' in existing) {
        await tx.store.delete(existing.id as string);
      }
      await tx.done;
      return ok(undefined);
    } catch {
      return writeFailed();
    }
  }

  async getRoutine(id: string): Promise<Result<Routine | null>> {
    try {
      const raw = await this.db.get('routines', id);
      if (raw === undefined) return ok(null);
      return parseRecord(routineSchema, raw, validateRoutinePreWrite);
    } catch {
      return readFailed();
    }
  }

  async listRoutines(): Promise<Result<Routine[]>> {
    try {
      const rawList = await this.db.getAll('routines');
      return parseAllRecords(routineSchema, rawList, validateRoutinePreWrite);
    } catch {
      return readFailed();
    }
  }

  async saveRoutine(routine: Routine): Promise<Result<void>> {
    const metadataProbe: Routine = { ...routine, habitIds: [] };
    const metadataValidation = validateRoutinePreWrite(metadataProbe);
    if (!metadataValidation.ok) {
      return err('invalid_data', metadataValidation.message);
    }
    try {
      const tx = this.db.transaction('routines', 'readwrite');
      const existingRaw = await tx.store.get(routine.id);
      if (existingRaw === undefined) {
        const created: Routine = {
          ...routine,
          habitIds: [],
        };
        const createdValidation = validateRoutinePreWrite(created);
        if (!createdValidation.ok) {
          await settleAborted(tx);
          return err('invalid_data', createdValidation.message);
        }
        await tx.store.put(created);
      } else {
        const parsedExisting = parseRecord(routineSchema, existingRaw, validateRoutinePreWrite);
        if (!parsedExisting.ok) {
          await settleAborted(tx);
          return err('corrupt_record', CORRUPT_RECORD_MESSAGE);
        }
        const updated: Routine = {
          ...parsedExisting.value,
          name: routine.name.trim(),
          contextLabel: routine.contextLabel.trim(),
          updatedAt: computeUpdatedAt(parsedExisting.value.createdAt, routine.updatedAt),
        };
        const updatedValidation = validateRoutinePreWrite(updated);
        if (!updatedValidation.ok) {
          await settleAborted(tx);
          return err('invalid_data', updatedValidation.message);
        }
        await tx.store.put(updated);
      }
      const forced = await this.settleForcedFailure(tx);
      if (forced) return forced;
      await tx.done;
      return ok(undefined);
    } catch {
      return writeFailed();
    }
  }

  async deleteRoutine(id: string): Promise<Result<void>> {
    try {
      await this.db.delete('routines', id);
      return ok(undefined);
    } catch {
      return writeFailed();
    }
  }

  async assignHabitToRoutine(habitId: string, routineId: string): Promise<Result<void>> {
    const trimmedHabitId = habitId.trim();
    const trimmedRoutineId = routineId.trim();
    if (!trimmedHabitId) return err('invalid_habit_id', 'Habit ID cannot be empty.');
    if (!trimmedRoutineId) return err('invalid_routine_id', 'Routine ID cannot be empty.');

    try {
      const tx = this.db.transaction(['habits', 'routines'], 'readwrite');
      const habitStore = tx.objectStore('habits');
      const routineStore = tx.objectStore('routines');
      const assignRes = await this.assignWithinTx(
        habitStore,
        routineStore,
        trimmedHabitId,
        trimmedRoutineId,
      );
      if (!assignRes.ok) {
        await settleAborted(tx);
        return assignRes;
      }
      const forced = await this.settleForcedFailure(tx);
      if (forced) return forced;
      await tx.done;
      return ok(undefined);
    } catch {
      return writeFailed();
    }
  }

  async removeHabitFromRoutine(habitId: string): Promise<Result<void>> {
    const trimmedHabitId = habitId.trim();
    if (!trimmedHabitId) return err('invalid_habit_id', 'Habit ID cannot be empty.');

    try {
      const tx = this.db.transaction(['habits', 'routines'], 'readwrite');
      const habitStore = tx.objectStore('habits');
      const routineStore = tx.objectStore('routines');
      const removeRes = await this.removeWithinTx(habitStore, routineStore, trimmedHabitId, true);
      if (!removeRes.ok) {
        await settleAborted(tx);
        return removeRes;
      }
      const forced = await this.settleForcedFailure(tx);
      if (forced) return forced;
      await tx.done;
      return ok(undefined);
    } catch {
      return writeFailed();
    }
  }

  async reorderRoutineHabits(routineId: string, habitIds: string[]): Promise<Result<void>> {
    const trimmedRoutineId = routineId.trim();
    if (!trimmedRoutineId) return err('invalid_routine_id', 'Routine ID cannot be empty.');

    try {
      const tx = this.db.transaction(['habits', 'routines'], 'readwrite');
      const habitStore = tx.objectStore('habits');
      const routineStore = tx.objectStore('routines');
      const raw = await routineStore.get(trimmedRoutineId);
      if (!raw) {
        await settleAborted(tx);
        return err('routine_not_found', `Routine "${trimmedRoutineId}" does not exist.`);
      }

      const parsedRoutine = parseRecord(routineSchema, raw, validateRoutinePreWrite);
      if (!parsedRoutine.ok) {
        await settleAborted(tx);
        return err('corrupt_record', CORRUPT_RECORD_MESSAGE);
      }

      const nextIds: string[] = [];
      const seen = new Set<string>();
      for (const hId of habitIds) {
        const trimmed = hId.trim();
        if (!trimmed) {
          await settleAborted(tx);
          return err('invalid_habit_id', 'Reorder habit IDs must be non-empty strings.');
        }
        if (seen.has(trimmed)) {
          await settleAborted(tx);
          return err('duplicate_habit_ids', 'Reorder cannot contain duplicate habit IDs.');
        }
        seen.add(trimmed);
        nextIds.push(trimmed);
      }

      const currentSet = new Set(parsedRoutine.value.habitIds);
      if (currentSet.size !== nextIds.length || nextIds.some((id) => !currentSet.has(id))) {
        await settleAborted(tx);
        return err(
          'invalid_reorder',
          'Reorder must preserve the current membership set; it only changes order.',
        );
      }

      for (const hid of nextIds) {
        const habitRaw = await habitStore.get(hid);
        if (habitRaw === undefined) {
          await settleAborted(tx);
          return err('habit_not_found', `Habit "${hid}" does not exist.`);
        }
        const parsedHabit = parseRecord(habitSchema, habitRaw, validateHabitPreWrite);
        if (!parsedHabit.ok) {
          await settleAborted(tx);
          return err('corrupt_record', CORRUPT_RECORD_MESSAGE);
        }
      }

      const updated: Routine = {
        ...parsedRoutine.value,
        habitIds: nextIds,
        updatedAt: computeUpdatedAt(parsedRoutine.value.createdAt),
      };
      const validation = validateRoutinePreWrite(updated);
      if (!validation.ok) {
        await settleAborted(tx);
        return err('invalid_data', validation.message);
      }

      await routineStore.put(updated);
      const forced = await this.settleForcedFailure(tx);
      if (forced) return forced;
      await tx.done;
      return ok(undefined);
    } catch {
      return writeFailed();
    }
  }

  private async assignWithinTx(
    habitStore: HabitStore,
    routineStore: RoutineStore,
    habitId: string,
    routineId: string,
  ): Promise<Result<void>> {
    const habitRaw = await habitStore.get(habitId);
    if (habitRaw === undefined) {
      return err('habit_not_found', `Habit "${habitId}" does not exist.`);
    }
    const parsedHabit = parseRecord(habitSchema, habitRaw, validateHabitPreWrite);
    if (!parsedHabit.ok) {
      return err('corrupt_record', CORRUPT_RECORD_MESSAGE);
    }

    const allRoutinesRaw = await routineStore.getAll();
    const routines: Routine[] = [];
    for (const raw of allRoutinesRaw) {
      const parsed = parseRecord(routineSchema, raw, validateRoutinePreWrite);
      if (!parsed.ok) {
        return err('corrupt_record', CORRUPT_RECORD_MESSAGE);
      }
      routines.push(parsed.value);
    }

    const targetRoutine = routines.find((r) => r.id === routineId);
    if (!targetRoutine) {
      return err('routine_not_found', `Routine "${routineId}" does not exist.`);
    }

    for (const routine of routines) {
      if (routine.id !== routineId && routine.habitIds.includes(habitId)) {
        const updatedOther: Routine = {
          ...routine,
          habitIds: routine.habitIds.filter((id) => id !== habitId),
          updatedAt: computeUpdatedAt(routine.createdAt),
        };
        await routineStore.put(updatedOther);
      }
    }

    if (!targetRoutine.habitIds.includes(habitId)) {
      const updatedTarget: Routine = {
        ...targetRoutine,
        habitIds: [...targetRoutine.habitIds, habitId],
        updatedAt: computeUpdatedAt(targetRoutine.createdAt),
      };
      await routineStore.put(updatedTarget);
    }

    return ok(undefined);
  }

  private async removeWithinTx(
    habitStore: HabitStore,
    routineStore: RoutineStore,
    habitId: string,
    requireHabitExists: boolean,
  ): Promise<Result<void>> {
    const habitRaw = await habitStore.get(habitId);
    if (habitRaw === undefined) {
      if (requireHabitExists) {
        return err('habit_not_found', `Habit "${habitId}" does not exist.`);
      }
    } else {
      const parsedHabit = parseRecord(habitSchema, habitRaw, validateHabitPreWrite);
      if (!parsedHabit.ok) {
        return err('corrupt_record', CORRUPT_RECORD_MESSAGE);
      }
    }

    const allRoutinesRaw = await routineStore.getAll();
    for (const raw of allRoutinesRaw) {
      const parsed = parseRecord(routineSchema, raw, validateRoutinePreWrite);
      if (!parsed.ok) {
        return err('corrupt_record', CORRUPT_RECORD_MESSAGE);
      }
      if (parsed.value.habitIds.includes(habitId)) {
        const updated: Routine = {
          ...parsed.value,
          habitIds: parsed.value.habitIds.filter((id) => id !== habitId),
          updatedAt: computeUpdatedAt(parsed.value.createdAt),
        };
        await routineStore.put(updated);
      }
    }

    return ok(undefined);
  }
}

export async function createGuestHabitRepository(
  options: GuestHabitRepositoryOptions = {},
): Promise<GuestHabitRepository> {
  const db = await openGuestTodayDb(options.databaseName);
  return new GuestHabitRepository(db);
}
