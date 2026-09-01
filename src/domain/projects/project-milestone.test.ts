import { describe, expect, it } from 'vitest';
import {
  completeMilestone,
  createMilestone,
  reorderMilestones,
  updateMilestone,
  validateMilestone,
  type ProjectMilestone,
} from './project-milestone';

describe('ProjectMilestone domain entity', () => {
  it('creates a valid active milestone', () => {
    const result = createMilestone({
      id: 'ms-1',
      projectId: 'proj-1',
      title: 'Chapter 1: Atomic Structure',
      targetDate: '2026-09-20',
      order: 0,
      now: '2026-09-01T10:00:00.000Z',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toEqual({
      id: 'ms-1',
      projectId: 'proj-1',
      title: 'Chapter 1: Atomic Structure',
      targetDate: '2026-09-20',
      order: 0,
      status: 'active',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
      completedAt: null,
    });
  });

  it('rejects empty title or title > 140 chars', () => {
    expect(
      createMilestone({
        id: 'ms-1',
        projectId: 'proj-1',
        title: '   ',
        targetDate: null,
        order: 0,
        now: '2026-09-01T10:00:00.000Z',
      }).ok,
    ).toBe(false);

    expect(
      createMilestone({
        id: 'ms-1',
        projectId: 'proj-1',
        title: 'M'.repeat(141),
        targetDate: null,
        order: 0,
        now: '2026-09-01T10:00:00.000Z',
      }).ok,
    ).toBe(false);
  });

  it('rejects empty projectId or negative order', () => {
    expect(
      createMilestone({
        id: 'ms-1',
        projectId: '   ',
        title: 'Valid Milestone',
        targetDate: null,
        order: 0,
        now: '2026-09-01T10:00:00.000Z',
      }).ok,
    ).toBe(false);

    expect(
      createMilestone({
        id: 'ms-1',
        projectId: 'proj-1',
        title: 'Valid Milestone',
        targetDate: null,
        order: -1,
        now: '2026-09-01T10:00:00.000Z',
      }).ok,
    ).toBe(false);
  });

  it('rejects invalid target date', () => {
    expect(
      createMilestone({
        id: 'ms-1',
        projectId: 'proj-1',
        title: 'Valid Milestone',
        targetDate: '2026-13-45',
        order: 0,
        now: '2026-09-01T10:00:00.000Z',
      }).ok,
    ).toBe(false);
  });

  it('updates milestone metadata and order', () => {
    const initial: ProjectMilestone = {
      id: 'ms-1',
      projectId: 'proj-1',
      title: 'Old Title',
      targetDate: '2026-09-20',
      order: 0,
      status: 'active',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
      completedAt: null,
    };

    const result = updateMilestone(initial, {
      title: 'New Title',
      targetDate: '2026-09-25',
      order: 2,
      now: '2026-09-02T11:00:00.000Z',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toEqual({
      ...initial,
      title: 'New Title',
      targetDate: '2026-09-25',
      order: 2,
      updatedAt: '2026-09-02T11:00:00.000Z',
    });
  });

  it('completes milestone explicitly with timestamp', () => {
    const initial: ProjectMilestone = {
      id: 'ms-1',
      projectId: 'proj-1',
      title: 'Chapter 1',
      targetDate: '2026-09-20',
      order: 0,
      status: 'active',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
      completedAt: null,
    };

    const completed = completeMilestone(initial, '2026-09-18T16:00:00.000Z');
    expect(completed.status).toBe('completed');
    expect(completed.completedAt).toBe('2026-09-18T16:00:00.000Z');
    expect(completed.updatedAt).toBe('2026-09-18T16:00:00.000Z');
  });

  it('reorders milestones sequentially', () => {
    const ms1: ProjectMilestone = {
      id: 'ms-1',
      projectId: 'proj-1',
      title: 'M1',
      targetDate: null,
      order: 5,
      status: 'active',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
      completedAt: null,
    };
    const ms2: ProjectMilestone = {
      ...ms1,
      id: 'ms-2',
      title: 'M2',
      order: 2,
    };

    const reordered = reorderMilestones([ms2, ms1], '2026-09-02T10:00:00.000Z');
    expect(reordered[0].id).toBe('ms-2');
    expect(reordered[0].order).toBe(0);
    expect(reordered[1].id).toBe('ms-1');
    expect(reordered[1].order).toBe(1);
  });

  it('validates milestone semantic integrity', () => {
    const valid: ProjectMilestone = {
      id: 'ms-1',
      projectId: 'proj-1',
      title: 'Chapter 1',
      targetDate: '2026-09-20',
      order: 0,
      status: 'active',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
      completedAt: null,
    };
    expect(validateMilestone(valid).ok).toBe(true);

    const invalidStatus: ProjectMilestone = {
      ...valid,
      status: 'completed',
      completedAt: null,
    };
    expect(validateMilestone(invalidStatus).ok).toBe(false);
  });
});
