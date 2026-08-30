import type { IDBPDatabase } from 'idb';
import { z } from 'zod';
import { validateDistraction, type Distraction } from '@/domain/focus/distraction';
import { validateFocusSession, type FocusSession } from '@/domain/focus/focus-session';
import { err, ok, type Result } from '@/domain/shared/result';
import { validateWorkItem, type WorkItem } from '@/domain/work-items/work-item';
import type { FocusRepository } from '@/infrastructure/persistence/contracts/focus-repository';
import { openGuestTodayDb, type GuestTodayDB } from './guest-db';

export interface GuestFocusRepositoryOptions {
  databaseName?: string;
  beforeWorkItemWrite?: () => void;
}

const CORRUPT_RECORD_MESSAGE = 'Stored data is invalid and was left untouched.';
const READ_FAILED_MESSAGE = 'Failed to read guest data.';
const WRITE_FAILED_MESSAGE = 'Failed to write guest data.';

const focusSessionSchema = z.object({
  id: z.string(),
  workItemId: z.string().nullable(),
  timeBlockId: z.string().nullable(),
  status: z.enum(['running', 'paused', 'completed', 'abandoned']),
  mode: z.enum(['countdown', 'flow']),
  plannedDurationMinutes: z.number().int().nullable(),
  startedAt: z.string(),
  runningSince: z.string().nullable(),
  endedAt: z.string().nullable(),
  accumulatedFocusMs: z.number().int(),
  focusedDurationMs: z.number().int().nullable(),
  startLatencyMinutes: z.number().int().nullable(),
  note: z.string(),
  qualityRating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const distractionSchema = z.object({
  id: z.string(),
  focusSessionId: z.string(),
  text: z.string(),
  capturedAt: z.string(),
});

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
  return tx.done.then(
    () => undefined,
    () => undefined,
  );
}

export class GuestFocusRepository implements FocusRepository {
  constructor(
    private readonly db: IDBPDatabase<GuestTodayDB>,
    private readonly options: GuestFocusRepositoryOptions,
  ) {}

  async getSession(id: string): Promise<Result<FocusSession | null>> {
    try {
      const row = await this.db.get('focusSessions', id);
      if (row === undefined) return ok(null);
      return parseRecord(focusSessionSchema, row, validateFocusSession);
    } catch {
      return readFailed();
    }
  }

  async listSessions(): Promise<Result<FocusSession[]>> {
    try {
      return parseRecords(focusSessionSchema, await this.db.getAll('focusSessions'), validateFocusSession);
    } catch {
      return readFailed();
    }
  }

  async listSessionsForWorkItem(workItemId: string): Promise<Result<FocusSession[]>> {
    try {
      return parseRecords(
        focusSessionSchema,
        await this.db.getAllFromIndex('focusSessions', 'workItemId', workItemId),
        validateFocusSession,
      );
    } catch {
      return readFailed();
    }
  }

  async getActiveSession(): Promise<Result<FocusSession | null>> {
    try {
      const running = await this.db.getAllFromIndex('focusSessions', 'status', 'running');
      const paused = await this.db.getAllFromIndex('focusSessions', 'status', 'paused');
      const active = [...running, ...paused];
      if (active.length > 1) {
        return err('corrupt_record', CORRUPT_RECORD_MESSAGE);
      }
      if (active.length === 0) return ok(null);
      return parseRecord(focusSessionSchema, active[0], validateFocusSession);
    } catch {
      return readFailed();
    }
  }

  async saveSession(session: FocusSession): Promise<Result<void>> {
    try {
      await this.db.put('focusSessions', session);
      return ok(undefined);
    } catch {
      return writeFailed();
    }
  }

  async completeSessionWithWorkItem(session: FocusSession, workItem: WorkItem): Promise<Result<void>> {
    const validWorkItem = validateWorkItem(workItem);
    if (!validWorkItem.ok) {
      return err('corrupt_record', CORRUPT_RECORD_MESSAGE);
    }
    const tx = this.db.transaction(['focusSessions', 'workItems'], 'readwrite');
    try {
      await tx.objectStore('focusSessions').put(session);
      try {
        this.options.beforeWorkItemWrite?.();
      } catch {
        await abortQuietly(tx);
        return writeFailed();
      }
      await tx.objectStore('workItems').put(workItem);
      await tx.done;
      return ok(undefined);
    } catch {
      await abortQuietly(tx);
      return writeFailed();
    }
  }

  async listDistractions(focusSessionId: string): Promise<Result<Distraction[]>> {
    try {
      return parseRecords(
        distractionSchema,
        await this.db.getAllFromIndex('distractions', 'focusSessionId', focusSessionId),
        validateDistraction,
      );
    } catch {
      return readFailed();
    }
  }

  async saveDistraction(distraction: Distraction): Promise<Result<void>> {
    try {
      await this.db.put('distractions', distraction);
      return ok(undefined);
    } catch {
      return writeFailed();
    }
  }
}

export async function createGuestFocusRepository(
  options: GuestFocusRepositoryOptions = {},
): Promise<FocusRepository> {
  const db = await openGuestTodayDb(options.databaseName);
  return new GuestFocusRepository(db, options);
}
