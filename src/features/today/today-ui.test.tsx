import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import type { DailyCommitmentSnapshot } from '@/domain/commitments/commitment';
import type { DailyPlan, DailyPriority } from '@/domain/daily-plans/daily-plan';
import type { TimeBlock } from '@/domain/time-blocks/time-block';
import { err, ok, type Result } from '@/domain/shared/result';
import type { WorkItem } from '@/domain/work-items/work-item';
import type { TodayService, TodayViewModel } from '@/features/today/application/today-service';
import { TodayScreen } from '@/features/today/components/TodayScreen';

const DATE = '2026-08-30';
const NOW = '2026-08-30T08:00:00.000Z';

function workItem(partial: Partial<WorkItem> & Pick<WorkItem, 'id' | 'title'>): WorkItem {
  return {
    projectId: null,
    notes: '',
    type: 'task',
    estimatedMinutes: 60,
    actualMinutes: 0,
    priority: 'p2_high',
    status: 'backlog',
    completedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...partial,
  };
}

function view(overrides: Partial<TodayViewModel> = {}): TodayViewModel {
  return {
    date: DATE,
    plan: {
      id: `plan-${DATE}`,
      date: DATE,
      capacityMinutes: 300,
      morningIntention: '',
      createdAt: NOW,
      updatedAt: NOW,
    },
    workItems: [],
    priorities: [],
    timeBlocks: [],
    scheduledMinutes: 0,
    remainingMinutes: 300,
    isOverbooked: false,
    showHighCapacityCaution: false,
    overlapPairs: [],
    commitment: null,
    divergence: null,
    ...overrides,
  };
}

function unused<T>(code = 'unused'): Promise<Result<T>> {
  return Promise.resolve(err(code, 'unused'));
}

function createFakeService(
  initial: TodayViewModel,
  overrides: Partial<TodayService> = {},
): TodayService {
  const current = { view: initial };
  return {
    getTodayView: vi.fn(async () => ok(current.view)),
    createTask: vi.fn(async () => unused<WorkItem>()),
    setDailyCapacity: vi.fn(async () => unused<DailyPlan>()),
    setDailyPriorities: vi.fn(async () => unused<DailyPriority[]>()),
    createTimeBlock: vi.fn(async () => unused<TimeBlock>()),
    updateTimeBlock: vi.fn(async () => unused<TimeBlock>()),
    deleteTimeBlock: vi.fn(async () => unused<void>()),
    completeTask: vi.fn(async () => unused<WorkItem>()),
    reopenTask: vi.fn(async () => unused<WorkItem>()),
    commitToday: vi.fn(async () => unused<DailyCommitmentSnapshot>()),
    ...overrides,
  };
}

async function renderToday(service: TodayService) {
  render(<TodayScreen service={service} date={DATE} />);
  await screen.findByLabelText('Daily capacity minutes');
}

it('submits title, estimate and priority to createTask and refreshes the view', async () => {
  const user = userEvent.setup();
  const created = workItem({ id: 'w1', title: 'Algebra', estimatedMinutes: 60, priority: 'p1_urgent' });
  const service = createFakeService(view(), {
    createTask: vi.fn(async (input) => {
      expect(input).toEqual({
        title: 'Algebra',
        estimatedMinutes: 60,
        priority: 'p1_urgent',
      });
      return ok(created);
    }),
    getTodayView: vi
      .fn()
      .mockResolvedValueOnce(ok(view()))
      .mockResolvedValueOnce(ok(view({ workItems: [created] }))),
  });

  await renderToday(service);
  await user.type(screen.getByLabelText('Task title'), 'Algebra');
  await user.clear(screen.getByLabelText('Estimated minutes'));
  await user.type(screen.getByLabelText('Estimated minutes'), '60');
  await user.selectOptions(screen.getByLabelText('Priority'), 'p1_urgent');
  await user.click(screen.getByRole('button', { name: 'Add task' }));

  expect(service.createTask).toHaveBeenCalledWith({
    title: 'Algebra',
    estimatedMinutes: 60,
    priority: 'p1_urgent',
  });
  expect(await screen.findByRole('button', { name: 'Complete Algebra' })).toBeTruthy();
  expect((screen.getByLabelText('Task title') as HTMLInputElement).value).toBe('');
});

