import { expect, it } from 'vitest';
import { completeWorkItem, reopenWorkItem, validateWorkItem, type WorkItem } from './work-item';

const item: WorkItem = {
  id: 'w1',
  projectId: null,
  title: 'Study algebra',
  notes: '',
  type: 'task',
  estimatedMinutes: 60,
  actualMinutes: 12,
  priority: 'p1_urgent',
  status: 'in_progress',
  completedAt: null,
  createdAt: '2026-08-30T08:00:00.000Z',
  updatedAt: '2026-08-30T08:00:00.000Z',
};

it('completes a work item without fabricating actual focus time', () => {
  const completed = completeWorkItem(item, '2026-08-30T09:00:00.000Z');
  expect(completed.status).toBe('completed');
  expect(completed.completedAt).toBe('2026-08-30T09:00:00.000Z');
  expect(completed.actualMinutes).toBe(12);
  expect(item.status).toBe('in_progress');
});

it('reopens to scheduled only when scheduling evidence exists', () => {
  const completed = { ...item, status: 'completed' as const, completedAt: '2026-08-30T09:00:00.000Z' };
  expect(reopenWorkItem(completed, false, '2026-08-30T10:00:00.000Z').status).toBe('backlog');
  expect(reopenWorkItem(completed, true, '2026-08-30T10:00:00.000Z').status).toBe('scheduled');
  expect(reopenWorkItem(completed, true, '2026-08-30T10:00:00.000Z').completedAt).toBeNull();
});

it('rejects blank titles and invalid minute fields', () => {
  expect(validateWorkItem({ title: 'Algebra', estimatedMinutes: 60, actualMinutes: 0 }).ok).toBe(true);
  expect(validateWorkItem({ title: '   ', estimatedMinutes: 60, actualMinutes: 0 }).ok).toBe(false);
  expect(validateWorkItem({ title: 'Algebra', estimatedMinutes: 0, actualMinutes: 0 }).ok).toBe(false);
  expect(validateWorkItem({ title: 'Algebra', estimatedMinutes: 45.5, actualMinutes: 0 }).ok).toBe(false);
  expect(validateWorkItem({ title: 'Algebra', estimatedMinutes: 60, actualMinutes: -1 }).ok).toBe(false);
});
