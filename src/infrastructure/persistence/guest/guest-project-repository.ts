import type { IDBPDatabase } from 'idb';
import { z } from 'zod';
import { validateProject, type Project } from '@/domain/projects/project';
import { validateMilestone, type ProjectMilestone } from '@/domain/projects/project-milestone';
import { err, ok, type Result } from '@/domain/shared/result';
import type { ProjectRepository } from '@/infrastructure/persistence/contracts/project-repository';
import { openGuestTodayDb, type GuestTodayDB } from './guest-db';

export interface GuestProjectRepositoryOptions {
  databaseName?: string;
}

const CORRUPT_RECORD_MESSAGE = 'Stored project data is invalid and was left untouched.';
const READ_FAILED_MESSAGE = 'Failed to read guest project data.';
const WRITE_FAILED_MESSAGE = 'Failed to write guest project data.';

const projectSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(['active', 'completed', 'archived']),
  targetDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
});

const milestoneSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  targetDate: z.string().nullable(),
  order: z.number().int(),
  status: z.enum(['active', 'completed']),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
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

function abortQuietly(tx: { abort: () => void; done: Promise<unknown> }): Promise<void> {
  try {
    tx.abort();
  } catch {
    // Transaction already finished or aborting.
  }
  return tx.done.then(() => undefined, () => undefined);
}

export class GuestProjectRepository implements ProjectRepository {
  constructor(private readonly db: IDBPDatabase<GuestTodayDB>) {}

  async listProjects(includeArchived = false): Promise<Result<Project[]>> {
    try {
      const allRows = await this.db.getAll('projects');
      const parsed = parseRecords(projectSchema, allRows, validateProject);
      if (!parsed.ok) return parsed;

      if (includeArchived) {
        return ok(parsed.value);
      }
      return ok(parsed.value.filter((p) => p.status !== 'archived'));
    } catch {
      return err('persistence_read_failed', READ_FAILED_MESSAGE);
    }
  }

  async getProject(id: string): Promise<Result<Project | null>> {
    try {
      const row = await this.db.get('projects', id);
      if (row === undefined) return ok(null);
      return parseRecord(projectSchema, row, validateProject);
    } catch {
      return err('persistence_read_failed', READ_FAILED_MESSAGE);
    }
  }

  async saveProject(project: Project): Promise<Result<void>> {
    const validation = validateProject(project);
    if (!validation.ok) return validation;

    try {
      await this.db.put('projects', project);
      return ok(undefined);
    } catch {
      return err('persistence_write_failed', WRITE_FAILED_MESSAGE);
    }
  }

  async listMilestones(projectId: string): Promise<Result<ProjectMilestone[]>> {
    try {
      const rows = await this.db.getAllFromIndex('projectMilestones', 'projectId', projectId);
      const parsed = parseRecords(milestoneSchema, rows, validateMilestone);
      if (!parsed.ok) return parsed;

      const sorted = [...parsed.value].sort((a, b) => a.order - b.order);
      return ok(sorted);
    } catch {
      return err('persistence_read_failed', READ_FAILED_MESSAGE);
    }
  }

  async getMilestone(id: string): Promise<Result<ProjectMilestone | null>> {
    try {
      const row = await this.db.get('projectMilestones', id);
      if (row === undefined) return ok(null);
      return parseRecord(milestoneSchema, row, validateMilestone);
    } catch {
      return err('persistence_read_failed', READ_FAILED_MESSAGE);
    }
  }

  async saveMilestone(milestone: ProjectMilestone): Promise<Result<void>> {
    const validation = validateMilestone(milestone);
    if (!validation.ok) return validation;

    try {
      await this.db.put('projectMilestones', milestone);
      return ok(undefined);
    } catch {
      return err('persistence_write_failed', WRITE_FAILED_MESSAGE);
    }
  }

  async replaceMilestones(
    projectId: string,
    milestones: ProjectMilestone[],
  ): Promise<Result<void>> {
    for (const ms of milestones) {
      const validation = validateMilestone(ms);
      if (!validation.ok) return validation;
    }

    const tx = this.db.transaction('projectMilestones', 'readwrite');
    try {
      const store = tx.objectStore('projectMilestones');
      const existingKeys = await store.index('projectId').getAllKeys(projectId);
      await Promise.all(existingKeys.map((key) => store.delete(key)));
      await Promise.all(milestones.map((ms) => store.put(ms)));
      await tx.done;
      return ok(undefined);
    } catch {
      await abortQuietly(tx);
      return err('persistence_write_failed', WRITE_FAILED_MESSAGE);
    }
  }

  async deleteMilestone(id: string): Promise<Result<void>> {
    try {
      await this.db.delete('projectMilestones', id);
      return ok(undefined);
    } catch {
      return err('persistence_write_failed', WRITE_FAILED_MESSAGE);
    }
  }
}

export async function createGuestProjectRepository(
  options: GuestProjectRepositoryOptions = {},
): Promise<ProjectRepository> {
  const db = await openGuestTodayDb(options.databaseName);
  return new GuestProjectRepository(db);
}
