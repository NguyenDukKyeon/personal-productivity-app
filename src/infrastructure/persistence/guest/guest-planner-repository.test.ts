import { openDB } from 'idb';
import { describe, expect, it } from 'vitest';
import type { DailyPlan } from '@/domain/daily-plans/daily-plan';
import type { TimeBlock } from '@/domain/time-blocks/time-block';
import type { WorkItem } from '@/domain/work-items/work-item';
import { GUEST_DB_VERSION, type GuestTodayDB } from './guest-db';
import {
  createGuestPlannerRepository,
  GuestPlannerRepository,
} from './guest-planner-repository';
import { createGuestTodayRepository } from './guest-today-repository';

function dbName(): string {
  return `personal-productivity-planner-test-${crypto.randomUUID()}`;
}

const timestamp = '2026-09-01T08:00:00.000Z';

const sampleWorkItem: WorkItem = {
  id: 'w-1',
  projectId: null,
  title: 'Chemistry Chapter 1',
  notes: '',
  type: 'task',
  estimatedMinutes: 60,
  actualMinutes: 0,
  priority: 'p1_urgent',
  status: 'backlog',
  completedAt: null,
  createdAt: timestamp,
  updatedAt: timestamp,
};

const sampleTimeBlock: TimeBlock = {
  id: 'tb-1',
  date: '2026-09-01',
  workItemId: 'w-1',
  habitId: null,
  startMinute: 480,
  endMinute: 540,
  createdAt: timestamp,
  updatedAt: timestamp,
};

