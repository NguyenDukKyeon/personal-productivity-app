import { expect, it } from 'vitest';
import { localMinuteOfDay } from '@/domain/focus/focus-session';
import type { Result } from '@/domain/shared/result';
import { toLocalDateKey } from '@/domain/shared/local-date';
import type { TimeBlock } from '@/domain/time-blocks/time-block';
import type { WorkItem } from '@/domain/work-items/work-item';
import { createGuestFocusRepository } from '@/infrastructure/persistence/guest/guest-focus-repository';
import { createGuestTodayRepository } from '@/infrastructure/persistence/guest/guest-today-repository';
import { createFocusService } from './focus-service';

const NOW = new Date('2026-08-31T08:00:00.000Z');
const DATE = toLocalDateKey(NOW);

function unwrap<T>(result: Result<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.message);
  return result.value;
}

function workItem(): WorkItem {
  const timestamp = NOW.toISOString();
  return {
    id: 'w1',
    projectId: null,
    title: 'Algebra',
    notes: '',
    type: 'task',
    estimatedMinutes: 50,
    actualMinutes: 0,
    priority: 'p1_urgent',
    status: 'scheduled',
    completedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function timeBlock(itemId: string): TimeBlock {
  const timestamp = NOW.toISOString();
  const startMinute = localMinuteOfDay(NOW);
  return {
    id: 'tb1',
    date: DATE,
    workItemId: itemId,
    habitId: null,
    startMinute,
    endMinute: startMinute + 60,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

async function createHarness(options: { beforeWorkItemWrite?: () => void } = {}) {
  const name = `focus-service-${crypto.randomUUID()}`;
  const todayRepository = await createGuestTodayRepository({ databaseName: name });
  const focusRepository = await createGuestFocusRepository({
    databaseName: name,
    beforeWorkItemWrite: options.beforeWorkItemWrite,
  });
  let now = new Date(NOW);
  let seq = 0;
  const service = createFocusService({
    focusRepository,
    todayRepository,
    now: () => now,
    newId: () => `id-${++seq}`,
  });
  return {
    service,
    todayRepository,
    setNow(iso: string) {
      now = new Date(iso);
    },
  };
}

async function seedScheduledWork(harness: Awaited<ReturnType<typeof createHarness>>) {
  const item = workItem();
  const block = timeBlock(item.id);
  unwrap(await harness.todayRepository.saveWorkItem(item));
  unwrap(await harness.todayRepository.saveTimeBlock(block));
  return { item, block };
}

it('starts countdown focus for a known work item and reconstructs elapsed time', async () => {
  const harness = await createHarness();
  const { item, block } = await seedScheduledWork(harness);

  const started = unwrap(
    await harness.service.startSession({
      workItemId: item.id,
      timeBlockId: block.id,
      mode: 'countdown',
      plannedDurationMinutes: 50,
    }),
  );
  expect(started.status).toBe('running');
  expect(started.startLatencyMinutes).toBe(0);
  expect(started.focusedDurationMs).toBeNull();

  harness.setNow('2026-08-31T08:12:00.000Z');
  const view = unwrap(await harness.service.getFocusView());
  expect(view.activeSession?.id).toBe(started.id);
  expect(view.elapsedMs).toBe(12 * 60_000);
  expect(view.remainingMs).toBe(38 * 60_000);
  expect(view.workItem?.title).toBe('Algebra');
});

it('rejects unknown work items and unknown time blocks without writing a session', async () => {
  const harness = await createHarness();
  const { item } = await seedScheduledWork(harness);

  const unknownItem = await harness.service.startSession({
    workItemId: 'missing',
    timeBlockId: null,
    mode: 'flow',
    plannedDurationMinutes: null,
  });
  expect(unknownItem.ok).toBe(false);
  if (!unknownItem.ok) expect(unknownItem.code).toBe('unknown_entity');

  const unknownBlock = await harness.service.startSession({
    workItemId: item.id,
    timeBlockId: 'missing-block',
    mode: 'countdown',
    plannedDurationMinutes: 25,
  });
  expect(unknownBlock.ok).toBe(false);
  if (!unknownBlock.ok) expect(unknownBlock.code).toBe('unknown_entity');

  expect(unwrap(await harness.service.getFocusView()).activeSession).toBeNull();
});

it('rejects a second active session', async () => {
  const harness = await createHarness();
  const { item } = await seedScheduledWork(harness);
  unwrap(
    await harness.service.startSession({
      workItemId: item.id,
      timeBlockId: null,
      mode: 'flow',
      plannedDurationMinutes: null,
    }),
  );

  const second = await harness.service.startSession({
    workItemId: item.id,
    timeBlockId: null,
    mode: 'flow',
    plannedDurationMinutes: null,
  });
  expect(second.ok).toBe(false);
  if (!second.ok) expect(second.code).toBe('session_active');
});

it('rejects invalid planned duration', async () => {
  const harness = await createHarness();
  const { item } = await seedScheduledWork(harness);
  const result = await harness.service.startSession({
    workItemId: item.id,
    timeBlockId: null,
    mode: 'countdown',
    plannedDurationMinutes: 0,
  });
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.code).toBe('invalid_planned_duration');
});

it('pauses, resumes and excludes paused time from focused duration', async () => {
  const harness = await createHarness();
  const { item } = await seedScheduledWork(harness);
  const started = unwrap(
    await harness.service.startSession({
      workItemId: item.id,
      timeBlockId: null,
      mode: 'countdown',
      plannedDurationMinutes: 50,
    }),
  );

  harness.setNow('2026-08-31T08:10:00.000Z');
  unwrap(await harness.service.pauseSession(started.id));
  harness.setNow('2026-08-31T08:15:00.000Z');
  unwrap(await harness.service.resumeSession(started.id));
  harness.setNow('2026-08-31T08:20:00.000Z');
  const finished = unwrap(await harness.service.finishSession(started.id, {}));

  expect(finished.focusedDurationMs).toBe(15 * 60_000);
  expect(finished.plannedDurationMinutes).toBe(50);
});

it('captures distractions without pausing the timer', async () => {
  const harness = await createHarness();
  const { item } = await seedScheduledWork(harness);
  const started = unwrap(
    await harness.service.startSession({
      workItemId: item.id,
      timeBlockId: null,
      mode: 'flow',
      plannedDurationMinutes: null,
    }),
  );

  harness.setNow('2026-08-31T08:03:00.000Z');
  unwrap(await harness.service.captureDistraction(started.id, '  reply to message  '));
  const view = unwrap(await harness.service.getFocusView());

  expect(view.activeSession?.status).toBe('running');
  expect(view.activeSession?.accumulatedFocusMs).toBe(0);
  expect(view.elapsedMs).toBe(3 * 60_000);
  expect(view.interruptionCount).toBe(1);
  expect(view.distractions[0]?.text).toBe('reply to message');
});

it('does not mutate the associated TimeBlock through a full focus journey', async () => {
  const harness = await createHarness();
  const { item, block } = await seedScheduledWork(harness);
  const started = unwrap(
    await harness.service.startSession({
      workItemId: item.id,
      timeBlockId: block.id,
      mode: 'countdown',
      plannedDurationMinutes: 50,
    }),
  );
  harness.setNow('2026-08-31T08:05:00.000Z');
  unwrap(await harness.service.pauseSession(started.id));
  harness.setNow('2026-08-31T08:06:00.000Z');
  unwrap(await harness.service.resumeSession(started.id));
  harness.setNow('2026-08-31T08:12:00.000Z');
  unwrap(await harness.service.finishSession(started.id, { note: 'solid', qualityRating: 5 }));

  expect(unwrap(await harness.todayRepository.getTimeBlock(block.id))).toEqual(block);
});

it('updates actualMinutes from completed sessions only and ignores abandoned time', async () => {
  const harness = await createHarness();
  const { item } = await seedScheduledWork(harness);

  const first = unwrap(
    await harness.service.startSession({
      workItemId: item.id,
      timeBlockId: null,
      mode: 'countdown',
      plannedDurationMinutes: 50,
    }),
  );
  harness.setNow('2026-08-31T08:12:00.000Z');
  unwrap(await harness.service.finishSession(first.id, {}));
  expect(unwrap(await harness.todayRepository.getWorkItem(item.id))?.actualMinutes).toBe(12);

  harness.setNow('2026-08-31T08:20:00.000Z');
  const second = unwrap(
    await harness.service.startSession({
      workItemId: item.id,
      timeBlockId: null,
      mode: 'flow',
      plannedDurationMinutes: null,
    }),
  );
  harness.setNow('2026-08-31T08:50:00.000Z');
  unwrap(await harness.service.abandonSession(second.id));
  expect(unwrap(await harness.todayRepository.getWorkItem(item.id))?.actualMinutes).toBe(12);

  const completed = unwrap(await harness.service.listCompletedSessions());
  expect(completed).toHaveLength(1);
  expect(completed[0].focusedDurationMs).toBe(12 * 60_000);
  expect(completed[0].focusedDurationMs).not.toBe(50 * 60_000);
  expect(completed[0].focusedDurationMs).not.toBe(60 * 60_000);
});

it('rolls back completion so the session stays active and actualMinutes stay unchanged', async () => {
  const harness = await createHarness({
    beforeWorkItemWrite: () => {
      throw new Error('forced work item write failure');
    },
  });
  const { item } = await seedScheduledWork(harness);
  const started = unwrap(
    await harness.service.startSession({
      workItemId: item.id,
      timeBlockId: null,
      mode: 'countdown',
      plannedDurationMinutes: 50,
    }),
  );
  harness.setNow('2026-08-31T08:12:00.000Z');
  const finished = await harness.service.finishSession(started.id, {});
  expect(finished.ok).toBe(false);
  if (!finished.ok) expect(finished.code).toBe('persistence_write_failed');

  const view = unwrap(await harness.service.getFocusView());
  expect(view.activeSession?.status).toBe('running');
  expect(unwrap(await harness.todayRepository.getWorkItem(item.id))?.actualMinutes).toBe(0);
});

it('rejects blank distraction text', async () => {
  const harness = await createHarness();
  const { item } = await seedScheduledWork(harness);
  const started = unwrap(
    await harness.service.startSession({
      workItemId: item.id,
      timeBlockId: null,
      mode: 'flow',
      plannedDurationMinutes: null,
    }),
  );
  const result = await harness.service.captureDistraction(started.id, '   ');
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.code).toBe('invalid_distraction');
});
