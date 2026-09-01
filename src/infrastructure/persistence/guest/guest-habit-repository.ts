import type { IDBPDatabase, IDBPTransaction } from 'idb';
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

async function abortTx(tx: { abort: () => void; done: Promise<unknown> }): Promise<void> {
  try {
    tx.abort();
  } catch {}
  await tx.done.catch(() => {});
}

export class GuestHabitRepository implements HabitRepository {
  constructor(private readonly db: IDBPDatabase<GuestTodayDB>) {}

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
      await this.db.put('habits', habit);
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

  async createHabitWithRoutine(habit: Habit, routineId: string | null): Promise<Result<void>> {
    const validation = validateHabitPreWrite(habit);
    if (!validation.ok) {
      return err('invalid_data', validation.message);
    }

    let tx: IDBPTransaction<GuestTodayDB, ['habits', 'routines'], 'readwrite'> | null = null;
    try {
      tx = this.db.transaction(['habits', 'routines'], 'readwrite');
      const habitStore = tx.objectStore('habits');
      const routineStore = tx.objectStore('routines');

      if (routineId) {
        const trimmedRoutineId = routineId.trim();
        const allRoutinesRaw = await routineStore.getAll();
        for (const raw of allRoutinesRaw) {
          const p = parseRecord(routineSchema, raw, validateRoutinePreWrite);
          if (!p.ok) {
            await abortTx(tx);
            return p;
          }
        }

        const targetRaw = await routineStore.get(trimmedRoutineId);
        if (!targetRaw) {
          await abortTx(tx);
          return err('routine_not_found', `Routine "${trimmedRoutineId}" does not exist.`);
        }
        const parsedTarget = parseRecord(routineSchema, targetRaw, validateRoutinePreWrite);
        if (!parsedTarget.ok) {
          await abortTx(tx);
          return parsedTarget;
        }

        const targetRoutine = parsedTarget.value;
        for (const raw of allRoutinesRaw) {
          const p = routineSchema.safeParse(raw);
          if (p.success && p.data.id !== trimmedRoutineId && p.data.habitIds.includes(habit.id)) {
            const updatedOther: Routine = {
              ...p.data,
              habitIds: p.data.habitIds.filter((id) => id !== habit.id),
              updatedAt: computeUpdatedAt(p.data.createdAt),
            };
            await routineStore.put(updatedOther);
          }
        }

        if (!targetRoutine.habitIds.includes(habit.id)) {
          const updatedTarget: Routine = {
            ...targetRoutine,
            habitIds: [...targetRoutine.habitIds, habit.id],
            updatedAt: computeUpdatedAt(targetRoutine.createdAt),
          };
          await routineStore.put(updatedTarget);
        }
      }

      await habitStore.put(habit);
      await tx.done;
      return ok(undefined);
    } catch {
      if (tx) {
        await abortTx(tx);
      }
      return writeFailed();
    }
  }

  async updateHabitWithRoutine(
    previousHabit: Habit,
    nextHabit: Habit,
    routineId: string | null | undefined,
  ): Promise<Result<void>> {
    const validation = validateHabitPreWrite(nextHabit);
    if (!validation.ok) {
      return err('invalid_data', validation.message);
    }

    let tx: IDBPTransaction<GuestTodayDB, ['habits', 'routines'], 'readwrite'> | null = null;
    try {
      tx = this.db.transaction(['habits', 'routines'], 'readwrite');
      const habitStore = tx.objectStore('habits');
      const routineStore = tx.objectStore('routines');

      const existingHabitRaw = await habitStore.get(nextHabit.id);
      if (!existingHabitRaw) {
        await abortTx(tx);
        return err('habit_not_found', `Habit "${nextHabit.id}" does not exist.`);
      }
      const existingParsed = parseRecord(habitSchema, existingHabitRaw, validateHabitPreWrite);
      if (!existingParsed.ok) {
        await abortTx(tx);
        return existingParsed;
      }

      if (routineId !== undefined) {
        const trimmedRoutineId = routineId ? routineId.trim() : null;
        const allRoutinesRaw = await routineStore.getAll();
        const allRoutines: Routine[] = [];
        for (const raw of allRoutinesRaw) {
          const p = parseRecord(routineSchema, raw, validateRoutinePreWrite);
          if (!p.ok) {
            await abortTx(tx);
            return p;
          }
          allRoutines.push(p.value);
        }

        if (trimmedRoutineId !== null) {
          const targetRoutine = allRoutines.find((r) => r.id === trimmedRoutineId);
          if (!targetRoutine) {
            await abortTx(tx);
            return err('routine_not_found', `Routine "${trimmedRoutineId}" does not exist.`);
          }
        }

        for (const r of allRoutines) {
          if (trimmedRoutineId !== null && r.id === trimmedRoutineId) {
            if (!r.habitIds.includes(nextHabit.id)) {
              const updatedTarget: Routine = {
                ...r,
                habitIds: [...r.habitIds, nextHabit.id],
                updatedAt: computeUpdatedAt(r.createdAt),
              };
              await routineStore.put(updatedTarget);
            }
          } else if (r.habitIds.includes(nextHabit.id)) {
            const updatedOther: Routine = {
              ...r,
              habitIds: r.habitIds.filter((id) => id !== nextHabit.id),
              updatedAt: computeUpdatedAt(r.createdAt),
            };
            await routineStore.put(updatedOther);
          }
        }
      }

      await habitStore.put(nextHabit);
      await tx.done;
      return ok(undefined);
    } catch {
      if (tx) {
        await abortTx(tx);
      }
      return writeFailed();
    }
  }

