import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import type { Distraction } from '@/domain/focus/distraction';
import type { FocusSession } from '@/domain/focus/focus-session';
import { err, ok, type Result } from '@/domain/shared/result';
import type { TimeBlock } from '@/domain/time-blocks/time-block';
import type { WorkItem } from '@/domain/work-items/work-item';
import type { FocusService, FocusViewModel } from '@/features/focus/application/focus-service';
import { FocusScreen } from '@/features/focus/components/FocusScreen';

const NOW_ISO = new Date().toISOString();

function workItem(partial: Partial<WorkItem> & Pick<WorkItem, 'id' | 'title'>): WorkItem {
  return {
    projectId: null,
    notes: '',
    type: 'task',
    estimatedMinutes: 50,
    actualMinutes: 0,
    priority: 'p1_urgent',
    status: 'scheduled',
    completedAt: null,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    ...partial,
  };
}

function session(partial: Partial<FocusSession> = {}): FocusSession {
  return {
    id: 's1',
    workItemId: 'w1',
    timeBlockId: 'tb1',
    status: 'running',
    mode: 'countdown',
    plannedDurationMinutes: 50,
    startedAt: NOW_ISO,
    runningSince: NOW_ISO,
    endedAt: null,
    accumulatedFocusMs: 12 * 60_000,
    focusedDurationMs: null,
    startLatencyMinutes: 0,
    note: '',
    qualityRating: null,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    ...partial,
  };
}

function view(overrides: Partial<FocusViewModel> = {}): FocusViewModel {
  const item = workItem({ id: 'w1', title: 'Algebra' });
  return {
    activeSession: null,
    elapsedMs: 0,
    remainingMs: null,
    workItem: null,
    timeBlock: null,
    distractions: [],
    interruptionCount: 0,
    lastFinalizedSession: null,
    workItems: [item],
    todayTimeBlocks: [],
    ...overrides,
  };
}

function unused<T>(code = 'unused'): Promise<Result<T>> {
  return Promise.resolve(err(code, 'unused'));
}

function createFakeService(initial: FocusViewModel, overrides: Partial<FocusService> = {}): FocusService {
  return {
    getFocusView: vi.fn(async () => ok(initial)),
    startSession: vi.fn(async () => unused<FocusSession>()),
    pauseSession: vi.fn(async () => unused<FocusSession>()),
    resumeSession: vi.fn(async () => unused<FocusSession>()),
    finishSession: vi.fn(async () => unused<FocusSession>()),
    abandonSession: vi.fn(async () => unused<FocusSession>()),
    captureDistraction: vi.fn(async () => unused<Distraction>()),
    listCompletedSessions: vi.fn(async () => unused<FocusSession[]>()),
    ...overrides,
  };
}

async function renderFocus(service: FocusService, initial?: { workItemId?: string; timeBlockId?: string }) {
  render(
    <FocusScreen
      service={service}
      initialWorkItemId={initial?.workItemId ?? null}
      initialTimeBlockId={initial?.timeBlockId ?? null}
    />,
  );
  await screen.findByRole('heading', { name: 'Focus Station' });
}

