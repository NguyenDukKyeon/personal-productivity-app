import type { IDBPDatabase } from 'idb';
import { z } from 'zod';
import { validateCapacityMinutes } from '@/domain/capacity/capacity';
import type { DailyCommitmentSnapshot } from '@/domain/commitments/commitment';
import type { DailyPlan, DailyPriority } from '@/domain/daily-plans/daily-plan';
import { parseLocalDateKey } from '@/domain/shared/local-date';
import { err, ok, type Result } from '@/domain/shared/result';
import { validateTimeBlock, type TimeBlock } from '@/domain/time-blocks/time-block';
import { validateWorkItem, type WorkItem } from '@/domain/work-items/work-item';
import type { TodayRepository } from '@/infrastructure/persistence/contracts/today-repository';
import { openGuestTodayDb, type GuestTodayDB } from './guest-db';

export interface GuestTodayRepositoryOptions {
  databaseName?: string;
  beforePriorityCommit?: () => void;
}

const CORRUPT_RECORD_MESSAGE = 'Stored data is invalid and was left untouched.';
const READ_FAILED_MESSAGE = 'Failed to read guest data.';
const WRITE_FAILED_MESSAGE = 'Failed to write guest data.';

const workItemSchema = z.object({
  id: z.string(),
  projectId: z.string().nullable(),
  title: z.string(),
  notes: z.string(),
  type: z.enum(['task', 'lesson', 'milestone']),
  estimatedMinutes: z.number().int(),
  actualMinutes: z.number().int(),
  priority: z.enum(['p1_urgent', 'p2_high', 'p3_medium', 'p4_low']),
  status: z.enum(['backlog', 'scheduled', 'in_progress', 'completed']),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const dailyPlanSchema = z.object({
  id: z.string(),
  date: z.string(),
  capacityMinutes: z.number().int(),
  morningIntention: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const dailyPrioritySchema = z.object({
  id: z.string(),
  dailyPlanId: z.string(),
  workItemId: z.string(),
  rank: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

const timeBlockSchema = z.object({
  id: z.string(),
  date: z.string(),
  workItemId: z.string().nullable(),
  habitId: z.string().nullable(),
  startMinute: z.number().int(),
  endMinute: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const commitmentSchema = z.object({
  id: z.string(),
  date: z.string(),
  committedAt: z.string(),
  capacityMinutes: z.number().int(),
  priorityWorkItemIds: z.array(z.string()),
  timeBlocks: z.array(
    z.object({
      workItemId: z.string().nullable(),
      startMinute: z.number().int(),
      endMinute: z.number().int(),
    }),
  ),
});

function invalidDate(): Result<never> {
  return err('invalid_date', 'Date must be a valid YYYY-MM-DD calendar date.');
}

function validateStoredDate(date: string): Result<void> {
  return parseLocalDateKey(date) ? ok(undefined) : invalidDate();
}

function validateStoredWorkItem(item: WorkItem): Result<void> {
  return validateWorkItem(item);
}

function validateStoredDailyPlan(plan: DailyPlan): Result<void> {
  const date = validateStoredDate(plan.date);
  if (!date.ok) return date;
  const capacity = validateCapacityMinutes(plan.capacityMinutes);
  if (!capacity.ok) return capacity;
  return ok(undefined);
}

function validateStoredTimeBlock(block: TimeBlock): Result<void> {
  const date = validateStoredDate(block.date);
  if (!date.ok) return date;
  return validateTimeBlock(block);
}

function validateStoredCommitment(snapshot: DailyCommitmentSnapshot): Result<void> {
  const date = validateStoredDate(snapshot.date);
  if (!date.ok) return date;
  const capacity = validateCapacityMinutes(snapshot.capacityMinutes);
  if (!capacity.ok) return capacity;
  for (const block of snapshot.timeBlocks) {
    const bounds = validateTimeBlock({
      workItemId: block.workItemId ?? 'commitment-block',
      habitId: null,
      startMinute: block.startMinute,
      endMinute: block.endMinute,
    });
    if (!bounds.ok) return bounds;
  }
  return ok(undefined);
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

function parseRecords<T>(
  schema: z.ZodType<T>,
  values: unknown[],
  validate?: (record: T) => Result<unknown>,
): Result<T[]> {
  const records: T[] = [];
  for (const value of values) {
    const parsed = parseRecord(schema, value, validate);
    if (!parsed.ok) return parsed;
    records.push(parsed.value);
  }
  return ok(records);
}

function readFailed(): Result<never> {
  return err('persistence_read_failed', READ_FAILED_MESSAGE);
}

function writeFailed(): Result<never> {
  return err('persistence_write_failed', WRITE_FAILED_MESSAGE);
}

function abortQuietly(tx: { abort: () => void; done: Promise<unknown> }): Promise<void> {
  try {
    tx.abort();
  } catch {
    // Transaction already finished or aborting.
  }
  return tx.done.then(() => undefined, () => undefined);
}

function isConstraintError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'ConstraintError';
}

class GuestTodayRepository implements TodayRepository {
  constructor(
    private readonly db: IDBPDatabase<GuestTodayDB>,
    private readonly options: GuestTodayRepositoryOptions,
  ) {}

  async listWorkItems(): Promise<Result<WorkItem[]>> {
    try {
      return parseRecords(workItemSchema, await this.db.getAll('workItems'), validateStoredWorkItem);
    } catch {
      return readFailed();
    }
  }

  async getWorkItem(id: string): Promise<Result<WorkItem | null>> {
    try {
      const row = await this.db.get('workItems', id);
      if (row === undefined) return ok(null);
      return parseRecord(workItemSchema, row, validateStoredWorkItem);
    } catch {
      return readFailed();
    }
  }

  async saveWorkItem(item: WorkItem): Promise<Result<void>> {
    try {
      await this.db.put('workItems', item);
      return ok(undefined);
    } catch {
      return writeFailed();
    }
  }

  async getDailyPlan(date: string): Promise<Result<DailyPlan | null>> {
    try {
      const row = await this.db.getFromIndex('dailyPlans', 'date', date);
      if (row === undefined) return ok(null);
      return parseRecord(dailyPlanSchema, row, validateStoredDailyPlan);
    } catch {
      return readFailed();
    }
  }

  async saveDailyPlan(plan: DailyPlan): Promise<Result<void>> {
    try {
      await this.db.put('dailyPlans', plan);
      return ok(undefined);
    } catch {
      return writeFailed();
    }
  }

  async listPriorities(planId: string): Promise<Result<DailyPriority[]>> {
    try {
      const parsed = parseRecords(
        dailyPrioritySchema,
        await this.db.getAllFromIndex('dailyPriorities', 'dailyPlanId', planId),
      );
      if (!parsed.ok) return parsed;
      return ok([...parsed.value].sort((a, b) => a.rank - b.rank));
    } catch {
      return readFailed();
    }
  }

  async replacePriorities(planId: string, priorities: DailyPriority[]): Promise<Result<void>> {
    const tx = this.db.transaction('dailyPriorities', 'readwrite');
    try {
      const store = tx.objectStore('dailyPriorities');
      const keys = await store.index('dailyPlanId').getAllKeys(planId);
      await Promise.all(keys.map((key) => store.delete(key)));
      await Promise.all(priorities.map((priority) => store.put(priority)));
      try {
        this.options.beforePriorityCommit?.();
      } catch {
        await abortQuietly(tx);
        return writeFailed();
      }
      await tx.done;
      return ok(undefined);
    } catch {
      await abortQuietly(tx);
      return writeFailed();
    }
  }

  async listTimeBlocks(date: string): Promise<Result<TimeBlock[]>> {
    try {
      return parseRecords(
        timeBlockSchema,
        await this.db.getAllFromIndex('timeBlocks', 'date', date),
        validateStoredTimeBlock,
      );
    } catch {
      return readFailed();
    }
  }

  async getTimeBlock(id: string): Promise<Result<TimeBlock | null>> {
    try {
      const row = await this.db.get('timeBlocks', id);
      if (row === undefined) return ok(null);
      return parseRecord(timeBlockSchema, row, validateStoredTimeBlock);
    } catch {
      return readFailed();
    }
  }

  async listTimeBlocksForWorkItem(workItemId: string): Promise<Result<TimeBlock[]>> {
    try {
      return parseRecords(
        timeBlockSchema,
        await this.db.getAllFromIndex('timeBlocks', 'workItemId', workItemId),
        validateStoredTimeBlock,
      );
    } catch {
      return readFailed();
    }
  }

  async saveTimeBlock(block: TimeBlock): Promise<Result<void>> {
    try {
      await this.db.put('timeBlocks', block);
      return ok(undefined);
    } catch {
      return writeFailed();
    }
  }

  async removeTimeBlock(id: string): Promise<Result<void>> {
    try {
      await this.db.delete('timeBlocks', id);
      return ok(undefined);
    } catch {
      return writeFailed();
    }
  }

  async getCommitment(date: string): Promise<Result<DailyCommitmentSnapshot | null>> {
    try {
      const row = await this.db.getFromIndex('dailyCommitments', 'date', date);
      if (row === undefined) return ok(null);
      return parseRecord(commitmentSchema, row, validateStoredCommitment);
    } catch {
      return readFailed();
    }
  }

  async saveCommitment(snapshot: DailyCommitmentSnapshot): Promise<Result<void>> {
    const tx = this.db.transaction('dailyCommitments', 'readwrite');
    try {
      const existing = await tx.objectStore('dailyCommitments').index('date').get(snapshot.date);
      if (existing !== undefined) {
        await tx.done;
        return err('commitment_exists', 'A commitment for this date already exists.');
      }
      await tx.objectStore('dailyCommitments').add(snapshot);
      await tx.done;
      return ok(undefined);
    } catch (error) {
      await abortQuietly(tx);
      if (isConstraintError(error)) {
        return err('commitment_exists', 'A commitment for this date already exists.');
      }
      return writeFailed();
    }
  }
}

export async function createGuestTodayRepository(
  options: GuestTodayRepositoryOptions = {},
): Promise<TodayRepository> {
  const db = await openGuestTodayDb(options.databaseName);
  return new GuestTodayRepository(db, options);
}