  async saveCheckIn(checkIn: HabitCheckIn): Promise<Result<void>> {
    const validation = validateCheckInPreWrite(checkIn);
    if (!validation.ok) {
      return err('invalid_data', validation.message);
    }
    let tx: IDBPTransaction<GuestTodayDB, ['habitCheckIns'], 'readwrite'> | null = null;
    try {
      tx = this.db.transaction('habitCheckIns', 'readwrite');
      const index = tx.store.index('habitId_date');
      const existing = await index.get([checkIn.habitId, checkIn.date]);

      let recordToSave = checkIn;
      if (existing !== undefined) {
        const parsedExisting = habitCheckInSchema.safeParse(existing);
        if (!parsedExisting.success) {
          await abortTx(tx);
          return err('corrupt_record', CORRUPT_RECORD_MESSAGE);
        }
        const semExisting = validateCheckInPreWrite(parsedExisting.data);
        if (!semExisting.ok) {
          await abortTx(tx);
          return err('corrupt_record', CORRUPT_RECORD_MESSAGE);
        }

        const originalCreatedAt = parsedExisting.data.createdAt;
        if (parsedExisting.data.id !== checkIn.id) {
          await tx.store.delete(parsedExisting.data.id);
        }

        // Preserve original createdAt audit timestamp
        recordToSave = {
          ...checkIn,
          createdAt: originalCreatedAt,
          updatedAt: computeUpdatedAt(originalCreatedAt, checkIn.updatedAt),
        };

        const finalValidation = validateCheckInPreWrite(recordToSave);
        if (!finalValidation.ok) {
          await abortTx(tx);
          return err('invalid_data', finalValidation.message);
        }
      }

      await tx.store.put(recordToSave);
      await tx.done;
      return ok(undefined);
    } catch {
      if (tx) {
        await abortTx(tx);
      }
      return writeFailed();
    }
  }

