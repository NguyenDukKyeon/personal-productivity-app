import type { IDBPDatabase } from 'idb';
import { z } from 'zod';
import { validateCapacityMinutes } from '@/domain/capacity/capacity';
import type { DailyPlan } from '@/domain/daily-plans/daily-plan';
import { parseLocalDateKey } from '@/domain/shared/local-date';
import { err, ok, type Result } from '@/domain/shared/result';
import { validateTimeBlock, type TimeBlock } from '@/domain/time-blocks/time-block';
import { validateWorkItem, type WorkItem } from '@/domain/work-items/work-item';
import type { PlannerRepository } from '@/infrastructure/persistence/contracts/planner-repository';
import { openGuestTodayDb, type GuestTodayDB } from './guest-db';

export interface GuestPlannerRepositoryOptions {
  databaseName?: string;
  beforeSchedulingWorkItemWrite?: () => void;
}

const CORRUPT_RECORD_MESSAGE = 'Stored planner data is invalid and was left untouched.';
const READ_FAILED_MESSAGE = 'Failed to read guest planner data.';
const WRITE_FAILED_MESSAGE = 'Failed to write guest planner data.';

const dailyPlanSchema = z.object({
  id: z.string(),
  date: z.string(),
  capacityMinutes: z.number().int(),
  morningIntention: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
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

function validateStoredDate(date: string): Result<void> {
  return parseLocalDateKey(date) ? ok(undefined) : err('invalid_date', 'Invalid date.');
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

function abortQuietly(tx: { abort: () => void; done: Promise<unknown> }): Promise<void> {
  try {
    tx.abort();
  } catch {
    // Transaction already finished or aborting.
  }
  return tx.done.then(() => undefined, () => undefined);
}

export class GuestPlannerRepository implements PlannerRepository {
  constructor(
    private readonly db: IDBPDatabase<GuestTodayDB>,
    private readonly options: GuestPlannerRepositoryOptions = {},
  ) {}

  async listTimeBlocksInRange(startDate: string, endDate: string): Promise<Result<TimeBlock[]>> {
    try {
      const all = await this.db.getAll('timeBlocks');
      const parsed = parseRecords(timeBlockSchema, all, validateStoredTimeBlock);
      if (!parsed.ok) return parsed;

      const filtered = parsed.value
        .filter((b) => b.date >= startDate && b.date <= endDate)
        .sort((a, b) => a.date.localeCompare(b.date) || a.startMinute - b.startMinute);

      return ok(filtered);
    } catch {
      return err('persistence_read_failed', READ_FAILED_MESSAGE);
    }
  }

  async listDailyPlansInRange(startDate: string, endDate: string): Promise<Result<DailyPlan[]>> {
    try {
      const all = await this.db.getAll('dailyPlans');
      const parsed = parseRecords(dailyPlanSchema, all, validateStoredDailyPlan);
      if (!parsed.ok) return parsed;

      const filtered = parsed.value
        .filter((p) => p.date >= startDate && p.date <= endDate)
        .sort((a, b) => a.date.localeCompare(b.date));

      return ok(filtered);
    } catch {
      return err('persistence_read_failed', READ_FAILED_MESSAGE);
    }
  }

  async getDailyPlan(date: string): Promise<Result<DailyPlan | null>> {
    try {
      const row = await this.db.getFromIndex('dailyPlans', 'date', date);
      if (row === undefined) return ok(null);
      return parseRecord(dailyPlanSchema, row, validateStoredDailyPlan);
    } catch {
      return err('persistence_read_failed', READ_FAILED_MESSAGE);
    }
  }

  async saveDailyPlan(plan: DailyPlan): Promise<Result<void>> {
    const valid = validateStoredDailyPlan(plan);
    if (!valid.ok) return valid;

    try {
      await this.db.put('dailyPlans', plan);
      return ok(undefined);
    } catch {
      return err('persistence_write_failed', WRITE_FAILED_MESSAGE);
    }
  }

  async getTimeBlock(id: string): Promise<Result<TimeBlock | null>> {
    try {
      const row = await this.db.get('timeBlocks', id);
      if (row === undefined) return ok(null);
      return parseRecord(timeBlockSchema, row, validateStoredTimeBlock);
    } catch {
      return err('persistence_read_failed', READ_FAILED_MESSAGE);
    }
  }

  async scheduleWorkItem(timeBlock: TimeBlock, updatedWorkItem: WorkItem): Promise<Result<void>> {
    const blockValid = validateStoredTimeBlock(timeBlock);
    if (!blockValid.ok) return blockValid;

    const itemValid = validateWorkItem(updatedWorkItem);
    if (!itemValid.ok) return itemValid;

    const tx = this.db.transaction(['timeBlocks', 'workItems'], 'readwrite');
    try {
      const tbStore = tx.objectStore('timeBlocks');
      const sameDayRows = await tbStore.index('date').getAll(timeBlock.date);
      const parsedExisting = parseRecords(timeBlockSchema, sameDayRows, validateStoredTimeBlock);
      if (!parsedExisting.ok) {
        await abortQuietly(tx);
        return parsedExisting;
      }

      // Check overlap for WorkItem timeblocks
      if (timeBlock.workItemId !== null) {
        for (const existing of parsedExisting.value) {
          if (
            existing.id !== timeBlock.id &&
            existing.workItemId !== null &&
            timeBlock.startMinute < existing.endMinute &&
            existing.startMinute < timeBlock.endMinute
          ) {
            await abortQuietly(tx);
            return err(
              'time_block_overlap',
              `Time block (${timeBlock.startMinute}..${timeBlock.endMinute}) overlaps with existing block (${existing.startMinute}..${existing.endMinute}).`,
            );
          }
        }
      }

      await tbStore.put(timeBlock);

      try {
        this.options.beforeSchedulingWorkItemWrite?.();
      } catch {
        await abortQuietly(tx);
        return err('persistence_write_failed', WRITE_FAILED_MESSAGE);
      }

      await tx.objectStore('workItems').put(updatedWorkItem);
      await tx.done;
      return ok(undefined);
    } catch {
      await abortQuietly(tx);
      return err('persistence_write_failed', WRITE_FAILED_MESSAGE);
    }
  }

  async removeTimeBlock(id: string, updatedWorkItem?: WorkItem | null): Promise<Result<void>> {
    const stores: Array<'timeBlocks' | 'workItems'> = updatedWorkItem
      ? ['timeBlocks', 'workItems']
      : ['timeBlocks'];

    const tx = this.db.transaction(stores, 'readwrite');
    try {
      await tx.objectStore('timeBlocks').delete(id);

      if (updatedWorkItem) {
        try {
          this.options.beforeSchedulingWorkItemWrite?.();
        } catch {
          await abortQuietly(tx);
          return err('persistence_write_failed', WRITE_FAILED_MESSAGE);
        }
        await tx.objectStore('workItems').put(updatedWorkItem);
      }

      await tx.done;
      return ok(undefined);
    } catch {
      await abortQuietly(tx);
      return err('persistence_write_failed', WRITE_FAILED_MESSAGE);
    }
  }

  async moveTimeBlock(timeBlock: TimeBlock): Promise<Result<void>> {
    const blockValid = validateStoredTimeBlock(timeBlock);
    if (!blockValid.ok) return blockValid;

    const tx = this.db.transaction('timeBlocks', 'readwrite');
    try {
      const tbStore = tx.objectStore('timeBlocks');
      const sameDayRows = await tbStore.index('date').getAll(timeBlock.date);
      const parsedExisting = parseRecords(timeBlockSchema, sameDayRows, validateStoredTimeBlock);
      if (!parsedExisting.ok) {
        await abortQuietly(tx);
        return parsedExisting;
      }

      if (timeBlock.workItemId !== null) {
        for (const existing of parsedExisting.value) {
          if (
            existing.id !== timeBlock.id &&
            existing.workItemId !== null &&
            timeBlock.startMinute < existing.endMinute &&
            existing.startMinute < timeBlock.endMinute
          ) {
            await abortQuietly(tx);
            return err(
              'time_block_overlap',
              `Time block (${timeBlock.startMinute}..${timeBlock.endMinute}) overlaps with existing block (${existing.startMinute}..${existing.endMinute}).`,
            );
          }
        }
      }

      await tbStore.put(timeBlock);
      await tx.done;
      return ok(undefined);
    } catch {
      await abortQuietly(tx);
      return err('persistence_write_failed', WRITE_FAILED_MESSAGE);
    }
  }
}

export async function createGuestPlannerRepository(
  options: GuestPlannerRepositoryOptions = {},
): Promise<PlannerRepository> {
  const db = await openGuestTodayDb(options.databaseName);
  return new GuestPlannerRepository(db, options);
}