it('preserves quick capture input and shows the error when createTask fails', async () => {
  const user = userEvent.setup();
  const service = createFakeService(view(), {
    createTask: vi.fn(async () => err('persistence_write_failed', 'IndexedDB write failed.')),
  });

  await renderToday(service);
  await user.type(screen.getByLabelText('Task title'), 'Algebra');
  await user.clear(screen.getByLabelText('Estimated minutes'));
  await user.type(screen.getByLabelText('Estimated minutes'), '45');
  await user.selectOptions(screen.getByLabelText('Priority'), 'p1_urgent');
  await user.click(screen.getByRole('button', { name: 'Add task' }));

  expect(await screen.findByText('IndexedDB write failed.')).toBeTruthy();
  expect((screen.getByLabelText('Task title') as HTMLInputElement).value).toBe('Algebra');
  expect((screen.getByLabelText('Estimated minutes') as HTMLInputElement).value).toBe('45');
  expect((screen.getByLabelText('Priority') as HTMLSelectElement).value).toBe('p1_urgent');
  expect(screen.queryByRole('button', { name: 'Complete Algebra' })).toBeNull();
});

it('prevents adding a fourth Top 3 item in the UI', async () => {
  const items = [
    workItem({ id: 'a', title: 'Algebra' }),
    workItem({ id: 'b', title: 'IELTS Writing' }),
    workItem({ id: 'c', title: 'Chemistry' }),
    workItem({ id: 'd', title: 'Reading' }),
  ];
  const service = createFakeService(
    view({
      workItems: items,
      priorities: [
        { rank: 1, item: items[0] },
        { rank: 2, item: items[1] },
        { rank: 3, item: items[2] },
      ],
    }),
  );

  await renderToday(service);
  expect((screen.getByRole('button', { name: 'Add Reading to Top 3' }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole('button', { name: 'Remove Algebra from Top 3' })).toBeTruthy();
});

it('renders Available, Scheduled and Remaining values from the view model', async () => {
  const service = createFakeService(
    view({
      scheduledMinutes: 90,
      remainingMinutes: 210,
    }),
  );

  await renderToday(service);
  expect(screen.getByText('Available 300 min')).toBeTruthy();
  expect(screen.getByText('Scheduled 90 min')).toBeTruthy();
  expect(screen.getByText('Remaining 210 min')).toBeTruthy();
});

it('renders Overbooked by 60 min and still enables Commit Today', async () => {
  const service = createFakeService(
    view({
      scheduledMinutes: 360,
      remainingMinutes: -60,
      isOverbooked: true,
    }),
  );

  await renderToday(service);
  expect(screen.getByText('Overbooked by 60 min')).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Commit Today' }) as HTMLButtonElement).disabled).toBe(false);
});

it('renders high-capacity caution above 720 without disabling commit', async () => {
  const service = createFakeService(
    view({
      plan: {
        id: `plan-${DATE}`,
        date: DATE,
        capacityMinutes: 750,
        morningIntention: '',
        createdAt: NOW,
        updatedAt: NOW,
      },
      remainingMinutes: 750,
      showHighCapacityCaution: true,
    }),
  );

  await renderToday(service);
  expect(screen.getByText('High capacity: protect sleep, meals and recovery.')).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Commit Today' }) as HTMLButtonElement).disabled).toBe(false);
});

it('renders Committed at after commit succeeds', async () => {
  const user = userEvent.setup();
  const snapshot: DailyCommitmentSnapshot = {
    id: 'c1',
    date: DATE,
    committedAt: NOW,
    capacityMinutes: 300,
    priorityWorkItemIds: [],
    timeBlocks: [],
  };
  const service = createFakeService(view(), {
    commitToday: vi.fn(async () => ok(snapshot)),
    getTodayView: vi
      .fn()
      .mockResolvedValueOnce(ok(view()))
      .mockResolvedValueOnce(ok(view({ commitment: snapshot, divergence: {
        capacityChanged: false,
        prioritiesChanged: false,
        timeBlocksChanged: false,
        hasDivergence: false,
      } }))),
  });

  await renderToday(service);
  await user.click(screen.getByRole('button', { name: 'Commit Today' }));
  expect(await screen.findByText(/Committed at/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Commit Today' })).toBeNull();
});

it('renders Plan changed after commitment and changed categories', async () => {
  const snapshot: DailyCommitmentSnapshot = {
    id: 'c1',
    date: DATE,
    committedAt: NOW,
    capacityMinutes: 300,
    priorityWorkItemIds: [],
    timeBlocks: [],
  };
  const service = createFakeService(
    view({
      commitment: snapshot,
      divergence: {
        capacityChanged: true,
        prioritiesChanged: true,
        timeBlocksChanged: true,
        hasDivergence: true,
      },
    }),
  );

  await renderToday(service);
  expect(screen.getByText('Plan changed after commitment')).toBeTruthy();
  expect(screen.getByText('Capacity changed')).toBeTruthy();
  expect(screen.getByText('Priorities changed')).toBeTruthy();
  expect(screen.getByText('Schedule changed')).toBeTruthy();
});

it('keeps previous view and shows error when persistence mutation fails', async () => {
  const user = userEvent.setup();
  const algebra = workItem({ id: 'w1', title: 'Algebra' });
  const service = createFakeService(view({ workItems: [algebra] }), {
    setDailyCapacity: vi.fn(async () => err('persistence_write_failed', 'IndexedDB write failed.')),
  });

  await renderToday(service);
  expect(screen.getByRole('button', { name: 'Complete Algebra' })).toBeTruthy();

  await user.clear(screen.getByLabelText('Daily capacity minutes'));
  await user.type(screen.getByLabelText('Daily capacity minutes'), '240');
  await user.click(screen.getByRole('button', { name: 'Save capacity' }));

  expect(await screen.findByText('IndexedDB write failed.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Complete Algebra' })).toBeTruthy();
  expect(screen.getByText('Available 300 min')).toBeTruthy();
});

it('links Start focus without timeBlockId when no matching time block exists', async () => {
  const algebra = workItem({ id: 'w1', title: 'Algebra' });
  const service = createFakeService(
    view({
      workItems: [algebra],
      timeBlocks: [],
    }),
  );

  await renderToday(service);
  expect(screen.getByRole('link', { name: 'Start focus Algebra' }).getAttribute('href')).toBe(
    '/focus?workItemId=w1',
  );
});

it('auto-associates timeBlockId when exactly 1 matching today time block exists', async () => {
  const algebra = workItem({ id: 'w1', title: 'Algebra' });
  const service = createFakeService(
    view({
      workItems: [algebra],
      timeBlocks: [
        {
          id: 'tb1',
          date: DATE,
          workItemId: 'w1',
          habitId: null,
          startMinute: 600,
          endMinute: 660,
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
    }),
  );

  await renderToday(service);
  expect(screen.getByRole('link', { name: 'Start focus Algebra' }).getAttribute('href')).toBe(
    '/focus?workItemId=w1&timeBlockId=tb1',
  );
});

it('omits timeBlockId and sends only workItemId when 2 or more matching today time blocks exist', async () => {
  const algebra = workItem({ id: 'w1', title: 'Algebra' });
  const service = createFakeService(
    view({
      workItems: [algebra],
      timeBlocks: [
        {
          id: 'tb1',
          date: DATE,
          workItemId: 'w1',
          habitId: null,
          startMinute: 600,
          endMinute: 660,
          createdAt: NOW,
          updatedAt: NOW,
        },
        {
          id: 'tb2',
          date: DATE,
          workItemId: 'w1',
          habitId: null,
          startMinute: 720,
          endMinute: 780,
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
    }),
  );

  await renderToday(service);
  expect(screen.getByRole('link', { name: 'Start focus Algebra' }).getAttribute('href')).toBe(
    '/focus?workItemId=w1',
  );
});