it('starts a countdown session for the selected work item', async () => {
  const user = userEvent.setup();
  const running = session();
  const service = createFakeService(view(), {
    startSession: vi.fn(async (input) => {
      expect(input).toEqual({
        workItemId: 'w1',
        timeBlockId: null,
        mode: 'countdown',
        plannedDurationMinutes: 25,
      });
      return ok(running);
    }),
    getFocusView: vi
      .fn()
      .mockResolvedValueOnce(ok(view()))
      .mockResolvedValueOnce(
        ok(
          view({
            activeSession: running,
            elapsedMs: 12 * 60_000,
            remainingMs: 38 * 60_000,
            workItem: workItem({ id: 'w1', title: 'Algebra' }),
          }),
        ),
      ),
  });

  await renderFocus(service);
  await user.selectOptions(screen.getByLabelText('Focus task'), 'w1');
  await user.selectOptions(screen.getByLabelText('Focus mode'), 'countdown');
  await user.clear(screen.getByLabelText('Planned minutes'));
  await user.type(screen.getByLabelText('Planned minutes'), '25');
  await user.click(screen.getByRole('button', { name: 'Start focus' }));

  expect(service.startSession).toHaveBeenCalled();
  expect(await screen.findByText('Algebra')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
});

it('shows elapsed and remaining time for a restored running session', async () => {
  const running = session();
  const service = createFakeService(
    view({
      activeSession: running,
      elapsedMs: 12 * 60_000,
      remainingMs: 38 * 60_000,
      workItem: workItem({ id: 'w1', title: 'Algebra' }),
    }),
  );

  await renderFocus(service);
  expect(screen.getByLabelText('Elapsed focus time').textContent).toMatch(/12:0/);
  expect(screen.getByLabelText('Remaining focus time').textContent).toMatch(/Remaining 3[78]:/);
  expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
  expect(screen.getByText('Algebra')).toBeTruthy();
});

it('pauses, resumes, finishes and abandons through the controls', async () => {
  const user = userEvent.setup();
  const running = session();
  const paused = session({ status: 'paused', runningSince: null });
  const item = workItem({ id: 'w1', title: 'Algebra' });
  const service = createFakeService(
    view({
      activeSession: running,
      elapsedMs: 12 * 60_000,
      remainingMs: 38 * 60_000,
      workItem: item,
    }),
    {
      pauseSession: vi.fn(async () => ok(paused)),
      resumeSession: vi.fn(async () => ok(running)),
      finishSession: vi.fn(async () =>
        ok(session({ status: 'completed', focusedDurationMs: 12 * 60_000, runningSince: null, endedAt: NOW_ISO })),
      ),
      abandonSession: vi.fn(async () =>
        ok(session({ status: 'abandoned', focusedDurationMs: 5 * 60_000, runningSince: null, endedAt: NOW_ISO })),
      ),
      getFocusView: vi
        .fn()
        .mockResolvedValueOnce(
          ok(view({ activeSession: running, elapsedMs: 12 * 60_000, remainingMs: 38 * 60_000, workItem: item })),
        )
        .mockResolvedValueOnce(
          ok(view({ activeSession: paused, elapsedMs: 12 * 60_000, remainingMs: 38 * 60_000, workItem: item })),
        )
        .mockResolvedValueOnce(
          ok(view({ activeSession: running, elapsedMs: 12 * 60_000, remainingMs: 38 * 60_000, workItem: item })),
        )
        .mockResolvedValueOnce(
          ok(
            view({
              activeSession: null,
              lastFinalizedSession: session({
                status: 'completed',
                focusedDurationMs: 12 * 60_000,
                runningSince: null,
                endedAt: NOW_ISO,
              }),
              workItem: item,
              interruptionCount: 1,
            }),
          ),
        ),
    },
  );

  await renderFocus(service);
  await user.click(screen.getByRole('button', { name: 'Pause' }));
  expect(service.pauseSession).toHaveBeenCalledWith('s1');
  expect(await screen.findByRole('button', { name: 'Resume' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Resume' }));
  expect(service.resumeSession).toHaveBeenCalledWith('s1');
  await user.click(await screen.findByRole('button', { name: 'Finish' }));
  expect(service.finishSession).toHaveBeenCalled();
  expect(await screen.findByText(/Focused 12:00/)).toBeTruthy();
});

it('captures a distraction without requiring the timer to pause', async () => {
  const user = userEvent.setup();
  const running = session();
  const item = workItem({ id: 'w1', title: 'Algebra' });
  const service = createFakeService(
    view({ activeSession: running, elapsedMs: 12 * 60_000, remainingMs: 38 * 60_000, workItem: item }),
    {
      captureDistraction: vi.fn(async () =>
        ok({ id: 'd1', focusSessionId: 's1', text: 'TikTok', capturedAt: NOW_ISO }),
      ),
      getFocusView: vi
        .fn()
        .mockResolvedValueOnce(
          ok(view({ activeSession: running, elapsedMs: 12 * 60_000, remainingMs: 38 * 60_000, workItem: item })),
        )
        .mockResolvedValueOnce(
          ok(
            view({
              activeSession: running,
              elapsedMs: 12 * 60_000,
              remainingMs: 38 * 60_000,
              workItem: item,
              distractions: [{ id: 'd1', focusSessionId: 's1', text: 'TikTok', capturedAt: NOW_ISO }],
              interruptionCount: 1,
            }),
          ),
        ),
    },
  );

  await renderFocus(service);
  await user.type(screen.getByLabelText('Distraction'), 'TikTok');
  await user.click(screen.getByRole('button', { name: 'Capture distraction' }));
  expect(service.captureDistraction).toHaveBeenCalledWith('s1', 'TikTok');
  expect(service.pauseSession).not.toHaveBeenCalled();
  expect(await screen.findByText('TikTok')).toBeTruthy();
  expect(screen.getByText('Interruptions 1')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
});

it('keeps distraction and note input when a write fails', async () => {
  const user = userEvent.setup();
  const running = session();
  const item = workItem({ id: 'w1', title: 'Algebra' });
  const service = createFakeService(
    view({ activeSession: running, elapsedMs: 12 * 60_000, remainingMs: 38 * 60_000, workItem: item }),
    {
      captureDistraction: vi.fn(async () => err('persistence_write_failed', 'IndexedDB write failed.')),
    },
  );

  await renderFocus(service);
  await user.type(screen.getByLabelText('Distraction'), 'search laptop');
  await user.type(screen.getByLabelText('Session note'), 'almost done');
  await user.click(screen.getByRole('button', { name: 'Capture distraction' }));

  expect(await screen.findByText('IndexedDB write failed.')).toBeTruthy();
  expect((screen.getByLabelText('Distraction') as HTMLInputElement).value).toBe('search laptop');
  expect((screen.getByLabelText('Session note') as HTMLTextAreaElement).value).toBe('almost done');
});

it('preselects work item and time block from the start link without auto-starting', async () => {
  const block: TimeBlock = {
    id: 'tb1',
    date: '2026-08-31',
    workItemId: 'w1',
    habitId: null,
    startMinute: 600,
    endMinute: 660,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  };
  const service = createFakeService(
    view({
      todayTimeBlocks: [block],
    }),
  );

  await renderFocus(service, { workItemId: 'w1', timeBlockId: 'tb1' });
  expect((screen.getByLabelText('Focus task') as HTMLSelectElement).value).toBe('w1');
  expect((screen.getByLabelText('Time block') as HTMLSelectElement).value).toBe('tb1');
  expect(service.startSession).not.toHaveBeenCalled();
});
