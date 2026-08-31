import type { IDBPDatabase } from 'idb';
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
      if (existing && typeof existing === 'object') {
        const parsedExisting = habitCheckInSchema.safeParse(existing);
        const originalCreatedAt = parsedExisting.success ? parsedExisting.data.createdAt : checkIn.createdAt;

        if ('id' in existing && existing.id !== checkIn.id) {
          await tx.store.delete(existing.id as string);
        }

        // Preserve original createdAt audit timestamp
        recordToSave = {
          ...checkIn,
          createdAt: originalCreatedAt,
          updatedAt: computeUpdatedAt(originalCreatedAt, checkIn.updatedAt),
        };
      }

      await tx.store.put(recordToSave);
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

    try {
      const tx = this.db.transaction(['habits', 'routines'], 'readwrite');
      const habitStore = tx.objectStore('habits');
      const routineStore = tx.objectStore('routines');

      const habit = await habitStore.get(trimmedHabitId);
      if (!habit) {
        return err('habit_not_found', `Habit "${trimmedHabitId}" does not exist.`);
      }

      const targetRoutineRaw = await routineStore.get(trimmedRoutineId);
      if (!targetRoutineRaw) {
        return err('routine_not_found', `Routine "${trimmedRoutineId}" does not exist.`);
      }

      const parsedTarget = routineSchema.safeParse(targetRoutineRaw);
      if (!parsedTarget.success) {
        return err('corrupt_record', CORRUPT_RECORD_MESSAGE);
      }
      const targetRoutine = parsedTarget.data;

      // Remove habit from all other routines atomically
      const allRoutinesRaw = await routineStore.getAll();
      for (const raw of allRoutinesRaw) {
        const p = routineSchema.safeParse(raw);
        if (p.success && p.data.id !== trimmedRoutineId && p.data.habitIds.includes(trimmedHabitId)) {
          const updatedOther: Routine = {
            ...p.data,
            habitIds: p.data.habitIds.filter((id) => id !== trimmedHabitId),
            updatedAt: computeUpdatedAt(p.data.createdAt),
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
      return writeFailed();
    }
  }

  async removeHabitFromRoutine(habitId: string): Promise<Result<void>> {
    const trimmedHabitId = habitId.trim();
    if (!trimmedHabitId) return err('invalid_habit_id', 'Habit ID cannot be empty.');

    try {
      const tx = this.db.transaction(['routines'], 'readwrite');
      const routineStore = tx.objectStore('routines');
      const allRoutinesRaw = await routineStore.getAll();

      for (const raw of allRoutinesRaw) {
        const p = routineSchema.safeParse(raw);
        if (p.success && p.data.habitIds.includes(trimmedHabitId)) {
          const updated: Routine = {
            ...p.data,
            habitIds: p.data.habitIds.filter((id) => id !== trimmedHabitId),
            updatedAt: computeUpdatedAt(p.data.createdAt),
          };
          await routineStore.put(updated);
        }
      }

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
      const tx = this.db.transaction(['routines'], 'readwrite');
      const routineStore = tx.objectStore('routines');
      const raw = await routineStore.get(trimmedRoutineId);
      if (!raw) {
        return err('routine_not_found', `Routine "${trimmedRoutineId}" does not exist.`);
      }

      const p = routineSchema.safeParse(raw);
      if (!p.success) {
        return err('corrupt_record', CORRUPT_RECORD_MESSAGE);
      }

      const deduplicated: string[] = [];
      const seen = new Set<string>();
      for (const hId of habitIds) {
        const trimmed = hId.trim();
        if (trimmed && !seen.has(trimmed)) {
          seen.add(trimmed);
          deduplicated.push(trimmed);
        }
      }

      const updated: Routine = {
        ...p.data,
        habitIds: deduplicated,
        updatedAt: computeUpdatedAt(p.data.createdAt),
      };

      const validation = validateRoutinePreWrite(updated);
      if (!validation.ok) {
        return err('invalid_data', validation.message);
      }

      await routineStore.put(updated);
      await tx.done;
      return ok(undefined);
    } catch {
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