describe('guest-planner-repository', () => {
  it('schedules a work item atomically (writes TimeBlock and updates WorkItem status to scheduled)', async () => {
    const name = dbName();
    const todayRepo = await createGuestTodayRepository({ databaseName: name });
    await todayRepo.saveWorkItem(sampleWorkItem);

    const plannerRepo = await createGuestPlannerRepository({ databaseName: name });
    const scheduledWorkItem: WorkItem = {
      ...sampleWorkItem,
      status: 'scheduled',
      updatedAt: '2026-09-01T08:05:00.000Z',
    };

    const scheduleRes = await plannerRepo.scheduleWorkItem(sampleTimeBlock, scheduledWorkItem);
    expect(scheduleRes).toEqual({ ok: true, value: undefined });

    // Verify both records updated
    const savedItem = await todayRepo.getWorkItem('w-1');
    expect(savedItem).toEqual({ ok: true, value: scheduledWorkItem });

    const savedBlock = await todayRepo.getTimeBlock('tb-1');
    expect(savedBlock).toEqual({ ok: true, value: sampleTimeBlock });
  });

  it('rolls back scheduling if WorkItem write fails (atomic transaction)', async () => {
    const name = dbName();
    const todayRepo = await createGuestTodayRepository({ databaseName: name });
    await todayRepo.saveWorkItem(sampleWorkItem);

    const plannerRepo = await createGuestPlannerRepository({
      databaseName: name,
      beforeSchedulingWorkItemWrite: () => {
        throw new Error('Simulated failure during workitem write');
      },
    });

    const scheduledWorkItem: WorkItem = {
      ...sampleWorkItem,
      status: 'scheduled',
      updatedAt: '2026-09-01T08:05:00.000Z',
    };

    const scheduleRes = await plannerRepo.scheduleWorkItem(sampleTimeBlock, scheduledWorkItem);
    expect(scheduleRes.ok).toBe(false);

    // Verify rollback: WorkItem remains backlog, TimeBlock was NOT created
    const itemAfter = await todayRepo.getWorkItem('w-1');
    expect(itemAfter).toEqual({ ok: true, value: sampleWorkItem });

    const blockAfter = await todayRepo.getTimeBlock('tb-1');
    expect(blockAfter).toEqual({ ok: true, value: null });
  });

  it('removes a TimeBlock and transitions WorkItem back to backlog atomically', async () => {
    const name = dbName();
    const todayRepo = await createGuestTodayRepository({ databaseName: name });
    const plannerRepo = await createGuestPlannerRepository({ databaseName: name });

    const scheduledWorkItem: WorkItem = {
      ...sampleWorkItem,
      status: 'scheduled',
      updatedAt: timestamp,
    };
    await plannerRepo.scheduleWorkItem(sampleTimeBlock, scheduledWorkItem);

    const backlogWorkItem: WorkItem = {
      ...sampleWorkItem,
      status: 'backlog',
      updatedAt: '2026-09-01T08:10:00.000Z',
    };

    const removeRes = await plannerRepo.removeTimeBlock('tb-1', backlogWorkItem);
    expect(removeRes).toEqual({ ok: true, value: undefined });

    // Verify block deleted and item in backlog
    const blockAfter = await todayRepo.getTimeBlock('tb-1');
    expect(blockAfter).toEqual({ ok: true, value: null });

    const itemAfter = await todayRepo.getWorkItem('w-1');
    expect(itemAfter).toEqual({ ok: true, value: backlogWorkItem });
  });

  it('moves a TimeBlock to another date and time atomically', async () => {
    const name = dbName();
    const plannerRepo = await createGuestPlannerRepository({ databaseName: name });
    const todayRepo = await createGuestTodayRepository({ databaseName: name });

    await todayRepo.saveTimeBlock(sampleTimeBlock);

    const movedBlock: TimeBlock = {
      ...sampleTimeBlock,
      date: '2026-09-02',
      startMinute: 600,
      endMinute: 660,
      updatedAt: '2026-09-01T08:15:00.000Z',
    };

    const moveRes = await plannerRepo.moveTimeBlock(movedBlock);
    expect(moveRes).toEqual({ ok: true, value: undefined });

    const reloaded = await todayRepo.getTimeBlock('tb-1');
    expect(reloaded).toEqual({ ok: true, value: movedBlock });
  });

  it('rejects moving TimeBlock if it would cause overlap with existing WorkItem block on target date', async () => {
    const name = dbName();
    const plannerRepo = await createGuestPlannerRepository({ databaseName: name });
    const todayRepo = await createGuestTodayRepository({ databaseName: name });

    const existingBlockOnDay2: TimeBlock = {
      id: 'tb-2',
      date: '2026-09-02',
      workItemId: 'w-2',
      habitId: null,
      startMinute: 600,
      endMinute: 720, // 10:00 - 12:00
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await todayRepo.saveTimeBlock(sampleTimeBlock);
    await todayRepo.saveTimeBlock(existingBlockOnDay2);

    // Attempt moving tb-1 to 2026-09-02 11:00 - 11:30 (overlaps with tb-2)
    const overlappingMove: TimeBlock = {
      ...sampleTimeBlock,
      date: '2026-09-02',
      startMinute: 660,
      endMinute: 690,
      updatedAt: '2026-09-01T08:15:00.000Z',
    };

    const moveRes = await plannerRepo.moveTimeBlock(overlappingMove);
    expect(moveRes.ok).toBe(false);
    if (moveRes.ok) return;
    expect(moveRes.code).toBe('time_block_overlap');

    // Original block remains untouched on 2026-09-01
    const original = await todayRepo.getTimeBlock('tb-1');
    expect(original).toEqual({ ok: true, value: sampleTimeBlock });
  });

  it('lists TimeBlocks and DailyPlans in date range', async () => {
    const name = dbName();
    const plannerRepo = await createGuestPlannerRepository({ databaseName: name });
    const todayRepo = await createGuestTodayRepository({ databaseName: name });

    const tb1: TimeBlock = { ...sampleTimeBlock, id: 'tb-1', date: '2026-09-01' };
    const tb2: TimeBlock = { ...sampleTimeBlock, id: 'tb-2', date: '2026-09-03' };
    const tbOut: TimeBlock = { ...sampleTimeBlock, id: 'tb-out', date: '2026-09-10' };

    await todayRepo.saveTimeBlock(tb1);
    await todayRepo.saveTimeBlock(tb2);
    await todayRepo.saveTimeBlock(tbOut);

    const dp1: DailyPlan = {
      id: 'dp-1',
      date: '2026-09-01',
      capacityMinutes: 300,
      morningIntention: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await plannerRepo.saveDailyPlan(dp1);

    const blocksInRange = await plannerRepo.listTimeBlocksInRange('2026-09-01', '2026-09-07');
    expect(blocksInRange.ok).toBe(true);
    if (!blocksInRange.ok) return;
    expect(blocksInRange.value.map((b) => b.id).sort()).toEqual(['tb-1', 'tb-2']);

    const plansInRange = await plannerRepo.listDailyPlansInRange('2026-09-01', '2026-09-07');
    expect(plansInRange).toEqual({ ok: true, value: [dp1] });
  });
});
