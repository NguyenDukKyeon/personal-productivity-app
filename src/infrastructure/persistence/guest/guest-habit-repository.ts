import type { IDBPDatabase } from 'idb';
import { z } from 'zod';
import { type Habit } from '@/domain/habits/habit';
import { type HabitCheckIn } from '@/domain/habits/habit-check-in';
import { type HabitSchedule, type WeekdayNumber } from '@/domain/habits/habit-schedule';
import { type Routine } from '@/domain/habits/routine';
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

const habitSchema: z.ZodType<Habit> = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
  description: z.string().max(500),
  cue: z.string().max(120),
  minimumVersion: z.string().min(1).max(160),
  schedule: habitScheduleSchema,
  routineId: z.string().nullable(),
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

function parseValidRecords<T>(
  schema: z.ZodType<T>,
  values: unknown[],
  validate?: (record: T) => Result<unknown>,
): T[] {
  const valid: T[] = [];
  for (const val of values) {
    const res = parseRecord(schema, val, validate);
    if (res.ok) {
      valid.push(res.value);
    }
  }
  return valid;
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
      return parseRecord(habitSchema, raw);
    } catch {
      return readFailed();
    }
  }

  async listHabits(includeArchived = false): Promise<Result<Habit[]>> {
    try {
      const rawList = await this.db.getAll('habits');
      const validHabits = parseValidRecords(habitSchema, rawList);
      if (includeArchived) {
        return ok(validHabits);
      }
      return ok(validHabits.filter((h) => h.status === 'active'));
    } catch {
      return readFailed();
    }
  }

  async saveHabit(habit: Habit): Promise<Result<void>> {
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
      return parseRecord(habitCheckInSchema, raw, (c) => validateStoredDate(c.date));
    } catch {
      return readFailed();
    }
  }

  async listCheckInsForHabit(habitId: string): Promise<Result<HabitCheckIn[]>> {
    try {
      const tx = this.db.transaction('habitCheckIns', 'readonly');
      const index = tx.store.index('habitId');
      const rawList = await index.getAll(habitId);
      const valid = parseValidRecords(habitCheckInSchema, rawList, (c) => validateStoredDate(c.date));
      return ok(valid);
    } catch {
      return readFailed();
    }
  }

  async listCheckInsForDate(dateKey: string): Promise<Result<HabitCheckIn[]>> {
    try {
      const tx = this.db.transaction('habitCheckIns', 'readonly');
      const index = tx.store.index('date');
      const rawList = await index.getAll(dateKey);
      const valid = parseValidRecords(habitCheckInSchema, rawList, (c) => validateStoredDate(c.date));
      return ok(valid);
    } catch {
      return readFailed();
    }
  }

  async listCheckInsInRange(startDateKey: string, endDateKey: string): Promise<Result<HabitCheckIn[]>> {
    try {
      const rawList = await this.db.getAll('habitCheckIns');
      const valid = parseValidRecords(habitCheckInSchema, rawList, (c) => validateStoredDate(c.date));
      const filtered = valid.filter((c) => c.date >= startDateKey && c.date <= endDateKey);
      return ok(filtered);
    } catch {
      return readFailed();
    }
  }

  async saveCheckIn(checkIn: HabitCheckIn): Promise<Result<void>> {
    try {
      const tx = this.db.transaction('habitCheckIns', 'readwrite');
      const index = tx.store.index('habitId_date');
      const existing = await index.get([checkIn.habitId, checkIn.date]);

      if (existing && typeof existing === 'object' && 'id' in existing && existing.id !== checkIn.id) {
        // Replace existing same-day record atomically to enforce uniqueness
        await tx.store.delete(existing.id as string);
      }

      await tx.store.put(checkIn);
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
      return parseRecord(routineSchema, raw);
    } catch {
      return readFailed();
    }
  }

  async listRoutines(): Promise<Result<Routine[]>> {
    try {
      const rawList = await this.db.getAll('routines');
      const valid = parseValidRecords(routineSchema, rawList);
      return ok(valid);
    } catch {
      return readFailed();
    }
  }

  async saveRoutine(routine: Routine): Promise<Result<void>> {
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
}

export async function createGuestHabitRepository(
  options: GuestHabitRepositoryOptions = {},
): Promise<GuestHabitRepository> {
  const db = await openGuestTodayDb(options.databaseName);
  return new GuestHabitRepository(db);
}