  async deleteCheckIn(habitId: string, dateKey: string): Promise<Result<void>> {
    let tx: IDBPTransaction<GuestTodayDB, ['habitCheckIns'], 'readwrite'> | null = null;
    try {
      tx = this.db.transaction('habitCheckIns', 'readwrite');
      const index = tx.store.index('habitId_date');
      const existing = await index.get([habitId, dateKey]);
      if (existing && typeof existing === 'object' && 'id' in existing) {
        await tx.store.delete(existing.id as string);
      }
      await tx.done;
      return ok(undefined);
    } catch {
      if (tx) {
        await abortTx(tx);
      }
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
    const validation = validateRoutinePreWrite(routine);
    if (!validation.ok) {
      return err('invalid_data', validation.message);
    }
    try {
      await this.db.put('routines', routine);
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

    let tx: IDBPTransaction<GuestTodayDB, ['habits', 'routines'], 'readwrite'> | null = null;
    try {
      tx = this.db.transaction(['habits', 'routines'], 'readwrite');
      const habitStore = tx.objectStore('habits');
      const routineStore = tx.objectStore('routines');

      const habitRaw = await habitStore.get(trimmedHabitId);
      if (!habitRaw) {
        await abortTx(tx);
        return err('habit_not_found', `Habit "${trimmedHabitId}" does not exist.`);
      }
      const parsedHabit = parseRecord(habitSchema, habitRaw, validateHabitPreWrite);
      if (!parsedHabit.ok) {
        await abortTx(tx);
        return parsedHabit;
      }

      const allRoutinesRaw = await routineStore.getAll();
      const allRoutines: Routine[] = [];
      for (const raw of allRoutinesRaw) {
        const p = parseRecord(routineSchema, raw, validateRoutinePreWrite);
        if (!p.ok) {
          await abortTx(tx);
          return p;
        }
        allRoutines.push(p.value);
      }

      const targetRoutine = allRoutines.find((r) => r.id === trimmedRoutineId);
      if (!targetRoutine) {
        await abortTx(tx);
        return err('routine_not_found', `Routine "${trimmedRoutineId}" does not exist.`);
      }

      // Remove habit from all other routines atomically
      for (const r of allRoutines) {
        if (r.id !== trimmedRoutineId && r.habitIds.includes(trimmedHabitId)) {
          const updatedOther: Routine = {
            ...r,
            habitIds: r.habitIds.filter((id) => id !== trimmedHabitId),
            updatedAt: computeUpdatedAt(r.createdAt),
          };
          await routineStore.put(updatedOther);
        }
      }

      // Add habit to target routine if not already in habitIds
      if (!targetRoutine.habitIds.includes(trimmedHabitId)) {
        const updatedTarget: Routine = {
          ...targetRoutine,
          habitIds: [...targetRoutine.habitIds, trimmedHabitId],
          updatedAt: computeUpdatedAt(targetRoutine.createdAt),
        };
        await routineStore.put(updatedTarget);
      }

      await tx.done;
      return ok(undefined);
    } catch {
      if (tx) {
        await abortTx(tx);
      }
      return writeFailed();
    }
  }

  async removeHabitFromRoutine(habitId: string): Promise<Result<void>> {
    const trimmedHabitId = habitId.trim();
    if (!trimmedHabitId) return err('invalid_habit_id', 'Habit ID cannot be empty.');

    let tx: IDBPTransaction<GuestTodayDB, ['habits', 'routines'], 'readwrite'> | null = null;
    try {
      tx = this.db.transaction(['habits', 'routines'], 'readwrite');
      const habitStore = tx.objectStore('habits');
      const routineStore = tx.objectStore('routines');

      const habitRaw = await habitStore.get(trimmedHabitId);
      if (!habitRaw) {
        await abortTx(tx);
        return err('habit_not_found', `Habit "${trimmedHabitId}" does not exist.`);
      }
      const parsedHabit = parseRecord(habitSchema, habitRaw, validateHabitPreWrite);
      if (!parsedHabit.ok) {
        await abortTx(tx);
        return parsedHabit;
      }

      const allRoutinesRaw = await routineStore.getAll();
      for (const raw of allRoutinesRaw) {
        const p = parseRecord(routineSchema, raw, validateRoutinePreWrite);
        if (!p.ok) {
          await abortTx(tx);
          return p;
        }
        if (p.value.habitIds.includes(trimmedHabitId)) {
          const updated: Routine = {
            ...p.value,
            habitIds: p.value.habitIds.filter((id) => id !== trimmedHabitId),
            updatedAt: computeUpdatedAt(p.value.createdAt),
          };
          await routineStore.put(updated);
        }
      }

      await tx.done;
      return ok(undefined);
    } catch {
      if (tx) {
        await abortTx(tx);
      }
      return writeFailed();
    }
  }

  async reorderRoutineHabits(routineId: string, habitIds: string[]): Promise<Result<void>> {
    const trimmedRoutineId = routineId.trim();
    if (!trimmedRoutineId) return err('invalid_routine_id', 'Routine ID cannot be empty.');

    if (!Array.isArray(habitIds)) {
      return err('invalid_habit_ids', 'Ordered habit IDs must be an array.');
    }
    const trimmedIds = habitIds.map((id) => (typeof id === 'string' ? id.trim() : ''));
    const uniqueSet = new Set(trimmedIds);
    if (uniqueSet.size !== trimmedIds.length) {
      return err('duplicate_habit_ids', 'Reorder list contains duplicate habit IDs.');
    }

    let tx: IDBPTransaction<GuestTodayDB, ['habits', 'routines'], 'readwrite'> | null = null;
    try {
      tx = this.db.transaction(['habits', 'routines'], 'readwrite');
      const habitStore = tx.objectStore('habits');
      const routineStore = tx.objectStore('routines');

      const raw = await routineStore.get(trimmedRoutineId);
      if (!raw) {
        await abortTx(tx);
        return err('routine_not_found', `Routine "${trimmedRoutineId}" does not exist.`);
      }

      const parsedRoutine = parseRecord(routineSchema, raw, validateRoutinePreWrite);
      if (!parsedRoutine.ok) {
        await abortTx(tx);
        return parsedRoutine;
      }
      const targetRoutine = parsedRoutine.value;

      const currentSet = new Set(targetRoutine.habitIds);
      if (
        trimmedIds.length !== targetRoutine.habitIds.length ||
        !trimmedIds.every((id) => currentSet.has(id))
      ) {
        await abortTx(tx);
        return err(
          'invalid_reorder_set',
          'Reorder must preserve the exact existing routine membership set.',
        );
      }

      // Check all habits exist and validate
      for (const hId of trimmedIds) {
        const rawH = await habitStore.get(hId);
        if (!rawH) {
          await abortTx(tx);
          return err('habit_not_found', `Habit "${hId}" does not exist.`);
        }
        const pH = parseRecord(habitSchema, rawH, validateHabitPreWrite);
        if (!pH.ok) {
          await abortTx(tx);
          return pH;
        }
      }

      const updated: Routine = {
        ...targetRoutine,
        habitIds: trimmedIds,
        updatedAt: computeUpdatedAt(targetRoutine.createdAt),
      };

      const validation = validateRoutinePreWrite(updated);
      if (!validation.ok) {
        await abortTx(tx);
        return err('invalid_data', validation.message);
      }

      await routineStore.put(updated);
      await tx.done;
      return ok(undefined);
    } catch {
      if (tx) {
        await abortTx(tx);
      }
      return writeFailed();
    }
  }
}

export async function createGuestHabitRepository(
  options: GuestHabitRepositoryOptions = {},
): Promise<GuestHabitRepository> {
  const db = await openGuestTodayDb(options.databaseName);
  return new GuestHabitRepository(db);
}
