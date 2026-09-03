import { describe, expect, it } from 'vitest';
import {
  archiveProject,
  completeProject,
  createProject,
  unarchiveProject,
  updateProject,
  validateProject,
  type Project,
} from './project';

describe('Project domain entity', () => {
  it('creates a valid active project', () => {
    const result = createProject({
      id: 'proj-1',
      title: 'Chemistry Grade 11 Semester 1',
      description: 'Master all chapters and labs',
      targetDate: '2026-10-15',
      now: '2026-09-01T10:00:00.000Z',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toEqual({
      id: 'proj-1',
      title: 'Chemistry Grade 11 Semester 1',
      description: 'Master all chapters and labs',
      status: 'active',
      targetDate: '2026-10-15',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
      completedAt: null,
    });
  });

  it('rejects empty or whitespace-only title', () => {
    const result = createProject({
      id: 'proj-1',
      title: '   ',
      description: '',
      targetDate: null,
      now: '2026-09-01T10:00:00.000Z',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('invalid_title');
  });

  it('rejects title longer than 140 characters', () => {
    const result = createProject({
      id: 'proj-1',
      title: 'A'.repeat(141),
      description: '',
      targetDate: null,
      now: '2026-09-01T10:00:00.000Z',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('invalid_title');
  });

  it('rejects invalid local calendar target date', () => {
    const result = createProject({
      id: 'proj-1',
      title: 'Valid Title',
      description: '',
      targetDate: '2026-02-31',
      now: '2026-09-01T10:00:00.000Z',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('invalid_target_date');
  });

  it('rejects description longer than 1000 characters', () => {
    const result = createProject({
      id: 'proj-1',
      title: 'Valid Title',
      description: 'D'.repeat(1001),
      targetDate: null,
      now: '2026-09-01T10:00:00.000Z',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('invalid_description');
  });

  it('updates project metadata and timestamps', () => {
    const initial: Project = {
      id: 'proj-1',
      title: 'Old Title',
      description: 'Old Description',
      status: 'active',
      targetDate: '2026-10-01',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
      completedAt: null,
    };

    const result = updateProject(initial, {
      title: 'Updated Title',
      description: 'New Description',
      targetDate: '2026-11-01',
      now: '2026-09-02T12:00:00.000Z',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toEqual({
      ...initial,
      title: 'Updated Title',
      description: 'New Description',
      targetDate: '2026-11-01',
      updatedAt: '2026-09-02T12:00:00.000Z',
    });
  });

  it('completes project explicitly with completedAt timestamp', () => {
    const initial: Project = {
      id: 'proj-1',
      title: 'Active Project',
      description: '',
      status: 'active',
      targetDate: '2026-10-01',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
      completedAt: null,
    };

    const completed = completeProject(initial, '2026-09-10T15:30:00.000Z');
    expect(completed.status).toBe('completed');
    expect(completed.completedAt).toBe('2026-09-10T15:30:00.000Z');
    expect(completed.updatedAt).toBe('2026-09-10T15:30:00.000Z');
  });

  it('archives and unarchives project non-destructively', () => {
    const initial: Project = {
      id: 'proj-1',
      title: 'Active Project',
      description: 'Some notes',
      status: 'active',
      targetDate: '2026-10-01',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
      completedAt: null,
    };

    const archived = archiveProject(initial, '2026-09-05T08:00:00.000Z');
    expect(archived.status).toBe('archived');
    expect(archived.updatedAt).toBe('2026-09-05T08:00:00.000Z');

    const unarchived = unarchiveProject(archived, '2026-09-06T09:00:00.000Z');
    expect(unarchived.status).toBe('active');
    expect(unarchived.updatedAt).toBe('2026-09-06T09:00:00.000Z');
  });

  it('validates project semantic integrity', () => {
    const validProject: Project = {
      id: 'proj-1',
      title: 'Title',
      description: 'Desc',
      status: 'active',
      targetDate: '2026-12-31',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
      completedAt: null,
    };
    expect(validateProject(validProject).ok).toBe(true);

    const invalidCompleted: Project = {
      ...validProject,
      status: 'completed',
      completedAt: null,
    };
    expect(validateProject(invalidCompleted).ok).toBe(false);

    const invalidActiveWithCompletedAt: Project = {
      ...validProject,
      status: 'active',
      completedAt: '2026-09-01T10:00:00.000Z',
    };
    expect(validateProject(invalidActiveWithCompletedAt).ok).toBe(false);

    const invalidUpdatedAt: Project = {
      ...validProject,
      createdAt: '2026-09-02T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
    };
    expect(validateProject(invalidUpdatedAt).ok).toBe(false);
  });
});
